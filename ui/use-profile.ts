import { useCallback, useEffect, useState } from 'react';

import { useProfileRepository } from '@/core/di/repositories-context';
import type { Profile } from '@/domain/entities/profile';

/**
 * Charge le profil de l'utilisateur courant (ADR-0005). À monter dans un
 * composant keyé par userId (pas de profil périmé entre comptes).
 *
 * Correctifs revue :
 *  - une erreur de lecture remonte dans `error` (jamais confondue avec « pas de
 *    profil » — sinon un adulte onboardé serait renvoyé à l'age-gate) ;
 *  - le fetch vit dans un effet avec garde `active` (pas de setState après
 *    démontage) ; `reload` (gestionnaire d'événement) repasse `loading=true` ;
 *  - `applyProfile` permet à l'onboarding de poser le profil de façon optimiste.
 */
export function useProfile() {
  const repo = useProfileRepository();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  // Appelé depuis un événement (jamais dans un effet) : on peut donc remettre
  // loading=true ici sans violer react-hooks/set-state-in-effect.
  const reload = useCallback(() => {
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  const applyProfile = useCallback((next: Profile) => {
    setProfile(next);
    setError(null);
  }, []);

  useEffect(() => {
    let active = true;
    repo
      .getMyProfile()
      .then((p) => {
        if (active) {
          setProfile(p);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(e as Error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repo, nonce]);

  return { profile, loading, error, reload, applyProfile };
}
