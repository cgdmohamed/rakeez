# CleanServe - Bilingual Cleaning Services API

## Overview

CleanServe is a comprehensive Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. The platform enables customers to book various cleaning and maintenance services, manage appointments, process payments through multiple gateways (Moyasar, Tabby), track orders in real-time, and engage with technicians. The system supports a complete booking workflow including quotations for spare parts, wallet management, referral rewards, and multi-role access (customers, technicians, admins).

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Backend Architecture

**Core Framework:**
- Express.js server with TypeScript
- Modular controller-service architecture separating business logic from HTTP handling
- Controllers in `server/controllers/` handle HTTP requests/responses
- Services in `server/services/` encapsulate business logic and external integrations
- Middleware pattern for authentication, validation, and rate limiting

**Authentication & Authorization:**
- JWT-based authentication with access and refresh tokens
- Token blacklisting via Redis for logout functionality
- Role-based access control (customer, technician, admin)
- OTP verification for registration and password reset via Twilio

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
- **Redis**: Session management, rate limiting, OTP storage, webhook deduplication
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