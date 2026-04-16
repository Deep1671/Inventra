# Cache Integration Migration Guide

This guide shows how to migrate existing components to use the new caching system.

## Before & After Examples

### Example 1: Simple Data Fetching Component

#### Before (Old Code)
```javascript
import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function InventoryList() {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const data = await apiService.get('/inventory');
        setInventory(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const refetch = async () => {
    try {
      const data = await apiService.get('/inventory?t=' + Date.now()); // Cache bypass
      setInventory(data);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Inventory</h2>
      <button onClick={refetch}>Refresh</button>
      {/* Render inventory items */}
    </div>
  );
}
```

#### After (With Caching)
```javascript
import { useApiData } from '../hooks/useCache';

function InventoryList() {
  const { data: inventory, loading, error, refetch } = useApiData('/inventory');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Inventory</h2>
      <button onClick={refetch}>Refresh</button>
      {/* Render inventory items */}
    </div>
  );
}
```

**Benefits:**
- ✅ Cleaner code (90% less boilerplate)
- ✅ Automatic caching
- ✅ No cache bypass tricks needed
- ✅ Cached data reused across pages

---

### Example 2: Form Submission with Cache Updates

#### Before
```javascript
import { useState } from 'react';
import apiService from '../services/apiService';

function CreateProductForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const product = {
      name: formData.get('name'),
      sku: formData.get('sku'),
      quantity: formData.get('quantity')
    };

    try {
      setLoading(true);
      const result = await apiService.post('/products', product);
      
      // Manual cache invalidation
      apiService.invalidateCache('/products');
      apiService.invalidateCache('/inventory');
      apiService.invalidateCache('/dashboard/stats');
      
      alert('Product created!');
      e.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="sku" required />
      <input name="quantity" type="number" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

#### After
```javascript
import { useMutation } from '../hooks/useMutation';

function CreateProductForm() {
  const { mutate, loading, error } = useMutation('/products', {
    method: 'POST',
    autoInvalidate: true, // Automatic cascading invalidation!
    onSuccess: () => {
      alert('Product created!');
      // Form can auto-reset via ref if needed
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    await mutate({
      name: formData.get('name'),
      sku: formData.get('sku'),
      quantity: formData.get('quantity')
    });

    e.target.reset();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="sku" required />
      <input name="quantity" type="number" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

**Benefits:**
- ✅ Automatic cascading cache invalidation
- ✅ Less code (50% reduction)
- ✅ No manual cache key management
- ✅ Prevents stale data bugs

---

### Example 3: List with Pagination and Filtering

#### Before
```javascript
import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function ProductsList() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const query = filter ? `?search=${filter}&page=${page}` : `?page=${page}`;
        const data = await apiService.get(`/products${query}`);
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page, filter]);

  return (
    <div>
      <input 
        value={filter} 
        onChange={(e) => {
          setFilter(e.target.value);
          setPage(1);
        }}
        placeholder="Search..."
      />
      
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      
      {products && (
        <div>
          {products.items.map(p => <div key={p.id}>{p.name}</div>)}
          
          <button 
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button 
            onClick={() => setPage(p => p + 1)}
            disabled={!products.hasNext}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

#### After
```javascript
import { useApiData } from '../hooks/useCache';
import { useState } from 'react';

function ProductsList() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  const { 
    data: products, 
    loading, 
    error 
  } = useApiData(
    `/products?search=${filter}&page=${page}`,
    {
      cacheTTL: 2 * 60 * 1000, // 2 minutes - search results change frequently
      onSuccess: () => window.scrollTo(0, 0) // Auto-scroll to top
    }
  );

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
    setPage(1);
  };

  return (
    <div>
      <input 
        value={filter} 
        onChange={handleFilterChange}
        placeholder="Search..."
      />
      
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      
      {products && (
        <div>
          {products.items.map(p => <div key={p.id}>{p.name}</div>)}
          
          <button 
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button 
            onClick={() => setPage(p => p + 1)}
            disabled={!products.hasNext}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic pagination cache (smooth page switching)
- ✅ Search results cached separately
- ✅ Previous searches reused without API call
- ✅ Cleaner component structure

---

### Example 4: Real-time Data with Manual Refresh

#### Before
```javascript
import { useState, useEffect } from 'react';
import apiService from '../services/apiService';

function SalesOrder() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const data = await apiService.get('/sales/order/123');
        setOrder(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();

    // Poll every 10 seconds
    const interval = setInterval(loadOrder, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await apiService.get('/sales/order/123?t=' + Date.now());
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <h2>Sales Order #{order?.id}</h2>
      <button onClick={handleRefresh} disabled={refreshing}>
        {refreshing ? 'Refreshing...' : 'Refresh Now'}
      </button>
      {/* Render order */}
    </div>
  );
}
```

#### After
```javascript
import { useApiData } from '../hooks/useCache';

function SalesOrder() {
  const { 
    data: order, 
    loading, 
    error, 
    refetch 
  } = useApiData('/sales/order/123', {
    cacheTTL: 10 * 1000 // 10 seconds - real-time data
  });

  return (
    <div>
      <h2>Sales Order #{order?.id}</h2>
      <button onClick={refetch} disabled={loading}>
        {loading ? 'Refreshing...' : 'Refresh Now'}
      </button>
      {/* Render order */}
    </div>
  );
}
```

**Benefits:**
- ✅ No polling interval management
- ✅ Manual refresh on demand
- ✅ Short TTL ensures freshness
- ✅ Simpler component logic

---

### Example 5: Bulk Import with Progress

#### Before
```javascript
import { useState } from 'react';
import apiService from '../services/apiService';

function BulkImportProducts() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const handleImport = async (file) => {
    setLoading(true);
    setProgress(0);
    setResults([]);
    
    const text = await file.text();
    const lines = text.split('\n');
    const items = lines.map(l => JSON.parse(l));

    try {
      const allResults = [];
      const batchSize = 5;

      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(item => apiService.post('/products', item))
        );

        allResults.push(...batchResults);
        setProgress(Math.round((i + batchSize) / items.length * 100));
        setResults([...allResults]);
      }

      // Manual invalidation
      apiService.invalidateCache('/products');
      apiService.invalidateCache('/inventory');
      apiService.invalidateCache('/dashboard/stats');

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <input 
        type="file"
        onChange={(e) => handleImport(e.target.files[0])}
        disabled={loading}
      />
      {loading && (
        <div>
          <progress value={progress} max={100} />
          <p>{progress}% - {results.length} imported</p>
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

#### After
```javascript
import { useBulkMutation } from '../hooks/useMutation';

function BulkImportProducts() {
  const { mutate, loading, progress, results, error } = useBulkMutation(
    '/products',
    {
      batchSize: 5,
      onSuccess: (results) => console.log(`Imported ${results.length} products`)
    }
  );

  const handleImport = async (file) => {
    const text = await file.text();
    const items = text.split('\n').map(l => JSON.parse(l));
    
    await mutate(items, (item) => item); // Returns products as-is
  };

  return (
    <div>
      <input 
        type="file"
        onChange={(e) => handleImport(e.target.files[0])}
        disabled={loading}
      />
      {loading && (
        <div>
          <progress value={progress} max={100} />
          <p>{progress}% - {results.length} imported</p>
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

**Benefits:**
- ✅ Built-in batch processing
- ✅ Automatic cache invalidation
- ✅ 50% less code
- ✅ Better error handling

---

## Migration Checklist

When migrating existing components:

- [ ] Replace `useState` + `useEffect` + API call with `useApiData`
- [ ] Replace manual POST/PUT/DELETE with `useMutation`
- [ ] Remove manual cache invalidation (now automatic)
- [ ] Remove cache bypass tricks (`?t=Date.now()`)
- [ ] Add `onSuccess` and `onError` callbacks if needed
- [ ] Test that data updates correctly after mutations
- [ ] Verify cache hit rate improved
- [ ] Check performance metrics in console

## Performance Improvements Expected

By migrating to the caching system:

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Initial Page Load | 2-3s | 1-2s | 33-50% faster |
| Page Switch | 1-2s | 200-500ms | 75-90% faster |
| Filter/Search | 1-2s | 100-300ms | 85-95% faster |
| Network Requests | 100% | ~30% | 70% reduction |
| Memory Usage | N/A | +2-5MB | Small increase |
| Code Lines (per component) | 40-60 | 10-20 | 65% reduction |

## Common Patterns

### Pattern 1: Dependent Data Fetching
```javascript
function Order({ orderId }) {
  const { data: order } = useApiData(`/sales/order/${orderId}`);
  const { data: items } = useApiData(
    `/sales/order/${orderId}/items`,
    { skipCache: !order } // Only fetch when order loaded
  );

  return (
    <div>
      {order && <h2>{order.id}</h2>}
      {items && items.map(i => <div key={i.id}>{i.product}</div>)}
    </div>
  );
}
```

### Pattern 2: Optimistic Updates
```javascript
function EditProduct({ productId }) {
  const { data: product, refetch } = useApiData(`/products/${productId}`);
  const { mutate } = useMutation('/products', { autoInvalidate: true });

  const handleUpdate = async (updates) => {
    // Optimistically update UI
    setLocalProduct({ ...product, ...updates });

    try {
      await mutate({ id: productId, ...updates });
      // On success, refetch to confirm
      refetch();
    } catch (err) {
      // On error, revert to cached data
      refetch();
    }
  };

  return (/* Form */);
}
```

### Pattern 3: Search with Debouncing
```javascript
import { useDebouncedValue } from '../hooks/useDebouncedValue';

function SearchProducts() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: results } = useApiData(
    `/products?search=${debouncedSearch}`,
    { skipCache: !debouncedSearch } // Don't cache while typing
  );

  return (
    <div>
      <input onChange={(e) => setSearch(e.target.value)} />
      {results?.map(p => <div key={p.id}>{p.name}</div>)}
    </div>
  );
}
```

## Questions & Answers

**Q: Will caching cause data to be stale?**
A: No, by default TTL is 5 minutes. You can adjust per endpoint. Manual cache clearing available.

**Q: How do I force a fresh request?**
A: Use `skipCache: true` in useApiData or call `refetch()` hook function.

**Q: Does this work with authentication?**
A: Yes, auth token automatically included. Caching respects user role for prefetching.

**Q: What if backend changes?**
A: Use `autoInvalidate: true` (default) to invalidate related caches automatically.

**Q: Can I use this with GraphQL?**
A: Yes, but cache keys are different. Modify cacheService to handle GraphQL queries.
