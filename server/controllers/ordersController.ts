import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { bilingual } from '../utils/bilingual';
import { reviewSchema, validateSchema } from '../middleware/validation';
import { pdfService } from '../services/pdf';
import { notificationService } from '../services/notifications';
import { twilioService } from '../services/twilio';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    language: string;
    role: string;
    phone?: string;
  };
}

export class OrdersController {
  constructor(private storage: IStorage) {}

  async getUserOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string;

      let orders = await this.storage.getUserOrders(userId, limit);

      // Filter by status if provided
      if (status) {
        orders = orders.filter(order => order.status === status);
      }

      // Get service details for each order
      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const service = await this.storage.getServiceCategory(order.serviceId);
          let packageDetails = null;
          
          if (order.packageId) {
            const packages = await this.storage.getServicePackages(order.serviceId);
            packageDetails = packages.find(pkg => pkg.id === order.packageId);
          }

          const serviceData = service?.name as any;
          const packageData = packageDetails?.name as any;

          return {
            id: order.id,
            status: order.status,
            service: {
              id: service?.id,
              name: serviceData?.[userLanguage] || serviceData?.en || 'Service'
            },
            package: packageDetails ? {
              id: packageDetails.id,
              name: packageData?.[userLanguage] || packageData?.en || 'Package',
              tier: packageDetails.tier
            } : null,
            scheduled_date: order.scheduledDate,
            scheduled_time: order.scheduledTime,
            total_amount: parseFloat(order.totalAmount),
            currency: order.currency,
            payment_status: order.paymentStatus,
            technician_id: order.technicianId,
            rating: order.rating,
            created_at: order.createdAt,
            updated_at: order.updatedAt
          };
        })
      );

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('orders.retrieved_successfully', userLanguage),
        data: {
          orders: ordersWithDetails,
          total_count: ordersWithDetails.length,
          has_more: orders.length === limit
        }
      });

    } catch (error) {
      console.error('Get user orders error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const orderId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const order = await this.storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      // Verify order belongs to user (unless admin/technician)
      if (order.userId !== userId && !['admin', 'technician'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      // Get detailed order information
      const service = await this.storage.getServiceCategory(order.serviceId);
      let packageDetails = null;
      let technicianDetails = null;
      let addressDetails = null;

      if (order.packageId) {
        const packages = await this.storage.getServicePackages(order.serviceId);
        packageDetails = packages.find(pkg => pkg.id === order.packageId);
      }

      if (order.technicianId) {
        technicianDetails = await this.storage.getUser(order.technicianId);
      }

      if (order.addressId) {
        const addresses = await this.storage.getUserAddresses(order.userId);
        addressDetails = addresses.find(addr => addr.id === order.addressId);
      }

      // Get quotations, payments, and status logs
      const quotations = await this.storage.getOrderQuotations(orderId);
      const payments = await this.storage.getOrderPayments(orderId);
      const statusLogs = await this.storage.getOrderStatusLogs(orderId);

      const serviceData = service?.name as any;
      const packageData = packageDetails?.name as any;

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('orders.retrieved_successfully', userLanguage),
        data: {
          id: order.id,
          status: order.status,
          service: service ? {
            id: service.id,
            name: serviceData?.[userLanguage] || serviceData?.en || 'Service',
            duration_minutes: service.durationMinutes
          } : null,
          package: packageDetails ? {
            id: packageDetails.id,
            name: packageData?.[userLanguage] || packageData?.en || 'Package',
            tier: packageDetails.tier
          } : null,
          address: addressDetails ? {
            title: addressDetails.title,
            address: userLanguage === 'ar' ? addressDetails.addressAr || addressDetails.address : addressDetails.address,
            city: addressDetails.city,
            district: addressDetails.district
          } : null,
          technician: technicianDetails ? {
            id: technicianDetails.id,
            name: userLanguage === 'ar' ? technicianDetails.nameAr || technicianDetails.name : technicianDetails.name,
            phone: technicianDetails.phone
          } : null,
          scheduled_date: order.scheduledDate,
          scheduled_time: order.scheduledTime,
          notes: userLanguage === 'ar' ? order.notesAr || order.notes : order.notes,
          pricing: {
            service_cost: parseFloat(order.serviceCost),
            discount: parseFloat(order.discount),
            spare_parts_cost: parseFloat(order.sparePartsCost),
            subtotal: parseFloat(order.subtotal),
            vat_amount: parseFloat(order.vatAmount),
            total_amount: parseFloat(order.totalAmount),
            currency: order.currency
          },
          payment_status: order.paymentStatus,
          rating: order.rating,
          review: userLanguage === 'ar' ? order.reviewAr || order.review : order.review,
          quotations: quotations.map(q => ({
            id: q.id,
            spare_parts: typeof q.spareParts === 'string' ? JSON.parse(q.spareParts) : q.spareParts,
            additional_cost: parseFloat(q.additionalCost || '0'),
            total_cost: parseFloat(q.totalCost),
            status: q.status,
            customer_response: q.customerResponse,
            created_at: q.createdAt,
            approved_at: q.approvedAt,
            rejected_at: q.rejectedAt
          })),
          payments: payments.map(p => ({
            id: p.id,
            method: p.method,
            amount: parseFloat(p.amount),
            status: p.status,
            created_at: p.createdAt
          })),
          status_history: statusLogs.map(log => ({
            status: log.status,
            message: userLanguage === 'ar' ? log.messageAr || log.message : log.message,
            created_at: log.createdAt
          })),
          created_at: order.createdAt,
          updated_at: order.updatedAt
        }
      });

    } catch (error) {
      console.error('Get order error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getOrderStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const orderId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const order = await this.storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      if (order.userId !== userId && !['admin', 'technician'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      // Get technician details if assigned
      let technicianInfo = null;
      if (order.technicianId) {
        const technician = await this.storage.getUser(order.technicianId);
        if (technician) {
          technicianInfo = {
            id: technician.id,
            name: userLanguage === 'ar' ? technician.nameAr || technician.name : technician.name,
            phone: technician.phone,
            // In production, you might have technician location tracking
            location: {
              lat: 24.7136,
              lng: 46.6753
            }
          };
        }
      }

      // Get status history
      const statusLogs = await this.storage.getOrderStatusLogs(orderId);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('orders.status_retrieved', userLanguage),
        data: {
          order_id: order.id,
          current_status: order.status,
          current_status_ar: this.getStatusInArabic(order.status),
          scheduled_date: order.scheduledDate,
          scheduled_time: order.scheduledTime,
          technician: technicianInfo,
          estimated_completion: this.calculateEstimatedCompletion(order),
          status_history: statusLogs.map(log => ({
            status: log.status,
            message: userLanguage === 'ar' ? log.messageAr || log.message : log.message,
            timestamp: log.createdAt
          }))
        }
      });

    } catch (error) {
      console.error('Get order status error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async generateInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const orderId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const order = await this.storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      if (order.userId !== userId && !['admin'].includes(req.user?.role || '')) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      // Only generate invoice for completed or paid orders
      if (!['completed', 'paid'].includes(order.status) && order.paymentStatus !== 'paid') {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('orders.invoice_not_available', userLanguage)
        });
      }

      // Get customer and order details
      const customer = await this.storage.getUser(order.userId);
      const service = await this.storage.getServiceCategory(order.serviceId);
      const addresses = await this.storage.getUserAddresses(order.userId);
      const address = addresses.find(addr => addr.id === order.addressId);

      if (!customer || !service || !address) {
        return res.status(500).json({
          success: false,
          message: bilingual.getErrorMessage('orders.invoice_generation_failed', userLanguage)
        });
      }

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber: `INV-${new Date().getFullYear()}-${orderId.slice(-8).toUpperCase()}`,
        orderId: order.id,
        date: new Date().toLocaleDateString(userLanguage === 'ar' ? 'ar-SA' : 'en-US'),
        customer: {
          name: userLanguage === 'ar' ? customer.nameAr || customer.name : customer.name,
          email: customer.email || undefined,
          phone: customer.phone || undefined,
          address: userLanguage === 'ar' ? address.addressAr || address.address : address.address
        },
        items: [
          {
            description: userLanguage === 'ar' ? 'خدمة تنظيف المنزل' : 'Home Cleaning Service',
            quantity: 1,
            unitPrice: parseFloat(order.serviceCost),
            discount: parseFloat(order.discount),
            subtotal: parseFloat(order.serviceCost) - parseFloat(order.discount)
          }
        ],
        subtotal: parseFloat(order.subtotal),
        vatRate: 15,
        vatAmount: parseFloat(order.vatAmount),
        total: parseFloat(order.totalAmount),
        currency: order.currency,
        language: userLanguage as 'ar' | 'en',
        rtl: userLanguage === 'ar',
        companyInfo: {
          name: 'CleanServe',
          nameAr: 'كلين سيرف',
          address: '123 Business District, Riyadh, Saudi Arabia',
          addressAr: '123 الحي التجاري، الرياض، المملكة العربية السعودية',
          phone: '+966 11 234 5678',
          email: 'info@cleanserve.sa',
          vatNumber: '300123456789003'
        }
      };

      // Add spare parts if any
      if (parseFloat(order.sparePartsCost) > 0) {
        const quotations = await this.storage.getOrderQuotations(orderId);
        const approvedQuotation = quotations.find(q => q.status === 'approved');
        
        if (approvedQuotation) {
          const spareParts = typeof approvedQuotation.spareParts === 'string' 
            ? JSON.parse(approvedQuotation.spareParts) 
            : approvedQuotation.spareParts;

          for (const sparePartItem of spareParts) {
            const part = await this.storage.getSparePartById(sparePartItem.part_id);
            if (part) {
              invoiceData.items.push({
                description: userLanguage === 'ar' ? part.nameAr : part.nameEn,
                quantity: sparePartItem.quantity,
                unitPrice: sparePartItem.price,
                discount: 0,
                subtotal: sparePartItem.quantity * sparePartItem.price
              });
            }
          }
        }
      }

      // Check if PDF is requested
      const format = req.query.format as string;
      
      if (format === 'pdf') {
        try {
          const pdfBuffer = await pdfService.generateInvoice(invoiceData);
          const fileName = pdfService.getInvoiceFileName(invoiceData.invoiceNumber, userLanguage);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
          
          return res.send(pdfBuffer);
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          return res.status(500).json({
            success: false,
            message: bilingual.getErrorMessage('orders.pdf_generation_failed', userLanguage)
          });
        }
      }

      // Return JSON invoice data
      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('orders.invoice_generated', userLanguage),
        data: {
          ...invoiceData,
          pdf_url: `/api/v2/orders/${orderId}/invoice?format=pdf`
        }
      });

    } catch (error) {
      console.error('Generate invoice error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async submitReview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const orderId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const validation = reviewSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', userLanguage),
          errors: validation.error.errors
        });
      }

      const { rating, comment, comment_ar, technician_rating, service_rating } = validation.data;

      const order = await this.storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      if (order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      if (order.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('orders.review_not_allowed', userLanguage)
        });
      }

      if (order.rating) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('orders.already_reviewed', userLanguage)
        });
      }

      // Update order with review
      await this.storage.updateOrder(orderId, {
        rating,
        review: comment || null,
        reviewAr: comment_ar || null
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('orders.review_submitted', userLanguage),
        data: {
          order_id: orderId,
          rating,
          comment,
          comment_ar,
          technician_rating,
          service_rating,
          submitted_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Submit review error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async reorderService(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const orderId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const originalOrder = await this.storage.getOrder(orderId);

      if (!originalOrder) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      if (originalOrder.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      // Get new scheduled date and time from request body
      const { scheduled_date, scheduled_time, address_id } = req.body;

      if (!scheduled_date || !scheduled_time) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.schedule_required', userLanguage)
        });
      }

      // Use provided address or original address
      const finalAddressId = address_id || originalOrder.addressId;

      // Verify address belongs to user
      const addresses = await this.storage.getUserAddresses(userId);
      const address = addresses.find(addr => addr.id === finalAddressId);
      if (!address) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('addresses.not_found', userLanguage)
        });
      }

      // Create new order based on original
      const newOrder = await this.storage.createOrder({
        userId,
        serviceId: originalOrder.serviceId,
        packageId: originalOrder.packageId,
        addressId: finalAddressId,
        technicianId: null,
        status: 'pending',
        scheduledDate: new Date(scheduled_date + 'T' + scheduled_time),
        scheduledTime: scheduled_time,
        notes: originalOrder.notes,
        notesAr: originalOrder.notesAr,
        serviceCost: originalOrder.serviceCost,
        discount: originalOrder.discount,
        sparePartsCost: '0.00', // Reset spare parts for new order
        subtotal: (parseFloat(originalOrder.serviceCost) - parseFloat(originalOrder.discount)).toFixed(2),
        vatAmount: ((parseFloat(originalOrder.serviceCost) - parseFloat(originalOrder.discount)) * 0.15).toFixed(2),
        totalAmount: ((parseFloat(originalOrder.serviceCost) - parseFloat(originalOrder.discount)) * 1.15).toFixed(2),
        currency: originalOrder.currency,
        paymentStatus: 'pending'
      });

      // Create status log
      await this.storage.createOrderStatusLog({
        orderId: newOrder.id,
        status: 'pending',
        message: `Reorder from ${originalOrder.id}`,
        messageAr: `إعادة طلب من ${originalOrder.id}`,
        userId: userId
      });

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('orders.reorder_successful', userLanguage),
        data: {
          new_order_id: newOrder.id,
          original_order_id: orderId,
          scheduled_date: newOrder.scheduledDate,
          scheduled_time: newOrder.scheduledTime,
          total_amount: parseFloat(newOrder.totalAmount),
          currency: newOrder.currency,
          status: newOrder.status
        }
      });

    } catch (error) {
      console.error('Reorder service error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  // Technician-specific endpoints
  async getTechnicianOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const technicianId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!technicianId || req.user?.role !== 'technician') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.technician_only', userLanguage)
        });
      }

      const orders = await this.storage.getTechnicianOrders(technicianId);

      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const service = await this.storage.getServiceCategory(order.serviceId);
          const customer = await this.storage.getUser(order.userId);
          const addresses = await this.storage.getUserAddresses(order.userId);
          const address = addresses.find(addr => addr.id === order.addressId);

          const serviceData = service?.name as any;

          return {
            id: order.id,
            status: order.status,
            service: {
              id: service?.id,
              name: serviceData?.[userLanguage] || serviceData?.en || 'Service'
            },
            customer: {
              name: userLanguage === 'ar' ? customer?.nameAr || customer?.name : customer?.name,
              phone: customer?.phone
            },
            address: address ? {
              title: address.title,
              address: userLanguage === 'ar' ? address.addressAr || address.address : address.address,
              city: address.city
            } : null,
            scheduled_date: order.scheduledDate,
            scheduled_time: order.scheduledTime,
            total_amount: parseFloat(order.totalAmount),
            notes: userLanguage === 'ar' ? order.notesAr || order.notes : order.notes,
            created_at: order.createdAt
          };
        })
      );

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('orders.technician_orders_retrieved', userLanguage),
        data: {
          orders: ordersWithDetails,
          total_count: ordersWithDetails.length
        }
      });

    } catch (error) {
      console.error('Get technician orders error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async acceptOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const technicianId = req.user?.id;
      const orderId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!technicianId || req.user?.role !== 'technician') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.technician_only', userLanguage)
        });
      }

      const order = await this.storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      if (order.status !== 'confirmed') {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('orders.cannot_accept', userLanguage)
        });
      }

      // Assign technician to order
      await this.storage.updateOrder(orderId, {
        technicianId,
        status: 'technician_assigned'
      });

      // Create status log
      await this.storage.createOrderStatusLog({
        orderId,
        status: 'technician_assigned',
        message: 'Technician assigned to order',
        messageAr: 'تم تعيين فني للطلب',
        userId: technicianId
      });

      // Send notification to customer
      const customer = await this.storage.getUser(order.userId);
      if (customer?.phone) {
        await twilioService.sendOrderNotification(
          customer.phone,
          'technician_assigned',
          orderId,
          customer.language || 'en'
        );
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('orders.accepted_successfully', userLanguage),
        data: {
          order_id: orderId,
          technician_id: technicianId,
          new_status: 'technician_assigned'
        }
      });

    } catch (error) {
      console.error('Accept order error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async updateOrderStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const technicianId = req.user?.id;
      const orderId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!technicianId || req.user?.role !== 'technician') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.technician_only', userLanguage)
        });
      }

      const { status, message, message_ar } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.status_required', userLanguage)
        });
      }

      const validStatuses = ['en_route', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_status', userLanguage)
        });
      }

      const order = await this.storage.getOrder(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_found', userLanguage)
        });
      }

      if (order.technicianId !== technicianId) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('orders.not_assigned', userLanguage)
        });
      }

      // Update order status
      await this.storage.updateOrder(orderId, { status: status as any });

      // Create status log
      await this.storage.createOrderStatusLog({
        orderId,
        status: status as any,
        message: message || `Order status updated to ${status}`,
        messageAr: message_ar || `تم تحديث حالة الطلب إلى ${status}`,
        userId: technicianId
      });

      // Send notification to customer
      const customer = await this.storage.getUser(order.userId);
      if (customer?.phone) {
        await twilioService.sendOrderNotification(
          customer.phone,
          status,
          orderId,
          customer.language || 'en'
        );
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('orders.status_updated', userLanguage),
        data: {
          order_id: orderId,
          old_status: order.status,
          new_status: status,
          updated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Update order status error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  private getStatusInArabic(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'في الانتظار',
      'confirmed': 'مؤكد',
      'technician_assigned': 'تم تعيين فني',
      'en_route': 'في الطريق',
      'in_progress': 'جاري التنفيذ',
      'quotation_pending': 'في انتظار الموافقة على السعر',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };

    return statusMap[status] || status;
  }

  private calculateEstimatedCompletion(order: any): string {
    // Calculate estimated completion based on service duration and current status
    const scheduledTime = new Date(order.scheduledDate);
    let additionalMinutes = 0;

    switch (order.status) {
      case 'confirmed':
      case 'technician_assigned':
        additionalMinutes = 30; // Travel time
        break;
      case 'en_route':
        additionalMinutes = 15; // Arrival + service time
        break;
      case 'in_progress':
        additionalMinutes = 60; // Remaining service time estimate
        break;
      default:
        additionalMinutes = 0;
    }

    const estimatedTime = new Date(scheduledTime.getTime() + additionalMinutes * 60000);
    return estimatedTime.toISOString();
  }
}
