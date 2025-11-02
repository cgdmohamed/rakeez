import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { RedisService } from '../services/redis';
import { moyasarService } from '../services/moyasar';
import { tabbyService } from '../services/tabby';
import { bilingual } from '../utils/bilingual';
import { paymentSchema, validateSchema } from '../middleware/validation';
import { PaymentTransactions } from '../utils/transactions';
import crypto from 'crypto';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    language: string;
    role: string;
    phone?: string;
    email?: string;
  };
}

export class PaymentsController {
  constructor(
    private storage: IStorage,
    private redis: RedisService
  ) {}

  async payWithWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const { order_id, amount, use_credits, credits_amount } = req.body;

      if (!order_id || !amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_payment_data', userLanguage)
        });
      }

      // Validate positive credits_amount
      if (credits_amount && credits_amount < 0) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_amount', userLanguage),
          message_ar: bilingual.getErrorMessage('validation.invalid_amount', 'ar')
        });
      }

      // Verify order exists and belongs to user
      const order = await this.storage.getOrder(order_id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      // Process credit deduction if requested
      let creditsUsed = 0;
      let creditTransaction = null;
      let remainingAmount = amount;

      if (use_credits && credits_amount > 0) {
        const db = await import('../db').then(m => m.db);
        const { loyaltySettings, creditTransactions } = await import('../../shared/schema');
        const { sql, and, eq } = await import('drizzle-orm');

        // Get loyalty settings
        const settings = await db.query.loyaltySettings.findFirst({
          where: eq(loyaltySettings.isActive, true)
        });

        const maxCreditPercentage = settings ? parseFloat(settings.maxCreditPercentage) : 30;
        const minBookingForCredit = settings ? parseFloat(settings.minBookingForCredit) : 50;

        // Validate minimum booking amount
        if (amount < minBookingForCredit) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('credits.min_amount_required', userLanguage),
            error: `Minimum booking amount of ${minBookingForCredit} SAR required to use credits`,
            data: {
              booking_amount: amount,
              required: minBookingForCredit
            }
          });
        }

        // Calculate maximum allowed credit usage
        const maxAllowedCredits = (amount * maxCreditPercentage) / 100;

        // Get user's available credit balance
        const creditBalance = await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(creditTransactions)
          .where(
            and(
              eq(creditTransactions.userId, userId),
              eq(creditTransactions.isExpired, false)
            )
          );

        const availableCredits = parseFloat(creditBalance[0]?.total?.toString() || '0');

        // Determine actual credits to use
        creditsUsed = Math.max(0, Math.min(credits_amount || 0, maxAllowedCredits, availableCredits, amount));

        if (creditsUsed > 0) {
          try {
            const creditResult = await PaymentTransactions.deductCredits({
              userId,
              amount: creditsUsed,
              bookingId: order_id
            });
            creditTransaction = creditResult.transaction;
            remainingAmount = amount - creditsUsed;
          } catch (error: any) {
            return res.status(400).json({
              success: false,
              message: bilingual.getErrorMessage('credits.deduction_failed', userLanguage),
              error: error.message
            });
          }
        }
      }

      // Validate wallet balance for remaining amount
      const wallet = await this.storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('wallet.not_found', userLanguage)
        });
      }

      const walletBalance = parseFloat(wallet.balance);
      if (walletBalance < remainingAmount) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('wallet.insufficient_balance', userLanguage),
          data: {
            required: remainingAmount,
            available: walletBalance,
            shortfall: remainingAmount - walletBalance,
            credits_used: creditsUsed
          }
        });
      }

      const result = await PaymentTransactions.processWalletPayment({
        orderId: order_id,
        userId,
        amount: remainingAmount
      });

      await this.storage.createPaymentAuditLog({
        paymentId: result.payment.id,
        action: 'wallet_payment',
        oldStatus: null,
        newStatus: 'paid',
        amount: amount.toString(),
        details: { method: 'wallet', transaction_id: result.walletTransaction.id },
        userId
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('payment.wallet_successful', userLanguage),
        data: {
          payment_id: result.payment.id,
          order_id: order_id,
          total_amount: amount,
          credits_used: creditsUsed,
          wallet_amount: remainingAmount,
          currency: 'SAR',
          method: 'wallet',
          status: 'paid',
          wallet_transaction_id: result.walletTransaction.id,
          credit_transaction_id: creditTransaction?.id || null,
          new_wallet_balance: result.newBalance,
          created_at: result.payment.createdAt
        }
      });

    } catch (error) {
      console.error('Wallet payment error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async hybridPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const { 
        order_id, 
        total_amount, 
        wallet_amount, 
        gateway_amount, 
        payment_method, 
        payment_source,
        use_credits,
        credits_amount
      } = req.body;

      if (!order_id || !total_amount || !wallet_amount || !gateway_amount) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_payment_data', userLanguage)
        });
      }

      // Validate positive amounts
      if (total_amount < 0) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_amount', userLanguage),
          message_ar: bilingual.getErrorMessage('validation.invalid_amount', 'ar')
        });
      }

      if (credits_amount && credits_amount < 0) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_amount', userLanguage),
          message_ar: bilingual.getErrorMessage('validation.invalid_amount', 'ar')
        });
      }

      if (wallet_amount + gateway_amount !== total_amount) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.amounts_mismatch', userLanguage)
        });
      }

      // Verify order
      const order = await this.storage.getOrder(order_id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      // Process credit deduction if requested
      let creditsUsed = 0;
      let creditTransaction = null;
      let remainingWalletAmount = wallet_amount;
      let remainingGatewayAmount = gateway_amount;

      if (use_credits && credits_amount > 0) {
        const db = await import('../db').then(m => m.db);
        const { loyaltySettings, creditTransactions } = await import('../../shared/schema');
        const { sql, and, eq } = await import('drizzle-orm');

        // Get loyalty settings
        const settings = await db.query.loyaltySettings.findFirst({
          where: eq(loyaltySettings.isActive, true)
        });

        const maxCreditPercentage = settings ? parseFloat(settings.maxCreditPercentage) : 30;
        const minBookingForCredit = settings ? parseFloat(settings.minBookingForCredit) : 50;

        // Validate minimum booking amount
        if (total_amount < minBookingForCredit) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('credits.min_amount_required', userLanguage),
            error: `Minimum booking amount of ${minBookingForCredit} SAR required to use credits`,
            data: {
              booking_amount: total_amount,
              required: minBookingForCredit
            }
          });
        }

        // Calculate maximum allowed credit usage
        const maxAllowedCredits = (total_amount * maxCreditPercentage) / 100;

        // Get user's available credit balance
        const creditBalance = await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(creditTransactions)
          .where(
            and(
              eq(creditTransactions.userId, userId),
              eq(creditTransactions.isExpired, false)
            )
          );

        const availableCredits = parseFloat(creditBalance[0]?.total?.toString() || '0');

        // Determine actual credits to use
        creditsUsed = Math.max(0, Math.min(credits_amount || 0, maxAllowedCredits, availableCredits, total_amount));

        if (creditsUsed > 0) {
          try {
            const creditResult = await PaymentTransactions.deductCredits({
              userId,
              amount: creditsUsed,
              bookingId: order_id
            });
            creditTransaction = creditResult.transaction;

            // Deduct credits from wallet first, then gateway
            if (creditsUsed <= wallet_amount) {
              remainingWalletAmount = wallet_amount - creditsUsed;
            } else {
              remainingWalletAmount = 0;
              remainingGatewayAmount = gateway_amount - (creditsUsed - wallet_amount);
            }
          } catch (error: any) {
            return res.status(400).json({
              success: false,
              message: bilingual.getErrorMessage('credits.deduction_failed', userLanguage),
              error: error.message
            });
          }
        }
      }

      // Check wallet balance for remaining wallet amount
      const walletBalance = await this.storage.getUserWalletBalance(userId);
      if (walletBalance < remainingWalletAmount) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('wallet.insufficient_balance', userLanguage),
          data: {
            required: remainingWalletAmount,
            available: walletBalance,
            credits_used: creditsUsed
          }
        });
      }

      let gatewayPaymentResult: any = null;
      let gatewayTransactionId: string | null = null;

      // Process gateway payment first (using remaining amount after credit deduction)
      if (remainingGatewayAmount > 0) {
        if (payment_method === 'moyasar') {
          const moyasarResult = await moyasarService.createPayment({
            amount: moyasarService.convertToHalalas(remainingGatewayAmount),
            currency: 'SAR',
            description: `Hybrid payment for order ${order_id} (Gateway portion)`,
            source: payment_source,
            callback_url: `${process.env.API_BASE_URL}/api/v2/webhooks/moyasar`,
            metadata: {
              order_id,
              user_id: userId,
              payment_type: 'hybrid',
              wallet_amount: remainingWalletAmount.toString(),
              credits_used: creditsUsed.toString()
            }
          });

          if (!moyasarResult.success) {
            return res.status(400).json({
              success: false,
              message: bilingual.getErrorMessage('payment.gateway_failed', userLanguage),
              error: moyasarResult.error
            });
          }

          gatewayPaymentResult = moyasarResult.payment;
          gatewayTransactionId = moyasarResult.payment?.id || null;

        } else if (payment_method === 'tabby') {
          // Implement Tabby BNPL for hybrid payment
          const user = await this.storage.getUser(userId);
          const addresses = await this.storage.getUserAddresses(userId);
          const address = addresses.find(addr => addr.id === order.addressId);

          if (!user || !address) {
            return res.status(400).json({
              success: false,
              message: bilingual.getErrorMessage('payment.missing_user_data', userLanguage)
            });
          }

          const tabbyResult = await tabbyService.createCheckout({
            payment: {
              amount: remainingGatewayAmount.toString(),
              currency: 'SAR',
              buyer: {
                phone: user.phone || '',
                email: user.email || '',
                name: user.name
              },
              order: {
                reference_id: order_id,
                items: [{
                  title: 'Cleaning Service (Gateway portion)',
                  description: 'Part of hybrid payment',
                  quantity: 1,
                  unit_price: remainingGatewayAmount.toString(),
                  category: 'Services'
                }],
                tax_amount: '0.00',
                shipping_amount: '0.00',
                discount_amount: creditsUsed.toString()
              }
            },
            lang: userLanguage as 'ar' | 'en',
            merchant_code: 'cleanserve_sa',
            merchant_urls: tabbyService.getMerchantUrls(
              process.env.API_BASE_URL || '',
              order_id
            )
          });

          if (!tabbyResult.success) {
            return res.status(400).json({
              success: false,
              message: bilingual.getErrorMessage('payment.gateway_failed', userLanguage),
              error: tabbyResult.error
            });
          }

          gatewayPaymentResult = tabbyResult.checkout;
          gatewayTransactionId = tabbyResult.checkout?.payment.id || null;
        }
      }

      const result = await PaymentTransactions.processHybridPayment({
        orderId: order_id,
        userId,
        totalAmount: total_amount,
        walletAmount: remainingWalletAmount,
        gatewayAmount: remainingGatewayAmount,
        paymentMethod: payment_method,
        gatewayTransactionId,
        gatewayResponse: gatewayPaymentResult
      });

      // Create audit log
      await this.storage.createPaymentAuditLog({
        paymentId: result.payment.id,
        action: 'hybrid_payment_created',
        oldStatus: null,
        newStatus: result.payment.status,
        amount: total_amount.toString(),
        details: {
          credits_used: creditsUsed,
          wallet_amount: remainingWalletAmount,
          gateway_amount: remainingGatewayAmount,
          gateway_method: payment_method,
          gateway_transaction_id: gatewayTransactionId,
          wallet_transaction_id: result.walletTransaction?.id,
          credit_transaction_id: creditTransaction?.id
        },
        userId
      });

      const responseData: any = {
        payment_id: result.payment.id,
        order_id: order_id,
        total_amount: total_amount,
        credits_used: creditsUsed,
        wallet_amount: remainingWalletAmount,
        gateway_amount: remainingGatewayAmount,
        currency: 'SAR',
        status: result.payment.status,
        wallet_transaction_id: result.walletTransaction?.id,
        credit_transaction_id: creditTransaction?.id || null,
        new_wallet_balance: result.newBalance,
        created_at: result.payment.createdAt
      };

      // Add gateway-specific response data
      if (gatewayPaymentResult && payment_method === 'moyasar') {
        responseData.moyasar = {
          payment_id: gatewayPaymentResult.id,
          status: gatewayPaymentResult.status
        };
      } else if (gatewayPaymentResult && payment_method === 'tabby') {
        responseData.tabby = {
          payment_id: gatewayPaymentResult.payment.id,
          checkout_url: gatewayPaymentResult.configuration.available_products.installments[0]?.web_url
        };
      }

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('payment.hybrid_created', userLanguage),
        data: responseData
      });

    } catch (error) {
      console.error('Hybrid payment error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async createMoyasarPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const { order_id, payment_source } = req.body;

      if (!order_id || !payment_source) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_payment_data', userLanguage)
        });
      }

      // Verify order
      const order = await this.storage.getOrder(order_id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      const amount = parseFloat(order.totalAmount);

      // Create Moyasar payment
      const moyasarResult = await moyasarService.createPayment({
        amount: moyasarService.convertToHalalas(amount),
        currency: 'SAR',
        description: `Payment for order ${order_id}`,
        source: payment_source,
        callback_url: `${process.env.API_BASE_URL}/api/v2/webhooks/moyasar`,
        metadata: {
          order_id,
          user_id: userId,
          payment_type: 'full'
        }
      });

      if (!moyasarResult.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.creation_failed', userLanguage),
          error: moyasarResult.error
        });
      }

      // Create payment record
      const payment = await this.storage.createPayment({
        orderId: order_id,
        userId,
        method: 'moyasar',
        provider: 'moyasar',
        providerTransactionId: moyasarResult.payment?.id || null,
        amount: amount.toString(),
        walletAmount: '0.00',
        gatewayAmount: amount.toString(),
        currency: 'SAR',
        status: moyasarResult.payment?.status === 'paid' ? 'paid' : 'pending',
        providerResponse: moyasarResult.payment
      });

      // Update order payment status if paid immediately
      if (moyasarResult.payment?.status === 'paid') {
        await this.storage.updateOrder(order_id, {
          paymentStatus: 'paid'
        });
      }

      // Create audit log
      await this.storage.createPaymentAuditLog({
        paymentId: payment.id,
        action: 'moyasar_payment_created',
        oldStatus: null,
        newStatus: payment.status,
        amount: amount.toString(),
        details: {
          moyasar_payment_id: moyasarResult.payment?.id,
          moyasar_status: moyasarResult.payment?.status
        },
        userId
      });

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('payment.created_successfully', userLanguage),
        data: {
          payment_id: payment.id,
          order_id: order_id,
          amount: amount,
          currency: 'SAR',
          status: payment.status,
          moyasar: {
            payment_id: moyasarResult.payment?.id,
            status: moyasarResult.payment?.status,
            fee: moyasarResult.payment?.fee
          },
          created_at: payment.createdAt
        }
      });

    } catch (error) {
      console.error('Create Moyasar payment error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async verifyMoyasarPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';
      const paymentId = req.query.payment_id as string;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      if (!paymentId) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.payment_id_required', userLanguage)
        });
      }

      // Fetch payment from Moyasar
      const moyasarResult = await moyasarService.fetchPayment(paymentId);
      
      if (!moyasarResult.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.verification_failed', userLanguage),
          error: moyasarResult.error
        });
      }

      // Find local payment record
      const payments = await this.storage.getOrderPayments(moyasarResult.payment?.metadata?.order_id);
      const payment = payments.find(p => p.providerTransactionId === paymentId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('payment.not_found', userLanguage)
        });
      }

      // Verify payment belongs to user
      if (payment.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      // Update local payment status
      const newStatus = moyasarResult.payment?.status === 'paid' ? 'paid' : 'failed';
      
      await this.storage.updatePayment(payment.id, {
        status: newStatus,
        providerResponse: moyasarResult.payment
      });

      // Update order payment status
      if (newStatus === 'paid') {
        await this.storage.updateOrder(payment.orderId, {
          paymentStatus: 'paid'
        });
      }

      // Create audit log
      await this.storage.createPaymentAuditLog({
        paymentId: payment.id,
        action: 'payment_verified',
        oldStatus: payment.status,
        newStatus: newStatus,
        amount: payment.amount,
        details: {
          moyasar_status: moyasarResult.payment?.status,
          verification_method: 'manual'
        },
        userId
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('payment.verification_successful', userLanguage),
        data: {
          payment_id: payment.id,
          order_id: payment.orderId,
          status: newStatus,
          amount: parseFloat(payment.amount),
          currency: payment.currency,
          moyasar: {
            payment_id: moyasarResult.payment?.id,
            status: moyasarResult.payment?.status,
            amount: moyasarResult.payment?.amount,
            fee: moyasarResult.payment?.fee
          },
          verified_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Verify Moyasar payment error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async refundMoyasarPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!['admin'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.admin_only', userLanguage)
        });
      }

      const { payment_id, amount, reason } = req.body;

      if (!payment_id) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.payment_id_required', userLanguage)
        });
      }

      // Get payment record
      const payment = await this.storage.getPayment(payment_id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('payment.not_found', userLanguage)
        });
      }

      if (payment.status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.cannot_refund', userLanguage)
        });
      }

      // Process refund with Moyasar
      const refundAmount = amount || parseFloat(payment.amount);
      
      const moyasarResult = await moyasarService.refundPayment(
        payment.providerTransactionId!,
        {
          amount: amount ? moyasarService.convertToHalalas(amount) : undefined,
          description: reason || 'Order refund',
          metadata: { refund_reason: reason }
        }
      );

      if (!moyasarResult.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.refund_failed', userLanguage),
          error: moyasarResult.error
        });
      }

      // Update payment record
      const newRefundAmount = parseFloat(payment.refundAmount || '0') + refundAmount;
      const isFullRefund = newRefundAmount >= parseFloat(payment.amount);

      await this.storage.updatePayment(payment_id, {
        status: isFullRefund ? 'refunded' : 'partial_refund',
        refundAmount: newRefundAmount.toString(),
        refundReason: reason || 'Admin refund'
      });

      // Create audit log
      await this.storage.createPaymentAuditLog({
        paymentId: payment_id,
        action: 'refund_processed',
        oldStatus: payment.status,
        newStatus: isFullRefund ? 'refunded' : 'partial_refund',
        amount: refundAmount.toString(),
        details: {
          refund_reason: reason,
          moyasar_refund_id: moyasarResult.payment?.id,
          refund_type: isFullRefund ? 'full' : 'partial'
        },
        userId: req.user?.id
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('payment.refund_successful', userLanguage),
        data: {
          payment_id: payment_id,
          order_id: payment.orderId,
          refund_amount: refundAmount,
          total_refunded: newRefundAmount,
          currency: payment.currency,
          status: isFullRefund ? 'refunded' : 'partial_refund',
          moyasar: {
            refund_id: moyasarResult.payment?.id,
            refunded: moyasarResult.payment?.refunded
          },
          refunded_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Refund Moyasar payment error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async createTabbyCheckout(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const { order_id } = req.body;

      if (!order_id) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.order_id_required', userLanguage)
        });
      }

      // Verify order
      const order = await this.storage.getOrder(order_id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      const amount = parseFloat(order.totalAmount);

      // Check if amount is eligible for BNPL
      if (!tabbyService.isEligibleForBNPL(amount)) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.not_eligible_bnpl', userLanguage),
          data: { amount, min_amount: 100, max_amount: 10000 }
        });
      }

      // Get user and address details
      const user = await this.storage.getUser(userId);
      const addresses = await this.storage.getUserAddresses(userId);
      const address = addresses.find(addr => addr.id === order.addressId);

      if (!user || !address) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.missing_user_data', userLanguage)
        });
      }

      // Create Tabby checkout
      const tabbyResult = await tabbyService.createCheckout({
        payment: {
          amount: amount.toString(),
          currency: 'SAR',
          buyer: {
            phone: user.phone || '',
            email: user.email || '',
            name: user.name
          },
          order: {
            reference_id: order_id,
            items: [{
              title: 'Cleaning Service',
              description: 'Professional cleaning service',
              quantity: 1,
              unit_price: amount.toString(),
              category: 'Services'
            }],
            tax_amount: order.vatAmount,
            shipping_amount: '0.00',
            discount_amount: order.discount
          }
        },
        lang: userLanguage as 'ar' | 'en',
        merchant_code: 'cleanserve_sa',
        merchant_urls: tabbyService.getMerchantUrls(
          process.env.API_BASE_URL || '',
          order_id
        )
      });

      if (!tabbyResult.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.tabby_checkout_failed', userLanguage),
          error: tabbyResult.error
        });
      }

      // Create payment record
      const payment = await this.storage.createPayment({
        orderId: order_id,
        userId,
        method: 'tabby',
        provider: 'tabby',
        providerTransactionId: tabbyResult.checkout?.payment.id || null,
        amount: amount.toString(),
        walletAmount: '0.00',
        gatewayAmount: amount.toString(),
        currency: 'SAR',
        status: 'pending',
        providerResponse: tabbyResult.checkout
      });

      // Create audit log
      await this.storage.createPaymentAuditLog({
        paymentId: payment.id,
        action: 'tabby_checkout_created',
        oldStatus: null,
        newStatus: 'pending',
        amount: amount.toString(),
        details: {
          tabby_payment_id: tabbyResult.checkout?.payment.id,
          checkout_url: tabbyResult.checkout?.configuration.available_products.installments[0]?.web_url
        },
        userId
      });

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('payment.tabby_checkout_created', userLanguage),
        data: {
          payment_id: payment.id,
          order_id: order_id,
          amount: amount,
          currency: 'SAR',
          status: 'pending',
          tabby: {
            payment_id: tabbyResult.checkout?.payment.id,
            checkout_url: tabbyResult.checkout?.configuration.available_products.installments[0]?.web_url,
            installments: tabbyService.calculateInstallments(amount)
          },
          created_at: payment.createdAt
        }
      });

    } catch (error) {
      console.error('Create Tabby checkout error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async captureTabbyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!['admin', 'technician'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.insufficient_permissions', userLanguage)
        });
      }

      const { payment_id, amount } = req.body;

      if (!payment_id) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.payment_id_required', userLanguage)
        });
      }

      // Get payment record
      const payment = await this.storage.getPayment(payment_id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('payment.not_found', userLanguage)
        });
      }

      if (payment.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.cannot_capture', userLanguage)
        });
      }

      // Capture with Tabby
      const captureAmount = amount || parseFloat(payment.amount);
      
      const tabbyResult = await tabbyService.capturePayment(
        payment.providerTransactionId!,
        {
          amount: captureAmount.toString(),
          reference_id: `capture_${Date.now()}`
        }
      );

      if (!tabbyResult.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.capture_failed', userLanguage),
          error: tabbyResult.error
        });
      }

      // Update payment record
      await this.storage.updatePayment(payment_id, {
        status: 'paid',
        providerResponse: tabbyResult.payment
      });

      // Update order payment status
      await this.storage.updateOrder(payment.orderId, {
        paymentStatus: 'paid'
      });

      // Create audit log
      await this.storage.createPaymentAuditLog({
        paymentId: payment_id,
        action: 'payment_captured',
        oldStatus: payment.status,
        newStatus: 'paid',
        amount: captureAmount.toString(),
        details: {
          tabby_capture_amount: captureAmount,
          capture_method: 'manual'
        },
        userId: req.user?.id
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('payment.capture_successful', userLanguage),
        data: {
          payment_id: payment_id,
          order_id: payment.orderId,
          captured_amount: captureAmount,
          currency: payment.currency,
          status: 'paid',
          tabby: {
            payment_id: tabbyResult.payment?.id,
            status: tabbyResult.payment?.status
          },
          captured_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Capture Tabby payment error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async closeTabbyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!['admin'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.admin_only', userLanguage)
        });
      }

      const { payment_id } = req.body;

      if (!payment_id) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.payment_id_required', userLanguage)
        });
      }

      // Get payment record
      const payment = await this.storage.getPayment(payment_id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('payment.not_found', userLanguage)
        });
      }

      // Close with Tabby
      const tabbyResult = await tabbyService.closePayment(payment.providerTransactionId!);

      if (!tabbyResult.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.close_failed', userLanguage),
          error: tabbyResult.error
        });
      }

      // Update payment record
      await this.storage.updatePayment(payment_id, {
        status: 'cancelled',
        providerResponse: tabbyResult.payment
      });

      // Create audit log
      await this.storage.createPaymentAuditLog({
        paymentId: payment_id,
        action: 'payment_closed',
        oldStatus: payment.status,
        newStatus: 'cancelled',
        amount: payment.amount,
        details: {
          close_reason: 'admin_action',
          tabby_status: tabbyResult.payment?.status
        },
        userId: req.user?.id
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('payment.close_successful', userLanguage),
        data: {
          payment_id: payment_id,
          order_id: payment.orderId,
          status: 'cancelled',
          tabby: {
            payment_id: tabbyResult.payment?.id,
            status: tabbyResult.payment?.status
          },
          closed_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Close Tabby payment error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async refundTabbyPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!['admin'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.admin_only', userLanguage)
        });
      }

      const { payment_id, amount, reason } = req.body;

      if (!payment_id) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.payment_id_required', userLanguage)
        });
      }

      // Get payment record
      const payment = await this.storage.getPayment(payment_id);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('payment.not_found', userLanguage)
        });
      }

      if (payment.status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.cannot_refund', userLanguage)
        });
      }

      // Process refund with Tabby
      const refundAmount = amount || parseFloat(payment.amount);
      
      const tabbyResult = await tabbyService.refundPayment(
        payment.providerTransactionId!,
        {
          amount: refundAmount.toString(),
          reason: reason || 'Order refund'
        }
      );

      if (!tabbyResult.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('payment.refund_failed', userLanguage),
          error: tabbyResult.error
        });
      }

      // Update payment record
      const newRefundAmount = parseFloat(payment.refundAmount || '0') + refundAmount;
      const isFullRefund = newRefundAmount >= parseFloat(payment.amount);

      await this.storage.updatePayment(payment_id, {
        status: isFullRefund ? 'refunded' : 'partial_refund',
        refundAmount: newRefundAmount.toString(),
        refundReason: reason || 'Admin refund'
      });

      // Create audit log
      await this.storage.createPaymentAuditLog({
        paymentId: payment_id,
        action: 'refund_processed',
        oldStatus: payment.status,
        newStatus: isFullRefund ? 'refunded' : 'partial_refund',
        amount: refundAmount.toString(),
        details: {
          refund_reason: reason,
          tabby_refund_amount: refundAmount,
          refund_type: isFullRefund ? 'full' : 'partial'
        },
        userId: req.user?.id
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('payment.refund_successful', userLanguage),
        data: {
          payment_id: payment_id,
          order_id: payment.orderId,
          refund_amount: refundAmount,
          total_refunded: newRefundAmount,
          currency: payment.currency,
          status: isFullRefund ? 'refunded' : 'partial_refund',
          tabby: {
            payment_id: tabbyResult.payment?.id,
            status: tabbyResult.payment?.status
          },
          refunded_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Refund Tabby payment error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }
}
