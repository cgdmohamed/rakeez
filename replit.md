# Rakeez - Bilingual Cleaning Services API

## Overview
Rakeez is a Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. It enables customers to book cleaning and maintenance services, manage appointments, process payments via multiple gateways (Moyasar, Tabby), track orders, and interact with technicians. The system supports a full booking workflow including quotations, wallet management, referral rewards, and multi-role access for customers, technicians, and admins.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
**Technology Stack:**
- React with TypeScript
- Vite
- Wouter
- TanStack Query
- Shadcn/ui (on Radix UI)
- Tailwind CSS

**Design Decisions:**
- Component-based architecture with path aliases.
- Centralized query client with error handling.
- Bilingual UI support.
- Role-based dashboard interfaces (Admin, Technician).
- Professional brand identity system with CSS utility classes for consistent UI/UX.
- Admin Dashboard: Comprehensive management portal with professional styling, enhanced tables, brand badges for status, and clear typography hierarchy.
- Technician Dashboard: Job-focused interface for assigned jobs, status updates, and uploads.
- Authentication: Unified login with role-based routing and JWT token management.
- Implementation of instant table updates using cache-busting with `staleTime: 0` and HTTP cache control headers to ensure immediate data refresh after mutations.
- Analytics Dashboard: Real-time charts for revenue trends, booking trends, revenue by payment method, and orders by status, with KPI cards and comprehensive empty state handling.
- Dashboard Theme: Modern, professional light theme redesign with a light gray primary background, white cards, a white sidebar with dark blue text, cyan active navigation, and accessibility-compliant color combinations.

### Backend Architecture
**Core Framework:**
- Express.js with TypeScript
- Modular controller-service architecture.
- Middleware for authentication, validation, and rate limiting.

**Authentication & Authorization:**
- JWT-based (access and refresh tokens).
- Role-based access control (customer, technician, admin, support, finance).
- OTP verification via Twilio.
- Session management with Redis or in-memory fallback.

**Business Logic Organization:**
- Dedicated controllers for Auth, Bookings, Orders, Payments, Profile, Services, Support, Notifications, and Webhooks.

**User and Roles Management System:**
- Comprehensive user management with role-based permissions (`admin`, `technician`, `customer`, `support`, `finance`).
- Custom roles system allowing dynamic role creation with flexible permissions (using JSONB array for `permissions` and `isSystemRole` flag).
- Backend API endpoints for CRUD operations on users and roles, including validation, audit logging, and protection for system roles.
- Permissions defined in `shared/permissions.ts` as a canonical source for backend validation.

### Database Design
**Technology:**
- PostgreSQL via Neon Database.
- Drizzle ORM.
- Schema in `shared/schema.ts`.

**Core Tables:**
- `users`, `addresses`, `service_categories`, `services`, `service_packages`, `spare_parts`, `bookings`, `quotations`, `quotation_spare_parts`, `payments`, `wallets`, `wallet_transactions`, `referrals`, `notifications`, `support_tickets`, `support_messages`, `reviews`, `promotions`, `audit_logs`, `webhook_events`, `order_status_logs`, `roles`.

**Key Design Patterns:**
- JSONB for bilingual content.
- Enum types for constrained values.
- Soft delete pattern.
- Timestamp tracking.

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
- **Replit Object Storage**: File uploads (brand logos, spare part images, avatars) via Google Cloud Storage with presigned URLs.

**Utilities:**
- **PDFKit**: Invoice/report generation.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT handling.
- **Zod**: Schema validation.
- **Axios**: HTTP client.

### Referral and Promo System
**Database Schema:**
- `referral_campaigns`: Campaign configuration with reward settings, discount types, usage limits, validity dates
- `referrals`: Tracking table linking inviters, invitees, bookings, and reward status
- `bookings`: Extended with `referralCode` and `referralDiscount` fields for tracking

**Referral Flow:**
1. **Campaign Creation** (Admin): Configure inviter rewards, invitee discounts (percentage/fixed), max usage per user, date range
2. **Code Validation** (Booking): Validates referral code, checks active campaign, verifies usage limits
3. **Discount Application**: Applies discount to booking total, clamps at 0 to prevent negatives
4. **Referral Tracking**: Creates referral record linked to booking via `bookingId`
5. **Reward Distribution** (Webhook): On payment success, atomically credits inviter wallet and marks referral as rewarded

**API Endpoints:**
- `POST /api/v2/referrals/validate`: Validate referral code and get discount details
- `POST /api/v2/referrals/redeem`: Redeem referral code for an order (creates referral record)
- `GET /api/v2/referrals/stats`: Get referral statistics for authenticated user
- `GET /api/v2/referrals/admin/list`: List all referrals (admin)
- `POST /api/v2/referrals/campaigns`: Create referral campaign (admin)
- `GET /api/v2/referrals/campaigns`: List all campaigns (admin)
- `GET /api/v2/referrals/analytics`: Get referral analytics with date filtering (admin, supports from_date/to_date query params)
- `GET /api/v2/admin/users/:userId/referrals`: Get user-specific referral data (auto-generates referral code if missing)

**Validation & Safety:**
- Zod schema validation for referral_code (1-20 chars, transforms empty → undefined)
- Subtotal clamping prevents negative totals when discounts exceed base price
- Transaction-wrapped wallet operations ensure atomicity
- Direct bookingId lookup for reliable referral identification
- Error propagation (no silent failures)

**Admin Dashboard:**
- Promos page (`/admin/promos`) with campaign CRUD operations
- Analytics charts: monthly referrals, rewards distribution, referral leaderboard
- Date filtering for analytics (from_date/to_date query parameters)
- Enhanced KPIs: Total Referrals, Total Rewards, Total Discounts with loading states
- Real-time campaign status management with instant cache invalidation
- Customer Profile integration: Referrals tab showing referral code (with copy), stats, referral history, and campaigns used
- UI/UX consistency: Unified layout spacing (space-y-6), header styling (text-3xl font-bold text-primary), dialog forms (space-y-2), and tab navigation across all admin pages

**Implementation:**
- `server/controllers/referralController.ts`: Referral business logic and admin endpoints
- `server/controllers/bookingsController.ts`: Booking integration with referral validation
- `server/utils/webhook.ts`: Payment webhook with referral reward processing
- `client/src/pages/admin/promos.tsx`: Admin dashboard for campaign management and analytics
- `client/src/pages/admin/customer-profile.tsx`: Customer profile with integrated referrals tab
- `server/middleware/validation.ts`: Schema validation including referral_code

**Technical Notes:**
- Analytics query uses two-part queryKey `['/api/v2/admin/referrals/analytics', queryParams]` with custom queryFn for proper cache invalidation
- Cache invalidation via `queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/referrals/analytics'] })` ensures analytics refresh after campaign mutations
- All admin pages follow consistent design pattern: `space-y-6` containers, `text-3xl font-bold text-primary` headers, `space-y-2` form fields

### File Upload System
**Object Storage Configuration:**
- Bucket: `replit-objstore-7898b9cd-2b13-4fe2-a2b3-58a514419be4`
- Private directory: `/replit-objstore-7898b9cd-2b13-4fe2-a2b3-58a514419be4/.private`
- Public search paths: `/replit-objstore-7898b9cd-2b13-4fe2-a2b3-58a514419be4/public`

**Upload Flow:**
1. Frontend calls `POST /api/v2/objects/upload` (authenticated) to get presigned URL
2. Backend generates signed URL via Replit sidecar at `http://127.0.0.1:1106/object-storage/signed-object-url`
3. Frontend uploads file directly to Google Cloud Storage using presigned URL (PUT request)
4. Frontend extracts base URL (removes query params) and stores in database
5. Files stored with ACL policies for access control

**Implementation Details:**
- `server/objectStorage.ts`: Core service for object storage operations
- `server/objectAcl.ts`: ACL policy management for private objects
- Upload endpoint returns: `{ uploadURL: string }` with 15-minute TTL
- Uploaded files: `.private/uploads/{uuid}`
- Important: `apiRequest()` returns Response object - must call `.json()` to parse

**Security:**
- ACL policies enforce owner-based access control
- Visibility: `public` (accessible to all) or `private` (owner + ACL rules only)
- Presigned URLs expire after 15 minutes
- Authentication required for upload URL generation