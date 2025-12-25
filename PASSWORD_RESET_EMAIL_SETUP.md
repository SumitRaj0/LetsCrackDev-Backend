# Password Reset Email Setup Guide

## Problem

You're getting a 200 status code when requesting a password reset, but not receiving the email. This usually means the email sending is failing silently.

## Solution

### Step 1: Set Up Gmail App Password

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Enable 2-Step Verification** (if not already enabled)
3. **Generate App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "LetsCrackDev Backend" as the name
   - Click "Generate"
   - Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 2: Add Environment Variables to Render

1. **Go to your Render Dashboard**: https://dashboard.render.com
2. **Select your backend service**
3. **Go to "Environment" tab**
4. **Add these environment variables**:

```
GMAIL_USER=letscrackdev@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password-here
FRONTEND_URL=https://your-frontend-domain.vercel.app
NODE_ENV=production
```

**Important Notes:**

- Remove spaces from the app password (e.g., `abcdefghijklmnop` not `abcd efgh ijkl mnop`)
- The `GMAIL_USER` should be the Gmail address you want to send from
- `FRONTEND_URL` should be your frontend domain (e.g., Vercel URL)

### Step 3: Restart Your Render Service

After adding environment variables:

1. Go to your service in Render
2. Click "Manual Deploy" → "Deploy latest commit"
3. Or wait for automatic deployment

### Step 4: Test the Password Reset

1. Go to your frontend forgot password page
2. Enter your email
3. Click "Send Reset Link"
4. Check:
   - **Backend logs** in Render dashboard for email sending status
   - **Your email inbox** (and spam folder)
   - **Browser console** - if email fails, the reset URL will be shown there

## Troubleshooting

### Check Backend Logs

1. Go to Render Dashboard → Your Service → "Logs" tab
2. Look for:
   - `Email sent successfully` - ✅ Email was sent
   - `Failed to send email` - ❌ Email failed (check error message)
   - `GMAIL_APP_PASSWORD is not configured` - ❌ Environment variable missing

### Common Errors

#### Error: "Invalid login"

- **Cause**: Wrong Gmail App Password
- **Fix**: Generate a new app password and update `GMAIL_APP_PASSWORD`

#### Error: "Less secure app access"

- **Cause**: 2-Step Verification not enabled
- **Fix**: Enable 2-Step Verification first, then generate App Password

#### Error: "Connection timeout"

- **Cause**: Render's network blocking SMTP
- **Fix**: Check Render's firewall settings or use a different email service

#### No error but no email

- **Check**:
  - Spam/junk folder
  - Email address is correct
  - Gmail account has enough storage
  - App Password is correctly set (no spaces)

## Fallback: Reset URL in Response

If email sending fails, the backend now returns the reset URL in the API response. You can:

1. **Check browser console** - The reset URL will be logged
2. **Check Network tab** - Look at the API response, it will contain `resetUrl` in the `data` field
3. **Use the URL directly** - Copy and paste it in your browser

## Testing Locally

To test email sending locally:

1. Create `.env` file in `backend/` directory:

```env
GMAIL_USER=letscrackdev@gmail.com
GMAIL_APP_PASSWORD=your-app-password-here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

2. Restart your backend server
3. Try forgot password - you should receive the email

## Alternative: Use Email Service Provider

If Gmail doesn't work, consider using:

- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (very cheap, pay per email)
- **Resend** (modern, developer-friendly)

I can help you set up any of these if needed.
