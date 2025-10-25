# File Storage Options Guide

This guide provides two file storage options for the Rakeez platform, with clear setup instructions and trade-offs.

---

## Option 1: Google Cloud Storage (GCS) - Recommended for Production

### Overview
Uses Replit's built-in Object Storage (backed by Google Cloud Storage) for scalable, reliable file storage.

### ✅ Advantages
- **Scalable**: Handles unlimited files of any size
- **Fast**: CDN-backed delivery
- **Reliable**: Enterprise-grade infrastructure
- **Already Set Up**: Bucket and environment variables configured in development

### ⚠️ Considerations
- Requires deployment secrets for published apps
- Slightly more complex initial setup for production

### Setup Instructions

#### Development (Already Working)
No action needed! Object storage works automatically in development using the Replit sidecar.

#### Production (Published Domain)

**Step 1: Get GCS Credentials**

You need three values from your Replit Object Storage:

1. Open your Replit workspace
2. Go to **Secrets** (🔒 in sidebar) or **Object Storage** panel
3. Look for or create service account credentials

**Step 2: Add Deployment Secrets**

Add these three secrets to your **deployment environment** (not just workspace):

```bash
GCS_PROJECT_ID=your-gcs-project-id
GCS_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n
```

**Important**: 
- The private key must include the BEGIN/END markers
- Preserve `\n` for newlines in the private key
- Add to **deployment secrets**, not just workspace secrets

**Step 3: Redeploy**

Redeploy your application and check logs for:
```
Using GCS service account credentials for object storage (production mode)
```

### Current Environment Variables (Already Set)

```bash
PUBLIC_OBJECT_SEARCH_PATHS=/replit-objstore-7898b9cd-2b13-4fe2-a2b3-58a514419be4/public
PRIVATE_OBJECT_DIR=/replit-objstore-7898b9cd-2b13-4fe2-a2b3-58a514419be4/.private
DEFAULT_OBJECT_STORAGE_BUCKET_ID=replit-objstore-7898b9cd-2b13-4fe2-a2b3-58a514419be4
```

These are already configured. You only need to add the GCS credentials for production.

---

## Option 2: Database Storage (Base64) - Simple Alternative

### Overview
Store images as base64-encoded text directly in the PostgreSQL database.

### ✅ Advantages
- **Simple**: No external dependencies
- **No Setup**: Works immediately in dev and production
- **Self-contained**: Everything in one database

### ⚠️ Considerations
- **Database Size**: Each 1MB image = ~1.3MB of database storage
- **Performance**: Slower than dedicated storage for large images
- **Cost**: Database storage typically more expensive than object storage
- **Limits**: Not recommended for >100 images or images >5MB

### When to Use
- **Development/Testing**: Quick prototyping
- **Small Scale**: <50 images, each <2MB
- **Simple Deployments**: When you want everything in one database

### Setup Instructions

**Step 1: Update Schema**

The schema already supports this! Fields like `logo` and `image` store text URLs, which can be:
- Regular URLs: `https://example.com/image.png`
- Base64 data URIs: `data:image/png;base64,iVBORw0KGgoAAAA...`

**Step 2: Modify Upload Handler**

I can update the upload handlers to:
1. Read the file as base64
2. Store it as a data URI in the database
3. Display it directly in `<img>` tags

**Step 3: No Production Setup Needed**

Once implemented, works identically in development and production with no additional configuration.

### Implementation

If you choose this option, I'll:
1. Create a `convertToBase64()` utility function
2. Update upload handlers in brands and spare-parts
3. Remove dependency on object storage
4. Handle size limits and validation

---

## Comparison Table

| Feature | GCS (Option 1) | Database Base64 (Option 2) |
|---------|----------------|---------------------------|
| **Setup Complexity** | Medium (needs prod secrets) | Low (none needed) |
| **Performance** | Excellent | Good for small files |
| **Scalability** | Unlimited | Limited (database size) |
| **Cost** | Lower for many files | Higher for many files |
| **File Size Limits** | Essentially unlimited | 5MB recommended max |
| **Number of Files** | Unlimited | <100 recommended |
| **Deployment** | Needs secrets | Works everywhere |
| **Current Status** | ✅ Dev working, prod needs secrets | ❌ Not implemented |

---

## Recommended Choice

### Choose GCS (Option 1) if:
- ✅ You plan to have many images (>50)
- ✅ You want production-grade performance
- ✅ You're okay with one-time deployment setup
- ✅ You want scalability for future growth

### Choose Database (Option 2) if:
- ✅ You want the absolute simplest solution
- ✅ You have very few images (<50)
- ✅ You don't want any external dependencies
- ✅ You want identical dev/prod behavior with zero setup

---

## Current Implementation

Your app currently uses **GCS (Option 1)**:
- ✅ Working in development
- ⚠️ Needs deployment secrets for production (published domain)

**If you want to switch to Option 2**, I can implement it now with no additional setup required.

---

## Environment Variable Template

Create a `.env.template` file for reference:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host/database

# Object Storage (Option 1: GCS)
# These are auto-set in development by Replit
PUBLIC_OBJECT_SEARCH_PATHS=/bucket-name/public
PRIVATE_OBJECT_DIR=/bucket-name/.private
DEFAULT_OBJECT_STORAGE_BUCKET_ID=bucket-name

# GCS Credentials (Required for PRODUCTION with Option 1)
# Add these as DEPLOYMENT SECRETS only
GCS_PROJECT_ID=your-project-id
GCS_CLIENT_EMAIL=service@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n

# Option 2 (Database Base64) requires no additional env vars

# Payment (Already configured)
MOYASAR_PUBLIC_KEY=your-key
MOYASAR_SECRET_KEY=your-secret

# SMS
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=your-phone
```

---

## Next Steps

**If you choose Option 1 (GCS - Recommended):**
1. Follow the production setup steps above when ready to deploy
2. Images work in development immediately
3. Add secrets before publishing

**If you choose Option 2 (Database):**
1. Let me know and I'll implement it now
2. No additional configuration needed
3. Works everywhere immediately

**Which option would you like to use?**
