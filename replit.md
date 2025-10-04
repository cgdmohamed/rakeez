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

**Utilities:**
- **PDFKit**: Invoice/report generation.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT handling.
- **Zod**: Schema validation.
- **Axios**: HTTP client.