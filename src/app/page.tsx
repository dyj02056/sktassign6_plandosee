import { auth } from '@/auth';
import { HomeLogin } from '@/components/domain/HomeLogin';
import { HomeDashboard } from '@/components/domain/HomeDashboard';

export default async function HomePage() {
  const session = await auth();

  console.log('[HomePage] session:', session?.user?.email ?? 'null');

  if (!session?.user?.id) {
    return <HomeLogin />;
  }

  return <HomeDashboard userId={session.user.id} email={session.user.email ?? ''} />;
}