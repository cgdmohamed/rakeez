# Rakeez - Bilingual Cleaning Services API

## Overview
Rakeez is a Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. It facilitates booking, managing, and tracking cleaning and maintenance services, processing payments, and interaction between customers, technicians, and administrators. The platform includes features such as quotation management, a wallet system, referral rewards, and multi-role access, aiming to provide a comprehensive solution for service management with high market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, featuring a component-based, bilingual UI with role-based dashboards (Admin, Technicians), a professional light design, and centralized query client with error handling. Admin and Technician dashboards provide comprehensive management capabilities.

**Admin Dashboard Navigation (October 2025):**
The admin sidebar features an organized, collapsible group-based navigation structure with visual hierarchy:
- **Dashboard** - Overview (default open)
- **Operations** - Bookings, Calendar, Quotations, Payments (default open)
- **User Management** - My Profile, Customers, Technicians, Users, Roles (collapsible)
- **Services & Products** - Services, Brands, Spare Parts, Subscription Packages, Subscriptions (collapsible)
- **Marketing** - Promos, Mobile Content (collapsible)
- **Support & Communication** - Support, Notifications (collapsible)
- **Analytics** - Analytics (collapsible)

Each section has a clear header with chevron indicators, visual separators, and improved icons for better scannability. Active items are highlighted with primary color and shadow effects.

**Technician Dashboard Self-Service Features (October 2025):**
- **Profile Management**: Technicians can view and edit their personal information (name in English and Arabic)
- **Password Management**: Secure password change functionality with strong validation requirements (8+ characters, uppercase, lowercase, numbers, special characters)
- **Performance & Earnings**: Comprehensive dashboard showing total jobs, completion rate, average rating, revenue, and monthly statistics with data visualization charts
- **Quotations Management**: View and filter all created quotations by status (pending, approved, rejected) with detailed breakdowns
- **Availability Settings**: Configure working hours, service radius, maximum daily bookings, home location, and real-time availability status

### Technical Implementations
The backend is built with Express.js and TypeScript, following a modular controller-service architecture. It uses JWT for authentication and authorization with role-based access control and OTP verification via Twilio. Password management includes secure change functionality available to all authenticated users (customers, technicians, and admins) with strong validation via passwordSchema (minimum 8 characters, uppercase, lowercase, numbers, special characters), rate limiting (5 attempts per 15 minutes), and audit logging. 

**Authentication Flow (October 2025):**
- **Global 401 Error Handler**: Automatic redirection to login page when authentication fails, with token cleanup
- **Login Features**: Simplified unified login form (removed role tabs), remember me checkbox, password visibility toggle, forgot password flow with email verification
- **Password Reset**: Complete flow with token validation and secure password update
- **Session Protection**: All protected routes check authentication on mount and redirect to login if invalid

**API Integration FAQ (October 2025):**
- **Public Access**: API FAQ page available at `/api-faq` without authentication for easy developer access
- **Comprehensive Documentation**: Documenting common integration issues with step-by-step solutions
- **CORS Solutions**: Detailed guide for configuring CORS with Nginx reverse proxy, including exact configuration snippets
- **Authentication Guide**: Proper JWT token handling, common 401 errors, and resolution steps
- **Rate Limiting**: Documentation of API rate limits and best practices
- **Production Checklist**: Environment setup, security configuration, and deployment best practices
- **WebSocket Setup**: Nginx configuration for WebSocket connections
- **Navigation**: Integrated header with links to API docs and login for seamless developer experience

All error responses use structured bilingual messages. The project utilizes PostgreSQL via Neon Database with Drizzle ORM, employing JSONB for bilingual content, enum types, soft deletes, and timestamp tracking.

### Feature Specifications

#### Booking Management System
Provides complete administrative control over bookings, including status updates, technician assignment, cancellation, and refunds. It supports a workflow with states such as `pending`, `confirmed`, `technician_assigned`, `in_progress`, and `completed`.

#### Smart Technician Assignment System
An intelligent automatic assignment algorithm selects the best technician based on weighted criteria: Distance, Workload, Availability, Skills, and Performance. Skill matching logic prioritizes specialists and hard-gates unqualified technicians. All assignment attempts are logged for audit.

#### Technician Profile System
A 360-degree technician management interface within the Admin Dashboard, offering tabs for Overview, Performance, Availability, Assignments, and Certifications & Skills. It allows for managing technician availability, specializations, and tracking performance metrics.

#### Referral and Promo System
Enables creation and management of referral campaigns, tracking referrals, applying discounts, and distributing rewards.

#### Mobile Content Management System
Manages mobile app homepage content, including home slider images and a single home banner, with bilingual titles and optional links. It features secure file uploads to Replit Object Storage.

#### Subscription Management System
Allows customers to purchase service packages and administrators to create, manage, and track subscriptions. This includes CRUD operations for subscription packages with bilingual naming, package tiers, service inclusions with usage limits, and integration into the booking process for subscription-based service access. Bookings can either be single-service or subscription-based, with robust validation for subscription usage.

#### Marketing & Loyalty System
A comprehensive promotional platform featuring coupon codes, credit-based rewards, and automated loyalty incentives designed to increase customer engagement, retention, and referrals.

**Coupon Management:**
- **Coupon Creation**: Admins can create time-limited coupon codes with flexible discount types (percentage or fixed amount), usage limits (total uses, per-user limits), and targeting rules (first-time users only, specific services, minimum order amount)
- **Validation Engine**: 7-layer validation checks coupon eligibility in real-time: existence & active status, expiration dates, total usage limits, per-user usage limits, first-time customer restriction, service eligibility, and minimum order requirements
- **Usage Tracking**: Automatic recording of coupon usage with detailed analytics showing redemptions per user, total discount distributed, and conversion rates
- **Discount Integration**: Coupon discounts are applied in the booking price calculation chain after subscription and referral discounts but before VAT calculation

**Credit System:**
- **Virtual Balance**: Users accumulate promotional credits (separate from wallet top-ups) that can be applied toward booking payments
- **Expiration Management**: Credits expire after 90 days (configurable via loyalty settings) with automatic expiration tracking and early warnings for expiring credits
- **Usage Limits**: Loyalty settings enforce maximum credit usage per booking (default 30% of total amount) and minimum booking amount to use credits (default 50 SAR)
- **Transaction History**: Complete audit trail of all credit transactions including grants, deductions, and expirations with bilingual reasons and balance snapshots
- **Balance Calculation**: Real-time balance computed from non-expired credit transactions, supporting concurrent operations via atomic database transactions

**Automated Rewards:**
The system automatically grants promotional credits on key customer lifecycle events:
- **Welcome Bonus** (20 SAR default): Granted immediately upon successful registration to encourage first booking
- **First Booking Bonus** (30 SAR default): Awarded when user completes their first service booking, triggered on status change to 'completed'
- **Loyalty Cashback** (2% default): Percentage-based cashback on every completed booking amount, encouraging repeat business
- **Referral Rewards** (50 SAR inviter, 30 SAR invitee default): Both parties receive credits when referee completes first booking using referral code

**Loyalty Settings:**
Admin-configurable parameters controlling the entire rewards ecosystem:
- Welcome bonus amount, First booking bonus amount, Referrer reward amount, Referee reward amount
- Cashback percentage (applied to completed bookings)
- Credit expiry days (default 90)
- Maximum credit usage percentage per booking (default 30%)
- Minimum booking amount to use credits (default 50 SAR)

**Payment Integration:**
Credits and coupons are seamlessly integrated into the booking and payment flow with security protections:
1. **Booking Creation**: Optional coupon code validated and applied during booking creation; coupon discount calculated and usage recorded atomically
2. **Payment Processing**: Credits applied first (respecting max percentage limit), then wallet balance, then gateway payment; triple-layer validation prevents negative amount exploitation
3. **Discount Order**: Base price → Package discount → Subscription discount → Referral discount → Coupon discount → VAT → Final amount
4. **Security**: All amount inputs validated as positive; credit deductions use atomic transactions; balance calculations prevent race conditions

### System Design Choices

The database schema separates single-service pricing (`serviceTiers`) from multi-service bundles (`subscriptionPackages`), linked by a `subscriptionPackageServices` junction table. This enables distinct booking flows. File uploads use presigned URLs for secure direct uploads to Replit Object Storage (Google Cloud Storage), with robust security features and dual-mode authentication. API documentation is comprehensive and interactive, distinguishing between public (snake_case, localized) and admin (camelCase, bilingual objects) endpoint responses.

## API Documentation

**Customer API Documentation (v2.1 - November 2025)**: Complete guide located at `docs/CUSTOMER_API.md` covering all customer-facing endpoints including authentication (registration, login, OTP verification, password reset, **password change**), profile management (**notification settings**), service discovery, booking & scheduling (**edit bookings**), order tracking, payments & wallet (**wallet top-up, payment history**), subscriptions (**active subscriptions, cancel subscription with prorated refunds**), referrals & rewards (**shareable referral links with QR codes**), support tickets (**file upload attachments**), and **app configuration** (maintenance status, version management, feature toggles). Features snake_case naming, localized responses, comprehensive examples, rate limiting details, and best practices for mobile/web integration.

**Admin API Documentation**: Comprehensive guide located at `docs/ADMIN_API.md` covering all admin endpoints including users management, roles & permissions, customers, technicians, bookings, quotations, payments, support tickets, services, subscription packages, promos & referrals, mobile content, and analytics. Includes request/response examples, error handling, and best practices.

**Technician API Documentation**: Comprehensive guide located at `docs/TECHNICIAN_API.md` covering all technician endpoints including profile management, bookings & orders, performance metrics, quotations, and availability settings. Includes request/response examples, error handling, and best practices.

**WebSocket API Documentation**: Real-time communication guide located at `docs/WEBSOCKET_API.md` for live order updates and notifications.

## External Dependencies

**Payment Gateways:**
- **Moyasar**: Cards, mada, Apple Pay.
- **Tabby**: Buy Now Pay Later (BNPL).

**Communication Services:**
- **Twilio**: SMS for OTP and notifications.
- **Nodemailer**: Email for receipts.
- **Expo Push Notifications**: Mobile push notifications.

**Infrastructure Services:**
- **Redis**: Session management, rate limiting, OTP storage, webhook deduplication.
- **Neon Database (PostgreSQL)**: Primary data store.
- **Replit Object Storage**: File uploads (via Google Cloud Storage).

**Utilities:**
- **PDFKit**: Invoice/report generation.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT handling.
- **Zod**: Schema validation.
- **Axios**: HTTP client.