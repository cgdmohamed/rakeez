# Rakeez - Bilingual Cleaning Services API

## Overview
Rakeez is a Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. It manages booking, tracking, and payment for cleaning and maintenance services, facilitating interaction between customers, technicians, and administrators. Key features include quotation management, a wallet system, referral rewards, and multi-role access, positioning it as a comprehensive solution with high market potential.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, featuring a component-based, bilingual UI with role-based dashboards (Admin, Technicians), a professional light design, and centralized query client with error handling. Admin and Technician dashboards provide comprehensive management capabilities. The Admin dashboard features an organized, collapsible group-based navigation with visual hierarchy. The Technician dashboard includes self-service features for profile management, password management, performance & earnings display, quotation management, and availability settings.

### Technical Implementations
The backend is built with Express.js and TypeScript, following a modular controller-service architecture. It uses JWT for authentication and authorization with role-based access control and OTP verification via Twilio Verify API. The Twilio integration employs a dual-API strategy: Verify API for OTP delivery (automatic generation, international support, built-in rate limiting) and Messages API for general notifications. Phone OTPs are managed entirely by Twilio Verify with no Redis storage required, while email OTPs use manual generation with Redis caching. Password management includes secure change functionality with strong validation, rate limiting, and audit logging. Authentication features a global 401 error handler, unified login, password reset flow, and session protection. An API FAQ page (`/api-faq`) provides comprehensive documentation on integration issues, CORS solutions, authentication, rate limiting, production checklists, and WebSocket setup. All error responses use structured bilingual messages. The project utilizes PostgreSQL via Neon Database with Drizzle ORM, employing JSONB for bilingual content, enum types, soft deletes, and timestamp tracking.

### Feature Specifications
- **Booking Management System**: Complete administrative control over bookings, including status updates, technician assignment, cancellation, and refunds, supporting a workflow from `pending` to `completed`.
- **Smart Technician Assignment System**: Intelligent automatic assignment based on weighted criteria: Distance, Workload, Availability, Skills, and Performance, with audit logging.
- **Technician Profile System**: A 360-degree technician management interface within the Admin Dashboard, covering Overview, Performance, Availability, Assignments, and Certifications & Skills.
- **Referral and Promo System**: Enables creation and management of referral campaigns, tracking referrals, applying discounts, and distributing rewards.
- **Mobile Content Management System**: Manages mobile app homepage content (sliders, banners) with bilingual titles and links, using secure file uploads to Replit Object Storage.
- **Subscription Management System**: Allows customers to purchase service packages and administrators to manage subscriptions, including CRUD for packages, service inclusions, and integration into the booking process.
- **Marketing & Loyalty System**: A comprehensive promotional platform with coupon codes, credit-based rewards, and automated loyalty incentives. This includes coupon creation with flexible discount types and validation, a virtual credit system with expiration management and usage limits, and automated rewards for events like registration, first booking, and referrals. Admin-configurable loyalty settings control the rewards ecosystem. This system integrates seamlessly into the booking and payment flow, with security measures for discount application and transaction processing. Analytics and reporting features provide insights into campaign performance, coupon redemptions, credit metrics, and loyalty program effectiveness.

### System Design Choices
The database schema separates single-service pricing from multi-service bundles, linked by a junction table. File uploads use presigned URLs for secure direct uploads to Replit Object Storage (Google Cloud Storage) with dual-mode authentication. API documentation is comprehensive and interactive, distinguishing between public (snake_case, localized) and admin (camelCase, bilingual objects) endpoint responses.

## External Dependencies

**Payment Gateways:**
- Moyasar (Cards, mada, Apple Pay)
- Tabby (Buy Now Pay Later)

**Communication Services:**
- Twilio (SMS for OTP and notifications) - Configured via Replit Twilio Connector with API key authentication
- Nodemailer (Email for receipts)
- Expo Push Notifications (Mobile push notifications)

**Infrastructure Services:**
- Redis (Session management, rate limiting, OTP storage, webhook deduplication)
- Neon Database (PostgreSQL)
- Replit Object Storage (via Google Cloud Storage)

**Utilities:**
- PDFKit (Invoice/report generation)
- bcrypt (Password hashing)
- jsonwebtoken (JWT handling)
- Zod (Schema validation)
- Axios (HTTP client)