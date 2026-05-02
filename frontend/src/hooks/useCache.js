import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

// In-memory cache with TTL management
const apiCache = new Map();

const getCacheKey = (endpoint) => `api_${endpoint}`;

const getCachedData = (endpoint, ttl = 5 * 60 * 1000) => {
  const cacheKey = getCacheKey(endpoint);
  const cached = apiCache.get(cacheKey);
  
  if (!cached) return null;
  
  const isStale = Date.now() - cached.timestamp > ttl;
  if (isStale) {
    apiCache.delete(cacheKey);
    console.log(`[Cache STALE] ${endpoint} - removed from cache`);
    return null;
  }
  
  return cached.data;
};

const setCacheData = (endpoint, data) => {
  const cacheKey = getCacheKey(endpoint);
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
};

const invalidateCache = (endpoint) => {
  const cacheKey = getCacheKey(endpoint);
  apiCache.delete(cacheKey);
  console.log(`[Cache INVALIDATE] ${endpoint}`);
};

/**
 * Custom hook for data fetching with intelligent caching and TTL
 * Reduces API calls via in-memory cache with configurable TTL
 */
export const useApiData = (endpoint, options = {}) => {
  const {
    onSuccess = null,
    onError = null,
    refetch = false,
    defaultValue = [],
    ttl = 5 * 60 * 1000 // 5 minutes default TTL
  } = options;

  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    // Check cache first on initial load (not on explicit refetch)
    if (!refetch) {
      const cached = getCachedData(endpoint, ttl);
      
      if (cached) {
        setData(cached);
        setLoading(false);
        if (onSuccess) onSuccess(cached);
        console.log(`[Cache HIT] ${endpoint}`);
        return;
      }
    }

    // Cache miss or explicit refetch - fetch from API
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const startTime = performance.now();
      
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 30000,
      });

      const duration = performance.now() - startTime;
      
      // Only update state if component still mounted
      if (!isMountedRef.current) return;
      
      // Cache the response
      setCacheData(endpoint, response.data);
      setData(response.data);
      setLoading(false);

      if (onSuccess) {
        onSuccess(response.data);
      }

      console.log(`[Cache MISS] Fetched ${endpoint}: ${duration.toFixed(0)}ms`);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      setError(errorMsg);
      setLoading(false);

      if (onError) {
        onError(err);
      }

      console.error(`[Hook] Error fetching ${endpoint}:`, errorMsg);
    }
  }, [endpoint, onSuccess, onError, ttl, refetch]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchData();

    return () => {
      isMountedRef.current = false;
    };
  }, [endpoint, refetch, fetchData]);

  const refetchData = useCallback(() => {
    invalidateCache(endpoint);
    fetchData();
  }, [fetchData, endpoint]);

  return {
    data,
    loading,
    error,
    refetch: refetchData,
    invalidateCache: () => invalidateCache(endpoint)
  };
};

// Export cache management utilities
export const useCacheManager = () => {
  return {
    clearAllCache: () => {
      apiCache.clear();
      console.log('[Cache] All cache cleared');
    },
    invalidateEndpoint: (endpoint) => invalidateCache(endpoint),
    getCacheSize: () => apiCache.size,
    getCacheStats: () => {
      const stats = {};
      apiCache.forEach((value, key) => {
        stats[key] = {
          timestamp: new Date(value.timestamp).toLocaleTimeString(),
          age: `${Math.round((Date.now() - value.timestamp) / 1000)}s`
        };
      });
      return stats;
    }
  };
};

/**
 * Hook for component render performance tracking
 */
export const useRenderTracking = (componentName) => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      console.log(`[Render] ${componentName}: ${duration.toFixed(0)}ms`);
    };
  }, [componentName]);
};

/**
 * Hook for page load tracking
 */
export const usePageLoadTracking = (pageName) => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      console.log(`[PageLoad] ${pageName}: ${duration.toFixed(0)}ms`);
    };
  }, [pageName]);
};

export default {
  useApiData,
  useRenderTracking,
  usePageLoadTracking,
  useCacheManager
};
