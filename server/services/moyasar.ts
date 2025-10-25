import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';

interface MoyasarPaymentRequest {
  amount: number; // Amount in halalas (1 SAR = 100 halalas)
  currency: string;
  description: string;
  source: {
    type: string;
    name?: string;
    number?: string;
    cvc?: string;
    month?: string;
    year?: string;
  };
  callback_url?: string;
  metadata?: Record<string, any>;
}

interface MoyasarPaymentResponse {
  id: string;
  status: string;
  amount: number;
  fee: number;
  currency: string;
  refunded: number;
  captured: number;
  description: string;
  created_at: string;
  source: {
    type: string;
    company?: string;
    number?: string;
    message?: string;
  };
  metadata?: Record<string, any>;
}

interface MoyasarRefundRequest {
  amount?: number; // Partial refund amount in halalas
  reason?: string;
}

class MoyasarService {
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    if (!process.env.MOYASAR_SECRET_KEY) {
      throw new Error('MOYASAR_SECRET_KEY environment variable is required');
    }
    this.secretKey = process.env.MOYASAR_SECRET_KEY;
    this.baseUrl = process.env.MOYASAR_API_URL || 'https://api.moyasar.com';
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a payment charge
   */
  async createPayment(paymentData: MoyasarPaymentRequest): Promise<{
    success: boolean;
    payment?: MoyasarPaymentResponse;
    payment_id?: string;
    error?: string;
  }> {
    try {
      const response: AxiosResponse<MoyasarPaymentResponse> = await axios.post(
        `${this.baseUrl}/v1/payments`,
        paymentData,
        {
          headers: this.getAuthHeaders(),
        }
      );

      console.log('Moyasar payment created:', response.data.id);
      return {
        success: true,
        payment: response.data,
        payment_id: response.data.id,
      };
    } catch (error: any) {
      console.error('Moyasar payment creation failed:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Retrieve a payment by ID
   */
  async getPayment(paymentId: string): Promise<MoyasarPaymentResponse> {
    try {
      const response: AxiosResponse<MoyasarPaymentResponse> = await axios.get(
        `${this.baseUrl}/v1/payments/${paymentId}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch Moyasar payment:', error.response?.data || error.message);
      throw new Error(`Payment fetch failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentId: string): Promise<MoyasarPaymentResponse> {
    return await this.getPayment(paymentId);
  }

  /**
   * Refund a payment (full or partial)
   */
  async refundPayment(paymentId: string, refundData: MoyasarRefundRequest = {}): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payments/${paymentId}/refund`,
        refundData,
        {
          headers: this.getAuthHeaders(),
        }
      );

      console.log('Moyasar refund processed:', paymentId);
      return response.data;
    } catch (error: any) {
      console.error('Moyasar refund failed:', error.response?.data || error.message);
      throw new Error(`Refund failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment(paymentId: string, captureAmount?: number): Promise<any> {
    try {
      const captureData = captureAmount ? { amount: captureAmount } : {};
      
      const response = await axios.post(
        `${this.baseUrl}/v1/payments/${paymentId}/capture`,
        captureData,
        {
          headers: this.getAuthHeaders(),
        }
      );

      console.log('Moyasar payment captured:', paymentId);
      return response.data;
    } catch (error: any) {
      console.error('Moyasar capture failed:', error.response?.data || error.message);
      throw new Error(`Capture failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Void an authorized payment
   */
  async voidPayment(paymentId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payments/${paymentId}/void`,
        {},
        {
          headers: this.getAuthHeaders(),
        }
      );

      console.log('Moyasar payment voided:', paymentId);
      return response.data;
    } catch (error: any) {
      console.error('Moyasar void failed:', error.response?.data || error.message);
      throw new Error(`Void failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.MOYASAR_WEBHOOK_SECRET;
      if (!webhookSecret) {
        console.error('MOYASAR_WEBHOOK_SECRET not configured');
        return false;
      }
      
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Moyasar webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * List payments with optional filters
   */
  async listPayments(options: {
    created?: { gte?: string; lte?: string };
    status?: string;
    limit?: number;
    starting_after?: string;
  } = {}): Promise<any> {
    try {
      const params = new URLSearchParams();
      
      if (options.created?.gte) params.append('created[gte]', options.created.gte);
      if (options.created?.lte) params.append('created[lte]', options.created.lte);
      if (options.status) params.append('status', options.status);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.starting_after) params.append('starting_after', options.starting_after);

      const response = await axios.get(
        `${this.baseUrl}/v1/payments?${params.toString()}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to list Moyasar payments:', error.response?.data || error.message);
      throw new Error(`List payments failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create payment form for frontend integration
   */
  createPaymentForm(paymentData: {
    amount: number;
    description: string;
    callback_url: string;
    metadata?: Record<string, any>;
  }): {
    publishable_key: string;
    amount: number;
    currency: string;
    description: string;
    callback_url: string;
    metadata?: Record<string, any>;
  } {
    const publishableKey = process.env.MOYASAR_PUBLISHABLE_KEY || process.env.MOYASAR_PUBLIC_KEY;
    if (!publishableKey) {
      throw new Error('MOYASAR_PUBLISHABLE_KEY or MOYASAR_PUBLIC_KEY environment variable is required');
    }
    
    return {
      publishable_key: publishableKey,
      amount: paymentData.amount,
      currency: 'SAR',
      description: paymentData.description,
      callback_url: paymentData.callback_url,
      metadata: paymentData.metadata,
    };
  }

  /**
   * Validate payment data before submission
   */
  validatePaymentData(paymentData: MoyasarPaymentRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate amount
    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (paymentData.amount < 100) { // Minimum 1 SAR
      errors.push('Amount must be at least 100 halalas (1 SAR)');
    }

    if (paymentData.amount > 10000000) { // Maximum 100,000 SAR
      errors.push('Amount must not exceed 10,000,000 halalas (100,000 SAR)');
    }

    // Validate currency
    if (!paymentData.currency) {
      errors.push('Currency is required');
    } else if (!['SAR', 'USD', 'AED'].includes(paymentData.currency)) {
      errors.push('Currency must be SAR, USD, or AED');
    }

    // Validate description
    if (!paymentData.description) {
      errors.push('Description is required');
    }

    // Validate source
    if (!paymentData.source || !paymentData.source.type) {
      errors.push('Payment source is required');
    }

    if (paymentData.source.type === 'creditcard') {
      if (!paymentData.source.number) errors.push('Card number is required');
      if (!paymentData.source.cvc) errors.push('CVC is required');
      if (!paymentData.source.month) errors.push('Expiry month is required');
      if (!paymentData.source.year) errors.push('Expiry year is required');
      if (!paymentData.source.name) errors.push('Cardholder name is required');

      // Validate expiry date
      if (paymentData.source.month && paymentData.source.year) {
        const month = parseInt(paymentData.source.month);
        const year = parseInt(paymentData.source.year);
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        if (month < 1 || month > 12) {
          errors.push('Expiry month must be between 1 and 12');
        }

        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          errors.push('Card has expired');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Format amount for display (halalas to SAR)
   */
  formatAmount(halalas: number): string {
    return (halalas / 100).toFixed(2);
  }

  /**
   * Convert SAR to halalas
   */
  sarToHalalas(sar: number): number {
    return Math.round(sar * 100);
  }

  /**
   * Convert halalas to SAR
   */
  halalasToSar(halalas: number): number {
    return halalas / 100;
  }

  /**
   * Map Moyasar status to internal status
   */
  mapStatusToInternal(moyasarStatus: string): string {
    const statusMap: Record<string, string> = {
      'initiated': 'pending',
      'paid': 'paid',
      'authorized': 'authorized',
      'captured': 'paid',
      'failed': 'failed',
      'voided': 'cancelled',
      'refunded': 'refunded',
    };

    return statusMap[moyasarStatus] || moyasarStatus;
  }

  /**
   * Get supported payment methods
   */
  getSupportedPaymentMethods(): string[] {
    return ['creditcard', 'debitcard', 'mada', 'applepay', 'stcpay'];
  }

  /**
   * Check if payment method is supported
   */
  isPaymentMethodSupported(method: string): boolean {
    return this.getSupportedPaymentMethods().includes(method);
  }
}

export const moyasarService = new MoyasarService();
