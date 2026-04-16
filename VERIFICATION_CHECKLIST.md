# ✅ VERIFICATION CHECKLIST - AI Chatbot Implementation

## Pre-Flight Checks

### Backend Setup
- [ ] Navigate to `backend` folder
- [ ] Run `npm install` (if not already done)
- [ ] Verify `@google/generative-ai` is installed: `npm list @google/generative-ai`
- [ ] Check `.env` file exists with:
  - [ ] `MONGO_URI=mongodb://127.0.0.1:27017/smart_inventory_forecasting`
  - [ ] `GEMINI_API_KEY=YOUR_ACTUAL_KEY` (replaced placeholder)
  - [ ] `GEMINI_MODEL=gemini-1.5-flash`

### Frontend Setup
- [ ] Navigate to `frontend` folder
- [ ] Run `npm install` (if needed)
- [ ] Check all components exist:
  - [ ] `src/components/ChatBot.jsx`
  - [ ] `src/components/ChatMessage.jsx`
  - [ ] `src/components/ChatResponse.jsx`
  - [ ] `src/components/SuggestionButtons.jsx`
  - [ ] `src/styles/chatbot.css`

### File Modifications
- [ ] `backend/server.js` - Contains `chatbotRoutes` import and registration
- [ ] `backend/.env` - Contains `GEMINI_API_KEY` (not placeholder)
- [ ] `frontend/src/layout/DashboardLayout.jsx` - Imports and renders `<ChatBot />`
- [ ] `frontend/src/services/apiClient.js` - Contains `chatbotAPI` exports

---

## Startup Verification

### Backend Startup
```bash
cd backend
npm start
```

Expected console output:
```
> backend@1.0.0 start
> node server.js

[dotenv] injecting env (19) from .env
Server running on port 5000
MongoDB Connected
🔄 Initializing enhanced email automation system...
✅ Email automation scheduled
```

**✅ PASS:** No errors, "Server running on port 5000"
**❌ FAIL:** TypeErrors or connection errors - check error message

### Frontend Startup
```bash
cd frontend
npm run dev
```

Expected console output:
```
VITE v7.3.1  ready in XXX ms
❯ Local:   http://localhost:5173/
```

**✅ PASS:** No errors, Vite dev server running
**❌ FAIL:** Build errors - check console for details

---

## Browser Testing

### Verify Login Works
1. Go to http://localhost:5173
2. See login page
3. Enter credentials and login
4. Redirected to dashboard

**✅ PASS:** Dashboard loads successfully
**❌ FAIL:** Check browser DevTools console for errors

### Verify Chat Widget Exists
1. On dashboard, look at bottom-right corner
2. Should see purple chat bubble (💬) button
3. Position: Fixed to bottom-right, visible above other content

**✅ PASS:** Purple chat bubble visible in corner
**❌ FAIL:** If not visible:
   - Check `DashboardLayout.jsx` has `<ChatBot />`
   - Hard refresh: Ctrl+Shift+R
   - Check browser DevTools console for errors

### Verify Chat Opens
1. Click the purple chat bubble
2. Chat window slides up from bottom-right
3. Shows welcome message
4. Displays suggestion buttons with categories

**✅ PASS:** Chat window opens smoothly with animations
**❌ FAIL:**
   - Check `chatbot.css` is imported
   - Check browser console for errors
   - Verify all component files exist

### Verify Suggestions Load
1. Chat window is open and empty
2. Should show categories: Sales, Inventory, Suppliers
3. Click each category, buttons change
4. Each button has emoji and text

**✅ PASS:** Categories work, suggestions visible
**❌ FAIL:**
   - Open DevTools → Network tab
   - Check GET `/chatbot/suggestions` request
   - Verify backend returns correct JSON

### Verify Query Works

#### Test 1: Click a Suggestion
1. Click "📈 Top 5 Products This Month" button
2. Message appears in chat: "What are my top 5 selling products this month?"
3. Loading dots appear (. . .)
4. Bot response appears with data

**✅ PASS:** Response appears within 3 seconds
**❌ FAIL:**
   - Check backend console for errors
   - Verify `GEMINI_API_KEY` is set in `.env`
   - Check Network tab for failed requests

#### Test 2: Type Custom Query
1. Type in input box: "show me low stock items"
2. Click Send button (or press Enter)
3. User message appears in chat
4. Loading indicator shows
5. Bot response appears

**✅ PASS:** Response appears with relevant data
**❌ FAIL:**
   - Check browser console for errors
   - Check backend logs for processing errors
   - Verify database has data: `mongosh smart_inventory_forecasting > db.products.countDocuments()`

---

## Response Format Verification

### Text Response ✅
User: "What's my inventory value?"
- Should see narrative text summary
- Example: "Your current inventory value is $125,000..."

### Table Response ✅
User: "Top 5 products"
- Should see table with columns
- Max 5 rows displayed
- Shows: product names, revenue, quantities

### Chart Response ✅
User: "Revenue by category"
- Should see mini bar chart
- Bars showing data values
- Labels on left

---

## Advanced Testing

### Test API with cURL

#### 1. Health Check
```bash
curl -X GET http://localhost:5000/api/chatbot/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected:
```json
{
  "success": true,
  "message": "Chatbot service is running",
  "geminiModel": "gemini-1.5-flash"
}
```

#### 2. Get Suggestions
```bash
curl -X GET http://localhost:5000/api/chatbot/suggestions \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected structure:
```json
{
  "success": true,
  "suggestions": {
    "sales": [
      {
        "label": "📈 Top 5 Products This Month",
        "query": "What are my top 5 selling products this month?"
      }
    ],
    "inventory": [...],
    "suppliers": [...]
  }
}
```

#### 3. Send Query
```bash
curl -X POST http://localhost:5000/api/chatbot/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are top products?"}'
```
Expected:
```json
{
  "success": true,
  "response": "Based on your sales data...",
  "type": "table",
  "data": [...],
  "intent": "top_products"
}
```

---

## Data Completeness Check

Before testing queries, ensure you have sample data:

```bash
mongosh smart_inventory_forecasting
```

Then run each:
```javascript
// Check products
db.products.countDocuments()  // Should be > 0

// Check sales
db.salesorders.countDocuments()  // Should be > 0

// Check inventory
db.inventorytransactions.countDocuments()  // Should be > 0

// Check suppliers
db.suppliers.countDocuments()  // Should be > 0
```

**✅ PASS:** All collections have data
**❌ FAIL:** Seed sample data:
   - Create products manually through API
   - Test with sample queries anyway

---

## Performance Benchmarks

| Metric | Expected | Status |
|--------|----------|--------|
| Chat bubble render | < 100ms | __ |
| Chat window open | 300ms animation | __ |
| Suggestion load | < 500ms | __ |
| Single query response | 1-3 seconds | __ |
| Message display | < 50ms | __ |
| Component mount | < 200ms | __ |

---

## UI/UX Verification

### Visual Checks
- [ ] Chat bubble is purple with gradient
- [ ] Chat window has header with title "📊 Inventory Assistant"
- [ ] Messages are formatted clearly (user on right, bot on left)
- [ ] Loading indicator animates (dots)
- [ ] Suggestion buttons have emojis and text
- [ ] Input box is visible and focusable
- [ ] Send button is clickable
- [ ] Close/clear buttons in header are visible
- [ ] Dark theme matches dashboard

### Interaction Checks
- [ ] Click bubble to open/close smoothly
- [ ] Suggestion categories switch instantly
- [ ] Suggestion buttons highlight on hover
- [ ] Input box auto-focuses when chat opens
- [ ] Enter key sends message (Shift+Enter = newline)
- [ ] Scroll to new messages automatically
- [ ] Clear button clears all messages
- [ ] Can open/close multiple times without issues

---

## Error Scenarios to Test

### Scenario 1: Missing GEMINI_API_KEY
- [ ] Set `GEMINI_API_KEY=` (empty) in `.env`
- [ ] Restart backend
- [ ] Try sending query
- [ ] Should get error message (not crash)

### Scenario 2: Invalid Query
- [ ] Send gibberish: "asdfghjkl lkjhgfds"
- [ ] Should get helpful response
- [ ] Not a chatbot error, natural fallback

### Scenario 3: No Data
- [ ] Query "top products" with empty database
- [ ] Should get message like "No data available"
- [ ] Not an error, graceful handling

### Scenario 4: Network Offline
- [ ] Disconnect internet
- [ ] Try to send message
- [ ] Should show connection error
- [ ] Check console for fetch error

### Scenario 5: Long Message
- [ ] Type 600+ characters
- [ ] Should get error "Message is too long"
- [ ] Enforces 500 character limit

---

## Sign-Off Checklist

When all items below are checked, implementation is complete:

- [ ] Backend runs without errors
- [ ] Frontend loads without errors
- [ ] Chat bubble visible in bottom-right
- [ ] Chat window opens/closes smoothly
- [ ] Suggestions load and display
- [ ] Can send preset suggestion and get response
- [ ] Can type custom query and get response
- [ ] Responses display in correct format (text/table/chart)
- [ ] Messages animate and display correctly
- [ ] Clear history button works
- [ ] GEMINI_API_KEY is configured (not placeholder)
- [ ] MongoDB has sample data
- [ ] No console errors in browser DevTools
- [ ] No errors in backend console
- [ ] All files created/modified are present
- [ ] Performance acceptable (< 3 seconds per query)

---

## If Any Checks Fail

### Step 1: Identify
Note which check failed and what error you see

### Step 2: Check Logs
- Browser: DevTools → Console (Ctrl+Shift+I)
- Backend: Terminal where `npm start` is running

### Step 3: Common Fixes
- **Component not found:** Check file path matches exactly
- **API error:** Check `.env` has `GEMINI_API_KEY` set
- **MongoDB error:** Run `mongosh` to verify connection
- **Network error:** Verify backend is running on port 5000
- **CSS not loading:** Hard refresh browser (Ctrl+Shift+R)

### Step 4: Report Status
When fixed, mark check as passed (✅) above

---

**Status:** Ready for Verification
**Date:** 2026-04-01
**Implementation:** COMPLETE ✅

Review the checklist above and verify each item. If all items are marked ✅, your AI Chatbot is fully operational!
