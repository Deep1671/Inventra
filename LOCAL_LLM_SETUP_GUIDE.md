# Local LLM Integration Guide - Ollama Setup

## **Step 1: Install Ollama**

### Windows Installation
1. Download Ollama from: https://ollama.ai
2. Run the installer
3. Open Command Prompt and verify installation:
   ```bash
   ollama --version
   ```

### Start Ollama Service
```bash
ollama serve
# This starts Ollama on localhost:11434
```

---

## **Step 2: Pull Hindi-Capable Models for Limited Hardware**

### Recommended Models (< 8GB RAM)

**Option A: Mistral 7B (Lightweight & Fast) - RECOMMENDED**
```bash
ollama pull mistral
```
- Size: ~4.1 GB
- RAM Required: 8 GB minimum
- Speed: Very fast
- Quality: Excellent for inventory insights

**Option B: Neural Chat 7B (Even Lighter)**
```bash
ollama pull neural-chat
```
- Size: ~4.1 GB
- RAM Required: 8 GB
- Speed: Super fast

**Option C: Orca Mini (Smallest)**
```bash
ollama pull orca-mini
```
- Size: ~1.7 GB
- RAM Required: 4 GB
- Speed: Fast
- Great for limited hardware

**Option D: Indic Models (Best for Hindi)**
```bash
ollama pull indic-trans
# or
ollama pull bhashini
```
- Best Hindi support
- Optimized for Indian languages

---

## **Step 3: Backend Integration**

Create file: `backend/services/localLLMService.js`

---

## **Step 4: Create API Endpoints**

Create file: `backend/routes/insightsRoutes.js`

---

## **Step 5: Frontend Integration**

Create file: `frontend/src/pages/Insights.jsx`
Create file: `frontend/src/components/InsightCard.jsx`

---

## **Quick Start Commands**

### Terminal 1 - Start Ollama Server
```bash
ollama serve
```

### Terminal 2 - Pull Model (one-time)
```bash
ollama pull mistral
```

### Terminal 3 - Start Backend
```bash
cd backend
npm start
```

### Terminal 4 - Start Frontend
```bash
cd frontend
npm run dev
```

---

## **Testing Local LLM**

### Test via cURL
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "What are inventory management tips?",
  "stream": false
}'
```

### Test via Backend
```bash
# Server will be running on PORT 5000
curl http://localhost:5000/api/insights/generate-hindi \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "inventory low", "language": "hi"}'
```

---

## **Environment Variables**

Add to `.env`:
```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
HINDI_SUPPORT=true
LOCAL_LLM_ENABLED=true
```

---

## **Hardware Requirements**

| Model | Size | RAM | CPU | GPU | Speed |
|-------|------|-----|-----|-----|-------|
| Orca Mini | 1.7 GB | 4 GB | ✓ | Optional | Fast |
| Neural Chat | 4.1 GB | 8 GB | ✓ | Optional | Very Fast |
| Mistral | 4.1 GB | 8 GB | ✓ | Recommended | Very Fast |
| Indic-Trans | 2.5 GB | 6 GB | ✓ | Optional | Good |

---

## **First-Time Setup Checklist**

- [ ] Download & Install Ollama
- [ ] Start Ollama Service (`ollama serve`)
- [ ] Pull Model (`ollama pull mistral`)
- [ ] Test model response
- [ ] Copy backend service files
- [ ] Copy routes files
- [ ] Update package.json (add axios)
- [ ] Set environment variables
- [ ] Start backend
- [ ] Create frontend pages
- [ ] Start frontend
- [ ] Test insights generation

---

## **Troubleshooting**

**Issue: Connection refused to localhost:11434**
- Solution: Make sure Ollama is running with `ollama serve`

**Issue: Out of memory**
- Solution: Use smaller model like `orca-mini`

**Issue: Hindi text not working**
- Solution: Use model with Hindi support or enable translation

**Issue: Slow responses**
- Solution: Use `neural-chat` or `mistral` instead of larger models

---

## **Next Steps**

1. Install Ollama and pull model
2. Follow backend service creation
3. Create API endpoints
4. Build frontend pages
5. Test end-to-end

---

**Setup Time:** 15-20 minutes
**Total Storage:** ~5-10 GB (Ollama + Model)
