# Admin API Documentation

## Table of Contents
- [Authentication](#authentication)
- [Users Management](#users-management)
- [Roles & Permissions](#roles--permissions)
- [Customers Management](#customers-management)
- [Technicians Management](#technicians-management)
- [Bookings Management](#bookings-management)
- [Quotations Management](#quotations-management)
- [Payments Management](#payments-management)
- [Support Tickets](#support-tickets)
- [Services Management](#services-management)
- [Subscription Packages](#subscription-packages)
- [Promos & Referrals](#promos--referrals)
- [Mobile Content](#mobile-content)
- [Analytics & Reports](#analytics--reports)

---

## Authentication

All admin endpoints require authentication with admin role.

### Headers Required
```http
Authorization: Bearer <jwt_token>
Accept-Language: en | ar (optional, defaults to 'en')
```

---

## Users Management

### Get All Users
Retrieve all users with filtering and pagination.

**Endpoint:** `GET /api/v2/admin/users`

**Query Parameters:**
- `role`: Filter by role (optional)
- `status`: Filter by status (optional)
- `search`: Search by name or email (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "nameAr": "جون دو",
      "email": "john@example.com",
      "phone": "+966501234567",
      "role": "customer",
      "status": "active",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Get User by ID
Retrieve detailed user information.

**Endpoint:** `GET /api/v2/admin/users/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "nameAr": "جون دو",
    "email": "john@example.com",
    "phone": "+966501234567",
    "role": "customer",
    "status": "active",
    "language": "en",
    "deviceToken": "expo-token",
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### Create User
Create a new user account.

**Endpoint:** `POST /api/v2/admin/users`

**Request Body:**
```json
{
  "name": "John Doe",
  "name_ar": "جون دو",
  "email": "john@example.com",
  "phone": "+966501234567",
  "password": "SecurePass123!",
  "role": "customer",
  "status": "active"
}
```

**Validation:**
- `name`: Required, minimum 2 characters
- `email`: Required, valid email format
- `phone`: Required, valid phone format
- `password`: Required, minimum 8 characters
- `role`: Required, one of: customer, technician, admin
- `status`: Optional, one of: active, inactive, suspended

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer"
  }
}
```

---

### Update User
Update user information.

**Endpoint:** `PUT /api/v2/admin/users/:id`

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "name_ar": "جون دو محدث",
  "email": "newemail@example.com",
  "phone": "+966509876543",
  "role": "customer",
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe Updated",
    "email": "newemail@example.com"
  }
}
```

---

### Update User Status
Change user account status.

**Endpoint:** `PATCH /api/v2/admin/users/:id/status`

**Request Body:**
```json
{
  "status": "suspended"
}
```

**Validation:**
- `status`: Required, one of: active, inactive, suspended

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User status updated successfully"
}
```

---

### Delete User
Soft delete a user account.

**Endpoint:** `DELETE /api/v2/admin/users/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Roles & Permissions

### Get All Roles
Retrieve all system roles.

**Endpoint:** `GET /api/v2/admin/roles`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Roles retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Admin",
      "description": "Full system access",
      "permissions": ["manage_users", "manage_bookings", "view_reports"]
    }
  ]
}
```

---

### Get Role by ID
Retrieve specific role details.

**Endpoint:** `GET /api/v2/admin/roles/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role retrieved successfully",
  "data": {
    "id": "uuid",
    "name": "Admin",
    "description": "Full system access",
    "permissions": ["manage_users", "manage_bookings"]
  }
}
```

---

### Create Role
Create a new system role.

**Endpoint:** `POST /api/v2/admin/roles`

**Request Body:**
```json
{
  "name": "Manager",
  "description": "Manages bookings and technicians",
  "permissions": ["manage_bookings", "manage_technicians"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Role created successfully",
  "data": {
    "id": "uuid",
    "name": "Manager"
  }
}
```

---

### Update Role
Update role information and permissions.

**Endpoint:** `PUT /api/v2/admin/roles/:id`

**Request Body:**
```json
{
  "name": "Senior Manager",
  "description": "Updated description",
  "permissions": ["manage_bookings", "manage_technicians", "view_reports"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role updated successfully"
}
```

---

### Delete Role
Delete a system role.

**Endpoint:** `DELETE /api/v2/admin/roles/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Role deleted successfully"
}
```

---

## Customers Management

### Get Customer Addresses
Retrieve all addresses for a specific customer.

**Endpoint:** `GET /api/v2/admin/users/:userId/addresses`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Addresses retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "type": "home",
      "street": "King Fahd Road",
      "city": "Riyadh",
      "district": "Al Olaya",
      "building": "Building 123",
      "floor": "5",
      "apartment": "501",
      "latitude": 24.7136,
      "longitude": 46.6753,
      "isDefault": true
    }
  ]
}
```

---

### Add Customer Address
Create a new address for a customer.

**Endpoint:** `POST /api/v2/admin/users/:userId/addresses`

**Request Body:**
```json
{
  "type": "home",
  "street": "King Fahd Road",
  "city": "Riyadh",
  "district": "Al Olaya",
  "building": "Building 123",
  "floor": "5",
  "apartment": "501",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "is_default": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Address created successfully",
  "data": {
    "id": "uuid",
    "type": "home",
    "street": "King Fahd Road"
  }
}
```

---

### Update Customer Address
Update an existing address.

**Endpoint:** `PUT /api/v2/admin/addresses/:addressId`

**Request Body:**
```json
{
  "type": "office",
  "street": "Updated Street",
  "city": "Riyadh",
  "district": "Al Malqa",
  "is_default": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Address updated successfully"
}
```

---

### Delete Customer Address
Delete a customer address.

**Endpoint:** `DELETE /api/v2/admin/addresses/:addressId`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Address deleted successfully"
}
```

---

## Technicians Management

### Get Technician Profile
Retrieve detailed technician profile with performance metrics.

**Endpoint:** `GET /api/v2/admin/technicians/:id/profile`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Technician profile retrieved successfully",
  "data": {
    "profile": {
      "id": "uuid",
      "name": "Ahmed Al-Rashid",
      "nameAr": "أحمد الراشد",
      "email": "ahmed@rakeez.sa",
      "phone": "+966501234567",
      "status": "active",
      "specializations": ["AC Repair", "Plumbing"]
    },
    "performance": {
      "totalJobs": 150,
      "completedJobs": 145,
      "completionRate": 96.67,
      "averageRating": 4.8,
      "totalRevenue": "15000.00"
    },
    "availability": {
      "isAvailable": true,
      "workingHours": {
        "start": "08:00",
        "end": "17:00"
      },
      "serviceRadius": 25
    }
  }
}
```

---

### Get Technician Specializations
Retrieve all technicians with their specializations and coverage stats.

**Endpoint:** `GET /api/v2/admin/technicians/specializations`

**Query Parameters:**
- `categoryId`: Filter technicians by service category (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Technicians retrieved successfully",
  "data": {
    "technicians": [
      {
        "id": "uuid",
        "name": "Ahmed Al-Rashid",
        "nameAr": "أحمد الراشد",
        "email": "ahmed@rakeez.sa",
        "phone": "+966501234567",
        "status": "active",
        "availabilityStatus": "available",
        "specializations": [
          {
            "id": "cat-uuid-1",
            "name": "AC Repair"
          }
        ]
      }
    ],
    "categories": [
      {
        "id": "cat-uuid-1",
        "name": "AC Repair",
        "nameAr": "صيانة المكيفات"
      }
    ],
    "coverageStats": [
      {
        "categoryId": "cat-uuid-1",
        "categoryName": "AC Repair",
        "technicianCount": 15
      }
    ]
  }
}
```

---

### Update Technician Specializations
Assign or update service categories for a technician.

**Endpoint:** `PUT /api/v2/admin/technicians/:id/specializations`

**Request Body:**
```json
{
  "specializations": ["cat-uuid-1", "cat-uuid-2", "cat-uuid-3"]
}
```

**Note:** Empty array means technician can handle all service categories.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Specializations updated successfully",
  "data": {
    "id": "uuid",
    "specializations": ["cat-uuid-1", "cat-uuid-2"]
  }
}
```

---

### Get Technician Assignments
View booking assignments for a technician.

**Endpoint:** `GET /api/v2/admin/technicians/:id/assignments`

**Query Parameters:**
- `status`: Filter by booking status (optional)
- `startDate`: Filter from date (optional)
- `endDate`: Filter to date (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Assignments retrieved successfully",
  "data": [
    {
      "id": "booking-uuid",
      "customerName": "John Doe",
      "service": "AC Repair",
      "scheduledDate": "2025-10-30T10:00:00.000Z",
      "status": "confirmed",
      "totalAmount": "250.00"
    }
  ]
}
```

---

### Update Technician Availability
Update technician's availability settings.

**Endpoint:** `PUT /api/v2/admin/technicians/:id/availability`

**Request Body:**
```json
{
  "is_available": true,
  "working_hours_start": "08:00",
  "working_hours_end": "17:00",
  "service_radius_km": 25,
  "max_daily_bookings": 5,
  "home_latitude": 24.7136,
  "home_longitude": 46.6753
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Availability updated successfully"
}
```

---

## Bookings Management

### Get All Bookings
Retrieve all bookings with filtering.

**Endpoint:** `GET /api/v2/admin/bookings`

**Query Parameters:**
- `status`: Filter by status (optional)
- `technicianId`: Filter by technician (optional)
- `customerId`: Filter by customer (optional)
- `startDate`: Filter from date (optional)
- `endDate`: Filter to date (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bookings retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "ticketNumber": "BK-2025-001",
      "customer": {
        "id": "uuid",
        "name": "John Doe"
      },
      "service": "AC Repair",
      "status": "confirmed",
      "scheduledDate": "2025-10-30T10:00:00.000Z",
      "totalAmount": "250.00",
      "technician": {
        "id": "uuid",
        "name": "Ahmed Al-Rashid"
      }
    }
  ]
}
```

---

### Get Booking Details
Retrieve detailed booking information.

**Endpoint:** `GET /api/v2/admin/bookings/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking retrieved successfully",
  "data": {
    "id": "uuid",
    "ticketNumber": "BK-2025-001",
    "customer": {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+966501234567"
    },
    "service": {
      "id": "uuid",
      "name": "AC Repair",
      "category": "Air Conditioning"
    },
    "address": {
      "street": "King Fahd Road",
      "city": "Riyadh",
      "district": "Al Olaya"
    },
    "status": "confirmed",
    "scheduledDate": "2025-10-30T10:00:00.000Z",
    "totalAmount": "250.00",
    "paymentStatus": "paid",
    "technician": {
      "id": "uuid",
      "name": "Ahmed Al-Rashid"
    }
  }
}
```

---

### Update Booking Status
Update booking status.

**Endpoint:** `PUT /api/v2/admin/bookings/:id/status`

**Request Body:**
```json
{
  "status": "in_progress"
}
```

**Validation:**
- `status`: Required, one of: pending, confirmed, technician_assigned, in_progress, completed, cancelled

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking status updated successfully"
}
```

---

### Assign Technician to Booking
Manually assign a technician to a booking.

**Endpoint:** `PUT /api/v2/admin/bookings/:id/assign`

**Request Body:**
```json
{
  "technician_id": "uuid"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Technician assigned successfully",
  "data": {
    "bookingId": "uuid",
    "technicianId": "uuid",
    "technicianName": "Ahmed Al-Rashid"
  }
}
```

---

### Auto-Assign Technician
Use smart algorithm to automatically assign best-fit technician.

**Endpoint:** `POST /api/v2/admin/bookings/:id/auto-assign`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Technician auto-assigned successfully",
  "data": {
    "bookingId": "uuid",
    "technicianId": "uuid",
    "technicianName": "Ahmed Al-Rashid",
    "matchScore": 95,
    "assignmentReason": "Best available technician with AC Repair specialization within 5km"
  }
}
```

---

### Cancel Booking
Cancel a booking with optional refund.

**Endpoint:** `PUT /api/v2/admin/bookings/:id/cancel`

**Request Body:**
```json
{
  "reason": "Customer requested cancellation",
  "refund": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "bookingId": "uuid",
    "refundAmount": "250.00",
    "refundStatus": "processing"
  }
}
```

---

## Quotations Management

### Get All Quotations
Retrieve all quotations with filtering.

**Endpoint:** `GET /api/v2/admin/quotations`

**Query Parameters:**
- `status`: Filter by status (pending, approved, rejected) (optional)
- `technicianId`: Filter by technician (optional)
- `bookingId`: Filter by booking (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Quotations retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "bookingId": "uuid",
      "technicianId": "uuid",
      "technicianName": "Ahmed Al-Rashid",
      "items": [
        {
          "name": "AC Filter Replacement",
          "quantity": 2,
          "unitPrice": "50.00",
          "total": "100.00"
        }
      ],
      "totalAmount": "100.00",
      "status": "pending",
      "createdAt": "2025-10-29T12:00:00.000Z"
    }
  ]
}
```

---

### Get Quotation Details
Retrieve detailed quotation information.

**Endpoint:** `GET /api/v2/admin/quotations/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Quotation retrieved successfully",
  "data": {
    "id": "uuid",
    "booking": {
      "id": "uuid",
      "ticketNumber": "BK-2025-001"
    },
    "technician": {
      "id": "uuid",
      "name": "Ahmed Al-Rashid"
    },
    "items": [
      {
        "name": "AC Filter Replacement",
        "nameAr": "استبدال فلتر المكيف",
        "quantity": 2,
        "unitPrice": "50.00",
        "total": "100.00"
      }
    ],
    "totalAmount": "100.00",
    "status": "pending",
    "notes": "Required parts available",
    "createdAt": "2025-10-29T12:00:00.000Z"
  }
}
```

---

### Approve Quotation (Admin Override)
Approve quotation on behalf of customer.

**Endpoint:** `PUT /api/v2/admin/quotations/:id/approve`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Quotation approved successfully"
}
```

---

### Reject Quotation
Reject a quotation.

**Endpoint:** `PUT /api/v2/admin/quotations/:id/reject`

**Request Body:**
```json
{
  "reason": "Pricing too high"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Quotation rejected successfully"
}
```

---

## Payments Management

### Get All Payments
Retrieve all payment transactions.

**Endpoint:** `GET /api/v2/admin/payments`

**Query Parameters:**
- `status`: Filter by status (pending, completed, failed, refunded) (optional)
- `method`: Filter by payment method (optional)
- `startDate`: Filter from date (optional)
- `endDate`: Filter to date (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payments retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "bookingId": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "amount": "250.00",
      "method": "moyasar",
      "status": "completed",
      "transactionId": "txn_123456",
      "createdAt": "2025-10-29T12:00:00.000Z"
    }
  ]
}
```

---

### Get Payment Details
Retrieve detailed payment information.

**Endpoint:** `GET /api/v2/admin/payments/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment retrieved successfully",
  "data": {
    "id": "uuid",
    "booking": {
      "id": "uuid",
      "ticketNumber": "BK-2025-001"
    },
    "user": {
      "id": "uuid",
      "name": "John Doe"
    },
    "amount": "250.00",
    "method": "moyasar",
    "status": "completed",
    "transactionId": "txn_123456",
    "metadata": {
      "card_last4": "4242",
      "card_brand": "visa"
    },
    "createdAt": "2025-10-29T12:00:00.000Z"
  }
}
```

---

### Process Refund
Process a refund for a payment.

**Endpoint:** `POST /api/v2/admin/payments/:id/refund`

**Request Body:**
```json
{
  "amount": "250.00",
  "reason": "Booking cancelled by customer"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "paymentId": "uuid",
    "refundAmount": "250.00",
    "refundStatus": "processing",
    "refundId": "ref_123456"
  }
}
```

---

## Support Tickets

### Get All Support Tickets
Retrieve all support tickets.

**Endpoint:** `GET /api/v2/admin/support/tickets`

**Query Parameters:**
- `status`: Filter by status (open, in_progress, resolved, closed) (optional)
- `priority`: Filter by priority (low, medium, high, urgent) (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Support tickets retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "ticketNumber": "TKT-2025-001",
      "userId": "uuid",
      "userName": "John Doe",
      "subject": "Issue with AC repair",
      "description": "The AC is not cooling properly",
      "priority": "high",
      "status": "open",
      "rating": null,
      "createdAt": "2025-10-29T12:00:00.000Z"
    }
  ]
}
```

---

### Update Support Ticket
Update ticket status or priority.

**Endpoint:** `PUT /api/v2/admin/support/tickets/:id`

**Request Body:**
```json
{
  "status": "in_progress",
  "priority": "urgent",
  "assigned_to": "admin-user-uuid"
}
```

**Validation:**
- `status`: Optional, one of: open, in_progress, resolved, closed
- `priority`: Optional, one of: low, medium, high, urgent
- `assigned_to`: Optional, UUID of admin user

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Support ticket updated successfully"
}
```

---

### Get Support Ticket Messages
Retrieve all messages for a ticket.

**Endpoint:** `GET /api/v2/admin/support/tickets/:id/messages`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "ticketId": "uuid",
      "sender": {
        "id": "uuid",
        "name": "Admin User",
        "role": "admin"
      },
      "message": "We're looking into your issue",
      "isAdmin": true,
      "created_at": "2025-10-29T12:30:00.000Z"
    }
  ]
}
```

---

### Send Support Message (Admin Reply)
Reply to a support ticket.

**Endpoint:** `POST /api/v2/admin/support/tickets/:id/messages`

**Request Body:**
```json
{
  "message": "We have assigned a technician to your issue"
}
```

**Validation:**
- `message`: Required, minimum 1 character

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "uuid",
    "message": "We have assigned a technician to your issue",
    "created_at": "2025-10-29T13:00:00.000Z"
  }
}
```

---

### Get Support Analytics
Retrieve support ticket analytics and metrics.

**Endpoint:** `GET /api/v2/admin/support/analytics`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Analytics retrieved successfully",
  "data": {
    "totalTickets": 150,
    "averageRating": 4.5,
    "ratingDistribution": {
      "1": 2,
      "2": 5,
      "3": 10,
      "4": 50,
      "5": 83
    },
    "statusCounts": {
      "open": 25,
      "in_progress": 15,
      "resolved": 90,
      "closed": 20
    },
    "averageResponseTime": "2.5 hours",
    "averageResolutionTime": "8 hours"
  }
}
```

---

## Services Management

### Get All Services
Retrieve all services with categories.

**Endpoint:** `GET /api/v2/admin/services`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "AC Maintenance",
      "nameAr": "صيانة المكيفات",
      "category": {
        "id": "cat-uuid",
        "name": "Air Conditioning",
        "nameAr": "تكييف الهواء"
      },
      "description": "Regular AC maintenance",
      "basePrice": "150.00",
      "isActive": true
    }
  ]
}
```

---

### Create Service
Create a new service.

**Endpoint:** `POST /api/v2/admin/services`

**Request Body:**
```json
{
  "name": "AC Installation",
  "name_ar": "تركيب المكيفات",
  "category_id": "cat-uuid",
  "description": "Professional AC installation",
  "description_ar": "تركيب مكيفات احترافي",
  "base_price": "500.00",
  "is_active": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "id": "uuid",
    "name": "AC Installation"
  }
}
```

---

### Update Service
Update service information.

**Endpoint:** `PUT /api/v2/admin/services/:id`

**Request Body:**
```json
{
  "name": "AC Installation & Setup",
  "base_price": "550.00",
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Service updated successfully"
}
```

---

### Delete Service
Soft delete a service.

**Endpoint:** `DELETE /api/v2/admin/services/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

---

## Subscription Packages

### Get All Subscription Packages
Retrieve all subscription packages.

**Endpoint:** `GET /api/v2/admin/subscription-packages`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Subscription packages retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Gold Package",
      "nameAr": "الباقة الذهبية",
      "tier": "gold",
      "price": "1500.00",
      "durationDays": 365,
      "services": [
        {
          "serviceId": "uuid",
          "serviceName": "AC Maintenance",
          "usageLimit": 4
        }
      ],
      "isActive": true
    }
  ]
}
```

---

### Create Subscription Package
Create a new subscription package.

**Endpoint:** `POST /api/v2/admin/subscription-packages`

**Request Body:**
```json
{
  "name": "Platinum Package",
  "name_ar": "الباقة البلاتينية",
  "tier": "platinum",
  "price": "2500.00",
  "duration_days": 365,
  "services": [
    {
      "service_id": "uuid",
      "usage_limit": 6
    }
  ],
  "is_active": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Subscription package created successfully",
  "data": {
    "id": "uuid",
    "name": "Platinum Package"
  }
}
```

---

### Update Subscription Package
Update package details.

**Endpoint:** `PUT /api/v2/admin/subscription-packages/:id`

**Request Body:**
```json
{
  "price": "2800.00",
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Subscription package updated successfully"
}
```

---

### Delete Subscription Package
Delete a subscription package.

**Endpoint:** `DELETE /api/v2/admin/subscription-packages/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Subscription package deleted successfully"
}
```

---

## Promos & Referrals

### Get All Referrals
Retrieve all referral campaigns.

**Endpoint:** `GET /api/v2/admin/referrals`

**Query Parameters:**
- `status`: Filter by status (optional)
- `campaignId`: Filter by campaign (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Referrals retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "inviterId": "uuid",
      "inviterName": "John Doe",
      "inviteeId": "uuid",
      "inviteeName": "Jane Smith",
      "referralCode": "JOHN2025",
      "status": "completed",
      "inviterReward": "50.00",
      "inviteeDiscount": "25.00",
      "completedAt": "2025-10-20T10:00:00.000Z"
    }
  ]
}
```

---

### Get Referral Analytics
Retrieve referral program analytics.

**Endpoint:** `GET /api/v2/admin/referrals/analytics`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Referral analytics retrieved successfully",
  "data": {
    "totalReferrals": 500,
    "completedReferrals": 350,
    "pendingReferrals": 150,
    "totalRewardsDistributed": "17500.00",
    "conversionRate": 70
  }
}
```

---

### Get Referral Campaigns
Retrieve all referral campaigns.

**Endpoint:** `GET /api/v2/admin/referrals/campaigns`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Campaigns retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Summer Referral 2025",
      "inviterReward": "50.00",
      "inviteeDiscount": "25.00",
      "startDate": "2025-06-01T00:00:00.000Z",
      "endDate": "2025-08-31T23:59:59.000Z",
      "isActive": true
    }
  ]
}
```

---

### Create Referral Campaign
Create a new referral campaign.

**Endpoint:** `POST /api/v2/admin/referrals/campaigns`

**Request Body:**
```json
{
  "name": "Winter Referral 2025",
  "inviter_reward": "75.00",
  "invitee_discount": "35.00",
  "start_date": "2025-12-01T00:00:00.000Z",
  "end_date": "2026-02-28T23:59:59.000Z",
  "is_active": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Campaign created successfully",
  "data": {
    "id": "uuid",
    "name": "Winter Referral 2025"
  }
}
```

---

### Update Referral Campaign
Update campaign details.

**Endpoint:** `PUT /api/v2/admin/referrals/campaigns/:id`

**Request Body:**
```json
{
  "inviter_reward": "100.00",
  "invitee_discount": "50.00",
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Campaign updated successfully"
}
```

---

## Marketing & Loyalty

### Coupon Management

#### Create Coupon
Create a new discount coupon.

**Endpoint:** `POST /api/v2/admin/coupons`

**Request Body:**
```json
{
  "code": "WELCOME20",
  "type": "percentage",
  "value": 20.00,
  "description_en": "20% off for new customers",
  "description_ar": "خصم 20% للعملاء الجدد",
  "validFrom": "2025-01-01T00:00:00.000Z",
  "validUntil": "2025-12-31T23:59:59.000Z",
  "maxUsesTotal": 1000,
  "maxUsesPerUser": 1,
  "minOrderAmount": 100.00,
  "maxDiscountAmount": 50.00,
  "serviceIds": ["service-uuid-1", "service-uuid-2"],
  "firstTimeOnly": true,
  "isActive": true
}
```

**Validation:**
- `code`: Required, 3-50 characters, uppercase alphanumeric
- `type`: Required, "percentage" or "fixed_amount"
- `value`: Required, > 0
- `validFrom`: Required, ISO date
- `validUntil`: Optional, ISO date (must be after validFrom)
- `maxUsesTotal`: Optional, > 0
- `maxUsesPerUser`: Optional, > 0
- `minOrderAmount`: Optional, >= 0
- `serviceIds`: Optional, array of service UUIDs
- `firstTimeOnly`: Optional, boolean

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Coupon created successfully",
  "data": {
    "id": "coupon-uuid-1",
    "code": "WELCOME20",
    "type": "percentage",
    "value": 20.00,
    "currentUses": 0,
    "isActive": true,
    "createdAt": "2025-11-02T06:00:00.000Z"
  }
}
```

---

#### Get All Coupons
Retrieve all coupons with filtering.

**Endpoint:** `GET /api/v2/admin/coupons`

**Query Parameters:**
- `status`: "active", "expired", or "all" (default: "all")
- `search`: Search by code or description
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Coupons retrieved successfully",
  "data": {
    "coupons": [...],
    "total": 25,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### Get Coupon Details
Get detailed coupon information with usage statistics.

**Endpoint:** `GET /api/v2/admin/coupons/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Coupon retrieved successfully",
  "data": {
    "id": "coupon-uuid-1",
    "code": "WELCOME20",
    "type": "percentage",
    "value": 20.00,
    "currentUses": 150,
    "maxUsesTotal": 1000,
    "totalDiscountGiven": 1250.50,
    "uniqueUsers": 145,
    "isActive": true
  }
}
```

---

#### Update Coupon
Update an existing coupon.

**Endpoint:** `PUT /api/v2/admin/coupons/:id`

**Request Body:** Same as create (all fields optional)

---

#### Delete Coupon
Soft delete a coupon (marks as inactive).

**Endpoint:** `DELETE /api/v2/admin/coupons/:id`

---

#### Get Coupon Usage
View coupon usage history.

**Endpoint:** `GET /api/v2/admin/coupons/:id/usage`

**Query Parameters:**
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)

---

### Credit Management

#### Add Credits to User
Admin grants promotional credits to a user.

**Endpoint:** `POST /api/v2/admin/credits/add`

**Request Body:**
```json
{
  "userId": "user-uuid-1",
  "amount": 100.00,
  "reason_en": "Promotional credit for loyal customer",
  "reason_ar": "رصيد ترويجي للعميل المخلص",
  "expiresAt": "2025-12-31T23:59:59.000Z"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Credit added successfully",
  "data": {
    "transactionId": "trans-uuid-1",
    "userId": "user-uuid-1",
    "amount": 100.00,
    "newBalance": 150.50,
    "expiresAt": "2025-12-31T23:59:59.000Z"
  }
}
```

---

#### Deduct Credits from User
Admin deducts credits from a user.

**Endpoint:** `POST /api/v2/admin/credits/deduct`

**Request Body:**
```json
{
  "userId": "user-uuid-1",
  "amount": 50.00,
  "reason_en": "Correction for duplicate credit",
  "reason_ar": "تصحيح لرصيد مكرر"
}
```

---

#### View User Credits
Get detailed credit information for any user.

**Endpoint:** `GET /api/v2/admin/credits/users/:userId`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Credit balance retrieved successfully",
  "data": {
    "userId": "user-uuid-1",
    "userName": "Ahmed Ali",
    "userEmail": "ahmed@example.com",
    "available_balance": 150.50,
    "expired_balance": 50.00,
    "expiring_soon": 30.00,
    "expiring_soon_date": "2025-12-01T00:00:00.000Z"
  }
}
```

---

### Loyalty Settings

#### Get Loyalty Settings
Retrieve current loyalty program configuration.

**Endpoint:** `GET /api/v2/admin/loyalty-settings`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Loyalty settings retrieved successfully",
  "data": {
    "welcome_bonus_amount": 20.00,
    "first_booking_bonus_amount": 30.00,
    "referrer_reward_amount": 50.00,
    "referee_reward_amount": 30.00,
    "cashback_percentage": 2.00,
    "credit_expiry_days": 90,
    "max_credit_percentage": 30.00,
    "min_booking_for_credit": 50.00,
    "is_active": true
  }
}
```

---

#### Update Loyalty Settings
Modify loyalty program parameters.

**Endpoint:** `PUT /api/v2/admin/loyalty-settings`

**Request Body:** (all fields optional)
```json
{
  "welcome_bonus_amount": 25.00,
  "cashback_percentage": 3.00,
  "max_credit_percentage": 40.00
}
```

**Validation:**
- All amount fields: >= 0, <= 10000
- `cashback_percentage`: >= 0, <= 50
- `credit_expiry_days`: >= 1, <= 365
- `max_credit_percentage`: >= 0, <= 100

---

## Mobile Content

### Get Home Slider Images
Retrieve all home slider images.

**Endpoint:** `GET /api/v2/admin/mobile-content/slider`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Slider images retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "imageUrl": "https://storage.googleapis.com/...",
      "title": "Summer Special Offers",
      "titleAr": "عروض الصيف الخاصة",
      "link": "/promotions/summer",
      "sortOrder": 1,
      "isActive": true
    }
  ]
}
```

---

### Create Slider Image
Add a new slider image.

**Endpoint:** `POST /api/v2/admin/mobile-content/slider`

**Request Body:**
```json
{
  "image_url": "https://storage.googleapis.com/...",
  "title": "Winter Sale",
  "title_ar": "تخفيضات الشتاء",
  "link": "/promotions/winter",
  "sort_order": 2
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Slider image created successfully",
  "data": {
    "id": "uuid",
    "imageUrl": "https://storage.googleapis.com/..."
  }
}
```

---

### Update Slider Image
Update slider image details.

**Endpoint:** `PUT /api/v2/admin/mobile-content/slider/:id`

**Request Body:**
```json
{
  "title": "Updated Title",
  "sort_order": 1,
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Slider image updated successfully"
}
```

---

### Delete Slider Image
Delete a slider image.

**Endpoint:** `DELETE /api/v2/admin/mobile-content/slider/:id`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Slider image deleted successfully"
}
```

---

### Get Home Banner
Retrieve the home banner.

**Endpoint:** `GET /api/v2/admin/mobile-content/banner`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Banner retrieved successfully",
  "data": {
    "id": "uuid",
    "imageUrl": "https://storage.googleapis.com/...",
    "title": "Special Offer",
    "titleAr": "عرض خاص",
    "link": "/special-offer",
    "isActive": true
  }
}
```

---

### Update Home Banner
Update or create home banner.

**Endpoint:** `PUT /api/v2/admin/mobile-content/banner`

**Request Body:**
```json
{
  "image_url": "https://storage.googleapis.com/...",
  "title": "Limited Time Offer",
  "title_ar": "عرض لفترة محدودة",
  "link": "/limited-offer",
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Banner updated successfully"
}
```

---

## Analytics & Reports

### Get Dashboard Overview
Retrieve overview statistics for admin dashboard.

**Endpoint:** `GET /api/v2/admin/analytics/overview`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Overview retrieved successfully",
  "data": {
    "revenue": {
      "today": "5000.00",
      "thisMonth": "150000.00",
      "lastMonth": "140000.00",
      "growth": 7.14
    },
    "bookings": {
      "pending": 15,
      "inProgress": 25,
      "completed": 500,
      "cancelled": 10
    },
    "users": {
      "totalCustomers": 1500,
      "activeTechnicians": 50,
      "newThisMonth": 75
    },
    "support": {
      "totalTickets": 150,
      "averageRating": 4.5,
      "openTickets": 25,
      "resolvedTickets": 90
    }
  }
}
```

---

### Get Revenue Report
Retrieve detailed revenue report.

**Endpoint:** `GET /api/v2/admin/analytics/revenue`

**Query Parameters:**
- `startDate`: Filter from date (optional)
- `endDate`: Filter to date (optional)
- `groupBy`: Group by day, week, or month (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Revenue report retrieved successfully",
  "data": {
    "total": "150000.00",
    "breakdown": [
      {
        "date": "2025-10-01",
        "revenue": "5000.00",
        "bookings": 20
      }
    ]
  }
}
```

---

### Get Technician Performance Report
Retrieve performance metrics for all technicians.

**Endpoint:** `GET /api/v2/admin/analytics/technicians`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Technician performance retrieved successfully",
  "data": [
    {
      "technicianId": "uuid",
      "technicianName": "Ahmed Al-Rashid",
      "totalJobs": 150,
      "completedJobs": 145,
      "completionRate": 96.67,
      "averageRating": 4.8,
      "totalRevenue": "15000.00"
    }
  ]
}
```

---

## Error Handling

All endpoints follow a consistent error response format:

### Error Response (4xx, 5xx)
```json
{
  "success": false,
  "message": "Error message description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common Error Codes
- `400 Bad Request`: Invalid request data or validation errors
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource or constraint violation
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

---

## Best Practices

1. **Always include Authorization header** with valid JWT token
2. **Set Accept-Language header** for localized responses
3. **Use pagination** for list endpoints when dealing with large datasets
4. **Handle errors gracefully** with proper error messages
5. **Validate input data** on client side before sending requests
6. **Use appropriate HTTP methods** (GET for reading, POST for creating, PUT for updating, DELETE for removing)
7. **Monitor rate limits** to avoid being throttled
8. **Log all admin actions** for audit purposes

---

## Rate Limiting

Admin endpoints have the following rate limits:
- Standard operations: 100 requests per minute
- Bulk operations: 20 requests per minute
- Report generation: 5 requests per minute

Exceeded limits return `429 Too Many Requests` status.

---

## Changelog

### Version 2.0 (October 2025)
- Added support ticket rating system
- Added technician specializations management
- Added support analytics endpoint
- Improved error handling and logging
- Added comprehensive admin endpoints documentation

---

For technical support or questions, contact the development team.
