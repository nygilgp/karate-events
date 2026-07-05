import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/contexts/session-context';

export default function AuthLayout() {
  const { session, loading } = useSession();

  if (!loading && session) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
