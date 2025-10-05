import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { bilingual } from '../utils/bilingual';
import { 
  createBookingSchema, 
  createQuotationSchema,
  validateSchema 
} from '../middleware/validation';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    language: string;
    role: string;
  };
}

export class BookingsController {
  constructor(private storage: IStorage) {}

  async getAvailableSlots(req: AuthenticatedRequest, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';
      const date = req.query.date as string;
      const serviceId = req.query.service_id as string;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.date_required', userLanguage)
        });
      }

      const requestedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (requestedDate < today) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('booking.past_date_not_allowed', userLanguage)
        });
      }

      // Get service duration if service_id provided
      let serviceDuration = 120; // Default 2 hours
      if (serviceId) {
        const service = await this.storage.getServiceCategory(serviceId);
        if (service) {
          serviceDuration = service.durationMinutes || 120;
        }
      }

      // Generate available time slots
      const slots = this.generateTimeSlots(date, serviceDuration);

      // In production, filter out booked slots from database
      const bookedSlots: string[] = []; // TODO: Get from orders table

      const availableSlots = slots.filter(slot => !bookedSlots.includes(slot.time));

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('booking.available_slots_retrieved', userLanguage),
        data: {
          date: date,
          service_duration_minutes: serviceDuration,
          available_slots: availableSlots,
          total_slots: availableSlots.length
        }
      });

    } catch (error) {
      console.error('Get available slots error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async createBooking(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const validation = createBookingSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', userLanguage),
          errors: validation.error.errors
        });
      }

      const {
        service_id,
        package_id,
        address_id,
        scheduled_date,
        scheduled_time,
        notes,
        notes_ar,
        referral_code
      } = validation.data;

      // Verify service exists
      const service = await this.storage.getServiceCategory(service_id);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('services.category_not_found', userLanguage)
        });
      }

      // Verify package exists if provided
      let selectedPackage = null;
      if (package_id) {
        const packages = await this.storage.getServicePackages(service_id);
        selectedPackage = packages.find(pkg => pkg.id === package_id);
        if (!selectedPackage) {
          return res.status(404).json({
            success: false,
            message: bilingual.getErrorMessage('services.package_not_found', userLanguage)
          });
        }
      }

      // Verify address belongs to user
      const addresses = await this.storage.getUserAddresses(userId);
      const address = addresses.find(addr => addr.id === address_id);
      if (!address) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('addresses.not_found', userLanguage)
        });
      }

      // Validate referral code if provided
      let referralDiscount = 0;
      let referralData = null;
      if (referral_code) {
        const db = await import('../db').then(m => m.db);
        const { users, referralCampaigns, referrals } = await import('../../shared/schema');
        const { eq, and, lte, sql } = await import('drizzle-orm');
        const { count } = await import('drizzle-orm');

        const referrer = await db.query.users.findFirst({
          where: eq(users.referralCode, referral_code),
        });

        if (!referrer) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('referral.invalid_code', userLanguage),
            error: 'Invalid referral code'
          });
        }

        // Prevent self-referral
        if (referrer.id === userId) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('referral.cannot_use_own_code', userLanguage),
            error: 'Cannot use your own referral code'
          });
        }

        const activeCampaign = await db.query.referralCampaigns.findFirst({
          where: and(
            eq(referralCampaigns.isActive, true),
            lte(referralCampaigns.validFrom, new Date()),
            sql`(${referralCampaigns.validUntil} IS NULL OR ${referralCampaigns.validUntil} >= NOW())`
          ),
        });

        if (!activeCampaign) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('referral.no_active_campaign', userLanguage),
            error: 'No active referral campaign available'
          });
        }

        const referralCount = await db
          .select({ count: count() })
          .from(referrals)
          .where(
            and(
              eq(referrals.inviterId, referrer.id),
              eq(referrals.campaignId, activeCampaign.id)
            )
          );

        const usageCount = referralCount[0]?.count || 0;

        if (usageCount >= activeCampaign.maxUsagePerUser) {
          return res.status(400).json({
            success: false,
            message: bilingual.getErrorMessage('referral.usage_limit_reached', userLanguage),
            error: 'This referral code has reached its usage limit'
          });
        }

        referralData = {
          referrerId: referrer.id,
          campaignId: activeCampaign.id,
          discountType: activeCampaign.inviteeDiscountType,
          discountValue: Number(activeCampaign.inviteeDiscountValue),
          inviterReward: Number(activeCampaign.inviterRewardValue)
        };
      }

      // Calculate pricing
      const basePrice = selectedPackage ? parseFloat(selectedPackage.price) : parseFloat(service.basePrice);
      const discountPercentage = selectedPackage ? parseFloat(selectedPackage.discountPercentage || '0') : 0;
      const discountAmount = (basePrice * discountPercentage) / 100;
      
      // Apply referral discount
      if (referralData) {
        if (referralData.discountType === 'percentage') {
          referralDiscount = (basePrice * referralData.discountValue) / 100;
        } else {
          referralDiscount = referralData.discountValue;
        }
      }
      
      // Calculate subtotal and clamp at 0 to prevent negative values
      const subtotal = Math.max(0, basePrice - discountAmount - referralDiscount);
      const vatPercentage = parseFloat(service.vatPercentage || '15');
      const vatAmount = (subtotal * vatPercentage) / 100;
      const totalAmount = subtotal + vatAmount;

      // Create booking
      const booking = await this.storage.createBooking({
        userId,
        serviceId: service_id,
        packageId: package_id || undefined,
        addressId: address_id,
        status: 'pending',
        scheduledDate: new Date(scheduled_date + 'T' + scheduled_time),
        scheduledTime: scheduled_time,
        notes: notes || undefined,
        notesAr: notes_ar || undefined,
        serviceCost: basePrice.toFixed(2),
        discountAmount: discountAmount.toFixed(2),
        referralCode: referral_code || undefined,
        referralDiscount: referralDiscount.toFixed(2),
        sparePartsCost: '0.00',
        vatAmount: vatAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
        paymentStatus: 'pending'
      });

      // Create referral record if referral code was used
      if (referralData && referral_code) {
        const db = await import('../db').then(m => m.db);
        const { referrals } = await import('../../shared/schema');
        
        await db.insert(referrals).values({
          campaignId: referralData.campaignId,
          inviterId: referralData.referrerId,
          inviteeId: userId,
          bookingId: booking.id,
          referralCode: referral_code,
          status: 'pending',
          inviterReward: referralData.inviterReward.toFixed(2),
          inviteeDiscount: referralDiscount.toFixed(2),
        });
      }

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('booking.created_successfully', userLanguage),
        data: {
          booking_id: booking.id,
          status: booking.status,
          service: {
            id: service.id,
            name: service.name,
            duration_minutes: service.durationMinutes
          },
          package: selectedPackage ? {
            id: selectedPackage.id,
            name: selectedPackage.name,
            tier: selectedPackage.tier
          } : null,
          scheduled_date: booking.scheduledDate,
          scheduled_time: booking.scheduledTime,
          pricing: {
            service_cost: parseFloat(booking.serviceCost),
            discount: parseFloat(booking.discountAmount),
            referral_discount: parseFloat(booking.referralDiscount || '0'),
            vat_percentage: vatPercentage,
            vat_amount: parseFloat(booking.vatAmount),
            total_amount: parseFloat(booking.totalAmount)
          },
          created_at: booking.createdAt
        }
      });

    } catch (error) {
      console.error('Create booking error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getBooking(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const bookingId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const booking = await this.storage.getOrder(bookingId);

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('booking.not_found', userLanguage)
        });
      }

      // Verify booking belongs to user (unless admin/technician)
      if (booking.userId !== userId && req.user?.role === 'customer') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      // Get service details
      const service = await this.storage.getServiceCategory(booking.serviceId);
      let packageDetails = null;

      if (booking.packageId) {
        const packages = await this.storage.getServicePackages(booking.serviceId);
        packageDetails = packages.find(pkg => pkg.id === booking.packageId);
      }

      // Get quotations
      const quotations = await this.storage.getOrderQuotations(bookingId);

      // Get status logs
      const statusLogs = await this.storage.getOrderStatusLogs(bookingId);

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('booking.retrieved_successfully', userLanguage),
        data: {
          id: booking.id,
          status: booking.status,
          service: service ? {
            id: service.id,
            name: service.name,
            duration_minutes: service.durationMinutes
          } : null,
          package: packageDetails ? {
            id: packageDetails.id,
            name: packageDetails.name,
            tier: packageDetails.tier
          } : null,
          scheduled_date: booking.scheduledDate,
          scheduled_time: booking.scheduledTime,
          notes: booking.notes,
          notes_ar: booking.notesAr,
          pricing: {
            service_cost: parseFloat(booking.serviceCost),
            discount: parseFloat(booking.discount),
            spare_parts_cost: parseFloat(booking.sparePartsCost),
            subtotal: parseFloat(booking.subtotal),
            vat_amount: parseFloat(booking.vatAmount),
            total_amount: parseFloat(booking.totalAmount),
            currency: booking.currency
          },
          payment_status: booking.paymentStatus,
          technician_id: booking.technicianId,
          rating: booking.rating,
          review: booking.review,
          review_ar: booking.reviewAr,
          quotations: quotations.map(q => ({
            id: q.id,
            spare_parts: q.spareParts,
            additional_cost: parseFloat(q.additionalCost || '0'),
            total_cost: parseFloat(q.totalCost),
            status: q.status,
            created_at: q.createdAt,
            approved_at: q.approvedAt,
            rejected_at: q.rejectedAt
          })),
          status_history: statusLogs.map(log => ({
            status: log.status,
            message: log.message,
            message_ar: log.messageAr,
            created_at: log.createdAt
          })),
          created_at: booking.createdAt,
          updated_at: booking.updatedAt
        }
      });

    } catch (error) {
      console.error('Get booking error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async createQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId || req.user?.role !== 'technician') {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.technician_only', userLanguage)
        });
      }

      const validation = createQuotationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.invalid_data', userLanguage),
          errors: validation.error.errors
        });
      }

      const { order_id, spare_parts, additional_cost } = validation.data;

      // Verify order exists and is assigned to this technician
      const order = await this.storage.getOrder(order_id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('booking.not_found', userLanguage)
        });
      }

      if (order.technicianId !== userId) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('booking.not_assigned', userLanguage)
        });
      }

      // Calculate spare parts total
      let sparePartsTotal = 0;
      for (const item of spare_parts) {
        const part = await this.storage.getSparePartById(item.part_id);
        if (!part) {
          return res.status(404).json({
            success: false,
            message: bilingual.getErrorMessage('spare_parts.not_found', userLanguage)
          });
        }
        sparePartsTotal += item.quantity * item.price;
      }

      const totalCost = sparePartsTotal + additional_cost;

      // Create quotation
      const quotation = await this.storage.createQuotation({
        orderId: order_id,
        technicianId: userId,
        spareParts: JSON.stringify(spare_parts),
        additionalCost: additional_cost.toFixed(2),
        totalCost: totalCost.toFixed(2),
        status: 'pending'
      });

      // Update order status to quotation pending
      await this.storage.updateOrder(order_id, {
        status: 'quotation_pending'
      });

      // Create status log
      await this.storage.createOrderStatusLog({
        orderId: order_id,
        status: 'quotation_pending',
        message: `Quotation created: ${totalCost.toFixed(2)} SAR`,
        messageAr: `تم إنشاء عرض السعر: ${totalCost.toFixed(2)} ريال`,
        userId: userId
      });

      return res.status(201).json({
        success: true,
        message: bilingual.getMessage('quotation.created_successfully', userLanguage),
        data: {
          quotation_id: quotation.id,
          order_id: order_id,
          spare_parts: spare_parts,
          spare_parts_total: sparePartsTotal,
          additional_cost: additional_cost,
          total_cost: totalCost,
          status: quotation.status,
          created_at: quotation.createdAt
        }
      });

    } catch (error) {
      console.error('Create quotation error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async approveQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const quotationId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const quotation = await this.storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('quotation.not_found', userLanguage)
        });
      }

      // Verify order belongs to user
      const order = await this.storage.getOrder(quotation.orderId);
      if (!order || order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      if (quotation.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('quotation.already_processed', userLanguage)
        });
      }

      // Approve quotation
      const approvedQuotation = await this.storage.updateQuotation(quotationId, {
        status: 'approved',
        approvedAt: new Date()
      });

      // Update order with spare parts cost and recalculate total
      const sparePartsCost = parseFloat(quotation.totalCost);
      const currentSubtotal = parseFloat(order.subtotal);
      const newSubtotal = currentSubtotal + sparePartsCost;
      const vatAmount = (newSubtotal * parseFloat(order.vatAmount)) / parseFloat(order.subtotal); // Proportional VAT
      const newTotal = newSubtotal + vatAmount;

      await this.storage.updateOrder(quotation.orderId, {
        sparePartsCost: sparePartsCost.toFixed(2),
        subtotal: newSubtotal.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        totalAmount: newTotal.toFixed(2),
        status: 'confirmed'
      });

      // Create status log
      await this.storage.createOrderStatusLog({
        orderId: quotation.orderId,
        status: 'confirmed',
        message: `Quotation approved. New total: ${newTotal.toFixed(2)} SAR`,
        messageAr: `تمت الموافقة على عرض السعر. المجموع الجديد: ${newTotal.toFixed(2)} ريال`,
        userId: userId
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('quotation.approved_successfully', userLanguage),
        data: {
          quotation_id: quotationId,
          status: 'approved',
          order_total_updated: newTotal,
          spare_parts_cost: sparePartsCost,
          approved_at: approvedQuotation?.approvedAt
        }
      });

    } catch (error) {
      console.error('Approve quotation error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async rejectQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const quotationId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || req.user?.language || 'en';
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: bilingual.getErrorMessage('auth.unauthorized', userLanguage)
        });
      }

      const quotation = await this.storage.getQuotation(quotationId);
      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('quotation.not_found', userLanguage)
        });
      }

      // Verify order belongs to user
      const order = await this.storage.getOrder(quotation.orderId);
      if (!order || order.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: bilingual.getErrorMessage('auth.access_denied', userLanguage)
        });
      }

      if (quotation.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('quotation.already_processed', userLanguage)
        });
      }

      // Reject quotation
      await this.storage.updateQuotation(quotationId, {
        status: 'rejected',
        customerResponse: reason || 'Rejected by customer',
        rejectedAt: new Date()
      });

      // Update order status back to confirmed (ready for service without spare parts)
      await this.storage.updateOrder(quotation.orderId, {
        status: 'confirmed'
      });

      // Create status log
      await this.storage.createOrderStatusLog({
        orderId: quotation.orderId,
        status: 'confirmed',
        message: `Quotation rejected${reason ? `: ${reason}` : ''}`,
        messageAr: `تم رفض عرض السعر${reason ? `: ${reason}` : ''}`,
        userId: userId
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('quotation.rejected_successfully', userLanguage),
        data: {
          quotation_id: quotationId,
          status: 'rejected',
          reason: reason || 'Rejected by customer'
        }
      });

    } catch (error) {
      console.error('Reject quotation error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  private generateTimeSlots(date: string, durationMinutes: number): Array<{ time: string; available: boolean }> {
    const slots: Array<{ time: string; available: boolean }> = [];
    const startHour = 8; // 8 AM
    const endHour = 20; // 8 PM
    const slotDuration = Math.max(60, durationMinutes); // Minimum 1 hour slots

    for (let hour = startHour; hour < endHour; hour++) {
      // Skip lunch time (12-1 PM)
      if (hour === 12) continue;

      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if slot would exceed end time
        const slotEndHour = hour + Math.floor((minute + durationMinutes) / 60);
        const slotEndMinute = (minute + durationMinutes) % 60;
        
        if (slotEndHour < endHour || (slotEndHour === endHour && slotEndMinute === 0)) {
          slots.push({
            time: timeString,
            available: true // In production, check against bookings
          });
        }
      }
    }

    return slots;
  }
}
