import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';
import { AUTH_CONSTANTS } from './constants';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'cleanserve_secret_key_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'cleanserve_refresh_secret_change_in_production';

export interface JWTPayload {
  user_id: string;
  email?: string;
  phone?: string;
  role: string;
  language: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  user_id: string;
  token_version: number;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT access token
 */
export const generateToken = (user: User): string => {
  const payload: JWTPayload = {
    user_id: user.id,
    email: user.email || undefined,
    phone: user.phone || undefined,
    role: user.role,
    language: user.language,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
    issuer: 'rakeez-api',
    audience: 'rakeez-client',
  });
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (user: User, tokenVersion: number = 1): string => {
  const payload: RefreshTokenPayload = {
    user_id: user.id,
    token_version: tokenVersion,
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    issuer: 'rakeez-api',
    audience: 'rakeez-client',
  });
};

/**
 * Verify JWT access token
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'rakeez-api',
      audience: 'rakeez-client',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    // Log detailed error for debugging
    console.error('❌ JWT Verification Error:', {
      errorType: error instanceof jwt.TokenExpiredError ? 'TokenExpiredError' : 
                  error instanceof jwt.JsonWebTokenError ? 'JsonWebTokenError' : 'UnknownError',
      message: error instanceof Error ? error.message : 'Unknown error',
      tokenPreview: token.substring(0, 50) + '...',
    });
    
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Verify JWT refresh token
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'rakeez-api',
      audience: 'rakeez-client',
    }) as RefreshTokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};

/**
 * Generate password reset token
 */
export const generatePasswordResetToken = (userId: string, email: string): string => {
  const payload = {
    user_id: userId,
    email,
    type: 'password_reset',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '1h', // 1 hour expiry for password reset
    issuer: 'rakeez-api',
    audience: 'rakeez-client',
  });
};

/**
 * Verify password reset token
 */
export const verifyPasswordResetToken = (token: string): { user_id: string; email: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'rakeez-api',
      audience: 'rakeez-client',
    }) as any;

    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid token type');
    }

    return {
      user_id: decoded.user_id,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Password reset token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid password reset token');
    } else {
      throw new Error('Password reset token verification failed');
    }
  }
};

/**
 * Generate email verification token
 */
export const generateEmailVerificationToken = (userId: string, email: string): string => {
  const payload = {
    user_id: userId,
    email,
    type: 'email_verification',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h', // 24 hours for email verification
    issuer: 'rakeez-api',
    audience: 'rakeez-client',
  });
};

/**
 * Verify email verification token
 */
export const verifyEmailVerificationToken = (token: string): { user_id: string; email: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'rakeez-api',
      audience: 'rakeez-client',
    }) as any;

    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }

    return {
      user_id: decoded.user_id,
      email: decoded.email,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Email verification token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid email verification token');
    } else {
      throw new Error('Email verification token verification failed');
    }
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

/**
 * Get token expiry time
 */
export const getTokenExpiry = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return true;
  return expiry < new Date();
};

/**
 * Get remaining token time in seconds
 */
export const getRemainingTokenTime = (token: string): number => {
  const expiry = getTokenExpiry(token);
  if (!expiry) return 0;
  return Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
};

/**
 * Generate API key for external integrations
 */
export const generateApiKey = (userId: string, scope: string[] = ['read']): string => {
  const payload = {
    user_id: userId,
    type: 'api_key',
    scope,
    created_at: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, JWT_SECRET, {
    // API keys don't expire by default, but you can add expiresIn if needed
    issuer: 'rakeez-api',
    audience: 'rakeez-external',
  });
};

/**
 * Verify API key
 */
export const verifyApiKey = (apiKey: string): { user_id: string; scope: string[] } => {
  try {
    const decoded = jwt.verify(apiKey, JWT_SECRET, {
      issuer: 'rakeez-api',
      audience: 'rakeez-external',
    }) as any;

    if (decoded.type !== 'api_key') {
      throw new Error('Invalid key type');
    }

    return {
      user_id: decoded.user_id,
      scope: decoded.scope || ['read'],
    };
  } catch (error) {
    throw new Error('Invalid API key');
  }
};

/**
 * Generate temporary access token for specific resources
 */
export const generateTemporaryToken = (
  userId: string, 
  resource: string, 
  action: string, 
  expiresIn: string = '15m'
): string => {
  const payload = {
    user_id: userId,
    type: 'temporary',
    resource,
    action,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn as string,
    issuer: 'rakeez-api',
    audience: 'rakeez-client',
  } as jwt.SignOptions);
};

/**
 * Verify temporary token
 */
export const verifyTemporaryToken = (
  token: string, 
  expectedResource: string, 
  expectedAction: string
): { user_id: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'rakeez-api',
      audience: 'rakeez-client',
    }) as any;

    if (decoded.type !== 'temporary') {
      throw new Error('Invalid token type');
    }

    if (decoded.resource !== expectedResource || decoded.action !== expectedAction) {
      throw new Error('Token not valid for this resource/action');
    }

    return {
      user_id: decoded.user_id,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Temporary token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid temporary token');
    } else {
      throw error;
    }
  }
};

/**
 * Create token blacklist entry (for logout)
 */
export const createTokenBlacklistKey = (token: string): string => {
  const decoded = jwt.decode(token) as any;
  if (!decoded || !decoded.jti) {
    // If no jti (JWT ID), use token hash
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return `blacklist:${tokenHash}`;
  }
  return `blacklist:${decoded.jti}`;
};

/**
 * Validate token format
 */
export const isValidTokenFormat = (token: string): boolean => {
  try {
    const parts = token.split('.');
    return parts.length === 3;
  } catch {
    return false;
  }
};

/**
 * Extract user info from token without verification (for logging)
 */
export const extractUserInfo = (token: string): { user_id?: string; role?: string } => {
  try {
    const decoded = jwt.decode(token) as any;
    return {
      user_id: decoded?.user_id,
      role: decoded?.role,
    };
  } catch {
    return {};
  }
};

export default {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  decodeToken,
  getTokenExpiry,
  isTokenExpired,
  getRemainingTokenTime,
  generateApiKey,
  verifyApiKey,
  generateTemporaryToken,
  verifyTemporaryToken,
  createTokenBlacklistKey,
  isValidTokenFormat,
  extractUserInfo,
};
