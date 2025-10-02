import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';

interface TabbyCheckoutRequest {
  payment: {
    amount: string;
    currency: string;
    buyer: {
      phone: string;
      email: string;
      name: string;
    };
    order: {
      reference_id: string;
      items: Array<{
        title: string;
        description?: string;
        quantity: number;
        unit_price: string;
        category: string;
      }>;
      tax_amount?: string;
      shipping_amount?: string;
      discount_amount?: string;
    };
  };
  lang: string;
  merchant_code: string;
  merchant_urls: {
    success: string;
    cancel: string;
    failure: string;
  };
}

interface TabbyPaymentResponse {
  status: string;
  payment: {
    id: string;
    status: string;
  };
  configuration: {
    available_products: {
      installments: Array<{
        web_url: string;
        id: string;
      }>;
    };
  };
}

interface TabbyCaptureRequest {
  amount: string;
  reference_id?: string;
  tax_amount?: string;
  shipping_amount?: string;
  discount_amount?: string;
  items?: Array<{
    title: string;
    description?: string;
    quantity: number;
    unit_price: string;
    category: string;
  }>;
}

interface TabbyRefundRequest {
  amount: string;
  reference_id?: string;
  reason?: string;
  items?: Array<{
    title: string;
    description?: string;
    quantity: number;
    unit_price: string;
    category: string;
  }>;
}

class TabbyService {
  private secretKey: string;
  private baseUrl: string;
  private merchantCode: string;

  constructor() {
    this.secretKey = process.env.TABBY_SECRET_KEY || 'sk_tabby_test_secret_key';
    this.baseUrl = process.env.TABBY_API_URL || 'https://api.tabby.ai';
    this.merchantCode = process.env.TABBY_MERCHANT_CODE || 'cleanserve_sa';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createCheckoutSession(checkoutData: TabbyCheckoutRequest): Promise<TabbyPaymentResponse> {
    try {
      const response: AxiosResponse<TabbyPaymentResponse> = await axios.post(
        `${this.baseUrl}/api/v2/checkout`,
        checkoutData,
        {
          headers: this.getHeaders(),
        }
      );

      console.log('Tabby checkout session created:', response.data.payment.id);
      return response.data;
    } catch (error: any) {
      console.error('Tabby checkout creation failed:', error.response?.data || error.message);
      throw new Error(`Checkout creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v2/payments/${paymentId}`,
        {
          headers: this.getHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch Tabby payment:', error.response?.data || error.message);
      throw new Error(`Payment fetch failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async capturePayment(paymentId: string, captureData: TabbyCaptureRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v2/payments/${paymentId}/captures`,
        captureData,
        {
          headers: this.getHeaders(),
        }
      );

      console.log('Tabby payment captured:', paymentId);
      return response.data;
    } catch (error: any) {
      console.error('Tabby capture failed:', error.response?.data || error.message);
      throw new Error(`Capture failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async refundPayment(paymentId: string, refundData: TabbyRefundRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v2/payments/${paymentId}/refunds`,
        refundData,
        {
          headers: this.getHeaders(),
        }
      );

      console.log('Tabby refund processed:', paymentId);
      return response.data;
    } catch (error: any) {
      console.error('Tabby refund failed:', error.response?.data || error.message);
      throw new Error(`Refund failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async closePayment(paymentId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v2/payments/${paymentId}/close`,
        {},
        {
          headers: this.getHeaders(),
        }
      );

      console.log('Tabby payment closed:', paymentId);
      return response.data;
    } catch (error: any) {
      console.error('Tabby close payment failed:', error.response?.data || error.message);
      throw new Error(`Close payment failed: ${error.response?.data?.message || error.message}`);
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const webhookSecret = process.env.TABBY_WEBHOOK_SECRET || 'tabby_webhook_secret';
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (error) {
      console.error('Tabby webhook signature verification failed:', error);
      return false;
    }
  }

  // Helper method to create checkout request from booking data
  createCheckoutFromBooking(
    bookingId: string,
    amount: number,
    buyer: { name: string; email: string; phone: string },
    items: Array<{
      title: string;
      description?: string;
      quantity: number;
      unit_price: number;
      category: string;
    }>,
    options: {
      tax_amount?: number;
      shipping_amount?: number;
      discount_amount?: number;
      language?: string;
    } = {}
  ): TabbyCheckoutRequest {
    const {
      tax_amount = 0,
      shipping_amount = 0,
      discount_amount = 0,
      language = 'ar'
    } = options;

    return {
      payment: {
        amount: amount.toFixed(2),
        currency: 'SAR',
        buyer,
        order: {
          reference_id: bookingId,
          items: items.map(item => ({
            ...item,
            unit_price: item.unit_price.toFixed(2),
          })),
          tax_amount: tax_amount.toFixed(2),
          shipping_amount: shipping_amount.toFixed(2),
          discount_amount: discount_amount.toFixed(2),
        },
      },
      lang: language,
      merchant_code: this.merchantCode,
      merchant_urls: {
        success: `${process.env.APP_URL || 'https://cleanserve.sa'}/payment/success`,
        cancel: `${process.env.APP_URL || 'https://cleanserve.sa'}/payment/cancel`,
        failure: `${process.env.APP_URL || 'https://cleanserve.sa'}/payment/failure`,
      },
    };
  }

  // Validate checkout data before sending to Tabby
  validateCheckoutData(checkoutData: TabbyCheckoutRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!checkoutData.payment.amount || parseFloat(checkoutData.payment.amount) <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!checkoutData.payment.buyer.email) {
      errors.push('Buyer email is required');
    }

    if (!checkoutData.payment.buyer.phone) {
      errors.push('Buyer phone is required');
    }

    if (!checkoutData.payment.order.reference_id) {
      errors.push('Order reference ID is required');
    }

    if (!checkoutData.payment.order.items || checkoutData.payment.order.items.length === 0) {
      errors.push('At least one order item is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Convert payment status from Tabby to internal status
  mapTabbyStatusToInternal(tabbyStatus: string): string {
    const statusMap: Record<string, string> = {
      'created': 'pending',
      'authorized': 'authorized',
      'captured': 'paid',
      'closed': 'cancelled',
      'rejected': 'failed',
      'refunded': 'refunded',
    };

    return statusMap[tabbyStatus] || tabbyStatus;
  }
}

export const tabbyService = new TabbyService();
