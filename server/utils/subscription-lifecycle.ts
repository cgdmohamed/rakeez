import { db } from '../db';
import { subscriptions, servicePackages, wallets, walletTransactions, payments } from '../../shared/schema';
import { eq, and, lte, gte, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { moyasarService } from '../services/moyasar';
import { emailService } from '../services/email';

export interface SubscriptionRenewalResult {
  subscriptionId: string;
  success: boolean;
  error?: string;
  newEndDate?: Date;
  paymentId?: string;
}

export interface SubscriptionExpirationResult {
  totalExpired: number;
  subscriptionIds: string[];
}

/**
 * Check and process auto-renewals for subscriptions nearing expiration
 */
export async function processAutoRenewals(daysBeforeExpiration: number = 3): Promise<SubscriptionRenewalResult[]> {
  try {
    const now = new Date();
    const renewalThreshold = new Date();
    renewalThreshold.setDate(renewalThreshold.getDate() + daysBeforeExpiration);

    // Find subscriptions that are active, have autoRenew enabled, and are expiring soon
    const expiringSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          eq(subscriptions.autoRenew, true),
          lte(subscriptions.endDate, renewalThreshold),
          gte(subscriptions.endDate, now)
        )
      );

    console.log(`Found ${expiringSubscriptions.length} subscriptions for auto-renewal`);

    const results: SubscriptionRenewalResult[] = [];

    for (const subscription of expiringSubscriptions) {
      try {
        const result = await renewSubscription(subscription.id);
        results.push(result);
      } catch (error: any) {
        results.push({
          subscriptionId: subscription.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error processing auto-renewals:', error);
    throw error;
  }
}

/**
 * Renew a single subscription
 */
async function renewSubscription(subscriptionId: string): Promise<SubscriptionRenewalResult> {
  const subscription = await storage.getSubscription(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // Get package details
  const [pkg] = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.id, subscription.packageId));

  if (!pkg) {
    throw new Error('Package not found');
  }

  const renewalPrice = parseFloat(pkg.price);

  // Try wallet payment first
  const wallet = await storage.getWallet(subscription.userId);
  const walletBalance = wallet ? parseFloat(wallet.balance) : 0;

  if (walletBalance >= renewalPrice) {
    // Process wallet renewal
    return await renewViaWallet(subscription, pkg, renewalPrice, walletBalance);
  } else {
    // Notify user about failed renewal
    await notifyRenewalFailure(subscription, 'Insufficient wallet balance');
    
    return {
      subscriptionId: subscription.id,
      success: false,
      error: 'Insufficient wallet balance for renewal'
    };
  }
}

/**
 * Renew subscription via wallet payment
 */
async function renewViaWallet(
  subscription: any,
  pkg: any,
  amount: number,
  walletBalance: number
): Promise<SubscriptionRenewalResult> {
  return await db.transaction(async (tx) => {
    // Get wallet with lock
    const walletRecord = await tx
      .select()
      .from(wallets)
      .where(eq(wallets.userId, subscription.userId))
      .for('update');

    if (!walletRecord[0] || parseFloat(walletRecord[0].balance) < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const currentBalance = parseFloat(walletRecord[0].balance);
    const newBalance = currentBalance - amount;

    // Deduct from wallet
    await tx
      .update(wallets)
      .set({
        balance: newBalance.toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(wallets.userId, subscription.userId));

    // Create wallet transaction
    const [walletTx] = await tx
      .insert(walletTransactions)
      .values({
        walletId: walletRecord[0].id,
        userId: subscription.userId,
        type: 'debit',
        amount: amount.toFixed(2),
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description: `Subscription renewal: ${(pkg.name as any).en}`,
        descriptionAr: `تجديد الاشتراك: ${(pkg.name as any).ar}`,
        referenceType: 'subscription',
        referenceId: subscription.id,
        createdAt: new Date()
      })
      .returning();

    // Calculate new end date (add duration from current end date)
    const currentEndDate = new Date(subscription.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setMonth(newEndDate.getMonth() + 1); // Add 1 month

    // Update subscription
    const [updatedSubscription] = await tx
      .update(subscriptions)
      .set({
        endDate: newEndDate,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, subscription.id))
      .returning();

    // Create audit log
    await storage.createAuditLog({
      userId: subscription.userId,
      action: 'subscription_renewed_wallet',
      resourceType: 'subscription',
      resourceId: subscription.id
    });

    console.log(`Subscription ${subscription.id} renewed via wallet until ${newEndDate}`);

    return {
      subscriptionId: subscription.id,
      success: true,
      newEndDate,
      paymentId: walletTx.id
    };
  });
}

/**
 * Expire subscriptions that have passed their end date
 */
export async function expireSubscriptions(): Promise<SubscriptionExpirationResult> {
  try {
    const now = new Date();

    // Find active subscriptions that have expired
    const expiredSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'active'),
          lte(subscriptions.endDate, now)
        )
      );

    console.log(`Found ${expiredSubscriptions.length} expired subscriptions`);

    const expiredIds: string[] = [];

    for (const subscription of expiredSubscriptions) {
      await db
        .update(subscriptions)
        .set({
          status: 'expired',
          updatedAt: new Date()
        })
        .where(eq(subscriptions.id, subscription.id));

      expiredIds.push(subscription.id);

      // Create audit log
      await storage.createAuditLog({
        userId: subscription.userId,
        action: 'subscription_expired',
        resourceType: 'subscription',
        resourceId: subscription.id
      });

      // Notify user
      await notifySubscriptionExpired(subscription);
    }

    return {
      totalExpired: expiredIds.length,
      subscriptionIds: expiredIds
    };
  } catch (error) {
    console.error('Error expiring subscriptions:', error);
    throw error;
  }
}

/**
 * Check if user has active subscription benefits
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const activeSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gte(subscriptions.endDate, new Date())
      )
    );

  return activeSubscriptions.length > 0;
}

/**
 * Get user's active subscription with benefits
 */
export async function getUserActiveSubscription(userId: string) {
  const [activeSubscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        gte(subscriptions.endDate, new Date())
      )
    )
    .orderBy(sql`${subscriptions.endDate} DESC`)
    .limit(1);

  if (!activeSubscription) {
    return null;
  }

  // Get package details
  const [pkg] = await db
    .select()
    .from(servicePackages)
    .where(eq(servicePackages.id, activeSubscription.packageId));

  return {
    subscription: activeSubscription,
    package: pkg,
    benefits: activeSubscription.benefits
  };
}

/**
 * Increment subscription usage count
 */
export async function incrementSubscriptionUsage(subscriptionId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      usageCount: sql`${subscriptions.usageCount} + 1`,
      updatedAt: new Date()
    })
    .where(eq(subscriptions.id, subscriptionId));
}

/**
 * Notify user about renewal failure
 */
async function notifyRenewalFailure(subscription: any, reason: string): Promise<void> {
  try {
    const user = await storage.getUser(subscription.userId);
    if (!user) return;

    // Create notification
    await storage.createNotification({
      userId: subscription.userId,
      title: {
        en: 'Subscription Renewal Failed',
        ar: 'فشل تجديد الاشتراك'
      },
      body: {
        en: `Your subscription could not be renewed: ${reason}`,
        ar: `تعذر تجديد اشتراكك: ${reason}`
      },
      type: 'subscription',
      data: {
        subscription_id: subscription.id,
        reason
      }
    });

    console.log(`Renewal failure notification sent to user ${subscription.userId}`);
  } catch (error) {
    console.error('Error sending renewal failure notification:', error);
  }
}

/**
 * Notify user about subscription expiration
 */
async function notifySubscriptionExpired(subscription: any): Promise<void> {
  try {
    const user = await storage.getUser(subscription.userId);
    if (!user) return;

    // Create notification
    await storage.createNotification({
      userId: subscription.userId,
      title: {
        en: 'Subscription Expired',
        ar: 'انتهت صلاحية الاشتراك'
      },
      body: {
        en: 'Your subscription has expired. Renew now to continue enjoying benefits.',
        ar: 'انتهت صلاحية اشتراكك. قم بالتجديد الآن لمواصلة الاستمتاع بالمزايا.'
      },
      type: 'subscription',
      data: {
        subscription_id: subscription.id
      }
    });

    console.log(`Expiration notification sent to user ${subscription.userId}`);
  } catch (error) {
    console.error('Error sending expiration notification:', error);
  }
}

export default {
  processAutoRenewals,
  expireSubscriptions,
  hasActiveSubscription,
  getUserActiveSubscription,
  incrementSubscriptionUsage
};
