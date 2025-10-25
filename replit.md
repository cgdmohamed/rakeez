# Rakeez - Bilingual Cleaning Services API

## Overview
Rakeez is a Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. It facilitates booking and managing cleaning and maintenance services, processing payments, tracking orders, and managing interactions between customers, technicians, and administrators. The system includes features such as quotation management, wallet systems, referral rewards, and multi-role access, aiming to provide a comprehensive solution for service management.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (October 2025)
- **Mobile Content Management** (Oct 25): Implemented complete mobile app homepage content management system:
  - Home Slider: Up to 3 active images with drag-and-drop reordering, unlimited inactive drafts
  - Home Banner: Bilingual titles (EN/AR), optional link URL, single active banner
  - Transactional protection with FOR UPDATE locking to prevent race conditions
  - Server-side file validation (max 5MB, images only) with required metadata
  - Public API endpoints for mobile app to fetch active content
  - Admin UI with tabs, file upload, preview, and reordering functionality
- **Image Fallback Component** (Oct 25): Created reusable `ImageWithFallback` component with error handling, loading states, retry functionality (click to retry), and multiple fallback types. Integrated into brands, spare parts, and mobile content admin pages with visual retry indicators (RefreshCw icon, hover states, accessibility labels).
- **Object Storage Deployment Fix** (Oct 25): Fixed 502 errors on published domain by implementing dual-mode authentication (development: sidecar endpoint, production: GCS service account credentials). Requires deployment secrets for published apps. See `OBJECT_STORAGE_DEPLOYMENT_GUIDE.md` for setup.
- **Storage Options Documentation** (Oct 25): Added comprehensive `STORAGE_OPTIONS_GUIDE.md` with detailed comparison of GCS (production-ready) vs Base64 encoding (simple alternative) for file storage
- **Upload Error Handling**: Enhanced file upload with required metadata validation (fileSize, fileType), 30-second timeouts, detailed error messages, and graceful degradation for network issues
- **JWT Authentication Fix**: Updated JWT issuer/audience values to `rakeez-api`/`rakeez-client` across all token generation and verification functions for consistency
- **Fixed Authentication**: Standardized localStorage token key to 'auth_token' across all admin pages (overview, bookings, promos)
- **Enhanced Database Relations**: Added missing Drizzle ORM relations for payments, support tickets, messages, reviews, and invoices
- **Backend Error Handling**: Implemented comprehensive bilingual error messages with detailed logging for all admin endpoints
- **Customer Overview Enhancement**: Extended customer profile data to include complete booking details with technician info, wallet transactions, support tickets, reviews, and referrals
- **Payments Endpoint**: Added comprehensive filtering by date range, status, payment method, and user ID
- **Bug Fixes**: Added missing `getCustomerInvoices` storage method, fixed language extraction for error responses, fixed admin support page Input component import

## System Architecture

### Frontend Architecture
The frontend uses React with TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui (on Radix UI), and Tailwind CSS. It features a component-based, bilingual UI with role-based dashboards for Admin and Technicians. Key design decisions include a professional brand identity, centralized query client with error handling, instant table updates, and an analytics dashboard with real-time charts. The Admin Dashboard provides comprehensive management capabilities, including a detailed Booking Management System with operational control, technician assignment, status timelines, and audit logging. The overall theme is a modern, professional light design. **Authentication uses 'auth_token' as the localStorage key for JWT tokens.**

### Backend Architecture
The backend is built with Express.js and TypeScript, following a modular controller-service architecture. It uses JWT for authentication and authorization with role-based access control (customer, technician, admin, support, finance) and OTP verification via Twilio. Business logic is organized into dedicated controllers for various functionalities. A robust User and Roles Management System supports dynamic role creation with flexible permissions, backed by API endpoints for CRUD operations, validation, and audit logging. **All error responses use structured bilingual messages with detailed stack traces in development mode.**

### Database Design
The project utilizes PostgreSQL via Neon Database with Drizzle ORM. The schema is defined in `shared/schema.ts` and includes tables for users, services, bookings, payments, referrals, notifications, and more. Key design patterns include JSONB for bilingual content, enum types, soft deletes, and timestamp tracking.

### Booking Management System
The system offers complete administrative control over bookings, including status updates, technician assignment with notifications, cancellation, and refunds. It supports a workflow with states such as `pending`, `confirmed`, `technician_assigned`, `in_progress`, and `completed`. The admin interface provides a comprehensive table view of bookings, a detailed modal with customer and technician profiles, a status timeline visualization, context-aware action buttons, and robust filtering/search capabilities. All actions are logged to an `audit_logs` table, and real-time updates are handled via WebSocket broadcasting and SMS notifications.

### Referral and Promo System
This system allows for the creation and management of referral campaigns by administrators. It tracks referrals, applies discounts during booking, and distributes rewards upon successful payment. The database schema includes `referral_campaigns` and `referrals` tables, with `bookings` extended to support referral codes. API endpoints handle validation, redemption, statistics, and admin management of campaigns and analytics. The Admin Dashboard includes a dedicated promos page with campaign CRUD, analytics charts, and integration into customer profiles.

### Mobile Content Management System
A comprehensive system for managing the mobile app's homepage content, including slider images and promotional banners. The system enforces a maximum of 3 active slider images with support for unlimited inactive drafts (backups). Features include:
- **Slider Images**: Up to 3 active images with sortOrder (1-3), drag-and-drop reordering via arrow buttons, and unlimited inactive images for drafts/backups
- **Home Banner**: Single active banner with bilingual titles (en/ar), optional link URL, and image upload
- **Concurrency Protection**: Transactional protection with FOR UPDATE row locking prevents race conditions when multiple admins create content simultaneously
- **Server-side Validation**: Required file metadata (size, type), enforced 5MB limit, image-only uploads (jpeg, jpg, png, gif, webp)
- **API Endpoints**:
  - Admin: Full CRUD operations with authentication and authorization
  - Public: Read-only endpoints (`/api/v2/public/home/slider`, `/api/v2/public/home/banner`) for mobile app to fetch active content
- **Admin UI**: Tabbed interface with file upload, preview (ImageWithFallback), reordering (up/down arrows), and bilingual form fields
- **Database Tables**: `home_slider_images` (id, imageUrl, sortOrder, isActive, timestamps), `home_banner` (id, title JSONB, imageUrl, linkUrl, isActive, timestamps)

### File Upload System
The system integrates with Replit Object Storage (Google Cloud Storage) for file uploads, such as brand logos, spare part images, slider images, and avatars. The frontend requests presigned URLs from a backend endpoint, then uploads files directly to GCS. Security is enforced through:
- **Required Metadata Validation**: All upload requests must include fileSize (max 5MB) and fileType (images only) for server-side validation
- **ACL Policies**: Fine-grained access control for uploaded objects
- **Presigned URL Expiration**: Time-limited upload URLs to prevent abuse
- **Authentication**: Bearer token required for URL generation endpoint

**Deployment Configuration:**
- **Development**: Uses Replit sidecar endpoint (`http://127.0.0.1:1106`) for GCS authentication
- **Production**: Requires GCS service account credentials as deployment secrets:
  - `GCS_PROJECT_ID`: Google Cloud project ID
  - `GCS_CLIENT_EMAIL`: Service account email
  - `GCS_PRIVATE_KEY`: Service account private key
- The system automatically detects which authentication mode to use based on environment variables
- See `OBJECT_STORAGE_DEPLOYMENT_GUIDE.md` for detailed setup instructions

## External Dependencies

**Payment Gateways:**
- **Moyasar**: Cards, mada, Apple Pay.
- **Tabby**: Buy Now Pay Later (BNPL).

**Communication Services:**
- **Twilio**: SMS for OTP and notifications.
- **Nodemailer**: Email for receipts.
- **Expo Push Notifications**: Mobile push notifications.

**Infrastructure Services:**
- **Redis (Optional)**: Session management, rate limiting, OTP storage, webhook deduplication.
- **Neon Database (PostgreSQL)**: Primary data store.
- **Replit Object Storage**: File uploads (via Google Cloud Storage).

**Utilities:**
- **PDFKit**: Invoice/report generation.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT handling.
- **Zod**: Schema validation.
- **Axios**: HTTP client.