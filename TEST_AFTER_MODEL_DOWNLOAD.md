# Test Ollama + Insights Integration

After the model finishes downloading, test these endpoints:

## Test 1: Check Model Loaded
```powershell
curl -s http://localhost:11434/api/tags | ConvertFrom-Json | Select-Object models
```

Expected: Should show `mistral` in the models list

## Test 2: Check Health Endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/insights/health
```

Expected: Should return `"status": "connected"`

## Test 3: Generate Quick Insight
```bash
curl -X POST http://localhost:5000/api/insights/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are 3 inventory best practices?",
    "language": "en"
  }'
```

Expected: Should return an insight response

## Test 4: Generate Hindi Insight
```bash
curl -X POST http://localhost:5000/api/insights/generate-hindi \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "मेरी बिक्री कैसी चल रही है?"
  }'
```

Expected: Should return response in Hindi

---

## Troubleshooting During Download

If download seems stuck:
1. Check network connection
2. Ollama can pause and resume - just give it time
3. If needed, Ctrl+C and try again: `ollama pull mistral`

---

Once download completes, refresh http://localhost:5173/insights and the error should be gone!
