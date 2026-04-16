import { useCallback, useState } from 'react';
import apiClient from '../services/apiClient';

/**
 * Hook for data mutations
 * Handles POST, PUT, DELETE operations with proper error handling
 */
export const useMutation = (endpoint, options = {}) => {
  const {
    method = 'POST',
    onSuccess = null,
    onError = null,
    autoInvalidate = true
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const mutate = useCallback(async (payload, customEndpoint = null) => {
    setLoading(true);
    setError(null);

    try {
      const targetEndpoint = customEndpoint || endpoint;
      const startTime = performance.now();

      let result;
      switch (method.toUpperCase()) {
        case 'POST':
          result = await apiClient.post(targetEndpoint, payload);
          break;
        case 'PUT':
          result = await apiClient.put(targetEndpoint, payload);
          break;
        case 'DELETE':
          result = await apiClient.delete(targetEndpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      const duration = performance.now() - startTime;

      setData(result);
      setLoading(false);

      if (onSuccess) {
        onSuccess(result);
      }

      console.log(`[useMutation] ${method} ${targetEndpoint}: ${duration.toFixed(0)}ms`);

      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);

      if (onError) {
        onError(err);
      }

      console.error(`[useMutation] Error:`, err.message);
      throw err;
    }
  }, [endpoint, method, onSuccess, onError, autoInvalidate]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    mutate,
    loading,
    error,
    data,
    reset
  };
};

/**
 * Hook for bulk mutations (create/update multiple items)
 */
export const useBulkMutation = (endpoint, options = {}) => {
  const {
    onSuccess = null,
    onError = null,
    batchSize = 5
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);

  const mutateBatch = useCallback(async (items, mapFn) => {
    setLoading(true);
    setError(null);
    setResults([]);
    setProgress(0);

    try {
      const allResults = [];
      const totalItems = items.length;

      // Process items in batches to avoid overwhelming the server
      for (let i = 0; i < totalItems; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(item => apiClient.post(endpoint, mapFn(item)));

        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);

        setProgress(Math.round(((i + batchSize) / totalItems) * 100));
        setResults([...allResults]);
      }

      setLoading(false);
      setProgress(100);

      if (onSuccess) {
        onSuccess(allResults);
      }

      return allResults;
    } catch (err) {
      setError(err.message);
      setLoading(false);

      if (onError) {
        onError(err);
      }

      console.error(`[useBulkMutation] Error:`, err.message);
      throw err;
    }
  }, [endpoint, batchSize, onSuccess, onError]);

  return {
    mutate: mutateBatch,
    loading,
    error,
    progress,
    results
  };
};

export default {
  useMutation,
  useBulkMutation
};
