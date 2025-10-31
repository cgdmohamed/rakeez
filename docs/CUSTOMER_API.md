# Customer API Documentation

## Table of Contents
- [Introduction](#introduction)
- [Base URL & Conventions](#base-url--conventions)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Account Management](#account-management)
- [Profile & Addresses](#profile--addresses)
- [Service Discovery](#service-discovery)
- [Booking & Scheduling](#booking--scheduling)
- [Orders & Tracking](#orders--tracking)
- [Payments & Wallet](#payments--wallet)
- [Subscriptions](#subscriptions)
- [Referrals & Rewards](#referrals--rewards)
- [Support & Help](#support--help)

---

## Introduction

The Rakeez Customer API provides a RESTful interface for mobile and web applications to integrate cleaning and maintenance service booking capabilities. This API is designed for customer-facing applications and follows industry best practices for security, performance, and usability.

### Key Features
- **Bilingual Support**: All responses support Arabic and English
- **Real-time Updates**: WebSocket support for live order tracking
- **Secure Authentication**: JWT-based authentication with refresh tokens
- **Payment Integration**: Moyasar (cards, mada, Apple Pay) and Tabby (BNPL)
- **Flexible Booking**: Single services or subscription packages
- **Wallet System**: Store credit for quick payments

---

## Base URL & Conventions

### Production
```
https://api.rakeez.sa
```

### Development/Staging
```
https://staging-api.rakeez.sa
```

### Response Format
All API responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "message_ar": "تمت العملية بنجاح",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error description in English",
  "message_ar": "وصف الخطأ بالعربية",
  "errors": [ ... ] // Optional validation errors
}
```

### Naming Conventions
- **Customer API**: Uses `snake_case` for all field names
- **Localization**: Single localized string per field based on `Accept-Language` header
- **Dates**: ISO 8601 format (e.g., `2025-10-31T10:30:00.000Z`)
- **IDs**: UUID format (e.g., `550e8400-e29b-41d4-a716-446655440000`)

---

## Authentication

### Registration

Register a new customer account.

**Endpoint:** `POST /api/v2/auth/register`

**Request Headers:**
```http
Content-Type: application/json
Accept-Language: en | ar (optional, defaults to 'en')
```

**Request Body:**
```json
{
  "name": "Ahmed Ali",
  "name_ar": "أحمد علي",
  "email": "ahmed@example.com",
  "phone": "+966501234567",
  "password": "SecurePass123!",
  "language": "ar",
  "device_token": "ExponentPushToken[...]"
}
```

**Validation Rules:**
- `name`: Required, minimum 2 characters
- `name_ar`: Optional, Arabic name
- `email`: Optional but recommended, valid email format
- `phone`: Required if email not provided, Saudi format (+966XXXXXXXXX)
- `password`: Required, minimum 6 characters
- `language`: Optional, `en` or `ar` (defaults to `en`)
- `device_token`: Optional, Expo push notification token

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your account.",
  "message_ar": "تم التسجيل بنجاح. يرجى التحقق من حسابك.",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "requires_verification": true,
    "verification_method": "phone",
    "otp_sent": true
  }
}
```

**Rate Limit:** 3 requests per hour per identifier

---

### Login

Authenticate and receive access tokens.

**Endpoint:** `POST /api/v2/auth/login`

**Request Headers:**
```http
Content-Type: application/json
Accept-Language: en | ar (optional)
```

**Request Body:**
```json
{
  "identifier": "+966501234567",
  "password": "SecurePass123!",
  "language": "ar"
}
```

**Parameters:**
- `identifier`: Email or phone number
- `password`: User's password
- `language`: Optional, preferred language

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "message_ar": "تم تسجيل الدخول بنجاح",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Ahmed Ali",
      "name_ar": "أحمد علي",
      "email": "ahmed@example.com",
      "phone": "+966501234567",
      "role": "customer",
      "language": "ar",
      "is_verified": true
    }
  }
}
```

**Error Response (403 Forbidden - Unverified Account):**
```json
{
  "success": false,
  "message": "Account not verified. Please verify your account with OTP.",
  "message_ar": "الحساب غير موثق. يرجى التحقق من حسابك باستخدام رمز OTP.",
  "requires_verification": true,
  "verification_method": "phone"
}
```

**Rate Limit:** 5 requests per 15 minutes per identifier

---

### Verify OTP

Verify account using OTP code.

**Endpoint:** `POST /api/v2/auth/verify-otp`

**Request Body:**
```json
{
  "identifier": "+966501234567",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Account verified successfully",
  "message_ar": "تم التحقق من الحساب بنجاح",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Ahmed Ali",
      "is_verified": true
    }
  }
}
```

**Error Codes:**
- `400`: Invalid OTP or OTP expired
- `429`: Max attempts exceeded (3 attempts)

---

### Resend OTP

Request a new OTP code.

**Endpoint:** `POST /api/v2/auth/resend-otp`

**Request Body:**
```json
{
  "identifier": "+966501234567"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "message_ar": "تم إرسال رمز التحقق بنجاح",
  "data": {
    "sent_via": "sms",
    "expires_in": 300
  }
}
```

**Rate Limit:** 3 OTP requests per hour per identifier

---

### Forgot Password

Initiate password reset process.

**Endpoint:** `POST /api/v2/auth/forgot-password`

**Request Body:**
```json
{
  "identifier": "ahmed@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset instructions sent",
  "message_ar": "تم إرسال تعليمات إعادة تعيين كلمة المرور",
  "data": {
    "sent_via": "email",
    "expires_in": 3600
  }
}
```

---

### Reset Password

Complete password reset with token.

**Endpoint:** `POST /api/v2/auth/reset-password`

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "message_ar": "تم إعادة تعيين كلمة المرور بنجاح"
}
```

---

### Refresh Token

Obtain new access token using refresh token.

**Endpoint:** `POST /api/v2/auth/refresh-token`

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

---

### Logout

Invalidate current session tokens.

**Endpoint:** `POST /api/v2/auth/logout`

**Request Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully",
  "message_ar": "تم تسجيل الخروج بنجاح"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions or unverified account |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Messages

**Validation Error (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "message_ar": "فشل التحقق من البيانات",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "message_ar": "صيغة البريد الإلكتروني غير صحيحة"
    }
  ]
}
```

**Authentication Error (401):**
```json
{
  "success": false,
  "message": "Invalid or expired token",
  "message_ar": "الرمز غير صالح أو منتهي الصلاحية"
}
```

**Rate Limit Error (429):**
```json
{
  "success": false,
  "message": "Too many requests. Please try again later.",
  "message_ar": "عدد كبير جداً من الطلبات. يرجى المحاولة لاحقاً.",
  "reset_time": "2025-10-31T11:00:00.000Z"
}
```

---

## Rate Limiting

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1730390400
```

### Endpoint-Specific Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Registration | 3 requests | 1 hour |
| Login | 5 requests | 15 minutes |
| OTP Requests | 3 requests | 1 hour |
| Create Booking | 10 requests | 1 hour |
| General API | 100 requests | 1 minute |

### Best Practices

1. **Implement exponential backoff** when receiving 429 responses
2. **Cache responses** where appropriate (service lists, categories)
3. **Monitor rate limit headers** and throttle requests proactively
4. **Use WebSocket** for real-time updates instead of polling

---

## Profile & Addresses

### Get Profile

Retrieve authenticated user's profile.

**Endpoint:** `GET /api/v2/profile`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Ahmed Ali",
    "name_ar": "أحمد علي",
    "email": "ahmed@example.com",
    "phone": "+966501234567",
    "language": "ar",
    "is_verified": true,
    "wallet_balance": 150.00,
    "referral_code": "AHMED2025",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Update Profile

Update user profile information.

**Endpoint:** `PUT /api/v2/profile`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Ahmed Ali Updated",
  "name_ar": "أحمد علي محدث",
  "email": "newemail@example.com",
  "phone": "+966501234567",
  "language": "ar",
  "device_token": "ExponentPushToken[...]"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "message_ar": "تم تحديث الملف الشخصي بنجاح",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Ahmed Ali Updated",
    "name_ar": "أحمد علي محدث"
  }
}
```

---

### Get Addresses

Retrieve all saved addresses.

**Endpoint:** `GET /api/v2/addresses`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "addr-uuid-1",
      "label": "Home",
      "label_ar": "المنزل",
      "address_line1": "123 King Fahd Road",
      "address_line1_ar": "123 طريق الملك فهد",
      "address_line2": "Al Olaya District",
      "address_line2_ar": "حي العليا",
      "city": "Riyadh",
      "city_ar": "الرياض",
      "postal_code": "12345",
      "latitude": 24.7136,
      "longitude": 46.6753,
      "is_default": true
    }
  ]
}
```

---

### Add Address

Add a new address to saved addresses.

**Endpoint:** `POST /api/v2/addresses`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "label": "Office",
  "label_ar": "المكتب",
  "address_line1": "456 Olaya Street",
  "address_line1_ar": "456 شارع العليا",
  "address_line2": "Tower B, Floor 5",
  "address_line2_ar": "البرج ب، الطابق 5",
  "city": "Riyadh",
  "city_ar": "الرياض",
  "postal_code": "12345",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "is_default": false
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Address added successfully",
  "message_ar": "تمت إضافة العنوان بنجاح",
  "data": {
    "id": "addr-uuid-2",
    "label": "Office",
    "is_default": false
  }
}
```

---

### Update Address

Update an existing address.

**Endpoint:** `PUT /api/v2/addresses/:id`

**Request Body:** (Same as Add Address)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Address updated successfully",
  "message_ar": "تم تحديث العنوان بنجاح"
}
```

---

### Delete Address

Remove a saved address.

**Endpoint:** `DELETE /api/v2/addresses/:id`

**Request Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Address deleted successfully",
  "message_ar": "تم حذف العنوان بنجاح"
}
```

---

## Service Discovery

### Get Service Categories

Retrieve all active service categories.

**Endpoint:** `GET /api/v2/services/categories`

**Request Headers:**
```http
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat-uuid-1",
      "name": "AC Maintenance",
      "name_ar": "صيانة المكيفات",
      "description": "Air conditioning cleaning and maintenance",
      "description_ar": "تنظيف وصيانة المكيفات",
      "icon_url": "https://storage.rakeez.sa/icons/ac.png",
      "is_active": true,
      "services_count": 8
    },
    {
      "id": "cat-uuid-2",
      "name": "Deep Cleaning",
      "name_ar": "التنظيف العميق",
      "description": "Comprehensive deep cleaning services",
      "description_ar": "خدمات التنظيف العميق الشاملة",
      "icon_url": "https://storage.rakeez.sa/icons/cleaning.png",
      "is_active": true,
      "services_count": 12
    }
  ]
}
```

---

### Get Services by Category

Retrieve services within a specific category.

**Endpoint:** `GET /api/v2/services/categories/:categoryId/services`

**Request Headers:**
```http
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "service-uuid-1",
      "name": "Split AC Cleaning",
      "name_ar": "تنظيف المكيف الاسبليت",
      "description": "Professional split AC cleaning service",
      "description_ar": "خدمة تنظيف احترافية للمكيف الاسبليت",
      "category_id": "cat-uuid-1",
      "category_name": "AC Maintenance",
      "category_name_ar": "صيانة المكيفات",
      "image_url": "https://storage.rakeez.sa/services/ac-cleaning.jpg",
      "duration_minutes": 60,
      "is_active": true,
      "pricing_tiers": [
        {
          "id": "tier-uuid-1",
          "name": "Basic",
          "name_ar": "أساسي",
          "price": 150.00,
          "discounted_price": 120.00,
          "unit_type": "per_unit",
          "features": [
            "External cleaning",
            "Filter cleaning",
            "Basic inspection"
          ],
          "features_ar": [
            "التنظيف الخارجي",
            "تنظيف الفلتر",
            "الفحص الأساسي"
          ]
        },
        {
          "id": "tier-uuid-2",
          "name": "Premium",
          "name_ar": "مميز",
          "price": 250.00,
          "discounted_price": null,
          "unit_type": "per_unit",
          "features": [
            "Deep internal cleaning",
            "Filter replacement",
            "Leak detection",
            "6-month warranty"
          ],
          "features_ar": [
            "التنظيف الداخلي العميق",
            "استبدال الفلتر",
            "كشف التسريبات",
            "ضمان 6 أشهر"
          ]
        }
      ]
    }
  ]
}
```

---

### Get Spare Parts

Retrieve available spare parts.

**Endpoint:** `GET /api/v2/spare-parts`

**Query Parameters:**
- `category`: Filter by category (optional)
- `search`: Search by name (optional)

**Request Headers:**
```http
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "part-uuid-1",
      "name": "AC Filter - Standard",
      "name_ar": "فلتر مكيف - قياسي",
      "description": "Universal AC filter for split units",
      "description_ar": "فلتر عام للمكيفات الاسبليت",
      "category": "AC Parts",
      "category_ar": "قطع المكيفات",
      "price": 45.00,
      "stock_quantity": 150,
      "image_url": "https://storage.rakeez.sa/parts/ac-filter.jpg",
      "brands": ["Samsung", "LG", "Gree"]
    }
  ]
}
```

---

## Booking & Scheduling

### Get Available Time Slots

Check available appointment slots for a service.

**Endpoint:** `GET /api/v2/bookings/available-slots`

**Query Parameters:**
- `service_id`: Required, UUID of the service
- `date`: Required, date in YYYY-MM-DD format
- `tier_id`: Optional, specific pricing tier

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Example Request:**
```
GET /api/v2/bookings/available-slots?service_id=service-uuid-1&date=2025-11-15
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "date": "2025-11-15",
    "service_id": "service-uuid-1",
    "service_name": "Split AC Cleaning",
    "available_slots": [
      {
        "start_time": "09:00",
        "end_time": "10:00",
        "is_available": true,
        "available_technicians": 3
      },
      {
        "start_time": "10:00",
        "end_time": "11:00",
        "is_available": true,
        "available_technicians": 2
      },
      {
        "start_time": "14:00",
        "end_time": "15:00",
        "is_available": false,
        "available_technicians": 0
      }
    ]
  }
}
```

---

### Create Booking

Create a new service booking.

**Endpoint:** `POST /api/v2/bookings/create`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
Accept-Language: en | ar
```

**Request Body:**
```json
{
  "service_id": "service-uuid-1",
  "tier_id": "tier-uuid-1",
  "scheduled_date": "2025-11-15",
  "scheduled_time": "09:00",
  "address_id": "addr-uuid-1",
  "quantity": 2,
  "notes": "Please bring spare filters",
  "notes_ar": "يرجى إحضار فلاتر إضافية",
  "spare_parts": [
    {
      "spare_part_id": "part-uuid-1",
      "quantity": 2
    }
  ],
  "referral_code": "FRIEND2025"
}
```

**Validation Rules:**
- `service_id`: Required, valid service UUID
- `tier_id`: Required, valid pricing tier for the service
- `scheduled_date`: Required, date in YYYY-MM-DD format (future date)
- `scheduled_time`: Required, time in HH:MM format
- `address_id`: Required, valid saved address
- `quantity`: Optional, defaults to 1 (for unit-based pricing)
- `notes`: Optional, booking instructions
- `spare_parts`: Optional, array of spare parts to include
- `referral_code`: Optional, discount/referral code

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "message_ar": "تم إنشاء الحجز بنجاح",
  "data": {
    "booking_id": "booking-uuid-1",
    "booking_number": "RKZ-2025-001234",
    "status": "pending",
    "scheduled_date": "2025-11-15",
    "scheduled_time": "09:00",
    "service_name": "Split AC Cleaning",
    "tier_name": "Basic",
    "total_amount": 300.00,
    "discount_applied": 30.00,
    "final_amount": 270.00,
    "payment_required": true,
    "payment_deadline": "2025-11-14T23:59:59.000Z"
  }
}
```

---

### Get Booking Details

Retrieve details of a specific booking.

**Endpoint:** `GET /api/v2/bookings/:id`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "booking-uuid-1",
    "booking_number": "RKZ-2025-001234",
    "status": "confirmed",
    "service": {
      "id": "service-uuid-1",
      "name": "Split AC Cleaning",
      "name_ar": "تنظيف المكيف الاسبليت",
      "category": "AC Maintenance"
    },
    "tier": {
      "id": "tier-uuid-1",
      "name": "Basic",
      "name_ar": "أساسي"
    },
    "scheduled_date": "2025-11-15",
    "scheduled_time": "09:00",
    "estimated_duration": 60,
    "address": {
      "label": "Home",
      "address_line1": "123 King Fahd Road",
      "city": "Riyadh",
      "latitude": 24.7136,
      "longitude": 46.6753
    },
    "technician": {
      "id": "tech-uuid-1",
      "name": "Mohammed Hassan",
      "name_ar": "محمد حسن",
      "phone": "+966501111111",
      "rating": 4.8,
      "photo_url": "https://storage.rakeez.sa/techs/photo.jpg"
    },
    "pricing": {
      "service_cost": 300.00,
      "spare_parts_cost": 90.00,
      "discount": 30.00,
      "subtotal": 360.00,
      "tax": 54.00,
      "total": 414.00
    },
    "payment": {
      "status": "paid",
      "method": "credit_card",
      "paid_at": "2025-11-10T14:30:00.000Z"
    },
    "notes": "Please bring spare filters",
    "created_at": "2025-11-10T14:25:00.000Z",
    "updated_at": "2025-11-10T14:30:00.000Z"
  }
}
```

---

### Cancel Booking

Cancel a pending or confirmed booking.

**Endpoint:** `POST /api/v2/bookings/:id/cancel`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Change of plans",
  "reason_ar": "تغيير في الخطط"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "message_ar": "تم إلغاء الحجز بنجاح",
  "data": {
    "booking_id": "booking-uuid-1",
    "status": "cancelled",
    "refund_amount": 270.00,
    "refund_method": "wallet",
    "refund_processed_at": "2025-11-10T15:00:00.000Z"
  }
}
```

**Cancellation Policy:**
- **24+ hours before**: Full refund
- **12-24 hours before**: 50% refund
- **Less than 12 hours**: No refund
- **After technician arrival**: No refund

---

## Orders & Tracking

### Get All Orders

Retrieve customer's booking history.

**Endpoint:** `GET /api/v2/orders`

**Query Parameters:**
- `status`: Filter by status (optional): `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`
- `from_date`: Start date filter (YYYY-MM-DD)
- `to_date`: End date filter (YYYY-MM-DD)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "booking-uuid-1",
        "booking_number": "RKZ-2025-001234",
        "status": "completed",
        "service_name": "Split AC Cleaning",
        "service_name_ar": "تنظيف المكيف الاسبليت",
        "scheduled_date": "2025-11-15",
        "scheduled_time": "09:00",
        "total_amount": 414.00,
        "technician_name": "Mohammed Hassan",
        "rating": 5,
        "created_at": "2025-11-10T14:25:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_items": 45,
      "items_per_page": 20
    }
  }
}
```

---

### Get Order Status History

Track status changes for a booking.

**Endpoint:** `GET /api/v2/orders/:id/status`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "booking_id": "booking-uuid-1",
    "current_status": "completed",
    "status_history": [
      {
        "status": "pending",
        "timestamp": "2025-11-10T14:25:00.000Z",
        "description": "Booking created",
        "description_ar": "تم إنشاء الحجز"
      },
      {
        "status": "confirmed",
        "timestamp": "2025-11-10T14:30:00.000Z",
        "description": "Payment confirmed",
        "description_ar": "تم تأكيد الدفع"
      },
      {
        "status": "technician_assigned",
        "timestamp": "2025-11-14T10:00:00.000Z",
        "description": "Technician Mohammed Hassan assigned",
        "description_ar": "تم تعيين الفني محمد حسن",
        "technician_id": "tech-uuid-1"
      },
      {
        "status": "in_progress",
        "timestamp": "2025-11-15T09:05:00.000Z",
        "description": "Service started",
        "description_ar": "بدأت الخدمة"
      },
      {
        "status": "completed",
        "timestamp": "2025-11-15T10:15:00.000Z",
        "description": "Service completed successfully",
        "description_ar": "اكتملت الخدمة بنجاح"
      }
    ]
  }
}
```

---

### Submit Review

Rate and review a completed service.

**Endpoint:** `POST /api/v2/orders/:id/review`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Excellent service! Very professional and thorough.",
  "comment_ar": "خدمة ممتازة! احترافية جداً وشاملة.",
  "technician_rating": 5,
  "punctuality_rating": 5,
  "quality_rating": 5,
  "would_recommend": true
}
```

**Validation:**
- `rating`: Required, 1-5 stars
- `comment`: Optional, max 500 characters
- `technician_rating`: Optional, 1-5 stars
- `punctuality_rating`: Optional, 1-5 stars
- `quality_rating`: Optional, 1-5 stars
- `would_recommend`: Optional, boolean

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "message_ar": "تم إرسال التقييم بنجاح",
  "data": {
    "review_id": "review-uuid-1",
    "booking_id": "booking-uuid-1",
    "rating": 5,
    "created_at": "2025-11-15T10:30:00.000Z"
  }
}
```

---

### Download Invoice

Generate and download booking invoice (PDF).

**Endpoint:** `GET /api/v2/orders/:id/invoice`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="invoice-RKZ-2025-001234.pdf"

[PDF Binary Data]
```

---

## Payments & Wallet

### Create Payment

Initiate payment for a booking.

**Endpoint:** `POST /api/v2/payments/create`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "booking_id": "booking-uuid-1",
  "payment_method": "moyasar",
  "payment_source": "creditcard",
  "use_wallet": true,
  "wallet_amount": 50.00,
  "callback_url": "myapp://payment-callback",
  "metadata": {
    "device": "iOS",
    "app_version": "1.2.0"
  }
}
```

**Parameters:**
- `booking_id`: Required, booking to pay for
- `payment_method`: Required, `moyasar`, `tabby`, or `wallet`
- `payment_source`: Required for Moyasar, `creditcard`, `mada`, `applepay`
- `use_wallet`: Optional, use wallet balance first
- `wallet_amount`: Optional, amount from wallet (max: wallet balance)
- `callback_url`: Required, deep link for return
- `metadata`: Optional, additional payment metadata

**Response (200 OK - Moyasar):**
```json
{
  "success": true,
  "data": {
    "payment_id": "payment-uuid-1",
    "payment_method": "moyasar",
    "status": "initiated",
    "amount": 364.00,
    "wallet_used": 50.00,
    "gateway_amount": 314.00,
    "moyasar": {
      "payment_url": "https://checkout.moyasar.com/...",
      "payment_id": "moyasar-id-123",
      "publishable_api_key": "pk_test_..."
    },
    "expires_at": "2025-11-14T23:59:59.000Z"
  }
}
```

**Response (200 OK - Wallet Only):**
```json
{
  "success": true,
  "message": "Payment completed successfully",
  "message_ar": "تم الدفع بنجاح",
  "data": {
    "payment_id": "payment-uuid-1",
    "payment_method": "wallet",
    "status": "paid",
    "amount": 414.00,
    "wallet_balance_remaining": 100.00,
    "booking_status": "confirmed"
  }
}
```

---

### Verify Payment

Verify Moyasar payment status.

**Endpoint:** `GET /api/v2/payments/moyasar/verify`

**Query Parameters:**
- `payment_id`: Moyasar payment ID
- `booking_id`: Booking UUID

**Request Headers:**
```http
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payment_id": "payment-uuid-1",
    "moyasar_id": "moyasar-id-123",
    "status": "paid",
    "amount": 314.00,
    "booking_status": "confirmed",
    "paid_at": "2025-11-10T14:35:00.000Z"
  }
}
```

---

### Get Wallet Balance

Retrieve wallet balance and transaction history.

**Endpoint:** `GET /api/v2/wallet`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Transactions per page (default: 20)

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "balance": 150.00,
    "currency": "SAR",
    "transactions": [
      {
        "id": "txn-uuid-1",
        "type": "credit",
        "amount": 270.00,
        "description": "Refund for cancelled booking #RKZ-2025-001234",
        "description_ar": "استرداد للحجز الملغي #RKZ-2025-001234",
        "reference_type": "booking_refund",
        "reference_id": "booking-uuid-1",
        "balance_after": 150.00,
        "created_at": "2025-11-10T15:00:00.000Z"
      },
      {
        "id": "txn-uuid-2",
        "type": "debit",
        "amount": 50.00,
        "description": "Payment for booking #RKZ-2025-001235",
        "description_ar": "دفع للحجز #RKZ-2025-001235",
        "reference_type": "booking_payment",
        "reference_id": "booking-uuid-2",
        "balance_after": 100.00,
        "created_at": "2025-11-11T09:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_items": 25
    }
  }
}
```

---

## Subscriptions

### Get Subscription Packages

Retrieve all available subscription packages.

**Endpoint:** `GET /api/v2/subscription-packages`

**Request Headers:**
```http
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "sub-pkg-uuid-1",
      "name": "Home Care Basic",
      "name_ar": "العناية المنزلية الأساسية",
      "description": "Essential home maintenance services",
      "description_ar": "خدمات الصيانة المنزلية الأساسية",
      "duration_months": 3,
      "price": 899.00,
      "discounted_price": 799.00,
      "savings_amount": 100.00,
      "services": [
        {
          "service_id": "service-uuid-1",
          "service_name": "AC Cleaning",
          "service_name_ar": "تنظيف المكيفات",
          "included_units": 4,
          "frequency": "monthly"
        },
        {
          "service_id": "service-uuid-2",
          "service_name": "General Cleaning",
          "service_name_ar": "التنظيف العام",
          "included_units": 3,
          "frequency": "monthly"
        }
      ],
      "features": [
        "Priority scheduling",
        "Dedicated technician",
        "Free spare parts (up to SAR 100)",
        "24/7 support"
      ],
      "features_ar": [
        "جدولة ذات أولوية",
        "فني مخصص",
        "قطع غيار مجانية (حتى 100 ريال)",
        "دعم على مدار الساعة"
      ],
      "is_popular": true,
      "is_active": true
    }
  ]
}
```

---

### Get Package Details

Get detailed information about a specific package.

**Endpoint:** `GET /api/v2/subscription-packages/:id`

**Request Headers:**
```http
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "sub-pkg-uuid-1",
    "name": "Home Care Basic",
    "name_ar": "العناية المنزلية الأساسية",
    "description": "Essential home maintenance services for your home",
    "description_ar": "خدمات الصيانة المنزلية الأساسية لمنزلك",
    "duration_months": 3,
    "price": 899.00,
    "discounted_price": 799.00,
    "tax_amount": 119.85,
    "total_amount": 918.85,
    "services": [...],
    "terms_and_conditions": "Package valid for 3 months...",
    "terms_and_conditions_ar": "الباقة صالحة لمدة 3 أشهر..."
  }
}
```

---

### Purchase Subscription

Purchase a subscription package.

**Endpoint:** `POST /api/v2/subscriptions/purchase`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "package_id": "sub-pkg-uuid-1",
  "payment_method": "moyasar",
  "payment_source": "creditcard",
  "address_id": "addr-uuid-1",
  "start_date": "2025-12-01",
  "referral_code": "FRIEND2025"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Subscription purchase initiated",
  "message_ar": "تم بدء شراء الاشتراك",
  "data": {
    "subscription_id": "subscription-uuid-1",
    "package_name": "Home Care Basic",
    "status": "pending_payment",
    "start_date": "2025-12-01",
    "end_date": "2026-03-01",
    "total_amount": 918.85,
    "payment": {
      "payment_id": "payment-uuid-3",
      "payment_url": "https://checkout.moyasar.com/..."
    }
  }
}
```

---

## Referrals & Rewards

### Validate Referral Code

Check if a referral code is valid.

**Endpoint:** `POST /api/v2/referrals/validate`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "FRIEND2025"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "code": "FRIEND2025",
    "is_valid": true,
    "discount_type": "percentage",
    "discount_value": 10.00,
    "max_discount": 50.00,
    "min_order_amount": 100.00,
    "expires_at": "2025-12-31T23:59:59.000Z",
    "applicable_to": "all_services"
  }
}
```

**Error Response (400 - Invalid Code):**
```json
{
  "success": false,
  "message": "Invalid or expired referral code",
  "message_ar": "رمز الإحالة غير صالح أو منتهي الصلاحية"
}
```

---

### Redeem Referral Code

Apply referral code to a booking.

**Endpoint:** `POST /api/v2/referrals/redeem`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "FRIEND2025",
  "booking_id": "booking-uuid-1"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Referral code applied successfully",
  "message_ar": "تم تطبيق رمز الإحالة بنجاح",
  "data": {
    "original_amount": 414.00,
    "discount_amount": 41.40,
    "final_amount": 372.60,
    "reward_earned": 20.00
  }
}
```

---

### Get Referral Stats

View your referral statistics and rewards.

**Endpoint:** `GET /api/v2/referrals/stats`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "referral_code": "AHMED2025",
    "total_referrals": 12,
    "successful_referrals": 8,
    "total_rewards_earned": 240.00,
    "pending_rewards": 60.00,
    "recent_referrals": [
      {
        "referred_user": "User***@example.com",
        "joined_at": "2025-11-01T10:00:00.000Z",
        "first_booking_completed": true,
        "reward_amount": 30.00,
        "reward_status": "credited"
      }
    ]
  }
}
```

---

## Support & Help

### Get FAQs

Retrieve frequently asked questions.

**Endpoint:** `GET /api/v2/support/faqs`

**Query Parameters:**
- `category`: Filter by category (optional)

**Request Headers:**
```http
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "faq-uuid-1",
      "category": "Booking",
      "category_ar": "الحجز",
      "question": "How do I cancel a booking?",
      "question_ar": "كيف يمكنني إلغاء الحجز؟",
      "answer": "You can cancel a booking from the Orders page...",
      "answer_ar": "يمكنك إلغاء الحجز من صفحة الطلبات...",
      "order": 1
    }
  ]
}
```

---

### Create Support Ticket

Create a new support ticket.

**Endpoint:** `POST /api/v2/support/tickets`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "Issue with booking payment",
  "subject_ar": "مشكلة في دفع الحجز",
  "description": "Payment was deducted but booking not confirmed",
  "description_ar": "تم خصم المبلغ لكن الحجز لم يتم تأكيده",
  "category": "payment",
  "priority": "high",
  "booking_id": "booking-uuid-1"
}
```

**Validation:**
- `subject`: Required, max 200 characters
- `description`: Required, max 2000 characters
- `category`: Required, one of: `general`, `booking`, `payment`, `technical`, `complaint`
- `priority`: Optional, one of: `low`, `medium`, `high` (defaults to `medium`)
- `booking_id`: Optional, related booking reference

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "message_ar": "تم إنشاء تذكرة الدعم بنجاح",
  "data": {
    "ticket_id": "ticket-uuid-1",
    "ticket_number": "SUP-2025-001234",
    "status": "open",
    "estimated_response_time": "2 hours",
    "created_at": "2025-11-10T16:00:00.000Z"
  }
}
```

---

### Get Support Tickets

Retrieve customer's support tickets.

**Endpoint:** `GET /api/v2/support/tickets`

**Query Parameters:**
- `status`: Filter by status (optional): `open`, `in_progress`, `resolved`, `closed`
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "ticket-uuid-1",
        "ticket_number": "SUP-2025-001234",
        "subject": "Issue with booking payment",
        "subject_ar": "مشكلة في دفع الحجز",
        "category": "payment",
        "priority": "high",
        "status": "in_progress",
        "last_message_at": "2025-11-10T16:30:00.000Z",
        "created_at": "2025-11-10T16:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 1,
      "total_items": 3
    }
  }
}
```

---

### Get Ticket Messages

Retrieve conversation messages for a ticket.

**Endpoint:** `GET /api/v2/support/tickets/:id/messages`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "ticket_id": "ticket-uuid-1",
    "ticket_number": "SUP-2025-001234",
    "status": "in_progress",
    "messages": [
      {
        "id": "msg-uuid-1",
        "sender_type": "customer",
        "sender_name": "Ahmed Ali",
        "message": "Payment was deducted but booking not confirmed",
        "created_at": "2025-11-10T16:00:00.000Z"
      },
      {
        "id": "msg-uuid-2",
        "sender_type": "support",
        "sender_name": "Support Agent",
        "message": "Thank you for contacting us. We're looking into this issue.",
        "message_ar": "شكراً لتواصلك معنا. نحن ننظر في هذه المشكلة.",
        "created_at": "2025-11-10T16:15:00.000Z"
      }
    ]
  }
}
```

---

### Send Ticket Message

Reply to a support ticket.

**Endpoint:** `POST /api/v2/support/messages`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "ticket_id": "ticket-uuid-1",
  "message": "The booking ID is RKZ-2025-001234. Payment reference: PAY-789456"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "message_ar": "تم إرسال الرسالة بنجاح",
  "data": {
    "message_id": "msg-uuid-3",
    "ticket_id": "ticket-uuid-1",
    "created_at": "2025-11-10T16:30:00.000Z"
  }
}
```

---

### Rate Support Ticket

Provide feedback on resolved ticket.

**Endpoint:** `POST /api/v2/support/tickets/:id/rate`

**Request Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 5,
  "feedback": "Very helpful and quick response!",
  "feedback_ar": "خدمة ممتازة واستجابة سريعة!"
}
```

**Validation:**
- `rating`: Required, 1-5 stars
- `feedback`: Optional, max 500 characters

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Thank you for your feedback",
  "message_ar": "شكراً لملاحظاتك"
}
```

---

## WebSocket Integration

For real-time order updates and notifications, connect to the WebSocket server.

**WebSocket URL:**
```
wss://api.rakeez.sa/ws?token=<access_token>
```

**Connection Example (JavaScript):**
```javascript
const ws = new WebSocket('wss://api.rakeez.sa/ws?token=' + accessToken);

ws.onopen = () => {
  console.log('Connected to Rakeez WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
  
  // Handle different event types
  switch(data.type) {
    case 'booking_update':
      handleBookingUpdate(data.payload);
      break;
    case 'payment_confirmed':
      handlePaymentConfirmed(data.payload);
      break;
    case 'technician_assigned':
      handleTechnicianAssigned(data.payload);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket connection closed');
  // Implement reconnection logic
};
```

**Event Types:**
- `booking_update`: Booking status changed
- `payment_confirmed`: Payment successfully processed
- `technician_assigned`: Technician assigned to booking
- `technician_enroute`: Technician on the way
- `service_started`: Service has started
- `service_completed`: Service completed
- `message_received`: New support ticket message

For detailed WebSocket documentation, see [WEBSOCKET_API.md](./WEBSOCKET_API.md).

---

## Best Practices

### Security
1. **Never log or expose tokens** in client-side code
2. **Store tokens securely** using platform-specific secure storage (Keychain, Keystore)
3. **Implement token refresh** before expiration
4. **Use HTTPS only** for all API calls
5. **Validate SSL certificates** in production

### Performance
1. **Cache static data** (services, categories) locally
2. **Implement pagination** for list endpoints
3. **Use WebSocket** for real-time updates instead of polling
4. **Compress images** before upload
5. **Batch API calls** when possible

### User Experience
1. **Handle offline scenarios** gracefully
2. **Show loading states** during API calls
3. **Implement retry logic** with exponential backoff
4. **Validate data** on client before sending
5. **Provide clear error messages** to users

### Localization
1. **Always send Accept-Language** header
2. **Store user's language preference** locally
3. **Handle RTL layouts** for Arabic
4. **Test with both languages** before release

---

## Testing

### Sandbox Environment
```
Base URL: https://sandbox-api.rakeez.sa
```

### Test Credentials
```json
{
  "phone": "+966500000001",
  "password": "Test123!"
}
```

### Test Payment Cards (Moyasar Sandbox)
- **Success**: 4111 1111 1111 1111
- **Declined**: 4000 0000 0000 0002
- **3D Secure**: 4000 0027 6000 3184

### Test OTP Codes
In sandbox environment, use `123456` for all OTP verifications.

---

## Support

### Technical Support
- **Email**: dev@rakeez.sa
- **Documentation**: https://docs.rakeez.sa
- **Status Page**: https://status.rakeez.sa

### API Updates
Subscribe to our changelog for API updates and deprecation notices:
https://changelog.rakeez.sa

---

## Changelog

### Version 2.0 (October 2025)
- Added subscription packages API
- Enhanced wallet transaction history
- Improved error messages
- Added WebSocket real-time updates
- Added Tabby BNPL payment option

### Version 1.5 (August 2025)
- Added referral system
- Enhanced booking cancellation policy
- Added support ticket ratings
- Improved authentication flow

---

**Last Updated:** October 31, 2025  
**API Version:** 2.0  
**Document Version:** 1.0
