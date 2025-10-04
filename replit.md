# Rakeez - Bilingual Cleaning Services API

## Overview

Rakeez is a Node.js + Express RESTful API backend for a bilingual (Arabic/English) cleaning services mobile application. It enables customers to book cleaning and maintenance services, manage appointments, process payments via multiple gateways (Moyasar, Tabby), track orders, and interact with technicians. The system supports a full booking workflow including quotations, wallet management, referral rewards, and multi-role access for customers, technicians, and admins.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### User & Roles Management System (October 4, 2025)
Implemented comprehensive user management system with role-based permissions:

**Database Schema:**
- Extended userRoleEnum with new roles: 'support' and 'finance' (in addition to existing admin, technician, customer)
- Added userStatusEnum: 'active', 'inactive', 'suspended'
- Added 'status' field to users table (defaults to 'active')
- Added 'lastLogin' timestamp field to track user login activity
- Migrated database schema using db:push --force

**Backend API Endpoints:**
- GET /api/v2/admin/users - List all internal users with optional role/status filters
- GET /api/v2/admin/users/:id - Get user by ID
- POST /api/v2/admin/users - Create new internal user (admin only)
- PUT /api/v2/admin/users/:id - Update user information (admin only)
- PATCH /api/v2/admin/users/:id/status - Update user status (admin only)
- DELETE /api/v2/admin/users/:id - Delete user (admin only, with self-deletion prevention)
- All endpoints include proper Zod validation and audit logging

**Storage Layer:**
- getAllUsers(role?, status?) - List users with optional filters
- getInternalUsers(status?) - List only internal users (admin, technician, support, finance)
- updateUserStatus(id, status) - Update user status
- updateUserLastLogin(id) - Update last login timestamp
- deleteUser(id) - Delete user

**Permissions System (shared/permissions.ts):**
- Defined 5 user roles: admin, finance, support, technician, customer
- Comprehensive permission structure covering:
  - User management (view, create, edit, delete)
  - Customer management (view, edit, delete)
  - Bookings/Orders (view, create, edit, delete, assign)
  - Financial operations (view, process, refund, viewAll, reports)
  - Support operations (view, respond, close)
  - Services management (view, create, edit, delete)
  - Analytics (view, export)
  - Technician management (view, create, edit, delete)
- Helper functions: hasPermission, hasAnyPermission, hasAllPermissions
- Role labels in English and Arabic

**Frontend UI (client/src/pages/admin/users.tsx):**
- Professional Users Management page with Rakeez brand styling
- Table displaying: name, email/phone, role, status, last login, created date
- Role and status filters for easy navigation
- Create user dialog with full validation
- Edit user dialog with optional password update
- Status dropdown for quick status changes (active/inactive/suspended)
- Delete confirmation dialog with safety checks
- All mutations trigger immediate table updates via React Query cache invalidation
- Comprehensive data-testid attributes for testing
- Color-coded role badges (Admin=Blue, Finance=Green, Support=Cyan, Technician=Orange)
- Status badges using existing badge system (Active=Green, Inactive=Red, Suspended=Orange)

**Navigation Integration:**
- Added "Users" navigation item to admin sidebar with UserCog icon
- Registered /admin/users route in AdminDashboard
- Accessible only to admin users via authorizeRoles middleware

### Customer Profile UI Integration & Layout Unification (October 4, 2025)
Completed comprehensive integration of Customer Profile page with unified admin dashboard layout and design system:

**Layout Structure:**
- Customer Profile now renders INSIDE AdminDashboard component (with sidebar, navigation)
- Routes registered at AdminDashboard level (/admin/customers/:id/overview and /admin/customers/:id)
- Consistent padding/margins matching other admin pages (container mx-auto p-6 lg:p-8)
- Full navigation flow: Customers List → Profile → Tabs → Back to Customers

**Design Unification:**
- Card styling: Uses card-accent-blue, card-accent-cyan, card-accent-green classes with shadow-sm
- Typography: Page titles use text-3xl font-bold text-primary
- Brand badges: badge-pending (Orange), badge-confirmed (Blue), badge-in-progress (Cyan), badge-completed (Green), badge-cancelled (Red)
- Professional tables: table-header-primary headers, alternating row colors, numeric-cell for right-aligned numbers
- Empty states: Icons with graceful "No data found" messages for all tabs

**Backend Data Connections:**
- Fixed getCustomerOverview() in storage.ts to return comprehensive aggregated data
- Orders tab: Pulls from bookings with service names, dates, amounts, status
- Payments tab: Connected to payments history with method, amount, status
- Support Tickets tab: Displays subject, priority, status, creation date
- Reviews tab: Shows service name, technician, rating, comments
- Stats calculation: totalBookings, completedBookings, totalSpent, averageRating, walletBalance, walletEarned, walletSpent

**Enhanced UX:**
- Professional Skeleton loaders during data fetching
- Comprehensive error states with icons and clear messaging
- Wallet top-up functionality with dialog form
- Consistent SAR currency formatting across all monetary displays
- All tabs handle empty states gracefully

**Routing Architecture:**
- App.tsx: Top-level routes (/login, /admin/:rest*, /technician/:rest*)
- AdminDashboard.tsx: Internal admin routes with layout wrapper
- Customer Profile accessed via admin dashboard ensures unified experience

### Instant Table Updates After Mutations (October 4, 2025)
Fixed issue where tables only updated after full page refresh by implementing comprehensive cache-busting:

**Query Client Configuration:**
- Changed `staleTime` from `Infinity` to `0` to ensure queries are immediately considered stale
- Enables React Query's `invalidateQueries` to trigger immediate refetches

**Cache-Busting Implementation:**
- Added HTTP headers to all fetch requests: `Cache-Control: no-cache, no-store, must-revalidate` and `Pragma: no-cache`
- Added fetch API option: `cache: "no-store"`
- Prevents browser and service worker caching from serving stale data

**Result:**
- All admin tables (brands, spare parts, services, customers, technicians, etc.) now update instantly after add/edit/delete operations
- No manual page refresh required
- All existing `invalidateQueries` calls now work properly

### Analytics Dashboard with Real-Time Charts (October 4, 2025)
Implemented comprehensive analytics dashboard with live data visualization:

**Backend Enhancements:**
- Added `getMonthlyRevenueStats()` and `getMonthlyBookingStats()` functions to aggregate monthly data
- Updated analytics endpoint to return camelCase response structure
- All fields now use camelCase naming convention for consistency

**Frontend Visualizations:**
- Revenue Trend chart (Bar Chart) showing last 6 months from database
- Bookings Trend chart (Line Chart) showing last 6 months from database  
- Revenue by Payment Method (Pie Chart) with real distribution data
- Orders by Status (Pie Chart) with real order counts
- All charts include proper empty state handling
- KPI cards display real-time metrics from database

**API Response Structure:**
```json
{
  "orderStats": { totalOrders, totalRevenue, completedOrders, cancelledOrders, pendingOrders, inProgressOrders },
  "revenueStats": { totalRevenue, revenueByPaymentMethod: { wallet, moyasar, tabby } },
  "monthlyRevenue": [{ month, revenue }],
  "monthlyBookings": [{ month, bookings }]
}
```

### Dashboard Light Theme Transformation (October 4, 2025)
Completed comprehensive redesign of the admin dashboard from dark theme to modern, professional light theme:

**Color Scheme:**
- Primary background: Light gray (hsl(0 0% 98%))
- Cards: Pure white with subtle shadows
- Sidebar: White background with Dark Blue (#00269A) text and icons
- Active navigation: Cyan (#6BDAD5) background with white text
- Hover states: Light cyan background with Dark Blue text

**Typography:**
- All page titles: Dark Blue (text-primary) for consistent brand identity
- Card titles: Brand colors (primary/secondary/accent) for visual hierarchy
- Body text: Neutral dark gray for readability
- Links: Cyan (secondary) for clear call-to-action

**Components:**
- Buttons: Primary (Dark Blue) with Cyan hover states
- Badges: Orange (Pending), Blue (Confirmed), Cyan (In Progress), Green (Completed), Red (Cancelled)
- Cards: White backgrounds with brand-colored accent borders (left border)
- Tables: Bold Dark Blue headers, alternating row colors, right-aligned numeric columns

**Accessibility:**
- All color combinations meet WCAG AA standards
- Sidebar contrast: ~9.9:1 (Dark Blue on white)
- Button hover contrast: ~6.6:1 (Dark Blue on cyan)
- High readability with proper opacity levels (70-90%)

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