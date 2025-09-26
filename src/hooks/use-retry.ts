import { useState, useCallback } from 'react';

export interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number) => void;
  onError?: (error: Error, attempt: number) => void;
  onMaxRetriesReached?: (lastError: Error) => void;
}

export function useRetry<T>() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const executeWithRetry = useCallback(
    async (
      operation: () => Promise<T>,
      config: RetryConfig = {}
    ): Promise<T> => {
      const {
        maxRetries = 3,
        initialDelay = 1000,
        backoffMultiplier = 2,
        onRetry,
        onError,
        onMaxRetriesReached,
      } = config;

      let attempt = 0;
      let delay = initialDelay;

      while (attempt <= maxRetries) {
        try {
          if (attempt > 0) {
            setIsRetrying(true);
            onRetry?.(attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= backoffMultiplier;
          }

          const result = await operation();
          
          // Reset state on success
          setIsRetrying(false);
          setRetryCount(0);
          setLastError(null);
          
          return result;
        } catch (error) {
          const currentError = error instanceof Error ? error : new Error('Unknown error');
          setLastError(currentError);
          setRetryCount(attempt);
          
          onError?.(currentError, attempt);

          if (attempt === maxRetries) {
            setIsRetrying(false);
            onMaxRetriesReached?.(currentError);
            throw currentError;
          }

          attempt++;
        }
      }

      throw new Error('Unexpected retry loop exit');
    },
    []
  );

  const reset = useCallback(() => {
    setIsRetrying(false);
    setRetryCount(0);
    setLastError(null);
  }, []);

  return {
    executeWithRetry,
    isRetrying,
    retryCount,
    lastError,
    reset,
  };
}