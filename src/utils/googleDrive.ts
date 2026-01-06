/**
 * Google Drive API Utility
 * Handles file sharing and access link generation
 */

import { google } from 'googleapis'
import { logger } from './logger'
import fs from 'fs'
import path from 'path'

let driveClient: ReturnType<typeof google.drive> | null = null

/**
 * Initialize Google Drive client
 */
function getDriveClient() {
  if (driveClient) {
    return driveClient
  }

  // Try to get credentials from environment variable or file path
  let credentials: Record<string, unknown> | null = null

  if (process.env.GOOGLE_DRIVE_CREDENTIALS_PATH) {
    // Read from file
    const credentialsPath = path.resolve(process.env.GOOGLE_DRIVE_CREDENTIALS_PATH)
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'))
  } else if (process.env.GOOGLE_DRIVE_CREDENTIALS) {
    // Read from environment variable
    credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS)
  }

  if (!credentials) {
    logger.warn('Google Drive credentials not configured. Document access will not work.')
    throw new Error(
      'GOOGLE_DRIVE_CREDENTIALS or GOOGLE_DRIVE_CREDENTIALS_PATH environment variable is not set',
    )
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })

    driveClient = google.drive({ version: 'v3', auth })
    return driveClient
  } catch (error) {
    logger.error('Failed to initialize Google Drive client:', error)
    throw new Error('Google Drive authentication failed')
  }
}

/**
 * Generate a shareable link for a Google Drive file
 * @param fileId - Google Drive file ID
 * @param accessDurationDays - Number of days the link should be valid (optional)
 * @returns Shareable link URL
 */
export async function generateShareLink(
  fileId: string,
  accessDurationDays?: number,
): Promise<string> {
  try {
    const drive = getDriveClient()

    // Make file viewable by anyone with the link
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    })

    // Get file metadata to construct share link
    const file = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
    })

    // Return the web view link (best for viewing in browser)
    const shareLink = file.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`

    logger.info('Generated Google Drive share link', {
      fileId,
      accessDurationDays,
      shareLink,
    })

    return shareLink
  } catch (error) {
    logger.error('Failed to generate Google Drive share link:', error)
    throw new Error('Failed to generate file access link')
  }
}

/**
 * Verify if a file exists and is accessible
 * @param fileId - Google Drive file ID
 * @returns True if file exists and is accessible
 */
export async function verifyFileAccess(fileId: string): Promise<boolean> {
  try {
    const drive = getDriveClient()
    await drive.files.get({
      fileId,
      fields: 'id, name',
    })
    return true
  } catch (error) {
    logger.error('Failed to verify Google Drive file access:', error)
    return false
  }
}

/**
 * Get file information
 * @param fileId - Google Drive file ID
 * @returns File metadata
 */
export async function getFileInfo(fileId: string) {
  try {
    const drive = getDriveClient()
    const file = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
    })
    return file.data
  } catch (error) {
    logger.error('Failed to get Google Drive file info:', error)
    throw new Error('Failed to get file information')
  }
}
