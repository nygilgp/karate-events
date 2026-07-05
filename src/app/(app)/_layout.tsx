import { Redirect } from 'expo-router';

import AppTabs from '@/components/app-tabs';
import { useSession } from '@/contexts/session-context';

export default function AppLayout() {
  const { session, loading } = useSession();

  if (!loading && !session) return <Redirect href="/sign-in" />;

  return <AppTabs />;
}
