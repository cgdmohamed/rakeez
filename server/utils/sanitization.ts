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
    
    if (typeof value === 'string') {
      // Sanitize string if this field is targeted or all fields are targeted
      if (shouldSanitize) {
        sanitized[key] = sanitizeInput(value, mode) as any;
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // For nested objects:
      // - If this field is targeted, sanitize ALL descendant strings (pass undefined)
      // - Otherwise, continue checking with the same field list
      sanitized[key] = sanitizeObject(
        value, 
        mode, 
        shouldSanitize ? undefined : fieldsToSanitize
      ) as any;
    } else if (Array.isArray(value)) {
      // Sanitize array elements (strings, objects, or nested arrays)
      sanitized[key] = value.map((item: any) => {
        if (typeof item === 'string') {
          return shouldSanitize ? sanitizeInput(item, mode) : item;
        } else if (item && typeof item === 'object' && !Array.isArray(item)) {
          // For objects in arrays:
          // - If parent field is targeted, sanitize ALL descendant strings
          // - Otherwise, continue with field list
          return sanitizeObject(item, mode, shouldSanitize ? undefined : fieldsToSanitize);
        } else if (Array.isArray(item)) {
          // Handle nested arrays recursively
          return sanitizeNestedArray(item, mode, shouldSanitize, fieldsToSanitize);
        }
        return item;
      }) as any;
    }
  }

  return sanitized;
}

/**
 * Helper function to sanitize nested arrays
 */
function sanitizeNestedArray(
  arr: any[], 
  mode: 'strict' | 'basic' | 'none', 
  shouldSanitizeAll: boolean,
  fieldsToSanitize?: string[]
): any[] {
  return arr.map((item: any) => {
    if (typeof item === 'string') {
      return shouldSanitizeAll ? sanitizeInput(item, mode) : item;
    } else if (item && typeof item === 'object' && !Array.isArray(item)) {
      // If shouldSanitizeAll, sanitize everything (pass undefined)
      // Otherwise, continue with the original field list
      return sanitizeObject(item, mode, shouldSanitizeAll ? undefined : fieldsToSanitize);
    } else if (Array.isArray(item)) {
      return sanitizeNestedArray(item, mode, shouldSanitizeAll, fieldsToSanitize);
    }
    return item;
  });
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
