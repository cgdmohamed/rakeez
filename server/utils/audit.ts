import { storage } from '../storage';

interface AuditLogData {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Create an audit log entry
 */
export const auditLog = async (data: AuditLogData): Promise<void> => {
  try {
    await storage.createAuditLog({
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
      newValues: data.newValues ? JSON.stringify(data.newValues) : null,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error as audit logging shouldn't break the main flow
  }
};

/**
 * Audit middleware for Express routes
 */
export const auditMiddleware = (action: string, resourceType: string) => {
  return (req: any, res: any, next: any) => {
    const originalSend = res.send;
    const originalJson = res.json;

    // Override res.send to capture response
    res.send = function(body: any) {
      // Log the audit trail
      auditLog({
        userId: req.user?.id,
        action,
        resourceType,
        resourceId: req.params.id,
        newValues: req.body,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        metadata: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
        }
      });

      return originalSend.call(this, body);
    };

    // Override res.json to capture response
    res.json = function(body: any) {
      // Log the audit trail
      auditLog({
        userId: req.user?.id,
        action,
        resourceType,
        resourceId: req.params.id,
        newValues: req.body,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        metadata: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          response: body,
        }
      });

      return originalJson.call(this, body);
    };

    next();
  };
};

/**
 * Specific audit functions for common actions
 */
export const auditActions = {
  // Authentication
  userRegistered: (userId: string, userData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'user_registered',
      resourceType: 'user',
      resourceId: userId,
      newValues: userData,
      ipAddress,
      userAgent,
    }),

  userLogin: (userId: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'user_login',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
    }),

  userLogout: (userId: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'user_logout',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
    }),

  passwordChanged: (userId: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'password_changed',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
    }),

  // Profile Management
  profileUpdated: (userId: string, oldData: any, newData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'profile_updated',
      resourceType: 'user',
      resourceId: userId,
      oldValues: oldData,
      newValues: newData,
      ipAddress,
      userAgent,
    }),

  // Booking Operations
  bookingCreated: (userId: string, bookingId: string, bookingData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'booking_created',
      resourceType: 'booking',
      resourceId: bookingId,
      newValues: bookingData,
      ipAddress,
      userAgent,
    }),

  bookingUpdated: (userId: string, bookingId: string, oldData: any, newData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'booking_updated',
      resourceType: 'booking',
      resourceId: bookingId,
      oldValues: oldData,
      newValues: newData,
      ipAddress,
      userAgent,
    }),

  bookingStatusChanged: (userId: string, bookingId: string, oldStatus: string, newStatus: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'booking_status_changed',
      resourceType: 'booking',
      resourceId: bookingId,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      ipAddress,
      userAgent,
    }),

  bookingCancelled: (userId: string, bookingId: string, reason?: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'booking_cancelled',
      resourceType: 'booking',
      resourceId: bookingId,
      newValues: { cancelled: true, reason },
      ipAddress,
      userAgent,
    }),

  // Payment Operations
  paymentCreated: (userId: string, paymentId: string, paymentData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'payment_created',
      resourceType: 'payment',
      resourceId: paymentId,
      newValues: paymentData,
      ipAddress,
      userAgent,
    }),

  paymentStatusChanged: (userId: string, paymentId: string, oldStatus: string, newStatus: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'payment_status_changed',
      resourceType: 'payment',
      resourceId: paymentId,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      ipAddress,
      userAgent,
    }),

  paymentRefunded: (userId: string, paymentId: string, amount: number, reason?: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'payment_refunded',
      resourceType: 'payment',
      resourceId: paymentId,
      newValues: { refunded_amount: amount, reason },
      ipAddress,
      userAgent,
    }),

  // Wallet Operations
  walletTopUp: (userId: string, amount: number, method: string, transactionId: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'wallet_topup',
      resourceType: 'wallet',
      resourceId: userId,
      newValues: { amount, method, transaction_id: transactionId },
      ipAddress,
      userAgent,
    }),

  walletDeduction: (userId: string, amount: number, reason: string, referenceId?: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'wallet_deduction',
      resourceType: 'wallet',
      resourceId: userId,
      newValues: { amount, reason, reference_id: referenceId },
      ipAddress,
      userAgent,
    }),

  // Quotation Operations
  quotationCreated: (userId: string, quotationId: string, quotationData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'quotation_created',
      resourceType: 'quotation',
      resourceId: quotationId,
      newValues: quotationData,
      ipAddress,
      userAgent,
    }),

  quotationApproved: (userId: string, quotationId: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'quotation_approved',
      resourceType: 'quotation',
      resourceId: quotationId,
      newValues: { approved: true },
      ipAddress,
      userAgent,
    }),

  quotationRejected: (userId: string, quotationId: string, reason?: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'quotation_rejected',
      resourceType: 'quotation',
      resourceId: quotationId,
      newValues: { rejected: true, reason },
      ipAddress,
      userAgent,
    }),

  // Referral Operations
  referralCreated: (userId: string, referralCode: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'referral_created',
      resourceType: 'referral',
      resourceId: referralCode,
      newValues: { referral_code: referralCode },
      ipAddress,
      userAgent,
    }),

  referralRewardDistributed: (inviterId: string, inviteeId: string, inviterReward: number, inviteeReward: number, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId: inviterId,
      action: 'referral_reward_distributed',
      resourceType: 'referral',
      newValues: { 
        inviter_id: inviterId, 
        invitee_id: inviteeId, 
        inviter_reward: inviterReward, 
        invitee_reward: inviteeReward 
      },
      ipAddress,
      userAgent,
    }),

  // Administrative Actions
  adminServiceCreated: (adminId: string, serviceId: string, serviceData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId: adminId,
      action: 'admin_service_created',
      resourceType: 'service',
      resourceId: serviceId,
      newValues: serviceData,
      ipAddress,
      userAgent,
    }),

  adminServiceUpdated: (adminId: string, serviceId: string, oldData: any, newData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId: adminId,
      action: 'admin_service_updated',
      resourceType: 'service',
      resourceId: serviceId,
      oldValues: oldData,
      newValues: newData,
      ipAddress,
      userAgent,
    }),

  adminUserRoleChanged: (adminId: string, targetUserId: string, oldRole: string, newRole: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId: adminId,
      action: 'admin_user_role_changed',
      resourceType: 'user',
      resourceId: targetUserId,
      oldValues: { role: oldRole },
      newValues: { role: newRole },
      ipAddress,
      userAgent,
    }),

  // Support Operations
  supportTicketCreated: (userId: string, ticketId: string, ticketData: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'support_ticket_created',
      resourceType: 'support_ticket',
      resourceId: ticketId,
      newValues: ticketData,
      ipAddress,
      userAgent,
    }),

  supportTicketStatusChanged: (userId: string, ticketId: string, oldStatus: string, newStatus: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'support_ticket_status_changed',
      resourceType: 'support_ticket',
      resourceId: ticketId,
      oldValues: { status: oldStatus },
      newValues: { status: newStatus },
      ipAddress,
      userAgent,
    }),

  // Security Events
  suspiciousActivity: (userId: string, activityType: string, details: any, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'suspicious_activity',
      resourceType: 'security',
      newValues: { activity_type: activityType, details },
      ipAddress,
      userAgent,
    }),

  failedLoginAttempt: (identifier: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      action: 'failed_login_attempt',
      resourceType: 'security',
      newValues: { identifier },
      ipAddress,
      userAgent,
    }),

  accountLocked: (userId: string, reason: string, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'account_locked',
      resourceType: 'security',
      resourceId: userId,
      newValues: { reason },
      ipAddress,
      userAgent,
    }),

  // Data Export/Import
  dataExported: (userId: string, dataType: string, recordCount: number, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'data_exported',
      resourceType: 'data',
      newValues: { data_type: dataType, record_count: recordCount },
      ipAddress,
      userAgent,
    }),

  dataImported: (userId: string, dataType: string, recordCount: number, ipAddress?: string, userAgent?: string) =>
    auditLog({
      userId,
      action: 'data_imported',
      resourceType: 'data',
      newValues: { data_type: dataType, record_count: recordCount },
      ipAddress,
      userAgent,
    }),
};

/**
 * Get audit logs with filtering and pagination
 */
export const getAuditLogs = async (filters: {
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<any[]> => {
  return await storage.getAuditLogs(
    filters.resourceType,
    filters.resourceId,
    filters.limit
  );
};

/**
 * Generate audit report
 */
export const generateAuditReport = async (filters: {
  startDate: Date;
  endDate: Date;
  userId?: string;
  resourceType?: string;
}): Promise<{
  total_actions: number;
  actions_by_type: Record<string, number>;
  actions_by_user: Record<string, number>;
  security_events: number;
  data_changes: number;
}> => {
  try {
    const logs = await storage.getAuditLogs(filters.resourceType, undefined, 10000);
    
    const report = {
      total_actions: logs.length,
      actions_by_type: {} as Record<string, number>,
      actions_by_user: {} as Record<string, number>,
      security_events: 0,
      data_changes: 0,
    };

    logs.forEach(log => {
      // Count by action type
      report.actions_by_type[log.action] = (report.actions_by_type[log.action] || 0) + 1;
      
      // Count by user
      if (log.userId) {
        report.actions_by_user[log.userId] = (report.actions_by_user[log.userId] || 0) + 1;
      }
      
      // Count security events
      if (log.action.includes('security') || log.action.includes('login') || log.action.includes('failed')) {
        report.security_events++;
      }
      
      // Count data changes
      if (log.action.includes('created') || log.action.includes('updated') || log.action.includes('deleted')) {
        report.data_changes++;
      }
    });

    return report;
  } catch (error) {
    console.error('Failed to generate audit report:', error);
    throw error;
  }
};

export default auditLog;
