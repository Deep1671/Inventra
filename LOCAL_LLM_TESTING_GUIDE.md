# Local LLM Testing Guide

## **🧪 PRE-TESTING CHECKLIST**

- [ ] Ollama installed and running (`ollama serve` in terminal)
- [ ] Model pulled (`ollama list` shows your model)
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] You're logged in to the application
- [ ] `.env` file has `OLLAMA_BASE_URL` and `OLLAMA_MODEL` set

---

## **🔍 TEST 1: Ollama Connection**

### Via Browser
1. Go to: http://localhost:5173/insights
2. Check the status banner at the top
3. Should show: **✓ Ollama LLM Connected**

### Via Terminal
```bash
# Test if Ollama is running
curl http://localhost:11434/api/tags

# Expected response:
# { "models": [{ "name": "mistral:latest", ... }] }
```

### Via Backend
```bash
# With valid token, test the health endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/insights/health

# Expected response:
# {
#   "status": "connected",
#   "message": "Ollama LLM service is running",
#   "models": [{"name": "mistral:latest", ...}]
# }
```

**✓ PASS:** Status shows "connected"
**✗ FAIL:** Status shows "disconnected" - Start Ollama service

---

## **🧪 TEST 2: English Insight Generation**

### Via Frontend
1. Go to Insights page
2. Language: Select "English"
3. Category: Select "Inventory"
4. Click "📦 Inventory" button
5. Wait for response

**Expected:** See insight about inventory analysis

### Via Terminal
```bash
curl -X POST http://localhost:5000/api/insights/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are inventory best practices?",
    "language": "en"
  }'

# Expected response:
# {
#   "success": true,
#   "insight": "Best practices include...",
#   "language": "en",
#   "model": "mistral"
# }
```

**✓ PASS:** Insight text generated and displayed
**✗ FAIL:** Check error message - Start Ollama or check backend logs

---

## **🧪 TEST 3: Hindi Insight Generation**

### Via Frontend
1. Language: Select "Hindi (हिंदी)"
2. Category: Select "Sales"
3. Click "📊 Sales" button
4. Wait for response

**Expected:** See insight in Hindi language

### Via Terminal
```bash
curl -X POST http://localhost:5000/api/insights/generate-hindi \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "बिक्री के लिए सुझाव दें"
  }'

# Expected response in Hindi
```

**✓ PASS:** Hindi text appears correctly
**✗ FAIL:** Replace with Engligh text, or check browser encoding

---

## **🧪 TEST 4: Category Insights**

### Inventory Insights
```bash
curl -X POST http://localhost:5000/api/insights/inventory \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryData": {
      "totalProducts": 100,
      "lowStockCount": 5,
      "outOfStock": 1,
      "totalValue": 500000,
      "lowStockProducts": [
        {"name": "Product A", "current_stock": 3, "reorder_point": 10}
      ]
    },
    "language": "en"
  }'
```

### Sales Insights
```bash
curl -X POST http://localhost:5000/api/insights/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "salesData": {
      "todayTotal": 25000,
      "weekTotal": 150000,
      "monthTotal": 600000,
      "avgOrderValue": 10000,
      "topProduct": "Premium Item",
      "totalOrders": 60
    },
    "language": "en"
  }'
```

### Supplier Insights
```bash
curl -X POST http://localhost:5000/api/insights/supplier \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supplierData": {
      "totalSuppliers": 20,
      "avgLeadTime": 5,
      "onTimeRate": 90,
      "qualityScore": 8.5,
      "totalPayments": 1000000,
      "topSuppliers": [
        {"name": "Big Supplier", "performance": "Excellent"}
      ]
    },
    "language": "en"
  }'
```

**✓ PASS:** All endpoints return meaningful insights
**✗ FAIL:** Check LLM status and error messages

---

## **🧪 TEST 5: Custom Query**

### Via Frontend
1. In "Custom Query" field, enter: "How can I reduce costs?"
2. Click "Ask" button
3. Wait for response

### Via Terminal
```bash
curl -X POST http://localhost:5000/api/insights/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How can I optimize my supply chain?",
    "language": "en"
  }'
```

**✓ PASS:** Custom query answered appropriately
**✗ FAIL:** Check model availability or Ollama status

---

## **🧪 TEST 6: Actionable Summary**

### Via Frontend
1. Category: Select any category
2. Click "✅ Actionable" button
3. Check response includes numbered steps

### Via Terminal
```bash
curl -X POST http://localhost:5000/api/insights/actionable-summary \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {"sample": "data"},
    "category": "inventory",
    "language": "en"
  }'
```

**✓ PASS:** Response includes numbered action items
**✗ FAIL:** Check model supports structured outputs

---

## **🧪 TEST 7: Batch Insights**

```bash
curl -X POST http://localhost:5000/api/insights/batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      "How is inventory performing?",
      "What about sales trends?",
      "Supplier recommendations?"
    ],
    "language": "en"
  }'

# Expected: Array of responses
```

**✓ PASS:** All queries answered
**✗ FAIL:** Check Ollama availability

---

## **🧪 TEST 8: Translation**

```bash
curl -X POST http://localhost:5000/api/insights/translate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Low inventory alert",
    "targetLanguage": "hi"
  }'

# Expected: Hindi translation
```

**✓ PASS:** Text translated correctly
**✗ FAIL:** Model may not support translation

---

## **🧪 TEST 9: Get Models List**

### Via Terminal
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/insights/models

# Expected response showing available models
```

**✓ PASS:** Lists all available models
**✗ FAIL:** Ollama not running

---

## **🧪 TEST 10: Language Support**

### English Tests
- [ ] Generate English insight
- [ ] Custom English query
- [ ] English category insights
- [ ] English actionable items

### Hindi Tests
- [ ] Generate Hindi insight via button
- [ ] Custom Hindi query (optional)
- [ ] Hindi text displays correctly (no boxes/garbles)
- [ ] Hindi in responses is readable

**✓ PASS:** Both languages work
**✗ FAIL:** Check browser UTF-8 encoding

---

## **🧪 TEST 11: Performance**

### Response Time Test
Time the response for each query type:

```
Insight Type          Expected Time    Actual Time
─────────────────────────────────────────────────────
English Query         3-8 seconds      ___________
Hindi Query           3-8 seconds      ___________
Inventory Insight     5-10 seconds     ___________
Batch (3 queries)     15-25 seconds    ___________
Short Query           2-5 seconds      ___________
```

**✓ PASS:** All responses within 30 seconds
**⚠ WARNING:** If > 30 seconds, model may be too large
**✗ FAIL:** If > 60 seconds, consider smaller model

---

## **🧪 TEST 12: Error Handling**

### Test 1: Ollama Down
1. Stop Ollama (`Ctrl+C` in terminal running `ollama serve`)
2. Try to generate insight
3. Should show: "Ollama LLM service is not running"
4. Restart Ollama

**✓ PASS:** Clear error message shown

### Test 2: Invalid Token
```bash
curl -X POST http://localhost:5000/api/insights/generate \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "language": "en"}'

# Should return 401 Unauthorized
```

**✓ PASS:** 401 error returned

### Test 3: Missing Data
```bash
curl -X POST http://localhost:5000/api/insights/inventory \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' # Missing inventoryData

# Should return 400 Bad Request
```

**✓ PASS:** 400 error with message

---

## **📋 COMPLETE TEST SUMMARY**

| Test | Result | Notes |
|------|--------|-------|
| 1. Ollama Connection | ☐ PASS ☐ FAIL | |
| 2. English Insights | ☐ PASS ☐ FAIL | |
| 3. Hindi Insights | ☐ PASS ☐ FAIL | |
| 4. Inventory Insights | ☐ PASS ☐ FAIL | |
| 5. Sales Insights | ☐ PASS ☐ FAIL | |
| 6. Supplier Insights | ☐ PASS ☐ FAIL | |
| 7. Custom Query | ☐ PASS ☐ FAIL | |
| 8. Actionable Summary | ☐ PASS ☐ FAIL | |
| 9. Batch Insights | ☐ PASS ☐ FAIL | |
| 10. Translation | ☐ PASS ☐ FAIL | |
| 11. Models List | ☐ PASS ☐ FAIL | |
| 12. Language Support | ☐ PASS ☐ FAIL | |
| 13. Performance | ☐ PASS ☐ FAIL | |
| 14. Error Handling | ☐ PASS ☐ FAIL | |

---

## **🔧 DEBUGGING**

### Enable Backend Logs
Edit `backend/server.js`:
```javascript
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
```

### Check Ollama Status
```bash
# List running instances
ollama list

# Active processes
tasklist | findstr ollama
```

### Check Network
```bash
# Test connectivity
curl http://localhost:11434/api/tags

# Check port 5000
netstat -ano | findstr :5000

# Check port 11434
netstat -ano | findstr :11434
```

### Check Logs
- **Backend:** Check terminal running `npm start`
- **Ollama:** Check terminal running `ollama serve`
- **Frontend:** Check browser console (F12)

---

## **✅ COMPLETION**

When all tests pass, your system is ready:
- ✓ Ollama integrated
- ✓ Hindi language support
- ✓ English language support
- ✓ All endpoints working
- ✓ Error handling in place
- ✓ Performance acceptable
- ✓ Ready for production

---

**Last Updated:** April 4, 2026
**Version:** 1.0
