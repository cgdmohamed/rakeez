import { redisService } from '../services/redis';
import { notificationService } from '../services/notification';
import { twilioService } from '../services/twilio';
import { emailService } from '../services/email';
import { storage } from '../storage';
import { NOTIFICATION_CONSTANTS, ORDER_CONSTANTS } from '../utils/constants';

class NotificationWorker {
  private isProcessing: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the notification processing worker
   */
  start(): void {
    console.log('Starting notification worker...');
    
    if (this.intervalId) {
      console.warn('Notification worker is already running');
      return;
    }

    this.intervalId = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
    }, 3000); // Process every 3 seconds

    console.log('Notification worker started');
  }

  /**
   * Stop the notification processing worker
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Notification worker stopped');
    }
  }

  /**
   * Process notification queue from Redis
   */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    try {
      // Process push notifications
      await notificationService.processNotificationQueue();
      
      // Process SMS notifications for critical status updates
      await this.processSMSQueue();
      
      // Process email notifications
      await this.processEmailQueue();
      
      // Clean up old notifications
      await this.cleanupOldNotifications();
      
    } catch (error) {
      console.error('Error processing notification queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process SMS notification queue
   */
  private async processSMSQueue(): Promise<void> {
    try {
      const smsNotification = await redisService.rpop('notifications:sms');
      if (!smsNotification) {
        return; // No SMS notifications in queue
      }

      const { user_id, message, phone, language } = smsNotification;
      
      console.log(`Processing SMS notification for user ${user_id}`);

      // Send SMS via Twilio
      const success = await twilioService.sendOTP(phone, message, language);
      
      if (success) {
        console.log(`SMS notification sent successfully to ${phone}`);
      } else {
        console.error(`Failed to send SMS notification to ${phone}`);
        
        // Re-queue with retry logic
        const retryCount = smsNotification.retry_count || 0;
        if (retryCount < 3) {
          await redisService.lpush('notifications:sms', {
            ...smsNotification,
            retry_count: retryCount + 1,
          });
        }
      }

    } catch (error) {
      console.error('Error processing SMS queue:', error);
    }
  }

  /**
   * Process email notification queue
   */
  private async processEmailQueue(): Promise<void> {
    try {
      const emailNotification = await redisService.rpop('notifications:email');
      if (!emailNotification) {
        return; // No email notifications in queue
      }

      const { user_id, type, email, data, language } = emailNotification;
      
      console.log(`Processing email notification for user ${user_id}, type: ${type}`);

      let success = false;

      switch (type) {
        case 'booking_confirmation':
          success = await emailService.sendBookingConfirmationEmail(
            email, 
            data.booking, 
            language
          );
          break;
        
        case 'welcome':
          success = await emailService.sendWelcomeEmail(
            email, 
            data.name, 
            language
          );
          break;
        
        case 'password_reset':
          success = await emailService.sendPasswordResetEmail(
            email, 
            data.reset_token, 
            language, 
            data.name
          );
          break;
        
        default:
          console.log(`Unknown email notification type: ${type}`);
          return;
      }
      
      if (success) {
        console.log(`Email notification sent successfully to ${email}`);
      } else {
        console.error(`Failed to send email notification to ${email}`);
        
        // Re-queue with retry logic
        const retryCount = emailNotification.retry_count || 0;
        if (retryCount < 3) {
          await redisService.lpush('notifications:email', {
            ...emailNotification,
            retry_count: retryCount + 1,
          });
        }
      }

    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }

  /**
   * Send scheduled notifications (reminders, etc.)
   */
  async sendScheduledNotifications(): Promise<void> {
    try {
      console.log('Processing scheduled notifications...');
      
      // Send booking reminders for tomorrow
      await this.sendBookingReminders();
      
      // Send promotional notifications
      await this.sendPromotionalNotifications();
      
      // Send referral follow-ups
      await this.sendReferralFollowUps();
      
    } catch (error) {
      console.error('Error sending scheduled notifications:', error);
    }
  }

  /**
   * Send booking reminders for upcoming services
   */
  private async sendBookingReminders(): Promise<void> {
    try {
      // Get bookings scheduled for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // This would require implementation in storage to get bookings by date range
      // For now, we'll simulate the logic
      console.log(`Checking for bookings scheduled for ${tomorrow.toDateString()}`);

      // In a real implementation, you would:
      // 1. Query bookings for tomorrow
      // 2. For each booking, send reminder notification
      // 3. Mark reminder as sent to avoid duplicates

    } catch (error) {
      console.error('Error sending booking reminders:', error);
    }
  }

  /**
   * Send promotional notifications to targeted users
   */
  private async sendPromotionalNotifications(): Promise<void> {
    try {
      // Get active promotions
      const promotions = await storage.getActivePromotions();
      
      for (const promotion of promotions) {
        // Logic to determine which users to send to
        // For example, users who haven't booked in a while
        console.log(`Processing promotional notification for: ${promotion.code}`);
        
        // In a real implementation, you would:
        // 1. Identify target users based on promotion criteria
        // 2. Send notifications to those users
        // 3. Track notification sends to avoid spam
      }
      
    } catch (error) {
      console.error('Error sending promotional notifications:', error);
    }
  }

  /**
   * Send referral follow-up notifications
   */
  private async sendReferralFollowUps(): Promise<void> {
    try {
      console.log('Checking for referral follow-ups...');
      
      // Logic to send follow-up notifications for:
      // 1. Incomplete referrals (invitee registered but hasn't booked)
      // 2. Successful referrals (reward confirmation)
      // 3. Referral code sharing reminders
      
    } catch (error) {
      console.error('Error sending referral follow-ups:', error);
    }
  }

  /**
   * Clean up old notifications from database
   */
  private async cleanupOldNotifications(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - NOTIFICATION_CONSTANTS.NOTIFICATION_RETENTION_DAYS);
      
      // This would be implemented in storage to clean up old notifications
      console.log(`Cleaning up notifications older than ${cutoffDate}`);
      
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  /**
   * Queue SMS notification for critical order updates
   */
  async queueSMSNotification(userId: string, message: string, phone: string, language: string = 'en'): Promise<void> {
    try {
      await redisService.lpush('notifications:sms', {
        user_id: userId,
        message,
        phone,
        language,
        queued_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error queuing SMS notification:', error);
    }
  }

  /**
   * Queue email notification
   */
  async queueEmailNotification(
    userId: string, 
    email: string, 
    type: string, 
    data: any, 
    language: string = 'en'
  ): Promise<void> {
    try {
      await redisService.lpush('notifications:email', {
        user_id: userId,
        email,
        type,
        data,
        language,
        queued_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error queuing email notification:', error);
    }
  }

  /**
   * Send immediate order status SMS for critical updates
   */
  async sendOrderStatusSMS(userId: string, bookingId: string, status: string): Promise<void> {
    try {
      // Only send SMS for critical statuses
      if (!NOTIFICATION_CONSTANTS.CRITICAL_STATUS_SMS.includes(status)) {
        return;
      }

      const user = await storage.getUser(userId);
      if (!user || !user.phone) {
        return;
      }

      const success = await twilioService.sendOrderUpdate(
        user.phone, 
        bookingId, 
        status, 
        user.language
      );

      if (success) {
        console.log(`Order status SMS sent for booking ${bookingId}, status: ${status}`);
      } else {
        console.error(`Failed to send order status SMS for booking ${bookingId}`);
        
        // Queue for retry
        await this.queueSMSNotification(
          userId, 
          `Order ${bookingId} status: ${status}`, 
          user.phone, 
          user.language
        );
      }

    } catch (error) {
      console.error('Error sending order status SMS:', error);
    }
  }

  /**
   * Get notification statistics
   */
  async getStatistics(): Promise<{
    push_queue_size: number;
    sms_queue_size: number;
    email_queue_size: number;
    total_sent_today: number;
    failed_today: number;
  }> {
    try {
      const [pushQueueSize, smsQueueSize, emailQueueSize] = await Promise.all([
        redisService.llen('notifications:queue'),
        redisService.llen('notifications:sms'),
        redisService.llen('notifications:email'),
      ]);

      // These would come from persistent storage/logs
      const totalSentToday = 0;
      const failedToday = 0;

      return {
        push_queue_size: pushQueueSize,
        sms_queue_size: smsQueueSize,
        email_queue_size: emailQueueSize,
        total_sent_today: totalSentToday,
        failed_today: failedToday,
      };
    } catch (error) {
      console.error('Error getting notification statistics:', error);
      return {
        push_queue_size: 0,
        sms_queue_size: 0,
        email_queue_size: 0,
        total_sent_today: 0,
        failed_today: 0,
      };
    }
  }

  /**
   * Health check for the notification worker
   */
  isHealthy(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get worker status
   */
  getStatus(): {
    running: boolean;
    processing: boolean;
    uptime: number;
  } {
    return {
      running: this.intervalId !== null,
      processing: this.isProcessing,
      uptime: process.uptime(),
    };
  }

  /**
   * Clear notification queues (for maintenance)
   */
  async clearQueues(): Promise<void> {
    try {
      await Promise.all([
        redisService.del('notifications:queue'),
        redisService.del('notifications:sms'),
        redisService.del('notifications:email'),
      ]);
      console.log('Cleared all notification queues');
    } catch (error) {
      console.error('Error clearing notification queues:', error);
    }
  }
}

// Create singleton instance
export const notificationWorker = new NotificationWorker();

// Auto-start worker if running as main process
if (require.main === module) {
  console.log('Starting notification worker as standalone process...');
  
  notificationWorker.start();

  // Schedule periodic tasks
  setInterval(async () => {
    await notificationWorker.sendScheduledNotifications();
  }, 60 * 60 * 1000); // Every hour

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down notification worker...');
    notificationWorker.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down notification worker...');
    notificationWorker.stop();
    process.exit(0);
  });
}
