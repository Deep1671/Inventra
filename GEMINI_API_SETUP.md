# Gemini API Multi-Key Setup Guide

## Overview
Your Smart Inventory Management system has been successfully migrated from **Ollama (local LLM)** to **Google Gemini API** with **multi-key automatic fallback support**.

## 🎯 Key Features

### 1. **Multi-Key Support**
- Support for up to **10 API keys**
- When one key reaches quota, automatically switches to the next available key
- Perfect for free tier users who have limited daily quotas
- Tracks key status and usage statistics

### 2. **Automatic Fallback**
- If any API key runs out of tokens/quota, the system automatically switches to the next key
- No manual intervention needed
- Graceful error handling with detailed logging

### 3. **Free API Tier**
- Google Gemini API offers **free tier** with generous quotas
- Perfect for development and small deployments
- No credit card required for free tier

## 📋 Setup Instructions

### Step 1: Get Your Gemini API Keys

#### Get Free API Keys:
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Get API Key" (requires Google account)
3. Create a new API key for your application
4. Copy the key (keep it private!)
5. **Repeat 2-3 times** to generate multiple keys

#### Free Tier Limits (Per Key):
- **Requests per minute:** 60
- **Daily requests:** Varies by model
- **Input tokens:** 1M tokens/day
- **Output tokens:** Varies by usage

### Step 2: Update Your .env File

Edit `backend/.env` and replace the placeholder keys with your actual Gemini API keys:

```env
# GEMINI API CONFIGURATION (Multi-Key Support)
GEMINI_API_KEY_1=your_actual_key_1_here
GEMINI_API_KEY_2=your_actual_key_2_here
GEMINI_API_KEY_3=your_actual_key_3_here

# Optional: Add more keys if needed (up to 10 total)
# GEMINI_API_KEY_4=your_actual_key_4_here
# GEMINI_API_KEY_5=your_actual_key_5_here
```

**Important:**
- Keep API keys private and secure
- Never commit .env file to Git
- Use different keys for different environments (dev, staging, production)

### Step 3: Verify Installation

Run this command to check if @google/generative-ai is installed:

```bash
cd backend
npm list @google/generative-ai
```

If not installed, run:
```bash
npm install @google/generative-ai
```

### Step 4: Test the Setup

#### Test API Status:
```bash
curl http://localhost:5000/api/insights/health
```

Expected response:
```json
{
  "status": "connected",
  "message": "Gemini API service is running",
  "provider": "Google Gemini API",
  "multiKeySupport": true,
  "keyStats": {
    "totalKeys": 3,
    "currentKeyIndex": 0,
    "currentKeyNumber": 1,
    "keyStatus": {...},
    "requestCounts": {...}
  }
}
```

#### Test Generate Insight:
```bash
curl -X POST http://localhost:5000/api/insights/generate \
  -H "Content-Type: application/json" \
  -d '{"query": "What are our top selling products?", "language": "en"}'
```

## 🔄 How Multi-Key Fallback Works

### Automatic Key Switching:

1. **Normal Operation:**
   - System starts with Key #1 (GEMINI_API_KEY_1)
   - Makes API requests with current key
   - Tracks usage and quota

2. **When Key Runs Out:**
   - Detects quota exceeded error (429 or RESOURCE_EXHAUSTED)
   - Automatically marks current key as exhausted
   - Switches to next available key
   - Retries the request

3. **Key Rotation:**
   - Can cycle through all keys
   - Each key's status is tracked
   - Logs show which key is being used

4. **All Keys Exhausted:**
   - Returns error with message: "All API keys have exceeded their quota"
   - Includes statistics about key usage
   - No data loss or system crash

### Example Response with Key Fallback:
```json
{
  "success": true,
  "insight": "Your inventory analysis...",
  "language": "en",
  "keyUsed": 2,
  "totalKeys": 3,
  "timestamp": "2026-04-15T10:30:00Z"
}
```

## 📊 Monitoring Key Usage

### Check Key Status:
```bash
curl http://localhost:5000/api/insights/models
```

Response includes:
- Total number of keys configured
- Current active key
- Status of each key (active/exhausted)
- Request count per key
- Last error message per key

### Key Statistics:
The system tracks:
- ✅ How many requests each key has made
- ⏸️ Which keys are exhausted
- 📝 Last error for each key
- 🔄 Error count per key

## 🛠️ Updated Files

### New Files Created:
1. **`backend/services/geminiService.js`** - Multi-key Gemini service with automatic failover
   - Manages API keys
   - Handles quota errors
   - Provides key switching logic
   - Tracks usage statistics

### Modified Files:
1. **`backend/services/chatbotService.js`**
   - Now uses Gemini instead of Ollama
   - Imports geminiService
   - Maintains all chatbot functionality

2. **`backend/routes/insightsRoutes.js`**
   - Updated all endpoints to use Gemini
   - Now reports Gemini API status
   - Includes key usage information in responses

3. **`backend/services/localLLMService.js`**
   - Now delegates to Gemini service
   - Maintains backward compatibility
   - All functions updated to use Gemini

4. **`backend/.env`**
   - Added GEMINI_API_KEY_* variables
   - Removed Ollama configuration
   - Added helpful comments

## API Endpoints

### Health Check
```bash
GET /api/insights/health
```
Shows Gemini API status and key statistics

### Generate Insight
```bash
POST /api/insights/generate
Body: { "query": "...", "language": "en" }
```

### Generate Hindi Insight
```bash
POST /api/insights/generate-hindi
Body: { "query": "..." }
```

### Inventory Insights
```bash
POST /api/insights/inventory
Body: { "inventoryData": {...}, "language": "en" }
```

### Sales Insights
```bash
POST /api/insights/sales
Body: { "salesData": {...}, "language": "en" }
```

### Supplier Insights
```bash
POST /api/insights/supplier
Body: { "supplierData": {...}, "language": "en" }
```

### Get API Status
```bash
GET /api/insights/models
```
Returns detailed key statistics and API status

## ⚠️ Troubleshooting

### Issue: "No Gemini API keys found!"

**Solution:** 
- Check that GEMINI_API_KEY_1 is set in .env
- Make sure the key is not empty or has invalid characters
- Restart the server after updating .env

### Issue: All Keys are Exhausted

**Solution:**
- Check current key limits at: https://makersuite.google.com/app/apikey
- Generate new API keys and add them to .env
- Wait for daily quota to reset (usually 24 hours)
- You can reset key status using the resetKeyStatus method (for development)

### Issue: "Resource Exhausted" Error

**Solution:**
- This means current key has hit its quota
- The system should automatically switch to next key
- Check key statistics: `GET /api/insights/models`
- Add more API keys if all are exhausted
- Monitor request usage to avoid future exhaustion

### Issue: Responses are Slow

**Solution:**
- Gemini API response time depends on query complexity
- Free tier may have slight delays under heavy load
- Consider:
  - Reducing batch request sizes
  - Implementing response caching
  - Adding more keys to distribute load

## 🎓 Best Practices

### 1. **Generate Multiple Keys Now**
- Create 3-5 keys while you're setting up
- Distributes load across keys
- Prevents service interruption if one key exhausts

### 2. **Monitor Key Usage**
- Check `/api/insights/models` endpoint regularly
- Implement alerting when keys approach quota
- Plan for additional keys based on usage patterns

### 3. **Optimize Prompts**
- Shorter, more specific prompts = faster responses
- Save tokens with precise instructions
- Cache repeated queries when possible

### 4. **Environment Management**
```bash
# Development (multiple free keys)
GEMINI_API_KEY_1=dev_key_1
GEMINI_API_KEY_2=dev_key_2

# Production (premium keys if needed)
# Can upgrade to paid tier for higher limits
```

### 5. **Error Logging**
- System logs all key switches
- Check logs for patterns of exhaustion
- Helps plan for additional keys

## 🚀 Future Enhancements

Consider implementing:
1. **Key Rotation Policy** - Automatically rotate keys on schedule
2. **Rate Limiting** - Implement client-side rate limiting
3. **Caching Layer** - Cache common queries to reduce API calls
4. **Usage Dashboard** - Visual dashboard showing key usage over time
5. **Quota Alerts** - Email alerts when keys approach quota
6. **Upgrade Path** - Easy migration to paid API tier if needed

## 📞 Support

For issues with:
- **Google Gemini API:** https://ai.google.dev/
- **Getting Free API Keys:** https://makersuite.google.com/
- **API Documentation:** https://ai.google.dev/docs

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **LLM Provider** | Ollama (local) | Google Gemini (cloud) |
| **Setup Required** | Running Ollama service | 3 free API keys |
| **Multi-Key Support** | ❌ No | ✅ Yes (up to 10 keys) |
| **Auto Failover** | ❌ No | ✅ Yes |
| **Cost** | Free (local compute) | Free tier available |
| **API Calls** | Limited by local hardware | 60 reqs/min (free tier) |
| **Maintenance** | Manual Ollama setup | Set API keys in .env |
| **Language Support** | English + Hindi | All supported languages |

---

**Configuration Complete!** Your system is now ready to use Google Gemini API with automatic multi-key failover. 🎉
