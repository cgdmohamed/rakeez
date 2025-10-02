import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { IStorage } from '../storage';
import { RedisService } from '../services/redis';
import { twilioService } from '../services/twilio';
import { generateTokens, blacklistToken } from '../middleware/auth';
import { bilingual } from '../utils/bilingual';
import { AUTH_CONSTANTS } from '../utils/constants';
import { 
  registerSchema, 
  loginSchema, 
  otpSchema, 
  validateSchema 
} from '../middleware/validation';

export class AuthController {
  constructor(
    private storage: IStorage,
    private redis: RedisService
  ) {}

  async register(req: Request, res: Response) {
    try {
      // Validate request
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', req.headers['accept-language'] as string),
          errors: validation.error.errors
        });
      }

      const { email, phone, password, name, name_ar, language, device_token } = validation.data;
      const userLanguage = req.headers['accept-language'] as string || language || 'en';

      // Check if user already exists
      const existingUser = email 
        ? await this.storage.getUserByEmail(email)
        : await this.storage.getUserByPhone(phone!);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: bilingual.getErrorMessage('auth.user_already_exists', userLanguage)
        });
      }

      // Check rate limiting
      const identifier = email || phone!;
      const rateLimitKey = `register:${identifier}`;
      const rateLimit = await this.redis.checkRateLimit(rateLimitKey, AUTH_CONSTANTS.REGISTER_RATE_LIMIT, 3600);
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: bilingual.getErrorMessage('auth.rate_limit_exceeded', userLanguage),
          resetTime: rateLimit.resetTime
        });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await this.storage.createUser({
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        name,
        nameAr: name_ar || null,
        role: 'customer',
        language: language || 'en',
        isVerified: false,
        deviceToken: device_token || null
      });

      // Send OTP for verification
      const otpResult = await this.sendVerificationOTP(identifier, userLanguage);

      if (!otpResult.success) {
        // User created but OTP failed - still return success but mention OTP issue
        return res.status(201).json({
          success: true,
          message: bilingual.getMessage('auth.user_created_otp_failed', userLanguage),
          message_en: 'Account created successfully but OTP sending failed. Please try to resend OTP.',
          data: {
            user_id: newUser.id,
            requires_verification: true,
            verification_method: email ? 'email' : 'phone',
            otp_error: otpResult.error
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('auth.user_created_verify_otp', userLanguage),
        message_en: 'Account created successfully. Please verify OTP code.',
        data: {
          user_id: newUser.id,
          requires_verification: true,
          verification_method: email ? 'email' : 'phone'
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', req.headers['accept-language'] as string),
          errors: validation.error.errors
        });
      }

      const { identifier, password, language } = validation.data;
      const userLanguage = req.headers['accept-language'] as string || language;

      // Check rate limiting
      const rateLimitKey = `login:${identifier}`;
      const rateLimit = await this.redis.checkRateLimit(rateLimitKey, AUTH_CONSTANTS.LOGIN_RATE_LIMIT, 900); // 15 minutes
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: bilingual.getErrorMessage('auth.rate_limit_exceeded', userLanguage),
          resetTime: rateLimit.resetTime
        });
      }

      // Find user by email or phone
      const user = identifier.includes('@')
        ? await this.storage.getUserByEmail(identifier)
        : await this.storage.getUserByPhone(identifier);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.invalid_credentials', userLanguage)
        });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.invalid_credentials', userLanguage)
        });
      }

      // Check if user is verified
      if (!user.isVerified) {
        // Send OTP for verification
        const otpResult = await this.sendVerificationOTP(identifier, userLanguage);
        
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.account_not_verified', userLanguage),
          requires_verification: true,
          verification_method: user.email ? 'email' : 'phone'
        });
      }

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.role);

      // Store refresh token in Redis
      await this.redis.storeSession(`refresh:${user.id}`, {
        refreshToken,
        userId: user.id,
        role: user.role,
        createdAt: Date.now()
      }, AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY);

      // Update user language preference if provided
      if (language && language !== user.language) {
        await this.storage.updateUser(user.id, { language });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('auth.login_successful', userLanguage),
        message_en: 'Login successful',
        data: {
          token: accessToken,
          refresh_token: refreshToken,
          expires_in: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
          user: {
            id: user.id,
            name: user.name,
            name_ar: user.nameAr,
            email: user.email,
            phone: user.phone,
            role: user.role,
            language: user.language,
            is_verified: user.isVerified
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async verifyOTP(req: Request, res: Response) {
    try {
      const validation = otpSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', req.headers['accept-language'] as string),
          errors: validation.error.errors
        });
      }

      const { identifier, otp_code } = validation.data;
      const userLanguage = req.headers['accept-language'] as string || 'en';

      // Get OTP from Redis
      const otpData = await this.redis.getOTP(identifier);
      
      if (!otpData) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('auth.otp_expired', userLanguage)
        });
      }

      // Check attempts
      if (otpData.attempts >= AUTH_CONSTANTS.MAX_OTP_ATTEMPTS) {
        await this.redis.deleteOTP(identifier);
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('auth.otp_max_attempts', userLanguage)
        });
      }

      // Verify OTP
      if (otpData.code !== otp_code) {
        await this.redis.incrementOTPAttempts(identifier);
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('auth.otp_invalid', userLanguage),
          attempts_remaining: AUTH_CONSTANTS.MAX_OTP_ATTEMPTS - (otpData.attempts + 1)
        });
      }

      // OTP is valid - find and verify user
      const user = identifier.includes('@')
        ? await this.storage.getUserByEmail(identifier)
        : await this.storage.getUserByPhone(identifier);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('auth.user_not_found', userLanguage)
        });
      }

      // Mark user as verified
      await this.storage.updateUser(user.id, { isVerified: true });

      // Delete OTP from Redis
      await this.redis.deleteOTP(identifier);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.role);

      // Store refresh token
      await this.redis.storeSession(`refresh:${user.id}`, {
        refreshToken,
        userId: user.id,
        role: user.role,
        createdAt: Date.now()
      }, AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('auth.verification_successful', userLanguage),
        message_en: 'Account verified successfully',
        data: {
          token: accessToken,
          refresh_token: refreshToken,
          expires_in: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY,
          user: {
            id: user.id,
            name: user.name,
            name_ar: user.nameAr,
            email: user.email,
            phone: user.phone,
            role: user.role,
            language: user.language,
            is_verified: true
          }
        }
      });

    } catch (error) {
      console.error('OTP verification error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async resendOTP(req: Request, res: Response) {
    try {
      const { identifier } = req.body;
      const userLanguage = req.headers['accept-language'] as string || 'en';

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.identifier_required', userLanguage)
        });
      }

      // Check rate limiting for OTP resend
      const rateLimitKey = `otp_resend:${identifier}`;
      const rateLimit = await this.redis.checkRateLimit(rateLimitKey, AUTH_CONSTANTS.OTP_RESEND_LIMIT, 300); // 5 minutes
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: bilingual.getErrorMessage('auth.otp_resend_limit', userLanguage),
          resetTime: rateLimit.resetTime
        });
      }

      // Send OTP
      const otpResult = await this.sendVerificationOTP(identifier, userLanguage);

      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: bilingual.getErrorMessage('auth.otp_send_failed', userLanguage),
          error: otpResult.error
        });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('auth.otp_resent', userLanguage),
        message_en: 'OTP has been resent successfully'
      });

    } catch (error) {
      console.error('OTP resend error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const { identifier } = req.body;
      const userLanguage = req.headers['accept-language'] as string || 'en';

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.identifier_required', userLanguage)
        });
      }

      // Check rate limiting
      const rateLimitKey = `forgot_password:${identifier}`;
      const rateLimit = await this.redis.checkRateLimit(rateLimitKey, AUTH_CONSTANTS.FORGOT_PASSWORD_LIMIT, 3600);
      
      if (!rateLimit.allowed) {
        return res.status(429).json({
          success: false,
          message: bilingual.getErrorMessage('auth.rate_limit_exceeded', userLanguage),
          resetTime: rateLimit.resetTime
        });
      }

      // Find user
      const user = identifier.includes('@')
        ? await this.storage.getUserByEmail(identifier)
        : await this.storage.getUserByPhone(identifier);

      // Always return success for security (don't reveal if email/phone exists)
      if (!user) {
        return res.status(200).json({
          success: true,
          message: bilingual.getMessage('auth.reset_code_sent', userLanguage),
          message_en: 'If the account exists, a reset code has been sent'
        });
      }

      // Generate reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store reset code in Redis (10 minutes expiry)
      await this.redis.storeOTP(`reset:${identifier}`, resetCode, 600);

      // Send reset code via SMS (for phone) or email
      if (user.phone && !identifier.includes('@')) {
        const smsResult = await twilioService.sendPasswordResetCode(user.phone, resetCode, user.language);
        console.log('Password reset SMS result:', smsResult);
      } else if (user.email) {
        // In production, send email with reset code
        console.log(`Password reset code for ${user.email}: ${resetCode}`);
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('auth.reset_code_sent', userLanguage),
        message_en: 'Password reset code has been sent'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { identifier, reset_code, new_password } = req.body;
      const userLanguage = req.headers['accept-language'] as string || 'en';

      if (!identifier || !reset_code || !new_password) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.required_fields', userLanguage)
        });
      }

      // Validate password strength
      if (new_password.length < 8) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.password_too_short', userLanguage)
        });
      }

      // Get reset code from Redis
      const storedCode = await this.redis.getOTP(`reset:${identifier}`);
      
      if (!storedCode || storedCode.code !== reset_code) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('auth.invalid_reset_code', userLanguage)
        });
      }

      // Find user
      const user = identifier.includes('@')
        ? await this.storage.getUserByEmail(identifier)
        : await this.storage.getUserByPhone(identifier);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('auth.user_not_found', userLanguage)
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await this.storage.updateUser(user.id, { password: hashedPassword });

      // Delete reset code
      await this.redis.deleteOTP(`reset:${identifier}`);

      // Invalidate all user sessions
      await this.redis.del(`refresh:${user.id}`);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('auth.password_reset_successful', userLanguage),
        message_en: 'Password has been reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;
      const userLanguage = req.headers['accept-language'] as string || 'en';

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.refresh_token_required', userLanguage)
        });
      }

      // Verify refresh token (basic validation)
      const tokenParts = refresh_token.split('.');
      if (tokenParts.length !== 3) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.invalid_refresh_token', userLanguage)
        });
      }

      // In production, properly verify JWT refresh token
      // For now, extract user ID from stored sessions
      const sessions = await this.redis.hgetall('sessions');
      let userId = null;
      let userRole = null;

      for (const [key, sessionData] of Object.entries(sessions)) {
        try {
          const session = JSON.parse(sessionData);
          if (session.refreshToken === refresh_token) {
            userId = session.userId;
            userRole = session.role;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.invalid_refresh_token', userLanguage)
        });
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(userId, userRole);

      // Update stored refresh token
      await this.redis.storeSession(`refresh:${userId}`, {
        refreshToken: newRefreshToken,
        userId,
        role: userRole,
        createdAt: Date.now()
      }, AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('auth.token_refreshed', userLanguage),
        data: {
          token: accessToken,
          refresh_token: newRefreshToken,
          expires_in: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRY
        }
      });

    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async logout(req: any, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        // Blacklist the access token
        await blacklistToken(token);
      }

      if (req.user?.id) {
        // Remove refresh token
        await this.redis.deleteSession(req.user.id);
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('auth.logout_successful', userLanguage),
        message_en: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  private async sendVerificationOTP(identifier: string, language: string = 'en'): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in Redis
      await this.redis.storeOTP(identifier, otp, AUTH_CONSTANTS.OTP_EXPIRY);

      // Send OTP based on identifier type
      if (identifier.includes('@')) {
        // Email OTP - implement email service
        console.log(`Email OTP for ${identifier}: ${otp}`);
        return { success: true };
      } else {
        // SMS OTP
        const result = await twilioService.sendOTP(identifier, language);
        return { success: result.success, error: result.error };
      }

    } catch (error) {
      console.error('Send OTP error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'OTP sending failed' 
      };
    }
  }
}
