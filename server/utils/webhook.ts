import crypto from 'crypto';
import { redisService } from '../services/redis';
import { storage } from '../storage';

/**
 * Verify webhook signature using HMAC-SHA256
 */
export const verifyWebhookSignature = (
  payload: string, 
  signature: string, 
  secret: string,
  algorithm: string = 'sha256'
): boolean => {
  try {
    if (!signature) {
      console.error('Webhook signature missing');
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(payload)
      .digest('hex');
    
    // Remove any prefix from signature (like 'sha256=')
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    return crypto.timingSafeEqual(
      Buffer.from(cleanSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
};

/**
 * Verify Moyasar webhook signature
 */
export const verifyMoyasarSignature = (payload: string, signature: string): boolean => {
  const secret = process.env.MOYASAR_WEBHOOK_SECRET || 'moyasar_webhook_secret';
  return verifyWebhookSignature(payload, signature, secret);
};

/**
 * Verify Tabby webhook signature
 */
export const verifyTabbySignature = (payload: string, signature: string): boolean => {
  const secret = process.env.TABBY_WEBHOOK_SECRET || 'tabby_webhook_secret';
  return verifyWebhookSignature(payload, signature, secret);
};

/**
 * Generate webhook signature for testing
 */
export const generateWebhookSignature = (payload: string, secret: string): string => {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

/**
 * Process webhook with idempotency protection
 */
export const processWebhookWithIdempotency = async (
  provider: string,
  eventId: string,
  eventType: string,
  payload: any,
  processor: (payload: any) => Promise<any>
): Promise<{ success: boolean; error?: string; alreadyProcessed?: boolean }> => {
  try {
    const idempotencyKey = `webhook:${provider}:${eventId}`;
    
    // Check if already processed
    const alreadyProcessed = await redisService.checkIdempotencyKey(idempotencyKey);
    if (alreadyProcessed) {
      console.log(`Webhook ${eventId} already processed`);
      return { success: true, alreadyProcessed: true };
    }

    // Set idempotency key with 24-hour TTL
    await redisService.setIdempotencyKey(idempotencyKey, 86400);

    // Store webhook event
    const webhookEvent = await storage.createWebhookEvent({
      provider,
      eventType,
      eventId,
      payload: payload as any,
      status: 'processing',
    });

    try {
      // Process the webhook
      const result = await processor(payload);

      // Update webhook event as processed
      await storage.updateWebhookEventStatus(webhookEvent.id, 'processed');

      return { success: true };
    } catch (processingError: any) {
      console.error('Webhook processing error:', processingError);

      // Update webhook event with error
      await storage.updateWebhookEventStatus(
        webhookEvent.id, 
        'failed', 
        processingError.message
      );

      return { success: false, error: processingError.message };
    }
  } catch (error: any) {
    console.error('Webhook idempotency error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Moyasar webhook event processor
 */
export const processMoyasarWebhook = async (event: any): Promise<void> => {
  console.log('Processing Moyasar webhook:', event.type);

  switch (event.type) {
    case 'payment.paid':
      await handleMoyasarPaymentPaid(event.data.object);
      break;
    
    case 'payment.failed':
      await handleMoyasarPaymentFailed(event.data.object);
      break;
    
    case 'payment.authorized':
      await handleMoyasarPaymentAuthorized(event.data.object);
      break;
    
    case 'payment.captured':
      await handleMoyasarPaymentCaptured(event.data.object);
      break;
    
    case 'payment.refunded':
      await handleMoyasarPaymentRefunded(event.data.object);
      break;
    
    case 'payment.voided':
      await handleMoyasarPaymentVoided(event.data.object);
      break;
    
    default:
      console.log(`Unhandled Moyasar event type: ${event.type}`);
  }
};

/**
 * Tabby webhook event processor
 */
export const processTabbyWebhook = async (event: any): Promise<void> => {
  console.log('Processing Tabby webhook:', event.type);

  switch (event.type) {
    case 'payment.authorized':
      await handleTabbyPaymentAuthorized(event.data);
      break;
    
    case 'payment.captured':
      await handleTabbyPaymentCaptured(event.data);
      break;
    
    case 'payment.closed':
      await handleTabbyPaymentClosed(event.data);
      break;
    
    case 'payment.rejected':
      await handleTabbyPaymentRejected(event.data);
      break;
    
    case 'payment.refunded':
      await handleTabbyPaymentRefunded(event.data);
      break;
    
    case 'payment.expired':
      await handleTabbyPaymentExpired(event.data);
      break;
    
    default:
      console.log(`Unhandled Tabby event type: ${event.type}`);
  }
};

// Moyasar event handlers
async function handleMoyasarPaymentPaid(payment: any): Promise<void> {
  try {
    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) {
      console.error('No booking_id found in Moyasar payment metadata');
      return;
    }

    // Find payment record
    const payments = await storage.getBookingPayments(bookingId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      // Update payment status
      await storage.updatePaymentStatus(paymentRecord.id, 'paid', payment);
      
      // Update booking status
      await storage.updateBookingStatus(bookingId, 'confirmed');
      
      // Process referral rewards if applicable
      await processReferralReward(bookingId);
      
      console.log(`Moyasar payment ${payment.id} marked as paid`);
    }
  } catch (error) {
    console.error('Error handling Moyasar payment paid:', error);
  }
}

async function handleMoyasarPaymentFailed(payment: any): Promise<void> {
  try {
    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) return;

    const payments = await storage.getBookingPayments(bookingId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'failed', payment);
      console.log(`Moyasar payment ${payment.id} marked as failed`);
    }
  } catch (error) {
    console.error('Error handling Moyasar payment failed:', error);
  }
}

async function handleMoyasarPaymentAuthorized(payment: any): Promise<void> {
  try {
    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) return;

    const payments = await storage.getBookingPayments(bookingId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'authorized', payment);
      console.log(`Moyasar payment ${payment.id} authorized`);
    }
  } catch (error) {
    console.error('Error handling Moyasar payment authorized:', error);
  }
}

async function handleMoyasarPaymentCaptured(payment: any): Promise<void> {
  try {
    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) return;

    const payments = await storage.getBookingPayments(bookingId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'paid', payment);
      await storage.updateBookingStatus(bookingId, 'confirmed');
      
      // Process referral rewards if applicable
      await processReferralReward(bookingId);
      
      console.log(`Moyasar payment ${payment.id} captured`);
    }
  } catch (error) {
    console.error('Error handling Moyasar payment captured:', error);
  }
}

async function handleMoyasarPaymentRefunded(payment: any): Promise<void> {
  try {
    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) return;

    const payments = await storage.getBookingPayments(bookingId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'refunded', payment);
      console.log(`Moyasar payment ${payment.id} refunded`);
    }
  } catch (error) {
    console.error('Error handling Moyasar payment refunded:', error);
  }
}

async function handleMoyasarPaymentVoided(payment: any): Promise<void> {
  try {
    const bookingId = payment.metadata?.booking_id;
    if (!bookingId) return;

    const payments = await storage.getBookingPayments(bookingId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'cancelled', payment);
      console.log(`Moyasar payment ${payment.id} voided`);
    }
  } catch (error) {
    console.error('Error handling Moyasar payment voided:', error);
  }
}

// Tabby event handlers
async function handleTabbyPaymentAuthorized(payment: any): Promise<void> {
  try {
    const referenceId = payment.order?.reference_id;
    if (!referenceId) return;

    const payments = await storage.getBookingPayments(referenceId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'authorized', payment);
      console.log(`Tabby payment ${payment.id} authorized`);
    }
  } catch (error) {
    console.error('Error handling Tabby payment authorized:', error);
  }
}

async function handleTabbyPaymentCaptured(payment: any): Promise<void> {
  try {
    const referenceId = payment.order?.reference_id;
    if (!referenceId) return;

    const payments = await storage.getBookingPayments(referenceId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'paid', payment);
      await storage.updateBookingStatus(referenceId, 'confirmed');
      console.log(`Tabby payment ${payment.id} captured`);
    }
  } catch (error) {
    console.error('Error handling Tabby payment captured:', error);
  }
}

async function handleTabbyPaymentClosed(payment: any): Promise<void> {
  try {
    const referenceId = payment.order?.reference_id;
    if (!referenceId) return;

    const payments = await storage.getBookingPayments(referenceId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'cancelled', payment);
      console.log(`Tabby payment ${payment.id} closed`);
    }
  } catch (error) {
    console.error('Error handling Tabby payment closed:', error);
  }
}

async function handleTabbyPaymentRejected(payment: any): Promise<void> {
  try {
    const referenceId = payment.order?.reference_id;
    if (!referenceId) return;

    const payments = await storage.getBookingPayments(referenceId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'failed', payment);
      console.log(`Tabby payment ${payment.id} rejected`);
    }
  } catch (error) {
    console.error('Error handling Tabby payment rejected:', error);
  }
}

async function handleTabbyPaymentRefunded(payment: any): Promise<void> {
  try {
    const referenceId = payment.order?.reference_id;
    if (!referenceId) return;

    const payments = await storage.getBookingPayments(referenceId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'refunded', payment);
      console.log(`Tabby payment ${payment.id} refunded`);
    }
  } catch (error) {
    console.error('Error handling Tabby payment refunded:', error);
  }
}

async function handleTabbyPaymentExpired(payment: any): Promise<void> {
  try {
    const referenceId = payment.order?.reference_id;
    if (!referenceId) return;

    const payments = await storage.getBookingPayments(referenceId);
    const paymentRecord = payments.find(p => p.gatewayPaymentId === payment.id);

    if (paymentRecord) {
      await storage.updatePaymentStatus(paymentRecord.id, 'cancelled', payment);
      console.log(`Tabby payment ${payment.id} expired`);
    }
  } catch (error) {
    console.error('Error handling Tabby payment expired:', error);
  }
}

/**
 * Webhook retry mechanism
 */
export const retryWebhook = async (
  webhookId: string,
  maxRetries: number = 3,
  retryDelay: number = 60000 // 1 minute
): Promise<boolean> => {
  try {
    // This would be implemented to retry failed webhooks
    // Get webhook event from database
    // Attempt to reprocess
    // Update status based on result
    
    console.log(`Retrying webhook ${webhookId}`);
    return true;
  } catch (error) {
    console.error('Webhook retry error:', error);
    return false;
  }
};

/**
 * Clean up old webhook events
 */
export const cleanupWebhookEvents = async (olderThanDays: number = 30): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    // This would be implemented to clean up old webhook events from the database
    console.log(`Cleaning up webhook events older than ${cutoffDate}`);
    
    return 0; // Return number of cleaned up events
  } catch (error) {
    console.error('Webhook cleanup error:', error);
    return 0;
  }
};

// Process referral rewards
async function processReferralReward(bookingId: string): Promise<void> {
  try {
    const db = (await import('../db')).db;
    const { referrals, walletTransactions, wallets } = await import('../../shared/schema');
    const { eq, sql } = await import('drizzle-orm');
    
    // Find the referral record by bookingId
    const referral = await db.query.referrals.findFirst({
      where: eq(referrals.bookingId, bookingId),
    });
    
    if (!referral || referral.status !== 'pending') {
      return; // No pending referral for this booking
    }
    
    const inviterReward = parseFloat(referral.inviterReward);
    
    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      const now = new Date();
      
      // If no reward, just mark as completed
      if (inviterReward <= 0) {
        await tx.update(referrals)
          .set({ 
            status: 'completed',
            completedAt: now
          })
          .where(eq(referrals.id, referral.id));
        return;
      }
      
      // Get current wallet balance
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, referral.inviterId),
      });
      
      const currentBalance = wallet ? parseFloat(wallet.balance) : 0;
      const newBalance = currentBalance + inviterReward;
      
      // Create wallet transaction
      await tx.insert(walletTransactions).values({
        userId: referral.inviterId,
        amount: inviterReward.toFixed(2),
        type: 'credit',
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        referenceType: 'referral',
        referenceId: referral.id,
        description: `Referral reward for inviting user`,
        descriptionAr: `مكافأة الإحالة لدعوة مستخدم`
      });
      
      // Update wallet balance
      if (wallet) {
        await tx.update(wallets)
          .set({ balance: newBalance.toFixed(2) })
          .where(eq(wallets.userId, referral.inviterId));
      } else {
        await tx.insert(wallets).values({
          userId: referral.inviterId,
          balance: inviterReward.toFixed(2)
        });
      }
      
      // Only mark as rewarded after successful wallet credit
      await tx.update(referrals)
        .set({ 
          status: 'rewarded',
          completedAt: now,
          rewardDistributedAt: now
        })
        .where(eq(referrals.id, referral.id));
      
      console.log(`Referral reward of ${inviterReward} SAR credited to user ${referral.inviterId}`);
    });
  } catch (error) {
    console.error('Error processing referral reward:', error);
    throw error; // Re-throw to allow caller to handle
  }
}

export default {
  verifyWebhookSignature,
  verifyMoyasarSignature,
  verifyTabbySignature,
  generateWebhookSignature,
  processWebhookWithIdempotency,
  processMoyasarWebhook,
  processTabbyWebhook,
  retryWebhook,
  cleanupWebhookEvents,
};
