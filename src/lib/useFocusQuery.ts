import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

/** Run an async loader whenever the screen gains focus or `deps` change. Stale results are dropped. */
export function useFocusQuery<T>(load: () => Promise<T>, deps: readonly unknown[]): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const token = useRef(0);

  const run = useCallback(() => {
    const mine = ++token.current;
    loadRef.current().then(
      (result) => {
        if (mine !== token.current) return;
        setData(result);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        if (mine !== token.current) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      },
    );
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(run, deps));

  return { data, loading, error, reload: run };
}
