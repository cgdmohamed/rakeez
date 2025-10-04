# Rakeez - Bilingual Cleaning Services API

## Overview

Rakeez is a comprehensive Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. The platform enables customers to book various cleaning and maintenance services, manage appointments, process payments through multiple gateways (Moyasar, Tabby), track orders in real-time, and engage with technicians. The system supports a complete booking workflow including quotations for spare parts, wallet management, referral rewards, and multi-role access (customers, technicians, admins).

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (October 4, 2025)

**Complete Admin Dashboard Implementation:**
- Added all missing admin modules to complete the admin dashboard per system design
- Implemented Wallets, Notifications, Support, and Services/Pricing pages
- All pages include proper table views, filtering, and management actions

**New Backend API Endpoints:**
- `/api/v2/admin/wallets` - GET all wallets with user info and balance details
- `/api/v2/admin/wallets/:userId/transactions` - GET wallet transaction history
- `/api/v2/admin/quotations` - GET all quotations with filtering by status
- `/api/v2/admin/quotations/:id` - PUT update quotation status (approved/rejected/pending)
- `/api/v2/admin/notifications` - GET all notifications sent to users
- `/api/v2/admin/notifications/send` - POST broadcast notifications to users by role
- `/api/v2/admin/support/tickets` - GET all support tickets with filtering
- `/api/v2/admin/support/tickets/:id` - PUT update ticket status and priority
- `/api/v2/admin/support/tickets/:id/messages` - GET support ticket messages
- `/api/v2/admin/services` - GET all services with categories and pricing packages

**New Storage Methods:**
- `getAllWallets()` - Retrieves all user wallets with user information joined
- `getAllQuotations()` - Gets quotations with technician details
- `getAllNotifications()` - Fetches notifications with user information
- `getAllSupportTickets()` - Gets support tickets with filtering options
- `getSupportMessages()` - Retrieves messages for a specific ticket

**New Admin UI Pages:**
- **Wallets** (`/admin/wallets`): View all user wallets with balance, earned, and spent totals
- **Notifications** (`/admin/notifications`): List all notifications with "Send Notification" dialog for broadcasting messages
- **Support** (`/admin/support`): Manage support tickets with status updates and priority badges
- **Services** (`/admin/services`): Display service catalog organized by categories with pricing and packages

**Navigation Updates:**
- Added 4 new sidebar navigation items with icons (Wallet, Bell, MessageSquare, Settings)
- Updated routing to include all new admin pages
- Maintained consistent navigation patterns across all admin modules

**Seed Script Enhancements:**
- Added 6 wallet transactions (credit/debit) for demo customers
- Added 9 notifications across 3 customers (booking, payment, promotional types)
- Added 3 support tickets with varied priorities (high, medium, low) and statuses
- Added 6 support messages demonstrating customer-admin conversations
- All demo data properly linked with realistic bilingual content

**Critical Bug Fixes:**
- Fixed ".toFixed is not a function" runtime errors across admin dashboard by converting PostgreSQL numeric/decimal strings to JavaScript numbers
- Added security patch to strip sensitive fields (password, resetToken, otpCode, deviceToken) from admin API responses

**User Management Implementation:**
- Implemented complete CRUD UI for technicians management with create/edit dialogs
- Implemented complete CRUD UI for customers management with create/edit dialogs
- Forms include: name, email, phone, password (required on create, optional on edit), language preference, verification status toggle
- Integrated with backend POST /api/v2/admin/users and PUT /api/v2/admin/users/:id endpoints
- Added proper validation, loading states, toast notifications, and cache invalidation
- All dialogs use Shadcn/ui components following design_guidelines.md patterns

**Backend Data Type Fixes:**
- Updated storage.ts getUsersByRole to convert PostgreSQL string values to numbers
- Updated routes.ts analytics endpoint to return proper numeric types
- Frontend now uses Number() wrapper for all numeric displays: (Number(value) || 0).toFixed(2)

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching
- Shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens

**Design Decisions:**
- Component-based architecture with reusable UI components in `client/src/components/ui/`
- Path aliases configured for clean imports (`@/`, `@shared/`, `@assets/`)
- Centralized query client configuration with custom error handling for 404s and unauthorized requests
- Bilingual support baked into the UI layer
- Role-based dashboard interfaces for Admin and Technician portals

**Dashboard Interfaces:**
- **Admin Dashboard** (`/admin/*`): Complete management portal with sidebar navigation
  - Overview: Revenue stats, order metrics, payment method breakdown
  - Bookings: View and manage all bookings with status filtering and updates
  - Quotations: Track quotations with amounts, VAT, and approval status
  - Payments: Monitor payment transactions across all gateways
  - Customers: Manage customer accounts and verification status
  - Technicians: Track technician performance, ratings, and assignments
  - Analytics: View performance metrics with CSV/Excel export capabilities

- **Technician Dashboard** (`/technician/*`): Job-focused interface for field technicians
  - Overview: Personal stats showing pending, in-progress, and completed jobs
  - My Bookings: View assigned jobs with customer details and navigation info
  - Status Updates: Update job status (confirmed, en route, in progress, completed)
  - Uploads: Upload invoices (PDF) and spare part images for bookings
  - Real-time Chat: WebSocket-based chat with customers for job coordination
  - WebSocket URL auto-detects from page protocol (wss:// for https://, ws:// for http://)

- **Authentication**: Unified login page (`/login`) with role-based routing
  - Detects user role (admin/technician) and redirects to appropriate dashboard
  - JWT token storage and session management
  - Demo credentials: admin@rakeez.sa/admin123, tech@rakeez.sa/tech123

### Backend Architecture

**Core Framework:**
- Express.js server with TypeScript
- Modular controller-service architecture separating business logic from HTTP handling
- Controllers in `server/controllers/` handle HTTP requests/responses
- Services in `server/services/` encapsulate business logic and external integrations
- Middleware pattern for authentication, validation, and rate limiting

**Authentication & Authorization:**
- JWT-based authentication with access and refresh tokens
- Session management: Access tokens stored at `session:${userId}`, refresh tokens at `refresh:${userId}`
- Token blacklisting with Redis or in-memory fallback for logout functionality
- Role-based access control (customer, technician, admin)
- OTP verification for registration and password reset via Twilio
- Auth middleware validates sessions without requiring Redis in production

**Business Logic Organization:**
- AuthController: User registration, login, OTP verification, password reset
- BookingsController: Service booking, quotation management, available time slots
- OrdersController: Order tracking, status updates, review management, invoice generation
- PaymentsController: Multi-gateway payment processing (wallet, Moyasar, Tabby)
- ProfileController: User profile and address management
- ServicesController: Service catalog with bilingual content
- SupportController: Ticket-based customer support with chat
- NotificationsController: Push notification delivery and history
- WebhooksController: Payment gateway webhook handlers with signature verification

### Database Design

**Technology:**
- PostgreSQL via Neon Database (serverless)
- Drizzle ORM for type-safe database queries
- Schema defined in `shared/schema.ts` with enums and relations

**Core Tables:**
- `users`: User accounts with role, language preference, and verification status
- `addresses`: Multiple addresses per user for service delivery
- `service_categories`, `services`, `service_packages`: Service catalog with pricing and VAT
- `spare_parts`: Product catalog for quotations
- `bookings`: Service appointments with status tracking
- `quotations`, `quotation_spare_parts`: Dynamic pricing for additional parts
- `payments`: Payment transaction records with gateway details
- `wallets`, `wallet_transactions`: Internal wallet system for credits and referrals
- `referrals`: User referral program with reward tracking
- `notifications`: Push notification history
- `support_tickets`, `support_messages`: Customer support system
- `reviews`: Service and technician ratings
- `promotions`: Marketing campaigns and offers
- `audit_logs`: Comprehensive activity tracking
- `webhook_events`: Payment gateway event processing
- `order_status_logs`: Order lifecycle tracking

**Key Design Patterns:**
- JSONB columns for bilingual content (name, description in both Arabic and English)
- Enum types for constrained values (order status, payment status, user roles)
- Soft delete pattern using status fields rather than physical deletion
- Timestamp tracking (createdAt, updatedAt) on all entities

### External Dependencies

**Payment Gateways:**
- **Moyasar**: Primary payment processor supporting cards, mada, and Apple Pay with webhook signature verification
- **Tabby**: Buy Now Pay Later (BNPL) integration for installment payments

**Communication Services:**
- **Twilio**: SMS delivery for OTP codes and notifications
- **Nodemailer**: Email delivery for receipts and notifications
- **Expo Push Notifications**: Mobile push notifications via FCM/APNS

**Infrastructure Services:**
- **Redis (Optional)**: Session management, rate limiting, OTP storage, webhook deduplication
  - Fully optional with automatic in-memory fallback when unavailable
  - Production-safe TTL-aware in-memory implementation for all operations
  - No Redis dependency required for core auth/booking workflows
- **Neon Database (PostgreSQL)**: Primary data store with connection pooling

**Utilities:**
- **PDFKit**: Server-side invoice and report generation
- **bcrypt**: Password hashing with salt rounds
- **jsonwebtoken**: JWT token generation and verification
- **Zod**: Runtime schema validation for API requests
- **Axios**: HTTP client for external API calls

**Development Tools:**
- **Drizzle Kit**: Database schema migrations
- **tsx**: TypeScript execution for development
- **esbuild**: Production bundling for server code

**Design Philosophy:**
- Payment gateway abstraction allows adding new providers without core changes
- Bilingual support throughout with language-aware message routing
- Webhook processing with idempotency to prevent duplicate events
- Worker queues for asynchronous notification and webhook processing
- Comprehensive audit logging for security and compliance
- Rate limiting at multiple layers (registration, login, API calls)
- Redis-optional architecture: Full in-memory fallback with TTL-aware counters for sessions, rate limits, OTP, and cache operations
- WebSocket auto-detection: Automatically uses secure wss:// for HTTPS and ws:// for HTTP