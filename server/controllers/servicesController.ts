import { Request, Response } from 'express';
import { IStorage } from '../storage';
import { bilingual } from '../utils/bilingual';

export class ServicesController {
  constructor(private storage: IStorage) {}

  async getServiceCategories(req: Request, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || 'en';
      const isActive = req.query.active !== 'false'; // Default to active only
      
      const categories = await this.storage.getServiceCategories(isActive);

      // Transform categories to include localized content based on language
      const localizedCategories = categories.map(category => {
        const nameData = category.name as any;
        const descriptionData = category.description as any;
        
        return {
          id: category.id,
          name: nameData?.[userLanguage] || nameData?.en || 'Service',
          description: descriptionData?.[userLanguage] || descriptionData?.en || '',
          icon: category.icon,
          base_price: parseFloat(category.basePrice),
          vat_percentage: parseFloat(category.vatPercentage || '15'),
          duration_minutes: category.durationMinutes,
          is_active: category.isActive,
          created_at: category.createdAt
        };
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('services.categories_retrieved', userLanguage),
        data: {
          categories: localizedCategories,
          total_count: localizedCategories.length
        }
      });

    } catch (error) {
      console.error('Get service categories error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getServiceCategory(req: Request, res: Response) {
    try {
      const categoryId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || 'en';

      const category = await this.storage.getServiceCategory(categoryId);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('services.category_not_found', userLanguage)
        });
      }

      // Get packages for this category
      const packages = await this.storage.getServicePackages(categoryId);

      const nameData = category.name as any;
      const descriptionData = category.description as any;

      const localizedPackages = packages.map(pkg => {
        const pkgNameData = pkg.name as any;
        const pkgInclusionsData = pkg.inclusions as any;

        return {
          id: pkg.id,
          tier: pkg.tier,
          name: pkgNameData?.[userLanguage] || pkgNameData?.en || 'Package',
          price: parseFloat(pkg.price),
          discount_percentage: parseFloat(pkg.discountPercentage || '0'),
          inclusions: pkgInclusionsData?.[userLanguage] || pkgInclusionsData?.en || [],
          is_active: pkg.isActive,
          created_at: pkg.createdAt
        };
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('services.category_retrieved', userLanguage),
        data: {
          id: category.id,
          name: nameData?.[userLanguage] || nameData?.en || 'Service',
          description: descriptionData?.[userLanguage] || descriptionData?.en || '',
          icon: category.icon,
          base_price: parseFloat(category.basePrice),
          vat_percentage: parseFloat(category.vatPercentage || '15'),
          duration_minutes: category.durationMinutes,
          is_active: category.isActive,
          packages: localizedPackages,
          created_at: category.createdAt
        }
      });

    } catch (error) {
      console.error('Get service category error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getServicePackages(req: Request, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || 'en';
      const categoryId = req.query.category_id as string;

      const packages = await this.storage.getServicePackages(categoryId);

      const localizedPackages = packages.map(pkg => {
        const nameData = pkg.name as any;
        const inclusionsData = pkg.inclusions as any;

        return {
          id: pkg.id,
          category_id: pkg.categoryId,
          tier: pkg.tier,
          name: nameData?.[userLanguage] || nameData?.en || 'Package',
          price: parseFloat(pkg.price),
          discount_percentage: parseFloat(pkg.discountPercentage || '0'),
          discounted_price: parseFloat(pkg.price) * (1 - parseFloat(pkg.discountPercentage || '0') / 100),
          inclusions: inclusionsData?.[userLanguage] || inclusionsData?.en || [],
          is_active: pkg.isActive,
          created_at: pkg.createdAt
        };
      });

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('services.packages_retrieved', userLanguage),
        data: {
          packages: localizedPackages,
          total_count: localizedPackages.length
        }
      });

    } catch (error) {
      console.error('Get service packages error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getSpareParts(req: Request, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || 'en';
      const category = req.query.category as string;

      const spareParts = await this.storage.getSpareParts(category);

      const localizedSpareParts = spareParts.map(part => ({
        id: part.id,
        name: userLanguage === 'ar' ? part.nameAr : part.nameEn,
        description: userLanguage === 'ar' ? part.descriptionAr : part.descriptionEn,
        category: part.category,
        price: parseFloat(part.price),
        stock: part.stock,
        image: part.image,
        is_active: part.isActive,
        created_at: part.createdAt
      }));

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('spare_parts.retrieved_successfully', userLanguage),
        data: {
          spare_parts: localizedSpareParts,
          total_count: localizedSpareParts.length,
          categories: [...new Set(spareParts.map(part => part.category))]
        }
      });

    } catch (error) {
      console.error('Get spare parts error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getSparePartById(req: Request, res: Response) {
    try {
      const partId = req.params.id;
      const userLanguage = req.headers['accept-language'] as string || 'en';

      const part = await this.storage.getSparePartById(partId);

      if (!part) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('spare_parts.not_found', userLanguage)
        });
      }

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('spare_parts.retrieved_successfully', userLanguage),
        data: {
          id: part.id,
          name: userLanguage === 'ar' ? part.nameAr : part.nameEn,
          description: userLanguage === 'ar' ? part.descriptionAr : part.descriptionEn,
          category: part.category,
          price: parseFloat(part.price),
          stock: part.stock,
          image: part.image,
          is_active: part.isActive,
          created_at: part.createdAt
        }
      });

    } catch (error) {
      console.error('Get spare part error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async getPromotions(req: Request, res: Response) {
    try {
      const userLanguage = req.headers['accept-language'] as string || 'en';
      
      // In production, fetch from promotions table
      const promotions = [
        {
          id: 'promo_001',
          title: userLanguage === 'ar' ? 'خصم 20% على الطلب الأول' : '20% off first order',
          description: userLanguage === 'ar' ? 'احصل على خصم 20% على طلبك الأول' : 'Get 20% discount on your first order',
          discount_type: 'percentage',
          discount_value: 20,
          promo_code: 'FIRST20',
          min_order_amount: 100,
          max_discount_amount: 50,
          is_active: true,
          valid_from: new Date('2024-01-01'),
          valid_until: new Date('2024-12-31'),
          usage_limit: 1000,
          usage_count: 245
        },
        {
          id: 'promo_002',
          title: userLanguage === 'ar' ? 'خصم 50 ريال للعملاء الجدد' : '50 SAR off for new customers',
          description: userLanguage === 'ar' ? 'خصم 50 ريال لكل عميل جديد' : '50 SAR discount for every new customer',
          discount_type: 'fixed',
          discount_value: 50,
          promo_code: 'NEW50',
          min_order_amount: 200,
          max_discount_amount: 50,
          is_active: true,
          valid_from: new Date('2024-01-01'),
          valid_until: new Date('2024-06-30'),
          usage_limit: 500,
          usage_count: 123
        }
      ];

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('promotions.retrieved_successfully', userLanguage),
        data: {
          promotions: promotions,
          total_count: promotions.length
        }
      });

    } catch (error) {
      console.error('Get promotions error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }

  async validatePromoCode(req: Request, res: Response) {
    try {
      const { promo_code, order_amount } = req.body;
      const userLanguage = req.headers['accept-language'] as string || 'en';

      if (!promo_code || !order_amount) {
        return res.status(400).json({
          success: false,
          message: bilingual.getErrorMessage('validation.required_fields', userLanguage)
        });
      }

      // In production, validate against promotions table
      const validCodes: Record<string, any> = {
        'FIRST20': {
          discount_type: 'percentage',
          discount_value: 20,
          min_order_amount: 100,
          max_discount_amount: 50
        },
        'NEW50': {
          discount_type: 'fixed',
          discount_value: 50,
          min_order_amount: 200,
          max_discount_amount: 50
        }
      };

      const promotion = validCodes[promo_code.toUpperCase()];

      if (!promotion) {
        return res.status(404).json({
          success: false,
          message: bilingual.getErrorMessage('promotions.invalid_code', userLanguage)
        });
      }

      if (order_amount < promotion.min_order_amount) {
        return res.status(400).json({
          success: false,
          message: bilingual.getMessage('promotions.min_amount_required', userLanguage, {
            amount: promotion.min_order_amount
          })
        });
      }

      // Calculate discount
      let discountAmount = 0;
      if (promotion.discount_type === 'percentage') {
        discountAmount = (order_amount * promotion.discount_value) / 100;
        if (promotion.max_discount_amount) {
          discountAmount = Math.min(discountAmount, promotion.max_discount_amount);
        }
      } else {
        discountAmount = promotion.discount_value;
      }

      const finalAmount = order_amount - discountAmount;

      return res.status(200).json({
        success: true,
        message: bilingual.getMessage('promotions.code_applied', userLanguage),
        data: {
          promo_code: promo_code.toUpperCase(),
          discount_type: promotion.discount_type,
          discount_value: promotion.discount_value,
          discount_amount: discountAmount,
          original_amount: order_amount,
          final_amount: finalAmount,
          savings: discountAmount
        }
      });

    } catch (error) {
      console.error('Validate promo code error:', error);
      return res.status(500).json({
        success: false,
        message: bilingual.getErrorMessage('general.server_error', req.headers['accept-language'] as string)
      });
    }
  }
}
