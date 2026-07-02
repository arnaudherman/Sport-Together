import { useCallback, useEffect, useRef } from 'react';

/**
 * Retourne une version DÉBOUNCÉE (350 ms) d'un callback — pour les champs de
 * recherche : une requête par pause de frappe, pas par caractère (les recherches
 * serveur sont rate-limitées).
 */
export function useDebounced<T extends unknown[]>(fn: (...args: T) => void, delayMs = 350) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback(
    (...args: T) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => saved.current(...args), delayMs);
    },
    [delayMs],
  );
}
