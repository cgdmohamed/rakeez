import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceiptId } from 'expo-server-sdk';
import { storage } from '../storage';
import { redisService } from './redis';
import { bilingual } from '../utils/bilingual';

interface NotificationData {
  user_id: string;
  title: string;
  title_ar?: string;
  body: string;
  body_ar?: string;
  type: string;
  data?: Record<string, any>;
  priority?: 'high' | 'normal' | 'low';
  sound?: string;
  badge?: number;
}

interface PushNotification {
  to: string;
  sound: 'default' | null;
  title: string;
  body: string;
  data?: any;
  badge?: number;
  priority?: 'high' | 'normal' | 'low';
  ttl?: number;
}

class NotificationService {
  private expo: Expo;
  private fcmKey: string;
  private apnsKey: string;

  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
    });
    this.fcmKey = process.env.FCM_SERVER_KEY || '';
    this.apnsKey = process.env.APNS_KEY || '';
  }

  /**
   * Send push notification to a single user
   */
  async sendNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      // Get user's device token
      const user = await storage.getUser(notificationData.user_id);
      if (!user || !user.deviceToken) {
        console.log(`No device token found for user ${notificationData.user_id}`);
        return false;
      }

      const language = user.language || 'en';
      const title = language === 'ar' && notificationData.title_ar 
        ? notificationData.title_ar 
        : notificationData.title;
      
      const body = language === 'ar' && notificationData.body_ar 
        ? notificationData.body_ar 
        : notificationData.body;

      // Store notification in database
      await storage.createNotification({
        userId: notificationData.user_id,
        type: notificationData.type as any,
        title: {
          en: notificationData.title,
          ar: notificationData.title_ar || notificationData.title
        },
        body: {
          en: notificationData.body,
          ar: notificationData.body_ar || notificationData.body
        },
        data: notificationData.data || null,
      });

      // Send push notification
      const pushData: PushNotification = {
        to: user.deviceToken,
        sound: 'default',
        title,
        body,
        data: {
          type: notificationData.type,
          ...notificationData.data,
        },
        badge: notificationData.badge,
        priority: notificationData.priority || 'high',
        ttl: 3600, // 1 hour
      };

      // Queue notification for sending
      await redisService.queueNotification({
        ...pushData,
        user_id: notificationData.user_id,
      });

      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendBulkNotifications(notifications: NotificationData[]): Promise<{
    successful: number;
    failed: number;
    errors: string[];
  }> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        if (result) {
          successful++;
        } else {
          failed++;
        }
      } catch (error: any) {
        failed++;
        errors.push(`User ${notification.user_id}: ${error.message}`);
      }
    }

    return { successful, failed, errors };
  }

  /**
   * Send order status update notification
   */
  async sendOrderStatusNotification(userId: string, bookingId: string, status: string, language: string = 'en'): Promise<boolean> {
    const statusMessages: Record<string, Record<string, { title: string; body: string }>> = {
      en: {
        confirmed: {
          title: 'Order Confirmed',
          body: 'Your cleaning service booking has been confirmed'
        },
        technician_assigned: {
          title: 'Technician Assigned',
          body: 'A technician has been assigned to your booking'
        },
        en_route: {
          title: 'Technician En Route',
          body: 'Your technician is on the way to your location'
        },
        in_progress: {
          title: 'Service Started',
          body: 'Your cleaning service is now in progress'
        },
        completed: {
          title: 'Service Completed',
          body: 'Your cleaning service has been completed successfully'
        },
        cancelled: {
          title: 'Booking Cancelled',
          body: 'Your booking has been cancelled'
        }
      },
      ar: {
        confirmed: {
          title: 'تم تأكيد الطلب',
          body: 'تم تأكيد حجز خدمة التنظيف الخاصة بك'
        },
        technician_assigned: {
          title: 'تم تعيين فني',
          body: 'تم تعيين فني لحجزك'
        },
        en_route: {
          title: 'الفني في الطريق',
          body: 'الفني في الطريق إلى موقعك'
        },
        in_progress: {
          title: 'بدأت الخدمة',
          body: 'خدمة التنظيف قيد التنفيذ الآن'
        },
        completed: {
          title: 'تم إكمال الخدمة',
          body: 'تم إكمال خدمة التنظيف بنجاح'
        },
        cancelled: {
          title: 'تم إلغاء الحجز',
          body: 'تم إلغاء حجزك'
        }
      }
    };

    const message = statusMessages[language]?.[status];
    if (!message) {
      console.error(`No message template found for status: ${status}`);
      return false;
    }

    return await this.sendNotification({
      user_id: userId,
      title: message.title,
      title_ar: statusMessages.ar?.[status]?.title,
      body: message.body,
      body_ar: statusMessages.ar?.[status]?.body,
      type: 'order_update',
      data: {
        booking_id: bookingId,
        status,
        action: 'view_order'
      },
      priority: 'high',
    });
  }

  /**
   * Send payment confirmation notification
   */
  async sendPaymentConfirmationNotification(userId: string, paymentId: string, amount: number, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    
    return await this.sendNotification({
      user_id: userId,
      title: isArabic ? 'تم تأكيد الدفع' : 'Payment Confirmed',
      title_ar: 'تم تأكيد الدفع',
      body: isArabic 
        ? `تم استلام دفعتك بمبلغ ${amount} ريال بنجاح`
        : `Your payment of ${amount} SAR has been received successfully`,
      body_ar: `تم استلام دفعتك بمبلغ ${amount} ريال بنجاح`,
      type: 'payment_confirmation',
      data: {
        payment_id: paymentId,
        amount,
        action: 'view_receipt'
      },
      priority: 'high',
    });
  }

  /**
   * Send quotation request notification
   */
  async sendQuotationNotification(userId: string, quotationId: string, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    
    return await this.sendNotification({
      user_id: userId,
      title: isArabic ? 'عرض سعر جديد' : 'New Quotation',
      title_ar: 'عرض سعر جديد',
      body: isArabic 
        ? 'تلقيت عرض سعر جديد من الفني. يرجى المراجعة والموافقة'
        : 'You have received a new quotation from the technician. Please review and approve',
      body_ar: 'تلقيت عرض سعر جديد من الفني. يرجى المراجعة والموافقة',
      type: 'quotation_request',
      data: {
        quotation_id: quotationId,
        action: 'view_quotation'
      },
      priority: 'high',
    });
  }

  /**
   * Send promotional notification
   */
  async sendPromotionalNotification(userIds: string[], promotion: any, language: string = 'en'): Promise<void> {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title: (promotion.title as any)[language] || (promotion.title as any).en,
      title_ar: (promotion.title as any).ar,
      body: (promotion.description as any)[language] || (promotion.description as any).en,
      body_ar: (promotion.description as any).ar,
      type: 'promotional' as any,
      data: {
        promotion_id: promotion.id,
        code: promotion.code,
        action: 'view_promotion'
      },
      priority: 'normal' as any,
    }));

    await this.sendBulkNotifications(notifications);
  }

  /**
   * Send referral reward notification
   */
  async sendReferralRewardNotification(userId: string, amount: number, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    
    return await this.sendNotification({
      user_id: userId,
      title: isArabic ? 'مكافأة إحالة!' : 'Referral Reward!',
      title_ar: 'مكافأة إحالة!',
      body: isArabic 
        ? `تهانينا! تلقيت ${amount} ريال كمكافأة إحالة`
        : `Congratulations! You received ${amount} SAR as referral reward`,
      body_ar: `تهانينا! تلقيت ${amount} ريال كمكافأة إحالة`,
      type: 'promotional',
      data: {
        reward_amount: amount,
        action: 'view_wallet'
      },
      priority: 'normal',
    });
  }

  /**
   * Send welcome notification for new users
   */
  async sendWelcomeNotification(userId: string, userName: string, language: string = 'en'): Promise<boolean> {
    const isArabic = language === 'ar';
    
    return await this.sendNotification({
      user_id: userId,
      title: isArabic ? `مرحباً ${userName}!` : `Welcome ${userName}!`,
      title_ar: `مرحباً ${userName}!`,
      body: isArabic 
        ? 'مرحباً بك في كلين سيرف! احجز أول خدمة تنظيف لك الآن'
        : 'Welcome to CleanServe! Book your first cleaning service now',
      body_ar: 'مرحباً بك في كلين سيرف! احجز أول خدمة تنظيف لك الآن',
      type: 'promotional',
      data: {
        action: 'browse_services'
      },
      priority: 'normal',
    });
  }

  /**
   * Process notification queue (to be called by worker)
   */
  async processNotificationQueue(): Promise<void> {
    try {
      const notification = await redisService.dequeueNotification();
      if (!notification) {
        return;
      }

      console.log('Processing notification:', notification);

      // Check if device token is valid for Expo
      if (!Expo.isExpoPushToken(notification.to)) {
        console.error('Invalid Expo push token:', notification.to);
        return;
      }

      // Send via Expo
      const messages: ExpoPushMessage[] = [{
        to: notification.to,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
        priority: notification.priority || 'high',
        ttl: notification.ttl || 3600,
      }];

      const chunks = this.expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Handle tickets and receipts
      await this.handlePushTickets(tickets);

    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  /**
   * Handle push notification tickets and receipts
   */
  private async handlePushTickets(tickets: ExpoPushTicket[]): Promise<void> {
    const receiptIds: ExpoPushReceiptId[] = [];

    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        receiptIds.push(ticket.id);
      } else {
        console.error('Push notification error:', ticket.message);
        if (ticket.details && ticket.details.error) {
          console.error('Error details:', ticket.details.error);
        }
      }
    }

    // Get receipts (you might want to do this periodically rather than immediately)
    if (receiptIds.length > 0) {
      try {
        const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);
        for (const chunk of receiptIdChunks) {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
          
          for (const receiptId in receipts) {
            const receipt = receipts[receiptId];
            if (receipt.status === 'ok') {
              console.log('Push notification delivered successfully');
            } else if (receipt.status === 'error') {
              console.error('Push notification error:', receipt.message);
              if (receipt.details && receipt.details.error) {
                console.error('Error details:', receipt.details.error);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error getting push notification receipts:', error);
      }
    }
  }

  /**
   * Send scheduled reminders
   */
  async sendScheduledReminders(): Promise<void> {
    try {
      // Get bookings scheduled for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // This would require a method in storage to get bookings by date range
      // const upcomingBookings = await storage.getBookingsByDateRange(tomorrow, dayAfterTomorrow);

      // Send reminders to users
      // Implementation would depend on the specific requirements
      
    } catch (error) {
      console.error('Error sending scheduled reminders:', error);
    }
  }

  /**
   * Get notification preferences for user
   */
  async getNotificationPreferences(userId: string): Promise<any> {
    // This would be implemented if you have user notification preferences
    // For now, return default preferences
    return {
      push_notifications: true,
      sms_notifications: true,
      email_notifications: true,
      marketing_notifications: false,
    };
  }

  /**
   * Update notification preferences for user
   */
  async updateNotificationPreferences(userId: string, preferences: any): Promise<boolean> {
    try {
      // This would be implemented to store user notification preferences
      // For now, just return true
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }
}

export const notificationService = new NotificationService();
