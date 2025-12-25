# Contact Form Email Setup

The contact form sends emails to `letscrackdev@gmail.com` when users submit the form.

## Gmail App Password Setup

To enable email sending, you need to set up a Gmail App Password:

1. **Enable 2-Step Verification** on your Google Account:
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**:
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Enter "LetsCrackDev Backend" as the name
   - Click "Generate"
   - Copy the 16-character password (no spaces)

3. **Add to Environment Variables**:
   - Create or update `.env` file in the backend directory
   - Add the following:
     ```
     GMAIL_USER=letscrackdev@gmail.com
     GMAIL_APP_PASSWORD=your-16-character-app-password-here
     CONTACT_EMAIL=letscrackdev@gmail.com
     ```

## Environment Variables

- `GMAIL_USER`: Your Gmail address (default: letscrackdev@gmail.com)
- `GMAIL_APP_PASSWORD`: The 16-character App Password from Google
- `CONTACT_EMAIL`: Email address to receive contact form submissions (default: letscrackdev@gmail.com)

## Testing

In development mode without `GMAIL_APP_PASSWORD`, emails will be logged to the console instead of being sent.

In production, make sure to set `GMAIL_APP_PASSWORD` in your environment variables.

## Rate Limiting

The contact form endpoint is rate-limited to 5 submissions per 15 minutes per IP address to prevent spam.
