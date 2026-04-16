# Cache Integration Guide

This guide explains how to integrate the new caching system into your React components and pages.

## Overview

The caching system provides:
- **Automatic response caching** across all API calls
- **Smart cache invalidation** with cascading updates
- **Performance monitoring** with real-time metrics
- **Request deduplication** to prevent duplicate API calls
- **Role-based cache warming** for faster page loads
- **Visual cache dashboard** for monitoring

## Custom Hooks

### 1. useApiData - Fetch Data with Caching

```javascript
import { useApiData } from '../hooks/useCache';

function InventoryList() {
  const { data, loading, error, isCached, refetch, invalidateCache } = useApiData(
    '/inventory',
    {
      cacheTTL: 5 * 60 * 1000, // 5 minutes
      storage: 'memory',         // 'memory', 'localStorage', or 'sessionStorage'
      onSuccess: (data) => console.log('Data loaded:', data),
      onError: (err) => console.error('Error:', err)
    }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {isCached && <span className="badge">From Cache</span>}
      {/* Render data */}
      <button onClick={refetch}>Refresh</button>
      <button onClick={invalidateCache}>Clear Cache</button>
    </div>
  );
}
```

### 2. useMutation - Create/Update Data with Cache Invalidation

```javascript
import { useMutation } from '../hooks/useMutation';

function CreateProduct() {
  const { mutate, loading, error, data } = useMutation('/products', {
    method: 'POST',
    onSuccess: (data) => console.log('Product created:', data),
    autoInvalidate: true // Automatically invalidate related caches
  });

  const handleCreate = async (formData) => {
    await mutate(formData);
  };

  return (
    <form onSubmit={e => {
      e.preventDefault();
      handleCreate(new FormData(e.target));
    }}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

### 3. useBulkMutation - Batch Operations

```javascript
import { useBulkMutation } from '../hooks/useMutation';

function BulkImport() {
  const { mutate, loading, progress, results } = useBulkMutation('/products', {
    batchSize: 5, // Process 5 items at a time
    onSuccess: (results) => console.log('Import complete:', results)
  });

  const handleImport = async (items) => {
    await mutate(items, (item) => ({
      name: item.name,
      sku: item.sku,
      quantity: item.quantity
    }));
  };

  return (
    <div>
      <button onClick={() => handleImport(csvData)}>Import</button>
      {loading && <progress value={progress} max={100} />}
      <p>{progress}% Complete</p>
    </div>
  );
}
```

### 4. useCacheManagement - Manage Cache Directly

```javascript
import { useCacheManagement } from '../hooks/useCache';

function CacheControls() {
  const { cacheStats, clearCache, warmupCache, refreshStats } = useCacheManagement();

  return (
    <div>
      <p>Cache Size: {cacheStats?.totalEntries} entries</p>
      <button onClick={() => warmupCache('admin')}>Warm Up Cache</button>
      <button onClick={clearCache}>Clear All</button>
      <button onClick={refreshStats}>Refresh Stats</button>
    </div>
  );
}
```

### 5. useRenderTracking - Track Component Performance

```javascript
import { useRenderTracking } from '../hooks/useCache';
import performanceService from '../services/performanceService';

function ExpensiveComponent() {
  useRenderTracking('ExpensiveComponent');

  return (
    <div>
      {/* Heavy operations */}
    </div>
  );
}

// Later, check performance
const report = performanceService.getFullReport();
console.log('Render stats:', report.renderStats);
```

### 6. usePageLoadTracking - Track Page Navigation

```javascript
import { usePageLoadTracking } from '../hooks/useCache';

function Dashboard() {
  usePageLoadTracking('Dashboard');

  return <div>{/* Page content */}</div>;
}
```

### 7. useApiStats - Monitor API Performance

```javascript
import { useApiStats } from '../hooks/useCache';

function PerformanceMonitor() {
  const { apiStats, performanceStats } = useApiStats(5000); // Update every 5 seconds

  return (
    <div>
      <p>Total Requests: {apiStats?.totalRequests}</p>
      <p>Cache Hit Rate: {apiStats?.cacheHitRate?.toFixed(1)}%</p>
      <p>P95 Response Time: {performanceStats?.apiStats?.p95}ms</p>
    </div>
  );
}
```

## Cache Initialization

Wrap your app with CacheInitializer to automatically warm up cache on startup:

```javascript
import { CacheInitializer } from './components/CacheInitializer';
import App from './App';

export default function Root() {
  return (
    <CacheInitializer userRole="admin">
      <App />
    </CacheInitializer>
  );
}
```

## Caching Strategies

### Memory Cache (Default)
- **Speed**: Microseconds
- **Duration**: Until page reload
- **Use Case**: Frequently accessed data

```javascript
const { data } = useApiData('/inventory', { storage: 'memory' });
```

### LocalStorage Cache
- **Speed**: Milliseconds
- **Duration**: Persistent across page reloads
- **Use Case**: User preferences, settings

```javascript
const { data } = useApiData('/user/preferences', { storage: 'localStorage' });
```

### SessionStorage Cache
- **Speed**: Milliseconds
- **Duration**: Until tab closes
- **Use Case**: Temporary workflow data

```javascript
const { data } = useApiData('/checkout/cart', { storage: 'sessionStorage' });
```

## Smart Cache Invalidation

When you create/update/delete data, related caches automatically invalidate:

```javascript
// Creating a product...
const { mutate } = useMutation('/products', { autoInvalidate: true });
await mutate({ name: 'New Product' });

// Automatically invalidates:
// - /products
// - /inventory (depends on products)
// - /analytics (depends on products)
// - /dashboard/stats (depends on products and inventory)
```

### Manual Invalidation

```javascript
import advancedCacheService from '../services/advancedCacheService';

// Invalidate single endpoint
apiService.invalidateCache('/products');

// Invalidate with cascading
await advancedCacheService.invalidateWithCascade('/products');
```

## Performance Dashboard

Add the cache management dashboard to your pages:

```javascript
import CacheManagementDashboard from '../components/CacheManagementDashboard';

function Dashboard() {
  return (
    <div>
      <CacheManagementDashboard />
      {/* Rest of dashboard */}
    </div>
  );
}
```

Features:
- Real-time cache hit rate
- API success rate
- Response time tracking
- Memory usage monitoring
- Manual cache warmup
- Cache clear controls

## Advanced Usage

### Prefetching Specific Data

```javascript
import apiService from '../services/apiService';

// Prefetch single endpoint
await apiService.prefetch('/products');

// Prefetch multiple endpoints
import advancedCacheService from '../services/advancedCacheService';
await advancedCacheService.queuePrefetch([
  '/products',
  '/inventory',
  '/suppliers'
]);
```

### Role-Based Cache Warming

```javascript
import advancedCacheService from '../services/advancedCacheService';

// Admin gets analytics, orders, payments
await advancedCacheService.prefetchByRole('admin');

// Manager gets inventory and sales
await advancedCacheService.prefetchByRole('manager');

// User gets sales and products
await advancedCacheService.prefetchByRole('user');
```

### Performance Reporting

```javascript
import performanceService from '../services/performanceService';

const report = performanceService.getFullReport();

console.log('API Stats:', {
  totalRequests: report.apiStats.totalRequests,
  cacheHitRate: report.apiStats.cacheHitRate,
  avgResponseTime: report.apiStats.avgResponseTime,
  p95ResponseTime: report.apiStats.p95,
  p99ResponseTime: report.apiStats.p99,
  slowRequests: report.slowRequests
});

console.log('Render Stats:', {
  avgRenderTime: report.renderStats.avgRenderTime,
  slowestComponent: report.slowestComponent,
  fps: report.renderStats.fps
});
```

## Configuration

### Adjust Cache TTL

```javascript
// Global default is 5 minutes
const { data } = useApiData('/inventory', {
  cacheTTL: 10 * 60 * 1000 // 10 minutes
});
```

### Skip Cache for Specific Requests

```javascript
// Force network request, ignore cache
const { data } = useApiData('/inventory', { skipCache: true });
```

### Selective Caching (Backend)

Backend automatically excludes from caching:
- `/chatbot` - Real-time chat
- `/cache` - Cache statistics (dynamic)

To cache only specific endpoints, modify `cacheMiddleware.js`:

```javascript
// Example: Only cache inventory and products
const CACHED_ENDPOINTS = ['/products', '/inventory'];
const shouldCache = CACHED_ENDPOINTS.some(ep => req.path.includes(ep));
```

## Best Practices

1. **Use appropriate storage**:
   - Memory: User data, inventory (refreshed often)
   - LocalStorage: Preferences, user settings
   - SessionStorage: Workflow state (checkout, forms)

2. **Set realistic TTL**:
   - Fast-changing data: 1-2 minutes
   - Stable data: 5-10 minutes
   - Rarely changes: 30 minutes

3. **Enable auto-invalidation**:
   - Always use `autoInvalidate: true` for mutations
   - Prevents stale data bugs

4. **Monitor performance**:
   - Check cache hit rate (target >70%)
   - Identify slow API calls
   - Track memory usage

5. **Batch operations**:
   - Use `useBulkMutation` for importing data
   - Prevents overwhelming the server

## Troubleshooting

### Data not updating after mutation

Ensure `autoInvalidate: true` is set:
```javascript
const { mutate } = useMutation('/products', { autoInvalidate: true });
```

### Cache hit rate too low

1. Increase cache TTL
2. Add prefetching on page load
3. Check if skipCache is being used unnecessarily

### Memory usage increasing

1. Reduce TTL
2. Clear cache periodically
3. Use sessionStorage or localStorage instead of memory for large datasets

### Performance still slow

1. Check which API calls are slowest: `performanceService.getFullReport()`
2. Add prefetching for frequently accessed data
3. Consider moving expensive calculations to backend

## API Reference

See `advancedCacheService.js`, `performanceService.js`, and `apiService.js` for complete method documentation.

**Key Services:**
- `cacheService` - Basic memory/storage caching
- `advancedCacheService` - Smart invalidation and prefetching
- `performanceService` - Metrics tracking
- `apiService` - HTTP requests with caching

All services are singletons and auto-initialized.
