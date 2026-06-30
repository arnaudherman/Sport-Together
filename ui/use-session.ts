import { useEffect, useState } from 'react';

import { useAuthRepository } from '@/core/di/repositories-context';

/** Suit l'état d'authentification via l'AuthRepository (ADR-0005). */
export function useSession() {
  const auth = useAuthRepository();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let gotEvent = false;
    // S'abonner D'ABORD : si un événement d'auth arrive (session restaurée,
    // SIGNED_IN…), il fait foi et la résolution tardive de getCurrentUserId ne
    // doit pas l'écraser avec une valeur périmée (correctif race de l'analyse).
    const unsubscribe = auth.onAuthChange((id) => {
      if (active) {
        gotEvent = true;
        setUserId(id);
        setLoading(false);
      }
    });
    auth
      .getCurrentUserId()
      .then((id) => {
        if (active && !gotEvent) setUserId(id);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);

  return { userId, loading };
}
