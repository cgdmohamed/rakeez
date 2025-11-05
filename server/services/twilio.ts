import twilio from 'twilio';
import { logError } from '../utils/logger';

let connectionSettings: any;
let cachedClient: ReturnType<typeof twilio> | null = null;
let cachedPhoneNumber: string | null = null;
let cachedVerifyServiceSid: string | null = null;

function clearCache() {
  cachedClient = null;
  cachedPhoneNumber = null;
  cachedVerifyServiceSid = null;
}

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

async function getTwilioClient() {
  if (cachedClient) {
    return cachedClient;
  }
  
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  cachedClient = twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
  
  return cachedClient;
}

async function getTwilioFromPhoneNumber() {
  if (cachedPhoneNumber) {
    return cachedPhoneNumber;
  }
  
  const { phoneNumber } = await getCredentials();
  cachedPhoneNumber = phoneNumber;
  
  return phoneNumber;
}

async function getVerifyServiceSid(): Promise<string> {
  if (cachedVerifyServiceSid) {
    return cachedVerifyServiceSid;
  }
  
  // Get from environment variable
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!serviceSid) {
    throw new Error('TWILIO_VERIFY_SERVICE_SID not configured');
  }
  
  cachedVerifyServiceSid = serviceSid;
  return serviceSid;
}

function isAuthenticationError(error: any): boolean {
  const status = error?.status || error?.code;
  return status === 401 || status === 403 || status === 20003;
}

class TwilioService {
  async sendOTP(phone: string, language: string = 'ar'): Promise<boolean> {
    try {
      const client = await getTwilioClient();
      const serviceSid = await getVerifyServiceSid();
      
      const result = await client.verify.v2
        .services(serviceSid)
        .verifications.create({
          to: phone,
          channel: 'sms',
          locale: language === 'ar' ? 'ar' : 'en'
        });

      console.log(`OTP sent to ${phone}: ${result.sid}, status: ${result.status}`);
      return result.status === 'pending';
    } catch (error: any) {
      if (isAuthenticationError(error)) {
        clearCache();
        logError('Twilio authentication failed - credentials cleared', error, {
          context: 'sendOTP',
          twilioErrorCode: error.code,
          twilioStatus: error.status
        });
      } else {
        logError('Failed to send OTP', error, {
          context: 'sendOTP',
          twilioErrorCode: error.code,
          twilioSid: error.moreInfo
        });
      }
      return false;
    }
  }

  async sendPasswordResetOTP(phone: string, language: string = 'ar'): Promise<boolean> {
    try {
      const client = await getTwilioClient();
      const serviceSid = await getVerifyServiceSid();
      
      const result = await client.verify.v2
        .services(serviceSid)
        .verifications.create({
          to: phone,
          channel: 'sms',
          locale: language === 'ar' ? 'ar' : 'en'
        });

      console.log(`Password reset OTP sent to ${phone}: ${result.sid}, status: ${result.status}`);
      return result.status === 'pending';
    } catch (error: any) {
      if (isAuthenticationError(error)) {
        clearCache();
        logError('Twilio authentication failed - credentials cleared', error, {
          context: 'sendPasswordResetOTP',
          twilioErrorCode: error.code
        });
      } else {
        logError('Failed to send password reset OTP', error, {
          context: 'sendPasswordResetOTP',
          twilioErrorCode: error.code
        });
      }
      return false;
    }
  }
  
  async verifyOTP(phone: string, code: string): Promise<boolean> {
    try {
      const client = await getTwilioClient();
      const serviceSid = await getVerifyServiceSid();
      
      const result = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({
          to: phone,
          code: code
        });

      console.log(`OTP verification for ${phone}: ${result.status}, valid: ${result.valid}`);
      return result.status === 'approved' && result.valid === true;
    } catch (error: any) {
      if (isAuthenticationError(error)) {
        clearCache();
        logError('Twilio authentication failed - credentials cleared', error, {
          context: 'verifyOTP',
          twilioErrorCode: error.code
        });
      } else {
        logError('Failed to verify OTP', error, {
          context: 'verifyOTP',
          twilioErrorCode: error.code
        });
      }
      return false;
    }
  }

  async sendOrderUpdate(phone: string, orderNumber: string, status: string, language: string = 'ar'): Promise<boolean> {
    try {
      const client = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();
      
      const statusMessages: Record<string, Record<string, string>> = {
        ar: {
          confirmed: 'تم تأكيد طلبك',
          en_route: 'الفني في الطريق إليك',
          in_progress: 'جاري تنفيذ الخدمة',
          completed: 'تم إكمال الخدمة بنجاح'
        },
        en: {
          confirmed: 'Your order has been confirmed',
          en_route: 'Technician is on the way',
          in_progress: 'Service is in progress',
          completed: 'Service completed successfully'
        }
      };

      const statusText = statusMessages[language]?.[status] || status;
      const message = language === 'ar'
        ? `تحديث الطلب ${orderNumber}: ${statusText}`
        : `Order ${orderNumber} update: ${statusText}`;

      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: phone,
      });

      return result.status !== 'failed';
    } catch (error: any) {
      if (isAuthenticationError(error)) {
        clearCache();
        logError('Twilio authentication failed - credentials cleared', error, {
          context: 'sendOrderUpdate',
          twilioErrorCode: error.code
        });
      } else {
        logError('Failed to send order update SMS', error, {
          context: 'sendOrderUpdate',
          orderNumber,
          twilioErrorCode: error.code
        });
      }
      return false;
    }
  }

  generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  validatePhoneNumber(phone: string): boolean {
    // Basic validation for Saudi phone numbers
    const saudiPhoneRegex = /^\+966[0-9]{9}$/;
    return saudiPhoneRegex.test(phone);
  }

  formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If starts with 05, convert to +9665
    if (cleaned.startsWith('05') && cleaned.length === 10) {
      return '+966' + cleaned.substring(1);
    }
    
    // If starts with 5 and length is 9, add +966
    if (cleaned.startsWith('5') && cleaned.length === 9) {
      return '+966' + cleaned;
    }
    
    // If already has country code
    if (cleaned.startsWith('966') && cleaned.length === 12) {
      return '+' + cleaned;
    }
    
    return phone; // Return as-is if can't format
  }
}

export const twilioService = new TwilioService();
