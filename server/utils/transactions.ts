import { db } from '../db';
import { wallets, walletTransactions, payments, referrals, bookings } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export interface HybridPaymentData {
  orderId: string;
  userId: string;
  totalAmount: number;
  walletAmount: number;
  gatewayAmount: number;
  paymentMethod: string;
  gatewayTransactionId: string | null;
  gatewayResponse: any;
}

export interface WalletPaymentData {
  orderId: string;
  userId: string;
  amount: number;
}

export interface ReferralRewardData {
  referralId: string;
  inviterId: string;
  rewardAmount: number;
  bookingId: string;
}

export class PaymentTransactions {
  static async processWalletPayment(data: WalletPaymentData) {
    return await db.transaction(async (tx) => {
      const wallet = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, data.userId))
        .for('update');

      if (!wallet[0]) {
        throw new Error('Wallet not found');
      }

      const currentBalance = parseFloat(wallet[0].balance);
      if (currentBalance < data.amount) {
        throw new Error('Insufficient wallet balance');
      }

      const newBalance = currentBalance - data.amount;
      const newTotalSpent = parseFloat(wallet[0].totalSpent) + data.amount;

      await tx
        .update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          totalSpent: newTotalSpent.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(wallets.userId, data.userId));

      const [walletTransaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId: wallet[0].id,
          userId: data.userId,
          type: 'debit',
          amount: data.amount.toFixed(2),
          balanceBefore: currentBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: `Payment for booking ${data.orderId}`,
          descriptionAr: `دفع للحجز ${data.orderId}`,
          referenceType: 'booking',
          referenceId: data.orderId,
          createdAt: new Date()
        })
        .returning();

      const [payment] = await tx
        .insert(payments)
        .values({
          bookingId: data.orderId,
          userId: data.userId,
          paymentMethod: 'wallet',
          amount: data.amount.toFixed(2),
          currency: 'SAR',
          status: 'paid',
          gatewayPaymentId: null,
          gatewayResponse: null,
          walletAmount: data.amount.toFixed(2),
          gatewayAmount: '0.00',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await tx
        .update(bookings)
        .set({
          paymentStatus: 'paid',
          status: 'confirmed',
          updatedAt: new Date()
        })
        .where(eq(bookings.id, data.orderId));

      return {
        payment,
        walletTransaction,
        newBalance
      };
    });
  }

  static async processHybridPayment(data: HybridPaymentData) {
    return await db.transaction(async (tx) => {
      let walletTransaction = null;
      let newBalance = 0;

      if (data.walletAmount > 0) {
        const wallet = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, data.userId))
          .for('update');

        if (!wallet[0]) {
          throw new Error('Wallet not found');
        }

        const currentBalance = parseFloat(wallet[0].balance);
        if (currentBalance < data.walletAmount) {
          throw new Error('Insufficient wallet balance');
        }

        newBalance = currentBalance - data.walletAmount;
        const newTotalSpent = parseFloat(wallet[0].totalSpent) + data.walletAmount;

        await tx
          .update(wallets)
          .set({
            balance: newBalance.toFixed(2),
            totalSpent: newTotalSpent.toFixed(2),
            updatedAt: new Date()
          })
          .where(eq(wallets.userId, data.userId));

        [walletTransaction] = await tx
          .insert(walletTransactions)
          .values({
            walletId: wallet[0].id,
            userId: data.userId,
            type: 'debit',
            amount: data.walletAmount.toFixed(2),
            balanceBefore: currentBalance.toFixed(2),
            balanceAfter: newBalance.toFixed(2),
            description: `Hybrid payment for booking ${data.orderId} (Wallet portion)`,
            descriptionAr: `دفع مختلط للحجز ${data.orderId} (جزء المحفظة)`,
            referenceType: 'booking',
            referenceId: data.orderId,
            createdAt: new Date()
          })
          .returning();
      }

      const [payment] = await tx
        .insert(payments)
        .values({
          bookingId: data.orderId,
          userId: data.userId,
          paymentMethod: data.paymentMethod as any,
          amount: data.totalAmount.toFixed(2),
          currency: 'SAR',
          status: data.gatewayAmount > 0 ? 'pending' : 'paid',
          gatewayPaymentId: data.gatewayTransactionId,
          gatewayResponse: data.gatewayResponse,
          walletAmount: data.walletAmount.toFixed(2),
          gatewayAmount: data.gatewayAmount.toFixed(2),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (data.gatewayAmount === 0) {
        await tx
          .update(bookings)
          .set({
            paymentStatus: 'paid',
            status: 'confirmed',
            updatedAt: new Date()
          })
          .where(eq(bookings.id, data.orderId));
      }

      return {
        payment,
        walletTransaction,
        newBalance
      };
    });
  }

  static async distributeReferralReward(data: ReferralRewardData) {
    return await db.transaction(async (tx) => {
      const wallet = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, data.inviterId))
        .for('update');

      if (!wallet[0]) {
        throw new Error('Inviter wallet not found');
      }

      const currentBalance = parseFloat(wallet[0].balance);
      const newBalance = currentBalance + data.rewardAmount;
      const newTotalEarned = parseFloat(wallet[0].totalEarned) + data.rewardAmount;

      await tx
        .update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          totalEarned: newTotalEarned.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(wallets.userId, data.inviterId));

      const [walletTransaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId: wallet[0].id,
          userId: data.inviterId,
          type: 'credit',
          amount: data.rewardAmount.toFixed(2),
          balanceBefore: currentBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: `Referral reward for booking ${data.bookingId}`,
          descriptionAr: `مكافأة إحالة للحجز ${data.bookingId}`,
          referenceType: 'referral',
          referenceId: data.referralId,
          createdAt: new Date()
        })
        .returning();

      await tx
        .update(referrals)
        .set({
          status: 'rewarded',
          rewardDistributedAt: new Date()
        })
        .where(eq(referrals.id, data.referralId));

      return {
        walletTransaction,
        newBalance
      };
    });
  }

  static async refundPayment(paymentId: string, refundAmount: number, userId: string, bookingId: string) {
    return await db.transaction(async (tx) => {
      const wallet = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .for('update');

      if (!wallet[0]) {
        throw new Error('User wallet not found');
      }

      const currentBalance = parseFloat(wallet[0].balance);
      const newBalance = currentBalance + refundAmount;
      const newTotalSpent = Math.max(0, parseFloat(wallet[0].totalSpent) - refundAmount);

      await tx
        .update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          totalSpent: newTotalSpent.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(wallets.userId, userId));

      const [walletTransaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId: wallet[0].id,
          userId,
          type: 'credit',
          amount: refundAmount.toFixed(2),
          balanceBefore: currentBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: `Refund for booking ${bookingId}`,
          descriptionAr: `استرجاع للحجز ${bookingId}`,
          referenceType: 'refund',
          referenceId: bookingId,
          createdAt: new Date()
        })
        .returning();

      await tx
        .update(payments)
        .set({
          status: 'refunded',
          updatedAt: new Date()
        })
        .where(eq(payments.id, paymentId));

      await tx
        .update(bookings)
        .set({
          paymentStatus: 'refunded',
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(bookings.id, bookingId));

      return {
        walletTransaction,
        newBalance
      };
    });
  }

  static async processSubscriptionWalletPurchase(data: {
    userId: string;
    packageId: string;
    startDate: Date;
    endDate: Date;
    autoRenew: boolean;
    amount: number;
    benefits: any;
  }) {
    return await db.transaction(async (tx) => {
      // Get wallet with lock
      const walletRecord = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, data.userId))
        .for('update');

      if (!walletRecord[0]) {
        throw new Error('Wallet not found');
      }

      const currentBalance = parseFloat(walletRecord[0].balance);
      if (currentBalance < data.amount) {
        throw new Error('Insufficient wallet balance');
      }

      const newBalance = currentBalance - data.amount;

      // Deduct from wallet
      await tx
        .update(wallets)
        .set({
          balance: newBalance.toFixed(2),
          updatedAt: new Date()
        })
        .where(eq(wallets.userId, data.userId));

      // Create wallet transaction
      const [walletTransaction] = await tx
        .insert(walletTransactions)
        .values({
          walletId: walletRecord[0].id,
          userId: data.userId,
          type: 'debit',
          amount: data.amount.toFixed(2),
          balanceBefore: currentBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: 'Subscription purchase',
          descriptionAr: 'شراء اشتراك',
          referenceType: 'subscription',
          createdAt: new Date()
        })
        .returning();

      // Create subscription (NO booking reference)
      const { subscriptions } = await import('../../shared/schema');
      const [subscription] = await tx
        .insert(subscriptions)
        .values({
          userId: data.userId,
          packageId: data.packageId,
          status: 'active',
          startDate: data.startDate,
          endDate: data.endDate,
          autoRenew: data.autoRenew,
          totalAmount: data.amount.toFixed(2),
          benefits: data.benefits,
          usageCount: 0,
          createdAt: new Date()
        })
        .returning();

      // Link wallet transaction to subscription
      await tx
        .update(walletTransactions)
        .set({ referenceId: subscription.id })
        .where(eq(walletTransactions.id, walletTransaction.id));

      return {
        subscription,
        walletTransaction,
        newBalance
      };
    });
  }
}
