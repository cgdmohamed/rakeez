# Technician App API Documentation

## Table of Contents
- [Authentication](#authentication)
- [Profile Management](#profile-management)
- [Bookings & Orders](#bookings--orders)
- [Performance & Earnings](#performance--earnings)
- [Quotations](#quotations)
- [Availability Settings](#availability-settings)
- [Error Handling](#error-handling)

---

## Authentication

All technician endpoints require authentication via JWT token.

### Headers Required
```http
Authorization: Bearer <jwt_token>
Accept-Language: en | ar (optional, defaults to 'en')
```

### Rate Limiting
- Standard endpoints: Varies per endpoint
- Password change: 5 attempts per 15 minutes
- Protected by IP-based rate limiting

---

## Profile Management

### Get Profile
Retrieves the authenticated technician's profile information.

**Endpoint:** `GET /api/v2/profile`

**Authentication:** Required

**Headers:**
```http
Authorization: Bearer <jwt_token>
Accept-Language: en | ar
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "Ahmed Al-Rashid",
    "name_ar": "أحمد الراشد",
    "email": "ahmed@rakeez.sa",
    "phone": "+966501234567",
    "language": "en",
    "avatar": "https://...",
    "role": "technician",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Update Profile
Updates technician's personal information.

**Endpoint:** `PUT /api/v2/profile`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Ahmed Al-Rashid",
  "name_ar": "أحمد الراشد",
  "language": "en",
  "device_token": "ExponentPushToken[...]"
}
```

**Validation:**
- `name`: Minimum 2 characters (optional)
- `name_ar`: String (optional)
- `language`: Either "en" or "ar" (optional)
- `device_token`: String for push notifications (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "name": "Ahmed Al-Rashid",
    "name_ar": "أحمد الراشد",
    "email": "ahmed@rakeez.sa",
    "phone": "+966501234567",
    "language": "en",
    "role": "technician"
  }
}
```

---

### Change Password
Changes the authenticated user's password with strong validation.

**Endpoint:** `PUT /api/v2/auth/change-password`

**Authentication:** Required

**Rate Limiting:** 5 attempts per 15 minutes

**Request Body:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass456@"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid current password"
}
```

---

## Bookings & Orders

### Get All Orders
Retrieves all bookings assigned to the authenticated technician.

**Endpoint:** `GET /api/v2/technician/orders`

**Authentication:** Required (Technician role only)

**Query Parameters:**
- `status` (optional): Filter by booking status
  - Values: `pending`, `confirmed`, `technician_assigned`, `en_route`, `in_progress`, `completed`, `cancelled`

**Example Request:**
```http
GET /api/v2/technician/orders?status=confirmed
Authorization: Bearer <jwt_token>
Accept-Language: en
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Technician orders retrieved successfully",
  "data": [
    {
      "id": "booking-uuid",
      "userId": "user-uuid",
      "serviceId": "service-uuid",
      "status": "confirmed",
      "scheduledDate": "2025-10-30",
      "scheduledTime": "14:00",
      "totalAmount": "350.00",
      "createdAt": "2025-10-26T10:00:00.000Z",
      "user": {
        "id": "user-uuid",
        "name": "Mohammed Ali",
        "email": "mohammed@example.com",
        "phone": "+966501111111"
      },
      "service": {
        "id": "service-uuid",
        "name": "Deep Cleaning"
      },
      "address": {
        "streetName": "King Fahd Road",
        "houseNo": "123",
        "district": "Al Olaya",
        "city": "Riyadh"
      }
    }
  ]
}
```

---

### Get Technician Bookings (Alternative)
Alternative endpoint for retrieving technician bookings with enhanced flexibility.

**Endpoint:** `GET /api/v2/technician/:userId/bookings`

**Authentication:** Required

**Path Parameters:**
- `userId`: The technician's user ID (must match authenticated user or be admin)

**Query Parameters:**
- `status` (optional): Filter by booking status

**Example Request:**
```http
GET /api/v2/technician/bc4c59fb-127d-4cd9-bb62-c347a47c0146/bookings?status=completed
Authorization: Bearer <jwt_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "booking-uuid",
      "userId": "user-uuid",
      "technicianId": "tech-uuid",
      "status": "completed",
      "scheduledDate": "2025-10-25",
      "scheduledTime": "10:00",
      "totalAmount": "450.00",
      "user": {
        "id": "user-uuid",
        "name": "Sara Ahmed",
        "email": "sara@example.com",
        "phone": "+966502222222"
      },
      "service": {
        "id": "service-uuid",
        "name": "Home Cleaning"
      },
      "address": {
        "addressName": "Home",
        "streetName": "Prince Sultan Road",
        "houseNo": "45",
        "district": "Al Malaz"
      }
    }
  ]
}
```

---

### Accept Order
Accepts a booking that has been assigned to the technician.

**Endpoint:** `PUT /api/v2/technician/orders/:id/accept`

**Authentication:** Required (Technician role only)

**Path Parameters:**
- `id`: Booking ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order accepted successfully"
}
```

**Error Responses:**

**404 Not Found:**
```json
{
  "success": false,
  "message": "Booking not assigned to you"
}
```

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Cannot accept booking in current status"
}
```

**Side Effects:**
- Updates booking status to `confirmed`
- Sends WebSocket notification to customer
- Sends push notification to customer
- Records audit log

---

### Update Order Status
Updates the status of an assigned booking during service delivery.

**Endpoint:** `PUT /api/v2/technician/orders/:id/status`

**Authentication:** Required (Technician role only)

**Path Parameters:**
- `id`: Booking ID

**Request Body:**
```json
{
  "status": "en_route",
  "notes": "On my way to the location"
}
```

**Allowed Status Values:**
- `en_route`: Technician is traveling to location
- `in_progress`: Service has started
- `completed`: Service is finished

**Validation:**
- `status`: Required, must be one of the allowed values
- `notes`: Optional, string

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated successfully"
}
```

**Side Effects:**
- Updates booking status in database
- Sends WebSocket notification to customer
- Sends push notification to customer
- For `en_route` and `completed`: Sends SMS to customer
- Records status change in audit log

---

## Performance & Earnings

### Get Performance Metrics
Retrieves comprehensive performance statistics and earnings data for the authenticated technician.

**Endpoint:** `GET /api/v2/technician/performance`

**Authentication:** Required (Technician role only)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Performance retrieved successfully",
  "data": {
    "overall": {
      "totalJobs": 85,
      "completedJobs": 78,
      "cancelledJobs": 7,
      "completionRate": 91.76,
      "cancellationRate": 8.24,
      "averageRating": 4.65,
      "averageResponseTime": 2.5,
      "totalRevenue": 34500.00
    },
    "monthlyStats": [
      {
        "month": "May 2025",
        "completed": 12,
        "cancelled": 1,
        "total": 13,
        "revenue": 5200.00
      },
      {
        "month": "Jun 2025",
        "completed": 15,
        "cancelled": 2,
        "total": 17,
        "revenue": 6750.00
      },
      {
        "month": "Jul 2025",
        "completed": 14,
        "cancelled": 1,
        "total": 15,
        "revenue": 6300.00
      },
      {
        "month": "Aug 2025",
        "completed": 13,
        "cancelled": 1,
        "total": 14,
        "revenue": 5850.00
      },
      {
        "month": "Sep 2025",
        "completed": 12,
        "cancelled": 1,
        "total": 13,
        "revenue": 5400.00
      },
      {
        "month": "Oct 2025",
        "completed": 12,
        "cancelled": 1,
        "total": 13,
        "revenue": 5000.00
      }
    ],
    "recentCompletedJobs": [
      {
        "id": "booking-uuid",
        "userId": "user-uuid",
        "serviceId": "service-uuid",
        "status": "completed",
        "scheduledDate": "2025-10-25",
        "totalAmount": "450.00",
        "completedAt": "2025-10-25T15:30:00.000Z"
      }
    ]
  }
}
```

**Metrics Explained:**
- **totalJobs**: Total number of bookings assigned
- **completedJobs**: Number of successfully completed jobs
- **cancelledJobs**: Number of cancelled jobs
- **completionRate**: Percentage of completed jobs (completed/total * 100)
- **cancellationRate**: Percentage of cancelled jobs
- **averageRating**: Average customer rating from reviews (0-5 scale)
- **averageResponseTime**: Average hours from booking creation to acceptance
- **totalRevenue**: Total earnings from completed jobs (SAR)
- **monthlyStats**: Last 6 months of performance data
- **recentCompletedJobs**: Last 10 completed bookings

---

## Quotations

### Get Quotations
Retrieves all quotations created by the authenticated technician.

**Endpoint:** `GET /api/v2/technician/quotations`

**Authentication:** Required (Technician role only)

**Query Parameters:**
- `status` (optional): Filter by quotation status
  - Values: `pending`, `approved`, `rejected`

**Example Request:**
```http
GET /api/v2/technician/quotations?status=pending
Authorization: Bearer <jwt_token>
Accept-Language: en
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Quotations retrieved successfully",
  "data": [
    {
      "id": "quotation-uuid",
      "bookingId": "booking-uuid",
      "technicianId": "tech-uuid",
      "status": "pending",
      "estimatedCost": "550.00",
      "estimatedDuration": 180,
      "notes": "Additional cleaning required for balcony area",
      "createdAt": "2025-10-26T09:00:00.000Z",
      "approvedAt": null,
      "rejectedAt": null,
      "booking": {
        "id": "booking-uuid",
        "status": "pending",
        "scheduledDate": "2025-10-30",
        "service": {
          "id": "service-uuid",
          "name": "Deep Cleaning"
        },
        "user": {
          "id": "user-uuid",
          "name": "Mohammed Ali",
          "phone": "+966501111111"
        }
      }
    }
  ]
}
```

**Quotation Fields:**
- **id**: Unique quotation identifier
- **bookingId**: Related booking ID
- **status**: Current quotation status (pending/approved/rejected)
- **estimatedCost**: Quoted price in SAR
- **estimatedDuration**: Estimated service duration in minutes
- **notes**: Additional notes or details
- **createdAt**: Quotation creation timestamp
- **approvedAt**: Approval timestamp (if approved)
- **rejectedAt**: Rejection timestamp (if rejected)

---

## Availability Settings

### Update Availability
Updates the technician's availability settings including working hours, service radius, and status.

**Endpoint:** `PUT /api/v2/technician/availability`

**Authentication:** Required (Technician role only)

**Request Body:**
```json
{
  "availabilityStatus": "available",
  "workingHours": {
    "sunday": {
      "start": "08:00",
      "end": "17:00",
      "enabled": true
    },
    "monday": {
      "start": "08:00",
      "end": "17:00",
      "enabled": true
    },
    "tuesday": {
      "start": "08:00",
      "end": "17:00",
      "enabled": true
    },
    "wednesday": {
      "start": "08:00",
      "end": "17:00",
      "enabled": true
    },
    "thursday": {
      "start": "08:00",
      "end": "17:00",
      "enabled": true
    },
    "friday": {
      "start": "09:00",
      "end": "13:00",
      "enabled": true
    },
    "saturday": {
      "start": "09:00",
      "end": "13:00",
      "enabled": false
    }
  },
  "daysOff": ["2025-10-30", "2025-11-05"],
  "serviceRadius": 25,
  "homeLatitude": 24.7136,
  "homeLongitude": 46.6753,
  "maxDailyBookings": 5
}
```

**Field Descriptions:**

- **availabilityStatus** (optional): Current availability status
  - `available`: Ready to accept new bookings
  - `busy`: Temporarily unavailable
  - `on_job`: Currently working on a job
  - `off_duty`: Off duty

- **workingHours** (optional): Weekly schedule configuration
  - Object with day names as keys (sunday, monday, etc.)
  - Each day contains: `start`, `end` (HH:mm format), `enabled` (boolean)

- **daysOff** (optional): Array of dates when technician is unavailable
  - Format: YYYY-MM-DD
  - Example: `["2025-10-30", "2025-11-05"]`

- **serviceRadius** (optional): Maximum service distance in kilometers
  - Number (e.g., 25 for 25km radius)

- **homeLatitude** (optional): Home location latitude
  - Number (decimal degrees)

- **homeLongitude** (optional): Home location longitude
  - Number (decimal degrees)

- **maxDailyBookings** (optional): Maximum bookings per day
  - Number (e.g., 5)

**All fields are optional** - you can update any combination of settings.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Availability updated successfully"
}
```

**Example - Update Only Status:**
```json
{
  "availabilityStatus": "on_job"
}
```

**Example - Update Working Hours Only:**
```json
{
  "workingHours": {
    "friday": {
      "start": "09:00",
      "end": "12:00",
      "enabled": true
    }
  }
}
```

**Example - Add Days Off:**
```json
{
  "daysOff": ["2025-11-15", "2025-11-16", "2025-11-17"]
}
```

---

## Error Handling

### Standard Error Response Format
All error responses follow this structure:

```json
{
  "success": false,
  "message": "Error description in requested language"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data or validation error |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

### Common Error Messages

**Authentication Errors:**
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

**Authorization Errors:**
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "message": "Validation failed: [field] is required"
}
```

**Rate Limit Errors:**
```json
{
  "success": false,
  "message": "Too many requests. Please try again later."
}
```

**Resource Not Found:**
```json
{
  "success": false,
  "message": "Booking not found"
}
```

### Bilingual Support

All error messages are available in both English and Arabic. Use the `Accept-Language` header to specify the preferred language:

```http
Accept-Language: en  # English (default)
Accept-Language: ar  # Arabic
```

---

## API Usage Examples

### Complete Workflow Example: Accepting and Completing a Job

#### 1. Get Assigned Orders
```bash
curl -X GET "https://api.rakeez.sa/api/v2/technician/orders?status=technician_assigned" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept-Language: en"
```

#### 2. Accept the Order
```bash
curl -X PUT "https://api.rakeez.sa/api/v2/technician/orders/abc-123/accept" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept-Language: en"
```

#### 3. Update Status - En Route
```bash
curl -X PUT "https://api.rakeez.sa/api/v2/technician/orders/abc-123/status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept-Language: en" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "en_route",
    "notes": "On my way, arriving in 20 minutes"
  }'
```

#### 4. Update Status - In Progress
```bash
curl -X PUT "https://api.rakeez.sa/api/v2/technician/orders/abc-123/status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept-Language: en" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "notes": "Started cleaning service"
  }'
```

#### 5. Update Status - Completed
```bash
curl -X PUT "https://api.rakeez.sa/api/v2/technician/orders/abc-123/status" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept-Language: en" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "notes": "Service completed successfully"
  }'
```

#### 6. Check Performance
```bash
curl -X GET "https://api.rakeez.sa/api/v2/technician/performance" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Accept-Language: en"
```

---

## Best Practices

### 1. Always Include Authentication
All technician endpoints require a valid JWT token. Include it in every request:
```http
Authorization: Bearer <your_jwt_token>
```

### 2. Handle Rate Limits
Monitor rate limit headers and implement exponential backoff for retries.

### 3. Use Accept-Language Header
Provide a better user experience by setting the preferred language:
```http
Accept-Language: ar  # For Arabic users
```

### 4. Update Availability Status
Keep your availability status updated to improve assignment accuracy:
- Set to `on_job` when working
- Set to `available` when ready for new jobs
- Set to `off_duty` at end of shift

### 5. Provide Detailed Notes
When updating order status, include helpful notes for customers:
```json
{
  "status": "en_route",
  "notes": "Traffic is heavy, will arrive in 30 minutes"
}
```

### 6. Regular Performance Checks
Monitor your performance metrics regularly to track earnings and maintain high ratings.

### 7. Keep Working Hours Updated
Update your working hours when your schedule changes to avoid missed opportunities.

---

## Support

For technical support or API issues, contact:
- **Email:** tech@rakeez.sa
- **Phone:** +966 50 123 4567
- **Documentation:** https://docs.rakeez.sa

---

**Last Updated:** October 26, 2025  
**API Version:** v2  
**Base URL:** `https://api.rakeez.sa`
