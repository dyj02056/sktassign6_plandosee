import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup')) {
        return true;
      }
      if (pathname.startsWith('/api')) {
        return true;
      }
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;