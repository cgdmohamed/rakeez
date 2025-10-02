import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { RedisService } from '../services/redis';
import { moyasarService } from '../services/moyasar';
import { tabbyService } from '../services/tabby';
import { notificationService } from '../services/notifications';
import { bilingual } from '../utils/bilingual';

export class WebhooksController {
  constructor(
    private storage: IStorage,
    private redis: RedisService
  ) {}

  async handleMoyasarWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-moyasar-signature'] as string;
      const payload = JSON.stringify(req.body);

      // Verify signature
      if (!moyasarService.verifyWebhookSignature(payload, signature)) {
        console.error('Moyasar webhook: Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = req.body;
      const eventId = event.id;

      // Check if event already processed (idempotency)
      const isProcessed = await this.redis.isWebhookProcessed(eventId, 'moyasar');
      if (isProcessed) {
        console.log(`Moyasar webhook: Event ${eventId} already processed`);
        return res.status(200).json({ message: 'Already processed' });
      }

      // Mark as processed
      await this.redis.markWebhookProcessed(eventId, 'moyasar');

      // Store webhook event
      const webhookEvent = await this.storage.createWebhookEvent({
        provider: 'moyasar',
        eventType: 'payment.status_change',
        eventId: eventId,
        paymentId: eventId, // Moyasar payment ID is the event ID
        payload: event,
        status: 'pending',
        attempts: 0
      });

      // Queue event for processing
      await this.redis.queueJob('webhooks:moyasar', {
        webhook_event_id: webhookEvent.id,
        event_data: event
      });

      // Process immediately (in production, this would be handled by a worker)
      await this.processMoyasarWebhookEvent(webhookEvent.id, event);

      return res.status(200).json({ received: true });

    } catch (error) {
      console.error('Moyasar webhook error:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  async handleTabbyWebhook(req: Request, res: Response) {
    try {
      const signature = req.headers['x-tabby-signature'] as string;
      const payload = JSON.stringify(req.body);

      // Verify signature
      if (!tabbyService.verifyWebhookSignature(payload, signature)) {
        console.error('Tabby webhook: Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      const event = req.body;
      const eventId = event.id || `${event.payment?.id}_${Date.now()}`;

      // Check if event already processed
      const isProcessed = await this.redis.isWebhookProcessed(eventId, 'tabby');
      if (isProcessed) {
        console.log(`Tabby webhook: Event ${eventId} already processed`);
        return res.status(200).json({ message: 'Already processed' });
      }

      // Mark as processed
      await this.redis.markWebhookProcessed(eventId, 'tabby');

      // Store webhook event
      const webhookEvent = await this.storage.createWebhookEvent({
        provider: 'tabby',
        eventType: event.type || 'payment.status_change',
        eventId: eventId,
        paymentId: event.payment?.id || null,
        payload: event,
        status: 'pending',
        attempts: 0
      });

      // Queue event for processing
      await this.redis.queueJob('webhooks:tabby', {
        webhook_event_id: webhookEvent.id,
        event_data: event
      });

      // Process immediately (in production, this would be handled by a worker)
      await this.processTabbyWebhookEvent(webhookEvent.id, event);

      return res.status(200).json({ received: true });

    } catch (error) {
      console.error('Tabby webhook error:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  async getWebhookHistory(req: Request, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || 'en';
      const provider = req.query.provider as string;
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 50;

      // This would need a proper query method in storage
      // For now, return a mock response structure
      const webhookEvents = []; // await this.storage.getWebhookEvents({ provider, status, limit });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('webhooks.history_retrieved', userLanguage),
        data: {
          events: webhookEvents.map(event => ({
            id: event.id,
            provider: event.provider,
            event_type: event.eventType,
            event_id: event.eventId,
            payment_id: event.paymentId,
            status: event.status,
            attempts: event.attempts,
            error: event.error,
            created_at: event.createdAt,
            processed_at: event.processedAt
          })),
          total_count: webhookEvents.length,
          filters: { provider, status, limit }
        }
      });

    } catch (error) {
      console.error('Get webhook history error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  private async processMoyasarWebhookEvent(webhookEventId: string, eventData: any) {
    try {
      console.log(`Processing Moyasar webhook event: ${eventData.id}`);

      // Find payment by Moyasar payment ID
      const payments = await this.getPaymentsByProviderTransactionId(eventData.id);
      
      if (payments.length === 0) {
        console.log(`No payment found for Moyasar payment ID: ${eventData.id}`);
        await this.storage.updateWebhookEvent(webhookEventId, {
          status: 'failed',
          error: 'Payment not found',
          processedAt: new Date()
        });
        return;
      }

      const payment = payments[0];
      const oldStatus = payment.status;
      let newStatus = payment.status;

      // Map Moyasar status to our payment status
      switch (eventData.status) {
        case 'paid':
          newStatus = 'paid';
          break;
        case 'authorized':
          newStatus = 'authorized';
          break;
        case 'failed':
          newStatus = 'failed';
          break;
        case 'refunded':
          newStatus = eventData.refunded === eventData.amount ? 'refunded' : 'partial_refund';
          break;
        case 'voided':
          newStatus = 'cancelled';
          break;
      }

      // Update payment status if changed
      if (newStatus !== oldStatus) {
        await this.storage.updatePayment(payment.id, {
          status: newStatus,
          providerResponse: eventData
        });

        // Create audit log
        await this.storage.createPaymentAuditLog({
          paymentId: payment.id,
          action: 'webhook_status_update',
          oldStatus: oldStatus,
          newStatus: newStatus,
          amount: payment.amount,
          details: {
            webhook_event_id: webhookEventId,
            moyasar_status: eventData.status,
            moyasar_payment_id: eventData.id
          },
          userId: null
        });

        // Update order payment status if paid
        if (newStatus === 'paid') {
          await this.storage.updateOrder(payment.orderId, {
            paymentStatus: 'paid'
          });
        }

        // Send notification to customer
        await this.sendPaymentNotification(payment, newStatus);
      }

      // Update webhook event status
      await this.storage.updateWebhookEvent(webhookEventId, {
        status: 'processed',
        processedAt: new Date()
      });

      console.log(`Moyasar webhook processed successfully for payment ${payment.id}`);

    } catch (error) {
      console.error('Process Moyasar webhook error:', error);
      
      // Update webhook event with error
      await this.storage.updateWebhookEvent(webhookEventId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed',
        attempts: 1,
        processedAt: new Date()
      });
    }
  }

  private async processTabbyWebhookEvent(webhookEventId: string, eventData: any) {
    try {
      console.log(`Processing Tabby webhook event: ${eventData.payment?.id}`);

      if (!eventData.payment?.id) {
        console.log('No payment ID in Tabby webhook event');
        await this.storage.updateWebhookEvent(webhookEventId, {
          status: 'failed',
          error: 'No payment ID in event',
          processedAt: new Date()
        });
        return;
      }

      // Find payment by Tabby payment ID
      const payments = await this.getPaymentsByProviderTransactionId(eventData.payment.id);
      
      if (payments.length === 0) {
        console.log(`No payment found for Tabby payment ID: ${eventData.payment.id}`);
        await this.storage.updateWebhookEvent(webhookEventId, {
          status: 'failed',
          error: 'Payment not found',
          processedAt: new Date()
        });
        return;
      }

      const payment = payments[0];
      const oldStatus = payment.status;
      let newStatus = payment.status;

      // Map Tabby status to our payment status
      switch (eventData.payment.status) {
        case 'authorized':
          newStatus = 'authorized';
          break;
        case 'closed':
          // Check if it was captured or cancelled
          if (eventData.payment.captures && eventData.payment.captures.length > 0) {
            newStatus = 'paid';
          } else {
            newStatus = 'cancelled';
          }
          break;
        case 'rejected':
          newStatus = 'failed';
          break;
        case 'expired':
          newStatus = 'failed';
          break;
      }

      // Check for refunds
      if (eventData.payment.refunds && eventData.payment.refunds.length > 0) {
        const totalRefunded = eventData.payment.refunds.reduce((sum: number, refund: any) => {
          return sum + parseFloat(refund.amount);
        }, 0);
        
        const totalAmount = parseFloat(payment.amount);
        newStatus = totalRefunded >= totalAmount ? 'refunded' : 'partial_refund';
        
        // Update refund amount
        await this.storage.updatePayment(payment.id, {
          refundAmount: totalRefunded.toString()
        });
      }

      // Update payment status if changed
      if (newStatus !== oldStatus) {
        await this.storage.updatePayment(payment.id, {
          status: newStatus,
          providerResponse: eventData.payment
        });

        // Create audit log
        await this.storage.createPaymentAuditLog({
          paymentId: payment.id,
          action: 'webhook_status_update',
          oldStatus: oldStatus,
          newStatus: newStatus,
          amount: payment.amount,
          details: {
            webhook_event_id: webhookEventId,
            tabby_status: eventData.payment.status,
            tabby_payment_id: eventData.payment.id
          },
          userId: null
        });

        // Update order payment status if paid
        if (newStatus === 'paid') {
          await this.storage.updateOrder(payment.orderId, {
            paymentStatus: 'paid'
          });
        }

        // Send notification to customer
        await this.sendPaymentNotification(payment, newStatus);
      }

      // Update webhook event status
      await this.storage.updateWebhookEvent(webhookEventId, {
        status: 'processed',
        processedAt: new Date()
      });

      console.log(`Tabby webhook processed successfully for payment ${payment.id}`);

    } catch (error) {
      console.error('Process Tabby webhook error:', error);
      
      // Update webhook event with error
      await this.storage.updateWebhookEvent(webhookEventId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed',
        attempts: 1,
        processedAt: new Date()
      });
    }
  }

  private async getPaymentsByProviderTransactionId(providerTransactionId: string) {
    // This is a workaround since we don't have a direct method
    // In production, you'd add this method to IStorage
    try {
      // Get all orders and their payments to find the matching provider transaction ID
      // This is not efficient but works for the implementation
      const orders = await this.storage.getUserOrders('dummy', 1000); // Get many orders
      const payments = [];
      
      for (const order of orders) {
        const orderPayments = await this.storage.getOrderPayments(order.id);
        for (const payment of orderPayments) {
          if (payment.providerTransactionId === providerTransactionId) {
            payments.push(payment);
          }
        }
      }
      
      return payments;
    } catch (error) {
      console.error('Error finding payment by provider transaction ID:', error);
      return [];
    }
  }

  private async sendPaymentNotification(payment: any, status: string) {
    try {
      // Get customer details
      const customer = await this.storage.getUser(payment.userId);
      if (!customer || !customer.deviceToken) {
        return;
      }

      // Get order details
      const order = await this.storage.getOrder(payment.orderId);
      if (!order) {
        return;
      }

      // Create notification payload
      const notification = notificationService.createPaymentNotification(
        order.id,
        parseFloat(payment.amount),
        status,
        customer.language || 'en'
      );

      // Send push notification
      await notificationService.sendPushNotification(
        customer.deviceToken,
        notification
      );

      // Store notification in database
      await this.storage.createNotification({
        userId: customer.id,
        title: notification.title,
        titleAr: status === 'paid' ? 'تم الدفع بنجاح' : 'تحديث حالة الدفع',
        body: notification.body,
        bodyAr: status === 'paid' ? `تم دفع ${payment.amount} ريال للطلب #${order.id} بنجاح.` : `حالة الدفع للطلب #${order.id}: ${status}`,
        type: 'payment_confirmation',
        data: notification.data
      });

      console.log(`Payment notification sent to user ${customer.id} for payment ${payment.id}`);

    } catch (error) {
      console.error('Send payment notification error:', error);
    }
  }

  // Worker method for processing queued webhook events (would run in separate process)
  async processWebhookQueue() {
    try {
      // Process Moyasar queue
      const moyasarJob = await this.redis.getQueuedJob('webhooks:moyasar', 10);
      if (moyasarJob) {
        await this.processMoyasarWebhookEvent(
          moyasarJob.data.webhook_event_id,
          moyasarJob.data.event_data
        );
      }

      // Process Tabby queue
      const tabbyJob = await this.redis.getQueuedJob('webhooks:tabby', 10);
      if (tabbyJob) {
        await this.processTabbyWebhookEvent(
          tabbyJob.data.webhook_event_id,
          tabbyJob.data.event_data
        );
      }

    } catch (error) {
      console.error('Process webhook queue error:', error);
    }
  }
}
