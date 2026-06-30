import { useCallback, useEffect, useState } from 'react';

import { useProfileRepository } from '@/core/di/repositories-context';
import type { Profile } from '@/domain/entities/profile';

/**
 * Charge le profil de l'utilisateur courant (ADR-0005). `reload` sert après
 * l'onboarding. À monter dans un composant keyé par userId pour éviter tout
 * profil périmé d'une session précédente.
 */
export function useProfile() {
  const repo = useProfileRepository();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    repo
      .getMyProfile()
      .then((p) => setProfile(p))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [repo]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { profile, loading, reload };
}
