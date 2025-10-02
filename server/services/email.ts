import nodemailer from 'nodemailer';
import { bilingual } from '../utils/bilingual';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'noreply@cleanserve.sa',
        pass: process.env.SMTP_PASS || 'smtp_password',
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"CleanServe" <${process.env.SMTP_USER || 'noreply@cleanserve.sa'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  async sendOTPEmail(email: string, otp: string, language: string = 'en', name: string = ''): Promise<boolean> {
    const isArabic = language === 'ar';
    
    const subject = isArabic ? 'رمز التحقق - كلين سيرف' : 'Verification Code - CleanServe';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
              body {
                  font-family: ${isArabic ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Inter', 'Segoe UI', sans-serif"};
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f8fafc;
              }
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #ffffff;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  margin-top: 40px;
              }
              .header {
                  text-align: center;
                  padding: 20px 0;
                  border-bottom: 1px solid #e5e7eb;
                  margin-bottom: 30px;
              }
              .logo {
                  font-size: 24px;
                  font-weight: bold;
                  color: #2563eb;
                  margin-bottom: 10px;
              }
              .otp-code {
                  background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
                  color: white;
                  font-size: 32px;
                  font-weight: bold;
                  text-align: center;
                  padding: 20px;
                  border-radius: 8px;
                  margin: 20px 0;
                  letter-spacing: 8px;
              }
              .footer {
                  text-align: center;
                  padding-top: 20px;
                  margin-top: 30px;
                  border-top: 1px solid #e5e7eb;
                  font-size: 14px;
                  color: #6b7280;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <div class="logo">🧽 ${isArabic ? 'كلين سيرف' : 'CleanServe'}</div>
                  <p>${isArabic ? 'خدمات التنظيف المهنية' : 'Professional Cleaning Services'}</p>
              </div>
              
              <h1>${isArabic ? `مرحباً ${name}` : `Hello ${name}`}</h1>
              
              <p>${isArabic ? 'رمز التحقق الخاص بك هو:' : 'Your verification code is:'}</p>
              
              <div class="otp-code">${otp}</div>
              
              <p>
                  ${isArabic 
                    ? 'هذا الرمز صالح لمدة 5 دقائق فقط. لا تشارك هذا الرمز مع أي شخص آخر.'
                    : 'This code is valid for 5 minutes only. Do not share this code with anyone else.'
                  }
              </p>
              
              <p>
                  ${isArabic 
                    ? 'إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.'
                    : 'If you did not request this code, please ignore this email.'
                  }
              </p>
              
              <div class="footer">
                  <p>
                      ${isArabic 
                        ? '© 2024 كلين سيرف. جميع الحقوق محفوظة.'
                        : '© 2024 CleanServe. All rights reserved.'
                      }
                  </p>
                  <p>
                      ${isArabic 
                        ? 'للدعم: support@cleanserve.sa'
                        : 'Support: support@cleanserve.sa'
                      }
                  </p>
              </div>
          </div>
      </body>
      </html>
    `;

    const text = `
      ${isArabic ? 'مرحباً' : 'Hello'} ${name},
      
      ${isArabic ? 'رمز التحقق الخاص بك هو:' : 'Your verification code is:'} ${otp}
      
      ${isArabic 
        ? 'هذا الرمز صالح لمدة 5 دقائق فقط.'
        : 'This code is valid for 5 minutes only.'
      }
      
      ${isArabic ? 'شكراً لك' : 'Thank you'},
      ${isArabic ? 'فريق كلين سيرف' : 'CleanServe Team'}
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string, language: string = 'en', name: string = ''): Promise<boolean> {
    const isArabic = language === 'ar';
    const resetUrl = `${process.env.APP_URL || 'https://cleanserve.sa'}/reset-password?token=${resetToken}`;
    
    const subject = isArabic ? 'إعادة تعيين كلمة المرور - كلين سيرف' : 'Password Reset - CleanServe';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
              body {
                  font-family: ${isArabic ? "'Segoe UI', Tahoma, Arial, sans-serif" : "'Inter', 'Segoe UI', sans-serif"};
                  line-height: 1.6;
                  color: #333;
                  margin: 0;
                  padding: 0;
                  background-color: #f8fafc;
              }
              .container {
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #ffffff;
                  border-radius: 8px;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                  margin-top: 40px;
              }
              .reset-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #2563eb 0%, #10b981 100%);
                  color: white;
                  padding: 15px 30px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: bold;
                  margin: 20px 0;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>${isArabic ? `مرحباً ${name}` : `Hello ${name}`}</h1>
              
              <p>
                  ${isArabic 
                    ? 'تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في كلين سيرف.'
                    : 'We received a request to reset your password for your CleanServe account.'
                  }
              </p>
              
              <p>
                  <a href="${resetUrl}" class="reset-button">
                      ${isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                  </a>
              </p>
              
              <p>
                  ${isArabic 
                    ? 'هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة.'
                    : 'This link is valid for 1 hour only. If you did not request a password reset, please ignore this email.'
                  }
              </p>
              
              <p>
                  ${isArabic ? 'أو يمكنك نسخ ولصق الرابط التالي:' : 'Or you can copy and paste the following link:'}
                  <br>
                  <code>${resetUrl}</code>
              </p>
          </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  async sendBookingConfirmationEmail(email: string, bookingData: any, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    
    const subject = isArabic ? 'تأكيد الحجز - كلين سيرف' : 'Booking Confirmation - CleanServe';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
      </head>
      <body>
          <div class="container">
              <h1>${isArabic ? 'تم تأكيد حجزك!' : 'Your booking is confirmed!'}</h1>
              
              <div class="booking-details">
                  <h2>${isArabic ? 'تفاصيل الحجز:' : 'Booking Details:'}</h2>
                  <p><strong>${isArabic ? 'رقم الحجز:' : 'Booking ID:'}</strong> ${bookingData.id}</p>
                  <p><strong>${isArabic ? 'الخدمة:' : 'Service:'}</strong> ${bookingData.serviceName}</p>
                  <p><strong>${isArabic ? 'التاريخ:' : 'Date:'}</strong> ${bookingData.date}</p>
                  <p><strong>${isArabic ? 'الوقت:' : 'Time:'}</strong> ${bookingData.time}</p>
                  <p><strong>${isArabic ? 'المجموع:' : 'Total:'}</strong> ${bookingData.total} ${isArabic ? 'ريال' : 'SAR'}</p>
              </div>
              
              <p>
                  ${isArabic 
                    ? 'سنرسل لك إشعاراً عند تعيين الفني لطلبك.'
                    : 'We will notify you when a technician is assigned to your booking.'
                  }
              </p>
          </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }

  async sendWelcomeEmail(email: string, name: string, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    
    const subject = isArabic ? 'مرحباً بك في كلين سيرف!' : 'Welcome to CleanServe!';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
      </head>
      <body>
          <div class="container">
              <h1>${isArabic ? `مرحباً بك ${name}!` : `Welcome ${name}!`}</h1>
              
              <p>
                  ${isArabic 
                    ? 'نشكرك على انضمامك إلى كلين سيرف، منصة خدمات التنظيف المهنية الرائدة في المملكة العربية السعودية.'
                    : 'Thank you for joining CleanServe, Saudi Arabia\'s leading professional cleaning services platform.'
                  }
              </p>
              
              <div class="features">
                  <h2>${isArabic ? 'ماذا يمكنك أن تفعل الآن:' : 'What you can do now:'}</h2>
                  <ul>
                      <li>${isArabic ? '📱 حجز خدمات التنظيف بسهولة' : '📱 Book cleaning services easily'}</li>
                      <li>${isArabic ? '💳 دفع آمن عبر عدة طرق' : '💳 Secure payment through multiple methods'}</li>
                      <li>${isArabic ? '⭐ تتبع حالة طلبك في الوقت الفعلي' : '⭐ Track your order status in real-time'}</li>
                      <li>${isArabic ? '🎯 تقييم الخدمة والفنيين' : '🎯 Rate services and technicians'}</li>
                  </ul>
              </div>
              
              <p>
                  ${isArabic 
                    ? 'إذا كان لديك أي أسئلة، لا تتردد في الاتصال بفريق الدعم الخاص بنا.'
                    : 'If you have any questions, don\'t hesitate to contact our support team.'
                  }
              </p>
          </div>
      </body>
      </html>
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
    });
  }
}

export const emailService = new EmailService();
