import { useEffect, useState } from 'react';

import { useAuthRepository } from '@/core/di/repositories-context';

/** Suit l'état d'authentification via l'AuthRepository (ADR-0005). */
export function useSession() {
  const auth = useAuthRepository();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    auth
      .getCurrentUserId()
      .then((id) => {
        if (active) {
          setUserId(id);
          setLoading(false);
        }
      })
      .catch(() => {
        // Échec de lecture de session : on ne reste pas bloqué sur le loader.
        if (active) setLoading(false);
      });
    const unsubscribe = auth.onAuthChange((id) => {
      if (active) setUserId(id);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);

  return { userId, loading };
}
