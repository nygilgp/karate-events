import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import AppTabs from '@/components/app-tabs';
import { useSession } from '@/contexts/session-context';
import { supabase } from '@/lib/supabase';

export default function AppLayout() {
  const { session, loading } = useSession();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!session) {
      setProfileChecked(false);
      setHasProfile(false);
      return;
    }
    setProfileChecked(false);
    supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        setHasProfile(!!data);
        setProfileChecked(true);
      });
  }, [session?.user.id]);

  if (loading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  if (!profileChecked) return null;
  if (!hasProfile) return <Redirect href="/complete-profile" />;

  return <AppTabs />;
}
