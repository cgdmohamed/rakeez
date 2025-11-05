import twilio from 'twilio';

let connectionSettings: any;
let cachedClient: ReturnType<typeof twilio> | null = null;
let cachedPhoneNumber: string | null = null;

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

class TwilioService {
  async sendOTP(phone: string, otp: string, language: string = 'ar'): Promise<boolean> {
    try {
      const client = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();
      
      const message = language === 'ar' 
        ? `رمز التحقق الخاص بك هو: ${otp}. صالح لمدة 5 دقائق.`
        : `Your verification code is: ${otp}. Valid for 5 minutes.`;

      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: phone,
      });

      console.log(`OTP sent to ${phone}: ${result.sid}`);
      return result.status !== 'failed';
    } catch (error) {
      console.error('Failed to send OTP:', error);
      return false;
    }
  }

  async sendPasswordResetOTP(phone: string, otp: string, language: string = 'ar'): Promise<boolean> {
    try {
      const client = await getTwilioClient();
      const fromNumber = await getTwilioFromPhoneNumber();
      
      const message = language === 'ar' 
        ? `رمز إعادة تعيين كلمة المرور: ${otp}. صالح لمدة 10 دقائق.`
        : `Your password reset code is: ${otp}. Valid for 10 minutes.`;

      const result = await client.messages.create({
        body: message,
        from: fromNumber,
        to: phone,
      });

      return result.status !== 'failed';
    } catch (error) {
      console.error('Failed to send password reset OTP:', error);
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
    } catch (error) {
      console.error('Failed to send order update SMS:', error);
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
