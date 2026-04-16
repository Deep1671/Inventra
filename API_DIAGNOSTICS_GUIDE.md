# API Data Fetching Troubleshooting Guide

## Issue Summary
After implementing the caching system, all API calls are failing. Components show no data.

## Quick Fix - Access the Diagnostics Page

1. **Open the API Diagnostics Page:**
   - Go to: `http://localhost:5174/api-diagnostics` (or your frontend port)
   - This page will test all API endpoints automatically
   - It shows which endpoints work and which fail

2. **Check the Results:**
   - ✅ **GREEN** endpoints = Working properly
   - ❌ **RED** endpoints = Failing

3. **For Failed Endpoints:**
   - Click on the endpoint to see error details
   - Check the Error Status Code
   - Check Error Message

## Common Issues & Solutions

### Issue 1: CORS Errors
**Error Message:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution:**
Backend already has CORS configured. Check if backend is running:
```bash
cd backend
npm start
```

If backend is running, check `server.js` for CORS setup.

---

### Issue 2: 404 - API Endpoints Not Found
**Error:** Status 404

**Possible Causes:**
1. Backend server not running
2. Routes not registered in backend
3. Wrong API path

**Solution:**
```bash
# First, ensure backend is running
cd backend
npm start

# Check logs for route registration errors
# Should see: "✓ Products route initialized"
# Should see: "✓ Suppliers route initialized"
# etc.
```

---

### Issue 3: Malformed Response Data
**Error:** Can fetch but components show no data

**If diagnostics show SUCCESS but data looks strange:**
- Component expects: `response.data.data || response.data`
- But we're returning: `response.data` (already unwrapped)

**This is likely NOT the issue since we fixed all components.**

---

### Issue 4: Cache Returning Stale/Empty Data
**Symptoms:** 
- First load returns empty array
- No data appears even after waiting

**Solution:**
Click buttons in Diagnostics page debug section:
- **Clear Token** - Removes auth token
- **Clear All localStorage** - Clears all cached data
- Then refresh and try diagnostics again

---

## Step-by-Step Troubleshooting

### Step 1: Verify Backend is Running
```bash
cd backend
npm start
```

Expected output:
```
✓ Server running on port 5000
✓ MongoDB connected
✓ All routes initialized
✓ Email service ready
```

**If backend won't start:**
- Check `backend/package.json` - ensure all dependencies installed
- Run: `npm install`
- Then try `npm start` again

---

### Step 2: Test API Directly with curl
```bash
# Test with authentication token
TOKEN="your-auth-token-from-localStorage"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/products
```

Expected: Should return JSON data or error with message

---

### Step 3: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors starting with `[API]`
4. Example errors:
   - `[API] ERROR: GET /products - 404 Not Found`
   - `[API] ERROR: GET /suppliers - Network timeout`

---

### Step 4: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Click on API requests
5. Check:
   - **URL** - Is it correct? (should start with `http://localhost:5000/api/`)
   - **Method** - Is it GET/POST as expected?
   - **Status** - What's the HTTP status code?
   - **Response** - What data is returned?

---

## Cache Invalidation

If you think the cache is serving stale data:

**In Diagnostics Page:**
- Click **Clear All localStorage** button
- Then click **Re-run Diagnostics**

**OR in Browser Console:**
```javascript
// Clear all cached API responses
localStorage.clear();
location.reload();
```

**OR disable cache entirely (temporary):**
Edit any page's useApiData call:
```javascript
// Change from:
useApiData('/products', { cacheTTL: 30 * 60 * 1000 })

// To:
useApiData('/products', { cacheTTL: 0 })  // 0 = No cache, always fetch fresh
```

---

## Response Structure Check

The apiService now returns unwrapped data:

**BEFORE (old apiClient):**
```javascript
const response = await api.get('/products');
response.data.data // ← Need to unwrap
```

**AFTER (new apiService with caching):**
```javascript
const response = await api.get('/products');
// response IS the actual data array, already unwrapped
// But we handle both cases with: data?.data || data || []
```

All components are updated to handle both, so this shouldn't be an issue.

---

## Authentication Issues

If APIs are failing with 401/403:

1. **Check Auth Token:**
   - Open DevTools Console
   - Type: `localStorage.getItem('token')`
   - Should return a JWT token, not `null`

2. **If no token:**
   - You're not logged in
   - Go back to login page
   - Login with valid credentials
   - Then try accessing pages again

3. **If token exists but still 401:**
   - Token might be expired
   - Log out and log back in
   - In Diagnostics: Click **Clear Token** → Re-run

---

## Debug Console Commands

Open Browser Console (F12) and try these:

```javascript
// Check if auth token exists
localStorage.getItem('token')

// Check API response history
JSON.parse(localStorage.getItem('api_responses_history'))

// Clear all cache
localStorage.clear()

// Check specific endpoint's cache
cacheService?.get('api_request_/products')

// Get cache statistics
localStorage.getItem('cache_stats')
```

---

## Still Having Issues?

Follow this order:
1. ✅ Run API Diagnostics page (`/api-diagnostics`)
2. ✅ Check which endpoints fail
3. ✅ See error messages in the page
4. ✅ Start backend if not running
5. ✅ Clear cache/token
6. ✅ Check browser console for [API] error logs
7. ✅ Check Network tab in DevTools

## Real-Time Debugging

Add this to any page to see what's happening:

```javascript
const { data, loading, error, refetch } = useApiData('/products', {
  cacheTTL: 30 * 60 * 1000,
  onSuccess: (data) => console.log('✅ SUCCESS:', data),
  onError: (err) => console.error('❌ ERROR:', err)
});

// In your JSX, show debug info:
{error && <div style={{color:'red'}}>Error: {error.message}</div>}
{loading && <div>Loading...</div>}
{!data?.length && !loading && <div>No data returned</div>}
```

---

## Key Points to Remember

- **apiService wraps all requests** - All API calls go through caching
- **Responses are unwrapped** - `api.get('/products')` returns the data directly, not `{ data: ... }`
- **Components handle both formats** - We use `???data || data || []` for safety
- **Cache is transparent** - First 30 minutes uses cache, then auto-refreshes
- **Hard refresh bypasses cache** - Use Ctrl+Shift+R to fetch fresh data

---

## Next Steps

1. **Access diagnostics page** - See which endpoints work
2. **Report findings** - Share any errors from diagnostics  
3. **Provide backend logs** - Run `npm start` and show any errors
4. **Share network errors** - Check DevTools Network tab for request failures
