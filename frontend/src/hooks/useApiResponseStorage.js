/**
 * Hook for accessing and managing saved API responses
 * NOTE: Storage methods are not implemented in apiService
 * This hook provides a safe interface with default values
 */

import { useState, useCallback, useEffect } from 'react';

export const useApiResponseStorage = () => {
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState({
    totalResponses: 0,
    estimatedSize: '0 B'
  });

  // Refresh response list (no-op - storage not implemented)
  const refreshResponses = useCallback((limit = 20) => {
    setResponses([]);
  }, []);

  // Refresh storage stats (no-op - storage not implemented)
  const refreshStats = useCallback(() => {
    setStats({
      totalResponses: 0,
      estimatedSize: '0 B'
    });
  }, []);

  // Initial load
  useEffect(() => {
    refreshResponses();
    refreshStats();
  }, [refreshResponses, refreshStats]);

  // Get response by endpoint (no-op - storage not implemented)
  const getByEndpoint = useCallback((endpoint) => {
    return null;
  }, []);

  // Export responses (no-op - storage not implemented)
  const exportResponses = useCallback(() => {
    console.log('[API Response Storage] Export not implemented');
  }, []);

  // Clear storage (no-op - storage not implemented)
  const clearResponses = useCallback(() => {
    console.log('[API Response Storage] Clear not implemented');
  }, []);

  return {
    responses,
    stats,
    refreshResponses,
    refreshStats,
    getByEndpoint,
    exportResponses,
    clearResponses
  };
};

export default useApiResponseStorage;
    responses,
    stats,
    refreshResponses,
    refreshStats,
    getByEndpoint,
    exportResponses,
    clearResponses
  };
};

export default useApiResponseStorage;
