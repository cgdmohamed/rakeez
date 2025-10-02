export const AUTH_CONSTANTS = {
  // JWT token expiration times (in seconds)
  ACCESS_TOKEN_EXPIRY: 86400, // 24 hours
  REFRESH_TOKEN_EXPIRY: 2592000, // 30 days
  
  // OTP settings
  OTP_EXPIRY: 300, // 5 minutes
  MAX_OTP_ATTEMPTS: 3,
  OTP_RESEND_LIMIT: 3, // Max resends per 5 minutes
  
  // Rate limiting
  LOGIN_RATE_LIMIT: 5, // Max 5 login attempts per 15 minutes
  REGISTER_RATE_LIMIT: 3, // Max 3 registration attempts per hour
  FORGOT_PASSWORD_LIMIT: 3, // Max 3 forgot password requests per hour
  
  // Password requirements
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  
  // Phone number formats
  SAUDI_PHONE_REGEX: /^(\+966|966|0)?[5][0-9]{8}$/,
  INTERNATIONAL_PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  
  // Email validation
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export const PAYMENT_CONSTANTS = {
  // Supported currencies
  SUPPORTED_CURRENCIES: ['SAR', 'USD', 'AED'],
  DEFAULT_CURRENCY: 'SAR',
  
  // VAT settings
  DEFAULT_VAT_RATE: 15, // 15% VAT in Saudi Arabia
  
  // Payment methods
  SUPPORTED_PAYMENT_METHODS: ['wallet', 'moyasar', 'tabby'],
  
  // Moyasar settings
  MOYASAR_CURRENCY: 'SAR',
  MOYASAR_MIN_AMOUNT: 1, // 1 SAR minimum
  MOYASAR_MAX_AMOUNT: 100000, // 100,000 SAR maximum
  
  // Tabby BNPL settings
  TABBY_MIN_AMOUNT: 100, // 100 SAR minimum for BNPL
  TABBY_MAX_AMOUNT: 10000, // 10,000 SAR maximum for BNPL
  TABBY_INSTALLMENTS: 4, // 4 installments
  
  // Wallet settings
  WALLET_MIN_TOPUP: 10, // 10 SAR minimum top-up
  WALLET_MAX_TOPUP: 5000, // 5,000 SAR maximum top-up
  WALLET_MAX_BALANCE: 20000, // 20,000 SAR maximum wallet balance
  
  // Transaction timeouts
  PAYMENT_TIMEOUT_MINUTES: 30,
  AUTHORIZATION_TIMEOUT_DAYS: 7,
};

export const ORDER_CONSTANTS = {
  // Order status flow
  ORDER_STATUSES: [
    'pending',
    'confirmed', 
    'technician_assigned',
    'en_route',
    'in_progress',
    'quotation_pending',
    'completed',
    'cancelled'
  ],
  
  // Service settings
  DEFAULT_SERVICE_DURATION: 120, // 2 hours in minutes
  BOOKING_ADVANCE_HOURS: 2, // Must book at least 2 hours in advance
  MAX_BOOKING_DAYS: 30, // Can book up to 30 days in advance
  
  // Working hours
  WORKING_HOURS_START: 8, // 8 AM
  WORKING_HOURS_END: 20, // 8 PM
  LUNCH_BREAK_START: 12, // 12 PM
  LUNCH_BREAK_END: 13, // 1 PM
  
  // Quotation settings
  QUOTATION_EXPIRY_HOURS: 24, // Quotations expire in 24 hours
  MAX_SPARE_PARTS_PER_QUOTATION: 20,
  
  // Review settings
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_REVIEW_LENGTH: 1000,
};

export const NOTIFICATION_CONSTANTS = {
  // Notification types
  NOTIFICATION_TYPES: [
    'order_update',
    'technician_assigned', 
    'payment_confirmation',
    'promotional',
    'quotation_request'
  ],
  
  // Push notification settings
  MAX_NOTIFICATION_HISTORY: 100,
  NOTIFICATION_RETENTION_DAYS: 30,
  
  // SMS settings
  SMS_RATE_LIMIT: 5, // Max 5 SMS per hour per user
  CRITICAL_STATUS_SMS: ['technician_assigned', 'en_route', 'completed'],
  
  // Push notification platforms
  SUPPORTED_PLATFORMS: ['expo', 'fcm', 'apns'],
  DEFAULT_PLATFORM: 'expo',
};

export const REFERRAL_CONSTANTS = {
  // Referral rewards (in SAR)
  INVITER_REWARD: 50,
  INVITEE_REWARD: 25,
  
  // Referral code settings
  REFERRAL_CODE_LENGTH: 8,
  REFERRAL_CODE_PREFIX: '',
  MAX_REFERRALS_PER_USER: 100,
  
  // Referral status flow
  REFERRAL_STATUSES: ['pending', 'completed', 'rewarded'],
  
  // Conditions for referral completion
  MIN_ORDER_AMOUNT_FOR_REFERRAL: 100, // Invitee must spend at least 100 SAR
  REFERRAL_EXPIRY_DAYS: 365, // Referral links expire in 1 year
};

export const SUPPORT_CONSTANTS = {
  // Ticket statuses
  TICKET_STATUSES: ['open', 'in_progress', 'resolved', 'closed'],
  
  // Ticket priorities
  TICKET_PRIORITIES: ['low', 'medium', 'high', 'urgent'],
  DEFAULT_PRIORITY: 'medium',
  
  // Message settings
  MAX_MESSAGE_LENGTH: 5000,
  MAX_ATTACHMENTS_PER_MESSAGE: 5,
  SUPPORTED_ATTACHMENT_TYPES: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'],
  MAX_ATTACHMENT_SIZE_MB: 10,
  
  // Auto-close settings
  AUTO_RESOLVE_HOURS: 24, // Auto-resolve tickets with no response in 24 hours
  AUTO_CLOSE_DAYS: 7, // Auto-close resolved tickets after 7 days
  
  // FAQ settings
  FAQ_CATEGORIES: ['payment', 'booking', 'services', 'account', 'technical'],
};

export const REDIS_CONSTANTS = {
  // Key prefixes
  OTP_PREFIX: 'otp:',
  SESSION_PREFIX: 'session:',
  RATE_LIMIT_PREFIX: 'rate_limit:',
  WEBHOOK_PREFIX: 'webhook:',
  BLACKLIST_PREFIX: 'blacklist:',
  CACHE_PREFIX: 'cache:',
  QUEUE_PREFIX: 'queue:',
  
  // Default TTL values (in seconds)
  OTP_TTL: 300, // 5 minutes
  SESSION_TTL: 86400, // 24 hours
  RATE_LIMIT_TTL: 900, // 15 minutes
  WEBHOOK_TTL: 86400, // 24 hours
  CACHE_TTL: 3600, // 1 hour
  
  // Queue settings
  QUEUE_TIMEOUT: 10, // 10 seconds blocking timeout
  MAX_QUEUE_SIZE: 10000,
  WEBHOOK_RETRY_ATTEMPTS: 3,
  WEBHOOK_RETRY_DELAY: 60, // 1 minute
};

export const FILE_CONSTANTS = {
  // Upload settings
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  
  // Storage paths
  UPLOAD_PATH: 'uploads/',
  INVOICE_PATH: 'invoices/',
  AVATAR_PATH: 'avatars/',
  ATTACHMENT_PATH: 'attachments/',
  
  // Image processing
  AVATAR_MAX_SIZE: 500, // 500x500 pixels
  THUMBNAIL_SIZE: 150, // 150x150 pixels
  IMAGE_QUALITY: 80, // JPEG quality percentage
};

export const API_CONSTANTS = {
  // API versioning
  CURRENT_VERSION: 'v2',
  SUPPORTED_VERSIONS: ['v1', 'v2'],
  
  // Response formats
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // Headers
  LANGUAGE_HEADER: 'Accept-Language',
  API_KEY_HEADER: 'X-API-Key',
  
  // Rate limiting
  API_RATE_LIMIT: 1000, // 1000 requests per hour per IP
  API_RATE_WINDOW: 3600, // 1 hour window
  
  // Request size limits
  MAX_REQUEST_SIZE_MB: 10,
  MAX_JSON_SIZE_MB: 1,
};

export const VALIDATION_CONSTANTS = {
  // String length limits
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 1000,
  MIN_SUBJECT_LENGTH: 5,
  MAX_SUBJECT_LENGTH: 200,
  
  // Numeric limits
  MIN_PRICE: 1,
  MAX_PRICE: 100000,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 100,
  MIN_STOCK: 0,
  MAX_STOCK: 10000,
  
  // Address validation
  MIN_ADDRESS_LENGTH: 10,
  MAX_ADDRESS_LENGTH: 500,
  
  // Service validation
  MIN_SERVICE_DURATION: 30, // 30 minutes
  MAX_SERVICE_DURATION: 480, // 8 hours
};

export const BUSINESS_CONSTANTS = {
  // Company information
  COMPANY_NAME: 'CleanServe',
  COMPANY_NAME_AR: 'كلين سيرف',
  COMPANY_PHONE: '+966 11 234 5678',
  COMPANY_EMAIL: 'info@cleanserve.sa',
  VAT_NUMBER: '300123456789003',
  
  // Business hours
  BUSINESS_DAYS: [1, 2, 3, 4, 5, 6, 0], // Monday to Sunday
  BUSINESS_HOURS: {
    start: '08:00',
    end: '20:00',
    lunchStart: '12:00',
    lunchEnd: '13:00'
  },
  
  // Service areas (Saudi cities)
  SERVICE_AREAS: [
    'Riyadh',
    'Jeddah', 
    'Dammam',
    'Mecca',
    'Medina',
    'Khobar',
    'Dhahran',
    'Tabuk',
    'Buraidah',
    'Abha'
  ],
  
  // Default locations
  DEFAULT_CITY: 'Riyadh',
  DEFAULT_COORDINATES: {
    lat: 24.7136,
    lng: 46.6753
  },
};

export const WEBHOOK_CONSTANTS = {
  // Webhook event types
  MOYASAR_EVENTS: [
    'payment.paid',
    'payment.failed', 
    'payment.authorized',
    'payment.captured',
    'payment.refunded',
    'payment.voided'
  ],
  
  TABBY_EVENTS: [
    'payment.authorized',
    'payment.captured',
    'payment.closed',
    'payment.rejected',
    'payment.refunded',
    'payment.expired'
  ],
  
  // Webhook processing
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_SECONDS: [60, 300, 900], // 1min, 5min, 15min
  WEBHOOK_TIMEOUT_SECONDS: 30,
  
  // Signature verification
  SIGNATURE_HEADER_MOYASAR: 'x-moyasar-signature',
  SIGNATURE_HEADER_TABBY: 'x-tabby-signature',
  
  // Event storage
  WEBHOOK_RETENTION_DAYS: 30,
  MAX_WEBHOOK_HISTORY: 1000,
};

export const ANALYTICS_CONSTANTS = {
  // Report types
  REPORT_TYPES: [
    'daily',
    'weekly', 
    'monthly',
    'quarterly',
    'yearly'
  ],
  
  // Metrics
  KEY_METRICS: [
    'total_orders',
    'total_revenue',
    'average_order_value',
    'customer_acquisition_cost',
    'customer_lifetime_value',
    'conversion_rate',
    'technician_utilization',
    'service_completion_rate'
  ],
  
  // Dashboard refresh intervals (in minutes)
  DASHBOARD_REFRESH_INTERVAL: 5,
  REPORT_CACHE_TTL: 1440, // 24 hours
  
  // Export formats
  EXPORT_FORMATS: ['json', 'csv', 'pdf'],
};

// Environment-based configuration
export const ENV_CONSTANTS = {
  DEVELOPMENT: {
    LOG_LEVEL: 'debug',
    RATE_LIMIT_ENABLED: false,
    WEBHOOK_VERIFICATION: false,
    SMS_SEND_ENABLED: false,
    EMAIL_SEND_ENABLED: false,
  },
  
  PRODUCTION: {
    LOG_LEVEL: 'info',
    RATE_LIMIT_ENABLED: true,
    WEBHOOK_VERIFICATION: true,
    SMS_SEND_ENABLED: true,
    EMAIL_SEND_ENABLED: true,
  },
  
  TEST: {
    LOG_LEVEL: 'error',
    RATE_LIMIT_ENABLED: false,
    WEBHOOK_VERIFICATION: false,
    SMS_SEND_ENABLED: false,
    EMAIL_SEND_ENABLED: false,
  }
};

// Get environment-specific constants
export const getEnvConstants = () => {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONSTANTS[env.toUpperCase() as keyof typeof ENV_CONSTANTS] || ENV_CONSTANTS.DEVELOPMENT;
};

// Helper functions for constants
export const HELPERS = {
  // Check if amount is valid for payment method
  isValidAmountForPaymentMethod: (amount: number, method: string): boolean => {
    switch (method) {
      case 'moyasar':
        return amount >= PAYMENT_CONSTANTS.MOYASAR_MIN_AMOUNT && 
               amount <= PAYMENT_CONSTANTS.MOYASAR_MAX_AMOUNT;
      case 'tabby':
        return amount >= PAYMENT_CONSTANTS.TABBY_MIN_AMOUNT && 
               amount <= PAYMENT_CONSTANTS.TABBY_MAX_AMOUNT;
      case 'wallet':
        return amount > 0; // No limits for wallet payments
      default:
        return false;
    }
  },
  
  // Check if time slot is within business hours
  isWithinBusinessHours: (time: string): boolean => {
    const [hours] = time.split(':').map(Number);
    const { BUSINESS_HOURS } = BUSINESS_CONSTANTS;
    const startHour = parseInt(BUSINESS_HOURS.start.split(':')[0]);
    const endHour = parseInt(BUSINESS_HOURS.end.split(':')[0]);
    const lunchStart = parseInt(BUSINESS_HOURS.lunchStart.split(':')[0]);
    const lunchEnd = parseInt(BUSINESS_HOURS.lunchEnd.split(':')[0]);
    
    return hours >= startHour && 
           hours < endHour && 
           !(hours >= lunchStart && hours < lunchEnd);
  },
  
  // Generate referral code
  generateReferralCode: (userName: string): string => {
    const prefix = userName.replace(/\s+/g, '').toUpperCase().substring(0, 4);
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${year}${random}`;
  },
  
  // Calculate VAT amount
  calculateVAT: (amount: number, vatRate: number = PAYMENT_CONSTANTS.DEFAULT_VAT_RATE): number => {
    return (amount * vatRate) / 100;
  },
  
  // Format Saudi phone number
  formatSaudiPhone: (phone: string): string => {
    // Remove any non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Add +966 if it doesn't start with +
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('0')) {
        cleaned = '+966' + cleaned.substring(1);
      } else if (cleaned.startsWith('966')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+966' + cleaned;
      }
    }
    
    return cleaned;
  },
  
  // Check if file type is allowed
  isAllowedFileType: (mimeType: string, category: 'image' | 'document'): boolean => {
    const allowedTypes = category === 'image' 
      ? FILE_CONSTANTS.ALLOWED_IMAGE_TYPES 
      : FILE_CONSTANTS.ALLOWED_DOCUMENT_TYPES;
    
    return allowedTypes.includes(mimeType);
  }
};

export default {
  AUTH_CONSTANTS,
  PAYMENT_CONSTANTS,
  ORDER_CONSTANTS,
  NOTIFICATION_CONSTANTS,
  REFERRAL_CONSTANTS,
  SUPPORT_CONSTANTS,
  REDIS_CONSTANTS,
  FILE_CONSTANTS,
  API_CONSTANTS,
  VALIDATION_CONSTANTS,
  BUSINESS_CONSTANTS,
  WEBHOOK_CONSTANTS,
  ANALYTICS_CONSTANTS,
  ENV_CONSTANTS,
  getEnvConstants,
  HELPERS
};
