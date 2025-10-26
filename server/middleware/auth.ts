import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { redisService } from '../services/redis';
import { bilingual } from '../utils/bilingual';
import { verifyToken } from '../utils/jwt';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    phone?: string;
    role: string;
    language: string;
  };
}

/**
 * Middleware to authenticate JWT token
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const language = req.headers['accept-language'] || 'en';

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: bilingual.getMessage('auth.token_required', language),
      });
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: bilingual.getMessage('auth.token_required', language),
      });
    }

    // Verify JWT token using the utility function that includes issuer/audience validation
    const decoded = verifyToken(token);
    
    // Check if token is blacklisted in Redis (optional in development)
    const isBlacklisted = await redisService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: bilingual.getMessage('auth.token_invalid', language),
      });
    }

    // Check if session exists in Redis/memory (if session stored, validate it matches)
    const sessionToken = await redisService.getSession(decoded.user_id);
    if (sessionToken !== null && sessionToken !== token) {
      return res.status(401).json({
        success: false,
        message: bilingual.getMessage('auth.token_invalid', language),
      });
    }
    
    // Note: Session validation is optional - JWT signature is primary authentication
    // Redis/memory session adds extra layer but not required for auth to work

    // Get user from database
    const user = await storage.getUser(decoded.user_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: bilingual.getMessage('auth.user_not_found', language),
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      language: user.language,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    const language = req.headers['accept-language'] || 'en';
    
    return res.status(401).json({
      success: false,
      message: bilingual.getMessage('auth.token_invalid', language),
    });
  }
};

/**
 * Middleware to authorize specific roles
 */
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const language = req.headers['accept-language'] || 'en';

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: bilingual.getMessage('auth.unauthorized', language),
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      let message = 'auth.access_denied';
      
      if (allowedRoles.includes('admin')) {
        message = 'auth.admin_only';
      } else if (allowedRoles.includes('technician')) {
        message = 'auth.technician_only';
      }

      return res.status(403).json({
        success: false,
        message: bilingual.getMessage(message, language),
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware - adds user if token is present but doesn't require it
 */
export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = verifyToken(token);
    
    // Check if token is blacklisted
    const isBlacklisted = await redisService.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return next();
    }

    // Check session
    const sessionToken = await redisService.getSession(decoded.user_id);
    if (!sessionToken || sessionToken !== token) {
      return next();
    }

    // Get user
    const user = await storage.getUser(decoded.user_id);
    if (!user) {
      return next();
    }

    req.user = {
      id: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
      language: user.language,
    };

    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    next();
  }
};

/**
 * Middleware to check rate limiting by IP address (for unauthenticated requests)
 */
export const rateLimitByIP = (maxRequests: number = 100, windowSeconds: number = 3600) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || 'unknown';
      const key = `rate_limit:ip:${ip}`;
      const language = req.headers['accept-language'] || 'en';

      const { allowed, remaining, resetTime } = await redisService.checkRateLimit(
        key,
        maxRequests,
        windowSeconds
      );

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      });

      if (!allowed) {
        return res.status(429).json({
          success: false,
          message: bilingual.getMessage('auth.rate_limit_exceeded', language),
          retry_after: Math.ceil((resetTime - Date.now()) / 1000),
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on rate limiting error
    }
  };
};

/**
 * Middleware to check rate limiting
 */
export const rateLimitByUser = (maxRequests: number = 100, windowSeconds: number = 3600) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id || req.ip;
      const key = `rate_limit:user:${userId}`;
      const language = req.headers['accept-language'] || 'en';

      const { allowed, remaining, resetTime } = await redisService.checkRateLimit(
        key,
        maxRequests,
        windowSeconds
      );

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      });

      if (!allowed) {
        return res.status(429).json({
          success: false,
          message: bilingual.getMessage('auth.rate_limit_exceeded', language),
          retry_after: Math.ceil((resetTime - Date.now()) / 1000),
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Continue on rate limiting error
    }
  };
};

/**
 * Middleware to validate user ownership of a resource
 */
export const validateOwnership = (resourceType: 'booking' | 'address' | 'payment') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const resourceId = req.params.id;
      const language = req.headers['accept-language'] || 'en';

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: bilingual.getMessage('auth.unauthorized', language),
        });
      }

      let resource;
      let isOwner = false;

      switch (resourceType) {
        case 'booking':
          resource = await storage.getBooking(resourceId);
          isOwner = resource?.userId === req.user?.id || resource?.technicianId === req.user?.id;
          break;
        case 'address':
          resource = await storage.getAddress(resourceId);
          isOwner = resource?.userId === req.user?.id;
          break;
        case 'payment':
          const payments = await storage.getBookingPayments(resourceId);
          isOwner = payments.some(p => p.userId === req.user?.id);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type',
          });
      }

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: bilingual.getMessage(`${resourceType}.not_found`, language),
        });
      }

      if (!isOwner && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: bilingual.getMessage('auth.access_denied', language),
        });
      }

      next();
    } catch (error) {
      console.error('Ownership validation error:', error);
      res.status(500).json({
        success: false,
        message: bilingual.getMessage('general.server_error', 'en'),
      });
    }
  };
};

export { AuthenticatedRequest };
