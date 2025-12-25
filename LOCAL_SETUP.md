# Local Development Setup Guide

## Fixed Issues

✅ **REFRESH_TOKEN_SECRET** - Added to `.env` file (was missing and causing 500 errors)

## Current Status

- ✅ Backend server running on http://localhost:3001
- ✅ Frontend server running on http://localhost:5173
- ⚠️ MongoDB connection needed

## MongoDB Setup

You have two options:

### Option 1: Use MongoDB Atlas (Cloud - Recommended)

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account and cluster
3. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/letscrackdev?retryWrites=true&w=majority`)
4. Update `backend/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/letscrackdev?retryWrites=true&w=majority
   ```
5. Restart the backend server

### Option 2: Use Local MongoDB

1. Install MongoDB locally: https://www.mongodb.com/try/download/community
2. Start MongoDB service:
   ```powershell
   # Windows - if installed as service, it should auto-start
   # Or start manually:
   mongod --dbpath "C:\data\db"
   ```
3. The `.env` file already has the correct local URI:
   ```
   MONGODB_URI=mongodb://localhost:27017/letscrackdev
   ```
4. Restart the backend server

## Environment Variables Checklist

Make sure these are set in `backend/.env`:

- ✅ `MONGODB_URI` - MongoDB connection string
- ✅ `ACCESS_TOKEN_SECRET` - JWT access token secret (min 32 chars)
- ✅ `REFRESH_TOKEN_SECRET` - JWT refresh token secret (min 32 chars)
- ✅ `PORT` - Server port (default: 3001)
- ✅ `FRONTEND_URL` - Frontend URL (default: http://localhost:5173)
- ✅ `NODE_ENV` - Environment (development/production)

Optional:

- `GEMINI_API_KEY` - For chatbot functionality
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` - For email sending

## Testing Signup

After MongoDB is connected, try signing up again. The 500 error should be resolved.

## Restart Backend

If you update `.env`, restart the backend:

```powershell
cd backend
npm run dev
```
