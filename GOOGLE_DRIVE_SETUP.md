# Google Drive API Setup Guide

This guide explains how to set up Google Drive API integration for secure document sharing after payment.

## Overview

After a user purchases a service (like interview sheets), the system automatically:

1. Generates a secure, time-limited share link for the Google Drive file
2. Stores the access link in the purchase metadata
3. Provides the link to the user immediately after payment

## Prerequisites

- Google account
- Google Cloud Console access
- Service account or OAuth 2.0 credentials

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "LetsCrackDev" (or your preferred name)
4. Click "Create"

## Step 2: Enable Google Drive API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

## Step 3: Create Service Account (Recommended)

### Option A: Service Account (Best for Server-to-Server)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Service account name**: `letscrackdev-drive`
   - **Service account ID**: (auto-generated)
   - Click **Create and Continue**
4. Skip role assignment (click **Continue**)
5. Click **Done**

### Generate Service Account Key

1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Download the JSON file

### Share Google Drive Files with Service Account

1. Open the downloaded JSON file
2. Copy the `client_email` value (e.g., `letscrackdev-drive@project-id.iam.gserviceaccount.com`)
3. For each Google Drive file you want to share:
   - Open the file in Google Drive
   - Click **Share**
   - Paste the service account email
   - Give it **Viewer** permission
   - Click **Done**

## Step 4: Configure Environment Variables

Add the service account credentials to your `.env` file:

```env
# Google Drive API Configuration
GOOGLE_DRIVE_CREDENTIALS={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

**Important:**

- The entire JSON must be on a single line
- Escape quotes properly or use single quotes around the JSON
- Or use a JSON file path (see alternative below)

### Alternative: Use JSON File Path

If storing credentials in a file is easier:

```env
GOOGLE_DRIVE_CREDENTIALS_PATH=./credentials/google-drive-service-account.json
```

Then update `backend/src/utils/googleDrive.ts` to read from file:

```typescript
import fs from 'fs'

const credentials = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH
  ? JSON.parse(fs.readFileSync(process.env.GOOGLE_DRIVE_CREDENTIALS_PATH, 'utf8'))
  : JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || '{}')
```

## Step 5: Add Google Drive File ID to Services

When creating or updating a service in the admin panel, add:

1. **Google Drive File ID**:
   - Open your file in Google Drive
   - The URL looks like: `https://drive.google.com/file/d/FILE_ID_HERE/view`
   - Copy the `FILE_ID_HERE` part

2. **Access Duration**: Number of days (default: 365)

3. **File Type**: pdf, doc, sheet, notion, or link

### Example Service Data:

```json
{
  "name": "Frontend Interview Sheet",
  "description": "Complete frontend interview preparation guide",
  "price": 29.99,
  "category": "interview",
  "googleDriveFileId": "1a2b3c4d5e6f7g8h9i0j",
  "accessDuration": 365,
  "fileType": "pdf"
}
```

## Step 6: Testing

1. **Test File Access:**

   ```bash
   # In backend directory
   npm run dev
   ```

2. **Make a test purchase** and verify:
   - Payment verification generates access link
   - Link is stored in purchase metadata
   - User can access the document

3. **Check Logs:**
   - Look for "Generated Google Drive share link" in backend logs
   - Verify no authentication errors

## Troubleshooting

### Error: "GOOGLE_DRIVE_CREDENTIALS environment variable is not set"

**Solution:** Make sure you've added the credentials to your `.env` file

### Error: "Google Drive authentication failed"

**Solutions:**

1. Verify the service account email has access to the file
2. Check that the JSON credentials are valid
3. Ensure Google Drive API is enabled in your project

### Error: "Failed to generate file access link"

**Solutions:**

1. Verify the file ID is correct
2. Check that the service account has Viewer access to the file
3. Ensure the file is not deleted or moved

### Access Link Not Generated After Payment

**Solutions:**

1. Check backend logs for errors
2. Verify `googleDriveFileId` is set on the service
3. Check that payment verification completed successfully
4. The link generation happens asynchronously - it may take a few seconds

## Security Best Practices

1. **Never commit credentials to Git:**
   - Add `credentials/` to `.gitignore`
   - Use environment variables in production

2. **Limit Service Account Permissions:**
   - Only give Viewer access to files
   - Don't grant Editor or Owner permissions

3. **Use Time-Limited Access:**
   - Set appropriate `accessDuration` (e.g., 365 days)
   - Track expiration dates

4. **Monitor Access:**
   - Log all access link generations
   - Track when users access documents

## Production Deployment

### Render.com Setup:

1. Go to your service → **Environment**
2. Add environment variable:
   ```
   GOOGLE_DRIVE_CREDENTIALS={"type":"service_account",...}
   ```
3. Paste the entire JSON (single line)
4. Save and restart

### Alternative: Use Secrets Manager

For better security, consider using:

- AWS Secrets Manager
- Google Secret Manager
- HashiCorp Vault

## File Organization in Google Drive

Recommended structure:

```
LetsCrackDev/
├── Interview Sheets/
│   ├── Frontend Interview Sheet.pdf
│   ├── Backend Interview Sheet.pdf
│   └── Full Stack Interview Sheet.pdf
├── Resume Templates/
└── Course Materials/
```

## Access Flow

1. User purchases service → Payment verified
2. Backend generates Google Drive share link
3. Link stored in `Purchase.metadata.googleDriveLink`
4. User sees access button on Payment Success page
5. User can access document from Dashboard → My Documents
6. Link expires after `accessDuration` days

## API Endpoints

- `GET /api/v1/purchases/:id/access` - Get access link for a purchase
- Returns: `{ accessLink, fileType, accessExpiresAt }`

## Support

If you encounter issues:

1. Check backend logs for detailed error messages
2. Verify Google Drive API quota limits
3. Ensure service account has proper permissions

---

**Status:** ✅ Google Drive integration ready for use!
