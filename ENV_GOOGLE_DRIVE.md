# Add This to Your backend/.env File

Add the following line to your `backend/.env` file:

```env
# Google Drive API Configuration
GOOGLE_DRIVE_CREDENTIALS_PATH=./credentials/google-drive-service-account.json
```

## Complete .env Example

Your `.env` file should now include:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/letscrackdev

# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1
FRONTEND_URL=http://localhost:5173

# Authentication
ACCESS_TOKEN_SECRET=your-secret-key-change-this-in-production-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this-in-production-min-32-chars

# Google Drive API Configuration
GOOGLE_DRIVE_CREDENTIALS_PATH=./credentials/google-drive-service-account.json

# Gemini AI Configuration (optional)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash

# Email Configuration (optional)
GMAIL_USER=letscrackdev@gmail.com
GMAIL_APP_PASSWORD=
CONTACT_EMAIL=letscrackdev@gmail.com
```

## Next Steps

1. ✅ Credentials file saved: `backend/credentials/google-drive-service-account.json`
2. ⏳ Add `GOOGLE_DRIVE_CREDENTIALS_PATH` to your `.env` file
3. ⏳ Share your Google Drive files with: `letscrackdev-drive@letscrackdev.iam.gserviceaccount.com`
4. ⏳ Add `googleDriveFileId` to your services in the database

## Important Security Note

⚠️ **Never commit the credentials file to Git!**

- The `credentials/` folder is already in `.gitignore`
- Keep your credentials secure
- For production, use environment variables or a secrets manager
