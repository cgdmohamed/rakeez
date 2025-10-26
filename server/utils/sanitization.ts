import sanitizeHtml from 'sanitize-html';

/**
 * HTML Sanitization Utility
 * Removes potentially dangerous HTML/JavaScript while preserving safe formatting
 */

export const sanitizationConfig = {
  // Strict: Remove all HTML tags - for plain text fields
  strict: {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text: string) => text.trim()
  },
  
  // Basic: Allow basic formatting - for user comments/reviews
  basic: {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: {},
    allowedSchemes: [],
    textFilter: (text: string) => text.trim()
  },
  
  // None: No HTML allowed at all
  none: {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'recursiveEscape' as const
  }
};

/**
 * Sanitize user input by removing dangerous HTML/JavaScript
 * @param input - The input string to sanitize
 * @param mode - Sanitization mode: 'strict' | 'basic' | 'none'
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeInput(input: string, mode: 'strict' | 'basic' | 'none' = 'strict'): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const config = sanitizationConfig[mode];
  return sanitizeHtml(input, config);
}

/**
 * Sanitize an entire object's string fields recursively
 * @param obj - Object with potentially unsafe string values
 * @param mode - Sanitization mode
 * @param fieldsToSanitize - Array of field names to sanitize (if undefined, sanitizes all strings)
 * @returns Object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  mode: 'strict' | 'basic' | 'none' = 'strict',
  fieldsToSanitize?: string[]
): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    const value = sanitized[key];
    
    // Check if this field should be sanitized
    const shouldSanitize = !fieldsToSanitize || fieldsToSanitize.includes(key);
    
    if (shouldSanitize && typeof value === 'string') {
      sanitized[key] = sanitizeInput(value, mode) as any;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, mode, fieldsToSanitize) as any;
    } else if (Array.isArray(value)) {
      // Sanitize array elements if they're strings
      sanitized[key] = value.map((item: any) => 
        typeof item === 'string' && shouldSanitize 
          ? sanitizeInput(item, mode) 
          : item
      ) as any;
    }
  }

  return sanitized;
}

/**
 * Sanitize bilingual content objects (common pattern in this app)
 * @param bilingual - Object with ar/en language keys
 * @param mode - Sanitization mode
 * @returns Sanitized bilingual object
 */
export function sanitizeBilingual(
  bilingual: { ar: string; en: string } | undefined,
  mode: 'strict' | 'basic' | 'none' = 'strict'
): { ar: string; en: string } | undefined {
  if (!bilingual) return undefined;
  
  return {
    ar: sanitizeInput(bilingual.ar || '', mode),
    en: sanitizeInput(bilingual.en || '', mode)
  };
}

/**
 * Validate and sanitize file upload metadata
 * @param filename - Original filename
 * @returns Sanitized filename safe for filesystem
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');
  
  // Remove special characters except dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop() || '';
    sanitized = sanitized.substring(0, 250 - ext.length) + '.' + ext;
  }
  
  return sanitized;
}

/**
 * Fields that commonly need sanitization
 */
export const SANITIZABLE_FIELDS = {
  // Review fields
  review: ['comment', 'title', 'response'],
  
  // Support ticket fields
  support: ['subject', 'message', 'description'],
  
  // Booking fields
  booking: ['notes', 'special_instructions', 'description'],
  
  // User profile fields
  user: ['bio', 'description', 'notes'],
  
  // Service fields
  service: ['notes', 'description']
};
