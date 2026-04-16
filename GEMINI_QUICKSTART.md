# Quick Start: Get Your Gemini API Keys (5 Minutes)

## 🚀 What You'll Do

1. Get 3 free Gemini API keys from Google
2. Add them to your .env file
3. Done! Your system is live

## 📋 Step-by-Step

### Get Your First Key

```
1. Open: https://makersuite.google.com/app/apikey
2. Click "Get API Key"
3. Select "Create API Key in new project"
4. You'll see: "API key created"
5. Click "Copy" button
6. Paste it somewhere safe (we'll use it next)
```

### Get Your Second & Third Keys

Repeat the above steps 2 more times so you have **3 keys total**

**Why 3 keys?**
- Free quota per key is ~15,000 requests/day
- 3 keys = ~45,000 requests/day capacity
- When one runs out, system auto-switches to next key

## ✏️ Update Your .env File

Open `backend/.env` and find this section:

```env
# GEMINI API CONFIGURATION (Multi-Key Support)
GEMINI_API_KEY_1=YOUR_GEMINI_API_KEY_1
GEMINI_API_KEY_2=YOUR_GEMINI_API_KEY_2
GEMINI_API_KEY_3=YOUR_GEMINI_API_KEY_3
```

Replace with your actual keys:

```env
GEMINI_API_KEY_1=AIzaSyD1234567890abcdefghijklmnopqrst_Abc
GEMINI_API_KEY_2=AIzaSyA0987654321zyxwvutsrqponmlkjihgfed
GEMINI_API_KEY_3=AIzaSyB5555555555eeeeeeeeeeeeeeeeeeeeee
```

**Save the file!**

## 🔧 Start Your Server

```bash
cd backend
npm install @google/generative-ai  # If not installed
node server.js
```

## ✅ Verify It Works

Open new terminal:

```bash
curl http://localhost:5000/api/insights/health
```

You should see:
```json
{
  "status": "connected",
  "message": "Gemini API service is running",
  "provider": "Google Gemini API",
  "multiKeySupport": true,
  "keyStats": {
    "totalKeys": 3,
    "currentKeyNumber": 1
  }
}
```

## 🎯 Test It Works

```bash
curl -X POST http://localhost:5000/api/insights/generate \
  -H "Content-Type: application/json" \
  -d '{"query": "What is inventory management?"}' \
  -u admin:password
```

You'll get a response from Gemini! 🎉

## ⚠️ Important Notes

### API Keys are Private!
- **Never** share your API keys
- **Never** commit .env to Git
- **Never** share in public forums/chats

### Free Tier Limits (Per Key)
- 60 requests per minute
- ~15,000 requests per day
- 1M input tokens per day

### Auto-Failover Works Like This:
1. Use Key #1 → Runs out → Switches to Key #2
2. Use Key #2 → Runs out → Switches to Key #3  
3. Use Key #3 → Runs out → Returns error
4. **Solution:** Get more keys or wait 24 hours for reset

## 📊 Monitor Usage

Check which key is being used:

```bash
curl http://localhost:5000/api/insights/models
```

Response shows:
- How many keys you have
- Which key is currently active
- How many requests each key has made
- Status of each key (active/exhausted)

## 🆘 Troubleshooting

### "No Gemini API keys found!"
- ✅ Check you added keys to .env
- ✅ Make sure file is saved
- ✅ Restart Node server: `node server.js`

### All keys show "exhausted"
- ✅ You used up all keys for today
- ✅ Add more keys to .env (as GEMINI_API_KEY_4, etc.)
- ✅ Free tier quota resets in 24 hours
- ✅ Or upgrade to paid tier

### API calls are slow
- ✅ Normal for Gemini (5-15 seconds)
- ✅ Free tier may be slower under load
- ✅ Add more keys to distribute load
- ✅ Upgrade for faster responses

## 💡 Pro Tips

### Tip 1: Generate More Keys Now
Don't wait for one to run out. Generate 5-10 keys while setting up.

### Tip 2: Check Status Often
```bash
# See which key is being used
curl http://localhost:5000/api/insights/models
```

### Tip 3: Monitor Requests
The response shows:
- `"keyUsed": 1` → Using key #1
- `"totalKeys": 3` → You configured 3 keys

### Tip 4: Add More Keys Anytime
No need to restart. Just add to .env and reload.

## 🔄 What Happens With 3 Keys

**Daily Capacity:**
- Key #1: 15,000 requests → Runs out
- Key #2: 15,000 requests → Runs out  
- Key #3: 15,000 requests → Runs out
- **Total: 45,000 requests/day**

**Auto-Switching:**
```
Request #1-15000   ← Key #1
Request #15001     ← Key #1 exhausted, switches to Key #2
Request #15001-30000 ← Key #2
Request #30001     ← Key #2 exhausted, switches to Key #3
Request #30001-45000 ← Key #3
Request #45001     ← All exhausted, returns error
```

## 📞 Support

**Getting Keys:**
- https://makersuite.google.com/app/apikey

**API Documentation:**
- https://ai.google.dev/docs

**Free Tier Info:**
- https://ai.google.dev/pricing

---

## ✨ You're All Set!

Your system is now:
- ✅ Using Google Gemini API
- ✅ Set up with 3 free API keys
- ✅ Ready to automatically failover when keys run out
- ✅ No more need for Ollama local setup

**Enjoy your intelligent inventory system!** 🚀
