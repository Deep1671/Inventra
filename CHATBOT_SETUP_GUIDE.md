# AI Chatbot Implementation - Setup & Testing Guide

## ✅ Implementation Complete

Your AI chatbot has been successfully implemented with the following components:

### What Was Built

#### Backend Components
- **chatbotService.js**: Core NLP processing engine using Google Gemini
- **chatbotController.js**: API request handlers
- **chatbotRoutes.js**: REST endpoints for chatbot queries
- **Installed**: `@google/generative-ai` package for Gemini integration

#### Frontend Components
- **ChatBot.jsx**: Main floating widget component
- **ChatMessage.jsx**: Message display formatter
- **ChatResponse.jsx**: Response type renderer (text, table, charts)
- **SuggestionButtons.jsx**: Quick preset query selector
- **chatbot.css**: Dark theme styling with animations
- **Updated**: DashboardLayout.jsx with ChatBot integration
- **Updated**: apiClient.js with chatbot API functions

---

## 🚀 Setup Instructions

### Step 1: Get a Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### Step 2: Configure the API Key

Edit `backend/.env` and replace the placeholder:

```env
GEMINI_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

**Example:**
```env
GEMINI_API_KEY=AIzaSyDxxx...xxxxxxxxxxxx
GEMINI_MODEL=gemini-1.5-flash
```

### Step 3: Start the Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

Expected output:
```
Server running on port 5000
MongoDB Connected
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v7.3.1  ready in XXX ms
❯ Local:   http://localhost:5173/
```

---

## 💬 Using the Chatbot

### How to Access

1. Log into the dashboard at `http://localhost:5173`
2. Look for the **purple chat bubble (💬)** in the bottom-right corner
3. Click to open the chatbot widget

### Chat Types

#### 1. Quick Suggestions (Recommended for First Use)
- Click the chatbot bubble to open
- Select a category: **Sales**, **Inventory**, or **Suppliers**
- Click a preset question button
- Get instant response with data

#### 2. Free-Form Questions
- Type any natural language question about your data
- Examples:
  - "What are my top 5 selling products?"
  - "Show me low stock items"
  - "How is supplier ABC performing?"
  - "Give me the inventory value"
  - "What was revenue last week?"

### Example Queries

**Sales & Revenue:**
```
"What were my top 5 selling products this month?"
"Show me revenue trend for the last 7 days"
"Total sales for today?"
"Which products made the most profit?"
```

**Inventory Management:**
```
"Show low stock items"
"What's my total inventory value?"
"Which products are moving fastest?"
"Stock status overview"
"Any inventory variances to investigate?"
```

**Supplier Performance:**
```
"Show me suppliers with pending orders"
"Which supplier is the most reliable?"
"What are my pending balances?"
"Supplier payment history"
"How is supplier performance?"
```

---

## 📊 Response Types

The chatbot provides responses in three formats:

### 1. Text Response
- Narrative insights
- Natural language explanations
- Best for: Summary questions, trends

### 2. Table Response
- Structured data in table format
- Shows top results (max 5 rows displayed)
- Best for: Product lists, supplier metrics, transaction history

### 3. Chart Response
- Mini bar chart visualization
- Shows data distribution
- Best for: Comparisons, rankings

---

## 🔄 How It Works (Technical Flow)

```
User Query (Text)
        ↓
Backend: extractIntent() → Google Gemini NLP
        ↓
Identify Intent: top_products | revenue_trends | low_stock | etc.
        ↓
Execute Analytics Query: Call existing /api/analytics/* endpoints
        ↓
Format Response: Gemini generates natural language summary
        ↓
Send to Frontend: { response, data, type, intent }
        ↓
Render in ChatBot Widget: ChatMessage → ChatResponse component
```

---

## 🧪 Testing the Chatbot

### Test 1: Backend Health Check
```bash
curl -X GET http://localhost:5000/api/chatbot/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected Response:
```json
{
  "success": true,
  "message": "Chatbot service is running",
  "geminiModel": "gemini-1.5-flash"
}
```

### Test 2: Get Suggestions
```bash
curl -X GET http://localhost:5000/api/chatbot/suggestions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected Response:
```json
{
  "success": true,
  "suggestions": {
    "sales": [
      {
        "label": "📈 Top 5 Products This Month",
        "query": "What are my top 5 selling products this month?"
      },
      ... more suggestions
    ],
    "inventory": [...],
    "suppliers": [...]
  }
}
```

### Test 3: Send a Query
```bash
curl -X POST http://localhost:5000/api/chatbot/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my top selling products?"}'
```

Expected Response:
```json
{
  "success": true,
  "response": "Based on your sales data, here are your top products...",
  "type": "table",
  "data": [
    { "product_name": "Item 1", "revenue": 5000, ... },
    ...
  ],
  "intent": "top_products"
}
```

### Test 4: Frontend Widget Test

1. **Open Dashboard**: Navigate to http://localhost:5173
2. **Locate Chat Icon**: Bottom-right corner (purple bubble with 💬)
3. **Click to Open**: Chat window slides up
4. **Select Suggestion**: Click "Top 5 Products This Month"
5. **See Response**: Table of products appears with bot message
6. **Type Custom Query**: "Show me low stock items"
7. **View Response**: Data responds with bot insights

---

## 🐛 Troubleshooting

### Issue: "Gemini API Error" or "Invalid API Key"

**Solution:**
1. Verify API key in `backend/.env`
2. Check API key is enabled at [Google AI Studio](https://aistudio.google.com/app/settings)
3. Check if you've exceeded free tier limits (1000 requests/day)

### Issue: "Cannot retrieve data" / Empty responses

**Solution:**
1. Check MongoDB is running: `mongosh admin`
2. Verify sample data exists:
   ```bash
   mongosh smart_inventory_forecasting
   > db.products.countDocuments()  # Should be > 0
   > db.salesorders.countDocuments()  # Should be > 0
   ```
3. Check analytics endpoints work:
   ```bash
   curl http://localhost:5000/api/analytics/overview
   ```

### Issue: Chat button not visible

**Solution:**
1. Check `ChatBot.jsx` is imported in `DashboardLayout.jsx`
2. Verify `chatbot.css` is properly imported in `ChatBot.jsx`
3. Check browser DevTools console for errors
4. Clear browser cache (Ctrl+Shift+Delete)

### Issue: Messages not sending / Loading forever

**Solution:**
1. Check backend is running: `npm start` in backend folder
2. Check MongoDB connection: Should see "MongoDB Connected" in terminal
3. Verify authentication token exists in localStorage
4. Check network tab in DevTools for 401/500 errors

---

## 📈 Monitoring & Logs

### Backend Logs
The backend logs chatbot queries to console:
```
[Chatbot] Processing query from user 123: "What are my top products?"
[Chatbot] Intent extracted: top_products
[Chatbot] Calling: /analytics/top-products
```

### Frontend Console
Check browser `DevTools → Console` for any client-side errors

### Error Logging
All errors are logged with timestamps for debugging

---

## 🔐 Security Features

✅ **JWT Authentication**: All endpoints require valid token
✅ **Input Validation**: Message length limited to 500 characters
✅ **Intent Restriction**: Only predefined intents are allowed (prevents prompt injection)
✅ **Role-Based Access**: Respects user permissions from existing auth system
✅ **Rate Limiting**: No built-in rate limiting (add if needed for production)

---

## 🚀 Advanced Features

### Retrain Intent Detection
Edit the `SYSTEM_PROMPT` in `chatbotService.js` to improve NLP accuracy. Examples:
- Add more synonyms
- Add company-specific terms
- Clarify ambiguous intents

### Add Custom Intents
1. Define new intent in `SYSTEM_PROMPT`
2. Add handler in `executeAnalyticsQuery()`
3. Add backend API endpoint
4. Update `getQuickSuggestions()` with new suggestion

### Connect to Other APIs
Modify `executeAnalyticsQuery()` to call additional endpoints beyond `/api/analytics/*`

---

## 📝 Architecture Overview

```
frontend/src/components/
├── ChatBot.jsx              # Main widget, message management
├── ChatMessage.jsx          # Individual message display
├── ChatResponse.jsx         # Response type rendering
├── SuggestionButtons.jsx    # Quick query UI
└── ../styles/chatbot.css    # All styling

backend/
├── services/chatbotService.js   # Gemini AI integration, intent extraction
├── controllers/chatbotController.js  # API handlers
├── routes/chatbotRoutes.js      # Endpoint definitions
└── /models/                 # Existing product, sales, inventory data
```

---

## ✅ Success Checklist

- [ ] Google Gemini API key obtained and configured
- [ ] Backend starts without errors
- [ ] Frontend loads without console errors
- [ ] Chat bubble visible in bottom-right corner
- [ ] Can open/close chat window
- [ ] Suggestion buttons load with categories
- [ ] Can click a suggestion and get response
- [ ] Can type custom query and get response
- [ ] Response displays correct data type (text/table/chart)
- [ ] Chat history persists during session

---

## 📞 Support & Next Steps

### If Something Doesn't Work:
1. Check error messages in browser DevTools console
2. Check backend logs in terminal
3. Verify `.env` file has GEMINI_API_KEY set
4. Restart both servers
5. Clear browser cache

### Future Enhancements:
- [ ] Chat history persistence (save to database)
- [ ] Multi-language support
- [ ] Voice input/output
- [ ] Export chat as PDF report
- [ ] Custom analytics queries
- [ ] Machine learning insights
- [ ] Predictive recommendations

---

## 📚 Component Reference

### ChatBot.jsx Props
None (standalone component)

### ChatMessage Props
```jsx
<ChatMessage message={{
  id: number,
  role: "user" | "bot",
  content: string,
  type: "text" | "table" | "chart",
  data: object,
  intent: string
}} />
```

### API Endpoints

**POST /api/chatbot/query** - Process query
```json
Request: { "message": "What are my top products?" }
Response: { "success": true, "response": "...", "type": "table", "data": [...], "intent": "top_products" }
```

**GET /api/chatbot/suggestions** - Get preset queries
```json
Response: { "success": true, "suggestions": { "sales": [...], "inventory": [...], "suppliers": [...] } }
```

**GET /api/chatbot/health** - Service status
```json
Response: { "success": true, "message": "Chatbot service is running", "geminiModel": "gemini-1.5-flash" }
```

---

## 🎯 End-to-End Example

**User Request:** "Show me my inventory value"

1. ✅ User opens chat and types "Show me my inventory value"
2. ✅ Frontend sends to: `POST /api/chatbot/query`
3. ✅ Backend receives message
4. ✅ Gemini extracts intent: `inventory_summary` with params: `{}`
5. ✅ Backend calls: `GET /api/inventory/summary`
6. ✅ Gets response: `{ total_value: 125000, items: 450, warehouses: 3 }`
7. ✅ Gemini formats: "Your current inventory value is $125,000 across 450 items in 3 warehouses."
8. ✅ Response sent to frontend with type: "text"
9. ✅ ChatBot displays message in widget
10. ✅ User sees the insight instantly!

---

**Status:** ✅ IMPLEMENTATION COMPLETE & READY TO USE
