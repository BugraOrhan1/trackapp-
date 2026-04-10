import { useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../store/authStore';
import { getCurrentUser } from '../services/supabase';

export function useAuth() {
  const { user, initializing, setUser, setInitializing } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const sessionUser = await getCurrentUser();
        if (mounted) setUser(sessionUser);
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? sessionUserToAppUser(session.user.id, session.user.email ?? '', session.user.user_metadata?.username ?? session.user.email ?? 'user') : null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [setInitializing, setUser]);

  return { user, initializing };
}

function sessionUserToAppUser(id: string, email: string, username: string) {
  return {
    id,
    email,
    username,
    subscriptionType: 'free' as const,
    totalReports: 0,
    reputationScore: 0,
  };
}
