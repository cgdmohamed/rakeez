# Rakeez - Bilingual Cleaning Services API

## Overview
Rakeez is a Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. It facilitates booking, managing, and tracking cleaning and maintenance services, processing payments, and interaction between customers, technicians, and administrators. The platform includes features such as quotation management, a wallet system, referral rewards, and multi-role access, aiming to provide a comprehensive solution for service management with high market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, featuring a component-based, bilingual UI with role-based dashboards (Admin, Technicians), a professional light design, and centralized query client with error handling. Admin and Technician dashboards provide comprehensive management capabilities.

**Technician Dashboard Self-Service Features (October 2025):**
- **Profile Management**: Technicians can view and edit their personal information (name in English and Arabic)
- **Password Management**: Secure password change functionality with strong validation requirements (8+ characters, uppercase, lowercase, numbers, special characters)
- **Performance & Earnings**: Comprehensive dashboard showing total jobs, completion rate, average rating, revenue, and monthly statistics with data visualization charts
- **Quotations Management**: View and filter all created quotations by status (pending, approved, rejected) with detailed breakdowns
- **Availability Settings**: Configure working hours, service radius, maximum daily bookings, home location, and real-time availability status

### Technical Implementations
The backend is built with Express.js and TypeScript, following a modular controller-service architecture. It uses JWT for authentication and authorization with role-based access control and OTP verification via Twilio. Password management includes secure change functionality available to all authenticated users (customers, technicians, and admins) with strong validation via passwordSchema (minimum 8 characters, uppercase, lowercase, numbers, special characters), rate limiting (5 attempts per 15 minutes), and audit logging. All error responses use structured bilingual messages. The project utilizes PostgreSQL via Neon Database with Drizzle ORM, employing JSONB for bilingual content, enum types, soft deletes, and timestamp tracking.

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

### System Design Choices

The database schema separates single-service pricing (`serviceTiers`) from multi-service bundles (`subscriptionPackages`), linked by a `subscriptionPackageServices` junction table. This enables distinct booking flows. File uploads use presigned URLs for secure direct uploads to Replit Object Storage (Google Cloud Storage), with robust security features and dual-mode authentication. API documentation is comprehensive and interactive, distinguishing between public (snake_case, localized) and admin (camelCase, bilingual objects) endpoint responses.

## API Documentation

**Technician API Documentation**: Comprehensive guide located at `docs/TECHNICIAN_API.md` covering all technician endpoints including profile management, bookings & orders, performance metrics, quotations, and availability settings. Includes request/response examples, error handling, and best practices.

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