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
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials not configured. Email notifications will be disabled. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
      this.transporter = null as any;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email transporter not configured. Skipping email send.');
      return false;
    }

    try {
      const mailOptions = {
        from: `"Rakeez" <${process.env.SMTP_USER}>`,
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
    
    const subject = isArabic ? 'رمز التحقق - ركيز' : 'Verification Code - Rakeez';
    
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
                  <div class="logo">🧽 ${isArabic ? 'ركيز' : 'Rakeez'}</div>
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
                        ? '© 2024 ركيز. جميع الحقوق محفوظة.'
                        : '© 2024 Rakeez. All rights reserved.'
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
      ${isArabic ? 'فريق ركيز' : 'Rakeez Team'}
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
    
    const subject = isArabic ? 'إعادة تعيين كلمة المرور - ركيز' : 'Password Reset - Rakeez';
    
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
                    ? 'تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في ركيز.'
                    : 'We received a request to reset your password for your Rakeez account.'
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
    
    const subject = isArabic ? 'تأكيد الحجز - ركيز' : 'Booking Confirmation - Rakeez';
    
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
    
    const subject = isArabic ? 'مرحباً بك في ركيز!' : 'Welcome to Rakeez!';
    
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
                    ? 'نشكرك على انضمامك إلى ركيز، منصة خدمات التنظيف المهنية الرائدة في المملكة العربية السعودية.'
                    : 'Thank you for joining Rakeez, Saudi Arabia\'s leading professional cleaning services platform.'
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

  async sendTechnicianAssignedEmail(email: string, bookingData: any, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    const subject = isArabic ? 'تم تعيين فني لحجزك - ركيز' : 'Technician Assigned - Rakeez';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <body>
          <h1>${isArabic ? 'تم تعيين فني لحجزك!' : 'Technician Assigned to Your Booking!'}</h1>
          <p>${isArabic ? 'رقم الحجز:' : 'Booking ID:'} ${bookingData.id}</p>
          <p>${isArabic ? 'الفني:' : 'Technician:'} ${bookingData.technicianName}</p>
          <p>${isArabic ? 'سيتصل بك الفني قريباً.' : 'The technician will contact you shortly.'}</p>
      </body>
      </html>
    `;

    return await this.sendEmail({ to: email, subject, html });
  }

  async sendQuotationCreatedEmail(email: string, quotationData: any, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    const subject = isArabic ? 'عرض سعر جديد - ركيز' : 'New Quotation - Rakeez';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <body>
          <h1>${isArabic ? 'تم إنشاء عرض سعر جديد' : 'New Quotation Created'}</h1>
          <p>${isArabic ? 'رقم الحجز:' : 'Booking ID:'} ${quotationData.bookingId}</p>
          <p>${isArabic ? 'الإجمالي:' : 'Total:'} ${quotationData.totalAmount} ${isArabic ? 'ريال' : 'SAR'}</p>
          <p>${isArabic ? 'يرجى مراجعة العرض والموافقة عليه.' : 'Please review and approve the quotation.'}</p>
      </body>
      </html>
    `;

    return await this.sendEmail({ to: email, subject, html });
  }

  async sendPaymentReceivedEmail(email: string, paymentData: any, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    const subject = isArabic ? 'تم استلام الدفع - ركيز' : 'Payment Received - Rakeez';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <body>
          <h1>${isArabic ? 'تم استلام دفعتك بنجاح!' : 'Payment Received Successfully!'}</h1>
          <p>${isArabic ? 'رقم الحجز:' : 'Booking ID:'} ${paymentData.bookingId}</p>
          <p>${isArabic ? 'المبلغ:' : 'Amount:'} ${paymentData.amount} ${isArabic ? 'ريال' : 'SAR'}</p>
          <p>${isArabic ? 'طريقة الدفع:' : 'Payment Method:'} ${paymentData.paymentMethod}</p>
          <p>${isArabic ? 'شكراً لك!' : 'Thank you!'}</p>
      </body>
      </html>
    `;

    return await this.sendEmail({ to: email, subject, html });
  }

  async sendBookingCompletedEmail(email: string, bookingData: any, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    const subject = isArabic ? 'اكتملت الخدمة - ركيز' : 'Service Completed - Rakeez';
    
    const html = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${language}">
      <body>
          <h1>${isArabic ? 'تم إكمال خدمتك!' : 'Your Service is Complete!'}</h1>
          <p>${isArabic ? 'رقم الحجز:' : 'Booking ID:'} ${bookingData.id}</p>
          <p>${isArabic ? 'نأمل أن تكون راضياً عن خدمتنا. يرجى تقييم تجربتك!' : 'We hope you are satisfied with our service. Please rate your experience!'}</p>
      </body>
      </html>
    `;

    return await this.sendEmail({ to: email, subject, html });
  }
}

export const emailService = new EmailService();
