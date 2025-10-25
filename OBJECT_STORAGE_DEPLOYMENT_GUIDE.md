# Object Storage Deployment Setup Guide

## Problem Overview

File uploads work perfectly in **development** but fail with **502 Bad Gateway** errors on the **published domain** (rakeez.testcceg.com).

**Root Cause:** 
- Development environment uses Replit's sidecar endpoint (`http://127.0.0.1:1106`) for GCS authentication
- Published deployments **do NOT** have access to the sidecar endpoint
- This causes the upload endpoint to timeout, resulting in 502 errors from nginx

**Solution:** 
Configure Google Cloud Storage service account credentials as deployment secrets so published apps can authenticate directly with GCS.

---

## Solution Implemented

The `server/objectStorage.ts` file has been updated to support **dual authentication modes**:

1. **Development Mode** (default): Uses Replit sidecar endpoint when GCS credentials are not available
2. **Production Mode**: Uses GCS service account credentials from environment variables

The code automatically detects which mode to use based on the presence of these environment variables:
- `GCS_PROJECT_ID`
- `GCS_CLIENT_EMAIL`
- `GCS_PRIVATE_KEY`

---

## Setup Instructions for Published Deployment

### Step 1: Get Google Cloud Storage Credentials

You need to obtain service account credentials from the Replit Object Storage integration:

#### Option A: From Replit Secrets (Recommended)
1. Open your Replit workspace
2. Click on the **Secrets** tool (🔒 icon in left sidebar)
3. Look for secrets that start with `GCS_` or contain object storage credentials
4. You may find:
   - `GOOGLE_CLOUD_PROJECT_ID` or `GCS_PROJECT_ID`
   - `GOOGLE_CLIENT_EMAIL` or `GCS_CLIENT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` or `GCS_PRIVATE_KEY`

#### Option B: From Object Storage Documentation
1. Check the Object Storage panel in your Replit workspace
2. Look for "Service Account" or "Credentials" section
3. Download or copy the service account JSON credentials

#### Option C: Contact Replit Support
If you cannot find the credentials, you may need to:
- Regenerate them through the Object Storage settings
- Contact Replit support for assistance

---

### Step 2: Add Credentials to Deployment Secrets

Once you have the credentials, you need to add them as **deployment secrets** (not just workspace secrets):

#### Via Replit Deployment Settings:
1. Go to your published deployment settings
2. Navigate to **Environment Variables** or **Secrets** section
3. Add the following three secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `GCS_PROJECT_ID` | Your GCS project ID | `replit-gcs-123456` |
| `GCS_CLIENT_EMAIL` | Service account email | `service@project.iam.gserviceaccount.com` |
| `GCS_PRIVATE_KEY` | Private key (with newlines) | `-----BEGIN PRIVATE KEY-----\n...` |

**Important Notes:**
- The `GCS_PRIVATE_KEY` must include the full key with `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` markers
- Newlines in the private key should be preserved as `\n` characters
- These secrets must be added to the **deployment environment**, not just the development workspace

---

### Step 3: Redeploy Your Application

After adding the secrets:
1. Trigger a new deployment (redeploy your app)
2. Wait for the deployment to complete
3. Check the deployment logs to verify the credentials are being used

**Expected Log Message:**
```
Using GCS service account credentials for object storage (production mode)
```

If you see this instead:
```
Using Replit sidecar endpoint for object storage (development mode)
```

Then the credentials were not properly set in the deployment environment.

---

### Step 4: Test File Upload

1. Visit your published domain: `https://rakeez.testcceg.com`
2. Log in as admin (`admin@rakeez.com` / `admin123`)
3. Navigate to **Admin → Brands** or **Admin → Spare Parts**
4. Try uploading a logo or image
5. The upload should now work without 502 errors

---

## Verification Checklist

- [ ] Obtained GCS service account credentials (project ID, client email, private key)
- [ ] Added all three credentials as **deployment secrets** (not just workspace secrets)
- [ ] Redeployed the application
- [ ] Verified deployment logs show "production mode" message
- [ ] Successfully uploaded a file on the published domain
- [ ] No 502 errors observed

---

## Troubleshooting

### Still Getting 502 Errors After Setup

**Check 1: Verify Credentials Are Set in Deployment**
- Deployment secrets are separate from workspace secrets
- Make sure the secrets are in the **deployment environment**

**Check 2: Verify Credential Format**
```env
GCS_PROJECT_ID=your-project-id
GCS_CLIENT_EMAIL=service@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIE...actual key...==\n-----END PRIVATE KEY-----\n
```

**Check 3: Check Deployment Logs**
Look for error messages related to GCS authentication:
- "Failed to sign URL with GCS credentials"
- "Invalid credentials"
- "Authentication failed"

**Check 4: Verify Bucket Permissions**
The service account must have permissions on the bucket:
- `storage.objects.create`
- `storage.objects.get`
- `storage.objects.delete`

### Development Still Works, Production Doesn't

This confirms the sidecar is working in development but credentials are missing in production.
- Double-check that secrets are added to **deployment**, not just workspace
- Redeploy after adding secrets

### Error: "Failed to sign object URL"

This usually means:
1. Credentials are not set correctly
2. Private key format is incorrect (missing newlines or markers)
3. Service account doesn't have bucket permissions

---

## Alternative: Use Development Webview

If you're unable to configure deployment secrets immediately, you can:
1. Use the **development webview** URL (not the published domain)
2. This will continue to work with the sidecar endpoint
3. Set up deployment secrets when ready for production

Development webview URL format:
```
https://<repl-id>.<username>.repl.co
```

---

## Summary

✅ **Fixed in Code:**
- Updated `server/objectStorage.ts` to support both development and production authentication modes
- Improved error handling with detailed error messages
- Added 30-second timeout for upload requests

🔧 **Required by User:**
- Obtain GCS service account credentials
- Add credentials as deployment secrets (`GCS_PROJECT_ID`, `GCS_CLIENT_EMAIL`, `GCS_PRIVATE_KEY`)
- Redeploy the application

Once configured, file uploads will work seamlessly on both development and published deployments!
