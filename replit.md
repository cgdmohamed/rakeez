# Rakeez - Bilingual Cleaning Services API

## Overview
Rakeez is a Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. It facilitates booking and managing cleaning and maintenance services, processing payments, tracking orders, and managing interactions between customers, technicians, and administrators. The system includes features such as quotation management, wallet systems, referral rewards, and multi-role access, aiming to provide a comprehensive solution for service management.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (October 2025)
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

### File Upload System
The system integrates with Replit Object Storage (Google Cloud Storage) for file uploads, such as brand logos and avatars. The frontend requests presigned URLs from a backend endpoint, then uploads files directly to GCS. Security is enforced through ACL policies, presigned URL expiration, and requiring authentication for URL generation.

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