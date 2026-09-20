/**
 * useQuery Hook - For fetching data with caching and error handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ApiError } from "../services/apiClient";

export interface UseQueryOptions {
  enabled?: boolean;
  cacheTTL?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: ApiError) => void;
  retry?: number;
  retryDelay?: number;
}

export interface UseQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

export function useQuery<T = unknown>(
  queryFn: () => Promise<T>,
  options?: UseQueryOptions,
): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const retriesRef = useRef(0);
  const isMountedRef = useRef(true);
  const queryFnRef = useRef(queryFn);
  const optionsRef = useRef(options);
  queryFnRef.current = queryFn;
  optionsRef.current = options;

  // Keep the fetch function stable. Callers commonly create query functions and
  // option objects inline; depending on those identities here causes an effect
  // loop that can flood a rate-limited endpoint with requests.
  const fetchData = useCallback(async () => {
    const currentOptions = optionsRef.current;
    if (currentOptions?.enabled === false) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const result = await queryFnRef.current();

      if (isMountedRef.current) {
        setData(result);
        currentOptions?.onSuccess?.(result);
      }
      retriesRef.current = 0;
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError(500, String(err));

      if (isMountedRef.current) {
        if (
          (currentOptions?.retry ?? 3) > retriesRef.current &&
          apiError.status >= 500
        ) {
          retriesRef.current += 1;
          const delay = currentOptions?.retryDelay ?? 1000 * retriesRef.current;
          setTimeout(() => fetchData(), delay);
        } else {
          setError(apiError);
          currentOptions?.onError?.(apiError);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Re-arm the mounted guard when a disabled query becomes enabled (for example,
    // immediately after API-key login). The previous implementation permanently
    // left this ref false during the cleanup of the disabled render, discarding the
    // authenticated response and leaving tenant selection empty.
    isMountedRef.current = true;
    if (options?.enabled !== false) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchData, options?.enabled]);

  return { data, isLoading, error, refetch };
}

export default useQuery;
