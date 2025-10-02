import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { redisService } from './redis';
import { storage } from '../storage';

interface NotificationData {
  user_id: string;
  title: string;
  title_ar?: string;
  body: string;
  body_ar?: string;
  type: string;
  data?: Record<string, any>;
  device_token?: string;
}

class NotificationService {
  private expo: Expo;

  constructor() {
    this.expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN,
      useFcmV1: false, // Use FCM v1 API if needed
    });
  }

  async sendPushNotification(notificationData: NotificationData): Promise<boolean> {
    try {
      // Get user's device token if not provided
      let deviceToken = notificationData.device_token;
      if (!deviceToken) {
        const user = await storage.getUser(notificationData.user_id);
        deviceToken = user?.device_token;
      }

      if (!deviceToken || !Expo.isExpoPushToken(deviceToken)) {
        console.log('Invalid or missing device token for user:', notificationData.user_id);
        return false;
      }

      // Get user's language preference
      const user = await storage.getUser(notificationData.user_id);
      const language = user?.language || 'ar';

      // Select appropriate title and body based on language
      const title = language === 'ar' && notificationData.title_ar 
        ? notificationData.title_ar 
        : notificationData.title;
      
      const body = language === 'ar' && notificationData.body_ar 
        ? notificationData.body_ar 
        : notificationData.body;

      const message: ExpoPushMessage = {
        to: deviceToken,
        sound: 'default',
        title,
        body,
        data: {
          type: notificationData.type,
          ...notificationData.data,
        },
        priority: 'high',
      };

      // Send the push notification
      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          console.error('Error sending push notification chunk:', error);
        }
      }

      // Store notification in database
      await storage.createNotification({
        user_id: notificationData.user_id,
        title: notificationData.title,
        title_ar: notificationData.title_ar,
        body: notificationData.body,
        body_ar: notificationData.body_ar,
        type: notificationData.type,
        data: notificationData.data,
        sent: true,
      });

      console.log('Push notification sent to user:', notificationData.user_id);
      return true;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  async queueNotification(notificationData: NotificationData): Promise<void> {
    await redisService.queueNotification(notificationData);
  }

  async processNotificationQueue(): Promise<void> {
    try {
      const notification = await redisService.dequeueNotification();
      if (notification) {
        await this.sendPushNotification(notification);
        // Process next notification in queue
        setImmediate(() => this.processNotificationQueue());
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }

  // Specific notification types
  async sendOrderStatusUpdate(
    userId: string,
    orderId: string,
    status: string,
    message?: string
  ): Promise<void> {
    const statusMessages = {
      ar: {
        confirmed: 'تم تأكيد طلبك',
        technician_assigned: 'تم تعيين فني للطلب',
        en_route: 'الفني في الطريق إليك',
        in_progress: 'جاري تنفيذ الخدمة',
        completed: 'تم إكمال الخدمة بنجاح',
        cancelled: 'تم إلغاء الطلب',
      },
      en: {
        confirmed: 'Your order has been confirmed',
        technician_assigned: 'Technician assigned to your order',
        en_route: 'Technician is on the way',
        in_progress: 'Service is in progress',
        completed: 'Service completed successfully',
        cancelled: 'Order has been cancelled',
      },
    };

    const titleAr = statusMessages.ar[status] || 'تحديث الطلب';
    const titleEn = statusMessages.en[status] || 'Order Update';
    const bodyAr = message || `طلب رقم ${orderId}: ${titleAr}`;
    const bodyEn = message || `Order ${orderId}: ${titleEn}`;

    await this.queueNotification({
      user_id: userId,
      title: titleEn,
      title_ar: titleAr,
      body: bodyEn,
      body_ar: bodyAr,
      type: 'order_update',
      data: {
        order_id: orderId,
        status,
        action: 'view_order',
      },
    });
  }

  async sendPaymentConfirmation(
    userId: string,
    orderId: string,
    amount: number,
    paymentMethod: string
  ): Promise<void> {
    await this.queueNotification({
      user_id: userId,
      title: 'Payment Confirmed',
      title_ar: 'تم تأكيد الدفع',
      body: `Payment of ${amount} SAR confirmed for order ${orderId}`,
      body_ar: `تم تأكيد دفع ${amount} ريال للطلب ${orderId}`,
      type: 'payment_confirmation',
      data: {
        order_id: orderId,
        amount,
        payment_method: paymentMethod,
        action: 'view_invoice',
      },
    });
  }

  async sendQuotationRequest(
    userId: string,
    orderId: string,
    quotationAmount: number
  ): Promise<void> {
    await this.queueNotification({
      user_id: userId,
      title: 'Quotation Request',
      title_ar: 'طلب عرض سعر',
      body: `Additional parts needed for ${quotationAmount} SAR. Please approve or reject.`,
      body_ar: `قطع إضافية مطلوبة بقيمة ${quotationAmount} ريال. يرجى الموافقة أو الرفض.`,
      type: 'quotation_request',
      data: {
        order_id: orderId,
        amount: quotationAmount,
        action: 'review_quotation',
      },
    });
  }

  async sendReferralReward(
    userId: string,
    rewardAmount: number,
    inviteeName: string
  ): Promise<void> {
    await this.queueNotification({
      user_id: userId,
      title: 'Referral Reward',
      title_ar: 'مكافأة الإحالة',
      body: `You earned ${rewardAmount} SAR for referring ${inviteeName}!`,
      body_ar: `لقد ربحت ${rewardAmount} ريال لإحالة ${inviteeName}!`,
      type: 'referral_reward',
      data: {
        amount: rewardAmount,
        invitee_name: inviteeName,
        action: 'view_wallet',
      },
    });
  }

  async sendPromotionalOffer(
    userId: string,
    offerTitle: string,
    offerTitleAr: string,
    offerDescription: string,
    offerDescriptionAr: string,
    promoCode?: string
  ): Promise<void> {
    await this.queueNotification({
      user_id: userId,
      title: offerTitle,
      title_ar: offerTitleAr,
      body: offerDescription,
      body_ar: offerDescriptionAr,
      type: 'promotional_offer',
      data: {
        promo_code: promoCode,
        action: 'view_offer',
      },
    });
  }

  async sendWelcomeMessage(
    userId: string,
    userName: string
  ): Promise<void> {
    await this.queueNotification({
      user_id: userId,
      title: `Welcome ${userName}!`,
      title_ar: `مرحباً ${userName}!`,
      body: 'Welcome to CleanServe! Book your first cleaning service now.',
      body_ar: 'مرحباً بك في كلين سيرف! احجز أول خدمة تنظيف الآن.',
      type: 'welcome',
      data: {
        action: 'browse_services',
      },
    });
  }

  // Start notification queue processor
  startQueueProcessor(): void {
    console.log('Starting notification queue processor...');
    this.processNotificationQueue();
    
    // Process queue every 5 seconds if there are items
    setInterval(() => {
      this.processNotificationQueue();
    }, 5000);
  }
}

export const notificationService = new NotificationService();
