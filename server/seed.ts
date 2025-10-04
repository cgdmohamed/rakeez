import dotenv from 'dotenv';
dotenv.config();

import { db } from './db';
import { 
  serviceCategories, services, servicePackages, spareParts, promotions, faqs,
  users, addresses, bookings, payments, wallets, reviews,
  type InsertServiceCategory, type InsertService, type InsertServicePackage,
  type InsertSparePart, type InsertPromotion, type InsertFaq
} from '@shared/schema';
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

    // 6. Seed FAQs
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

    // 7. Seed Demo Users (Admin, Technicians, Customers)
    console.log('👥 Seeding demo users...');
    const defaultPassword = await bcrypt.hash('admin123', 10);
    
    const demoUsers = await db.insert(users).values([
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

    // 9. Seed Demo Bookings
    console.log('📅 Seeding demo bookings...');
    const technicians = demoUsers.filter(u => u.role === 'technician');
    const demoBookings = [];
    
    // Create varied bookings with different statuses
    if (customers.length > 0 && createdServices.length > 0 && createdAddresses.length > 0 && technicians.length > 0) {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      demoBookings.push(
        {
          userId: customers[0].id,
          serviceId: createdServices[0].id,
          packageId: createdPackages.length > 0 ? createdPackages[0].id : null,
          addressId: createdAddresses[0].id,
          technicianId: technicians[0].id,
          scheduledDate: yesterday.toISOString().split('T')[0],
          scheduledTime: '10:00',
          status: 'completed',
          serviceCost: '150.00',
          totalAmount: '172.50',
          vatAmount: '22.50',
          completedAt: yesterday,
          createdAt: lastWeek,
        } as any,
        {
          userId: customers.length > 1 ? customers[1].id : customers[0].id,
          serviceId: createdServices.length > 2 ? createdServices[2].id : createdServices[0].id,
          addressId: createdAddresses.length > 1 ? createdAddresses[1].id : createdAddresses[0].id,
          technicianId: technicians.length > 1 ? technicians[1].id : technicians[0].id,
          scheduledDate: today.toISOString().split('T')[0],
          scheduledTime: '14:00',
          status: 'confirmed',
          serviceCost: '250.00',
          totalAmount: '287.50',
          vatAmount: '37.50',
          createdAt: yesterday,
        } as any,
        {
          userId: customers.length > 2 ? customers[2].id : customers[0].id,
          serviceId: createdServices.length > 4 ? createdServices[4].id : createdServices[0].id,
          addressId: createdAddresses.length > 2 ? createdAddresses[2].id : createdAddresses[0].id,
          scheduledDate: new Date(today.getTime() + 86400000).toISOString().split('T')[0], // Tomorrow
          scheduledTime: '09:00',
          status: 'pending',
          serviceCost: '300.00',
          totalAmount: '345.00',
          vatAmount: '45.00',
          createdAt: today,
        } as any,
        {
          userId: customers[0].id,
          serviceId: createdServices.length > 6 ? createdServices[6].id : createdServices[1].id,
          addressId: createdAddresses[0].id,
          technicianId: technicians[0].id,
          scheduledDate: new Date(lastWeek.getTime() - 86400000).toISOString().split('T')[0],
          scheduledTime: '16:00',
          status: 'completed',
          serviceCost: '200.00',
          totalAmount: '230.00',
          vatAmount: '30.00',
          completedAt: lastWeek,
          createdAt: new Date(lastWeek.getTime() - 172800000),
        } as any,
        {
          userId: customers.length > 1 ? customers[1].id : customers[0].id,
          serviceId: createdServices.length > 8 ? createdServices[8].id : createdServices[1].id,
          addressId: createdAddresses.length > 1 ? createdAddresses[1].id : createdAddresses[0].id,
          scheduledDate: yesterday.toISOString().split('T')[0],
          scheduledTime: '11:00',
          status: 'in_progress',
          serviceCost: '100.00',
          totalAmount: '115.00',
          vatAmount: '15.00',
          createdAt: new Date(yesterday.getTime() - 86400000),
        } as any,
        {
          userId: customers.length > 2 ? customers[2].id : customers[0].id,
          serviceId: createdServices.length > 10 ? createdServices[10].id : createdServices[2].id,
          addressId: createdAddresses.length > 2 ? createdAddresses[2].id : createdAddresses[0].id,
          technicianId: technicians.length > 1 ? technicians[1].id : technicians[0].id,
          scheduledDate: new Date(lastWeek.getTime() - 172800000).toISOString().split('T')[0],
          scheduledTime: '15:30',
          status: 'completed',
          serviceCost: '400.00',
          totalAmount: '460.00',
          vatAmount: '60.00',
          completedAt: new Date(lastWeek.getTime() - 172800000),
          createdAt: new Date(lastWeek.getTime() - 259200000),
        } as any
      );
    }
    
    const createdBookings = await db.insert(bookings).values(demoBookings).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdBookings.length} demo bookings`);

    // 10. Seed Demo Payments
    console.log('💳 Seeding demo payments...');
    const demoPayments = [];
    const completedBookings = createdBookings.filter(b => b.status === 'completed');
    
    for (const booking of completedBookings) {
      demoPayments.push({
        bookingId: booking.id,
        userId: booking.userId,
        amount: booking.totalAmount || '0.00',
        paymentMethod: 'wallet' as const,
        walletAmount: booking.totalAmount || '0.00',
        gatewayAmount: '0.00',
        status: 'paid' as const,
      });
    }
    
    const createdPayments = await db.insert(payments).values(demoPayments).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdPayments.length} demo payments`);

    // 11. Seed Demo Reviews
    console.log('⭐ Seeding demo reviews...');
    const demoReviews = [];
    
    for (const booking of completedBookings.slice(0, 3)) {
      demoReviews.push({
        bookingId: booking.id,
        userId: booking.userId,
        serviceId: booking.serviceId,
        technicianId: booking.technicianId || technicians[0].id,
        serviceRating: 4.5,
        technicianRating: 5,
        comment: 'Excellent service! Very professional and thorough.',
        commentAr: 'خدمة ممتازة! احترافية جداً ودقيقة.',
      });
    }
    
    const createdReviews = await db.insert(reviews).values(demoReviews).onConflictDoNothing().returning();
    console.log(`✅ Created ${createdReviews.length} demo reviews`);

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
    console.log(`   - ${demoUsers.length} demo users (1 admin, ${technicians.length} technicians, ${customers.length} customers)`);
    console.log(`   - ${createdAddresses.length} demo addresses`);
    console.log(`   - ${createdBookings.length} demo bookings`);
    console.log(`   - ${createdPayments.length} demo payments`);
    console.log(`   - ${createdReviews.length} demo reviews`);
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
