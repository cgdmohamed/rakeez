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
- Component-based architecture
- Path aliases
- Centralized query client with error handling
- Bilingual UI support
- Role-based dashboard interfaces (Admin, Technician)
- Professional brand identity system with CSS utility classes (badge-*, table-header-primary, numeric-cell)
- Enterprise-grade UI/UX with consistent visual hierarchy and color semantics

**Dashboard Interfaces:**
- **Admin Dashboard**: Comprehensive management portal (bookings, quotations, payments, users, analytics) with professional brand identity.
  - **Professional Styling**: All pages feature consistent Rakeez brand colors (Dark Blue #00269A, Cyan #6bdad5, Green #45d492).
  - **Enhanced Tables**: Alternating row colors (white/light gray), bold primary-colored headers, right-aligned numeric columns with monospace font.
  - **Brand Badges**: Color-coded status indicators (Orange=Pending, Blue=Confirmed/Open, Cyan=In Progress, Green=Completed/Paid, Red=Cancelled/Failed).
  - **Typography Hierarchy**: Page titles in primary brand color, consistent font sizes, professional spacing.
- **Technician Dashboard**: Job-focused interface (assigned jobs, status updates, uploads, real-time chat).
- **Authentication**: Unified login with role-based routing and JWT token management.

### Backend Architecture

**Core Framework:**
- Express.js with TypeScript
- Modular controller-service architecture
- Middleware for authentication, validation, and rate limiting

**Authentication & Authorization:**
- JWT-based (access and refresh tokens)
- Role-based access control (customer, technician, admin)
- OTP verification via Twilio
- Session management with Redis or in-memory fallback

**Business Logic Organization:**
- Dedicated controllers for Auth, Bookings, Orders, Payments, Profile, Services, Support, Notifications, and Webhooks.

### Database Design

**Technology:**
- PostgreSQL via Neon Database
- Drizzle ORM
- Schema in `shared/schema.ts`

**Core Tables:**
- `users`, `addresses`, `service_categories`, `services`, `service_packages`, `spare_parts`, `bookings`, `quotations`, `quotation_spare_parts`, `payments`, `wallets`, `wallet_transactions`, `referrals`, `notifications`, `support_tickets`, `support_messages`, `reviews`, `promotions`, `audit_logs`, `webhook_events`, `order_status_logs`.

**Key Design Patterns:**
- JSONB for bilingual content
- Enum types for constrained values
- Soft delete pattern
- Timestamp tracking

## External Dependencies

**Payment Gateways:**
- **Moyasar**: Cards, mada, Apple Pay.
- **Tabby**: Buy Now Pay Later (BNPL).

**Communication Services:**
- **Twilio**: SMS for OTP and notifications.
- **Nodemailer**: Email for receipts.
- **Expo Push Notifications**: Mobile push notifications.

**Infrastructure Services:**
- **Redis (Optional)**: Session management, rate limiting, OTP storage, webhook deduplication (with in-memory fallback).
- **Neon Database (PostgreSQL)**: Primary data store.

**Utilities:**
- **PDFKit**: Invoice/report generation.
- **bcrypt**: Password hashing.
- **jsonwebtoken**: JWT handling.
- **Zod**: Schema validation.
- **Axios**: HTTP client.