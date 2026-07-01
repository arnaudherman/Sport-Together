import { type Dispatch, type MutableRefObject, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncData<T> {
  data: T;
  setData: Dispatch<SetStateAction<T>>;
  loading: boolean;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  reload: () => Promise<void>;
  /** Vrai tant que le composant est monté (pour garder les setState des actions locales). */
  mounted: MutableRefObject<boolean>;
}

/**
 * Charge des données async avec garde de démontage + états `loading`/`error` + `reload`.
 * Mutualise le triptyque (mounted-ref + try/catch/finally + déclenchement initial) qui
 * était copié à l'identique dans ~6 écrans. `loader` DOIT être stable (useCallback) ;
 * `reload` se relance quand il change. `setData`/`setError`/`mounted` servent aux mises à
 * jour optimistes locales (réactions, follow, suppression).
 */
export function useAsyncData<T>(loader: () => Promise<T>, initial: T): AsyncData<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      const result = await loader();
      if (mounted.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, setData, loading, error, setError, reload, mounted };
}
