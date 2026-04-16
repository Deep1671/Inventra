# Local LLM Integration - Quick Reference Card

## **⚡ 15-MINUTE SETUP**

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Download model (one-time)
ollama pull mistral

# Terminal 3: Start Backend
cd backend
npm start

# Terminal 4: Start Frontend
cd frontend
npm run dev

# Browser: Open Insights
http://localhost:5173/insights
```

---

## **📍 File Structure**

```
smart_Inventory_management/
├── backend/
│   ├── services/
│   │   └── localLLMService.js          ← LLM core functions
│   ├── routes/
│   │   └── insightsRoutes.js            ← API endpoints
│   └── server.js                        ← Updated with routes
├── frontend/
│   └── src/
│       ├── pages/
│       │   └── Insights.jsx             ← UI Dashboard
│       ├── components/
│       │   └── Sidebar.jsx              ← Added menu link
│       └── App.jsx                      ← Added route
└── Documentation/
    ├── LOCAL_LLM_SETUP_GUIDE.md
    ├── LOCAL_LLM_IMPLEMENTATION_GUIDE.md
    ├── LOCAL_LLM_TESTING_GUIDE.md
    └── setup-ollama.bat
```

---

## **🎯 API QUICK REFERENCE**

### Base URL
```
http://localhost:5000/api/insights
```

### Common Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Key Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check Ollama connection |
| `/models` | GET | List available models |
| `/generate` | POST | Generic insight |
| `/generate-hindi` | POST | Hindi insight |
| `/inventory` | POST | Inventory analysis |
| `/sales` | POST | Sales analysis |
| `/supplier` | POST | Supplier analysis |
| `/actionable-summary` | POST | Action items |
| `/batch` | POST | Multiple insights |
| `/translate` | POST | Translate text |

---

## **💬 EXAMPLE REQUESTS**

### 1. Generate English Insight
```bash
curl -X POST http://localhost:5000/api/insights/generate \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What inventory improvements should I prioritize?",
    "language": "en"
  }'
```

### 2. Generate Hindi Insight
```bash
curl -X POST http://localhost:5000/api/insights/generate-hindi \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "मेरी बिक्री के लिए सुझाव दें"
  }'
```

### 3. Inventory Analysis
```bash
curl -X POST http://localhost:5000/api/insights/inventory \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryData": {
      "totalProducts": 150,
      "lowStockCount": 12,
      "outOfStock": 2,
      "totalValue": 250000,
      "lowStockProducts": [
        {"name": "Item A", "current_stock": 5, "reorder_point": 20}
      ]
    },
    "language": "en"
  }'
```

### 4. Get Available Models
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/insights/models
```

---

## **🧠 SERVICE FUNCTIONS**

### In `localLLMService.js`

```javascript
// Generate insight
generateInsight(query, language, model)

// Category insights
generateInventoryInsights(data, language, model)
generateSalesInsights(data, language, model)
generateSupplierInsights(data, language, model)

// Utilities
generateActionableSummary(data, category, language, model)
batchGenerateInsights(queries, language, model)
translateText(text, targetLanguage, model)
getAvailableModels()
checkOllamaConnection()
```

### Usage Example
```javascript
const llm = require('./services/localLLMService');

// Generate Hindi insight
const result = await llm.generateHindiInsight(
  "मेरी स्थिति क्या है?"
);

// Generate inventory insights
const inventory = await llm.generateInventoryInsights({
  totalProducts: 100,
  lowStockCount: 5
}, 'hi');
```

---

## **🌐 LANGUAGE SUPPORT**

### Available Languages
- **en** - English
- **hi** - Hindi (हिंदी)

### Bilingual Features
```javascript
// Auto-detect Hindi or English
const language = userPreference; // 'en' or 'hi'
await generateInsight(query, language);

// English response
response.language === 'en'

// Hindi response  
response.language === 'hi'
```

### Hindi Template Support
```javascript
// System prompts in Hindi
const templateHi = `आप एक व्यावसायिक सलाहकार हैं...`

// Transliteration support
const transliterated = convertToHindi(englishText);
```

---

## **📊 DATA FORMATS**

### Inventory Data
```javascript
{
  totalProducts: Number,
  lowStockCount: Number,
  outOfStock: Number,
  totalValue: Number,
  lowStockProducts: [
    { name: String, current_stock: Number, reorder_point: Number }
  ]
}
```

### Sales Data
```javascript
{
  todayTotal: Number,
  weekTotal: Number,
  monthTotal: Number,
  avgOrderValue: Number,
  topProduct: String,
  totalOrders: Number
}
```

### Supplier Data
```javascript
{
  totalSuppliers: Number,
  avgLeadTime: Number,
  onTimeRate: Number,  // 0-100
  qualityScore: Number, // 0-10
  totalPayments: Number,
  topSuppliers: [
    { name: String, performance: String }
  ]
}
```

---

## **🔌 ENVIRONMENT VARIABLES**

Add to `backend/.env`:
```
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Feature Flags
LOCAL_LLM_ENABLED=true
HINDI_SUPPORT=true
```

---

## **🛠️ MODEL COMPARISON**

| Model | Size | Speed | Quality | RAM | Best For |
|-------|------|-------|---------|-----|----------|
| mistral | 4.1GB | ⚡⚡⚡ | ★★★★★ | 8GB | General use |
| neural-chat | 4.1GB | ⚡⚡⚡ | ★★★★☆ | 6GB | Speed |
| orca-mini | 1.7GB | ⚡⚡ | ★★★☆☆ | 4GB | Limited resources |
| indic-trans | 2.5GB | ⚡⚡ | ★★★★☆ | 6GB | Hindi |

---

## **🚀 PERFORMANCE TIPS**

1. **Start Small**
   ```bash
   ollama pull orca-mini
   ```

2. **Close Background Apps**
   - Reduces memory pressure
   - Faster responses

3. **Use Batch for Multiple Queries**
   ```bash
   curl -X POST /api/insights/batch \
     -d '{"queries": [q1, q2, q3]}'
   ```

4. **Cache Common Queries**
   - Store responses
   - Reuse results

5. **Monitor with `ollama list`**
   - Check loaded models
   - Free memory if needed

---

## **🐛 TROUBLESHOOTING**

| Problem | Solution |
|---------|----------|
| "Ollama not running" | Run `ollama serve` in terminal |
| "Connection refused" | Check localhost:11434 is accessible |
| "Out of memory" | Use smaller model (orca-mini) |
| "Slow responses" | Close apps, use faster model |
| "Hindi text broken" | Check browser UTF-8 encoding |
| "Model not found" | Run `ollama pull mistral` |
| "404 Not found" | Ensure backend running on port 5000 |
| "401 Unauthorized" | Check JWT token validity |

---

## **📱 FRONTEND USAGE**

### Insights Page (`/insights`)
- **Language selector** - Choose English or Hindi
- **Category buttons** - Quick actions for inventory, sales, supplier
- **Custom query** - Ask anything
- **Actionable button** - Get 3 specific action items
- **History** - View all generated insights
- **Delete** - Remove individual insights

### Navigation
- **Sidebar** → "🤖 AI Insights" → Opens insights page
- **Mobile** - Fully responsive design

---

## **🔐 SECURITY NOTES**

1. **Auth Required** - All endpoints need Bearer token
2. **Local Processing** - No data sent to cloud
3. **Rate Limiting** - Implement in production
4. **CORS** - Configure for your domain
5. **Token Expiry** - JWT expires in 1 day

---

## **📈 PRODUCTION CHECKLIST**

- [ ] All tests passing (see testing guide)
- [ ] Ollama running on startup (systemd/service)
- [ ] Model cached and ready
- [ ] Backend on production port
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Monitoring in place
- [ ] Backups scheduled
- [ ] Documentation reviewed

---

## **💡 NEXT STEPS**

1. **Basic Setup** (15 min)
   - Install Ollama
   - Pull model
   - Start servers

2. **Testing** (10 min)
   - Run POST requests
   - Check English output
   - Check Hindi output

3. **Integration** (Optional)
   - Add to chatbot
   - Add to dashboard
   - Show daily insights

4. **Customization** (Optional)
   - Add company-specific prompts
   - Create custom categories
   - Build insight reports

---

## **📞 QUICK LINKS**

- **Ollama**: https://ollama.ai
- **Models**: https://ollama.ai/library
- **GitHub**: https://github.com/ollama/ollama
- **Issues**: Search GitHub for solutions

---

## **⏱️ RESPONSE TIME EXPECTATIONS**

```
Hardware          Mistral    Neural-Chat   Orca-Mini
─────────────────────────────────────────────────────
4GB RAM           8-12s      6-10s         3-5s
8GB RAM + HDD     5-8s       4-6s          2-3s
8GB RAM + SSD     4-6s       3-5s          1-2s
Modern GPU        1-3s       1-2s          <1s
```

---

## **📝 VERSION & SUPPORT**

- **Version:** 1.0
- **Date:** April 4, 2026
- **Status:** Production Ready
- **Support:** Community-driven via Ollama GitHub

---

**Print this card and keep it handy!**

For detailed information, see:
- Setup Guide: `LOCAL_LLM_SETUP_GUIDE.md`
- Implementation: `LOCAL_LLM_IMPLEMENTATION_GUIDE.md`
- Testing: `LOCAL_LLM_TESTING_GUIDE.md`
