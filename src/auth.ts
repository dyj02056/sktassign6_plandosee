import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { authConfig } from './auth.config';
import { db } from '@/db';
import { user, account, session, verificationToken } from '@/db/schema';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: account,
    sessionsTable: session,
    verificationTokensTable: verificationToken,
  }),
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const found = await db.query.user.findFirst({
          where: eq(user.email, email.toLowerCase()),
        });
        if (!found?.passwordHash) return null;

        const ok = await bcrypt.compare(password, found.passwordHash);
        if (!ok) return null;

        return {
          id: found.id,
          email: found.email,
          name: found.name ?? null,
          sessionVersion: found.sessionVersion ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user: authUser }) {
      if (authUser) {
        token.id = authUser.id;
        token.sessionVersion =
          (authUser as { sessionVersion?: number }).sessionVersion ?? 0;
      }

      if (token.id) {
        const rows = await db
          .select({ sessionVersion: user.sessionVersion })
          .from(user)
          .where(eq(user.id, token.id as string))
          .limit(1);

        const dbUser = rows[0];

        if (!dbUser || (dbUser.sessionVersion ?? 0) !== (token.sessionVersion ?? 0)) {
          return null;
        }
      }

      return token;
    },
    async session({ session: authSession, token }) {
      if (authSession.user && token.id) {
        authSession.user.id = token.id as string;
      }
      return authSession;
    },
  },
});