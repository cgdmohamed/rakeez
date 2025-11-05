# Twilio Configuration Guide

## Overview
Rakeez uses Twilio for SMS-based OTP (One-Time Password) verification and order status notifications. The integration is managed through the **Replit Twilio Connector**, which securely handles API credentials and provides automatic key rotation.

## Setup Status
✅ **Twilio Connector**: Configured via Replit Integration  
✅ **TwilioService**: Updated to use connector authentication  
✅ **OTP Endpoints**: Implemented with rate limiting  
✅ **SMS Templates**: Bilingual (Arabic/English) support  

## Architecture

### Authentication Method
The Twilio integration uses **API Key Authentication** (recommended by Twilio) instead of Account SID + Auth Token for enhanced security:

```typescript
// Credentials are fetched dynamically from Replit Connector
const credentials = {
  accountSid: 'ACxxxx',           // From connector settings
  apiKey: 'SKxxxx',               // From connector settings  
  apiKeySecret: 'xxxxx',          // From connector settings
  phoneNumber: '+966xxxxxxxxx'     // From connector settings
}
```

### Service Location
- **Implementation**: `server/services/twilio.ts`
- **Routes**: `server/routes.ts` (OTP endpoints)
- **Storage**: `server/services/redis.ts` (OTP caching)

## Features

### 1. OTP Verification System
**Endpoints:**
- `POST /api/v2/auth/verify-otp` - Verify OTP code (5 attempts per 5 minutes)
- `POST /api/v2/auth/resend-otp` - Resend OTP code (3 attempts per 5 minutes)

**OTP Configuration** (`server/utils/constants.ts`):
```typescript
OTP_EXPIRY: 300,              // 5 minutes
MAX_OTP_ATTEMPTS: 3,          // Max verification attempts
OTP_RESEND_LIMIT: 3,          // Max resends per 5 minutes
```

**SMS Templates:**
- **Arabic**: `رمز التحقق الخاص بك هو: {otp}. صالح لمدة 5 دقائق.`
- **English**: `Your verification code is: {otp}. Valid for 5 minutes.`

### 2. Password Reset OTP
**SMS Templates:**
- **Arabic**: `رمز إعادة تعيين كلمة المرور: {otp}. صالح لمدة 10 دقائق.`
- **English**: `Your password reset code is: {otp}. Valid for 10 minutes.`

### 3. Order Status Notifications
**Supported Statuses:**
- `confirmed` - Order confirmed
- `en_route` - Technician on the way
- `in_progress` - Service in progress
- `completed` - Service completed

**SMS Template:**
- **Arabic**: `تحديث الطلب {orderNumber}: {statusText}`
- **English**: `Order {orderNumber} update: {statusText}`

## Phone Number Formatting

The system automatically formats Saudi phone numbers to E.164 format:

```typescript
// Input formats supported:
'05xxxxxxxx'    → '+9665xxxxxxxx'
'5xxxxxxxx'     → '+9665xxxxxxxx'
'966xxxxxxxxx'  → '+966xxxxxxxxx'
'+966xxxxxxxxx' → '+966xxxxxxxxx' (already valid)
```

**Validation Regex**: `/^\+966[0-9]{9}$/`

## Rate Limiting

### OTP Endpoints
| Endpoint | Limit | Window | Key |
|----------|-------|--------|-----|
| `/api/v2/auth/verify-otp` | 5 requests | 5 minutes | IP address |
| `/api/v2/auth/resend-otp` | 3 requests | 5 minutes | IP address |

### OTP Attempts
- **Max verification attempts**: 3 per OTP code
- **Auto-deletion**: OTP is deleted after max attempts
- **Tracking**: Redis stores attempt count per identifier

## Testing Guide

### Prerequisites
1. ✅ Twilio Connector is set up in Replit
2. ✅ Twilio account has a verified phone number
3. ✅ Twilio phone number is configured in connector settings

### Test Scenarios

#### 1. Registration Flow with OTP
```bash
# Step 1: Register new user
curl -X POST http://localhost:5000/api/v2/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+966501234567",
    "password": "SecurePass123!",
    "name": "Ahmed Ali",
    "language": "ar"
  }'

# Expected: SMS sent with 6-digit OTP

# Step 2: Verify OTP
curl -X POST http://localhost:5000/api/v2/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+966501234567",
    "otp_code": "123456",
    "language": "ar"
  }'

# Expected: JWT tokens returned, user marked as verified
```

#### 2. OTP Resend
```bash
curl -X POST http://localhost:5000/api/v2/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "+966501234567",
    "language": "en"
  }'

# Expected: New OTP sent, previous OTP invalidated
```

#### 3. Invalid OTP Attempts
```bash
# Try wrong OTP 3 times
for i in {1..3}; do
  curl -X POST http://localhost:5000/api/v2/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d '{
      "identifier": "+966501234567",
      "otp_code": "999999",
      "language": "en"
    }'
done

# Expected: After 3rd attempt, OTP is deleted
```

#### 4. Order Status Notification
```bash
# Simulate order status update (admin endpoint)
curl -X PATCH http://localhost:5000/api/admin/bookings/{bookingId} \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "en_route"
  }'

# Expected: SMS sent to customer's phone
```

### Manual Testing Checklist

- [ ] **Registration**: User receives SMS with OTP in correct language
- [ ] **OTP Verification**: Valid OTP code authenticates user successfully
- [ ] **Rate Limiting**: Exceeding rate limits returns 429 status
- [ ] **Expiry**: OTP expires after 5 minutes
- [ ] **Max Attempts**: OTP is deleted after 3 failed verification attempts
- [ ] **Resend**: New OTP invalidates previous one
- [ ] **Phone Formatting**: Various phone formats are correctly normalized
- [ ] **Bilingual**: SMS messages respect user's language preference
- [ ] **Order Updates**: Customers receive order status notifications

## Troubleshooting

### Common Issues

#### 1. SMS Not Received
**Possible Causes:**
- Twilio connector not properly configured
- Invalid phone number format
- Twilio account has insufficient credits
- Phone number not verified in trial account

**Debug Steps:**
```bash
# Check logs for Twilio errors
grep "Failed to send OTP" /tmp/logs/*

# Verify phone number formatting
# Phone should be in E.164 format: +966xxxxxxxxx
```

#### 2. "Twilio not connected" Error
**Solution:**
- Verify Replit Twilio Connector is set up
- Check that connector has valid API credentials
- Restart the workflow to refresh connector credentials

#### 3. Rate Limit Errors
**Solution:**
- Wait for the rate limit window to expire
- For development, disable rate limiting in `server/utils/constants.ts`:
```typescript
ENV_CONSTANTS.DEVELOPMENT.RATE_LIMIT_ENABLED = false
```

#### 4. OTP Expired
**Behavior:**
- OTP is valid for 5 minutes
- After expiration, user must request a new OTP via resend endpoint

### Development Mode

**Rate Limiting**:  
Rate limiting can be disabled in development mode via `server/utils/constants.ts`:
```typescript
ENV_CONSTANTS.DEVELOPMENT.RATE_LIMIT_ENABLED = false
```

**SMS Sending**:  
SMS messages will be sent to real phone numbers in all environments when Twilio connector is configured. For development testing:
- Use your own verified phone number
- Check Twilio console for message delivery logs
- Monitor application logs for Twilio error codes via structured logging

**Debug Logging**:  
All SMS operations log detailed information including:
- Successful sends: `OTP sent to {phone}: {twilioSid}`
- Authentication failures: Automatically clears cached credentials
- General errors: Logs Twilio error codes for troubleshooting

## Security Considerations

### 1. Credential Management
✅ API keys managed by Replit Connector (not in environment variables)  
✅ Credentials cached in memory to reduce API calls  
✅ Automatic key rotation supported by connector  
✅ Cache invalidation on authentication failures (401/403 errors)  
✅ Structured logging with Twilio error codes for diagnostics  

### 2. Rate Limiting
✅ IP-based rate limiting on OTP endpoints  
✅ Per-identifier attempt tracking  
✅ Exponential backoff recommended for clients  

### 3. OTP Security
✅ 6-digit random codes (1 million combinations)  
✅ 5-minute expiry window  
✅ Max 3 verification attempts  
✅ Stored in Redis with TTL  
✅ Deleted after successful verification  

### 4. Phone Number Validation
✅ Saudi phone number format validation  
✅ E.164 international format enforcement  
✅ Input sanitization to prevent injection  

## Production Checklist

Before deploying to production:

- [ ] **Twilio Account**: Upgrade from trial to paid account
- [ ] **Phone Number**: Purchase and verify production Twilio phone number
- [ ] **SMS Templates**: Review and test all bilingual templates
- [ ] **Rate Limits**: Verify rate limits are appropriate for production traffic
- [ ] **Error Handling**: Ensure graceful fallback when SMS fails
- [ ] **Monitoring**: Set up alerts for SMS delivery failures
- [ ] **Cost Management**: Configure spending limits in Twilio dashboard
- [ ] **Compliance**: Ensure SMS content complies with Saudi regulations
- [ ] **Opt-out**: Implement SMS opt-out mechanism if required

## Cost Estimation

**Twilio SMS Pricing (Saudi Arabia):**
- Outbound SMS: ~$0.05 per message
- Expected usage:
  - Registration OTP: 1 SMS per new user
  - Password reset: 1 SMS per reset request
  - Order updates: 2-4 SMS per booking (avg)

**Monthly estimate** (for 1000 active users):
- 200 new registrations: $10
- 50 password resets: $2.50
- 1000 bookings × 3 SMS avg: $150
- **Total**: ~$162.50/month

## Support Resources

- **Twilio Documentation**: https://www.twilio.com/docs/sms
- **Replit Connector Guide**: Check Replit integrations panel
- **API Status**: https://status.twilio.com/
- **Saudi SMS Regulations**: https://www.citc.gov.sa/

## Configuration Summary

```typescript
// Constants defined in server/utils/constants.ts
AUTH_CONSTANTS = {
  OTP_EXPIRY: 300,           // 5 minutes
  MAX_OTP_ATTEMPTS: 3,       // Max verification attempts
  OTP_RESEND_LIMIT: 3,       // Max resends per 5 minutes
}

NOTIFICATION_CONSTANTS = {
  SMS_RATE_LIMIT: 5,         // Max 5 SMS per hour per user
  CRITICAL_STATUS_SMS: [     // Auto-send SMS for these statuses
    'technician_assigned',
    'en_route',
    'completed'
  ]
}
```

## Next Steps

1. **Test in Development**: Use the testing scenarios above
2. **Review SMS Templates**: Ensure translations are accurate
3. **Configure Monitoring**: Set up alerts for delivery failures
4. **Load Testing**: Test rate limits with realistic traffic
5. **Production Deploy**: Follow the production checklist
