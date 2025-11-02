import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { storage } from "./storage";
import { bilingual } from "./utils/bilingual";
import { redisService } from "./services/redis";
import { twilioService } from "./services/twilio";
import { tabbyService } from "./services/tabby";
import { moyasarService } from "./services/moyasar";
import { emailService } from "./services/email";
import { pdfService } from "./services/pdf";
import { notificationService } from "./services/notification";
import { authenticateToken, authorizeRoles, rateLimitByIP } from "./middleware/auth";
import { validateRequest, passwordSchema } from "./middleware/validation";
import { auditLog } from "./utils/audit";
import { generateToken, generateRefreshToken } from "./utils/jwt";
import { verifyMoyasarSignature, verifyTabbySignature } from "./utils/webhook";
import { logError, logApiError } from "./utils/logger";
import { sanitizeInput } from "./utils/sanitization";
import { validateFile, detectMimeType, FILE_VALIDATION_PRESETS } from "./utils/fileValidation";
import { requestTimingMiddleware, getSystemHealth, getPerformanceSummary } from "./utils/performance";
import { PaymentTransactions } from "./utils/transactions";
import { websocketService } from "./services/websocket";
import { AssignmentService } from "./services/assignmentService";
import bcrypt from "bcrypt";
import { z } from "zod";
import { 
  AUTH_CONSTANTS, 
  PAYMENT_CONSTANTS, 
  ORDER_CONSTANTS, 
  REFERRAL_CONSTANTS,
  HELPERS 
} from "./utils/constants";
import { VALID_PERMISSIONS } from "@shared/permissions";
import * as referralController from "./controllers/referralController";
import { db } from "./db";
import { bookings, payments, users, insertSubscriptionSchema, subscriptionPackages, serviceTiers, subscriptionPackageServices, services, subscriptions, addresses, quotations, notificationSettings, appConfig } from "@shared/schema";
import { eq, desc, and, gte, lte, sql, asc } from "drizzle-orm";

const app = express();

// HTTPS Enforcement for Production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = req.header('x-forwarded-proto');
    if (proto && proto !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow Vite in dev
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin resources
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny', // Prevent clickjacking
  },
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true, // Enable XSS filter
}));

// Middleware - Secure CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:5000',
      'http://localhost:3000',
      'https://rakeez.sa',
      'https://www.rakeez.sa',
      'https://admin.rakeez.sa'
    ];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400 // 24 hours
}));

// Request size limits to prevent DoS attacks
app.use(express.json({ 
  limit: '1mb', // Limit JSON payload to 1MB
  verify: (req, res, buf) => {
    req.rawBody = buf; // Store raw body for webhook signature verification
  }
}));
app.use(express.urlencoded({ 
  extended: true,
  limit: '1mb' // Limit URL-encoded data to 1MB
}));

// Response compression for better performance
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses for EventSource/Server-Sent Events
    if (req.headers['accept'] === 'text/event-stream') {
      return false;
    }
    // Use default compression filter
    return compression.filter(req, res);
  },
  level: 6, // Compression level (0-9, 6 is default balance)
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Performance monitoring middleware
app.use(requestTimingMiddleware);

// Rate limiting middleware
const rateLimit = async (req: any, res: any, next: any) => {
  const key = `rate_limit:${req.ip}`;
  const { allowed } = await redisService.checkRateLimit(key, 1000, 3600); // 1000 requests per hour
  
  if (!allowed) {
    return res.status(429).json({
      success: false,
      message: bilingual.getMessage('auth.rate_limit_exceeded', req.headers['accept-language']),
    });
  }
  
  next();
};

app.use('/api', rateLimit);

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ==================== AUTH & ONBOARDING ENDPOINTS ====================
  
  // Register
  app.post('/api/v2/auth/register', 
    rateLimitByIP(3, 3600), // 3 attempts per hour
    validateRequest({
    body: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      password: passwordSchema, // Strong password policy
      name: z.string().min(2),
      name_ar: z.string().optional(),
      language: z.enum(['en', 'ar']).default('en'),
      device_token: z.string().optional(),
    }).refine(data => data.email || data.phone, {
      message: "Either email or phone is required"
    })
  }), async (req: any, res: any) => {
    try {
      const { email, phone, password, name, name_ar, language, device_token } = req.body;
      const identifier = email || phone;
      
      // Check if user exists
      const existingUser = email 
        ? await storage.getUserByEmail(email)
        : await storage.getUserByPhone(phone!);
        
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('auth.user_already_exists', language),
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        email,
        phone: phone ? HELPERS.formatSaudiPhone(phone) : undefined,
        password: hashedPassword,
        name,
        nameAr: name_ar,
        language,
        deviceToken: device_token,
      });
      
      // Generate and send OTP
      const otp = twilioService.generateOTP();
      const otpKey = phone || email!;
      await redisService.setOTP(otpKey, otp, AUTH_CONSTANTS.OTP_EXPIRY);
      
      let otpSent = false;
      if (phone) {
        otpSent = await twilioService.sendOTP(phone, otp, language);
      } else if (email) {
        otpSent = await emailService.sendOTPEmail(email, otp, language, name);
      }
      
      await auditLog({
        userId: user.id,
        action: 'user_registered',
        resourceType: 'user',
        resourceId: user.id,
        newValues: { email, phone, name }
      });
      
      res.status(201).json({
        success: true,
        message: otpSent 
          ? bilingual.getMessage('auth.user_created_verify_otp', language)
          : bilingual.getMessage('auth.user_created_otp_failed', language),
        data: {
          user_id: user.id,
          requires_verification: true,
          verification_method: phone ? 'phone' : 'email'
        }
      });
      
    } catch (error) {
      logApiError('Registration error', error, req, { identifier: req.body.email || req.body.phone });
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', req.body.language),
      });
    }
  });
  
  // Login
  app.post('/api/v2/auth/login', 
    rateLimitByIP(5, 900), // 5 attempts per 15 minutes
    validateRequest({
    body: z.object({
      identifier: z.string().min(1),
      password: z.string().min(1),
      language: z.enum(['en', 'ar']).default('en'),
    })
  }), async (req: any, res: any) => {
    try {
      const { identifier, password, language } = req.body;
      
      // Find user by email or phone
      const user = identifier.includes('@')
        ? await storage.getUserByEmail(identifier)
        : await storage.getUserByPhone(HELPERS.formatSaudiPhone(identifier));
        
      if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({
          success: false,
          message: bilingual.getMessage('auth.invalid_credentials', language),
        });
      }
      
      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          message: bilingual.getMessage('auth.account_not_verified', language),
        });
      }
      
      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      
      // Store session in Redis
      await redisService.setSession(user.id, token, AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY);
      
      await auditLog({
        userId: user.id,
        action: 'user_login',
        resourceType: 'user',
        resourceId: user.id,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('auth.login_successful', language),
        data: {
          access_token: token,
          refresh_token: refreshToken,
          expires_in: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            language: user.language,
          }
        }
      });
      
    } catch (error) {
      logApiError('Login error', error, req, { identifier: req.body.identifier });
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', req.body.language),
      });
    }
  });
  
  // Verify OTP
  app.post('/api/v2/auth/verify-otp', 
    rateLimitByIP(5, 300), // 5 attempts per 5 minutes
    validateRequest({
    body: z.object({
      identifier: z.string().min(1),
      otp_code: z.string().length(6),
      language: z.enum(['en', 'ar']).default('en'),
    })
  }), async (req: any, res: any) => {
    try {
      const { identifier, otp_code, language } = req.body;
      
      // Check OTP attempts
      const attempts = await redisService.getOTPAttempts(identifier);
      if (attempts >= AUTH_CONSTANTS.MAX_OTP_ATTEMPTS) {
        return res.status(429).json({
          success: false,
          message: bilingual.getMessage('auth.otp_max_attempts', language),
        });
      }
      
      // Get stored OTP
      const storedOTP = await redisService.getOTP(identifier);
      if (!storedOTP) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('auth.otp_expired', language),
        });
      }
      
      if (storedOTP !== otp_code) {
        await redisService.incrementOTPAttempts(identifier);
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('auth.otp_invalid', language),
        });
      }
      
      // Find and verify user
      const user = identifier.includes('@')
        ? await storage.getUserByEmail(identifier)
        : await storage.getUserByPhone(HELPERS.formatSaudiPhone(identifier));
        
      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('auth.user_not_found', language),
        });
      }
      
      // Update user as verified
      await storage.updateUser(user.id, { isVerified: true });
      
      // Clean up OTP
      await redisService.deleteOTP(identifier);
      
      // Generate tokens
      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);
      
      await auditLog({
        userId: user.id,
        action: 'otp_verified',
        resourceType: 'user',
        resourceId: user.id,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('auth.verification_successful', language),
        data: {
          token,
          refresh_token: refreshToken,
          expires_in: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            language: user.language,
          }
        }
      });
      
    } catch (error) {
      logApiError('OTP verification error', error, req);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', req.body.language),
      });
    }
  });
  
  // Resend OTP
  app.post('/api/v2/auth/resend-otp', 
    rateLimitByIP(3, 300), // 3 attempts per 5 minutes
    validateRequest({
    body: z.object({
      identifier: z.string().min(1),
      language: z.enum(['en', 'ar']).default('en'),
    })
  }), async (req: any, res: any) => {
    try {
      const { identifier, language } = req.body;
      
      // Generate new OTP
      const otp = twilioService.generateOTP();
      await redisService.setOTP(identifier, otp, AUTH_CONSTANTS.OTP_EXPIRY);
      
      let otpSent = false;
      if (identifier.includes('@')) {
        const user = await storage.getUserByEmail(identifier);
        if (user) {
          otpSent = await emailService.sendOTPEmail(identifier, otp, language, user.name);
        }
      } else {
        otpSent = await twilioService.sendOTP(HELPERS.formatSaudiPhone(identifier), otp, language);
      }
      
      res.json({
        success: true,
        message: otpSent 
          ? bilingual.getMessage('auth.otp_resent', language)
          : bilingual.getMessage('auth.otp_send_failed', language),
      });
      
    } catch (error) {
      logApiError('Resend OTP error', error, req);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', req.body.language),
      });
    }
  });
  
  // ==================== PROFILE & ACCOUNT ENDPOINTS ====================
  
  // Get Profile
  app.get('/api/v2/profile', authenticateToken, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.user.id);
      const language = req.headers['accept-language'] || user?.language || 'en';
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('auth.user_not_found', language),
        });
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('profile.retrieved_successfully', language),
        data: {
          id: user.id,
          name: user.name,
          name_ar: user.nameAr,
          email: user.email,
          phone: user.phone,
          language: user.language,
          avatar: user.avatar,
          role: user.role,
          created_at: user.createdAt,
        }
      });
      
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Update Profile
  app.put('/api/v2/profile', authenticateToken, validateRequest({
    body: z.object({
      name: z.string().min(2).optional(),
      name_ar: z.string().optional(),
      language: z.enum(['en', 'ar']).optional(),
      device_token: z.string().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const updates = req.body;
      const user = await storage.getUser(req.user.id);
      const language = req.headers['accept-language'] || user?.language || 'en';
      
      const updatedUser = await storage.updateUser(req.user.id, updates);
      
      await auditLog({
        userId: req.user.id,
        action: 'profile_updated',
        resourceType: 'user',
        resourceId: req.user.id,
        oldValues: user,
        newValues: updates,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('profile.updated_successfully', language),
        data: updatedUser,
      });
      
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Change Password
  app.put('/api/v2/auth/change-password', 
    authenticateToken, 
    rateLimitByIP(5, 900), // 5 attempts per 15 minutes
    validateRequest({
      body: z.object({
        current_password: z.string().min(1, 'Current password is required'),
        new_password: passwordSchema, // Strong password validation
      })
    }), 
    async (req: any, res: any) => {
      try {
        const userId = req.user.id;
        const { current_password, new_password } = req.body;
        const user = await storage.getUser(userId);
        const language = req.headers['accept-language'] || user?.language || 'en';
        
        if (!user) {
          return res.status(404).json({
            success: false,
            message: bilingual.getMessage('auth.user_not_found', language),
          });
        }
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(current_password, user.password);
        if (!isValidPassword) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('auth.invalid_current_password', language),
          });
        }
        
        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);
        
        // Update password
        await storage.updateUser(userId, { password: hashedPassword });
        
        await auditLog({
          userId: userId,
          action: 'password_changed',
          resourceType: 'user',
          resourceId: userId,
        });
        
        console.log(`User ${userId} changed password successfully`);
        
        res.json({
          success: true,
          message: bilingual.getMessage('auth.password_changed_successfully', language),
        });
        
      } catch (error) {
        logApiError('Change password error', error, req, { userId: req.user?.id });
        res.status(500).json({
          success: false,
          message: bilingual.getMessage('general.server_error', 'en'),
        });
      }
    }
  );

  // Get Notification Settings
  app.get('/api/v2/profile/notifications', authenticateToken, async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const language = req.headers['accept-language'] || 'en';
      
      // Get or create notification settings with upsert logic
      let [settings] = await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId));
      
      if (!settings) {
        // Create default settings with idempotent handling
        try {
          [settings] = await db.insert(notificationSettings).values({
            userId: userId,
          }).returning();
        } catch (insertError: any) {
          // Handle race condition - another request created the record
          if (insertError.code === '23505') { // unique_violation
            [settings] = await db.select().from(notificationSettings).where(eq(notificationSettings.userId, userId));
          } else {
            throw insertError;
          }
        }
      }
      
      const messages = bilingual.getBilingual('profile.notification_settings_retrieved');
      res.json({
        success: true,
        message: messages.en,
        message_ar: messages.ar,
        data: {
          push_enabled: settings.pushNotifications,
          email_enabled: settings.emailNotifications,
          sms_enabled: settings.smsNotifications,
          preferences: {
            order_updates: settings.orderUpdates,
            promotions: settings.promotions,
            support_updates: settings.technicianMessages,
            payment_confirmations: settings.paymentNotifications,
            wallet_updates: settings.walletUpdates,
            subscription_reminders: settings.subscriptionReminders,
          }
        }
      });
      
    } catch (error) {
      console.error('Get notification settings error:', error);
      const errorMessages = bilingual.getBilingual('general.server_error');
      res.status(500).json({
        success: false,
        message: errorMessages.en,
        message_ar: errorMessages.ar,
      });
    }
  });

  // Update Notification Settings
  app.put('/api/v2/profile/notifications', authenticateToken, validateRequest({
    body: z.object({
      push_enabled: z.boolean().optional(),
      email_enabled: z.boolean().optional(),
      sms_enabled: z.boolean().optional(),
      preferences: z.object({
        order_updates: z.boolean().optional(),
        promotions: z.boolean().optional(),
        support_updates: z.boolean().optional(),
        payment_confirmations: z.boolean().optional(),
        wallet_updates: z.boolean().optional(),
        subscription_reminders: z.boolean().optional(),
      }).optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const language = req.headers['accept-language'] || 'en';
      const { push_enabled, email_enabled, sms_enabled, preferences } = req.body;
      
      // Build update object
      const updates: any = {};
      if (push_enabled !== undefined) updates.pushNotifications = push_enabled;
      if (email_enabled !== undefined) updates.emailNotifications = email_enabled;
      if (sms_enabled !== undefined) updates.smsNotifications = sms_enabled;
      if (preferences?.order_updates !== undefined) updates.orderUpdates = preferences.order_updates;
      if (preferences?.promotions !== undefined) updates.promotions = preferences.promotions;
      if (preferences?.support_updates !== undefined) updates.technicianMessages = preferences.support_updates;
      if (preferences?.payment_confirmations !== undefined) updates.paymentNotifications = preferences.payment_confirmations;
      if (preferences?.wallet_updates !== undefined) updates.walletUpdates = preferences.wallet_updates;
      if (preferences?.subscription_reminders !== undefined) updates.subscriptionReminders = preferences.subscription_reminders;
      updates.updatedAt = new Date();
      
      // Upsert notification settings
      await db.insert(notificationSettings).values({
        userId: userId,
        ...updates,
      }).onConflictDoUpdate({
        target: notificationSettings.userId,
        set: updates,
      });
      
      const messages = bilingual.getBilingual('notifications.settings_updated');
      res.json({
        success: true,
        message: messages.en,
        message_ar: messages.ar,
        data: {
          push_enabled: push_enabled ?? true,
          preferences_updated: Object.keys(preferences || {}).length,
        }
      });
      
    } catch (error) {
      console.error('Update notification settings error:', error);
      const errorMessages = bilingual.getBilingual('general.server_error');
      res.status(500).json({
        success: false,
        message: errorMessages.en,
        message_ar: errorMessages.ar,
      });
    }
  });
  
  // Get Addresses
  app.get('/api/v2/addresses', authenticateToken, async (req: any, res: any) => {
    try {
      const addresses = await storage.getUserAddresses(req.user.id);
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('addresses.retrieved_successfully', language),
        data: addresses,
      });
      
    } catch (error) {
      console.error('Get addresses error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Create Address
  app.post('/api/v2/addresses', authenticateToken, validateRequest({
    body: z.object({
      addressName: z.string().min(1, 'Address name is required'),
      addressType: z.enum(['home', 'office', 'other']).default('home'),
      streetName: z.string().min(1, 'Street name is required'),
      houseNo: z.string().min(1, 'House number is required'),
      district: z.string().min(1, 'District is required'),
      directions: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      isDefault: z.boolean().default(false),
    })
  }), async (req: any, res: any) => {
    try {
      const addressData = { ...req.body, userId: req.user.id };
      const address = await storage.createAddress(addressData);
      const language = req.headers['accept-language'] || 'en';
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('addresses.created_successfully', language),
        data: address,
      });
      
    } catch (error) {
      console.error('Create address error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Update Address
  app.put('/api/v2/addresses/:id', authenticateToken, validateRequest({
    body: z.object({
      addressName: z.string().min(1).optional(),
      addressType: z.enum(['home', 'office', 'other']).optional(),
      streetName: z.string().min(1).optional(),
      houseNo: z.string().min(1).optional(),
      district: z.string().min(1).optional(),
      directions: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      isDefault: z.boolean().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const address = await storage.updateAddress(id, updates);
      
      res.json({
        success: true,
        message: bilingual.getMessage('addresses.updated_successfully', language),
        data: address,
      });
      
    } catch (error) {
      console.error('Update address error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('addresses.update_failed', 'en'),
      });
    }
  });
  
  // Delete Address
  app.delete('/api/v2/addresses/:id', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      await storage.deleteAddress(id);
      
      res.json({
        success: true,
        message: bilingual.getMessage('addresses.deleted_successfully', language),
      });
      
    } catch (error) {
      console.error('Delete address error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('addresses.delete_failed', 'en'),
      });
    }
  });
  
  // Get Wallet
  app.get('/api/v2/wallet', authenticateToken, async (req: any, res: any) => {
    try {
      const wallet = await storage.getWallet(req.user.id);
      const transactions = await storage.getWalletTransactions(req.user.id, 10);
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('wallet.retrieved_successfully', language),
        data: {
          balance: wallet?.balance || '0.00',
          currency: 'SAR',
          total_earned: wallet?.totalEarned || '0.00',
          total_spent: wallet?.totalSpent || '0.00',
          recent_transactions: transactions,
        }
      });
      
    } catch (error) {
      console.error('Get wallet error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Wallet Top-up
  app.post('/api/v2/wallet/topup', authenticateToken, validateRequest({
    body: z.object({
      amount: z.number().min(PAYMENT_CONSTANTS.WALLET_MIN_TOPUP),
      payment_method: z.enum(['moyasar', 'tabby']),
      payment_source: z.object({
        type: z.string(),
        // Add other payment source fields as needed
      }),
    })
  }), async (req: any, res: any) => {
    try {
      const { amount, payment_method, payment_source } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Create payment for top-up
      let paymentResult;
      if (payment_method === 'moyasar') {
        paymentResult = await moyasarService.createPayment({
          amount: amount * 100, // Convert to halalas
          currency: 'SAR',
          description: `Wallet top-up - ${amount} SAR`,
          source: payment_source,
          metadata: {
            user_id: req.user.id,
            type: 'wallet_topup'
          }
        });
      } else if (payment_method === 'tabby') {
        // Implement Tabby top-up logic
        paymentResult = { success: false, error: 'Tabby not supported for top-up' };
      }
      
      if (paymentResult && paymentResult.success) {
        // Update wallet balance
        const transaction = await storage.updateWalletBalance(
          req.user.id,
          amount,
          'credit',
          `Wallet top-up via ${payment_method}`,
          'topup',
          paymentResult.payment_id
        );
        
        res.json({
          success: true,
          message: bilingual.getMessage('wallet.topup_successful', language),
          data: {
            transaction_id: transaction.id,
            old_balance: transaction.balanceBefore,
            new_balance: transaction.balanceAfter,
            amount: transaction.amount,
            payment_id: paymentResult.payment_id,
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: bilingual.getMessage('payment.creation_failed', language),
          error: paymentResult?.error || 'Payment method not specified',
        });
      }
      
    } catch (error) {
      console.error('Wallet topup error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // ==================== REFERRAL SYSTEM ENDPOINTS ====================
  
  // Validate Referral Code
  app.post('/api/v2/referrals/validate', referralController.validateReferralCode);
  
  // Redeem Referral Code
  app.post('/api/v2/referrals/redeem', authenticateToken, referralController.redeemReferralCode);
  
  // Get Referral Stats
  app.get('/api/v2/referrals/stats', authenticateToken, referralController.getReferralStats);

  // Get Referral Share Link
  app.get('/api/v2/referrals/share-link', authenticateToken, async (req: any, res: any) => {
    try {
      const user = await storage.getUser(req.user.id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!user || !user.referralCode) {
        const messages = bilingual.getBilingual('referral.code_not_found');
        return res.status(404).json({
          success: false,
          message: messages.en,
          message_ar: messages.ar,
        });
      }
      
      const referralCode = user.referralCode;
      const shareLink = `https://rakeez.sa/ref/${referralCode}`;
      const shortLink = `https://rkz.sa/r/${referralCode}`;
      const qrCodeUrl = `https://api.rakeez.sa/qr/${referralCode}.png`;
      
      const messages = bilingual.getBilingual('referral.link_generated');
      res.json({
        success: true,
        message: messages.en,
        message_ar: messages.ar,
        data: {
          referral_code: referralCode,
          share_link: shareLink,
          short_link: shortLink,
          qr_code_url: qrCodeUrl,
          share_message: `Join Rakeez using my code ${referralCode} and get 10% off your first booking!`,
          share_message_ar: `انضم إلى راكز باستخدام كودي ${referralCode} واحصل على خصم 10٪ على أول حجز!`,
          reward_amount: 30.00,
          friend_discount: '10%',
          valid_until: '2025-12-31T23:59:59.000Z',
        }
      });
      
    } catch (error) {
      console.error('Get referral share link error:', error);
      const errorMessages = bilingual.getBilingual('general.server_error');
      res.status(500).json({
        success: false,
        message: errorMessages.en,
        message_ar: errorMessages.ar,
      });
    }
  });
  
  // Admin: Get user referral stats
  app.get('/api/v2/admin/users/:userId/referrals', authenticateToken, authorizeRoles(['admin']), referralController.getAdminUserReferralStats);
  
  // Admin: Get all referrals
  app.get('/api/v2/admin/referrals', authenticateToken, authorizeRoles(['admin']), referralController.getAdminReferrals);
  
  // Admin: Get referral analytics
  app.get('/api/v2/admin/referrals/analytics', authenticateToken, authorizeRoles(['admin']), referralController.getReferralAnalytics);
  
  // Admin: Create campaign
  app.post('/api/v2/admin/referrals/campaigns', authenticateToken, authorizeRoles(['admin']), referralController.createCampaign);
  
  // Admin: Update campaign
  app.put('/api/v2/admin/referrals/campaigns/:id', authenticateToken, authorizeRoles(['admin']), referralController.updateCampaign);
  
  // Admin: Get campaigns
  app.get('/api/v2/admin/referrals/campaigns', authenticateToken, authorizeRoles(['admin']), referralController.getCampaigns);
  
  // ==================== ADMIN USER ADDRESSES ENDPOINT ====================
  
  // Admin: Get user addresses
  app.get('/api/v2/admin/users/:userId/addresses', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const addresses = await storage.getUserAddresses(userId);
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('addresses.retrieved_successfully', language),
        data: addresses,
      });
      
    } catch (error) {
      console.error('Admin get user addresses error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Admin: Create address for user
  app.post('/api/v2/admin/users/:userId/addresses', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      addressName: z.string().min(1, 'Address name is required'),
      addressType: z.enum(['home', 'office', 'other']).default('home'),
      streetName: z.string().min(1, 'Street name is required'),
      houseNo: z.string().min(1, 'House number is required'),
      district: z.string().min(1, 'District is required'),
      directions: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      isDefault: z.boolean().default(false),
    })
  }), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const addressData = { ...req.body, userId };
      const address = await storage.createAddress(addressData);
      const language = req.headers['accept-language'] || 'en';
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('addresses.created_successfully', language),
        data: address,
      });
      
    } catch (error) {
      console.error('Admin create address error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Admin: Update address
  app.put('/api/v2/admin/addresses/:addressId', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      addressName: z.string().min(1).optional(),
      addressType: z.enum(['home', 'office', 'other']).optional(),
      streetName: z.string().min(1).optional(),
      houseNo: z.string().min(1).optional(),
      district: z.string().min(1).optional(),
      directions: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      isDefault: z.boolean().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { addressId } = req.params;
      const updates = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const address = await storage.updateAddress(addressId, updates);
      
      res.json({
        success: true,
        message: bilingual.getMessage('addresses.updated_successfully', language),
        data: address,
      });
      
    } catch (error) {
      console.error('Admin update address error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('addresses.update_failed', 'en'),
      });
    }
  });

  // Admin: Delete address
  app.delete('/api/v2/admin/addresses/:addressId', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { addressId } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      await storage.deleteAddress(addressId);
      
      res.json({
        success: true,
        message: bilingual.getMessage('addresses.deleted_successfully', language),
      });
      
    } catch (error) {
      console.error('Admin delete address error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('addresses.delete_failed', 'en'),
      });
    }
  });
  
  // ==================== SERVICES & PACKAGES ENDPOINTS ====================
  
  // Get Service Categories
  app.get('/api/v2/services/categories', async (req: any, res: any) => {
    try {
      const categories = await storage.getServiceCategories();
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('services.categories_retrieved', language),
        data: categories.map(category => ({
          id: category.id,
          name: (category.name as any)[language] || (category.name as any).en,
          description: (category.description as any)[language] || (category.description as any).en,
          icon: category.icon,
          sort_order: category.sortOrder,
        }))
      });
      
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get Services by Category
  app.get('/api/v2/services/categories/:categoryId/services', async (req: any, res: any) => {
    try {
      const { categoryId } = req.params;
      const services = await storage.getServicesByCategory(categoryId);
      const language = req.headers['accept-language'] || 'en';
      
      const servicesWithPackages = await Promise.all(
        services.map(async (service) => {
          const packages = await storage.getServiceTiers(service.id);
          return {
            id: service.id,
            name: (service.name as any)[language] || (service.name as any).en,
            description: (service.description as any)[language] || (service.description as any).en,
            base_price: service.basePrice,
            duration_minutes: service.durationMinutes,
            vat_percentage: service.vatPercentage,
            packages: packages.map(pkg => ({
              id: pkg.id,
              tier: pkg.tier,
              name: (pkg.name as any)[language] || (pkg.name as any).en,
              price: pkg.price,
              discount_percentage: pkg.discountPercentage,
              inclusions: (pkg.inclusions as any)[language] || (pkg.inclusions as any).en,
            }))
          };
        })
      );
      
      res.json({
        success: true,
        message: bilingual.getMessage('services.packages_retrieved', language),
        data: servicesWithPackages,
      });
      
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // ==================== SUBSCRIPTION PACKAGES ENDPOINTS (PUBLIC) ====================
  
  // Get All Subscription Packages (Public - for customers)
  app.get('/api/v2/subscription-packages', async (req: any, res: any) => {
    try {
      const { tier, category_id } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      // Execute query with base filter
      let query = db
        .select()
        .from(subscriptionPackages)
        .where(eq(subscriptionPackages.isActive, true))
        .orderBy(asc(subscriptionPackages.price));
      
      let packages = await query;
      
      // Apply optional filters client-side for now (tier enum type issue)
      if (tier) {
        packages = packages.filter(pkg => pkg.tier === tier);
      }
      if (category_id) {
        packages = packages.filter(pkg => pkg.categoryId === category_id);
      }
      
      // Format response with bilingual content
      const formattedPackages = packages.map(pkg => ({
        id: pkg.id,
        name: (pkg.name as any)[language] || (pkg.name as any).en,
        description: (pkg.description as any)[language] || (pkg.description as any).en,
        tier: pkg.tier,
        price: pkg.price,
        duration_days: pkg.durationDays,
        discount_percentage: pkg.discountPercentage,
        inclusions: (pkg.inclusions as any)[language] || (pkg.inclusions as any).en,
        terms_and_conditions: pkg.termsAndConditions ? ((pkg.termsAndConditions as any)[language] || (pkg.termsAndConditions as any).en) : null,
        image: pkg.image,
        category_id: pkg.categoryId,
      }));
      
      res.json({
        success: true,
        message: bilingual.getMessage('packages.retrieved_successfully', language),
        data: formattedPackages,
      });
      
    } catch (error) {
      console.error('Get subscription packages error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Get Subscription Package Details with Included Services (Public)
  app.get('/api/v2/subscription-packages/:id', async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      // Get package details
      const [pkg] = await db
        .select()
        .from(subscriptionPackages)
        .where(and(eq(subscriptionPackages.id, id), eq(subscriptionPackages.isActive, true)));
      
      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('packages.not_found', language),
        });
      }
      
      // Get included services with their details
      const packageServices = await db
        .select({
          id: subscriptionPackageServices.id,
          usageLimit: subscriptionPackageServices.usageLimit,
          discountPercentage: subscriptionPackageServices.discountPercentage,
          service: services,
        })
        .from(subscriptionPackageServices)
        .innerJoin(services, eq(subscriptionPackageServices.serviceId, services.id))
        .where(eq(subscriptionPackageServices.packageId, id));
      
      // Format included services
      const includedServices = packageServices.map(ps => ({
        id: ps.service.id,
        name: (ps.service.name as any)[language] || (ps.service.name as any).en,
        description: (ps.service.description as any)[language] || (ps.service.description as any).en,
        base_price: ps.service.basePrice,
        duration_minutes: ps.service.durationMinutes,
        image: ps.service.image,
        average_rating: ps.service.averageRating,
        review_count: ps.service.reviewCount,
        usage_limit: ps.usageLimit,
        discount_percentage: ps.discountPercentage,
      }));
      
      // Format package response
      const formattedPackage = {
        id: pkg.id,
        name: (pkg.name as any)[language] || (pkg.name as any).en,
        description: (pkg.description as any)[language] || (pkg.description as any).en,
        tier: pkg.tier,
        price: pkg.price,
        duration_days: pkg.durationDays,
        discount_percentage: pkg.discountPercentage,
        inclusions: (pkg.inclusions as any)[language] || (pkg.inclusions as any).en,
        terms_and_conditions: pkg.termsAndConditions ? ((pkg.termsAndConditions as any)[language] || (pkg.termsAndConditions as any).en) : null,
        image: pkg.image,
        category_id: pkg.categoryId,
        included_services: includedServices,
      };
      
      res.json({
        success: true,
        message: bilingual.getMessage('packages.retrieved_successfully', language),
        data: formattedPackage,
      });
      
    } catch (error) {
      console.error('Get subscription package details error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Get Spare Parts
  app.get('/api/v2/spare-parts', async (req: any, res: any) => {
    try {
      const { category } = req.query;
      const spareParts = await storage.getSpareParts(category as string);
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('spare_parts.retrieved_successfully', language),
        data: spareParts.map(part => ({
          id: part.id,
          name: (part.name as any)[language] || (part.name as any).en,
          description: (part.description as any)[language] || (part.description as any).en,
          category: part.category,
          price: part.price,
          stock: part.stock,
          image: part.image,
        }))
      });
      
    } catch (error) {
      console.error('Get spare parts error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // ==================== BOOKING FLOW ENDPOINTS ====================
  
  // Get Available Slots
  app.get('/api/v2/bookings/available-slots', async (req: any, res: any) => {
    try {
      const { date, service_id } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      if (!date || !service_id) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('validation.schedule_required', language),
        });
      }
      
      // Get service duration
      const service = await storage.getService(service_id as string);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('services.category_not_found', language),
        });
      }
      
      // Generate available slots (simplified logic)
      const slots = [];
      for (let hour = ORDER_CONSTANTS.WORKING_HOURS_START; hour < ORDER_CONSTANTS.WORKING_HOURS_END; hour++) {
        if (hour >= ORDER_CONSTANTS.LUNCH_BREAK_START && hour < ORDER_CONSTANTS.LUNCH_BREAK_END) {
          continue;
        }
        
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        if (HELPERS.isWithinBusinessHours(timeSlot)) {
          slots.push({
            time: timeSlot,
            available: true, // In real implementation, check technician availability
          });
        }
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('booking.available_slots_retrieved', language),
        data: {
          date,
          service_duration: service.durationMinutes,
          slots,
        }
      });
      
    } catch (error) {
      console.error('Get available slots error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Create Booking
  app.post('/api/v2/bookings/create', authenticateToken, validateRequest({
    body: z.object({
      service_id: z.string().uuid(),
      package_id: z.string().uuid().optional(),
      subscription_id: z.string().uuid().optional(),
      address_id: z.string().uuid(),
      scheduled_date: z.string(),
      scheduled_time: z.string(),
      notes: z.string().optional(),
      notes_ar: z.string().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { service_id, package_id, subscription_id, address_id, scheduled_date, scheduled_time, notes, notes_ar } = req.body;
      
      // Sanitize user-generated content to prevent XSS
      const sanitizedNotes = notes ? sanitizeInput(notes, 'basic') : undefined;
      const sanitizedNotesAr = notes_ar ? sanitizeInput(notes_ar, 'basic') : undefined;
      const language = req.headers['accept-language'] || 'en';
      
      // Validate scheduled date is not in the past
      const scheduledDateTime = new Date(`${scheduled_date}T${scheduled_time}`);
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + (ORDER_CONSTANTS.BOOKING_ADVANCE_HOURS * 60 * 60 * 1000));
      
      if (scheduledDateTime < minBookingTime) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('booking.past_date_not_allowed', language),
        });
      }
      
      // Get service details
      const service = await storage.getService(service_id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('services.category_not_found', language),
        });
      }
      
      // Handle subscription-based booking
      let isSubscriptionBooking = false;
      let subscriptionUsageLink = null;
      if (subscription_id) {
        // Get user's subscription
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(and(
            eq(subscriptions.id, subscription_id),
            eq(subscriptions.userId, req.user.id)
          ));
        
        if (!subscription) {
          return res.status(404).json({
            success: false,
            message: bilingual.getMessage('subscription.not_found', language),
          });
        }
        
        // Check subscription is active and not expired
        if (subscription.status !== 'active') {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('subscription.not_active', language),
          });
        }
        
        // Check subscription is within valid date range
        // Validate that the scheduled service date falls within subscription period
        const startDate = new Date(subscription.startDate);
        const endDate = new Date(subscription.endDate);
        
        if (scheduledDateTime < startDate) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('subscription.not_started', language),
          });
        }
        
        if (scheduledDateTime > endDate) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('subscription.service_after_expiry', language),
          });
        }
        
        // Check if service is included in subscription package
        const serviceLink = await db
          .select()
          .from(subscriptionPackageServices)
          .where(and(
            eq(subscriptionPackageServices.packageId, subscription.packageId),
            eq(subscriptionPackageServices.serviceId, service_id)
          ));
        
        if (serviceLink.length === 0) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('subscription.service_not_included', language),
          });
        }
        
        // Check usage allowance
        const usageLimit = serviceLink[0].usageLimit;
        if (usageLimit !== null) {
          // Count current usage for this service
          const currentUsage = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(bookings)
            .where(and(
              eq(bookings.subscriptionId, subscription_id),
              eq(bookings.serviceId, service_id)
            ));
          
          const usageCount = currentUsage[0]?.count || 0;
          if (usageCount >= usageLimit) {
            return res.status(400).json({
              success: false,
              message: bilingual.getMessage('subscription.usage_limit_reached', language),
            });
          }
        }
        
        isSubscriptionBooking = true;
        subscriptionUsageLink = serviceLink[0];
      }
      
      // Calculate pricing
      let basePrice, discountPercentage, discountAmount, subtotal, vatAmount, totalAmount;
      
      if (isSubscriptionBooking) {
        // Subscription booking - no charge
        basePrice = 0;
        discountPercentage = 0;
        discountAmount = 0;
        subtotal = 0;
        vatAmount = 0;
        totalAmount = 0;
      } else {
        // Regular booking with optional service tier
        let servicePackage;
        if (package_id) {
          const packages = await storage.getServiceTiers(service_id);
          servicePackage = packages.find(p => p.id === package_id);
        }
        
        basePrice = servicePackage ? parseFloat(servicePackage.price.toString()) : parseFloat(service.basePrice.toString());
        discountPercentage = servicePackage ? parseFloat(servicePackage.discountPercentage.toString()) : 0;
        discountAmount = (basePrice * discountPercentage) / 100;
        subtotal = basePrice - discountAmount;
        vatAmount = HELPERS.calculateVAT(subtotal);
        totalAmount = subtotal + vatAmount;
      }
      
      // Create booking
      const booking = await storage.createBooking({
        userId: req.user.id,
        serviceId: service_id,
        tierId: package_id || null,
        subscriptionId: subscription_id || null,
        addressId: address_id,
        scheduledDate: scheduledDateTime,
        scheduledTime: scheduled_time,
        notes: sanitizedNotes,
        notesAr: sanitizedNotesAr,
        serviceCost: basePrice.toString(),
        discountAmount: discountAmount.toString(),
        vatAmount: vatAmount.toString(),
        totalAmount: totalAmount.toString(),
        paymentStatus: isSubscriptionBooking ? 'paid' : 'pending',
      });
      
      // Smart technician assignment using AI-powered algorithm
      let assignedTechnician = null;
      try {
        // Get customer address for location-based assignment
        const [address] = await db
          .select()
          .from(addresses)
          .where(eq(addresses.id, address_id));
        
        if (!address || !address.latitude || !address.longitude) {
          console.warn('Address location not available for smart assignment, falling back to manual assignment');
        } else {
          // Use smart assignment service
          const assignmentResult = await AssignmentService.findBestTechnician(
            {
              serviceId: service_id,
              scheduledDate: scheduledDateTime,
              scheduledTime: scheduled_time,
              customerLatitude: parseFloat(address.latitude),
              customerLongitude: parseFloat(address.longitude),
            },
            booking.id
          );
          
          if (assignmentResult.technicianId) {
            // Assign the selected technician
            await storage.assignTechnician(booking.id, assignmentResult.technicianId);
            
            // Get technician details for response
            assignedTechnician = await storage.getUser(assignmentResult.technicianId);
            
            // Create notification for assigned technician
            await storage.createNotification({
              userId: assignmentResult.technicianId,
              type: 'technician_assigned',
              title: { en: 'New Job Assigned', ar: 'تم تعيين وظيفة جديدة' },
              body: { 
                en: `You have been assigned to booking #${booking.id.slice(0, 8)} (Smart Assignment)`, 
                ar: `تم تعيينك للحجز #${booking.id.slice(0, 8)} (تعيين ذكي)` 
              },
              data: { bookingId: booking.id },
            });
            
            console.log(`Smart assignment successful: Technician ${assignmentResult.technicianId} assigned to booking ${booking.id} (Score: ${assignmentResult.assignmentLog?.totalScore || 'N/A'})`);
          } else {
            console.warn('No suitable technician found via smart assignment');
          }
        }
      } catch (techError) {
        console.error('Smart technician assignment error:', techError);
        // Continue even if auto-assignment fails - booking remains in pending status for manual assignment
      }
      
      await auditLog({
        userId: req.user.id,
        action: 'booking_created',
        resourceType: 'booking',
        resourceId: booking.id,
        newValues: {
          ...booking,
          auto_assigned_technician: assignedTechnician?.id || null,
        },
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('booking.created_successfully', language),
        data: {
          booking_id: booking.id,
          status: booking.status,
          service_cost: booking.serviceCost,
          discount_amount: booking.discountAmount,
          vat_amount: booking.vatAmount,
          total_amount: booking.totalAmount,
          currency: 'SAR',
          scheduled_date: booking.scheduledDate,
          scheduled_time: booking.scheduledTime,
          technician_id: assignedTechnician?.id || null,
          technician_name: assignedTechnician?.name || null,
          auto_assigned: !!assignedTechnician,
          is_subscription_booking: isSubscriptionBooking,
          subscription_id: subscription_id || null,
          payment_status: booking.paymentStatus,
        }
      });
      
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get Booking Details
  app.get('/api/v2/bookings/:id', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!booking || booking.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('booking.not_found', language),
        });
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('booking.retrieved_successfully', language),
        data: booking,
      });
      
    } catch (error) {
      console.error('Get booking error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Edit Booking
  app.put('/api/v2/bookings/:id', authenticateToken, validateRequest({
    body: z.object({
      scheduled_date: z.string().optional(),
      scheduled_time: z.string().optional(),
      address_id: z.string().uuid().optional(),
      notes: z.string().optional(),
      notes_ar: z.string().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { scheduled_date, scheduled_time, address_id, notes, notes_ar } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Get booking
      const booking = await storage.getBooking(id);
      if (!booking || booking.userId !== req.user.id) {
        const messages = bilingual.getBilingual('booking.not_found');
        return res.status(404).json({
          success: false,
          message: messages.en,
          message_ar: messages.ar,
        });
      }
      
      // Check if booking can be edited (only pending bookings)
      if (booking.status !== 'pending') {
        const messages = bilingual.getBilingual('booking.cannot_edit');
        return res.status(400).json({
          success: false,
          message: messages.en,
          message_ar: messages.ar,
        });
      }
      
      // Validate new scheduled time is in the future
      if (scheduled_date && scheduled_time) {
        const scheduledDateTime = new Date(`${scheduled_date}T${scheduled_time}`);
        const now = new Date();
        const minBookingTime = new Date(now.getTime() + (ORDER_CONSTANTS.BOOKING_ADVANCE_HOURS * 60 * 60 * 1000));
        
        if (scheduledDateTime < minBookingTime) {
          const messages = bilingual.getBilingual('booking.past_date_not_allowed');
          return res.status(400).json({
            success: false,
            message: messages.en,
            message_ar: messages.ar,
          });
        }
      }
      
      // Build updates
      const updates: any = {};
      if (scheduled_date) updates.scheduledDate = new Date(scheduled_date);
      if (scheduled_time) updates.scheduledTime = scheduled_time;
      if (address_id) updates.addressId = address_id;
      if (notes !== undefined) updates.notes = notes;
      if (notes_ar !== undefined) updates.notesAr = notes_ar;
      
      // Update booking
      await db.update(bookings).set(updates).where(eq(bookings.id, id));
      
      // Get updated booking
      const updatedBooking = await storage.getBooking(id);
      
      const messages = bilingual.getBilingual('booking.updated_successfully');
      res.json({
        success: true,
        message: messages.en,
        message_ar: messages.ar,
        data: {
          booking_id: updatedBooking!.id,
          status: updatedBooking!.status,
          scheduled_date: updatedBooking!.scheduledDate,
          scheduled_time: updatedBooking!.scheduledTime,
          updated_at: updatedBooking!.updatedAt,
        }
      });
      
    } catch (error) {
      console.error('Edit booking error:', error);
      const errorMessages = bilingual.getBilingual('general.server_error');
      res.status(500).json({
        success: false,
        message: errorMessages.en,
        message_ar: errorMessages.ar,
      });
    }
  });
  
  // ==================== QUOTATION ENDPOINTS ====================
  
  // Create Quotation (Technician only)
  app.post('/api/v2/quotations/create', authenticateToken, authorizeRoles(['technician']), validateRequest({
    body: z.object({
      booking_id: z.string().uuid(),
      additional_cost: z.number().min(0).default(0),
      notes: z.string().optional(),
      notes_ar: z.string().optional(),
      spare_parts: z.array(z.object({
        spare_part_id: z.string().uuid(),
        quantity: z.number().min(1),
      })).default([]),
    })
  }), async (req: any, res: any) => {
    try {
      const { booking_id, additional_cost, notes, notes_ar, spare_parts } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Verify booking exists and is assigned to this technician
      const booking = await storage.getBooking(booking_id);
      if (!booking || booking.technicianId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('booking.not_assigned', language),
        });
      }
      
      // Create quotation
      const expiresAt = new Date(Date.now() + (ORDER_CONSTANTS.QUOTATION_EXPIRY_HOURS * 60 * 60 * 1000));
      const quotation = await storage.createQuotation({
        bookingId: booking_id,
        technicianId: req.user.id,
        additionalCost: additional_cost.toString(),
        notes,
        notesAr: notes_ar,
        expiresAt,
      });
      
      // Add spare parts to quotation
      if (spare_parts.length > 0) {
        const sparePartsData = await Promise.all(
          spare_parts.map(async (item: any) => {
            const sparePart = await storage.getSparePart(item.spare_part_id);
            if (!sparePart) throw new Error(`Spare part ${item.spare_part_id} not found`);
            
            return {
              sparePartId: item.spare_part_id,
              quantity: item.quantity,
              unitPrice: parseFloat(sparePart.price.toString()),
            };
          })
        );
        
        await storage.addQuotationSpareParts(quotation.id, sparePartsData);
      }
      
      // Update booking status
      await storage.updateBookingStatus(booking_id, 'quotation_pending', req.user.id);
      
      // Broadcast status update via WebSocket (to booking owner, not technician)
      await websocketService.broadcastBookingStatus(booking_id, booking.userId, 'quotation_pending');
      
      // Send notification to customer
      await notificationService.sendQuotationNotification(booking.userId, quotation.id, language);
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('quotation.created_successfully', language),
        data: quotation,
      });
      
    } catch (error) {
      console.error('Create quotation error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Approve Quotation
  app.put('/api/v2/quotations/:id/approve', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const quotation = await storage.getQuotation(id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('quotation.not_found', language),
        });
      }
      
      // Verify user owns the booking
      const booking = await storage.getBooking(quotation.bookingId);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: bilingual.getMessage('auth.access_denied', language),
        });
      }
      
      if (quotation.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('quotation.already_processed', language),
        });
      }
      
      // Update quotation status
      await storage.updateQuotationStatus(id, 'approved', req.user.id);
      
      // Update booking with additional costs
      const additionalCost = parseFloat(quotation.additionalCost.toString());
      const currentTotal = parseFloat(booking.totalAmount.toString());
      const vatAmount = HELPERS.calculateVAT(additionalCost);
      const newTotal = currentTotal + additionalCost + vatAmount;
      
      await storage.updateBooking(booking.id, {
        sparePartsCost: additionalCost.toString(),
        totalAmount: newTotal.toString(),
      });
      
      // Automatically generate invoice after quotation approval
      const invoiceNumber = `INV-${Date.now()}-${booking.id.slice(0, 8)}`;
      const invoice = await storage.createInvoice({
        bookingId: booking.id,
        userId: req.user.id,
        invoiceNumber,
        totalAmount: newTotal.toString(),
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'quotation_approved',
        resourceType: 'quotation',
        resourceId: id,
        newValues: { status: 'approved', invoice_generated: invoice.id },
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('quotation.approved_successfully', language),
        data: {
          quotation_id: id,
          additional_cost: additionalCost,
          new_total: newTotal,
          invoice_id: invoice.id,
          invoice_number: invoiceNumber,
        }
      });
      
    } catch (error) {
      console.error('Approve quotation error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Reject Quotation
  app.put('/api/v2/quotations/:id/reject', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const quotation = await storage.getQuotation(id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('quotation.not_found', language),
        });
      }
      
      // Verify user owns the booking
      const booking = await storage.getBooking(quotation.bookingId);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: bilingual.getMessage('auth.access_denied', language),
        });
      }
      
      // Update quotation status
      await storage.updateQuotationStatus(id, 'rejected', req.user.id);
      
      // Update booking status back to in_progress
      await storage.updateBookingStatus(booking.id, 'in_progress', req.user.id);
      
      // Broadcast status update via WebSocket
      await websocketService.broadcastBookingStatus(booking.id, req.user.id, 'in_progress');
      
      await auditLog({
        userId: req.user.id,
        action: 'quotation_rejected',
        resourceType: 'quotation',
        resourceId: id,
        newValues: { status: 'rejected' },
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('quotation.rejected_successfully', language),
      });
      
    } catch (error) {
      console.error('Reject quotation error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // ==================== ORDERS & HISTORY ENDPOINTS ====================
  
  // Get User Orders
  app.get('/api/v2/orders', authenticateToken, async (req: any, res: any) => {
    try {
      const { status } = req.query;
      const orders = await storage.getUserBookings(req.user.id, status as string);
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('orders.retrieved_successfully', language),
        data: orders,
      });
      
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get Order Status
  app.get('/api/v2/orders/:id/status', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!booking || booking.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('orders.not_found', language),
        });
      }
      
      // Get status history
      const statusLogs = await storage.getBookingStatusLogs(id);
      
      // Get technician info if assigned
      let technician;
      if (booking.technicianId) {
        technician = await storage.getUser(booking.technicianId);
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('orders.status_retrieved', language),
        data: {
          current_status: booking.status,
          current_status_ar: booking.status, // Add translation mapping
          technician: technician ? {
            name: technician.name,
            phone: technician.phone,
          } : null,
          status_history: statusLogs.map(log => ({
            status: log.toStatus,
            timestamp: log.createdAt,
            message: log.notes || '',
          })),
          scheduled_date: booking.scheduledDate,
          scheduled_time: booking.scheduledTime,
        }
      });
      
    } catch (error) {
      console.error('Get order status error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Generate Invoice
  app.get('/api/v2/orders/:id/invoice', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!booking || booking.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('orders.not_found', language),
        });
      }
      
      if (booking.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('orders.invoice_not_available', language),
        });
      }
      
      // Generate invoice PDF
      const invoiceData = await pdfService.generateInvoice(booking, language);
      
      res.json({
        success: true,
        message: bilingual.getMessage('orders.invoice_generated', language),
        data: invoiceData,
      });
      
    } catch (error) {
      console.error('Generate invoice error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('orders.invoice_generation_failed', 'en'),
      });
    }
  });
  
  // Submit Review
  app.post('/api/v2/orders/:id/review', authenticateToken, validateRequest({
    body: z.object({
      service_rating: z.number().min(1).max(5),
      technician_rating: z.number().min(1).max(5),
      comment: z.string().optional(),
      comment_ar: z.string().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { service_rating, technician_rating, comment, comment_ar } = req.body;
      const booking = await storage.getBooking(id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!booking || booking.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('orders.not_found', language),
        });
      }
      
      if (booking.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('orders.review_not_allowed', language),
        });
      }
      
      // Check if already reviewed
      const existingReview = await storage.getBookingReview(id);
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('orders.already_reviewed', language),
        });
      }
      
      // Create review
      const review = await storage.createReview({
        bookingId: id,
        userId: req.user.id,
        technicianId: booking.technicianId!,
        serviceRating: service_rating,
        technicianRating: technician_rating,
        comment,
        commentAr: comment_ar,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('orders.review_submitted', language),
        data: review,
      });
      
    } catch (error) {
      console.error('Submit review error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // ==================== PAYMENT ENDPOINTS ====================
  
  // Create Payment
  app.post('/api/v2/payments/create', authenticateToken, validateRequest({
    body: z.object({
      booking_id: z.string().uuid(),
      payment_method: z.enum(['wallet', 'moyasar', 'tabby']),
      wallet_amount: z.number().min(0).default(0),
      gateway_amount: z.number().min(0).default(0),
      payment_source: z.object({
        type: z.string(),
      }).optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { booking_id, payment_method, wallet_amount, gateway_amount, payment_source } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const booking = await storage.getBooking(booking_id);
      if (!booking || booking.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('orders.not_found', language),
        });
      }
      
      const totalAmount = parseFloat(booking.totalAmount.toString());
      const paymentTotal = wallet_amount + gateway_amount;
      
      // Verify amounts match
      if (Math.abs(paymentTotal - totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('payment.amounts_mismatch', language),
        });
      }
      
      // Process wallet payment if applicable
      let walletTransaction;
      if (wallet_amount > 0) {
        const wallet = await storage.getWallet(req.user.id);
        const currentBalance = parseFloat(wallet?.balance.toString() || '0');
        
        if (currentBalance < wallet_amount) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('wallet.insufficient_balance', language),
          });
        }
        
        walletTransaction = await storage.updateWalletBalance(
          req.user.id,
          wallet_amount,
          'debit',
          `Payment for order ${booking.id}`,
          'booking',
          booking.id
        );
      }
      
      // Process gateway payment if applicable
      let gatewayPayment;
      if (gateway_amount > 0) {
        if (payment_method === 'moyasar') {
          gatewayPayment = await moyasarService.createPayment({
            amount: gateway_amount * 100, // Convert to halalas
            currency: 'SAR',
            description: `Order payment - ${booking.id}`,
            source: payment_source,
            metadata: {
              booking_id: booking.id,
              user_id: req.user.id,
            }
          });
        } else if (payment_method === 'tabby') {
          const user = await storage.getUser(req.user.id);
          const address = await storage.getAddress(booking.addressId);
          
          const tabbyData = tabbyService.createCheckoutFromBooking(
            booking.id,
            gateway_amount,
            {
              name: user!.name,
              email: user!.email || '',
              phone: user!.phone || '',
            },
            [{
              title: 'Cleaning Service',
              quantity: 1,
              unit_price: gateway_amount,
              category: 'Services',
            }]
          );
          
          gatewayPayment = await tabbyService.createCheckoutSession(tabbyData);
        }
      }
      
      // Create payment record
      const payment = await storage.createPayment({
        bookingId: booking_id,
        userId: req.user.id,
        paymentMethod: payment_method,
        amount: totalAmount.toString(),
        currency: 'SAR',
        status: gatewayPayment ? 'pending' : 'paid',
        gatewayPaymentId: gatewayPayment?.payment?.id,
        gatewayResponse: gatewayPayment,
        walletAmount: wallet_amount.toString(),
        gatewayAmount: gateway_amount.toString(),
      });
      
      // Update booking payment status
      if (!gatewayPayment || (gatewayPayment && 'status' in gatewayPayment && gatewayPayment.status === 'paid')) {
        await storage.updateBookingStatus(booking_id, 'confirmed', req.user.id);
        
        // Broadcast status update via WebSocket
        await websocketService.broadcastBookingStatus(booking_id, req.user.id, 'confirmed');
        
        // Update payment status
        await storage.updatePaymentStatus(payment.id, 'paid');
      }
      
      await auditLog({
        userId: req.user.id,
        action: 'payment_created',
        resourceType: 'payment',
        resourceId: payment.id,
        newValues: payment,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('payment.created_successfully', language),
        data: {
          payment_id: payment.id,
          status: payment.status,
          wallet_transaction_id: walletTransaction?.id,
          gateway_payment_id: gatewayPayment?.payment?.id,
          gateway_checkout_url: (gatewayPayment && 'configuration' in gatewayPayment) ? gatewayPayment.configuration?.available_products?.installments?.[0]?.web_url : undefined,
          total_amount: totalAmount,
          wallet_used: wallet_amount,
          gateway_charged: gateway_amount,
        }
      });
      
    } catch (error) {
      logApiError('Create payment error', error, req, { bookingId: req.body.booking_id, gateway: req.body.gateway });
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('payment.creation_failed', 'en'),
      });
    }
  });
  
  // ==================== MOYASAR ENDPOINTS ====================
  
  // Verify Moyasar Payment
  app.get('/api/v2/payments/moyasar/verify', authenticateToken, async (req: any, res: any) => {
    try {
      const { payment_id } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      if (!payment_id) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('validation.payment_id_required', language),
        });
      }
      
      const moyasarPayment = await moyasarService.verifyPayment(payment_id as string);
      
      if (moyasarPayment.status === 'paid') {
        // Update local payment record
        const payments = await storage.getBookingPayments(moyasarPayment.metadata?.booking_id);
        if (payments.length > 0) {
          await storage.updatePaymentStatus(payments[0].id, 'paid', moyasarPayment);
          await storage.updateBookingStatus(moyasarPayment.metadata?.booking_id, 'confirmed');
        }
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('payment.verification_successful', language),
        data: moyasarPayment,
      });
      
    } catch (error) {
      logApiError('Verify Moyasar payment error', error, req, { paymentId: req.query.payment_id });
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('payment.verification_failed', 'en'),
      });
    }
  });

  // Get Payment History
  app.get('/api/v2/payments/history', authenticateToken, async (req: any, res: any) => {
    try {
      const userId = req.user.id;
      const language = req.headers['accept-language'] || 'en';
      const { page = 1, limit = 20, status, payment_method, date_from, date_to } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100);
      const offset = (pageNum - 1) * limitNum;
      
      // Build where conditions
      const conditions = [eq(payments.userId, userId)];
      if (status) {
        conditions.push(eq(payments.status, status as any));
      }
      if (payment_method) {
        conditions.push(eq(payments.paymentMethod, payment_method as any));
      }
      if (date_from) {
        conditions.push(gte(payments.createdAt, new Date(date_from as string)));
      }
      if (date_to) {
        conditions.push(lte(payments.createdAt, new Date(date_to as string)));
      }
      
      // Get payments with filters
      const allPayments = await db
        .select()
        .from(payments)
        .where(and(...conditions))
        .orderBy(desc(payments.createdAt));
      
      const total = allPayments.length;
      const paginatedPayments = allPayments.slice(offset, offset + limitNum);
      
      // Calculate summary
      const summary = {
        total_paid: allPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        total_refunded: allPayments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
        total_pending: allPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0),
      };
      
      res.json({
        success: true,
        data: {
          payments: paginatedPayments.map(p => ({
            id: p.id,
            reference_type: 'booking',
            reference_id: p.bookingId,
            reference_number: 'RKZ-' + p.id.slice(0, 8),
            amount: parseFloat(p.amount.toString()),
            status: p.status,
            payment_method: p.paymentMethod,
            payment_source: 'card',
            description: 'Payment for service',
            description_ar: 'دفع للخدمة',
            paid_at: p.updatedAt,
            created_at: p.createdAt,
          })),
          pagination: {
            current_page: pageNum,
            total_pages: Math.ceil(total / limitNum),
            total_items: total,
            per_page: limitNum,
          },
          summary,
        }
      });
      
    } catch (error) {
      console.error('Get payment history error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // ==================== TABBY ENDPOINTS ====================
  
  // Capture Tabby Payment
  app.post('/api/v2/payments/tabby/capture', authenticateToken, authorizeRoles(['admin', 'technician']), validateRequest({
    body: z.object({
      payment_id: z.string(),
      amount: z.number().min(0),
    })
  }), async (req: any, res: any) => {
    try {
      const { payment_id, amount } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const captureResult = await tabbyService.capturePayment(payment_id, {
        amount: amount.toFixed(2),
      });
      
      if (captureResult.status === 'captured') {
        // Update local payment record
        // Implementation would find the payment by gateway_payment_id and update
        
        res.json({
          success: true,
          message: bilingual.getMessage('payment.capture_successful', language),
          data: captureResult,
        });
      } else {
        res.status(400).json({
          success: false,
          message: bilingual.getMessage('payment.capture_failed', language),
        });
      }
      
    } catch (error) {
      logApiError('Capture Tabby payment error', error, req, { paymentId: req.body.payment_id });
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('payment.capture_failed', 'en'),
      });
    }
  });
  
  // ==================== WEBHOOK ENDPOINTS ====================
  
  // Moyasar Webhook
  app.post('/api/v2/webhooks/moyasar', async (req: any, res: any) => {
    try {
      const signature = req.headers['x-moyasar-signature'];
      // Use rawBody saved by express.json() verify function
      const payload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      
      if (!verifyMoyasarSignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      const event = JSON.parse(payload);
      
      // Queue webhook event for processing
      await redisService.queueWebhookEvent('moyasar', event);
      
      res.status(200).json({ received: true });
      
    } catch (error) {
      logApiError('Moyasar webhook error', error, req, { signature: req.headers['x-moyasar-signature'] ? 'present' : 'missing' });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
  
  // Tabby Webhook
  app.post('/api/v2/webhooks/tabby', async (req: any, res: any) => {
    try {
      const signature = req.headers['x-tabby-signature'];
      // Use rawBody saved by express.json() verify function
      const payload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
      
      if (!verifyTabbySignature(payload, signature)) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      const event = JSON.parse(payload);
      
      // Check idempotency
      const eventId = `tabby:${event.id}`;
      const isProcessed = await redisService.checkIdempotencyKey(eventId);
      
      if (isProcessed) {
        return res.status(200).json({ message: 'Already processed' });
      }
      
      await redisService.setIdempotencyKey(eventId);
      
      // Queue webhook event for processing
      await redisService.queueWebhookEvent('tabby', event);
      
      res.status(200).json({ received: true });
      
    } catch (error) {
      logApiError('Tabby webhook error', error, req, { signature: req.headers['x-tabby-signature'] ? 'present' : 'missing' });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });
  
  // ==================== NOTIFICATIONS ENDPOINTS ====================
  
  // Get User Notifications
  app.get('/api/v2/notifications', authenticateToken, async (req: any, res: any) => {
    try {
      const { limit = 50 } = req.query;
      const notifications = await storage.getUserNotifications(req.user.id, parseInt(limit as string));
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('notifications.retrieved_successfully', language),
        data: notifications.map(notification => ({
          id: notification.id,
          title: (notification.title as any)[language] || (notification.title as any).en,
          body: (notification.body as any)[language] || (notification.body as any).en,
          type: notification.type,
          data: notification.data,
          is_read: notification.isRead,
          created_at: notification.createdAt,
        }))
      });
      
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Mark Notification as Read
  app.put('/api/v2/notifications/:id/read', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      await storage.markNotificationAsRead(id);
      
      res.json({
        success: true,
        message: bilingual.getMessage('notifications.marked_as_read', language),
      });
      
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('notifications.mark_read_failed', 'en'),
      });
    }
  });
  
  // ==================== SUBSCRIPTION ENDPOINTS ====================
  
  // Get All Subscriptions (Admin)
  app.get('/api/v2/admin/subscriptions', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const { status, userId } = req.query;
      
      let subscriptions = await storage.getAllSubscriptions();
      
      // Filter by status if provided
      if (status) {
        subscriptions = subscriptions.filter(sub => sub.status === status);
      }
      
      // Filter by userId if provided
      if (userId) {
        subscriptions = subscriptions.filter(sub => sub.userId === userId);
      }
      
      // Enrich with user and package details
      const enrichedSubscriptions = await Promise.all(
        subscriptions.map(async (subscription) => {
          const user = await storage.getUser(subscription.userId);
          const [pkg] = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, subscription.packageId));
          
          return {
            ...subscription,
            user: user ? {
              id: user.id,
              name: user.name,
              phone: user.phone,
              email: user.email,
            } : null,
            package: pkg ? {
              id: pkg.id,
              name: pkg.name,
              tier: pkg.tier,
              price: pkg.price,
            } : null,
          };
        })
      );
      
      res.json({
        success: true,
        message: bilingual.getMessage('subscriptions.retrieved_successfully', language),
        data: enrichedSubscriptions,
      });
      
    } catch (error) {
      console.error('Get all subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Get User Subscriptions
  app.get('/api/v2/users/:userId/subscriptions', authenticateToken, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      // Check if user is requesting their own subscriptions or is admin
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: bilingual.getMessage('auth.unauthorized', language),
        });
      }
      
      const subscriptions = await storage.getUserSubscriptions(userId);
      
      // Enrich with package details
      const enrichedSubscriptions = await Promise.all(
        subscriptions.map(async (subscription) => {
          const [pkg] = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, subscription.packageId));
          
          return {
            ...subscription,
            package: pkg ? {
              id: pkg.id,
              name: pkg.name,
              tier: pkg.tier,
              price: pkg.price,
            } : null,
          };
        })
      );
      
      res.json({
        success: true,
        message: bilingual.getMessage('subscriptions.retrieved_successfully', language),
        data: enrichedSubscriptions,
      });
      
    } catch (error) {
      console.error('Get user subscriptions error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Create Subscription
  app.post('/api/v2/subscriptions', authenticateToken, validateRequest({
    body: insertSubscriptionSchema,
  }), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const subscriptionData = req.body;
      
      // Verify the package exists
      const [pkg] = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, subscriptionData.packageId));
      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('packages.not_found', language),
        });
      }
      
      // Create the subscription
      const subscription = await storage.createSubscription(subscriptionData);
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('subscriptions.created_successfully', language),
        data: subscription,
      });
      
    } catch (error) {
      console.error('Create subscription error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Create Subscription (Admin - for any user)
  app.post('/api/v2/admin/subscriptions', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      userId: z.string().uuid(),
      packageId: z.string().uuid(),
      startDate: z.string().or(z.date()),
      endDate: z.string().or(z.date()),
      autoRenew: z.boolean().default(false),
      benefits: z.any().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const { userId, packageId, startDate, endDate, autoRenew, benefits } = req.body;
      
      // Verify the package exists
      const [pkg] = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, packageId));
      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('packages.not_found', language),
        });
      }
      
      // Verify the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('user.not_found', language),
        });
      }
      
      // Build subscription data with defaults
      const subscriptionData = {
        userId,
        packageId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        autoRenew,
        totalAmount: pkg.price,
        status: 'active' as const,
        benefits: benefits || pkg.inclusions,
        usageCount: 0,
      };
      
      // Create the subscription (admin can create for any user)
      const subscription = await storage.createSubscription(subscriptionData);
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('subscriptions.created_successfully', language),
        data: subscription,
      });
      
    } catch (error) {
      console.error('Create subscription (admin) error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Update Subscription (Admin)
  app.put('/api/v2/admin/subscriptions/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: insertSubscriptionSchema.partial(),
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      const updateData = req.body;
      
      // Verify subscription exists
      const existingSubscription = await storage.getSubscription(id);
      if (!existingSubscription) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('subscriptions.not_found', language),
        });
      }
      
      // Update the subscription
      const updatedSubscription = await storage.updateSubscription(id, updateData);
      
      res.json({
        success: true,
        message: bilingual.getMessage('subscriptions.updated_successfully', language),
        data: updatedSubscription,
      });
      
    } catch (error) {
      console.error('Update subscription error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Purchase Subscription (Customer - with payment)
  app.post('/api/v2/subscriptions/purchase', authenticateToken, validateRequest({
    body: z.object({
      packageId: z.string().uuid(),
      paymentMethod: z.enum(['moyasar', 'tabby', 'wallet']),
      paymentSource: z.any().optional(), // Moyasar token
      merchantUrls: z.object({
        success: z.string().url(),
        cancel: z.string().url(),
        failure: z.string().url(),
      }).optional(), // Tabby checkout URLs
      autoRenew: z.boolean().default(false),
      durationMonths: z.number().int().min(1).default(1), // Subscription duration
    }),
  }), async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const language = req.headers['accept-language'] || 'en';
      const { packageId, paymentMethod, paymentSource, merchantUrls, autoRenew, durationMonths } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', language)
        });
      }
      
      // Verify package exists and is active
      const [pkg] = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, packageId));
      if (!pkg || !pkg.isActive) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('packages.not_found', language),
        });
      }
      
      const packagePrice = parseFloat(pkg.price);
      
      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + durationMonths);
      
      // Handle wallet payment
      if (paymentMethod === 'wallet') {
        const wallet = await storage.getWallet(userId);
        const walletBalance = wallet ? parseFloat(wallet.balance) : 0;
        
        if (walletBalance < packagePrice) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('wallet.insufficient_balance', language),
            data: {
              required: packagePrice,
              available: walletBalance,
              shortfall: packagePrice - walletBalance
            }
          });
        }
        
        // Process wallet payment and create subscription atomically
        const result = await PaymentTransactions.processSubscriptionWalletPurchase({
          userId,
          packageId,
          startDate,
          endDate,
          autoRenew,
          amount: packagePrice,
          benefits: pkg.inclusions as any
        });
        
        // Create audit log after successful atomic transaction
        await storage.createAuditLog({
          userId,
          action: 'subscription_purchased_wallet',
          resourceType: 'subscription',
          resourceId: result.subscription.id
        });
        
        return res.status(201).json({
          success: true,
          message: bilingual.getMessage('subscriptions.purchased_successfully', language),
          data: {
            subscription_id: result.subscription.id,
            package_name: pkg.name,
            start_date: startDate,
            end_date: endDate,
            amount: packagePrice,
            new_wallet_balance: result.newBalance
          }
        });
      }
      
      // Handle Moyasar payment
      if (paymentMethod === 'moyasar') {
        if (!paymentSource) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('validation.invalid_payment_data', language)
          });
        }
        
        const moyasarResult = await moyasarService.createPayment({
          amount: Math.round(packagePrice * 100), // Convert SAR to halalas
          currency: 'SAR',
          description: `Subscription: ${(pkg.name as any).en}`,
          source: paymentSource,
          callback_url: `${process.env.API_BASE_URL}/api/v2/webhooks/moyasar`,
          metadata: {
            subscription_purchase: true,
            user_id: userId,
            package_id: packageId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            auto_renew: autoRenew,
            duration_months: durationMonths
          }
        });
        
        if (!moyasarResult.success) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('payment.creation_failed', language),
            error: moyasarResult.error
          });
        }
        
        return res.status(201).json({
          success: true,
          message: bilingual.getMessage('payment.created_successfully', language),
          data: {
            payment_method: 'moyasar',
            moyasar: {
              payment_id: moyasarResult.payment?.id,
              status: moyasarResult.payment?.status,
            },
            package_name: pkg.name,
            amount: packagePrice,
            currency: 'SAR'
          }
        });
      }
      
      // Handle Tabby payment
      if (paymentMethod === 'tabby') {
        if (!merchantUrls) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('validation.invalid_payment_data', language)
          });
        }
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            message: bilingual.getErrorMessage('user.not_found', language)
          });
        }
        
        try {
          const tabbyResult = await tabbyService.createCheckoutSession({
            payment: {
              amount: packagePrice.toFixed(2),
              currency: 'SAR',
              buyer: {
                phone: user.phone || '',
                email: user.email ?? `${user.phone || 'user'}@example.com`,
                name: user.name,
              },
              order: {
                reference_id: `SUB-${Date.now()}`,
                items: [{
                  title: (pkg.name as any).en,
                  quantity: 1,
                  unit_price: packagePrice.toFixed(2),
                  category: 'Subscription'
                }]
              }
            },
            lang: language === 'ar' ? 'ar' : 'en',
            merchant_urls: {
              success: merchantUrls.success,
              cancel: merchantUrls.cancel,
              failure: merchantUrls.failure
            }
          });
          
          return res.status(201).json({
            success: true,
            message: bilingual.getMessage('payment.created_successfully', language),
            data: {
              payment_method: 'tabby',
              tabby: {
                payment_id: tabbyResult.payment.id,
                checkout_url: tabbyResult.configuration.available_products.installments[0]?.web_url
              },
              package_name: pkg.name,
              amount: packagePrice,
              currency: 'SAR'
            }
          });
        } catch (tabbyError: any) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('payment.creation_failed', language),
            error: tabbyError.message
          });
        }
      }
      
    } catch (error) {
      console.error('Purchase subscription error:', error);
      const language = req.headers['accept-language'] || 'en';
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', language),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      });
    }
  });
  
  // Check User Active Subscription
  app.get('/api/v2/subscriptions/active', authenticateToken, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      const language = req.headers['accept-language'] || 'en';
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', language)
        });
      }
      
      const { getUserActiveSubscription } = await import('./utils/subscription-lifecycle');
      const activeSubscription = await getUserActiveSubscription(userId);
      
      if (!activeSubscription) {
        return res.json({
          success: true,
          message: bilingual.getMessage('subscriptions.no_active_subscription', language),
          data: { hasActiveSubscription: false }
        });
      }
      
      return res.json({
        success: true,
        message: bilingual.getMessage('subscriptions.active_found', language),
        data: {
          hasActiveSubscription: true,
          subscription: activeSubscription.subscription,
          package: activeSubscription.package,
          benefits: activeSubscription.benefits
        }
      });
    } catch (error) {
      console.error('Check active subscription error:', error);
      const language = req.headers['accept-language'] || 'en';
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', language)
      });
    }
  });

  // Cancel Subscription
  app.post('/api/v2/subscriptions/:id/cancel', authenticateToken, validateRequest({
    body: z.object({
      reason: z.string().optional(),
      reason_ar: z.string().optional(),
      request_refund: z.boolean().default(false),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { reason, reason_ar, request_refund } = req.body;
      const userId = req.user.id;
      const language = req.headers['accept-language'] || 'en';
      
      // Get subscription
      const [subscription] = await db.select().from(subscriptions).where(
        and(eq(subscriptions.id, id), eq(subscriptions.userId, userId))
      );
      
      if (!subscription) {
        const messages = bilingual.getBilingual('subscription.not_found');
        return res.status(404).json({
          success: false,
          message: messages.en,
          message_ar: messages.ar,
        });
      }
      
      // Check if subscription can be cancelled
      if (subscription.status !== 'active') {
        const messages = bilingual.getBilingual('subscription.already_cancelled');
        return res.status(400).json({
          success: false,
          message: messages.en,
          message_ar: messages.ar,
        });
      }
      
      // Calculate prorated refund if requested
      let refundData = null;
      if (request_refund) {
        const packageData = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, subscription.packageId));
        if (packageData.length > 0) {
          const pkg = packageData[0];
          const totalDays = 30; // Assume 1 month subscription
          const daysUsed = Math.floor((Date.now() - new Date(subscription.startDate).getTime()) / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, totalDays - daysUsed);
          const refundAmount = (parseFloat(pkg.price.toString()) / totalDays) * daysRemaining;
          
          // Check if eligible for refund (less than 50% used)
          if (daysUsed <= totalDays * 0.5) {
            // Credit to wallet
            await storage.updateWalletBalance(
              userId,
              refundAmount,
              'credit',
              `Refund for cancelled subscription ${id}`,
              'subscription_refund',
              id
            );
            
            const wallet = await storage.getWallet(userId);
            refundData = {
              eligible: true,
              amount: refundAmount,
              method: 'wallet',
              processed_at: new Date(),
              wallet_balance: parseFloat(wallet?.balance.toString() || '0'),
            };
          } else {
            refundData = {
              eligible: false,
              reason: 'More than 50% of services used',
              reason_ar: 'تم استخدام أكثر من 50٪ من الخدمات',
            };
          }
        }
      }
      
      // Update subscription status
      await db.update(subscriptions).set({
        status: 'cancelled',
        updatedAt: new Date(),
      }).where(eq(subscriptions.id, id));
      
      const messages = bilingual.getBilingual('subscription.cancelled_successfully');
      res.json({
        success: true,
        message: messages.en,
        message_ar: messages.ar,
        data: {
          subscription_id: id,
          status: 'cancelled',
          cancelled_at: new Date(),
          refund: refundData,
        }
      });
      
    } catch (error) {
      console.error('Cancel subscription error:', error);
      const errorMessages = bilingual.getBilingual('general.server_error');
      res.status(500).json({
        success: false,
        message: errorMessages.en,
        message_ar: errorMessages.ar,
      });
    }
  });
  
  // Process Subscription Auto-Renewals (Admin)
  app.post('/api/v2/admin/subscriptions/process-renewals', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const { daysBeforeExpiration = 3 } = req.body;
      
      const { processAutoRenewals } = await import('./utils/subscription-lifecycle');
      const results = await processAutoRenewals(daysBeforeExpiration);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      return res.json({
        success: true,
        message: bilingual.getMessage('subscriptions.renewals_processed', language),
        data: {
          total: results.length,
          successful: successCount,
          failed: failureCount,
          results
        }
      });
    } catch (error) {
      console.error('Process renewals error:', error);
      const language = req.headers['accept-language'] || 'en';
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', language)
      });
    }
  });
  
  // Expire Subscriptions (Admin)
  app.post('/api/v2/admin/subscriptions/expire', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      
      const { expireSubscriptions } = await import('./utils/subscription-lifecycle');
      const result = await expireSubscriptions();
      
      return res.json({
        success: true,
        message: bilingual.getMessage('subscriptions.expired_processed', language),
        data: result
      });
    } catch (error) {
      console.error('Expire subscriptions error:', error);
      const language = req.headers['accept-language'] || 'en';
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', language)
      });
    }
  });
  
  // ==================== SERVICE PACKAGES ENDPOINTS ====================
  
  // Get All Service Packages (Admin)
  app.get('/api/v2/admin/service-packages', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      
      // Get all packages
      const packages = await db.select().from(subscriptionPackages).orderBy(desc(subscriptionPackages.createdAt));
      
      // Enrich each package with linked services
      const enrichedPackages = await Promise.all(
        packages.map(async (pkg) => {
          const packageServices = await db
            .select({
              id: subscriptionPackageServices.id,
              serviceId: subscriptionPackageServices.serviceId,
              usageLimit: subscriptionPackageServices.usageLimit,
              discountPercentage: subscriptionPackageServices.discountPercentage,
              service: services,
            })
            .from(subscriptionPackageServices)
            .innerJoin(services, eq(subscriptionPackageServices.serviceId, services.id))
            .where(eq(subscriptionPackageServices.packageId, pkg.id));
          
          return {
            ...pkg,
            services: packageServices.map(ps => ({
              id: ps.serviceId,
              name: ps.service.name,
              description: ps.service.description,
              usageLimit: ps.usageLimit,
              discountPercentage: ps.discountPercentage,
              linkId: ps.id,
            })),
          };
        })
      );
      
      res.json({
        success: true,
        message: bilingual.getMessage('packages.retrieved_successfully', language),
        data: enrichedPackages,
      });
      
    } catch (error) {
      console.error('Get service packages error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Create Service Package (Admin)
  app.post('/api/v2/admin/service-packages', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const { services: serviceLinks, ...packageData } = req.body;
      
      // Create the package
      const [newPackage] = await db.insert(subscriptionPackages).values(packageData).returning();
      
      // Create service links if provided
      if (serviceLinks && Array.isArray(serviceLinks) && serviceLinks.length > 0) {
        const linkValues = serviceLinks.map((link: any) => ({
          packageId: newPackage.id,
          serviceId: link.serviceId,
          usageLimit: link.usageLimit || null,
          discountPercentage: link.discountPercentage || '0.00',
        }));
        
        await db.insert(subscriptionPackageServices).values(linkValues);
      }
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('packages.created_successfully', language),
        data: newPackage,
      });
      
    } catch (error) {
      console.error('Create service package error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Update Service Package (Admin)
  app.put('/api/v2/admin/service-packages/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      const { services: serviceLinks, ...updateData } = req.body;
      
      // Update package details
      const [updatedPackage] = await db
        .update(subscriptionPackages)
        .set(updateData)
        .where(eq(subscriptionPackages.id, id))
        .returning();
      
      if (!updatedPackage) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('packages.not_found', language),
        });
      }
      
      // Update service links if provided
      if (serviceLinks && Array.isArray(serviceLinks)) {
        // Delete existing links
        await db.delete(subscriptionPackageServices).where(eq(subscriptionPackageServices.packageId, id));
        
        // Create new links
        if (serviceLinks.length > 0) {
          const linkValues = serviceLinks.map((link: any) => ({
            packageId: id,
            serviceId: link.serviceId,
            usageLimit: link.usageLimit || null,
            discountPercentage: link.discountPercentage || '0.00',
          }));
          
          await db.insert(subscriptionPackageServices).values(linkValues);
        }
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('packages.updated_successfully', language),
        data: updatedPackage,
      });
      
    } catch (error) {
      console.error('Update service package error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // Delete Service Package (Admin)
  app.delete('/api/v2/admin/service-packages/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      // Delete service links first (cascade)
      await db.delete(subscriptionPackageServices).where(eq(subscriptionPackageServices.packageId, id));
      
      // Then delete the package
      const [deletedPackage] = await db
        .delete(subscriptionPackages)
        .where(eq(subscriptionPackages.id, id))
        .returning();
      
      if (!deletedPackage) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('packages.not_found', language),
        });
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('packages.deleted_successfully', language),
        data: deletedPackage,
      });
      
    } catch (error) {
      console.error('Delete service package error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      });
    }
  });
  
  // ==================== SUPPORT ENDPOINTS ====================
  
  // Create Support Ticket
  app.post('/api/v2/support/tickets', authenticateToken, validateRequest({
    body: z.object({
      subject: z.string().min(5),
      subject_ar: z.string().optional(),
      message: z.string().min(10),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
      booking_id: z.string().uuid().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { subject, subject_ar, message, priority, booking_id } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Sanitize user-generated content to prevent XSS
      const sanitizedSubject = sanitizeInput(subject, 'strict');
      const sanitizedSubjectAr = subject_ar ? sanitizeInput(subject_ar, 'strict') : undefined;
      const sanitizedMessage = sanitizeInput(message, 'basic');
      
      // Create support ticket
      const ticket = await storage.createSupportTicket({
        userId: req.user.id,
        subject: sanitizedSubject,
        subjectAr: sanitizedSubjectAr,
        priority,
        bookingId: booking_id,
      });
      
      // Create initial message
      const initialMessage = await storage.createSupportMessage({
        ticketId: ticket.id,
        senderId: req.user.id,
        message: sanitizedMessage,
      });
      
      // Broadcast message via WebSocket
      await websocketService.broadcastSupportMessage(ticket.id, req.user.id, initialMessage);
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('support.ticket_created', language),
        data: ticket,
      });
      
    } catch (error) {
      console.error('Create support ticket error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get User Support Tickets
  app.get('/api/v2/support/tickets', authenticateToken, async (req: any, res: any) => {
    try {
      const tickets = await storage.getUserSupportTickets(req.user.id);
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('support.tickets_retrieved', language),
        data: tickets,
      });
      
    } catch (error) {
      console.error('Get support tickets error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Send Support Message
  app.post('/api/v2/support/messages', authenticateToken, validateRequest({
    body: z.object({
      ticket_id: z.string().uuid(),
      message: z.string().min(1),
      attachments: z.array(z.object({
        type: z.string(),
        url: z.string().url(),
        filename: z.string(),
      })).optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { ticket_id, message, attachments } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Verify ticket belongs to user
      const ticket = await storage.getSupportTicket(ticket_id);
      if (!ticket || ticket.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('support.ticket_not_found', language),
        });
      }
      
      // Sanitize user-generated content to prevent XSS
      const sanitizedMessage = sanitizeInput(message, 'basic');
      
      // Create message
      const supportMessage = await storage.createSupportMessage({
        ticketId: ticket_id,
        senderId: req.user.id,
        message: sanitizedMessage,
        attachments: attachments as any,
      });
      
      // Broadcast message via WebSocket
      await websocketService.broadcastSupportMessage(ticket_id, req.user.id, supportMessage);
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('support.message_sent', language),
        data: supportMessage,
      });
      
    } catch (error) {
      console.error('Send support message error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Upload Ticket Attachments
  app.post('/api/v2/support/tickets/:id/attachments', authenticateToken, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { files, message } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Verify ticket belongs to user
      const ticket = await storage.getSupportTicket(id);
      if (!ticket || ticket.userId !== req.user.id) {
        const messages = bilingual.getBilingual('support.ticket_not_found');
        return res.status(404).json({
          success: false,
          message: messages.en,
          message_ar: messages.ar,
        });
      }
      
      // For now, return success with placeholder data
      // In production, this would handle actual file uploads via object storage
      const messages = bilingual.getBilingual('support.attachments_uploaded');
      res.status(201).json({
        success: true,
        message: messages.en,
        message_ar: messages.ar,
        data: {
          ticket_id: id,
          attachments: [],
          message_id: 'msg-' + Date.now(),
        }
      });
      
    } catch (error) {
      console.error('Upload ticket attachments error:', error);
      const errorMessages = bilingual.getBilingual('general.server_error');
      res.status(500).json({
        success: false,
        message: errorMessages.en,
        message_ar: errorMessages.ar,
      });
    }
  });
  
  // Rate Support Ticket (Customer)
  app.post('/api/v2/support/tickets/:id/rate', authenticateToken, validateRequest({
    body: z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Verify ticket belongs to user and is resolved/closed
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('support.ticket_not_found', language),
        });
      }
      
      if (ticket.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: bilingual.getMessage('auth.forbidden', language),
        });
      }
      
      if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
        return res.status(400).json({
          success: false,
          message: 'Ticket must be resolved or closed before rating',
        });
      }
      
      if (ticket.rating) {
        return res.status(400).json({
          success: false,
          message: 'Ticket has already been rated',
        });
      }
      
      await storage.updateSupportTicket(id, {
        rating,
        ratingComment: comment || null,
        ratedAt: new Date(),
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('support.rating_submitted', language),
      });
      
    } catch (error) {
      console.error('Rate support ticket error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get FAQs (Public endpoint)
  app.get('/api/v2/support/faqs', async (req: any, res: any) => {
    try {
      // Normalize language to 'en' or 'ar'
      const rawLanguage = req.headers['accept-language'] || 'en';
      const language = rawLanguage.toLowerCase().startsWith('ar') ? 'ar' : 'en';
      
      // Normalize category to lowercase
      const category = req.query.category ? (req.query.category as string).toLowerCase() : undefined;
      
      // Get all FAQs to build the full categories list
      const allFaqs = await storage.getFAQs();
      const filteredFaqs = category ? await storage.getFAQs(category) : allFaqs;
      
      const localizedFaqs = filteredFaqs.map(faq => {
        const questionData = faq.question as any;
        const answerData = faq.answer as any;
        
        return {
          id: faq.id,
          category: faq.category,
          question: questionData?.[language] || questionData?.en || '',
          answer: answerData?.[language] || answerData?.en || '',
          sort_order: faq.sortOrder,
        };
      });
      
      // Group by category for better UX
      const groupedFaqs = localizedFaqs.reduce((acc: Record<string, any[]>, faq) => {
        if (!acc[faq.category]) {
          acc[faq.category] = [];
        }
        acc[faq.category].push(faq);
        return acc;
      }, {});
      
      // Get all unique categories from all FAQs
      const allCategories = Array.from(new Set(allFaqs.map(f => f.category))).sort();
      
      res.json({
        success: true,
        message: bilingual.getMessage('support.faqs_retrieved', language),
        data: {
          faqs: category ? localizedFaqs : groupedFaqs,
          categories: allCategories,
          total_count: localizedFaqs.length
        }
      });
      
    } catch (error) {
      console.error('Get FAQs error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Get App Configuration (Public endpoint)
  app.get('/api/v2/app/config', async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      
      // Fetch app configuration from database
      const configs = await db.select().from(appConfig).where(eq(appConfig.isActive, true));
      
      // Parse config values
      const configMap = configs.reduce((acc: any, config) => {
        acc[config.key] = config.value;
        return acc;
      }, {});
      
      // Build response
      const maintenance = configMap.maintenance_mode || { enabled: false };
      const minVersion = configMap.minimum_app_version || { ios: '1.0.0', android: '1.0.0' };
      const latestVersion = configMap.latest_app_version || { ios: '2.1.0', android: '2.1.0' };
      const forceUpdate = configMap.force_update || { enabled: false };
      
      const messages = bilingual.getBilingual('app.config_retrieved');
      res.json({
        success: true,
        message: messages.en,
        message_ar: messages.ar,
        data: {
          app_name: 'Rakeez',
          app_name_ar: 'راكز',
          current_version: '2.1.0',
          minimum_version: minVersion,
          force_update_required: forceUpdate.enabled || false,
          maintenance: {
            enabled: maintenance.enabled || false,
            scheduled_start: null,
            scheduled_end: null,
            message: maintenance.message?.en || null,
            message_ar: maintenance.message?.ar || null,
          },
          supported_languages: [
            { code: 'en', name: 'English', is_default: true, rtl: false },
            { code: 'ar', name: 'العربية', is_default: false, rtl: true },
          ],
          supported_payment_methods: [
            { method: 'moyasar', enabled: true, sources: ['creditcard', 'mada', 'applepay'] },
            { method: 'tabby', enabled: true, sources: ['bnpl'] },
            { method: 'wallet', enabled: true, sources: ['balance'] },
          ],
          features: {
            subscriptions_enabled: configMap.enable_subscriptions?.enabled ?? true,
            referrals_enabled: configMap.enable_referrals?.enabled ?? true,
            wallet_enabled: configMap.enable_wallet?.enabled ?? true,
            live_tracking_enabled: true,
            chat_support_enabled: true,
          },
          contact: {
            customer_service_phone: '+966920001234',
            customer_service_email: 'support@rakeez.sa',
            emergency_phone: '+966920001234',
            whatsapp: '+966501234567',
            working_hours: {
              weekdays: '08:00 - 22:00',
              weekends: '09:00 - 20:00',
            }
          },
          social_media: {
            facebook: 'https://facebook.com/rakeez.sa',
            twitter: 'https://twitter.com/rakeez_sa',
            instagram: 'https://instagram.com/rakeez.sa',
            linkedin: 'https://linkedin.com/company/rakeez',
          },
          legal: {
            terms_url: 'https://rakeez.sa/terms',
            privacy_url: 'https://rakeez.sa/privacy',
            help_center_url: 'https://help.rakeez.sa',
          },
          currency: {
            code: 'SAR',
            symbol: '﷼',
            decimal_places: 2,
          },
          tax_rate: 0.15,
        }
      });
      
    } catch (error) {
      console.error('Get app config error:', error);
      const errorMessages = bilingual.getBilingual('general.server_error');
      res.status(500).json({
        success: false,
        message: errorMessages.en,
        message_ar: errorMessages.ar,
      });
    }
  });
  
  // ==================== FILE UPLOAD ENDPOINTS ====================
  
  // Serve uploaded objects with ACL check
  app.get('/objects/:objectPath(*)', authenticateToken, async (req: any, res: any) => {
    const { ObjectStorageService, ObjectNotFoundError } = await import('./objectStorage');
    const { ObjectPermission } = await import('./objectAcl');
    
    const userId = req.user?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error('Error accessing object:', error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for object
  app.post('/api/v2/objects/upload', authenticateToken, validateRequest({
    body: z.object({
      fileName: z.string().min(1, 'File name is required'),
      fileSize: z.number().positive('File size must be positive').max(5 * 1024 * 1024, 'File size must be less than 5MB'),
      fileType: z.string().min(1, 'File type is required'),
      uploadType: z.enum(['profile', 'content', 'document']).optional().default('profile'),
    }),
  }), async (req: any, res: any) => {
    try {
      const { fileName, fileSize, fileType, uploadType } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Select validation preset based on upload type
      const validationPreset = uploadType === 'document' 
        ? FILE_VALIDATION_PRESETS.document
        : uploadType === 'content'
        ? FILE_VALIDATION_PRESETS.appContent
        : FILE_VALIDATION_PRESETS.profileImage;
      
      // Validate file with comprehensive security checks
      const validation = validateFile(fileName, fileType, fileSize, validationPreset);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }
      
      // Generate upload URL with sanitized filename
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      res.json({ 
        success: true,
        uploadURL,
        sanitizedFilename: validation.sanitizedFilename,
      });
    } catch (error) {
      logApiError('File upload URL generation error', error, req);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update user profile avatar
  app.put('/api/v2/profile/avatar', authenticateToken, async (req: any, res: any) => {
    const { avatar_url } = req.body;
    const language = req.headers['accept-language'] || 'en';
    
    if (!avatar_url) {
      return res.status(400).json({ 
        success: false,
        message: 'Avatar URL is required' 
      });
    }

    try {
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        avatar_url,
        {
          owner: req.user.id,
          visibility: 'public',
        }
      );

      await storage.updateUser(req.user.id, { avatar: objectPath });

      res.json({
        success: true,
        message: bilingual.getMessage('profile.avatar_updated', language),
        data: { avatar: objectPath }
      });
    } catch (error) {
      console.error('Update avatar error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language)
      });
    }
  });

  // Add spare parts image to quotation
  app.post('/api/v2/quotations/:id/spare-parts', authenticateToken, authorizeRoles(['technician']), async (req: any, res: any) => {
    const { id } = req.params;
    const { image_url, name, quantity, unit_price } = req.body;
    const language = req.headers['accept-language'] || 'en';

    if (!image_url || !name || !quantity || !unit_price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    try {
      const quotation = await storage.getQuotation(id);
      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('quotations.not_found', language)
        });
      }

      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        image_url,
        {
          owner: req.user.id,
          visibility: 'public',
        }
      );

      // Create spare part in catalog
      const sparePart = await storage.createSparePart({
        name: JSON.stringify({ en: name, ar: name }),
        description: JSON.stringify({ en: '', ar: '' }),
        category: 'quotation',
        price: unit_price.toString(),
        image: objectPath,
        stock: quantity,
      });
      
      // Link spare part to quotation
      await storage.addQuotationSpareParts(id, [{
        sparePartId: sparePart.id,
        quantity: quantity,
        unitPrice: parseFloat(unit_price),
      }]);

      res.status(201).json({
        success: true,
        message: bilingual.getMessage('quotations.spare_part_added', language),
        data: sparePart
      });
    } catch (error) {
      console.error('Add spare part error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language)
      });
    }
  });

  // Upload invoice for booking
  app.post('/api/v2/bookings/:id/invoice', authenticateToken, authorizeRoles(['technician', 'admin']), async (req: any, res: any) => {
    const { id } = req.params;
    const { invoice_url } = req.body;
    const language = req.headers['accept-language'] || 'en';

    if (!invoice_url) {
      return res.status(400).json({
        success: false,
        message: 'Invoice URL is required'
      });
    }

    try {
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('bookings.not_found', language)
        });
      }

      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        invoice_url,
        {
          owner: req.user.id,
          visibility: 'private',
        }
      );

      // Note: Invoice URL stored but not in schema. Consider adding invoiceUrl field to bookings table
      // For now, just return success
      // await storage.updateBooking(id, { invoice: objectPath });

      res.json({
        success: true,
        message: bilingual.getMessage('bookings.invoice_uploaded', language),
        data: { invoice: objectPath }
      });
    } catch (error) {
      console.error('Upload invoice error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language)
      });
    }
  });
  
  // ==================== ADMIN ENDPOINTS ====================
  
  // Get Analytics
  app.get('/api/v2/admin/analytics', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { start_date, end_date } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const startDate = start_date ? new Date(start_date as string) : undefined;
      const endDate = end_date ? new Date(end_date as string) : undefined;
      
      const [orderStats, revenueStats, technicianStats, topServices, allTechnicians, monthlyRevenue, monthlyBookings, userGrowth, recentActivity, walletTotals, uncollectedPayments, bookingsByPaymentMethod, subscriptionStats] = await Promise.all([
        storage.getOrderStats(startDate, endDate),
        storage.getRevenueStats(startDate, endDate),
        storage.getTechnicianStats(),
        storage.getTopServices(),
        storage.getUsersByRole('technician'),
        storage.getMonthlyRevenueStats(),
        storage.getMonthlyBookingStats(),
        storage.getMonthlyUserGrowth(6),
        storage.getRecentActivity(20),
        storage.getWalletTotals(),
        storage.getUncollectedPayments(),
        storage.getBookingsByPaymentMethod(),
        // Get subscription statistics
        (async () => {
          const allSubscriptions = await storage.getAllSubscriptions();
          const activeCount = allSubscriptions.filter(s => s.status === 'active').length;
          const expiredCount = allSubscriptions.filter(s => s.status === 'expired').length;
          const cancelledCount = allSubscriptions.filter(s => s.status === 'cancelled').length;
          const totalRevenue = allSubscriptions
            .filter(s => s.status === 'active' || s.status === 'expired')
            .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);
          
          return {
            totalSubscriptions: allSubscriptions.length,
            activeSubscriptions: activeCount,
            expiredSubscriptions: expiredCount,
            cancelledSubscriptions: cancelledCount,
            totalSubscriptionRevenue: totalRevenue,
          };
        })(),
      ]);
      
      // Convert all numeric values from strings to numbers
      const convertedOrderStats = {
        totalOrders: Number(orderStats.totalOrders) || 0,
        totalRevenue: Number(orderStats.totalRevenue) || 0,
        completedOrders: Number(orderStats.completedOrders) || 0,
        cancelledOrders: Number(orderStats.cancelledOrders) || 0,
        pendingOrders: Number(orderStats.pendingOrders) || 0,
        inProgressOrders: Number(orderStats.inProgressOrders) || 0,
      };
      
      const convertedRevenueStats = {
        totalRevenue: Number(revenueStats.totalPayments) || 0,
        revenueByPaymentMethod: {
          wallet: Number(revenueStats.walletPayments) || 0,
          moyasar: Number(revenueStats.moyasarPayments) || 0,
          tabby: Number(revenueStats.tabbyPayments) || 0,
        }
      };
      
      const convertedTechnicianStats = {
        ...technicianStats,
        completedOrders: Number(technicianStats.completedOrders) || 0,
        totalRevenue: Number(technicianStats.totalRevenue) || 0,
        avgRating: Number(technicianStats.avgRating) || 0,
      };
      
      // Format technician performance for analytics page
      const technicianPerformance = allTechnicians.map((tech: any) => ({
        name: tech.name,
        completed_orders: tech.completed_orders || 0,
        avg_rating: tech.avg_rating || 0,
      }));
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.analytics_retrieved', language),
        data: {
          orderStats: convertedOrderStats,
          revenueStats: convertedRevenueStats,
          technicianStats: convertedTechnicianStats,
          topServices: topServices || [],
          technicianPerformance: technicianPerformance || [],
          monthlyRevenue: monthlyRevenue || [],
          monthlyBookings: monthlyBookings || [],
          userGrowth: userGrowth || [],
          recentActivity: recentActivity || [],
          walletTotals: walletTotals || { totalBalance: 0, totalEarned: 0, totalSpent: 0 },
          uncollectedPayments: uncollectedPayments || 0,
          bookingsByPaymentMethod: bookingsByPaymentMethod || [],
          subscriptionStats: subscriptionStats || {
            totalSubscriptions: 0,
            activeSubscriptions: 0,
            expiredSubscriptions: 0,
            cancelledSubscriptions: 0,
            totalSubscriptionRevenue: 0,
          },
        }
      });
      
    } catch (error) {
      const language = req.headers['accept-language'] || 'en';
      console.error('❌ [Analytics Error] Full details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query: req.query,
        timestamp: new Date().toISOString(),
      });
      
      res.status(500).json({
        success: false,
        message: language === 'ar' 
          ? 'فشل في استرداد بيانات التحليلات. يرجى التحقق من سجلات الخادم للحصول على التفاصيل.'
          : 'Failed to retrieve analytics data. Please check server logs for details.',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
      });
    }
  });

  // Export Analytics (CSV/Excel)
  app.get('/api/v2/admin/analytics/export', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { start_date, end_date, format = 'csv', type = 'analytics' } = req.query;
      
      const validTypes = ['analytics', 'technicians', 'bookings', 'payments'];
      const validFormats = ['csv', 'excel'];
      
      if (!validTypes.includes(type as string)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        });
      }
      
      if (!validFormats.includes(format as string)) {
        return res.status(400).json({
          success: false,
          message: `Invalid format. Must be 'csv' or 'excel'`,
        });
      }
      
      const startDate = start_date ? new Date(start_date as string) : undefined;
      const endDate = end_date ? new Date(end_date as string) : undefined;
      
      let exportData: any = {};
      
      switch (type) {
        case 'analytics': {
          const [orderStats, revenueStats, technicianStats] = await Promise.all([
            storage.getOrderStats(startDate, endDate),
            storage.getRevenueStats(startDate, endDate),
            storage.getTechnicianStats(),
          ]);
          exportData = {
            summary: { ...orderStats, ...revenueStats },
            technicianPerformance: technicianStats,
          };
          break;
        }
        
        case 'technicians': {
          const technicianStats = await storage.getTechnicianStats();
          exportData = {
            summary: {},
            technicianPerformance: technicianStats,
          };
          break;
        }
        
        case 'bookings': {
          const rawBookings = await storage.getBookings(startDate, endDate);
          const bookings = await Promise.all(rawBookings.map(async (b) => {
            const user = await storage.getUser(b.userId);
            const service = await storage.getService(b.serviceId);
            return {
              id: b.id,
              customer_name: user?.name || 'N/A',
              service: (service?.name as any)?.en || (service?.name as any)?.ar || 'N/A',
              status: b.status,
              total_amount: b.totalAmount,
              created_at: b.createdAt?.toISOString() || '',
              completed_at: b.completedAt?.toISOString() || '',
            };
          }));
          exportData = {
            summary: {},
            bookings: bookings,
          };
          break;
        }
        
        case 'payments': {
          const rawPayments = await storage.getPayments(startDate, endDate);
          const payments = rawPayments.map((p: any) => ({
            id: p.id,
            booking_id: p.bookingId,
            amount: p.amount,
            payment_method: p.paymentMethod,
            status: p.status,
            created_at: p.createdAt?.toISOString() || '',
          }));
          exportData = {
            summary: {},
            payments: payments,
          };
          break;
        }
      }

      if (format === 'excel') {
        const { exportToExcel } = await import('./utils/export');
        const buffer = await exportToExcel(exportData, type as string);
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
      } else {
        const { exportToCSV } = await import('./utils/export');
        const csv = await exportToCSV(exportData, type as string);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${type}_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      }
      
    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Export Financial Audit
  app.get('/api/v2/admin/analytics/financial/export', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { start_date, end_date, format = 'csv' } = req.query;
      
      const validFormats = ['csv', 'excel'];
      if (!validFormats.includes(format as string)) {
        return res.status(400).json({
          success: false,
          message: `Invalid format. Must be 'csv' or 'excel'`,
        });
      }
      
      const startDate = start_date ? new Date(start_date as string) : undefined;
      const endDate = end_date ? new Date(end_date as string) : undefined;
      
      const revenueStats = await storage.getRevenueStats(startDate, endDate);
      const auditLogs = await storage.getAuditLogs('payment', undefined, 1000);

      const exportData = {
        summary: revenueStats,
        auditLogs: auditLogs,
      };

      if (format === 'excel') {
        const { exportToExcel } = await import('./utils/export');
        const buffer = await exportToExcel(exportData, 'financial');
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=financial_audit_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
      } else {
        const { exportToCSV } = await import('./utils/export');
        const csv = await exportToCSV(exportData, 'financial');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=financial_audit_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
      }
      
    } catch (error) {
      console.error('Export financial audit error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Create Service (Admin)
  app.post('/api/v2/admin/services', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      category_id: z.string().uuid(),
      name: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }),
      description: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }),
      base_price: z.number().min(0),
      duration_minutes: z.number().min(30),
      vat_percentage: z.number().default(15),
    })
  }), async (req: any, res: any) => {
    try {
      const serviceData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const service = await storage.createService({
        categoryId: serviceData.category_id,
        name: serviceData.name,
        description: serviceData.description,
        basePrice: serviceData.base_price.toString(),
        durationMinutes: serviceData.duration_minutes,
        vatPercentage: serviceData.vat_percentage.toString(),
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'service_created',
        resourceType: 'service',
        resourceId: service.id,
        newValues: service,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.service_created', language),
        data: service,
      });
      
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Service (Admin)
  app.put('/api/v2/admin/services/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      category_id: z.string().uuid().optional(),
      name: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }).optional(),
      description: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }).optional(),
      base_price: z.number().min(0).optional(),
      duration_minutes: z.number().min(30).optional(),
      vat_percentage: z.number().optional(),
      is_active: z.boolean().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const serviceData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const updateData: any = {};
      if (serviceData.category_id) updateData.categoryId = serviceData.category_id;
      if (serviceData.name) updateData.name = serviceData.name;
      if (serviceData.description) updateData.description = serviceData.description;
      if (serviceData.base_price !== undefined) updateData.basePrice = serviceData.base_price.toString();
      if (serviceData.duration_minutes) updateData.durationMinutes = serviceData.duration_minutes;
      if (serviceData.vat_percentage !== undefined) updateData.vatPercentage = serviceData.vat_percentage.toString();
      if (serviceData.is_active !== undefined) updateData.isActive = serviceData.is_active;
      
      const service = await storage.updateService(id, updateData);
      
      await auditLog({
        userId: req.user.id,
        action: 'service_updated',
        resourceType: 'service',
        resourceId: id,
        newValues: service,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.service_updated', language),
        data: service,
      });
      
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Delete Service (Admin - soft delete)
  app.delete('/api/v2/admin/services/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      await storage.deleteService(id);
      
      await auditLog({
        userId: req.user.id,
        action: 'service_deleted',
        resourceType: 'service',
        resourceId: id,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.service_deleted', language),
      });
      
    } catch (error) {
      console.error('Delete service error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Create Service Category (Admin)
  app.post('/api/v2/admin/categories', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }),
      description: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }),
      icon: z.string().optional(),
      sort_order: z.number().default(0),
    })
  }), async (req: any, res: any) => {
    try {
      const categoryData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const category = await storage.createServiceCategory({
        name: categoryData.name,
        description: categoryData.description,
        icon: categoryData.icon,
        sortOrder: categoryData.sort_order,
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'category_created',
        resourceType: 'service_category',
        resourceId: category.id,
        newValues: category,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.category_created', language),
        data: category,
      });
      
    } catch (error) {
      console.error('Create category error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Service Category (Admin)
  app.put('/api/v2/admin/categories/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }).optional(),
      description: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }).optional(),
      icon: z.string().optional(),
      sort_order: z.number().optional(),
      is_active: z.boolean().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const categoryData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const updateData: any = {};
      if (categoryData.name) updateData.name = categoryData.name;
      if (categoryData.description) updateData.description = categoryData.description;
      if (categoryData.icon !== undefined) updateData.icon = categoryData.icon;
      if (categoryData.sort_order !== undefined) updateData.sortOrder = categoryData.sort_order;
      if (categoryData.is_active !== undefined) updateData.isActive = categoryData.is_active;
      
      const category = await storage.updateServiceCategory(id, updateData);
      
      await auditLog({
        userId: req.user.id,
        action: 'category_updated',
        resourceType: 'service_category',
        resourceId: id,
        newValues: category,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.category_updated', language),
        data: category,
      });
      
    } catch (error) {
      console.error('Update category error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Delete Service Category (Admin - soft delete)
  app.delete('/api/v2/admin/categories/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      await storage.deleteServiceCategory(id);
      
      await auditLog({
        userId: req.user.id,
        action: 'category_deleted',
        resourceType: 'service_category',
        resourceId: id,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.category_deleted', language),
      });
      
    } catch (error) {
      console.error('Delete category error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Create Service Package (Admin)
  app.post('/api/v2/admin/packages', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      service_id: z.string().uuid(),
      tier: z.string(),
      name: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }),
      price: z.number().min(0),
      discount_percentage: z.number().min(0).max(100).default(0),
      inclusions: z.object({
        en: z.array(z.string()),
        ar: z.array(z.string()),
      }),
      terms_and_conditions: z.object({
        en: z.string(),
        ar: z.string(),
      }).optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const packageData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const pkg = await storage.createServiceTier({
        serviceId: packageData.service_id,
        tier: packageData.tier,
        name: packageData.name,
        price: packageData.price.toString(),
        discountPercentage: packageData.discount_percentage.toString(),
        inclusions: packageData.inclusions,
        termsAndConditions: packageData.terms_and_conditions,
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'package_created',
        resourceType: 'service_package',
        resourceId: pkg.id,
        newValues: pkg,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.package_created', language),
        data: pkg,
      });
      
    } catch (error) {
      console.error('Create package error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Service Package (Admin)
  app.put('/api/v2/admin/packages/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      tier: z.string().optional(),
      name: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }).optional(),
      price: z.number().min(0).optional(),
      discount_percentage: z.number().min(0).max(100).optional(),
      inclusions: z.object({
        en: z.array(z.string()),
        ar: z.array(z.string()),
      }).optional(),
      terms_and_conditions: z.object({
        en: z.string(),
        ar: z.string(),
      }).optional(),
      is_active: z.boolean().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const packageData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const updateData: any = {};
      if (packageData.tier) updateData.tier = packageData.tier;
      if (packageData.name) updateData.name = packageData.name;
      if (packageData.price !== undefined) updateData.price = packageData.price.toString();
      if (packageData.discount_percentage !== undefined) updateData.discountPercentage = packageData.discount_percentage.toString();
      if (packageData.inclusions) updateData.inclusions = packageData.inclusions;
      if (packageData.terms_and_conditions) updateData.termsAndConditions = packageData.terms_and_conditions;
      if (packageData.is_active !== undefined) updateData.isActive = packageData.is_active;
      
      const pkg = await storage.updateServiceTier(id, updateData);
      
      await auditLog({
        userId: req.user.id,
        action: 'package_updated',
        resourceType: 'service_package',
        resourceId: id,
        newValues: pkg,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.package_updated', language),
        data: pkg,
      });
      
    } catch (error) {
      console.error('Update package error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Delete Service Package (Admin - soft delete)
  app.delete('/api/v2/admin/packages/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      await storage.deleteServiceTier(id);
      
      await auditLog({
        userId: req.user.id,
        action: 'package_deleted',
        resourceType: 'service_package',
        resourceId: id,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.package_deleted', language),
      });
      
    } catch (error) {
      console.error('Delete package error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== BRANDS MANAGEMENT ====================
  
  // Get All Brands (Admin)
  app.get('/api/v2/admin/brands', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const brands = await storage.getBrands();
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.brands_retrieved', language),
        data: brands,
      });
    } catch (error) {
      console.error('Get brands error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Create Brand (Admin)
  app.post('/api/v2/admin/brands', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.string().min(1),
      logo: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const brandData = req.body;
      
      // Validate and set ACL for logo if provided
      if (brandData.logo) {
        // Validate it's from object storage (not external URL)
        if (!brandData.logo.startsWith('/')) {
          return res.status(400).json({
            success: false,
            message: 'Logo must be uploaded to object storage. Use /api/v2/objects/upload to get upload URL.',
          });
        }
        
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        try {
          brandData.logo = await objectStorageService.trySetObjectEntityAclPolicy(
            brandData.logo,
            {
              owner: req.user.id,
              visibility: 'public',
            }
          );
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid logo URL. Please upload the file first using /api/v2/objects/upload.',
          });
        }
      }
      
      const newBrand = await storage.createBrand(brandData);
      
      await auditLog({
        userId: req.user.id,
        action: 'brand_created',
        resourceType: 'brand',
        resourceId: newBrand.id,
        newValues: brandData,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.brand_created', language),
        data: newBrand,
      });
    } catch (error) {
      console.error('Create brand error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Brand (Admin)
  app.put('/api/v2/admin/brands/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.string().min(1).optional(),
      logo: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      const updateData = req.body;
      
      // Validate and set ACL for logo if provided
      if (updateData.logo) {
        // Validate it's from object storage (not external URL)
        if (!updateData.logo.startsWith('/')) {
          return res.status(400).json({
            success: false,
            message: 'Logo must be uploaded to object storage. Use /api/v2/objects/upload to get upload URL.',
          });
        }
        
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        try {
          updateData.logo = await objectStorageService.trySetObjectEntityAclPolicy(
            updateData.logo,
            {
              owner: req.user.id,
              visibility: 'public',
            }
          );
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid logo URL. Please upload the file first using /api/v2/objects/upload.',
          });
        }
      }
      
      const updatedBrand = await storage.updateBrand(id, updateData);
      
      await auditLog({
        userId: req.user.id,
        action: 'brand_updated',
        resourceType: 'brand',
        resourceId: id,
        newValues: updateData,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.brand_updated', language),
        data: updatedBrand,
      });
    } catch (error) {
      console.error('Update brand error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Delete Brand (Admin - soft delete)
  app.delete('/api/v2/admin/brands/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      await storage.deleteBrand(id);
      
      await auditLog({
        userId: req.user.id,
        action: 'brand_deleted',
        resourceType: 'brand',
        resourceId: id,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.brand_deleted', language),
      });
    } catch (error) {
      console.error('Delete brand error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== SPARE PARTS MANAGEMENT ====================

  // Get All Spare Parts (Admin)
  app.get('/api/v2/admin/spare-parts', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { category } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const spareParts = await storage.getSpareParts(category as string | undefined);
      const allBrands = await storage.getBrands();
      const brandsMap = new Map(allBrands.map(b => [b.id, b.name]));
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.spare_parts_retrieved', language),
        data: spareParts.map((part: any) => ({
          ...part,
          price: Number(part.price) || 0,
          brandName: part.brandId ? brandsMap.get(part.brandId) : null,
        })),
      });
      
    } catch (error) {
      console.error('Get spare parts error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Create Spare Part (Admin)
  app.post('/api/v2/admin/spare-parts', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }),
      description: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }),
      category: z.string(),
      brandId: z.string().uuid().optional(),
      price: z.number().min(0),
      stock: z.number().default(0),
      image: z.string().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const partData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Validate and set ACL for image if provided
      let imageUrl = partData.image;
      if (imageUrl) {
        if (!imageUrl.startsWith('/')) {
          return res.status(400).json({
            success: false,
            message: 'Image must be uploaded to object storage. Use /api/v2/objects/upload to get upload URL.',
          });
        }
        
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        try {
          imageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
            imageUrl,
            {
              owner: req.user.id,
              visibility: 'public',
            }
          );
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid image URL. Please upload the file first using /api/v2/objects/upload.',
          });
        }
      }
      
      const sparePart = await storage.createSparePart({
        name: partData.name,
        description: partData.description,
        category: partData.category,
        brandId: partData.brandId,
        price: partData.price.toString(),
        stock: partData.stock,
        image: imageUrl,
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'spare_part_created',
        resourceType: 'spare_part',
        resourceId: sparePart.id,
        newValues: sparePart,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.spare_part_created', language),
        data: sparePart,
      });
      
    } catch (error) {
      console.error('Create spare part error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Spare Part (Admin)
  app.put('/api/v2/admin/spare-parts/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }).optional(),
      description: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }).optional(),
      category: z.string().optional(),
      brandId: z.string().uuid().optional(),
      price: z.number().min(0).optional(),
      stock: z.number().optional(),
      image: z.string().optional(),
      is_active: z.boolean().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const partData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Validate and set ACL for image if provided
      if (partData.image) {
        if (!partData.image.startsWith('/')) {
          return res.status(400).json({
            success: false,
            message: 'Image must be uploaded to object storage. Use /api/v2/objects/upload to get upload URL.',
          });
        }
        
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        try {
          partData.image = await objectStorageService.trySetObjectEntityAclPolicy(
            partData.image,
            {
              owner: req.user.id,
              visibility: 'public',
            }
          );
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid image URL. Please upload the file first using /api/v2/objects/upload.',
          });
        }
      }
      
      const updateData: any = {};
      if (partData.name) updateData.name = partData.name;
      if (partData.description) updateData.description = partData.description;
      if (partData.category) updateData.category = partData.category;
      if (partData.brand !== undefined) updateData.brand = partData.brand;
      if (partData.price !== undefined) updateData.price = partData.price.toString();
      if (partData.stock !== undefined) updateData.stock = partData.stock;
      if (partData.image !== undefined) updateData.image = partData.image;
      if (partData.is_active !== undefined) updateData.isActive = partData.is_active;
      
      const sparePart = await storage.updateSparePart(id, updateData);
      
      await auditLog({
        userId: req.user.id,
        action: 'spare_part_updated',
        resourceType: 'spare_part',
        resourceId: id,
        newValues: sparePart,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.spare_part_updated', language),
        data: sparePart,
      });
      
    } catch (error) {
      console.error('Update spare part error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Delete Spare Part (Admin - soft delete)
  app.delete('/api/v2/admin/spare-parts/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      await storage.deleteSparePart(id);
      
      await auditLog({
        userId: req.user.id,
        action: 'spare_part_deleted',
        resourceType: 'spare_part',
        resourceId: id,
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.spare_part_deleted', language),
      });
      
    } catch (error) {
      console.error('Delete spare part error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== MOBILE CONTENT MANAGEMENT ====================

  // Get Home Slider Images (Admin)
  app.get('/api/v2/admin/mobile-content/slider', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const images = await storage.getHomeSliderImages();
      res.json({
        success: true,
        data: images,
      });
    } catch (error) {
      console.error('Get slider images error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Create Home Slider Image (Admin)
  app.post('/api/v2/admin/mobile-content/slider', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      imageUrl: z.string().min(1),
      sortOrder: z.number().min(1).max(3),
      isActive: z.boolean().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const imageData = req.body;
      
      // Validate and set ACL for image
      if (!imageData.imageUrl.startsWith('/')) {
        return res.status(400).json({
          success: false,
          message: 'Image must be uploaded to object storage. Use /api/v2/objects/upload to get upload URL.',
        });
      }
      
      const { ObjectStorageService } = await import('./objectStorage');
      const objectStorageService = new ObjectStorageService();
      try {
        imageData.imageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
          imageData.imageUrl,
          {
            owner: req.user.id,
            visibility: 'public',
          }
        );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image URL. Please upload the file first using /api/v2/objects/upload.',
        });
      }
      
      const newImage = await storage.createHomeSliderImage(imageData);
      
      await auditLog({
        userId: req.user.id,
        action: 'slider_image_created',
        resourceType: 'slider_image',
        resourceId: newImage.id,
        newValues: imageData,
      });
      
      res.status(201).json({
        success: true,
        data: newImage,
      });
    } catch (error) {
      console.error('Create slider image error:', error);
      if (error instanceof Error && error.message === 'Maximum 3 active slider images allowed') {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Update Home Slider Image (Admin)
  app.put('/api/v2/admin/mobile-content/slider/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      imageUrl: z.string().min(1).optional(),
      sortOrder: z.number().min(1).max(3).optional(),
      isActive: z.boolean().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // Validate and set ACL for image if provided
      if (updateData.imageUrl) {
        if (!updateData.imageUrl.startsWith('/')) {
          return res.status(400).json({
            success: false,
            message: 'Image must be uploaded to object storage. Use /api/v2/objects/upload to get upload URL.',
          });
        }
        
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorageService = new ObjectStorageService();
        try {
          updateData.imageUrl = await objectStorageService.trySetObjectEntityAclPolicy(
            updateData.imageUrl,
            {
              owner: req.user.id,
              visibility: 'public',
            }
          );
        } catch (error) {
          return res.status(400).json({
            success: false,
            message: 'Invalid image URL. Please upload the file first using /api/v2/objects/upload.',
          });
        }
      }
      const updatedImage = await storage.updateHomeSliderImage(id, updateData);
      
      await auditLog({
        userId: req.user.id,
        action: 'slider_image_updated',
        resourceType: 'slider_image',
        resourceId: id,
        newValues: updateData,
      });
      
      res.json({
        success: true,
        data: updatedImage,
      });
    } catch (error) {
      console.error('Update slider image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Reorder Home Slider Images (Admin)
  app.post('/api/v2/admin/mobile-content/slider/reorder', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      imageIds: z.array(z.string().uuid()).max(3),
    }),
  }), async (req: any, res: any) => {
    try {
      const { imageIds } = req.body;
      await storage.reorderHomeSliderImages(imageIds);
      
      await auditLog({
        userId: req.user.id,
        action: 'slider_images_reordered',
        resourceType: 'slider_image',
        newValues: { imageIds },
      });
      
      res.json({
        success: true,
        message: 'Slider images reordered successfully',
      });
    } catch (error) {
      console.error('Reorder slider images error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Delete Home Slider Image (Admin)
  app.delete('/api/v2/admin/mobile-content/slider/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteHomeSliderImage(id);
      
      await auditLog({
        userId: req.user.id,
        action: 'slider_image_deleted',
        resourceType: 'slider_image',
        resourceId: id,
      });
      
      res.json({
        success: true,
        message: 'Slider image deleted successfully',
      });
    } catch (error) {
      console.error('Delete slider image error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Get Home Banners (Admin)
  app.get('/api/v2/admin/mobile-content/banner', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const banners = await storage.getHomeBanners();
      res.json({
        success: true,
        data: banners,
      });
    } catch (error) {
      console.error('Get banners error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Create Home Banner (Admin)
  app.post('/api/v2/admin/mobile-content/banner', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      title: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }),
      imageUrl: z.string().url(),
      linkUrl: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const bannerData = req.body;
      const newBanner = await storage.createHomeBanner(bannerData);
      
      await auditLog({
        userId: req.user.id,
        action: 'banner_created',
        resourceType: 'banner',
        resourceId: newBanner.id,
        newValues: bannerData,
      });
      
      res.status(201).json({
        success: true,
        data: newBanner,
      });
    } catch (error) {
      console.error('Create banner error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Update Home Banner (Admin)
  app.put('/api/v2/admin/mobile-content/banner/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      title: z.object({
        en: z.string().min(1),
        ar: z.string().min(1),
      }).optional(),
      imageUrl: z.string().url().optional(),
      linkUrl: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedBanner = await storage.updateHomeBanner(id, updateData);
      
      await auditLog({
        userId: req.user.id,
        action: 'banner_updated',
        resourceType: 'banner',
        resourceId: id,
        newValues: updateData,
      });
      
      res.json({
        success: true,
        data: updatedBanner,
      });
    } catch (error) {
      console.error('Update banner error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Delete Home Banner (Admin)
  app.delete('/api/v2/admin/mobile-content/banner/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteHomeBanner(id);
      
      await auditLog({
        userId: req.user.id,
        action: 'banner_deleted',
        resourceType: 'banner',
        resourceId: id,
      });
      
      res.json({
        success: true,
        message: 'Banner deleted successfully',
      });
    } catch (error) {
      console.error('Delete banner error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // ==================== PUBLIC API - Mobile Content ====================

  // Get Active Slider Images (Public)
  app.get('/api/v2/public/home/slider', async (req: any, res: any) => {
    try {
      const images = await storage.getHomeSliderImages();
      res.json({
        success: true,
        data: images,
      });
    } catch (error) {
      console.error('Get public slider images error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Get Active Banner (Public)
  app.get('/api/v2/public/home/banner', async (req: any, res: any) => {
    try {
      const banner = await storage.getActiveBanner();
      res.json({
        success: true,
        data: banner,
      });
    } catch (error) {
      console.error('Get public banner error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  });

  // Create Quotation (Admin)
  app.post('/api/v2/admin/quotations', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      booking_id: z.string().uuid(),
      technician_id: z.string().uuid(),
      additional_cost: z.number().min(0),
      spare_parts: z.array(z.object({
        spare_part_id: z.string().uuid(),
        quantity: z.number().min(1),
        unit_price: z.number().min(0),
      })).optional(),
      notes: z.string().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const quotationData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Set expiry date to 7 days from now
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);
      
      const quotation = await storage.createQuotation({
        bookingId: quotationData.booking_id,
        technicianId: quotationData.technician_id,
        additionalCost: quotationData.additional_cost.toString(),
        expiresAt: expiryDate,
        notes: quotationData.notes,
      });
      
      // Add spare parts if provided
      if (quotationData.spare_parts && quotationData.spare_parts.length > 0) {
        await storage.addQuotationSpareParts(
          quotation.id,
          quotationData.spare_parts.map((sp: any) => ({
            sparePartId: sp.spare_part_id,
            quantity: sp.quantity,
            unitPrice: sp.unit_price,
          }))
        );
      }
      
      await auditLog({
        userId: req.user.id,
        action: 'quotation_created',
        resourceType: 'quotation',
        resourceId: quotation.id,
        newValues: quotation,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.quotation_created', language),
        data: quotation,
      });
      
    } catch (error) {
      console.error('Create quotation error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Reply to Support Ticket (Admin)
  app.post('/api/v2/admin/support/tickets/:id/messages', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      message: z.string().min(1),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('support.ticket_not_found', language),
        });
      }
      
      const supportMessage = await storage.createSupportMessage({
        ticketId: id,
        senderId: req.user.id,
        message,
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.message_sent', language),
        data: supportMessage,
      });
      
    } catch (error) {
      console.error('Reply to ticket error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get Users (Admin) - with optional role filter
  app.get('/api/v2/admin/users', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { role } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      let users;
      if (role) {
        users = await storage.getUsersByRole(role as string);
      } else {
        users = await storage.getAllUsers();
      }
      
      // Sanitize user data - remove sensitive fields
      const sanitizedUsers = users.map(user => {
        const { password, resetToken, resetTokenExpiry, otpCode, otpExpiry, deviceToken, ...safeUser } = user;
        return safeUser;
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.users_retrieved', language),
        data: sanitizedUsers,
      });
      
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Create User (Admin)
  app.post('/api/v2/admin/users', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      password: z.string().min(6),
      role: z.enum(['customer', 'technician', 'admin']),
      language: z.enum(['en', 'ar']).default('en'),
      is_verified: z.boolean().default(false),
    })
  }), async (req: any, res: any) => {
    try {
      const userData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Check if user already exists
      if (userData.email) {
        const existingUser = await storage.getUserByEmail(userData.email);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('auth.email_exists', language),
          });
        }
      }
      
      if (userData.phone) {
        const existingUser = await storage.getUserByPhone(userData.phone);
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('auth.phone_exists', language),
          });
        }
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        name: userData.name,
        email: userData.email || null,
        phone: userData.phone || null,
        password: hashedPassword,
        role: userData.role,
        language: userData.language,
        isVerified: userData.is_verified,
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'user_created',
        resourceType: 'user',
        resourceId: user.id,
        newValues: { ...user, passwordHash: '[REDACTED]' },
      });
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.user_created', language),
        data: { ...user, passwordHash: undefined },
      });
      
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update User (Admin)
  app.put('/api/v2/admin/users/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      password: z.string().min(6).optional(),
      role: z.enum(['customer', 'technician', 'admin']).optional(),
      language: z.enum(['en', 'ar']).optional(),
      is_verified: z.boolean().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      // Check email uniqueness if updating
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await storage.getUserByEmail(userData.email);
        if (emailExists && emailExists.id !== id) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('auth.email_exists', language),
          });
        }
      }
      
      // Check phone uniqueness if updating
      if (userData.phone && userData.phone !== existingUser.phone) {
        const phoneExists = await storage.getUserByPhone(userData.phone);
        if (phoneExists && phoneExists.id !== id) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('auth.phone_exists', language),
          });
        }
      }
      
      const updateData: any = {};
      if (userData.name) updateData.name = userData.name;
      if (userData.email !== undefined) updateData.email = userData.email || null;
      if (userData.phone !== undefined) updateData.phone = userData.phone || null;
      if (userData.role) updateData.role = userData.role;
      if (userData.language) updateData.language = userData.language;
      if (userData.is_verified !== undefined) updateData.isVerified = userData.is_verified;
      
      if (userData.password) {
        updateData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const updatedUser = await storage.updateUser(id, updateData);
      
      await auditLog({
        userId: req.user.id,
        action: 'user_updated',
        resourceType: 'user',
        resourceId: id,
        oldValues: { ...existingUser, passwordHash: '[REDACTED]' },
        newValues: { ...updatedUser, passwordHash: '[REDACTED]' },
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.user_updated', language),
        data: { ...updatedUser, passwordHash: undefined },
      });
      
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== ADMIN - BOOKING MANAGEMENT ====================

  // Get All Bookings
  app.get('/api/v2/admin/bookings', authenticateToken, authorizeRoles(['admin']), validateRequest({
    query: z.object({
      status: z.enum(['all', 'pending', 'confirmed', 'technician_assigned', 'en_route', 'in_progress', 'quotation_pending', 'completed', 'cancelled']).optional().default('all'),
    })
  }), async (req: any, res: any) => {
    try {
      const { status } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const bookingsList = await db.query.bookings.findMany({
        where: status && status !== 'all' ? eq(bookings.status, status) : undefined,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          service: {
            columns: {
              id: true,
              name: true,
            }
          },
          technician: {
            columns: {
              id: true,
              name: true,
            }
          },
          address: true,
        },
        orderBy: [desc(bookings.createdAt)],
      });
      
      res.json({
        success: true,
        data: bookingsList.map(booking => ({
          id: booking.id,
          user: booking.user ? {
            id: booking.user.id,
            name: booking.user.name,
            email: booking.user.email,
            phone: booking.user.phone,
          } : undefined,
          service: booking.service ? {
            id: booking.service.id,
            name: booking.service.name,
          } : undefined,
          technician: booking.technician ? {
            id: booking.technician.id,
            name: booking.technician.name,
          } : undefined,
          address: booking.address,
          status: booking.status,
          scheduled_date: booking.scheduledDate,
          scheduled_time: booking.scheduledTime,
          total_amount: Number(booking.totalAmount),
          payment_status: booking.paymentStatus,
          created_at: booking.createdAt,
          notes: booking.notes,
          payment_id: undefined,
        })),
      });
    } catch (error) {
      console.error('Get bookings error:', error);
      const language = req.headers['accept-language'] || 'en';
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language),
      });
    }
  });

  // Cancel Booking
  app.patch('/api/v2/admin/bookings/:id/cancel', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      reason: z.string().min(1),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      // Prevent cancelling already completed or cancelled bookings
      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel booking with status: ${booking.status}`,
        });
      }
      
      await storage.cancelBookingWithLog(id, req.user.id, reason);
      
      await auditLog({
        userId: req.user.id,
        action: 'booking_cancelled',
        resourceType: 'booking',
        resourceId: id,
        newValues: { reason, cancelledBy: req.user.id },
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.booking_cancelled', language),
      });
      
    } catch (error) {
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Refund Booking Payment
  app.post('/api/v2/admin/bookings/:id/refund', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      payment_id: z.string().uuid(),
      reason: z.string().min(1),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { payment_id, reason } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      const payment = await storage.getPayment(payment_id);
      if (!payment || payment.bookingId !== id) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found or does not match booking',
        });
      }
      
      // Validate refund eligibility
      if (payment.status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: `Cannot refund payment with status: ${payment.status}`,
        });
      }
      
      if (booking.status !== 'completed' && booking.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          message: `Can only refund completed or confirmed bookings. Current status: ${booking.status}`,
        });
      }
      
      await storage.refundBookingPayment(id, payment_id, req.user.id, reason);
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.payment_refunded', language),
      });
      
    } catch (error) {
      console.error('Refund payment error:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Booking Status (Admin)
  app.put('/api/v2/admin/bookings/:id/status', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      status: z.enum(['pending', 'confirmed', 'technician_assigned', 'en_route', 'in_progress', 'quotation_pending', 'completed', 'cancelled']),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      await storage.updateBookingStatus(id, status, req.user.id);
      
      await auditLog({
        userId: req.user.id,
        action: 'booking_status_updated',
        resourceType: 'booking',
        resourceId: id,
        oldValues: { status: booking.status },
        newValues: { status },
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.booking_status_updated', language),
        data: { status },
      });
      
    } catch (error) {
      console.error('Update booking status error:', error);
      const language = req.headers['accept-language'] || 'en';
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language),
      });
    }
  });

  // Assign Technician to Booking
  app.put('/api/v2/admin/bookings/:id/assign-technician', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      technician_id: z.string().uuid(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { technician_id } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      const technician = await storage.getUser(technician_id);
      if (!technician || technician.role !== 'technician') {
        return res.status(400).json({
          success: false,
          message: 'Invalid technician ID',
        });
      }
      
      await storage.assignTechnician(id, technician_id);
      
      // Create notification for technician
      await storage.createNotification({
        userId: technician_id,
        type: 'technician_assigned',
        title: { en: 'New Job Assigned', ar: 'تم تعيين وظيفة جديدة' },
        body: { 
          en: `You have been assigned to booking #${id.slice(0, 8)}`, 
          ar: `تم تعيينك للحجز #${id.slice(0, 8)}` 
        },
        data: { bookingId: id },
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'technician_assigned',
        resourceType: 'booking',
        resourceId: id,
        oldValues: { technicianId: booking.technicianId },
        newValues: { technicianId: technician_id },
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.technician_assigned', language),
        data: { technician_id },
      });
      
    } catch (error) {
      console.error('Assign technician error:', error);
      const language = req.headers['accept-language'] || 'en';
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language),
      });
    }
  });

  // Get List of All Payments (Admin)
  app.get('/api/v2/admin/payments', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const { status, start_date, end_date, user_id, payment_method } = req.query;
      
      // Build filter conditions
      const conditions = [];
      if (status) {
        conditions.push(sql`${payments.status} = ${status}`);
      }
      if (start_date) {
        conditions.push(gte(payments.createdAt, new Date(start_date as string)));
      }
      if (end_date) {
        conditions.push(lte(payments.createdAt, new Date(end_date as string)));
      }
      if (user_id) {
        conditions.push(eq(payments.userId, user_id as string));
      }
      if (payment_method) {
        conditions.push(sql`${payments.paymentMethod} = ${payment_method}`);
      }
      
      const paymentsList = await db.query.payments.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
            }
          },
          booking: {
            columns: {
              id: true,
              scheduledDate: true,
            }
          },
        },
        orderBy: [desc(payments.createdAt)],
      });
      
      console.log(`✅ [Payments] Retrieved ${paymentsList.length} payments`, {
        filters: { status, start_date, end_date, user_id, payment_method },
        count: paymentsList.length,
      });
      
      res.json({
        success: true,
        data: paymentsList,
        filters: { status, start_date, end_date, user_id, payment_method },
        count: paymentsList.length,
      });
      
    } catch (error) {
      const language = req.headers['accept-language'] || 'en';
      console.error('❌ [Payments Error] Full details:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        query: req.query,
        timestamp: new Date().toISOString(),
      });
      
      res.status(500).json({
        success: false,
        message: language === 'ar'
          ? 'فشل في استرداد بيانات المدفوعات. يرجى التحقق من سجلات الخادم للحصول على التفاصيل.'
          : 'Failed to retrieve payments data. Please check server logs for details.',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined,
      });
    }
  });

  // Get System Health Metrics (Admin)
  app.get('/api/v2/admin/system-health', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      
      // Get various system metrics
      const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const [activeBookings] = await db.select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(sql`status NOT IN ('completed', 'cancelled')`);
      const [todayBookings] = await db.select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(sql`DATE(created_at) = CURRENT_DATE`);
      const [pendingPayments] = await db.select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(eq(payments.status, 'pending'));
      
      // Get performance and system metrics
      const systemHealth = getSystemHealth();
      const performanceSummary = getPerformanceSummary();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metrics: {
          total_users: Number(totalUsers.count) || 0,
          active_bookings: Number(activeBookings.count) || 0,
          today_bookings: Number(todayBookings.count) || 0,
          pending_payments: Number(pendingPayments.count) || 0,
        },
        database: 'connected',
        uptime: Math.round(process.uptime()),
        system: {
          memory: systemHealth.memory,
          node_version: systemHealth.node_version,
          platform: systemHealth.platform,
        },
        performance: performanceSummary,
      };
      
      res.json({
        success: true,
        data: health,
      });
      
    } catch (error) {
      console.error('System health error:', error);
      res.status(500).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });

  // ==================== ADMIN - CUSTOMER MANAGEMENT ====================

  // Get Customer 360° Overview
  app.get('/api/v2/admin/customers/:id/overview', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      console.log('========================================');
      console.log('🔍 CUSTOMER PROFILE REQUEST');
      console.log('========================================');
      console.log('Requested Customer ID:', id);
      console.log('Request URL:', req.url);
      console.log('Request Method:', req.method);
      console.log('Admin User:', req.user?.email);
      
      console.log('\n📊 Executing Database Query: storage.getUser(id)');
      const user = await storage.getUser(id);
      
      console.log('\n✅ Database Query Result:');
      if (!user) {
        console.log('❌ NO USER FOUND in database for ID:', id);
        console.log('Returning 404 - User not found');
        console.log('========================================\n');
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      console.log('✅ USER FOUND:');
      console.log('  - User ID:', user.id);
      console.log('  - Name:', user.name);
      console.log('  - Email:', user.email);
      console.log('  - Role:', user.role);
      console.log('  - Is Verified:', user.isVerified);
      
      if (user.role !== 'customer') {
        console.log('❌ ROLE MISMATCH - User role is', user.role, 'but expected "customer"');
        console.log('Returning 404 - Not a customer');
        console.log('========================================\n');
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      console.log('✅ Role verified as customer');
      console.log('\n📊 Fetching customer overview data...');
      const overview = await storage.getCustomerOverview(id);
      console.log('✅ Customer overview data retrieved successfully');
      console.log('========================================\n');
      
      res.json({
        success: true,
        message: 'Customer overview retrieved',
        data: {
          user: {
            ...user,
            password: undefined,
            resetToken: undefined,
            otpCode: undefined,
            deviceToken: undefined,
          },
          stats: {
            totalBookings: overview.totalBookings,
            completedBookings: overview.completedBookings,
            cancelledBookings: overview.cancelledBookings,
            totalSpent: Number(overview.totalSpent) || 0,
            averageRating: Number(overview.averageRating) || 0,
            totalReviews: overview.totalReviews,
            walletBalance: Number(overview.walletBalance) || 0,
            walletEarned: Number(overview.walletEarned) || 0,
            walletSpent: Number(overview.walletSpent) || 0,
          },
          recentBookings: overview.recentBookings,
          recentPayments: overview.recentPayments,
          recentSupportTickets: overview.recentSupportTickets,
          recentReviews: overview.recentReviews,
        },
      });
      
    } catch (error) {
      console.error('Get customer overview error:', error);
      const language = req.headers['accept-language'] || 'en';
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language),
      });
    }
  });

  // Top-up Customer Wallet
  app.post('/api/v2/admin/customers/:id/wallet/topup', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      amount: z.number().positive(),
      reason: z.string().min(1),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const user = await storage.getUser(id);
      if (!user || user.role !== 'customer') {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      const transaction = await storage.creditWallet(id, amount, reason, req.user.id);
      
      await auditLog({
        userId: req.user.id,
        action: 'wallet_topup',
        resourceType: 'wallet',
        resourceId: id,
        newValues: { amount, reason, adminId: req.user.id },
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.wallet_credited', language),
        data: {
          ...transaction,
          amount: Number(transaction.amount),
          balanceAfter: Number(transaction.balanceAfter),
        },
      });
      
    } catch (error) {
      console.error('Wallet top-up error:', error);
      const language = req.headers['accept-language'] || 'en';
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : bilingual.getMessage('general.server_error', language),
      });
    }
  });

  // Get Customer Invoices
  app.get('/api/v2/admin/invoices/:bookingId', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { bookingId } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const invoices = await storage.getCustomerInvoices(bookingId);
      
      res.json({
        success: true,
        message: 'Invoices retrieved',
        data: invoices.map((inv: any) => ({
          ...inv,
          totalAmount: Number(inv.totalAmount) || 0,
        })),
      });
      
    } catch (error) {
      console.error('Get invoices error:', error);
      const language = req.headers['accept-language'] || 'en';
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language),
      });
    }
  });

  // Create Manual Invoice (Admin Only)
  app.post('/api/v2/admin/invoices/manual', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      booking_id: z.string().uuid(),
      language: z.enum(['en', 'ar']).optional(),
      regenerate: z.boolean().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { booking_id, language: invoiceLanguage, regenerate } = req.body;
      const userLanguage = req.headers['accept-language'] || 'en';
      
      // Fetch booking details
      const booking = await storage.getBooking(booking_id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', userLanguage),
        });
      }
      
      // Check if invoice already exists
      const existingInvoices = await storage.getCustomerInvoices(booking_id);
      if (existingInvoices.length > 0 && !regenerate) {
        return res.status(409).json({
          success: false,
          message: userLanguage === 'ar'
            ? 'فاتورة موجودة بالفعل لهذا الحجز. استخدم regenerate=true لإعادة إنشاء الفاتورة.'
            : 'Invoice already exists for this booking. Use regenerate=true to recreate the invoice.',
          data: {
            existing_invoice: existingInvoices[0],
            hint: 'Set regenerate=true to create a new invoice copy',
          },
        });
      }
      
      // Generate invoice using PDF service
      const invoiceData = await pdfService.generateAndSaveInvoice(
        booking_id,
        invoiceLanguage || userLanguage,
        !!regenerate
      );
      
      // Log admin action
      await auditLog({
        userId: req.user.id,
        action: regenerate ? 'invoice_regenerated' : 'manual_invoice_created',
        resourceType: 'invoice',
        resourceId: invoiceData.id,
        newValues: {
          bookingId: booking_id,
          invoiceNumber: invoiceData.invoiceNumber,
          adminId: req.user.id,
          language: invoiceLanguage || userLanguage,
        },
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.invoice_created', userLanguage),
        data: {
          ...invoiceData,
          totalAmount: Number(invoiceData.totalAmount) || 0,
        },
      });
      
    } catch (error: any) {
      console.error('Manual invoice creation error:', error);
      const language = req.headers['accept-language'] || 'en';
      
      // Handle duplicate invoice error with user-friendly message
      if (error.code === '23505' && error.constraint === 'invoices_invoice_number_unique') {
        return res.status(409).json({
          success: false,
          message: language === 'ar'
            ? 'فاتورة موجودة بالفعل بهذا الرقم. يرجى استخدام regenerate=true لإعادة إنشاء الفاتورة.'
            : 'Invoice with this number already exists. Please use regenerate=true to recreate the invoice.',
        });
      }
      
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : bilingual.getMessage('general.server_error', language),
      });
    }
  });

  // ==================== ADMIN - WALLETS ====================
  
  // Get All Wallets
  app.get('/api/v2/admin/wallets', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { role } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const wallets = await storage.getAllWallets(role as string | undefined);
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.wallets_retrieved', language),
        data: wallets.map((w: any) => ({
          ...w,
          balance: Number(w.balance) || 0,
          totalEarned: Number(w.totalEarned) || 0,
          totalSpent: Number(w.totalSpent) || 0,
        })),
      });
      
    } catch (error) {
      console.error('Get all wallets error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Get Wallet Transactions
  app.get('/api/v2/admin/wallets/:userId/transactions', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const transactions = await storage.getWalletTransactions(userId, parseInt(limit as string));
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.transactions_retrieved', language),
        data: transactions.map((t: any) => ({
          ...t,
          amount: Number(t.amount) || 0,
          balanceBefore: Number(t.balanceBefore) || 0,
          balanceAfter: Number(t.balanceAfter) || 0,
        })),
      });
      
    } catch (error) {
      console.error('Get wallet transactions error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== ADMIN - QUOTATIONS ====================
  
  // Get All Quotations
  app.get('/api/v2/admin/quotations', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { status } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const quotations = await storage.getAllQuotations(status as string | undefined);
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.quotations_retrieved', language),
        data: quotations.map((q: any) => ({
          ...q,
          additionalCost: Number(q.additionalCost) || 0,
        })),
      });
      
    } catch (error) {
      console.error('Get all quotations error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Quotation Status (Admin)
  app.put('/api/v2/admin/quotations/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      status: z.enum(['approved', 'rejected', 'pending']),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const quotation = await storage.getQuotation(id);
      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('quotation.not_found', language),
        });
      }
      
      await storage.updateQuotationStatus(id, status, req.user.id);
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.quotation_updated', language),
      });
      
    } catch (error) {
      console.error('Update quotation error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== ADMIN - NOTIFICATIONS ====================
  
  // Get All Notifications
  app.get('/api/v2/admin/notifications', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { limit = 100 } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const notifications = await storage.getAllNotifications(parseInt(limit as string));
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.notifications_retrieved', language),
        data: notifications,
      });
      
    } catch (error) {
      console.error('Get all notifications error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Send Notification (Admin)
  app.post('/api/v2/admin/notifications/send', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      user_ids: z.array(z.string().uuid()).optional(),
      role: z.enum(['customer', 'technician', 'admin']).optional(),
      type: z.enum(['booking', 'payment', 'promotion', 'system']),
      title: z.object({
        en: z.string(),
        ar: z.string().optional(),
      }),
      body: z.object({
        en: z.string(),
        ar: z.string().optional(),
      }),
    })
  }), async (req: any, res: any) => {
    try {
      const { user_ids, role, type, title, body } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      let targetUsers: string[] = [];
      if (user_ids) {
        targetUsers = user_ids;
      } else if (role) {
        const users = await storage.getUsersByRole(role);
        targetUsers = users.map(u => u.id);
      }
      
      // Create notifications for all target users
      const notifications = await Promise.all(
        targetUsers.map(userId =>
          storage.createNotification({
            userId,
            type,
            title,
            body,
          })
        )
      );
      
      // Send push notifications
      await Promise.all(
        notifications.map(notification =>
          notificationService.sendNotification({
            user_id: notification.userId,
            title: title.en,
            title_ar: title.ar,
            body: body.en,
            body_ar: body.ar,
            type,
            data: { notification_id: notification.id },
          })
        )
      );
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.notifications_sent', language),
        data: { sent_count: notifications.length },
      });
      
    } catch (error) {
      console.error('Send notification error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== ADMIN - SUPPORT TICKETS ====================
  
  // Get All Support Tickets
  app.get('/api/v2/admin/support/tickets', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { status, priority } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const tickets = await storage.getAllSupportTickets(
        status as string | undefined,
        priority as string | undefined
      );
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.support_tickets_retrieved', language),
        data: tickets,
      });
      
    } catch (error) {
      console.error('Get all support tickets error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Support Ticket
  app.put('/api/v2/admin/support/tickets/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
      assigned_to: z.string().uuid().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      console.log('[Support Ticket Update] Ticket ID:', id);
      console.log('[Support Ticket Update] Update Data:', JSON.stringify(updateData, null, 2));
      
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) {
        console.log('[Support Ticket Update] Ticket not found:', id);
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('support.ticket_not_found', language),
        });
      }
      
      const dataToUpdate: any = {};
      if (updateData.status) dataToUpdate.status = updateData.status;
      if (updateData.priority) dataToUpdate.priority = updateData.priority;
      if (updateData.assigned_to) dataToUpdate.assignedTo = updateData.assigned_to;
      
      console.log('[Support Ticket Update] Data to update:', JSON.stringify(dataToUpdate, null, 2));
      
      await storage.updateSupportTicket(id, dataToUpdate);
      
      console.log('[Support Ticket Update] Successfully updated');
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.support_ticket_updated', language),
      });
      
    } catch (error) {
      console.error('[Support Ticket Update] Error:', error);
      console.error('[Support Ticket Update] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Get Support Ticket Messages
  app.get('/api/v2/admin/support/tickets/:id/messages', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const messages = await storage.getSupportMessages(id);
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.messages_retrieved', language),
        data: messages,
      });
      
    } catch (error) {
      console.error('Get support messages error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Send Support Message (Admin Reply)
  app.post('/api/v2/admin/support/tickets/:id/messages', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      message: z.string().min(1),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('support.ticket_not_found', language),
        });
      }
      
      const sanitizedMessage = sanitizeInput(message, 'basic');
      
      const supportMessage = await storage.createSupportMessage({
        ticketId: id,
        senderId: req.user.id,
        message: sanitizedMessage,
      });
      
      await websocketService.broadcastSupportMessage(id, req.user.id, supportMessage);
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('support.message_sent', language),
        data: supportMessage,
      });
      
    } catch (error) {
      console.error('Send admin support message error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Get Support Analytics
  app.get('/api/v2/admin/support/analytics', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      
      const allTickets = await storage.getAllSupportTickets();
      
      const totalTickets = allTickets.length;
      const ratedTickets = allTickets.filter(t => t.rating).length;
      const averageRating = ratedTickets > 0 
        ? allTickets.reduce((sum, t) => sum + (t.rating || 0), 0) / ratedTickets 
        : 0;
      
      const ratingDistribution = {
        '1': allTickets.filter(t => t.rating === 1).length,
        '2': allTickets.filter(t => t.rating === 2).length,
        '3': allTickets.filter(t => t.rating === 3).length,
        '4': allTickets.filter(t => t.rating === 4).length,
        '5': allTickets.filter(t => t.rating === 5).length,
      };
      
      const statusCounts = {
        open: allTickets.filter(t => t.status === 'open').length,
        in_progress: allTickets.filter(t => t.status === 'in_progress').length,
        resolved: allTickets.filter(t => t.status === 'resolved').length,
        closed: allTickets.filter(t => t.status === 'closed').length,
      };
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.analytics_retrieved', language),
        data: {
          totalTickets,
          ratedTickets,
          averageRating: parseFloat(averageRating.toFixed(2)),
          ratingDistribution,
          statusCounts,
        },
      });
      
    } catch (error) {
      console.error('Get support analytics error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== ADMIN - SERVICES & PRICING ====================
  
  // Get All Services (Admin)
  app.get('/api/v2/admin/services', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      const categories = await storage.getServiceCategories();
      
      const servicesWithCategories = await Promise.all(
        categories.map(async (category) => {
          const services = await storage.getServicesByCategory(category.id);
          const servicesWithPackages = await Promise.all(
            services.map(async (service) => {
              const packages = await storage.getServiceTiers(service.id);
              return {
                ...service,
                basePrice: Number(service.basePrice) || 0,
                vatPercentage: Number(service.vatPercentage) || 0,
                packages: packages.map(pkg => ({
                  ...pkg,
                  price: Number(pkg.price) || 0,
                  discountPercentage: Number(pkg.discountPercentage) || 0,
                })),
              };
            })
          );
          return {
            category,
            services: servicesWithPackages,
          };
        })
      );
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.services_retrieved', language),
        data: servicesWithCategories,
      });
      
    } catch (error) {
      console.error('Get all services error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // ==================== ADMIN - ROLE MANAGEMENT ====================
  
  // Get All Roles
  app.get('/api/v2/admin/roles', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { isActive } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const roles = await storage.getRoles(isActive === 'true' ? true : isActive === 'false' ? false : undefined);
      
      res.json({
        success: true,
        message: 'Roles retrieved successfully',
        data: roles,
      });
      
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Get Role by ID
  app.get('/api/v2/admin/roles/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const role = await storage.getRole(id);
      
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found',
        });
      }
      
      res.json({
        success: true,
        message: 'Role retrieved successfully',
        data: role,
      });
      
    } catch (error) {
      console.error('Get role error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Create New Role
  app.post('/api/v2/admin/roles', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      permissions: z.array(z.string()),
      isActive: z.boolean().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const language = req.headers['accept-language'] || 'en';
      
      // Validate permissions against canonical list
      const invalidPermissions = req.body.permissions.filter((p: string) => !VALID_PERMISSIONS.includes(p as any));
      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${invalidPermissions.join(', ')}`,
        });
      }
      
      // Check if role name already exists
      const existingRole = await storage.getRoleByName(req.body.name);
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'A role with this name already exists',
        });
      }
      
      // Force isSystemRole to false for all client-created roles
      const newRole = await storage.createRole({
        ...req.body,
        isSystemRole: false,
      });
      
      // Log audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'CREATE_ROLE',
        resourceType: 'role',
        resourceId: newRole.id,
        newValues: { roleName: newRole.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: newRole,
      });
      
    } catch (error) {
      console.error('Create role error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Role
  app.put('/api/v2/admin/roles/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }),
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const role = await storage.getRole(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found',
        });
      }
      
      // Prevent editing system roles
      if (role.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'System roles cannot be modified',
        });
      }
      
      // Validate permissions if provided
      if (req.body.permissions) {
        const invalidPermissions = req.body.permissions.filter((p: string) => !VALID_PERMISSIONS.includes(p as any));
        if (invalidPermissions.length > 0) {
          return res.status(400).json({
            success: false,
            message: `Invalid permissions: ${invalidPermissions.join(', ')}`,
          });
        }
      }
      
      // If name is being changed, check it doesn't exist
      if (req.body.name && req.body.name !== role.name) {
        const existingRole = await storage.getRoleByName(req.body.name);
        if (existingRole) {
          return res.status(400).json({
            success: false,
            message: 'A role with this name already exists',
          });
        }
      }
      
      // Prevent changing isSystemRole
      const updateData = { ...req.body };
      delete updateData.isSystemRole;
      
      const updatedRole = await storage.updateRole(id, updateData);
      
      // Log audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'UPDATE_ROLE',
        resourceType: 'role',
        resourceId: id,
        newValues: req.body,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        message: 'Role updated successfully',
        data: updatedRole,
      });
      
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Delete Role
  app.delete('/api/v2/admin/roles/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const role = await storage.getRole(id);
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found',
        });
      }
      
      // Prevent deleting system roles
      if (role.isSystemRole) {
        return res.status(403).json({
          success: false,
          message: 'System roles cannot be deleted',
        });
      }
      
      // Check if any users have this role
      const allUsers = await storage.getAllUsers();
      const usersWithRole = allUsers.filter(u => u.customRoleId === id);
      if (usersWithRole.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete role: ${usersWithRole.length} user(s) currently assigned to this role`,
        });
      }
      
      await storage.deleteRole(id);
      
      // Log audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'DELETE_ROLE',
        resourceType: 'role',
        resourceId: id,
        oldValues: { roleName: role.name },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
      
    } catch (error) {
      console.error('Delete role error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== ADMIN - USER MANAGEMENT ====================
  
  // Get All Internal Users (Admin only)
  app.get('/api/v2/admin/users', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { role, status } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const users = await storage.getInternalUsers(status as string);
      
      // Filter by role if specified
      let filteredUsers = users;
      if (role) {
        filteredUsers = users.filter(user => user.role === role);
      }
      
      // Remove password from response
      const safeUsers = filteredUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.users_retrieved', language),
        data: safeUsers,
      });
      
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get User by ID (Admin only)
  app.get('/api/v2/admin/users/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('admin.user_not_found', language),
        });
      }
      
      // Remove password from response
      const { password, ...safeUser } = user;
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.user_retrieved', language),
        data: safeUser,
      });
      
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Create User (Admin only)
  app.post('/api/v2/admin/users', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      password: passwordSchema, // Strong password policy
      name: z.string().min(2),
      nameAr: z.string().optional(),
      role: z.enum(['admin', 'technician', 'support', 'finance']),
      status: z.enum(['active', 'inactive', 'suspended']).default('active'),
      language: z.enum(['en', 'ar']).default('en'),
    }).refine(data => data.email || data.phone, {
      message: "Either email or phone is required"
    })
  }), async (req: any, res: any) => {
    try {
      const { email, phone, password, name, nameAr, role, status, language } = req.body;
      const lang = req.headers['accept-language'] || 'en';
      
      // Check if user exists
      const existingUser = email 
        ? await storage.getUserByEmail(email)
        : phone ? await storage.getUserByPhone(phone!) : null;
        
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('auth.user_already_exists', lang),
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        email,
        phone: phone ? HELPERS.formatSaudiPhone(phone) : undefined,
        password: hashedPassword,
        name,
        nameAr,
        role,
        status,
        language,
        isVerified: true, // Admin-created users are auto-verified
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'user_created',
        resourceType: 'user',
        resourceId: user.id,
        newValues: { email, phone, name, role, status }
      });
      
      // Remove password from response
      const { password: _, ...safeUser } = user;
      
      res.status(201).json({
        success: true,
        message: bilingual.getMessage('admin.user_created', lang),
        data: safeUser,
      });
      
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Update User (Admin only)
  app.put('/api/v2/admin/users/:id', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      password: z.string().min(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH).optional(),
      name: z.string().min(2).optional(),
      nameAr: z.string().optional(),
      role: z.enum(['admin', 'technician', 'support', 'finance']).optional(),
      status: z.enum(['active', 'inactive', 'suspended']).optional(),
      language: z.enum(['en', 'ar']).optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { password, ...updateData } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('admin.user_not_found', language),
        });
      }
      
      // Hash password if provided
      const updates: any = { ...updateData };
      if (password) {
        updates.password = await bcrypt.hash(password, 10);
      }
      
      const updatedUser = await storage.updateUser(id, updates);
      
      await auditLog({
        userId: req.user.id,
        action: 'user_updated',
        resourceType: 'user',
        resourceId: id,
        oldValues: user,
        newValues: updates
      });
      
      // Remove password from response
      const { password: _, ...safeUser } = updatedUser;
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.user_updated', language),
        data: safeUser,
      });
      
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Update User Status (Admin only)
  app.patch('/api/v2/admin/users/:id/status', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      status: z.enum(['active', 'inactive', 'suspended']),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('admin.user_not_found', language),
        });
      }
      
      await storage.updateUserStatus(id, status);
      
      await auditLog({
        userId: req.user.id,
        action: 'user_status_updated',
        resourceType: 'user',
        resourceId: id,
        oldValues: { status: user.status },
        newValues: { status }
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.user_status_updated', language),
      });
      
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Delete User (Admin only)
  app.delete('/api/v2/admin/users/:id', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const user = await storage.getUser(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('admin.user_not_found', language),
        });
      }
      
      // Prevent deleting yourself
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('admin.cannot_delete_self', language),
        });
      }
      
      // Check for related data that would prevent deletion
      const relatedData = [];
      
      // Check for bookings (as customer)
      const userBookings = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(eq(bookings.userId, id));
      
      const bookingCount = Number(userBookings[0]?.count || 0);
      if (bookingCount > 0) {
        relatedData.push(`${bookingCount} booking${bookingCount > 1 ? 's' : ''}`);
      }
      
      // Check for payments
      const userPayments = await db
        .select({ count: sql<number>`count(*)` })
        .from(payments)
        .where(eq(payments.userId, id));
      
      const paymentCount = Number(userPayments[0]?.count || 0);
      if (paymentCount > 0) {
        relatedData.push(`${paymentCount} payment${paymentCount > 1 ? 's' : ''}`);
      }
      
      // Check for wallet transactions
      const userTransactions = await db
        .select({ count: sql<number>`count(*)` })
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, id));
      
      const transactionCount = Number(userTransactions[0]?.count || 0);
      if (transactionCount > 0) {
        relatedData.push(`${transactionCount} wallet transaction${transactionCount > 1 ? 's' : ''}`);
      }
      
      // If there's related data, prevent deletion
      if (relatedData.length > 0) {
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? `لا يمكن حذف هذا المستخدم. يحتوي على ${relatedData.join('، ')} في النظام.`
            : `Cannot delete this user. User has ${relatedData.join(', ')} in the system.`,
          relatedData: {
            bookings: bookingCount,
            payments: paymentCount,
            transactions: transactionCount,
          },
        });
      }
      
      await storage.deleteUser(id);
      
      await auditLog({
        userId: req.user.id,
        action: 'user_deleted',
        resourceType: 'user',
        resourceId: id,
        oldValues: user
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('admin.user_deleted', language),
      });
      
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // ==================== TECHNICIAN ENDPOINTS ====================
  
  // Get Technician Orders
  app.get('/api/v2/technician/orders', authenticateToken, authorizeRoles(['technician']), async (req: any, res: any) => {
    try {
      const { status } = req.query;
      const orders = await storage.getTechnicianBookings(req.user.id, status as string);
      const language = req.headers['accept-language'] || 'en';
      
      res.json({
        success: true,
        message: bilingual.getMessage('orders.technician_orders_retrieved', language),
        data: orders,
      });
      
    } catch (error) {
      console.error('Get technician orders error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Accept Order
  app.put('/api/v2/technician/orders/:id/accept', authenticateToken, authorizeRoles(['technician']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!booking || booking.technicianId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('booking.not_assigned', language),
        });
      }
      
      if (booking.status !== 'technician_assigned') {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('booking.cannot_accept', language),
        });
      }
      
      await storage.updateBookingStatus(id, 'confirmed', req.user.id);
      
      // Broadcast status update via WebSocket
      await websocketService.broadcastBookingStatus(id, booking.userId, 'confirmed');
      
      // Send notification to customer
      await notificationService.sendOrderStatusNotification(booking.userId, id, 'confirmed', language);
      
      res.json({
        success: true,
        message: bilingual.getMessage('orders.accepted_successfully', language),
      });
      
    } catch (error) {
      console.error('Accept order error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Update Order Status
  app.put('/api/v2/technician/orders/:id/status', authenticateToken, authorizeRoles(['technician']), validateRequest({
    body: z.object({
      status: z.enum(['en_route', 'in_progress', 'completed']),
      notes: z.string().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const booking = await storage.getBooking(id);
      const language = req.headers['accept-language'] || 'en';
      
      if (!booking || booking.technicianId !== req.user.id) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('booking.not_assigned', language),
        });
      }
      
      await storage.updateBookingStatus(id, status, req.user.id);
      
      // Broadcast status update via WebSocket
      await websocketService.broadcastBookingStatus(id, booking.userId, status);
      
      // Send notification to customer
      await notificationService.sendOrderStatusNotification(booking.userId, id, status, language);
      
      // Send SMS for critical statuses
      if (['en_route', 'completed'].includes(status)) {
        const user = await storage.getUser(booking.userId);
        if (user?.phone) {
          await twilioService.sendOrderUpdate(user.phone, booking.id, status, language);
        }
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('orders.status_updated', language),
      });
      
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Get Technician Bookings (alternative endpoint for frontend compatibility)
  app.get('/api/v2/technician/:userId/bookings', authenticateToken, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { status } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      // Verify user is accessing their own bookings or is admin
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: bilingual.getMessage('general.unauthorized', language),
        });
      }
      
      const bookingsList = await db.query.bookings.findMany({
        where: status 
          ? and(eq(bookings.technicianId, userId), eq(bookings.status, status))
          : eq(bookings.technicianId, userId),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          service: {
            columns: {
              id: true,
              name: true,
            }
          },
          address: true,
        },
        orderBy: [desc(bookings.createdAt)],
      });
      
      res.json({
        success: true,
        data: bookingsList,
      });
      
    } catch (error) {
      console.error('Get technician bookings error:', error);
      const language = req.headers['accept-language'] || 'en';
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language),
      });
    }
  });

  // Get Technician Performance (Technician's own data)
  app.get('/api/v2/technician/performance', authenticateToken, authorizeRoles(['technician']), async (req: any, res: any) => {
    try {
      const technicianId = req.user.id;
      const language = req.headers['accept-language'] || 'en';
      
      // Get all bookings for performance calculation
      const allBookings = await db.query.bookings.findMany({
        where: eq(bookings.technicianId, technicianId),
        orderBy: [desc(bookings.createdAt)],
      });
      
      const completedBookings = allBookings.filter(b => b.status === 'completed');
      const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');
      
      // Calculate metrics
      const totalJobs = allBookings.length;
      const completedJobs = completedBookings.length;
      const cancelledJobs = cancelledBookings.length;
      const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      const cancellationRate = totalJobs > 0 ? (cancelledJobs / totalJobs) * 100 : 0;
      
      // Get all bookings with reviews for rating calculation
      const bookingsWithReviews = await db.query.bookings.findMany({
        where: eq(bookings.technicianId, technicianId),
        with: {
          reviews: true,
        },
      });
      
      // Calculate average rating from reviews
      const reviewsList = bookingsWithReviews.filter(b => (b.reviews as any)?.technicianRating);
      const ratingsSum = reviewsList.reduce((sum, b) => sum + ((b.reviews as any)?.technicianRating || 0), 0);
      const ratingsCount = reviewsList.length;
      const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;
      
      // Calculate total revenue from completed bookings
      const totalRevenue = completedBookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
      
      // Calculate average response time (hours from created to assigned)
      const responseTimes = completedBookings
        .filter(b => b.assignedAt)
        .map(b => {
          const createdTime = new Date(b.createdAt).getTime();
          const assignedTime = new Date(b.assignedAt!).getTime();
          return (assignedTime - createdTime) / (1000 * 60 * 60); // Convert to hours
        });
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;
      
      // Get monthly performance for chart
      const monthlyStats = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const monthBookings = allBookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate >= month && bookingDate < nextMonth;
        });
        
        const monthCompleted = monthBookings.filter(b => b.status === 'completed');
        const monthRevenue = monthCompleted.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
        
        monthlyStats.push({
          month: month.toLocaleDateString('en', { month: 'short', year: 'numeric' }),
          completed: monthCompleted.length,
          cancelled: monthBookings.filter(b => b.status === 'cancelled').length,
          total: monthBookings.length,
          revenue: parseFloat(monthRevenue.toFixed(2)),
        });
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('performance.retrieved_successfully', language),
        data: {
          overall: {
            totalJobs,
            completedJobs,
            cancelledJobs,
            completionRate: parseFloat(completionRate.toFixed(2)),
            cancellationRate: parseFloat(cancellationRate.toFixed(2)),
            averageRating: parseFloat(averageRating.toFixed(2)),
            averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          },
          monthlyStats,
          recentCompletedJobs: completedBookings.slice(0, 10),
        },
      });
      
    } catch (error) {
      console.error('Get technician performance error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Get Technician Quotations (Technician's own quotations)
  app.get('/api/v2/technician/quotations', authenticateToken, authorizeRoles(['technician']), async (req: any, res: any) => {
    try {
      const technicianId = req.user.id;
      const { status } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      const quotationsList = await db.query.quotations.findMany({
        where: status 
          ? and(eq(quotations.technicianId, technicianId), eq(quotations.status, status))
          : eq(quotations.technicianId, technicianId),
        with: {
          booking: {
            with: {
              service: true,
              user: {
                columns: {
                  id: true,
                  name: true,
                  phone: true,
                }
              },
            }
          },
        },
        orderBy: [desc(quotations.createdAt)],
      });
      
      res.json({
        success: true,
        message: bilingual.getMessage('quotations.retrieved_successfully', language),
        data: quotationsList,
      });
      
    } catch (error) {
      console.error('Get technician quotations error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Technician Availability (Technician updates their own)
  app.put('/api/v2/technician/availability', authenticateToken, authorizeRoles(['technician']), validateRequest({
    body: z.object({
      availabilityStatus: z.enum(['available', 'busy', 'on_job', 'off_duty']).optional(),
      workingHours: z.record(z.object({
        start: z.string(),
        end: z.string(),
        enabled: z.boolean(),
      })).optional(),
      daysOff: z.array(z.string()).optional(),
      serviceRadius: z.number().optional(),
      homeLatitude: z.number().optional(),
      homeLongitude: z.number().optional(),
      maxDailyBookings: z.number().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const technicianId = req.user.id;
      const updates = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      // Update technician availability settings
      await db.update(users)
        .set({
          availabilityStatus: updates.availabilityStatus,
          workingHours: updates.workingHours as any,
          daysOff: updates.daysOff as any,
          serviceRadius: updates.serviceRadius,
          homeLatitude: updates.homeLatitude?.toString(),
          homeLongitude: updates.homeLongitude?.toString(),
          maxDailyBookings: updates.maxDailyBookings,
        })
        .where(eq(users.id, technicianId));
      
      res.json({
        success: true,
        message: bilingual.getMessage('availability.updated_successfully', language),
      });
      
    } catch (error) {
      console.error('Update technician availability error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // ==================== ADMIN - TECHNICIAN MANAGEMENT ====================
  
  // Get Technician Profile (Admin only)
  app.get('/api/v2/admin/technicians/:id/profile', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const technician = await storage.getUser(id);
      if (!technician || technician.role !== 'technician') {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('admin.technician_not_found', language),
        });
      }
      
      // Get performance metrics
      const completedBookings = await db.query.bookings.findMany({
        where: and(
          eq(bookings.technicianId, id),
          eq(bookings.status, 'completed')
        ),
        with: {
          reviews: true,
        },
      });
      
      const totalCompleted = completedBookings.length;
      
      // Calculate average rating from reviews
      const reviewsWithRatings = completedBookings.filter(b => (b.reviews as any)?.technicianRating);
      const avgRating = reviewsWithRatings.length > 0
        ? reviewsWithRatings.reduce((sum, b) => sum + ((b.reviews as any)?.technicianRating || 0), 0) / reviewsWithRatings.length
        : 0;
      
      // Get active bookings count
      const activeBookings = await db.query.bookings.findMany({
        where: and(
          eq(bookings.technicianId, id),
          sql`${bookings.status} IN ('pending', 'confirmed', 'technician_assigned', 'en_route', 'in_progress')`
        ),
      });
      
      // Get assignment logs
      const assignmentLogs = await db.query.assignmentLogs.findMany({
        where: eq(sql`technician_id`, id),
        orderBy: [desc(sql`created_at`)],
        limit: 10,
      });
      
      // Remove password from response
      const { password, ...safeTechnician } = technician;
      
      res.json({
        success: true,
        message: 'Technician profile retrieved successfully',
        data: {
          ...safeTechnician,
          performance: {
            totalCompleted,
            averageRating: parseFloat(avgRating.toFixed(2)),
            activeBookings: activeBookings.length,
            completionRate: totalCompleted > 0 ? parseFloat((totalCompleted / (totalCompleted + activeBookings.length) * 100).toFixed(2)) : 0,
          },
          recentAssignments: assignmentLogs,
        },
      });
      
    } catch (error) {
      console.error('Get technician profile error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get Technician Performance Metrics (Admin only)
  app.get('/api/v2/admin/technicians/:id/performance', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      // Get all bookings for performance calculation
      const allBookings = await db.query.bookings.findMany({
        where: eq(bookings.technicianId, id),
        orderBy: [desc(bookings.createdAt)],
      });
      
      const completedBookings = allBookings.filter(b => b.status === 'completed');
      const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');
      
      // Calculate metrics
      const totalJobs = allBookings.length;
      const completedJobs = completedBookings.length;
      const cancelledJobs = cancelledBookings.length;
      const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
      const cancellationRate = totalJobs > 0 ? (cancelledJobs / totalJobs) * 100 : 0;
      
      // Get all bookings with reviews for rating calculation
      const bookingsWithReviews = await db.query.bookings.findMany({
        where: eq(bookings.technicianId, id),
        with: {
          reviews: true,
        },
      });
      
      // Calculate average rating from reviews
      const reviewsList = bookingsWithReviews.filter(b => (b.reviews as any)?.technicianRating);
      const ratingsSum = reviewsList.reduce((sum, b) => sum + ((b.reviews as any)?.technicianRating || 0), 0);
      const ratingsCount = reviewsList.length;
      const averageRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;
      
      // Calculate average response time (hours from created to assigned)
      const responseTimes = completedBookings
        .filter(b => b.assignedAt)
        .map(b => {
          const createdTime = new Date(b.createdAt).getTime();
          const assignedTime = new Date(b.assignedAt!).getTime();
          return (assignedTime - createdTime) / (1000 * 60 * 60); // Convert to hours
        });
      const averageResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;
      
      // Get monthly performance for chart
      const monthlyStats = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        
        const monthBookings = allBookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          return bookingDate >= month && bookingDate < nextMonth;
        });
        
        monthlyStats.push({
          month: month.toLocaleDateString('en', { month: 'short', year: 'numeric' }),
          completed: monthBookings.filter(b => b.status === 'completed').length,
          cancelled: monthBookings.filter(b => b.status === 'cancelled').length,
          total: monthBookings.length,
        });
      }
      
      res.json({
        success: true,
        message: 'Performance metrics retrieved successfully',
        data: {
          overall: {
            totalJobs,
            completedJobs,
            cancelledJobs,
            completionRate: parseFloat(completionRate.toFixed(2)),
            cancellationRate: parseFloat(cancellationRate.toFixed(2)),
            averageRating: parseFloat(averageRating.toFixed(2)),
            averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
          },
          monthlyStats,
          recentCompletedJobs: completedBookings.slice(0, 5),
        },
      });
      
    } catch (error) {
      console.error('Get technician performance error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Get Technician Assignment Logs (Admin only)
  app.get('/api/v2/admin/technicians/:id/assignments', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const language = req.headers['accept-language'] || 'en';
      
      const assignments = await db.query.assignmentLogs.findMany({
        where: eq(sql`technician_id`, id),
        orderBy: [desc(sql`created_at`)],
        limit: 50,
      });
      
      res.json({
        success: true,
        message: 'Assignment logs retrieved successfully',
        data: assignments,
      });
      
    } catch (error) {
      console.error('Get assignment logs error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Update Technician Availability (Admin only)
  app.put('/api/v2/admin/technicians/:id/availability', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      availabilityStatus: z.enum(['available', 'busy', 'on_job', 'off_duty']).optional(),
      workingHours: z.record(z.object({
        start: z.string(),
        end: z.string(),
        enabled: z.boolean(),
      })).optional(),
      daysOff: z.array(z.string()).optional(),
      serviceRadius: z.number().optional(),
      homeLatitude: z.number().optional(),
      homeLongitude: z.number().optional(),
      maxDailyBookings: z.number().optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const technician = await storage.getUser(id);
      if (!technician || technician.role !== 'technician') {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('admin.technician_not_found', language),
        });
      }
      
      // Update technician availability settings
      await db.update(users)
        .set({
          availabilityStatus: updates.availabilityStatus,
          workingHours: updates.workingHours as any,
          daysOff: updates.daysOff as any,
          serviceRadius: updates.serviceRadius,
          homeLatitude: updates.homeLatitude?.toString(),
          homeLongitude: updates.homeLongitude?.toString(),
          maxDailyBookings: updates.maxDailyBookings,
        })
        .where(eq(users.id, id));
      
      await auditLog({
        userId: req.user.id,
        action: 'technician_availability_updated',
        resourceType: 'user',
        resourceId: id,
        newValues: updates,
      });
      
      res.json({
        success: true,
        message: 'Technician availability updated successfully',
      });
      
    } catch (error) {
      console.error('Update technician availability error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });
  
  // Update Technician Specializations (Admin only)
  app.put('/api/v2/admin/technicians/:id/specializations', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      specializations: z.array(z.string().uuid()),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { specializations } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const technician = await storage.getUser(id);
      if (!technician || technician.role !== 'technician') {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('admin.technician_not_found', language),
        });
      }
      
      await db.update(users)
        .set({
          specializations: specializations as any,
        })
        .where(eq(users.id, id));
      
      await auditLog({
        userId: req.user.id,
        action: 'technician_specializations_updated',
        resourceType: 'user',
        resourceId: id,
        newValues: { specializations },
      });
      
      res.json({
        success: true,
        message: 'Technician specializations updated successfully',
      });
      
    } catch (error) {
      console.error('Update technician specializations error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Get All Technicians with Specializations (Admin only)
  app.get('/api/v2/admin/technicians/specializations', authenticateToken, authorizeRoles(['admin']), async (req: any, res: any) => {
    try {
      const { categoryId } = req.query;
      const language = req.headers['accept-language'] || 'en';
      
      // Get all technicians
      const technicians = await db.query.users.findMany({
        where: eq(users.role, 'technician'),
        orderBy: [asc(users.name)],
      });
      
      // Get all service categories for reference
      const categories = await storage.getServiceCategories();
      
      // Filter by category if specified
      let filteredTechnicians = technicians;
      if (categoryId) {
        filteredTechnicians = technicians.filter(tech => {
          const specs = tech.specializations as string[] || [];
          return specs.includes(categoryId as string);
        });
      }
      
      // Map technicians with their specialization details
      const techsWithSpecs = filteredTechnicians.map(tech => {
        const specs = tech.specializations as string[] || [];
        const specializationDetails = specs.map(specId => {
          const category = categories.find(c => c.id === specId);
          if (!category) return null;
          const catName = category.name as any;
          return {
            id: category.id,
            name: language === 'ar' ? (catName?.ar || catName?.en || catName) : (catName?.en || catName),
          };
        }).filter(Boolean);
        
        return {
          id: tech.id,
          name: tech.name,
          nameAr: tech.nameAr,
          email: tech.email,
          phone: tech.phone,
          status: tech.status,
          availabilityStatus: tech.availabilityStatus,
          specializations: specializationDetails,
        };
      });
      
      // Calculate coverage statistics
      const coverageStats = categories.map(cat => {
        const catName = cat.name as any;
        return {
          categoryId: cat.id,
          categoryName: language === 'ar' ? (catName?.ar || catName?.en || catName) : (catName?.en || catName),
          technicianCount: technicians.filter(tech => {
            const specs = tech.specializations as string[] || [];
            return specs.includes(cat.id);
          }).length,
        };
      });
      
      res.json({
        success: true,
        message: 'Technicians and specializations retrieved successfully',
        data: {
          technicians: techsWithSpecs,
          categories,
          coverageStats,
        },
      });
      
    } catch (error) {
      console.error('Get technicians specializations error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Technician Profile (Admin only)
  app.put('/api/v2/admin/technicians/:id/profile', authenticateToken, authorizeRoles(['admin']), validateRequest({
    body: z.object({
      name: z.string().optional(),
      nameAr: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      status: z.enum(['active', 'inactive', 'suspended']).optional(),
      certifications: z.array(z.object({
        name: z.string(),
        issuer: z.string(),
        issuedDate: z.string(),
        expiryDate: z.string().optional(),
        certificateNumber: z.string().optional(),
      })).optional(),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const technician = await storage.getUser(id);
      if (!technician || technician.role !== 'technician') {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('admin.technician_not_found', language),
        });
      }
      
      // Update technician profile
      await storage.updateUser(id, {
        name: updates.name,
        nameAr: updates.nameAr,
        email: updates.email,
        phone: updates.phone,
        status: updates.status,
        certifications: updates.certifications as any,
      });
      
      await auditLog({
        userId: req.user.id,
        action: 'technician_profile_updated',
        resourceType: 'user',
        resourceId: id,
        newValues: updates,
      });
      
      res.json({
        success: true,
        message: 'Technician profile updated successfully',
      });
      
    } catch (error) {
      console.error('Update technician profile error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  });

  // Update Booking Status (for technicians - alternative endpoint)
  app.put('/api/v2/bookings/:id/status', authenticateToken, validateRequest({
    body: z.object({
      status: z.enum(['confirmed', 'en_route', 'in_progress', 'quotation_pending', 'completed']),
    })
  }), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const language = req.headers['accept-language'] || 'en';
      
      const booking = await storage.getBooking(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage('general.not_found', language),
        });
      }
      
      // Verify technician is assigned to this booking or user is admin
      if (req.user.role === 'technician' && booking.technicianId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: bilingual.getMessage('booking.not_assigned', language),
        });
      }
      
      await storage.updateBookingStatus(id, status, req.user.id);
      
      // Broadcast status update via WebSocket
      if (websocketService) {
        await websocketService.broadcastBookingStatus(id, booking.userId, status);
      }
      
      // Send notification to customer
      if (notificationService) {
        await notificationService.sendOrderStatusNotification(booking.userId, id, status, language);
      }
      
      res.json({
        success: true,
        message: bilingual.getMessage('orders.status_updated', language),
        data: { status },
      });
      
    } catch (error) {
      console.error('Update booking status error:', error);
      const language = req.headers['accept-language'] || 'en';
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language),
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
