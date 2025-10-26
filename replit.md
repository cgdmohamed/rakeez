# Rakeez - Bilingual Cleaning Services API

## Overview
Rakeez is a Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. It enables booking, managing, and tracking cleaning and maintenance services, processing payments, and facilitating interactions between customers, technicians, and administrators. The platform includes features such as quotation management, a wallet system, referral rewards, and multi-role access, aiming to provide a comprehensive solution for service management with high market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend uses React with TypeScript, Vite, Wouter, TanStack Query, Shadcn/ui (on Radix UI), and Tailwind CSS. It features a component-based, bilingual UI with role-based dashboards for Admin and Technicians, a professional light design, and centralized query client with error handling. The Admin Dashboard provides comprehensive management capabilities, including a detailed Booking Management System with operational control, technician assignment, status timelines, and audit logging. Customer profiles display detailed information across multiple tabs: Overview, Orders, Payments, Support Tickets, Reviews, Referrals, Subscriptions, and Addresses. Authentication uses 'auth_token' as the localStorage key for JWT tokens.

### Backend Architecture
The backend is built with Express.js and TypeScript, following a modular controller-service architecture. It uses JWT for authentication and authorization with role-based access control and OTP verification via Twilio. Business logic is organized into dedicated controllers. A robust User and Roles Management System supports dynamic role creation with flexible permissions, backed by API endpoints for CRUD operations, validation, and audit logging. All error responses use structured bilingual messages with detailed stack traces in development mode.

### Database Design
The project utilizes PostgreSQL via Neon Database with Drizzle ORM. The schema includes tables for users, services, bookings, payments, referrals, notifications, and more, employing JSONB for bilingual content, enum types, soft deletes, and timestamp tracking.

**Service Architecture (Updated October 2025):**
- **`services`**: Core service definitions with bilingual names, descriptions, categories, and metadata (image, averageRating, reviewCount)
- **`serviceTiers`**: Pricing tiers for individual services (one-time payment model). Each service can have multiple pricing tiers (e.g., Basic, Premium, VIP) with different features and prices
- **`subscriptionPackages`**: Multi-service recurring bundles (subscription model) with package tiers, duration, pricing, and terms
- **`subscriptionPackageServices`**: Junction table linking subscription packages to multiple services with quantity tracking
- **`subscriptions`**: Customer subscriptions linked to `subscriptionPackages` (not `serviceTiers`) for recurring billing
- **`bookings`**: Service bookings that can reference either single-service tiers or subscription-based access

This separation enables two distinct booking flows:
1. **Single Service Booking**: Customer selects a service → chooses pricing tier → one-time payment → booking created
2. **Subscription-Based Access**: Customer purchases subscription package → gets access to multiple services → books from included services → deducts from subscription allowance

### Booking Management System
The system offers complete administrative control over bookings, including status updates, technician assignment with notifications, cancellation, and refunds. It supports a workflow with states such as `pending`, `confirmed`, `technician_assigned`, `in_progress`, and `completed`. The admin interface provides a comprehensive table view, detailed modals, status timeline visualization, context-aware action buttons, and robust filtering/search. All actions are logged to an `audit_logs` table, and real-time updates are handled via WebSocket broadcasting and SMS notifications.

### Referral and Promo System
This system enables administrators to create and manage referral campaigns, track referrals, apply discounts during booking, and distribute rewards. It includes database schemas for `referral_campaigns` and `referrals`, with `bookings` supporting referral codes. API endpoints handle validation, redemption, statistics, and admin management. The Admin Dashboard features a dedicated promos page with campaign CRUD, analytics charts, and integration into customer profiles.

### Mobile Content Management System
A comprehensive system for managing the mobile app's homepage content, including home slider images (up to 3 active, with drag-and-drop reordering and unlimited inactive drafts) and a single home banner with bilingual titles and an optional link URL. It features transactional protection with FOR UPDATE row locking, server-side validation for file uploads (max 5MB, image-only), and dedicated API endpoints for admin CRUD operations and public access.

### Subscription Management System
The platform features a complete subscription management system allowing customers to purchase service packages and administrators to create, manage, and track subscriptions. Key features include:

**Subscription Packages:**
- Full CRUD operations for service packages with bilingual naming (English/Arabic)
- Package tiers (basic, premium, vip, enterprise) with flexible pricing and duration
- Service inclusions management with JSONB support
- Active/inactive status toggle for package availability
- Admin dashboard with package statistics (total, active, inactive, by tier)
- Admin API endpoints: GET/POST/PUT/DELETE at `/api/v2/admin/service-packages` (includes service links via junction table)
- Public API endpoints:
  * GET `/api/v2/subscription-packages` - Browse all active packages with optional tier/category filtering and bilingual content
  * GET `/api/v2/subscription-packages/:id` - Get package details with included services (localized)
- Admin endpoints enriched with linked services from `subscriptionPackageServices` junction table
- Service links include usage limits and discount percentages per package

**Admin Subscription Management:**
- Manual subscription creation for any customer via admin panel
- Customer search and selection with package assignment
- Date range configuration (start/end dates) and auto-renewal toggle
- Admin-specific endpoint (POST `/api/v2/admin/subscriptions`) with custom validation schema
- Server-side defaults: totalAmount from package price, status ('active'), benefits from package inclusions, usageCount (0)
- User and package existence validation before creation
- Subscription listing with filtering, pagination, and status management

**Dashboard Integration:**
- Subscription statistics cards on admin overview (active, expired, cancelled, total)
- Total subscription revenue tracking and display
- Conditional rendering (only shown when subscriptions exist)
- Analytics endpoint enhanced with subscription aggregation
- Quick links to filtered subscription views from dashboard cards

**Customer Profile Integration:**
- Subscriptions tab in customer profile displays all customer subscriptions
- Shows package name, tier, dates, amount, status, usage count, and auto-renewal status
- Uses existing API endpoint `/api/v2/users/:userId/subscriptions` with admin authorization
- Consistent table design matching other profile tabs (Orders, Payments, etc.)
- Empty state for customers without active subscriptions

**Architecture Notes (Updated October 2025):**
- Schema redesigned to separate single-service pricing (`serviceTiers`) from multi-service bundles (`subscriptionPackages`)
- Junction table `subscriptionPackageServices` enables flexible package composition with multiple services
- Admin creation uses custom validation schema (only userId, packageId, dates, autoRenew required)
- Defaults enforced server-side to prevent client tampering
- Subscriptions linked to `subscriptionPackages` table (not `serviceTiers`) via packageId
- Customer profile fetches enriched subscription data with package details (name, tier, price)
- Database migration completed: `service_packages` → `serviceTiers`, new `subscriptionPackages` and `subscriptionPackageServices` tables created
- All code updated to use new schema: storage layer, API routes, seed data, subscription lifecycle, webhooks
- Future optimization needed: caching/aggregation for dashboard statistics at scale

### File Upload System
The system integrates with Replit Object Storage (Google Cloud Storage) for file uploads, such as brand logos, spare part images, slider images, and avatars. It utilizes presigned URLs for secure direct uploads to GCS. Security features include required metadata validation (fileSize, fileType), ACL policies, presigned URL expiration, and bearer token authentication for URL generation. Deployment configuration supports dual-mode authentication for development (Replit sidecar) and production (GCS service account credentials).

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