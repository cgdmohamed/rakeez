import dotenv from 'dotenv';
dotenv.config();

import { db } from './db';
import { 
  serviceCategories, services, servicePackages, spareParts, promotions, faqs,
  users, addresses, bookings, payments, wallets, reviews,
  quotations, notifications, supportTickets, supportMessages, walletTransactions,
  referralCampaigns,
  type InsertServiceCategory, type InsertService, type InsertServicePackage,
  type InsertSparePart, type InsertPromotion, type InsertFaq
} from '@shared/schema';
import { sql, inArray } from 'drizzle-orm';
import bcrypt from 'bcrypt';

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
    ]).onConflictDoNothing().returning();

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

    const createdServices = await db.insert(services).values(servicesData).onConflictDoNothing().returning();
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

    const createdPackages = await db.insert(servicePackages).values(packagesData).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdPackages.length} service packages`);

    // 4. Seed Spare Parts
    console.log('🔩 Seeding spare parts...');
    const sparePartsData = [
      {
        name: JSON.stringify({ en: 'AC Filter', ar: 'فلتر مكيف' }),
        description: JSON.stringify({ en: 'High-quality air filter for AC units', ar: 'فلتر هواء عالي الجودة للمكيف' }),
        category: 'AC Parts',
        brand: 'Carrier',
        price: '50.00',
        stock: 100,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Carpet Cleaner Solution', ar: 'منظف السجاد' }),
        description: JSON.stringify({ en: 'Professional carpet cleaning solution', ar: 'محلول تنظيف احترافي للسجاد' }),
        category: 'Cleaning Supplies',
        brand: 'CleanPro',
        price: '75.00',
        stock: 50,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Professional Mop', ar: 'ممسحة احترافية' }),
        description: JSON.stringify({ en: 'Industrial-grade mop for heavy cleaning', ar: 'ممسحة صناعية للتنظيف الثقيل' }),
        category: 'Equipment',
        brand: 'Vileda',
        price: '120.00',
        stock: 30,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Vacuum Cleaner Bag', ar: 'كيس مكنسة كهربائية' }),
        description: JSON.stringify({ en: 'Replacement vacuum cleaner bag', ar: 'كيس مكنسة كهربائية قابل للاستبدال' }),
        category: 'Equipment',
        brand: 'Hoover',
        price: '25.00',
        stock: 200,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Glass Cleaner', ar: 'منظف زجاج' }),
        description: JSON.stringify({ en: 'Streak-free glass cleaner', ar: 'منظف زجاج خالي من الخطوط' }),
        category: 'Cleaning Supplies',
        brand: 'Windex',
        price: '35.00',
        stock: 80,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Cleaning Gloves', ar: 'قفازات تنظيف' }),
        description: JSON.stringify({ en: 'Protective rubber gloves', ar: 'قفازات مطاطية للحماية' }),
        category: 'Safety Equipment',
        brand: 'Marigold',
        price: '15.00',
        stock: 150,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Air Freshener', ar: 'معطر جو' }),
        description: JSON.stringify({ en: 'Rose-scented air freshener', ar: 'معطر جو برائحة الورد' }),
        category: 'Cleaning Supplies',
        brand: 'Glade',
        price: '40.00',
        stock: 90,
        image: null,
        isActive: true,
      },
      {
        name: JSON.stringify({ en: 'Multi-Purpose Cleaner', ar: 'منظف متعدد الأغراض' }),
        description: JSON.stringify({ en: 'All-surface cleaning solution', ar: 'منظف شامل لجميع الأسطح' }),
        category: 'Cleaning Supplies',
        brand: 'Dettol',
        price: '60.00',
        stock: 120,
        image: null,
        isActive: true,
      },
    ];

    const createdSpareParts = await db.insert(spareParts).values(sparePartsData).onConflictDoNothing().returning();
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

    const createdPromotions = await db.insert(promotions).values(promotionsData).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdPromotions.length} promotions`);

    // 6. Seed Referral Campaigns
    console.log('🎁 Seeding referral campaigns...');
    const referralCampaignsData = [
      {
        name: JSON.stringify({ 
          en: 'Spring Referral Campaign', 
          ar: 'حملة إحالة الربيع' 
        }),
        description: JSON.stringify({ 
          en: 'Refer friends and earn rewards this spring season!', 
          ar: 'أحل أصدقائك واربح مكافآت في موسم الربيع!' 
        }),
        inviterReward: '25.00',
        inviteeDiscountType: 'fixed' as const,
        inviteeDiscountValue: '15.00',
        maxUsagePerUser: 5,
        validFrom: now,
        validUntil: futureDate,
        isActive: true,
      },
      {
        name: JSON.stringify({ 
          en: 'VIP Referral Program', 
          ar: 'برنامج الإحالة المميز' 
        }),
        description: JSON.stringify({ 
          en: 'Premium referral program with higher rewards', 
          ar: 'برنامج إحالة مميز بمكافآت أعلى' 
        }),
        inviterReward: '50.00',
        inviteeDiscountType: 'percentage' as const,
        inviteeDiscountValue: '20.00',
        maxUsagePerUser: 3,
        validFrom: now,
        validUntil: futureDate,
        isActive: false,
      },
    ];

    const createdReferralCampaigns = await db.insert(referralCampaigns).values(referralCampaignsData).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdReferralCampaigns.length} referral campaigns`);

    // 7. Seed FAQs
    console.log('📚 Seeding FAQs...');
    const faqsData: InsertFaq[] = [
      {
        category: 'general',
        question: JSON.stringify({ 
          en: 'What services do you offer?', 
          ar: 'ما هي الخدمات التي تقدمونها؟' 
        }),
        answer: JSON.stringify({ 
          en: 'We offer professional cleaning services including home cleaning, office cleaning, deep cleaning, carpet cleaning, window cleaning, and AC maintenance.', 
          ar: 'نقدم خدمات تنظيف احترافية تشمل تنظيف المنازل والمكاتب والتنظيف العميق وتنظيف السجاد والنوافذ وصيانة المكيفات.' 
        }),
        sortOrder: 1,
        isActive: true,
      },
      {
        category: 'general',
        question: JSON.stringify({ 
          en: 'What areas do you serve?', 
          ar: 'ما هي المناطق التي تخدمونها؟' 
        }),
        answer: JSON.stringify({ 
          en: 'We serve all major cities in Saudi Arabia including Riyadh, Jeddah, Dammam, and surrounding areas.', 
          ar: 'نخدم جميع المدن الرئيسية في المملكة العربية السعودية بما في ذلك الرياض وجدة والدمام والمناطق المحيطة بها.' 
        }),
        sortOrder: 2,
        isActive: true,
      },
      {
        category: 'booking',
        question: JSON.stringify({ 
          en: 'How do I book a service?', 
          ar: 'كيف أحجز خدمة؟' 
        }),
        answer: JSON.stringify({ 
          en: 'You can book through our mobile app by selecting the service, choosing date and time, and confirming your booking. A technician will be assigned to you shortly.', 
          ar: 'يمكنك الحجز من خلال تطبيق الهاتف المحمول عن طريق اختيار الخدمة وتحديد التاريخ والوقت وتأكيد الحجز. سيتم تعيين فني لك قريباً.' 
        }),
        sortOrder: 1,
        isActive: true,
      },
      {
        category: 'booking',
        question: JSON.stringify({ 
          en: 'Can I cancel or reschedule my booking?', 
          ar: 'هل يمكنني إلغاء أو إعادة جدولة حجزي؟' 
        }),
        answer: JSON.stringify({ 
          en: 'Yes, you can cancel or reschedule up to 24 hours before the scheduled service time without any charges.', 
          ar: 'نعم، يمكنك الإلغاء أو إعادة الجدولة حتى 24 ساعة قبل موعد الخدمة المحدد دون أي رسوم.' 
        }),
        sortOrder: 2,
        isActive: true,
      },
      {
        category: 'payment',
        question: JSON.stringify({ 
          en: 'What payment methods do you accept?', 
          ar: 'ما هي طرق الدفع المتاحة؟' 
        }),
        answer: JSON.stringify({ 
          en: 'We accept credit/debit cards, Mada, Apple Pay through Moyasar gateway, and Buy Now Pay Later options through Tabby. You can also pay using your wallet balance.', 
          ar: 'نقبل بطاقات الائتمان/الخصم ومدى وApple Pay عبر بوابة ميسر، وخيارات الشراء الآن والدفع لاحقاً عبر تابي. يمكنك أيضاً الدفع باستخدام رصيد محفظتك.' 
        }),
        sortOrder: 1,
        isActive: true,
      },
      {
        category: 'payment',
        question: JSON.stringify({ 
          en: 'When do I pay for the service?', 
          ar: 'متى أدفع ثمن الخدمة؟' 
        }),
        answer: JSON.stringify({ 
          en: 'Payment is required after the technician provides a quotation and you approve it. You can pay online through the app or in cash to the technician.', 
          ar: 'الدفع مطلوب بعد أن يقدم الفني عرض السعر وتوافق عليه. يمكنك الدفع عبر الإنترنت من خلال التطبيق أو نقداً للفني.' 
        }),
        sortOrder: 2,
        isActive: true,
      },
      {
        category: 'payment',
        question: JSON.stringify({ 
          en: 'Do you offer refunds?', 
          ar: 'هل تقدمون استرداد المبالغ؟' 
        }),
        answer: JSON.stringify({ 
          en: 'Yes, if you are not satisfied with the service, you can request a refund within 24 hours. We will review and process it accordingly.', 
          ar: 'نعم، إذا لم تكن راضياً عن الخدمة، يمكنك طلب استرداد المبلغ خلال 24 ساعة. سنقوم بالمراجعة والمعالجة وفقاً لذلك.' 
        }),
        sortOrder: 3,
        isActive: true,
      },
      {
        category: 'services',
        question: JSON.stringify({ 
          en: 'How long does a typical cleaning service take?', 
          ar: 'كم من الوقت تستغرق خدمة التنظيف النموذجية؟' 
        }),
        answer: JSON.stringify({ 
          en: 'Service duration varies by type: Basic cleaning takes 2-3 hours, Deep cleaning 4-6 hours, and specialized services like carpet or AC cleaning take 2-4 hours.', 
          ar: 'مدة الخدمة تختلف حسب النوع: التنظيف الأساسي يستغرق 2-3 ساعات، التنظيف العميق 4-6 ساعات، والخدمات المتخصصة مثل تنظيف السجاد أو المكيفات تستغرق 2-4 ساعات.' 
        }),
        sortOrder: 1,
        isActive: true,
      },
      {
        category: 'services',
        question: JSON.stringify({ 
          en: 'Do I need to provide cleaning supplies?', 
          ar: 'هل أحتاج لتوفير مواد التنظيف؟' 
        }),
        answer: JSON.stringify({ 
          en: 'No, our technicians come fully equipped with professional-grade cleaning supplies and equipment. However, you can request to use your own supplies if preferred.', 
          ar: 'لا، يأتي فنيونا مجهزين بالكامل بمواد ومعدات تنظيف احترافية. ومع ذلك، يمكنك طلب استخدام مواد التنظيف الخاصة بك إذا كنت تفضل ذلك.' 
        }),
        sortOrder: 2,
        isActive: true,
      },
    ];

    const createdFaqs = await db.insert(faqs).values(faqsData).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdFaqs.length} FAQs`);

    // 8. Seed Demo Users (Admin, Technicians, Customers)
    console.log('👥 Seeding demo users...');
    const defaultPassword = await bcrypt.hash('admin123', 10);
    
    let demoUsers = await db.insert(users).values([
      {
        email: 'admin@rakeez.sa',
        password: defaultPassword,
        name: 'Admin User',
        role: 'admin',
        language: 'en',
        isVerified: true,
      },
      {
        email: 'tech@rakeez.sa',
        password: defaultPassword,
        name: 'Technician User',
        role: 'technician',
        language: 'en',
        isVerified: true,
      },
      {
        email: 'ahmed.tech@rakeez.sa',
        phone: '+966501234567',
        password: defaultPassword,
        name: 'Ahmed Al-Rashid',
        nameAr: 'أحمد الراشد',
        role: 'technician',
        language: 'ar',
        isVerified: true,
      },
      {
        email: 'customer1@example.com',
        phone: '+966512345678',
        password: defaultPassword,
        name: 'Sarah Johnson',
        role: 'customer',
        language: 'en',
        isVerified: true,
      },
      {
        email: 'customer2@example.com',
        phone: '+966523456789',
        password: defaultPassword,
        name: 'Mohammed Al-Harbi',
        nameAr: 'محمد الحربي',
        role: 'customer',
        language: 'ar',
        isVerified: true,
      },
      {
        email: 'customer3@example.com',
        phone: '+966534567890',
        password: defaultPassword,
        name: 'Fatima Al-Salem',
        nameAr: 'فاطمة السالم',
        role: 'customer',
        language: 'ar',
        isVerified: true,
      },
    ]).onConflictDoNothing().returning();
    
    console.log(`✅ Created ${demoUsers.length} demo users`);
    
    // If users already exist, fetch them
    if (demoUsers.length === 0) {
      console.log('   ℹ️  Demo users already exist, fetching them...');
      const demoEmails = ['admin@rakeez.sa', 'tech@rakeez.sa', 'ahmed.tech@rakeez.sa', 'customer1@example.com', 'customer2@example.com', 'customer3@example.com'];
      demoUsers = await db.select().from(users).where(inArray(users.email, demoEmails));
      console.log(`   ✅ Fetched ${demoUsers.length} existing demo users`);
    }

    // Create wallets for all users
    for (const user of demoUsers) {
      await db.insert(wallets).values({
        userId: user.id,
        balance: user.role === 'customer' ? '500.00' : '0.00', // Give customers starting balance
      }).onConflictDoNothing();
    }
    console.log(`✅ Created wallets for ${demoUsers.length} users`);

    // 8. Seed Demo Addresses for Customers
    console.log('🏠 Seeding demo addresses...');
    const customers = demoUsers.filter(u => u.role === 'customer');
    const demoAddresses = [];
    
    for (const customer of customers) {
      demoAddresses.push({
        userId: customer.id,
        label: 'Home',
        address: 'King Fahd Road, Al Olaya District',
        addressAr: 'طريق الملك فهد، حي العليا',
        city: 'Riyadh',
        latitude: '24.7136',
        longitude: '46.6753',
        isDefault: true,
      });
    }
    
    const createdAddresses = await db.insert(addresses).values(demoAddresses).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdAddresses.length} demo addresses`);

    // 9. Seed Demo Bookings (temporarily skipped due to timestamp issues)
    console.log('📅 Seeding demo bookings (skipped for now)...');
    const technicians = demoUsers.filter(u => u.role === 'technician');
    const demoBookings = [];
    
    // Create varied bookings with different statuses
    if (customers.length > 0 && createdServices.length > 0 && createdAddresses.length > 0 && technicians.length > 0) {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const lastWeek = new Date();
      lastWeek.setDate(today.getDate() - 7);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(today.getDate() - 2);
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(today.getDate() - 8);
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(today.getDate() - 10);
      
      // Simplified bookings with only required fields
      const booking1 = {
        userId: customers[0].id,
        serviceId: createdServices[0].id,
        addressId: createdAddresses[0].id,
        technicianId: technicians[0].id,
        scheduledDate: yesterday.toISOString().split('T')[0],
        scheduledTime: '10:00',
        status: 'completed' as const,
        serviceCost: '150.00',
        totalAmount: '172.50',
        vatAmount: '22.50',
      };
      
      const booking2 = {
        userId: customers.length > 1 ? customers[1].id : customers[0].id,
        serviceId: createdServices.length > 2 ? createdServices[2].id : createdServices[0].id,
        addressId: createdAddresses.length > 1 ? createdAddresses[1].id : createdAddresses[0].id,
        technicianId: technicians.length > 1 ? technicians[1].id : technicians[0].id,
        scheduledDate: today.toISOString().split('T')[0],
        scheduledTime: '14:00',
        status: 'confirmed' as const,
        serviceCost: '250.00',
        totalAmount: '287.50',
        vatAmount: '37.50',
      };
      
      const booking3 = {
        userId: customers.length > 2 ? customers[2].id : customers[0].id,
        serviceId: createdServices.length > 4 ? createdServices[4].id : createdServices[0].id,
        addressId: createdAddresses.length > 2 ? createdAddresses[2].id : createdAddresses[0].id,
        scheduledDate: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
        scheduledTime: '09:00',
        status: 'pending' as const,
        serviceCost: '300.00',
        totalAmount: '345.00',
        vatAmount: '45.00',
      };
      
      demoBookings.push(booking1, booking2, booking3);
    }
    
    const createdBookings: any[] = [];
    // Bookings temporarily skipped due to timestamp formatting issues
    console.log(`✅ Skipped ${demoBookings.length} demo bookings (timestamp issue)`);

    // 10. Seed Wallet Transactions
    console.log('💰 Seeding wallet transactions...');
    const walletTransactionsData = [];
    for (const customer of customers) {
      walletTransactionsData.push({
        walletId: (await db.select().from(wallets).where(sql`${wallets.userId} = ${customer.id}`))[0]?.id,
        userId: customer.id,
        type: 'credit' as const,
        amount: '500.00',
        balanceBefore: '0.00',
        balanceAfter: '500.00',
        description: 'Initial wallet credit',
        referenceType: 'system',
      });
      walletTransactionsData.push({
        walletId: (await db.select().from(wallets).where(sql`${wallets.userId} = ${customer.id}`))[0]?.id,
        userId: customer.id,
        type: 'debit' as const,
        amount: '150.00',
        balanceBefore: '500.00',
        balanceAfter: '350.00',
        description: 'Payment for cleaning service',
        referenceType: 'booking',
      });
    }
    const createdWalletTransactions = await db.insert(walletTransactions).values(walletTransactionsData).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdWalletTransactions.length} wallet transactions`);

    // 11. Seed Quotations (skipped - requires bookings)
    console.log('📋 Seeding quotations (skipped - requires bookings)...');
    const createdQuotations: any[] = [];
    console.log(`✅ Skipped quotations (depends on bookings)`);

    // 12. Seed Notifications
    console.log('🔔 Seeding notifications...');
    const notificationsData = [];
    for (const customer of customers) {
      notificationsData.push({
        userId: customer.id,
        type: 'order_update' as const,
        title: JSON.stringify({ en: 'Booking Confirmed', ar: 'تم تأكيد الحجز' }),
        body: JSON.stringify({ 
          en: 'Your cleaning service has been confirmed for tomorrow at 10:00 AM', 
          ar: 'تم تأكيد خدمة التنظيف الخاصة بك لغداً الساعة 10:00 صباحاً' 
        }),
        isRead: false,
      });
      notificationsData.push({
        userId: customer.id,
        type: 'payment_confirmation' as const,
        title: JSON.stringify({ en: 'Payment Successful', ar: 'تم الدفع بنجاح' }),
        body: JSON.stringify({ 
          en: 'Your payment of SAR 172.50 has been processed successfully', 
          ar: 'تمت معالجة دفعتك البالغة 172.50 ريال سعودي بنجاح' 
        }),
        isRead: true,
      });
      notificationsData.push({
        userId: customer.id,
        type: 'promotional' as const,
        title: JSON.stringify({ en: 'Special Offer!', ar: 'عرض خاص!' }),
        body: JSON.stringify({ 
          en: 'Get 20% off on your next deep cleaning service', 
          ar: 'احصل على خصم 20٪ على خدمة التنظيف العميق القادمة' 
        }),
        isRead: false,
      });
    }
    const createdNotifications = await db.insert(notifications).values(notificationsData).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdNotifications.length} notifications`);

    // 13. Seed Support Tickets
    console.log('💬 Seeding support tickets...');
    const supportTicketsData = [];
    const createdTickets: any[] = [];
    if (customers.length > 0) {
      supportTicketsData.push({
        userId: customers[0].id,
        subject: 'Issue with booking cancellation',
        priority: 'high',
        status: 'open' as const,
      });
      supportTicketsData.push({
        userId: customers.length > 1 ? customers[1].id : customers[0].id,
        subject: 'Question about payment methods',
        priority: 'medium',
        status: 'in_progress' as const,
      });
      supportTicketsData.push({
        userId: customers.length > 2 ? customers[2].id : customers[0].id,
        subject: 'Feedback on service quality',
        priority: 'low',
        status: 'resolved' as const,
      });
      
      const tickets = await db.insert(supportTickets).values(supportTicketsData).onConflictDoNothing().returning();
      createdTickets.push(...tickets);
      console.log(`✅ Created ${tickets.length} support tickets`);
      
      // 14. Seed Support Messages
      console.log('💬 Seeding support messages...');
      const supportMessagesData = [];
      for (const ticket of createdTickets) {
        supportMessagesData.push({
          ticketId: ticket.id,
          senderId: ticket.userId,
          message: 'I need help with this issue. Can you please assist me?',
          isInternal: false,
        });
        supportMessagesData.push({
          ticketId: ticket.id,
          senderId: demoUsers.find(u => u.role === 'admin')?.id || demoUsers[0].id,
          message: 'Thank you for contacting us. We are looking into your issue and will get back to you shortly.',
          isInternal: false,
        });
      }
      const createdMessages = await db.insert(supportMessages).values(supportMessagesData).onConflictDoNothing().returning();
      console.log(`✅ Created ${createdMessages.length} support messages`);
    }

    console.log('');
    console.log('✨ Database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - ${categories.length} service categories`);
    console.log(`   - ${createdServices.length} services`);
    console.log(`   - ${createdPackages.length} service packages`);
    console.log(`   - ${createdSpareParts.length} spare parts`);
    console.log(`   - ${createdPromotions.length} promotions`);
    console.log(`   - ${createdFaqs.length} FAQs`);
    console.log(`   - ${demoUsers.length} demo users (1 admin, ${demoUsers.filter(u => u.role === 'technician').length} technicians, ${customers.length} customers)`);
    console.log(`   - ${createdAddresses.length} demo addresses`);
    console.log(`   - ${createdWalletTransactions.length} wallet transactions`);
    console.log(`   - ${createdQuotations.length} quotations (various statuses)`);
    console.log(`   - ${createdNotifications.length} notifications`);
    console.log(`   - ${createdTickets.length} support tickets with messages`);
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
