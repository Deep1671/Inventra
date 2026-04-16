# Vercel Deployment Guide - Inventra

## Overview
This guide explains how to deploy the Inventra Smart Inventory Management System on Vercel.

The project has two parts:
- **Frontend**: React + Vite (deployed on Vercel)
- **Backend**: Node.js + Express (deployed on Vercel Serverless Functions or separate service)

---

## Deployment Options

### Option 1: Frontend on Vercel + Backend on Render/Railway (RECOMMENDED)
This is the simplest and most reliable setup for beginners.

### Option 2: Both on Vercel
Frontend on Vercel, Backend as Serverless Functions on Vercel.

---

## Prerequisites

1. **GitHub Account**: Push your code to GitHub
2. **Vercel Account**: Sign up at https://vercel.com
3. **MongoDB Atlas Account**: For cloud database (https://www.mongodb.com/cloud/atlas)
4. **Environment Variables**: Gather all your secrets

---

## Step 1: Prepare MongoDB Atlas (Cloud Database)

Since Vercel's serverless environment cannot connect to localhost, use MongoDB Atlas:

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user with username and password
4. Get the connection URI:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/smart_inventory?retryWrites=true&w=majority
   ```
5. Add Vercel IP (0.0.0.0/0) to Network Access for development

---

## Step 2: Deploy Backend (Choose One Option)

### Option A: Deploy Backend to Render (EASIEST)

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: inventra-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Add Environment Variables:
   ```
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart_inventory?retryWrites=true&w=majority
   PORT=5000
   JWT_SECRET=your_jwt_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   FRONTEND_URL=https://your-frontend.vercel.app
   OPENROUTER_API_KEY=your_api_key
   SEND_EMAILS=true
   ADMIN_EMAIL=admin@example.com
   ```
6. Deploy and note the URL (e.g., `https://inventra-backend.onrender.com`)

### Option B: Deploy Backend to Vercel

1. In Vercel Dashboard, click "Add New Project"
2. Select the repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`
4. Add same environment variables as above
5. Deploy

---

## Step 3: Deploy Frontend to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Select your GitHub repository
4. Configure:
   - **Project Name**: inventra-frontend
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   ```
   VITE_API_BASE_URL=https://inventra-backend.onrender.com/api
   (OR the URL from your backend deployment)
   ```
6. Click Deploy

---

## Step 4: Update CORS in Backend

If your backend is on a different domain, update `server.js`:

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://your-frontend.vercel.app', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Step 5: Update frontend/.env for Production

Edit `frontend/.env.local`:

```
VITE_API_BASE_URL=https://inventra-backend.onrender.com/api
```

---

## Troubleshooting

### 1. API Connection Issues
- Check that `VITE_API_BASE_URL` is correctly set
- Verify backend is running: Visit `https://your-backend.onrender.com/api/health`
- Check browser console for CORS errors

### 2. Database Connection Failures
- Verify MongoDB URI is correct
- Check Network Access in MongoDB Atlas includes Vercel/Render IPs
- Test connection string locally first

### 3. Email Not Sending
- Use Gmail app-specific password (not regular password)
- Enable "Less secure apps" in Gmail settings (if needed)
- Or use a proper SMTP service like SendGrid

### 4. Build Failures
- Check that all environment variables are set
- Verify Node version compatibility
- Check logs in Vercel/Render dashboard

---

## Environment Variables Summary

### Frontend (Vercel)
```
VITE_API_BASE_URL=https://your-backend-url.com/api
```

### Backend (Render/Vercel)
```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
PORT=5000
JWT_SECRET=secret_key
GOOGLE_CLIENT_ID=client_id
EMAIL_USER=email
EMAIL_PASS=password
FRONTEND_URL=https://your-frontend.vercel.app
OPENROUTER_API_KEY=api_key
SEND_EMAILS=true
ADMIN_EMAIL=admin@example.com
```

---

## Testing Post-Deployment

1. Visit your frontend URL
2. Try logging in
3. Check if API calls work (check browser Network tab)
4. Test creating/updating inventory items
5. Verify emails are sent (if enabled)

---

## Next Steps

- Set up custom domain (optional)
- Enable HTTPS (Vercel does this by default)
- Monitor application logs
- Set up backups for MongoDB

---

## Support

For issues:
- Check Vercel logs: https://vercel.com/docs/concepts/observability
- Check Render logs: https://render.com/docs/deployments
- Check MongoDB status: https://status.mongodb.com

