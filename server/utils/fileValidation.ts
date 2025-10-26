/**
 * File Validation Utility
 * Server-side validation for file uploads to prevent malicious files
 */

export interface FileValidationOptions {
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  maxSizeBytes?: number;
  minSizeBytes?: number;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
}

/**
 * Allowed MIME types for different file categories
 */
export const ALLOWED_MIME_TYPES = {
  images: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ],
  videos: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm'
  ],
  all: [] as string[] // Will be populated below
};

// Combine all allowed types
ALLOWED_MIME_TYPES.all = [
  ...ALLOWED_MIME_TYPES.images,
  ...ALLOWED_MIME_TYPES.documents,
  ...ALLOWED_MIME_TYPES.videos
];

/**
 * File size limits (in bytes)
 */
export const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5 MB
  document: 10 * 1024 * 1024,  // 10 MB
  video: 50 * 1024 * 1024,     // 50 MB
  default: 5 * 1024 * 1024     // 5 MB default
};

/**
 * Validate file extension against allowed list
 */
function validateExtension(filename: string, allowedExtensions?: string[]): boolean {
  if (!allowedExtensions || allowedExtensions.length === 0) {
    return true; // No restrictions
  }

  const extension = filename.toLowerCase().split('.').pop() || '';
  return allowedExtensions.includes(extension);
}

/**
 * Validate MIME type against allowed list
 */
function validateMimeType(mimeType: string, allowedMimeTypes?: string[]): boolean {
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) {
    return true; // No restrictions
  }

  return allowedMimeTypes.includes(mimeType.toLowerCase());
}

/**
 * Validate file size
 */
function validateFileSize(
  sizeBytes: number,
  minSize?: number,
  maxSize?: number
): { valid: boolean; error?: string } {
  if (minSize && sizeBytes < minSize) {
    return {
      valid: false,
      error: `File too small. Minimum size is ${formatBytes(minSize)}`
    };
  }

  if (maxSize && sizeBytes > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${formatBytes(maxSize)}`
    };
  }

  return { valid: true };
}

/**
 * Sanitize filename to prevent path traversal and injection attacks
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  // Remove path separators and traversal attempts
  let sanitized = filename.replace(/[\/\\]/g, '_');
  sanitized = sanitized.replace(/\.\./g, '');
  
  // Keep only alphanumeric, dots, hyphens, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  
  // Remove multiple consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');
  
  // Ensure file has an extension
  if (!sanitized.includes('.')) {
    sanitized += '.bin';
  }
  
  // Limit total filename length (preserve extension)
  if (sanitized.length > 255) {
    const parts = sanitized.split('.');
    const ext = parts.pop() || 'bin';
    const name = parts.join('.');
    sanitized = name.substring(0, 250 - ext.length) + '.' + ext;
  }
  
  return sanitized;
}

/**
 * Detect MIME type from file extension (fallback if MIME not provided)
 */
export function detectMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  
  const mimeMap: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
    'csv': 'text/csv',
    
    // Videos
    'mp4': 'video/mp4',
    'mpeg': 'video/mpeg',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'webm': 'video/webm'
  };
  
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Main file validation function
 */
export function validateFile(
  filename: string,
  mimeType: string,
  sizeBytes: number,
  options: FileValidationOptions = {}
): FileValidationResult {
  const {
    allowedMimeTypes = ALLOWED_MIME_TYPES.all,
    allowedExtensions,
    maxSizeBytes = FILE_SIZE_LIMITS.default,
    minSizeBytes
  } = options;

  // Sanitize filename
  const sanitizedFilename = sanitizeFilename(filename);

  // Validate extension
  if (!validateExtension(sanitizedFilename, allowedExtensions)) {
    const allowed = allowedExtensions?.join(', ') || 'none specified';
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${allowed}`
    };
  }

  // Validate MIME type
  if (!validateMimeType(mimeType, allowedMimeTypes)) {
    return {
      valid: false,
      error: 'File type not allowed'
    };
  }

  // Validate file size
  const sizeValidation = validateFileSize(sizeBytes, minSizeBytes, maxSizeBytes);
  if (!sizeValidation.valid) {
    return {
      valid: false,
      error: sizeValidation.error
    };
  }

  // Check for suspicious patterns
  if (isSuspiciousFilename(sanitizedFilename)) {
    return {
      valid: false,
      error: 'Suspicious filename detected'
    };
  }

  return {
    valid: true,
    sanitizedFilename
  };
}

/**
 * Check for suspicious filename patterns
 */
function isSuspiciousFilename(filename: string): boolean {
  const suspiciousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.com$/i,
    /\.scr$/i,
    /\.pif$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i,
    /\.sh$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.aspx$/i,
    /\.jsp$/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(filename));
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Preset validation configurations for common use cases
 */
export const FILE_VALIDATION_PRESETS = {
  // For user profile images, service images, etc.
  profileImage: {
    allowedMimeTypes: ALLOWED_MIME_TYPES.images,
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    maxSizeBytes: FILE_SIZE_LIMITS.image,
    minSizeBytes: 1024 // 1 KB minimum
  },
  
  // For mobile app content (sliders, banners)
  appContent: {
    allowedMimeTypes: ALLOWED_MIME_TYPES.images,
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    maxSizeBytes: FILE_SIZE_LIMITS.image
  },
  
  // For documents (invoices, reports, etc.)
  document: {
    allowedMimeTypes: ALLOWED_MIME_TYPES.documents,
    allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'],
    maxSizeBytes: FILE_SIZE_LIMITS.document
  },
  
  // For any allowed file type
  any: {
    allowedMimeTypes: ALLOWED_MIME_TYPES.all,
    maxSizeBytes: FILE_SIZE_LIMITS.default
  }
};
