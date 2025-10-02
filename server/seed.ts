import { db } from './db';
import { 
  serviceCategories, services, servicePackages, spareParts, promotions,
  type InsertServiceCategory, type InsertService, type InsertServicePackage,
  type InsertSparePart, type InsertPromotion
} from '@shared/schema';

async function seed() {
  console.log('🌱 Starting database seeding...');

  try {
    // 1. Seed Service Categories
    console.log('📦 Seeding service categories...');
    const categories = await db.insert(serviceCategories).values([
      {
        name: JSON.stringify({ en: 'Home Cleaning', ar: 'تنظيف المنزل' }),
        description: JSON.stringify({ 
          en: 'Professional home cleaning services', 
          ar: 'خدمات تنظيف منزلية احترافية' 
        }),
        icon: '🏠',
        isActive: true,
        sortOrder: 1,
      },
      {
        name: JSON.stringify({ en: 'Office Cleaning', ar: 'تنظيف المكاتب' }),
        description: JSON.stringify({ 
          en: 'Commercial office cleaning solutions', 
          ar: 'حلول تنظيف المكاتب التجارية' 
        }),
        icon: '🏢',
        isActive: true,
        sortOrder: 2,
      },
      {
        name: JSON.stringify({ en: 'Deep Cleaning', ar: 'التنظيف العميق' }),
        description: JSON.stringify({ 
          en: 'Intensive deep cleaning services', 
          ar: 'خدمات التنظيف العميق المكثف' 
        }),
        icon: '✨',
        isActive: true,
        sortOrder: 3,
      },
      {
        name: JSON.stringify({ en: 'Carpet Cleaning', ar: 'تنظيف السجاد' }),
        description: JSON.stringify({ 
          en: 'Professional carpet and upholstery cleaning', 
          ar: 'تنظيف السجاد والمفروشات الاحترافي' 
        }),
        icon: '🛋️',
        isActive: true,
        sortOrder: 4,
      },
      {
        name: JSON.stringify({ en: 'Window Cleaning', ar: 'تنظيف النوافذ' }),
        description: JSON.stringify({ 
          en: 'Crystal clear window cleaning', 
          ar: 'تنظيف النوافذ بشكل واضح' 
        }),
        icon: '🪟',
        isActive: true,
        sortOrder: 5,
      },
      {
        name: JSON.stringify({ en: 'AC Maintenance', ar: 'صيانة المكيفات' }),
        description: JSON.stringify({ 
          en: 'Air conditioning cleaning and maintenance', 
          ar: 'تنظيف وصيانة أجهزة التكييف' 
        }),
        icon: '❄️',
        isActive: true,
        sortOrder: 6,
      },
    ]).returning();

    console.log(`✅ Created ${categories.length} service categories`);

    // 2. Seed Services
    console.log('🔧 Seeding services...');
    const servicesData: any[] = [];
    
    categories.forEach((category, idx) => {
      const categoryName = category.name as any;
      
      servicesData.push({
        categoryId: category.id,
        name: JSON.stringify({ 
          en: `${categoryName.en} - Standard`, 
          ar: `${categoryName.ar} - قياسي` 
        }),
        description: JSON.stringify({ 
          en: `Standard ${categoryName.en.toLowerCase()} service`, 
          ar: `خدمة ${categoryName.ar} القياسية` 
        }),
        basePrice: ((idx + 1) * 100).toString(),
        vatPercentage: '15',
        durationMinutes: 120,
        isActive: true,
      });

      servicesData.push({
        categoryId: category.id,
        name: JSON.stringify({ 
          en: `${categoryName.en} - Premium`, 
          ar: `${categoryName.ar} - مميز` 
        }),
        description: JSON.stringify({ 
          en: `Premium ${categoryName.en.toLowerCase()} service with extra care`, 
          ar: `خدمة ${categoryName.ar} المميزة مع عناية إضافية` 
        }),
        basePrice: ((idx + 1) * 150).toString(),
        vatPercentage: '15',
        durationMinutes: 180,
        isActive: true,
      });
    });

    const createdServices = await db.insert(services).values(servicesData).returning();
    console.log(`✅ Created ${createdServices.length} services`);

    // 3. Seed Service Packages
    console.log('📋 Seeding service packages...');
    const packagesData: any[] = [];

    createdServices.forEach((service, idx) => {
      const serviceName = service.name as any;
      
      packagesData.push({
        serviceId: service.id,
        tier: 'basic',
        name: JSON.stringify({ en: 'Basic Package', ar: 'الباقة الأساسية' }),
        price: service.basePrice,
        discountPercentage: '0',
        inclusions: JSON.stringify({ 
          en: ['Basic cleaning', 'Standard equipment', '2-hour service'], 
          ar: ['تنظيف أساسي', 'معدات قياسية', 'خدمة ساعتين'] 
        }),
        termsAndConditions: JSON.stringify({ 
          en: 'Standard terms and conditions apply', 
          ar: 'تطبق الشروط والأحكام القياسية' 
        }),
        isActive: true,
      });

      packagesData.push({
        serviceId: service.id,
        tier: 'premium',
        name: JSON.stringify({ en: 'Premium Package', ar: 'الباقة المميزة' }),
        price: (parseFloat(service.basePrice) * 1.5).toString(),
        discountPercentage: '10',
        inclusions: JSON.stringify({ 
          en: ['Deep cleaning', 'Premium products', 'Extended service time', 'Sanitization'], 
          ar: ['تنظيف عميق', 'منتجات مميزة', 'وقت خدمة ممتد', 'تعقيم'] 
        }),
        termsAndConditions: JSON.stringify({ 
          en: 'Premium package terms apply. 24-hour cancellation notice required.', 
          ar: 'تطبق شروط الباقة المميزة. يلزم إشعار إلغاء قبل 24 ساعة.' 
        }),
        isActive: true,
      });
    });

    const createdPackages = await db.insert(servicePackages).values(packagesData).returning();
    console.log(`✅ Created ${createdPackages.length} service packages`);

    // 4. Seed Spare Parts
    console.log('🔩 Seeding spare parts...');
    const sparePartsData = [
      {
        name: JSON.stringify({ en: 'AC Filter', ar: 'فلتر مكيف' }),
        description: JSON.stringify({ en: 'High-quality air filter for AC units', ar: 'فلتر هواء عالي الجودة للمكيف' }),
        category: 'AC Parts',
        price: '50.00',
        stock: 100,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Carpet Cleaner Solution', ar: 'منظف السجاد' }),
        description: JSON.stringify({ en: 'Professional carpet cleaning solution', ar: 'محلول تنظيف احترافي للسجاد' }),
        category: 'Cleaning Supplies',
        price: '75.00',
        stock: 50,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Professional Mop', ar: 'ممسحة احترافية' }),
        description: JSON.stringify({ en: 'Industrial-grade mop for heavy cleaning', ar: 'ممسحة صناعية للتنظيف الثقيل' }),
        category: 'Equipment',
        price: '120.00',
        stock: 30,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Vacuum Cleaner Bag', ar: 'كيس مكنسة كهربائية' }),
        description: JSON.stringify({ en: 'Replacement vacuum cleaner bag', ar: 'كيس مكنسة كهربائية قابل للاستبدال' }),
        category: 'Equipment',
        price: '25.00',
        stock: 200,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Glass Cleaner', ar: 'منظف زجاج' }),
        description: JSON.stringify({ en: 'Streak-free glass cleaner', ar: 'منظف زجاج خالي من الخطوط' }),
        category: 'Cleaning Supplies',
        price: '35.00',
        stock: 80,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Cleaning Gloves', ar: 'قفازات تنظيف' }),
        description: JSON.stringify({ en: 'Protective rubber gloves', ar: 'قفازات مطاطية للحماية' }),
        category: 'Safety Equipment',
        price: '15.00',
        stock: 150,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Air Freshener', ar: 'معطر جو' }),
        description: JSON.stringify({ en: 'Rose-scented air freshener', ar: 'معطر جو برائحة الورد' }),
        category: 'Cleaning Supplies',
        price: '40.00',
        stock: 90,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Multi-Purpose Cleaner', ar: 'منظف متعدد الأغراض' }),
        description: JSON.stringify({ en: 'All-surface cleaning solution', ar: 'منظف شامل لجميع الأسطح' }),
        category: 'Cleaning Supplies',
        price: '60.00',
        stock: 120,
        image: null,
        isActive: true,
      },
    ];

    const createdSpareParts = await db.insert(spareParts).values(sparePartsData).returning();
    console.log(`✅ Created ${createdSpareParts.length} spare parts`);

    // 5. Seed Promotions
    console.log('🎁 Seeding promotions...');
    const now = new Date();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

    const promotionsData = [
      {
        code: 'WELCOME2024',
        name: JSON.stringify({ en: 'Welcome Offer', ar: 'عرض الترحيب' }),
        description: JSON.stringify({ 
          en: 'Get 20% off on your first booking!', 
          ar: 'احصل على خصم 20% على أول حجز!' 
        }),
        discountType: 'percentage' as const,
        discountValue: '20.00',
        minOrderAmount: '100.00',
        maxDiscountAmount: '100.00',
        validFrom: now,
        validUntil: futureDate,
        usageLimit: 1000,
        usageCount: 0,
        isActive: true,
        terms: JSON.stringify({ 
          en: 'Valid for first-time customers only', 
          ar: 'صالح للعملاء الجدد فقط' 
        }),
      },
      {
        code: 'DEEPCLEAN50',
        name: JSON.stringify({ en: 'Deep Clean Special', ar: 'عرض التنظيف العميق' }),
        description: JSON.stringify({ 
          en: 'SAR 50 off on deep cleaning services', 
          ar: '50 ريال خصم على خدمات التنظيف العميق' 
        }),
        discountType: 'fixed' as const,
        discountValue: '50.00',
        minOrderAmount: '200.00',
        maxDiscountAmount: '50.00',
        validFrom: now,
        validUntil: futureDate,
        usageLimit: 500,
        usageCount: 0,
        isActive: true,
        terms: JSON.stringify({ 
          en: 'Applicable on deep cleaning services only', 
          ar: 'ينطبق على خدمات التنظيف العميق فقط' 
        }),
      },
      {
        code: 'REFER100',
        name: JSON.stringify({ en: 'Referral Bonus', ar: 'مكافأة الإحالة' }),
        description: JSON.stringify({ 
          en: 'Refer a friend and both get SAR 100 credit', 
          ar: 'أحل صديقاً واحصلا على 100 ريال رصيد' 
        }),
        discountType: 'fixed' as const,
        discountValue: '100.00',
        minOrderAmount: '150.00',
        maxDiscountAmount: '100.00',
        validFrom: now,
        validUntil: futureDate,
        usageLimit: 10000,
        usageCount: 0,
        isActive: true,
        terms: JSON.stringify({ 
          en: 'Both referrer and referee must complete a booking', 
          ar: 'يجب على المحيل والمحال إليه إكمال الحجز' 
        }),
      },
    ];

    const createdPromotions = await db.insert(promotions).values(promotionsData).returning();
    console.log(`✅ Created ${createdPromotions.length} promotions`);

    console.log('');
    console.log('✨ Database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - ${categories.length} service categories`);
    console.log(`   - ${createdServices.length} services`);
    console.log(`   - ${createdPackages.length} service packages`);
    console.log(`   - ${createdSpareParts.length} spare parts`);
    console.log(`   - ${createdPromotions.length} promotions`);
    console.log('');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log('🎉 Seed script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });
