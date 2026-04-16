# Quick Start - AI Chatbot

## 1️⃣ Get API Key
Go to https://aistudio.google.com/app/apikey → Create API Key → Copy

## 2️⃣ Configure Backend
Edit `backend/.env`:
```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash
```

## 3️⃣ Run Servers
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm run dev
```

## 4️⃣ Use Chatbot
- Go to http://localhost:5173
- Click purple chat bubble (💬) in bottom-right
- Click suggestion or type question
- Get instant analytics insights!

## Sample Queries
- "Top 5 products this month?"
- "Show low stock items"
- "Supplier performance"
- "Revenue last week?"
- "Inventory value?"

## Files Created
- ✅ `backend/services/chatbotService.js` - Core AI engine
- ✅ `backend/controllers/chatbotController.js` - API handlers
- ✅ `backend/routes/chatbotRoutes.js` - Endpoints
- ✅ `frontend/src/components/ChatBot.jsx` - Main widget
- ✅ `frontend/src/components/ChatMessage.jsx` - Messages
- ✅ `frontend/src/components/ChatResponse.jsx` - Response display
- ✅ `frontend/src/components/SuggestionButtons.jsx` - Quick queries
- ✅ `frontend/src/styles/chatbot.css` - Styling

## Key Features
🔹 Hybrid approach: Free-form NLP + preset buttons
🔹 Floating widget: Always accessible in corner
🔹 Smart responses: Text, tables, and charts
🔹 Real data: Queries existing analytics endpoints
🔹 Secure: JWT authenticated, input validated
🔹 Fast: < 2-3 seconds per query

## Troubleshooting
| Issue | Fix |
|-------|-----|
| "API Error" | Check GEMINI_API_KEY in .env |
| No data | Ensure MongoDB has sample data |
| Chat not visible | Hard refresh browser (Ctrl+Shift+R) |
| Messages not sending | Verify backend is running |

---
**Status**: ✅ READY TO USE
