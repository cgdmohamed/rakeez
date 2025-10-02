import { storage } from '../storage';

interface AuditLogData {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

class AuditService {
  async log(auditData: AuditLogData): Promise<void> {
    try {
      await storage.createAuditLog({
        user_id: auditData.user_id,
        action: auditData.action,
        resource_type: auditData.resource_type,
        resource_id: auditData.resource_id,
        old_values: auditData.old_values,
        new_values: auditData.new_values,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
      });

      console.log(`Audit log created: ${auditData.action} on ${auditData.resource_type} by ${auditData.user_id}`);
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }

  // Specific audit methods for different actions
  async logUserRegistration(userId: string, userData: any, ipAddress?: string): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'user_registered',
      resource_type: 'user',
      resource_id: userId,
      new_values: {
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
        language: userData.language,
      },
      ip_address: ipAddress,
    });
  }

  async logUserLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'user_login',
      resource_type: 'user',
      resource_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  async logPasswordChange(userId: string, ipAddress?: string): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'password_changed',
      resource_type: 'user',
      resource_id: userId,
      ip_address: ipAddress,
    });
  }

  async logWalletTransaction(
    userId: string,
    transactionId: string,
    type: string,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    referenceId?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'wallet_transaction',
      resource_type: 'wallet_transaction',
      resource_id: transactionId,
      new_values: {
        type,
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        reference_id: referenceId,
      },
    });
  }

  async logBookingCreated(userId: string, bookingId: string, bookingData: any): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'booking_created',
      resource_type: 'booking',
      resource_id: bookingId,
      new_values: {
        service_category_id: bookingData.service_category_id,
        package_id: bookingData.package_id,
        scheduled_date: bookingData.scheduled_date,
        scheduled_time: bookingData.scheduled_time,
        total_amount: bookingData.total_amount,
      },
    });
  }

  async logBookingStatusChange(
    userId: string,
    bookingId: string,
    oldStatus: string,
    newStatus: string,
    changedBy?: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'booking_status_changed',
      resource_type: 'booking',
      resource_id: bookingId,
      old_values: { status: oldStatus },
      new_values: { status: newStatus, changed_by: changedBy },
    });
  }

  async logQuotationCreated(
    technicianId: string,
    quotationId: string,
    bookingId: string,
    quotationData: any
  ): Promise<void> {
    await this.log({
      user_id: technicianId,
      action: 'quotation_created',
      resource_type: 'quotation',
      resource_id: quotationId,
      new_values: {
        booking_id: bookingId,
        spare_parts: quotationData.spare_parts,
        total_cost: quotationData.total_cost,
      },
    });
  }

  async logQuotationApproval(
    userId: string,
    quotationId: string,
    action: 'approved' | 'rejected',
    bookingId: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: `quotation_${action}`,
      resource_type: 'quotation',
      resource_id: quotationId,
      new_values: {
        booking_id: bookingId,
        status: action,
        approved_by: userId,
      },
    });
  }

  async logPaymentCreated(
    userId: string,
    paymentId: string,
    paymentData: any
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'payment_created',
      resource_type: 'payment',
      resource_id: paymentId,
      new_values: {
        booking_id: paymentData.booking_id,
        gateway: paymentData.gateway,
        amount: paymentData.amount,
        wallet_amount: paymentData.wallet_amount,
        gateway_amount: paymentData.gateway_amount,
      },
    });
  }

  async logPaymentStatusChange(
    userId: string,
    paymentId: string,
    oldStatus: string,
    newStatus: string,
    gatewayResponse?: any
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'payment_status_changed',
      resource_type: 'payment',
      resource_id: paymentId,
      old_values: { status: oldStatus },
      new_values: { 
        status: newStatus,
        gateway_response: gatewayResponse,
      },
    });
  }

  async logRefundProcessed(
    userId: string,
    paymentId: string,
    refundAmount: number,
    reason: string,
    processedBy: string
  ): Promise<void> {
    await this.log({
      user_id: userId,
      action: 'refund_processed',
      resource_type: 'payment',
      resource_id: paymentId,
      new_values: {
        refund_amount: refundAmount,
        reason,
        processed_by: processedBy,
      },
    });
  }

  async logReferralRewardDistributed(
    inviterId: string,
    inviteeId: string,
    referralId: string,
    rewardAmount: number
  ): Promise<void> {
    await this.log({
      user_id: inviterId,
      action: 'referral_reward_distributed',
      resource_type: 'referral',
      resource_id: referralId,
      new_values: {
        invitee_id: inviteeId,
        reward_amount: rewardAmount,
      },
    });
  }

  async logAdminAction(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      user_id: adminId,
      action: `admin_${action}`,
      resource_type: resourceType,
      resource_id: resourceId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
    });
  }

  async logWebhookProcessed(
    provider: string,
    eventType: string,
    eventId: string,
    status: 'success' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      user_id: 'system',
      action: 'webhook_processed',
      resource_type: 'webhook_event',
      resource_id: eventId,
      new_values: {
        provider,
        event_type: eventType,
        status,
        error_message: errorMessage,
      },
    });
  }

  // Query audit logs for reporting
  async getUserAuditLogs(userId: string, limit: number = 100): Promise<any[]> {
    // This would be implemented in storage layer
    // For now, return empty array as placeholder
    return [];
  }

  async getResourceAuditLogs(resourceType: string, resourceId: string): Promise<any[]> {
    // This would be implemented in storage layer
    return [];
  }

  async getSystemAuditLogs(startDate: Date, endDate: Date): Promise<any[]> {
    // This would be implemented in storage layer for admin reporting
    return [];
  }
}

export const auditService = new AuditService();
