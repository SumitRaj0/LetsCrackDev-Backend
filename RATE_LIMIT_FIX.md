# Rate Limit Fix for 429 Errors

## Problem

Getting `429 Too Many Requests` errors when accessing courses, resources, and services endpoints.

## Root Cause

- General rate limiter was set to 200 requests per 15 minutes
- Public GET routes (courses, resources, services) were using the same strict limit
- Frontend makes multiple requests quickly (page loads, filters, etc.)
- Render.com free tier may have additional rate limiting

## Solution Implemented

### 1. Increased General Rate Limit

- **Before:** 200 requests per 15 minutes
- **After:** 500 requests per 15 minutes (configurable via `RATE_LIMIT_MAX_REQUESTS`)

### 2. Created Public Read Limiter

- New `publicReadLimiter` for public GET endpoints
- **Limit:** 100 requests per minute (configurable via `PUBLIC_READ_LIMIT_MAX`)
- Applied to:
  - `/api/v1/courses` (GET)
  - `/api/v1/resources` (GET)
  - `/api/v1/services` (GET)

### 3. Updated Routes

- Courses routes now use `publicReadLimiter` for GET requests
- Resources routes now use `publicReadLimiter` for GET requests
- Services routes now use `publicReadLimiter` for GET requests

## Environment Variables

Add these to your Render.com environment variables:

```env
# General rate limit (all routes)
RATE_LIMIT_MAX_REQUESTS=500

# Public read endpoints (GET requests to courses/resources/services)
PUBLIC_READ_LIMIT_MAX=100

# Optional: Fine-tune other limits
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds
AUTH_RATE_LIMIT_MAX=200      # Auth endpoints
CHATBOT_RATE_LIMIT_MAX=10    # Chatbot endpoints
```

## How It Works

### Rate Limit Hierarchy

1. **Public Read Endpoints** (Courses, Resources, Services - GET only)
   - 100 requests per minute per IP
   - More lenient for browsing/reading

2. **General Routes** (All other routes)
   - 500 requests per 15 minutes per IP
   - Applies to POST, PUT, DELETE, etc.

3. **Auth Routes**
   - 200 requests per 15 minutes per IP
   - Separate limit for login/signup

4. **Chatbot Routes**
   - 10 requests per minute per user
   - Per-user limit (not IP-based)

## Testing

After deploying, test the endpoints:

```bash
# Should work without 429 errors
curl https://letscrackdev-backend.onrender.com/api/v1/courses?limit=50&isPremium=true
curl https://letscrackdev-backend.onrender.com/api/v1/resources
curl https://letscrackdev-backend.onrender.com/api/v1/services
```

## Deployment Steps

1. **Build the backend:**

   ```bash
   cd backend
   npm run build
   ```

2. **Set environment variables in Render:**
   - Go to Render Dashboard → Your Service → Environment
   - Add `RATE_LIMIT_MAX_REQUESTS=500`
   - Add `PUBLIC_READ_LIMIT_MAX=100`

3. **Deploy/Restart:**
   - Render will auto-deploy on git push
   - Or manually restart the service

4. **Verify:**
   - Check that 429 errors are gone
   - Test frontend loading courses/resources

## Notes

- Rate limits are per IP address
- Limits reset after the time window expires
- In development, rate limiting is disabled
- In test environment, rate limiting is completely disabled

## If Still Getting 429 Errors

1. **Check Render.com limits:**
   - Free tier on Render may have additional limits
   - Consider upgrading if needed

2. **Increase limits further:**

   ```env
   RATE_LIMIT_MAX_REQUESTS=1000
   PUBLIC_READ_LIMIT_MAX=200
   ```

3. **Check frontend:**
   - Make sure frontend isn't making excessive requests
   - Add request debouncing/throttling if needed

---

**Status:** ✅ Rate limits updated and ready for deployment
