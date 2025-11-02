import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { bilingual } from '../utils/bilingual';

// Strong password validation schema
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

// Booking validation schema
export const createBookingSchema = z.object({
  service_id: z.string().uuid('Invalid service ID'),
  package_id: z.string().uuid('Invalid package ID').optional(),
  address_id: z.string().uuid('Invalid address ID'),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD'),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format, expected HH:MM'),
  notes: z.string().optional(),
  notes_ar: z.string().optional(),
  referral_code: z.string().transform(val => val?.trim() || undefined).optional().refine(val => !val || (val.length >= 1 && val.length <= 20), {
    message: 'Referral code must be between 1 and 20 characters'
  }),
  coupon_code: z.string().transform(val => val?.trim() || undefined).optional().refine(val => !val || (val.length >= 1 && val.length <= 50), {
    message: 'Coupon code must be between 1 and 50 characters'
  }),
});

// Quotation validation schema
export const createQuotationSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
  additional_cost: z.number().min(0).optional(),
  spare_parts: z.array(z.object({
    spare_part_id: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).optional(),
  notes: z.string().optional(),
  notes_ar: z.string().optional(),
});

// Generic validation function
export const validateSchema = <T>(schema: z.ZodSchema<T>, data: any): T => {
  return schema.parse(data);
};

interface ValidationSchema {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
  headers?: z.ZodSchema;
}

/**
 * Middleware factory to validate request data using Zod schemas
 */
export const validateRequest = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const language = req.headers['accept-language'] || 'en';

      // Validate body
      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('validation.invalid_data', language),
            errors: formatZodErrors(result.error, language),
          });
        }
        req.body = result.data;
      }

      // Validate query parameters
      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('validation.invalid_data', language),
            errors: formatZodErrors(result.error, language),
          });
        }
        req.query = result.data;
      }

      // Validate URL parameters
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('validation.invalid_data', language),
            errors: formatZodErrors(result.error, language),
          });
        }
        req.params = result.data;
      }

      // Validate headers
      if (schema.headers) {
        const result = schema.headers.safeParse(req.headers);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            message: bilingual.getMessage('validation.invalid_data', language),
            errors: formatZodErrors(result.error, language),
          });
        }
      }

      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      const language = req.headers['accept-language'] || 'en';
      
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', language),
      });
    }
  };
};

/**
 * Format Zod validation errors into a user-friendly format
 */
function formatZodErrors(error: ZodError, language: string = 'en'): any[] {
  return error.errors.map((err) => {
    let message = err.message;
    
    // Map common Zod error messages to bilingual messages
    switch (err.code) {
      case 'invalid_type':
        if (err.expected === 'string') {
          message = language === 'ar' ? 'يجب أن يكون النص' : 'Must be a string';
        } else if (err.expected === 'number') {
          message = language === 'ar' ? 'يجب أن يكون رقماً' : 'Must be a number';
        } else if (err.expected === 'boolean') {
          message = language === 'ar' ? 'يجب أن يكون صحيح أو خطأ' : 'Must be true or false';
        }
        break;
      
      case 'too_small':
        if (err.type === 'string') {
          message = language === 'ar' 
            ? `يجب أن يحتوي على ${err.minimum} أحرف على الأقل`
            : `Must be at least ${err.minimum} characters`;
        } else if (err.type === 'number') {
          message = language === 'ar'
            ? `يجب أن يكون ${err.minimum} على الأقل`
            : `Must be at least ${err.minimum}`;
        }
        break;
      
      case 'too_big':
        if (err.type === 'string') {
          message = language === 'ar'
            ? `يجب أن لا يتجاوز ${err.maximum} أحرف`
            : `Must be at most ${err.maximum} characters`;
        } else if (err.type === 'number') {
          message = language === 'ar'
            ? `يجب أن لا يتجاوز ${err.maximum}`
            : `Must be at most ${err.maximum}`;
        }
        break;
      
      case 'invalid_string':
        if (err.validation === 'email') {
          message = language === 'ar' ? 'بريد إلكتروني غير صحيح' : 'Invalid email address';
        } else if (err.validation === 'url') {
          message = language === 'ar' ? 'رابط غير صحيح' : 'Invalid URL';
        } else if (err.validation === 'uuid') {
          message = language === 'ar' ? 'معرف غير صحيح' : 'Invalid ID format';
        }
        break;
      
      case 'invalid_enum_value':
        message = language === 'ar'
          ? `قيمة غير صحيحة. القيم المسموحة: ${err.options.join(', ')}`
          : `Invalid value. Allowed: ${err.options.join(', ')}`;
        break;
      
      case 'custom':
        // Keep custom error messages as they are
        break;
      
      default:
        message = language === 'ar' ? 'قيمة غير صحيحة' : 'Invalid value';
    }

    return {
      field: err.path.join('.'),
      message,
      received: (err as any).received || undefined,
    };
  });
}

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  saudiPhone: z.string().regex(/^(\+966|966|0)?[5][0-9]{8}$/, 'Invalid Saudi phone number'),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  dateRange: z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
  }),
  language: z.enum(['en', 'ar']).default('en'),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  money: z.number().min(0).multipleOf(0.01), // Ensures 2 decimal places
  rating: z.number().int().min(1).max(5),
  password: z.string().min(8).max(128),
};

/**
 * File upload validation
 */
export const validateFileUpload = (options: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  required?: boolean;
} = {}) => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [], required = false } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en';
    const file = (req as any).file;
    
    if (!file && required) {
      return res.status(400).json({
        success: false,
        message: language === 'ar' ? 'الملف مطلوب' : 'File is required',
      });
    }
    
    if (file) {
      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: language === 'ar' 
            ? `حجم الملف يجب أن لا يتجاوز ${maxSize / (1024 * 1024)}MB`
            : `File size must not exceed ${maxSize / (1024 * 1024)}MB`,
        });
      }
      
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: language === 'ar'
            ? `نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`
            : `File type not supported. Allowed types: ${allowedTypes.join(', ')}`,
        });
      }
    }
    
    next();
  };
};

/**
 * Sanitization helper
 */
export const sanitizeInput = {
  /**
   * Remove HTML tags from string
   */
  stripHtml: (input: string): string => {
    return input.replace(/<[^>]*>/g, '');
  },

  /**
   * Normalize phone number to international format
   */
  normalizePhone: (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Handle Saudi phone numbers
    if (cleaned.startsWith('05') && cleaned.length === 10) {
      return '+966' + cleaned.substring(1);
    }
    
    if (cleaned.startsWith('5') && cleaned.length === 9) {
      return '+966' + cleaned;
    }
    
    if (cleaned.startsWith('966') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  },

  /**
   * Normalize email to lowercase
   */
  normalizeEmail: (email: string): string => {
    return email.toLowerCase().trim();
  },

  /**
   * Escape special characters for database queries
   */
  escapeString: (input: string): string => {
    return input.replace(/[\0\n\r\b\t\\'"\x1a]/g, (s) => {
      switch (s) {
        case "\0": return "\\0";
        case "\n": return "\\n";
        case "\r": return "\\r";
        case "\b": return "\\b";
        case "\t": return "\\t";
        case "\x1a": return "\\Z";
        default: return "\\" + s;
      }
    });
  }
};
