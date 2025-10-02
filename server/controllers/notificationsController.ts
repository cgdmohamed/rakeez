import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { RedisService } from '../services/redis';
import { notificationService } from '../services/notifications';
import { bilingual } from '../utils/bilingual';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    language: string;
    role: string;
    deviceToken?: string;
  };
}

export class NotificationsController {
  constructor(
    private storage: IStorage,
    private redis: RedisService
  ) {}

  async getUserNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await this.storage.getUserNotifications(userId, limit);

      const localizedNotifications = notifications.map(notification => ({
        id: notification.id,
        title: userLanguage === 'ar' ? notification.titleAr || notification.title : notification.title,
        body: userLanguage === 'ar' ? notification.bodyAr || notification.body : notification.body,
        type: notification.type,
        data: notification.data,
        read: notification.read,
        sent_at: notification.sentAt,
        created_at: notification.createdAt
      }));

      // Get unread count
      const unreadCount = notifications.filter(n => !n.read).length;

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('notifications.retrieved_successfully', userLanguage),
        data: {
          notifications: localizedNotifications,
          total_count: localizedNotifications.length,
          unread_count: unreadCount,
          has_more: notifications.length === limit
        }
      });

    } catch (error) {
      console.error('Get user notifications error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const notificationId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      // Verify notification belongs to user
      const userNotifications = await this.storage.getUserNotifications(userId, 1000);
      const notification = userNotifications.find(n => n.id === notificationId);

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('notifications.not_found', userLanguage)
        });
      }

      if (notification.read) {
        return res.status(200).json({
          success: true,
          message: bilingual.getMessage('notifications.already_read', userLanguage),
          data: { notification_id: notificationId, read: true }
        });
      }

      // Mark as read
      const updated = await this.storage.markNotificationAsRead(notificationId);

      if (!updated) {
        return res.status(500).json({
          success: false,
          message: bilingual.getErrorMessage('notifications.mark_read_failed', userLanguage)
        });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('notifications.marked_as_read', userLanguage),
        data: {
          notification_id: notificationId,
          read: true,
          marked_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Mark notification as read error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async sendNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!['admin'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.admin_only', userLanguage)
        });
      }

      const {
        user_ids,
        title,
        title_ar,
        body,
        body_ar,
        type,
        data,
        schedule_at
      } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.user_ids_required', userLanguage)
        });
      }

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.title_body_required', userLanguage)
        });
      }

      const notificationType = type || 'promotional';
      const notificationData = data || {};
      const scheduleDate = schedule_at ? new Date(schedule_at) : new Date();

      // Validate users exist
      const validUsers = [];
      for (const userId of user_ids) {
        const user = await this.storage.getUser(userId);
        if (user) {
          validUsers.push(user);
        }
      }

      if (validUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('users.none_found', userLanguage)
        });
      }

      const results = [];

      // Send to each user
      for (const user of validUsers) {
        try {
          // Create notification record
          const notification = await this.storage.createNotification({
            userId: user.id,
            title,
            titleAr: title_ar || null,
            body,
            bodyAr: body_ar || null,
            type: notificationType as any,
            data: notificationData,
            sentAt: scheduleDate
          });

          // Send push notification if user has device token
          let pushResult = null;
          if (user.deviceToken) {
            const pushNotification = {
              title: user.language === 'ar' ? title_ar || title : title,
              body: user.language === 'ar' ? body_ar || body : body,
              data: notificationData
            };

            pushResult = await notificationService.sendPushNotification(
              user.deviceToken,
              pushNotification
            );
          }

          results.push({
            user_id: user.id,
            notification_id: notification.id,
            push_sent: !!pushResult?.success,
            push_ticket_id: pushResult?.ticketId || null,
            status: 'sent'
          });

        } catch (userError) {
          console.error(`Send notification to user ${user.id} error:`, userError);
          results.push({
            user_id: user.id,
            notification_id: null,
            push_sent: false,
            push_ticket_id: null,
            status: 'failed',
            error: userError instanceof Error ? userError.message : 'Unknown error'
          });
        }
      }

      const successCount = results.filter(r => r.status === 'sent').length;
      const failureCount = results.filter(r => r.status === 'failed').length;

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('notifications.batch_sent', userLanguage),
        data: {
          total_recipients: validUsers.length,
          successful_sends: successCount,
          failed_sends: failureCount,
          results,
          sent_at: scheduleDate.toISOString()
        }
      });

    } catch (error) {
      console.error('Send notification error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async sendOrderStatusNotification(orderId: string, status: string, userId?: string) {
    try {
      // Get order and customer details
      const order = await this.storage.getOrder(orderId);
      if (!order) {
        console.error(`Order not found: ${orderId}`);
        return;
      }

      const customer = await this.storage.getUser(order.userId);
      if (!customer) {
        console.error(`Customer not found: ${order.userId}`);
        return;
      }

      // Create notification payload
      const notification = notificationService.createOrderStatusNotification(
        status,
        orderId,
        customer.language || 'en'
      );

      // Store notification in database
      const dbNotification = await this.storage.createNotification({
        userId: customer.id,
        title: notification.title,
        titleAr: this.getOrderStatusTitleArabic(status, orderId),
        body: notification.body,
        bodyAr: this.getOrderStatusBodyArabic(status, orderId),
        type: 'order_update',
        data: notification.data,
        sentAt: new Date()
      });

      // Send push notification if user has device token
      if (customer.deviceToken) {
        const pushResult = await notificationService.sendPushNotification(
          customer.deviceToken,
          notification
        );

        console.log(`Order status notification sent to user ${customer.id}:`, {
          order_id: orderId,
          status,
          push_successful: pushResult.success,
          ticket_id: pushResult.ticketId
        });
      }

      // Queue for SMS if critical status and user has phone
      if (['technician_assigned', 'en_route', 'completed'].includes(status) && customer.phone) {
        await this.redis.queueJob('notifications:sms', {
          phone: customer.phone,
          order_id: orderId,
          status,
          language: customer.language || 'en'
        });
      }

    } catch (error) {
      console.error('Send order status notification error:', error);
    }
  }

  async sendQuotationNotification(orderId: string, amount: number, technicianId: string) {
    try {
      // Get order and customer details
      const order = await this.storage.getOrder(orderId);
      if (!order) return;

      const customer = await this.storage.getUser(order.userId);
      if (!customer) return;

      // Create notification
      const notification = notificationService.createQuotationNotification(
        orderId,
        amount,
        customer.language || 'en'
      );

      // Store in database
      await this.storage.createNotification({
        userId: customer.id,
        title: notification.title,
        titleAr: 'عرض سعر جديد',
        body: notification.body,
        bodyAr: `عرض سعر جديد للطلب #${orderId}: ${amount} ريال. يرجى المراجعة والموافقة.`,
        type: 'quotation_request',
        data: notification.data,
        sentAt: new Date()
      });

      // Send push notification
      if (customer.deviceToken) {
        await notificationService.sendPushNotification(
          customer.deviceToken,
          notification
        );
      }

      console.log(`Quotation notification sent for order ${orderId}, amount: ${amount}`);

    } catch (error) {
      console.error('Send quotation notification error:', error);
    }
  }

  async sendPromotionalNotification(
    userIds: string[],
    title: string,
    body: string,
    titleAr?: string,
    bodyAr?: string,
    promoCode?: string
  ) {
    try {
      const results = [];

      for (const userId of userIds) {
        const user = await this.storage.getUser(userId);
        if (!user) continue;

        // Create notification
        const notification = notificationService.createPromotionalNotification(
          user.language === 'ar' ? titleAr || title : title,
          user.language === 'ar' ? bodyAr || body : body,
          user.language || 'en',
          promoCode
        );

        // Store in database
        const dbNotification = await this.storage.createNotification({
          userId: user.id,
          title,
          titleAr: titleAr || null,
          body,
          bodyAr: bodyAr || null,
          type: 'promotional',
          data: notification.data,
          sentAt: new Date()
        });

        // Send push notification
        let pushResult = null;
        if (user.deviceToken) {
          pushResult = await notificationService.sendPushNotification(
            user.deviceToken,
            notification
          );
        }

        results.push({
          user_id: userId,
          notification_id: dbNotification.id,
          push_successful: pushResult?.success || false
        });
      }

      console.log(`Promotional notification sent to ${results.length} users`);
      return results;

    } catch (error) {
      console.error('Send promotional notification error:', error);
      return [];
    }
  }

  private getOrderStatusTitleArabic(status: string, orderId: string): string {
    const statusTitles: Record<string, string> = {
      'confirmed': 'تم تأكيد الطلب',
      'technician_assigned': 'تم تعيين فني',
      'en_route': 'الفني في الطريق',
      'in_progress': 'الخدمة قيد التنفيذ',
      'completed': 'تم إكمال الطلب',
      'cancelled': 'تم إلغاء الطلب'
    };

    return statusTitles[status] || 'تحديث الطلب';
  }

  private getOrderStatusBodyArabic(status: string, orderId: string): string {
    const statusBodies: Record<string, string> = {
      'confirmed': `تم تأكيد طلبك #${orderId}. سنقوم بإشعارك عند تعيين فني.`,
      'technician_assigned': `تم تعيين فني لطلبك #${orderId}. سيتصل بك قريباً.`,
      'en_route': `الفني في الطريق إلى موقعك للطلب #${orderId}.`,
      'in_progress': `خدمة التنظيف للطلب #${orderId} قيد التنفيذ حالياً.`,
      'completed': `تم إكمال طلبك #${orderId}. شكراً لاختيارك كلين سيرف!`,
      'cancelled': `تم إلغاء طلبك #${orderId}. سيتم رد أي مبالغ مدفوعة.`
    };

    return statusBodies[status] || `تم تحديث حالة الطلب #${orderId}.`;
  }
}
