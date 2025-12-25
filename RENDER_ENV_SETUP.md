# Render Environment Variables Setup Guide

## ⚠️ IMPORTANT: .env File vs Render Environment Variables

**The `.env` file in your local project is ONLY for local development.**
**For production on Render, you MUST set environment variables in the Render Dashboard.**

## Step-by-Step: Set Environment Variables in Render

### 1. Go to Render Dashboard

- Visit: https://dashboard.render.com
- Sign in to your account

### 2. Select Your Backend Service

- Click on "LetsCrackDev-Backend" (or your backend service name)

### 3. Navigate to Environment Tab

- Click on the "Environment" tab in the left sidebar
- Or go to: Your Service → Settings → Environment

### 4. Add/Update Environment Variables

Click "Add Environment Variable" and add these:

```
GMAIL_USER=letscrackdev@gmail.com
```

```
GMAIL_APP_PASSWORD=your-16-character-app-password-here
```

```
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

```
NODE_ENV=production
```

```
RATE_LIMIT_MAX_REQUESTS=500
```

```
PUBLIC_READ_LIMIT_MAX=100
```

**Optional Rate Limit Variables (for fine-tuning):**

```
RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=200
CHATBOT_RATE_LIMIT_MAX=10
```

### 5. Important Notes About Gmail App Password

**Gmail App Passwords:**

- Are **16 characters long** (no spaces, no special characters like @)
- Look like: `abcdefghijklmnop` (all lowercase letters/numbers)
- Are NOT your regular Gmail password
- Must be generated from Google Account settings

**If your password has `@` or special characters, it's NOT a Gmail App Password!**

### 6. How to Generate Gmail App Password

1. **Go to Google Account**: https://myaccount.google.com/
2. **Enable 2-Step Verification** (if not already enabled)
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification
3. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "LetsCrackDev Backend" as the name
   - Click "Generate"
   - Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)
   - **Remove all spaces** when adding to Render (e.g., `abcdefghijklmnop`)

### 7. Save and Restart

1. Click "Save Changes" in Render
2. Render will automatically restart your service
3. Wait for the deployment to complete (check the "Logs" tab)

### 8. Verify It's Working

1. **Check Render Logs**:
   - Go to your service → "Logs" tab
   - Look for: `Email sent successfully` ✅
   - Or: `Gmail authentication failed` ❌ (means password is wrong)

2. **Test Password Reset**:
   - Go to your frontend forgot password page
   - Enter your email
   - Click "Send Reset Link"
   - Check your email inbox (and spam folder)

3. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Go to Console tab
   - If email fails, you'll see the reset URL there

## Troubleshooting

### Problem: Still not receiving emails

**Check 1: Verify Environment Variables in Render**

- Go to Render Dashboard → Your Service → Environment
- Verify `GMAIL_APP_PASSWORD` is set (should show as hidden/\*\*\*\*)
- Verify `GMAIL_USER` is set to `letscrackdev@gmail.com`

**Check 2: Check Render Logs**

- Go to Render Dashboard → Your Service → Logs
- Look for error messages:
  - `Invalid login` → Wrong App Password
  - `GMAIL_APP_PASSWORD is not configured` → Variable not set
  - `Email sent successfully` → Email was sent (check spam folder)

**Check 3: Verify Gmail App Password Format**

- Should be 16 characters, no spaces, no special characters
- If you see `@` in the password, it's wrong!

**Check 4: Test Locally First**

- Make sure your local `.env` has the correct App Password
- Test locally: `npm run dev` in backend folder
- Try forgot password locally
- If it works locally but not in production, the Render env vars are wrong

### Common Errors

#### "Invalid login" or "EAUTH" error

- **Cause**: Wrong Gmail App Password
- **Fix**: Generate a new App Password and update in Render

#### "GMAIL_APP_PASSWORD is not configured"

- **Cause**: Environment variable not set in Render
- **Fix**: Add `GMAIL_APP_PASSWORD` in Render Dashboard → Environment

#### "Connection timeout"

- **Cause**: Render's network blocking SMTP
- **Fix**: This is rare, but check Render's firewall settings

## Quick Checklist

- [ ] Gmail App Password generated (16 characters, no spaces)
- [ ] `GMAIL_USER` set in Render Dashboard
- [ ] `GMAIL_APP_PASSWORD` set in Render Dashboard (16-char App Password)
- [ ] `FRONTEND_URL` set in Render Dashboard
- [ ] `NODE_ENV=production` set in Render Dashboard
- [ ] Service restarted after adding variables
- [ ] Checked Render logs for errors
- [ ] Tested password reset flow

## Still Not Working?

If you've followed all steps and it's still not working:

1. **Check Render Logs** - Look for specific error messages
2. **Verify App Password** - Generate a fresh one from Google
3. **Test Locally** - Make sure it works locally first
4. **Check Spam Folder** - Emails might be going to spam
5. **Use Reset URL Fallback** - The reset URL is always in browser console

The code now always provides a reset URL even if email fails, so you can still reset passwords!
