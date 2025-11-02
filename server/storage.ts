import { 
  roles, users, addresses, serviceCategories, services, serviceTiers, subscriptionPackages, subscriptionPackageServices,
  brands, spareParts, bookings, quotations, quotationSpareParts, payments, 
  wallets, walletTransactions, referrals, notifications, supportTickets, 
  supportMessages, faqs, reviews, promotions, auditLogs, webhookEvents, 
  orderStatusLogs, invoices, subscriptions, homeSliderImages, homeBanner,
  coupons, couponUsages, creditTransactions, loyaltySettings, marketingSettings,
  type Role, type InsertRole, type User, type InsertUser, type Address, type InsertAddress,
  type ServiceCategory, type InsertServiceCategory, type Service, type InsertService,
  type ServiceTier, type InsertServiceTier, type SubscriptionPackage, type InsertSubscriptionPackage,
  type SubscriptionPackageService, type InsertSubscriptionPackageService,
  type Brand, type InsertBrand, type SparePart, type InsertSparePart,
  type Booking, type InsertBooking, type Quotation, type InsertQuotation,
  type Payment, type InsertPayment, type Wallet, type WalletTransaction, type InsertWalletTransaction,
  type Referral, type InsertReferral, type Notification, type InsertNotification,
  type SupportTicket, type InsertSupportTicket, type SupportMessage, type InsertSupportMessage,
  type Faq, type InsertFaq, type Review, type InsertReview, type Promotion, type InsertPromotion,
  type AuditLog, type InsertAuditLog, type WebhookEvent, type OrderStatusLog,
  type Subscription, type InsertSubscription,
  type HomeSliderImage, type InsertHomeSliderImage, type HomeBanner, type InsertHomeBanner,
  type MarketingSettings, type InsertMarketingSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, asc, gte, lte, like, ilike, sql, count } from "drizzle-orm";

export interface IStorage {
  // Roles (Custom Role Management)
  getRoles(isActive?: boolean): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  getAllUsers(role?: string, status?: string): Promise<User[]>;
  getInternalUsers(status?: string): Promise<User[]>;
  updateUserStatus(id: string, status: string): Promise<void>;
  updateUserLastLogin(id: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  
  // Addresses
  getUserAddresses(userId: string): Promise<Address[]>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address>;
  deleteAddress(id: string): Promise<void>;
  getAddress(id: string): Promise<Address | undefined>;
  
  // Services and Categories
  getServiceCategories(language?: string): Promise<ServiceCategory[]>;
  getServicesByCategory(categoryId: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  getServiceTiers(serviceId: string): Promise<ServiceTier[]>;
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  createService(service: InsertService): Promise<Service>;
  createServiceTier(tier: InsertServiceTier): Promise<ServiceTier>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service>;
  updateServiceCategory(id: string, category: Partial<InsertServiceCategory>): Promise<ServiceCategory>;
  updateServiceTier(id: string, tier: Partial<InsertServiceTier>): Promise<ServiceTier>;
  deleteService(id: string): Promise<void>;
  deleteServiceCategory(id: string): Promise<void>;
  deleteServiceTier(id: string): Promise<void>;
  
  // Subscription Packages
  getSubscriptionPackages(tier?: string): Promise<SubscriptionPackage[]>;
  getSubscriptionPackage(id: string): Promise<SubscriptionPackage | undefined>;
  createSubscriptionPackage(pkg: InsertSubscriptionPackage): Promise<SubscriptionPackage>;
  updateSubscriptionPackage(id: string, pkg: Partial<InsertSubscriptionPackage>): Promise<SubscriptionPackage>;
  deleteSubscriptionPackage(id: string): Promise<void>;
  
  // Subscription Package Services (junction table)
  getSubscriptionPackageServices(packageId: string): Promise<SubscriptionPackageService[]>;
  addServiceToSubscriptionPackage(data: InsertSubscriptionPackageService): Promise<SubscriptionPackageService>;
  removeServiceFromSubscriptionPackage(id: string): Promise<void>;
  
  // Brands
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, brand: Partial<InsertBrand>): Promise<Brand>;
  deleteBrand(id: string): Promise<void>;

  // Spare Parts
  getSpareParts(category?: string): Promise<SparePart[]>;
  getSparePart(id: string): Promise<SparePart | undefined>;
  createSparePart(part: InsertSparePart): Promise<SparePart>;
  updateSparePart(id: string, part: Partial<InsertSparePart>): Promise<SparePart>;
  updateSparePartStock(id: string, quantity: number): Promise<void>;
  deleteSparePart(id: string): Promise<void>;
  
  // Mobile Content - Home Slider
  getHomeSliderImages(): Promise<HomeSliderImage[]>;
  getHomeSliderImage(id: string): Promise<HomeSliderImage | undefined>;
  createHomeSliderImage(image: InsertHomeSliderImage): Promise<HomeSliderImage>;
  updateHomeSliderImage(id: string, image: Partial<InsertHomeSliderImage>): Promise<HomeSliderImage>;
  deleteHomeSliderImage(id: string): Promise<void>;
  reorderHomeSliderImages(imageIds: string[]): Promise<void>;
  
  // Mobile Content - Home Banner
  getActiveBanner(): Promise<HomeBanner | undefined>;
  getHomeBanners(): Promise<HomeBanner[]>;
  getHomeBanner(id: string): Promise<HomeBanner | undefined>;
  createHomeBanner(banner: InsertHomeBanner): Promise<HomeBanner>;
  updateHomeBanner(id: string, banner: Partial<InsertHomeBanner>): Promise<HomeBanner>;
  deleteHomeBanner(id: string): Promise<void>;
  
  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: string): Promise<Booking | undefined>;
  getUserBookings(userId: string, status?: string): Promise<Booking[]>;
  getTechnicianBookings(technicianId: string, status?: string): Promise<Booking[]>;
  updateBookingStatus(id: string, status: string, updatedBy?: string): Promise<void>;
  assignTechnician(bookingId: string, technicianId: string): Promise<void>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking>;
  cancelBookingWithLog(bookingId: string, cancelledBy: string, reason: string): Promise<void>;
  refundBookingPayment(bookingId: string, paymentId: string, refundedBy: string, reason: string): Promise<void>;
  
  // Quotations
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  getQuotation(id: string): Promise<Quotation | undefined>;
  getBookingQuotations(bookingId: string): Promise<Quotation[]>;
  updateQuotationStatus(id: string, status: string, approvedBy?: string): Promise<void>;
  addQuotationSpareParts(quotationId: string, spareParts: Array<{sparePartId: string, quantity: number, unitPrice: number}>): Promise<void>;
  
  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getBookingPayments(bookingId: string): Promise<Payment[]>;
  updatePaymentStatus(id: string, status: string, gatewayData?: any): Promise<void>;
  
  // Wallet
  createWallet(userId: string): Promise<Wallet>;
  getWallet(userId: string): Promise<Wallet | undefined>;
  updateWalletBalance(userId: string, amount: number, type: 'credit' | 'debit', description: string, referenceType?: string, referenceId?: string): Promise<WalletTransaction>;
  getWalletTransactions(userId: string, limit?: number): Promise<WalletTransaction[]>;
  creditWallet(userId: string, amount: number, reason: string, adminId: string): Promise<WalletTransaction>;
  
  // Referrals
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralByCode(code: string): Promise<Referral | undefined>;
  getUserReferrals(userId: string): Promise<Referral[]>;
  updateReferralStatus(id: string, status: string): Promise<void>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string, limit?: number): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<void>;
  
  // Support
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  getUserSupportTickets(userId: string): Promise<SupportTicket[]>;
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;
  getTicketMessages(ticketId: string): Promise<SupportMessage[]>;
  updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<void>;
  updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  
  // FAQs
  getFAQs(category?: string): Promise<Faq[]>;
  getFAQ(id: string): Promise<Faq | undefined>;
  createFAQ(faq: InsertFaq): Promise<Faq>;
  updateFAQ(id: string, faq: Partial<InsertFaq>): Promise<Faq | undefined>;
  deleteFAQ(id: string): Promise<void>;
  
  // Reviews
  createReview(review: InsertReview): Promise<Review>;
  getBookingReview(bookingId: string): Promise<Review | undefined>;
  getTechnicianReviews(technicianId: string): Promise<Review[]>;
  
  // Promotions
  getActivePromotions(): Promise<Promotion[]>;
  getPromotionByCode(code: string): Promise<Promotion | undefined>;
  createPromotion(promotion: InsertPromotion): Promise<Promotion>;
  updatePromotionUsage(id: string): Promise<void>;
  
  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(resourceType?: string, resourceId?: string, limit?: number): Promise<AuditLog[]>;
  
  // Webhook Events
  createWebhookEvent(event: Partial<WebhookEvent>): Promise<WebhookEvent>;
  getWebhookEvents(provider?: string, status?: string): Promise<WebhookEvent[]>;
  updateWebhookEventStatus(id: string, status: string, error?: string): Promise<void>;
  
  // Order Status Logs
  createOrderStatusLog(log: Partial<OrderStatusLog>): Promise<OrderStatusLog>;
  getBookingStatusLogs(bookingId: string): Promise<OrderStatusLog[]>;
  
  // Analytics
  getOrderStats(startDate?: Date, endDate?: Date): Promise<any>;
  getRevenueStats(startDate?: Date, endDate?: Date): Promise<any>;
  getTechnicianStats(technicianId?: string): Promise<any>;
  getTopServices(): Promise<any>;
  getCouponStats(startDate?: Date, endDate?: Date): Promise<any>;
  getCreditStats(startDate?: Date, endDate?: Date): Promise<any>;
  getLoyaltyMetrics(): Promise<any>;
  getMarketingSettings(): Promise<MarketingSettings | null>;
  isMarketingFeatureEnabled(feature: 'coupon' | 'credit' | 'referral' | 'loyalty'): Promise<boolean>;
  updateMarketingSettings(settings: Partial<InsertMarketingSettings>, updatedBy: string): Promise<MarketingSettings>;
  getCustomerMarketingProfile(userId: string): Promise<any>;
  
  // Customer Management
  getCustomerOverview(userId: string): Promise<any>;
  getAllWallets(): Promise<any[]>;
  getAllQuotations(status?: string): Promise<any[]>;
  getAllPayments(startDate?: Date, endDate?: Date): Promise<any[]>;
  getAllNotifications(): Promise<any[]>;
  getAllSupportTickets(status?: string, priority?: string): Promise<any[]>;
  getSupportMessages(ticketId: string): Promise<any[]>;
  updateSparePartStockQuantity(id: string, stockQuantity: number): Promise<void>;
  getUsersByRole(role: string): Promise<any[]>;
  getAllUsers(): Promise<User[]>;
  getBookings(startDate?: Date, endDate?: Date): Promise<Booking[]>;
  
  // Reports
  getSystemReport(startDate?: Date, endDate?: Date): Promise<any>;
  getCustomerReport(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
  
  // Invoices
  createInvoice(invoice: any): Promise<any>;
  getInvoice(invoiceNumber: string): Promise<any>;
  getCustomerInvoices(bookingId: string): Promise<any[]>;
  
  // Subscriptions
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  getUserSubscriptions(userId: string): Promise<Subscription[]>;
  getAllSubscriptions(): Promise<Subscription[]>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription>;
}

export class DatabaseStorage implements IStorage {
  // Roles (Custom Role Management)
  async getRoles(isActive?: boolean): Promise<Role[]> {
    if (isActive !== undefined) {
      return await db.select().from(roles).where(eq(roles.isActive, isActive)).orderBy(asc(roles.name));
    }
    return await db.select().from(roles).orderBy(asc(roles.name));
  }

  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.name, name));
    return role || undefined;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: string, role: Partial<InsertRole>): Promise<Role> {
    const [updatedRole] = await db
      .update(roles)
      .set({ ...role, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return updatedRole;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    
    // Create wallet for new user
    await this.createWallet(newUser.id);
    
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(role?: string, status?: string): Promise<User[]> {
    let query = db.select().from(users);
    const conditions = [];
    
    if (role) {
      conditions.push(eq(users.role, role as any));
    }
    if (status) {
      conditions.push(eq(users.status, status as any));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const usersList = await query.orderBy(desc(users.createdAt));
    return usersList;
  }

  async getInternalUsers(status?: string): Promise<User[]> {
    const internalRoles = ['admin', 'technician', 'support', 'finance'];
    const conditions = [sql`${users.role} IN (${sql.join(internalRoles.map(r => sql`${r}`), sql`, `)})`];
    
    if (status) {
      conditions.push(eq(users.status, status as any));
    }
    
    const usersList = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));
    
    return usersList;
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    await db
      .update(users)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersByRole(role: string): Promise<any[]> {
    const userList = await db
      .select()
      .from(users)
      .where(eq(users.role, role as any))
      .orderBy(desc(users.createdAt));

    // If role is technician, get additional stats for each technician
    if (role === 'technician') {
      const techniciansWithStats = await Promise.all(
        userList.map(async (user) => {
          const stats = await this.getTechnicianStats(user.id);
          return {
            ...user,
            completed_orders: Number(stats.completedOrders) || 0,
            total_revenue: Number(stats.totalRevenue) || 0,
            avg_rating: Number(stats.avgRating) || 0,
          };
        })
      );
      return techniciansWithStats;
    }

    return userList;
  }

  // Addresses
  async getUserAddresses(userId: string): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    const [newAddress] = await db.insert(addresses).values(address).returning();
    return newAddress;
  }

  async updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address> {
    const [updatedAddress] = await db
      .update(addresses)
      .set(address)
      .where(eq(addresses.id, id))
      .returning();
    return updatedAddress;
  }

  async deleteAddress(id: string): Promise<void> {
    await db.delete(addresses).where(eq(addresses.id, id));
  }

  async getAddress(id: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  // Services and Categories
  async getServiceCategories(): Promise<ServiceCategory[]> {
    return await db
      .select()
      .from(serviceCategories)
      .where(eq(serviceCategories.isActive, true))
      .orderBy(asc(serviceCategories.sortOrder));
  }

  async getServicesByCategory(categoryId: string): Promise<Service[]> {
    return await db
      .select()
      .from(services)
      .where(and(eq(services.categoryId, categoryId), eq(services.isActive, true)));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServiceTiers(serviceId: string): Promise<ServiceTier[]> {
    return await db
      .select()
      .from(serviceTiers)
      .where(and(eq(serviceTiers.serviceId, serviceId), eq(serviceTiers.isActive, true)));
  }

  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const [newCategory] = await db.insert(serviceCategories).values(category).returning();
    return newCategory;
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async createServiceTier(tier: InsertServiceTier): Promise<ServiceTier> {
    const [newTier] = await db.insert(serviceTiers).values(tier).returning();
    return newTier;
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service> {
    const [updatedService] = await db
      .update(services)
      .set(service)
      .where(eq(services.id, id))
      .returning();
    return updatedService;
  }

  async updateServiceCategory(id: string, category: Partial<InsertServiceCategory>): Promise<ServiceCategory> {
    const [updatedCategory] = await db
      .update(serviceCategories)
      .set(category)
      .where(eq(serviceCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async updateServiceTier(id: string, tier: Partial<InsertServiceTier>): Promise<ServiceTier> {
    const [updatedTier] = await db
      .update(serviceTiers)
      .set(tier)
      .where(eq(serviceTiers.id, id))
      .returning();
    return updatedTier;
  }

  async deleteService(id: string): Promise<void> {
    await db.update(services).set({ isActive: false }).where(eq(services.id, id));
  }

  async deleteServiceCategory(id: string): Promise<void> {
    await db.update(serviceCategories).set({ isActive: false }).where(eq(serviceCategories.id, id));
  }

  async deleteServiceTier(id: string): Promise<void> {
    await db.update(serviceTiers).set({ isActive: false }).where(eq(serviceTiers.id, id));
  }
  
  // Subscription Packages
  async getSubscriptionPackages(tier?: string): Promise<SubscriptionPackage[]> {
    const conditions = [eq(subscriptionPackages.isActive, true)];
    if (tier) {
      conditions.push(eq(subscriptionPackages.tier, tier as any));
    }
    return await db
      .select()
      .from(subscriptionPackages)
      .where(and(...conditions))
      .orderBy(asc(subscriptionPackages.createdAt));
  }

  async getSubscriptionPackage(id: string): Promise<SubscriptionPackage | undefined> {
    const [pkg] = await db.select().from(subscriptionPackages).where(eq(subscriptionPackages.id, id));
    return pkg || undefined;
  }

  async createSubscriptionPackage(pkg: InsertSubscriptionPackage): Promise<SubscriptionPackage> {
    const [newPackage] = await db.insert(subscriptionPackages).values(pkg).returning();
    return newPackage;
  }

  async updateSubscriptionPackage(id: string, pkg: Partial<InsertSubscriptionPackage>): Promise<SubscriptionPackage> {
    const [updatedPackage] = await db
      .update(subscriptionPackages)
      .set(pkg)
      .where(eq(subscriptionPackages.id, id))
      .returning();
    return updatedPackage;
  }

  async deleteSubscriptionPackage(id: string): Promise<void> {
    await db.update(subscriptionPackages).set({ isActive: false }).where(eq(subscriptionPackages.id, id));
  }

  // Subscription Package Services (junction table)
  async getSubscriptionPackageServices(packageId: string): Promise<SubscriptionPackageService[]> {
    return await db
      .select()
      .from(subscriptionPackageServices)
      .where(eq(subscriptionPackageServices.packageId, packageId));
  }

  async addServiceToSubscriptionPackage(data: InsertSubscriptionPackageService): Promise<SubscriptionPackageService> {
    const [newEntry] = await db.insert(subscriptionPackageServices).values(data).returning();
    return newEntry;
  }

  async removeServiceFromSubscriptionPackage(id: string): Promise<void> {
    await db.delete(subscriptionPackageServices).where(eq(subscriptionPackageServices.id, id));
  }

  async deleteSparePart(id: string): Promise<void> {
    await db.update(spareParts).set({ isActive: false }).where(eq(spareParts.id, id));
  }

  // Brands
  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brands).orderBy(asc(brands.name));
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [brand] = await db.select().from(brands).where(eq(brands.id, id));
    return brand || undefined;
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    const [newBrand] = await db.insert(brands).values(brand).returning();
    return newBrand;
  }

  async updateBrand(id: string, brand: Partial<InsertBrand>): Promise<Brand> {
    const [updatedBrand] = await db
      .update(brands)
      .set(brand)
      .where(eq(brands.id, id))
      .returning();
    return updatedBrand;
  }

  async deleteBrand(id: string): Promise<void> {
    await db.update(brands).set({ isActive: false }).where(eq(brands.id, id));
  }

  // Mobile Content - Home Slider
  async getHomeSliderImages(): Promise<HomeSliderImage[]> {
    return await db
      .select()
      .from(homeSliderImages)
      .where(eq(homeSliderImages.isActive, true))
      .orderBy(asc(homeSliderImages.sortOrder));
  }

  async getHomeSliderImage(id: string): Promise<HomeSliderImage | undefined> {
    const [image] = await db
      .select()
      .from(homeSliderImages)
      .where(eq(homeSliderImages.id, id));
    return image || undefined;
  }

  async createHomeSliderImage(image: InsertHomeSliderImage): Promise<HomeSliderImage> {
    return await db.transaction(async (tx) => {
      const isActiveImage = image.isActive !== false;
      
      if (isActiveImage) {
        const existingImages = await tx
          .select()
          .from(homeSliderImages)
          .where(eq(homeSliderImages.isActive, true))
          .for('update');
        
        if (existingImages.length >= 3) {
          throw new Error('Maximum 3 active slider images allowed');
        }
      }
      
      const [newImage] = await tx
        .insert(homeSliderImages)
        .values(image)
        .returning();
      return newImage;
    });
  }

  async updateHomeSliderImage(id: string, image: Partial<InsertHomeSliderImage>): Promise<HomeSliderImage> {
    const [updatedImage] = await db
      .update(homeSliderImages)
      .set({ ...image, updatedAt: new Date() })
      .where(eq(homeSliderImages.id, id))
      .returning();
    return updatedImage;
  }

  async deleteHomeSliderImage(id: string): Promise<void> {
    await db.delete(homeSliderImages).where(eq(homeSliderImages.id, id));
  }

  async reorderHomeSliderImages(imageIds: string[]): Promise<void> {
    for (let i = 0; i < imageIds.length; i++) {
      await db
        .update(homeSliderImages)
        .set({ sortOrder: i + 1, updatedAt: new Date() })
        .where(eq(homeSliderImages.id, imageIds[i]));
    }
  }

  // Mobile Content - Home Banner
  async getActiveBanner(): Promise<HomeBanner | undefined> {
    const [banner] = await db
      .select()
      .from(homeBanner)
      .where(eq(homeBanner.isActive, true))
      .orderBy(desc(homeBanner.createdAt))
      .limit(1);
    return banner || undefined;
  }

  async getHomeBanners(): Promise<HomeBanner[]> {
    return await db
      .select()
      .from(homeBanner)
      .orderBy(desc(homeBanner.createdAt));
  }

  async getHomeBanner(id: string): Promise<HomeBanner | undefined> {
    const [banner] = await db
      .select()
      .from(homeBanner)
      .where(eq(homeBanner.id, id));
    return banner || undefined;
  }

  async createHomeBanner(banner: InsertHomeBanner): Promise<HomeBanner> {
    const [newBanner] = await db
      .insert(homeBanner)
      .values(banner)
      .returning();
    return newBanner;
  }

  async updateHomeBanner(id: string, banner: Partial<InsertHomeBanner>): Promise<HomeBanner> {
    const [updatedBanner] = await db
      .update(homeBanner)
      .set({ ...banner, updatedAt: new Date() })
      .where(eq(homeBanner.id, id))
      .returning();
    return updatedBanner;
  }

  async deleteHomeBanner(id: string): Promise<void> {
    await db.delete(homeBanner).where(eq(homeBanner.id, id));
  }

  // Spare Parts
  async getSpareParts(category?: string): Promise<SparePart[]> {
    const conditions = [eq(spareParts.isActive, true)];
    if (category) {
      conditions.push(eq(spareParts.category, category));
    }
    
    return await db
      .select()
      .from(spareParts)
      .where(and(...conditions));
  }

  async getSparePart(id: string): Promise<SparePart | undefined> {
    const [part] = await db.select().from(spareParts).where(eq(spareParts.id, id));
    return part || undefined;
  }

  async createSparePart(part: InsertSparePart): Promise<SparePart> {
    const [newPart] = await db.insert(spareParts).values(part).returning();
    return newPart;
  }

  async updateSparePart(id: string, part: Partial<InsertSparePart>): Promise<SparePart> {
    const [updatedPart] = await db
      .update(spareParts)
      .set(part)
      .where(eq(spareParts.id, id))
      .returning();
    return updatedPart;
  }

  async updateSparePartStock(id: string, quantity: number): Promise<void> {
    await db
      .update(spareParts)
      .set({ stock: sql`${spareParts.stock} - ${quantity}` })
      .where(eq(spareParts.id, id));
  }

  async updateSparePartStockQuantity(id: string, stockQuantity: number): Promise<void> {
    await db
      .update(spareParts)
      .set({ stock: stockQuantity })
      .where(eq(spareParts.id, id));
  }

  // Bookings
  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    
    // Create initial status log
    await this.createOrderStatusLog({
      bookingId: newBooking.id,
      toStatus: 'pending',
      changedBy: booking.userId,
    });
    
    return newBooking;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getUserBookings(userId: string, status?: string): Promise<Booking[]> {
    const conditions = [eq(bookings.userId, userId)];
    if (status) {
      conditions.push(eq(bookings.status, status as any));
    }
    
    return await db
      .select()
      .from(bookings)
      .where(and(...conditions))
      .orderBy(desc(bookings.createdAt));
  }

  async getTechnicianBookings(technicianId: string, status?: string): Promise<Booking[]> {
    const conditions = [eq(bookings.technicianId, technicianId)];
    if (status) {
      conditions.push(eq(bookings.status, status as any));
    }
    
    return await db
      .select()
      .from(bookings)
      .where(and(...conditions))
      .orderBy(desc(bookings.createdAt));
  }

  async getBookings(startDate?: Date, endDate?: Date): Promise<Booking[]> {
    const conditions = [];
    if (startDate) conditions.push(gte(bookings.createdAt, startDate));
    if (endDate) conditions.push(lte(bookings.createdAt, endDate));
    
    return await db
      .select()
      .from(bookings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(bookings.createdAt));
  }

  async getSystemReport(startDate?: Date, endDate?: Date): Promise<any> {
    // Get comprehensive system statistics
    const orderStats = await this.getOrderStats(startDate, endDate);
    const revenueStats = await this.getRevenueStats(startDate, endDate);
    const technicianStats = await this.getTechnicianStats();
    const couponStats = await this.getCouponStats(startDate, endDate);
    const creditStats = await this.getCreditStats(startDate, endDate);
    const loyaltyMetrics = await this.getLoyaltyMetrics();
    
    // Get user statistics
    const totalUsers = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    
    const customerCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'customer'));
    
    const technicianCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.role, 'technician'));
    
    // Get booking status breakdown
    const bookingsByStatus = await db
      .select({
        status: bookings.status,
        count: sql<number>`count(*)::int`
      })
      .from(bookings)
      .groupBy(bookings.status);
    
    // Get subscription stats
    const activeSubscriptions = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));
    
    // Get support ticket stats
    const ticketsByStatus = await db
      .select({
        status: sql<string>`status`,
        count: sql<number>`count(*)::int`
      })
      .from(sql`support_tickets`)
      .groupBy(sql`status`);
    
    return {
      period: {
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null,
        generated_at: new Date().toISOString()
      },
      users: {
        total: totalUsers[0]?.count || 0,
        customers: customerCount[0]?.count || 0,
        technicians: technicianCount[0]?.count || 0
      },
      bookings: {
        ...orderStats,
        by_status: bookingsByStatus
      },
      revenue: revenueStats,
      technicians: technicianStats,
      marketing: {
        coupons: couponStats,
        credits: creditStats,
        loyalty: loyaltyMetrics
      },
      subscriptions: {
        active: activeSubscriptions[0]?.count || 0
      },
      support: {
        tickets_by_status: ticketsByStatus
      }
    };
  }

  async getCustomerReport(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Get customer basic info
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Get booking conditions
    const bookingConditions = [eq(bookings.userId, userId)];
    if (startDate) bookingConditions.push(gte(bookings.createdAt, startDate));
    if (endDate) bookingConditions.push(lte(bookings.createdAt, endDate));
    
    // Get customer bookings
    const customerBookings = await db
      .select()
      .from(bookings)
      .where(and(...bookingConditions))
      .orderBy(desc(bookings.createdAt));
    
    // Calculate booking statistics
    const totalBookings = customerBookings.length;
    const completedBookings = customerBookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = customerBookings.filter(b => b.status === 'cancelled').length;
    const totalSpent = customerBookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    
    // Get payment history
    const paymentConditions = [eq(payments.userId, userId)];
    if (startDate) paymentConditions.push(gte(payments.createdAt, startDate));
    if (endDate) paymentConditions.push(lte(payments.createdAt, endDate));
    
    const customerPayments = await db
      .select()
      .from(payments)
      .where(and(...paymentConditions))
      .orderBy(desc(payments.createdAt));
    
    const paymentsByMethod = customerPayments.reduce((acc: any, p) => {
      const method = p.method;
      acc[method] = (acc[method] || 0) + parseFloat(p.amount);
      return acc;
    }, {});
    
    // Get wallet info
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, userId)
    });
    
    // Get wallet transactions
    const walletTxns = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50);
    
    // Get credit info
    const creditTxns = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(50);
    
    const totalCreditsEarned = creditTxns
      .filter(c => parseFloat(c.amount) > 0)
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
    
    const totalCreditsUsed = creditTxns
      .filter(c => parseFloat(c.amount) < 0)
      .reduce((sum, c) => sum + Math.abs(parseFloat(c.amount)), 0);
    
    // Get coupon usage
    const couponUsage = await db
      .select()
      .from(couponUsages)
      .where(eq(couponUsages.userId, userId))
      .orderBy(desc(couponUsages.usedAt));
    
    const totalCouponSavings = couponUsage.reduce((sum, c) => sum + parseFloat(c.discountAmount), 0);
    
    // Get referral data
    const customerReferrals = await db
      .select()
      .from(referrals)
      .where(eq(referrals.inviterId, userId));
    
    const totalReferrals = customerReferrals.length;
    const rewardedReferrals = customerReferrals.filter(r => r.status === 'rewarded').length;
    const totalReferralRewards = customerReferrals
      .filter(r => r.status === 'rewarded')
      .reduce((sum, r) => sum + parseFloat(r.inviterReward), 0);
    
    // Get subscriptions
    const customerSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
    
    return {
      period: {
        start_date: startDate?.toISOString() || null,
        end_date: endDate?.toISOString() || null,
        generated_at: new Date().toISOString()
      },
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        language: user.language,
        member_since: user.createdAt
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        total_spent: totalSpent,
        list: customerBookings.slice(0, 20).map(b => ({
          id: b.id,
          service_cost: parseFloat(b.serviceCost),
          total_amount: parseFloat(b.totalAmount),
          status: b.status,
          payment_status: b.paymentStatus,
          scheduled_date: b.scheduledDate,
          created_at: b.createdAt
        }))
      },
      payments: {
        total: customerPayments.length,
        total_amount: customerPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
        by_method: paymentsByMethod,
        list: customerPayments.slice(0, 20).map(p => ({
          id: p.id,
          amount: parseFloat(p.amount),
          method: p.method,
          status: p.status,
          created_at: p.createdAt
        }))
      },
      wallet: {
        balance: wallet ? parseFloat(wallet.balance) : 0,
        total_earned: wallet ? parseFloat(wallet.totalEarned) : 0,
        total_spent: wallet ? parseFloat(wallet.totalSpent) : 0,
        recent_transactions: walletTxns.slice(0, 10).map(t => ({
          type: t.type,
          amount: parseFloat(t.amount),
          balance: parseFloat(t.balance),
          description: t.description,
          created_at: t.createdAt
        }))
      },
      credits: {
        total_earned: totalCreditsEarned,
        total_used: totalCreditsUsed,
        current_balance: totalCreditsEarned - totalCreditsUsed,
        transactions: creditTxns.slice(0, 10).map(c => ({
          type: c.type,
          amount: parseFloat(c.amount),
          balance: parseFloat(c.balance),
          reason: c.reason,
          created_at: c.createdAt
        }))
      },
      coupons: {
        total_used: couponUsage.length,
        total_savings: totalCouponSavings,
        recent_usage: couponUsage.slice(0, 10).map(c => ({
          coupon_code: c.couponCode,
          discount_amount: parseFloat(c.discountAmount),
          used_at: c.usedAt
        }))
      },
      referrals: {
        total: totalReferrals,
        rewarded: rewardedReferrals,
        total_rewards: totalReferralRewards
      },
      subscriptions: {
        total: customerSubscriptions.length,
        active: customerSubscriptions.filter(s => s.status === 'active').length,
        list: customerSubscriptions.map(s => ({
          id: s.id,
          start_date: s.startDate,
          end_date: s.endDate,
          status: s.status,
          total_amount: parseFloat(s.totalAmount)
        }))
      }
    };
  }

  async updateBookingStatus(id: string, status: string, updatedBy?: string): Promise<void> {
    // Get current status
    const currentBooking = await this.getBooking(id);
    
    await db
      .update(bookings)
      .set({ 
        status: status as any, 
        updatedAt: new Date(),
        ...(status === 'in_progress' && { startedAt: new Date() }),
        ...(status === 'completed' && { completedAt: new Date() })
      })
      .where(eq(bookings.id, id));
    
    // Log status change
    await this.createOrderStatusLog({
      bookingId: id,
      fromStatus: currentBooking?.status,
      toStatus: status as any,
      changedBy: updatedBy,
    });
  }

  async assignTechnician(bookingId: string, technicianId: string): Promise<void> {
    await db
      .update(bookings)
      .set({ 
        technicianId, 
        status: 'technician_assigned',
        assignedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(bookings.id, bookingId));
  }

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ ...booking, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  // Quotations
  async createQuotation(quotation: InsertQuotation): Promise<Quotation> {
    const [newQuotation] = await db.insert(quotations).values(quotation).returning();
    return newQuotation;
  }

  async getQuotation(id: string): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation || undefined;
  }

  async getBookingQuotations(bookingId: string): Promise<Quotation[]> {
    return await db
      .select()
      .from(quotations)
      .where(eq(quotations.bookingId, bookingId))
      .orderBy(desc(quotations.createdAt));
  }

  async updateQuotationStatus(id: string, status: string, approvedBy?: string): Promise<void> {
    await db
      .update(quotations)
      .set({ 
        status: status as any,
        ...(status === 'approved' && { approvedAt: new Date(), approvedBy })
      })
      .where(eq(quotations.id, id));
  }

  async addQuotationSpareParts(quotationId: string, spareParts: Array<{sparePartId: string, quantity: number, unitPrice: number}>): Promise<void> {
    const sparePartsData = spareParts.map(part => ({
      quotationId,
      sparePartId: part.sparePartId,
      quantity: part.quantity,
      unitPrice: part.unitPrice.toString(),
      totalPrice: (part.quantity * part.unitPrice).toString(),
    }));

    await db.insert(quotationSpareParts).values(sparePartsData);
  }

  async getAllQuotations(status?: string): Promise<any[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(quotations.status, status as any));
    }

    return await db
      .select({
        id: quotations.id,
        bookingId: quotations.bookingId,
        technicianId: quotations.technicianId,
        status: quotations.status,
        additionalCost: quotations.additionalCost,
        notes: quotations.notes,
        expiresAt: quotations.expiresAt,
        approvedAt: quotations.approvedAt,
        createdAt: quotations.createdAt,
        technicianName: users.name,
      })
      .from(quotations)
      .leftJoin(users, eq(quotations.technicianId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(quotations.createdAt));
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getBookingPayments(bookingId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(desc(payments.createdAt));
  }

  async getPayments(startDate?: Date, endDate?: Date): Promise<Payment[]> {
    const conditions = [];
    if (startDate) conditions.push(gte(payments.createdAt, startDate));
    if (endDate) conditions.push(lte(payments.createdAt, endDate));
    
    return await db
      .select()
      .from(payments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt));
  }

  async updatePaymentStatus(id: string, status: string, gatewayData?: any): Promise<void> {
    await db
      .update(payments)
      .set({ 
        status: status as any,
        updatedAt: new Date(),
        ...(gatewayData && { gatewayResponse: gatewayData })
      })
      .where(eq(payments.id, id));
  }

  async getAllPayments(startDate?: Date, endDate?: Date): Promise<any[]> {
    const conditions = [];
    if (startDate) conditions.push(gte(payments.createdAt, startDate));
    if (endDate) conditions.push(lte(payments.createdAt, endDate));

    return await db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        userId: payments.userId,
        userName: users.name,
        userEmail: users.email,
        paymentMethod: payments.paymentMethod,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        walletAmount: payments.walletAmount,
        gatewayAmount: payments.gatewayAmount,
        refundAmount: payments.refundAmount,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payments.createdAt));
  }

  // Wallet
  async createWallet(userId: string): Promise<Wallet> {
    const [newWallet] = await db.insert(wallets).values({ userId }).returning();
    return newWallet;
  }

  async getWallet(userId: string): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet || undefined;
  }

  async updateWalletBalance(userId: string, amount: number, type: 'credit' | 'debit', description: string, referenceType?: string, referenceId?: string): Promise<WalletTransaction> {
    // Get current wallet
    const wallet = await this.getWallet(userId);
    if (!wallet) throw new Error('Wallet not found');

    const balanceBefore = parseFloat(wallet.balance.toString());
    const balanceAfter = type === 'credit' ? balanceBefore + amount : balanceBefore - amount;

    // Update wallet balance
    await db
      .update(wallets)
      .set({ 
        balance: balanceAfter.toString(),
        updatedAt: new Date(),
        ...(type === 'credit' && { totalEarned: sql`${wallets.totalEarned} + ${amount}` }),
        ...(type === 'debit' && { totalSpent: sql`${wallets.totalSpent} + ${amount}` })
      })
      .where(eq(wallets.userId, userId));

    // Create transaction log
    const [transaction] = await db.insert(walletTransactions).values({
      walletId: wallet.id,
      userId,
      type,
      amount: amount.toString(),
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      description,
      referenceType,
      referenceId,
    }).returning();

    return transaction;
  }

  async getWalletTransactions(userId: string, limit = 50): Promise<WalletTransaction[]> {
    return await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
  }

  async creditWallet(userId: string, amount: number, reason: string, adminId: string): Promise<WalletTransaction> {
    // Get wallet
    const wallet = await this.getWallet(userId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const balanceBefore = parseFloat(wallet.balance.toString());
    const balanceAfter = balanceBefore + amount;

    // Update wallet balance
    await db
      .update(wallets)
      .set({ 
        balance: balanceAfter.toString(),
        totalEarned: sql`${wallets.totalEarned} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(wallets.userId, userId));

    // Create transaction log
    const [transaction] = await db.insert(walletTransactions).values({
      walletId: wallet.id,
      userId,
      type: 'credit',
      amount: amount.toString(),
      balanceBefore: balanceBefore.toString(),
      balanceAfter: balanceAfter.toString(),
      description: 'Admin wallet top-up',
      descriptionAr: 'إضافة رصيد من المسؤول',
      reason,
      referenceType: 'topup',
      referenceId: adminId,
    }).returning();

    return transaction;
  }

  async cancelBookingWithLog(bookingId: string, cancelledBy: string, reason: string): Promise<void> {
    // Update booking status
    await db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // Create order status log
    await this.createOrderStatusLog({
      bookingId,
      toStatus: 'cancelled',
      changedBy: cancelledBy,
      notes: reason,
    });
  }

  async refundBookingPayment(bookingId: string, paymentId: string, refundedBy: string, reason: string): Promise<void> {
    // Get booking and payment
    const booking = await this.getBooking(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    const payment = await this.getPayment(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Verify payment is completed
    if (payment.status !== 'paid') {
      throw new Error('Can only refund completed payments');
    }

    const refundAmount = parseFloat(payment.amount.toString());

    // Update payment status
    await db
      .update(payments)
      .set({
        status: 'refunded',
        refundAmount: refundAmount.toString(),
        refundReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, paymentId));

    // Credit customer wallet with refund amount
    await this.updateWalletBalance(
      booking.userId,
      refundAmount,
      'credit',
      `Refund for booking ${bookingId}`,
      'refund',
      bookingId
    );

    // Update booking payment status
    await db
      .update(bookings)
      .set({
        paymentStatus: 'refunded',
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    // Create audit log
    await this.createAuditLog({
      userId: refundedBy,
      action: 'refund',
      resourceType: 'payment',
      resourceId: paymentId,
      newValues: { refundAmount, reason },
      ipAddress: '',
      userAgent: '',
    });
  }

  async getAllWallets(role?: string): Promise<any[]> {
    if (role) {
      return await db
        .select({
          id: wallets.id,
          userId: wallets.userId,
          balance: wallets.balance,
          totalEarned: wallets.totalEarned,
          totalSpent: wallets.totalSpent,
          createdAt: wallets.createdAt,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
        .from(wallets)
        .leftJoin(users, eq(wallets.userId, users.id))
        .where(eq(users.role, role as any))
        .orderBy(desc(wallets.createdAt));
    } else {
      return await db
        .select({
          id: wallets.id,
          userId: wallets.userId,
          balance: wallets.balance,
          totalEarned: wallets.totalEarned,
          totalSpent: wallets.totalSpent,
          createdAt: wallets.createdAt,
          userName: users.name,
          userEmail: users.email,
          userRole: users.role,
        })
        .from(wallets)
        .leftJoin(users, eq(wallets.userId, users.id))
        .orderBy(desc(wallets.createdAt));
    }
  }

  // Referrals
  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db.insert(referrals).values(referral).returning();
    return newReferral;
  }

  async getReferralByCode(code: string): Promise<Referral | undefined> {
    const [referral] = await db.select().from(referrals).where(eq(referrals.referralCode, code));
    return referral || undefined;
  }

  async getUserReferrals(userId: string): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.inviterId, userId))
      .orderBy(desc(referrals.createdAt));
  }

  async updateReferralStatus(id: string, status: string): Promise<void> {
    await db
      .update(referrals)
      .set({ 
        status: status as any,
        ...(status === 'completed' && { completedAt: new Date() }),
        ...(status === 'rewarded' && { rewardDistributedAt: new Date() })
      })
      .where(eq(referrals.id, id));
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async getAllNotifications(limit = 100): Promise<any[]> {
    return await db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.userId, users.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  // Support
  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [newTicket] = await db.insert(supportTickets).values(ticket).returning();
    return newTicket;
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket || undefined;
  }

  async getUserSupportTickets(userId: string): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getAllSupportTickets(status?: string, priority?: string): Promise<any[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(supportTickets.status, status as any));
    }
    if (priority) {
      conditions.push(eq(supportTickets.priority, priority));
    }

    return await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        priority: supportTickets.priority,
        status: supportTickets.status,
        assignedTo: supportTickets.assignedTo,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportMessages(ticketId: string): Promise<any[]> {
    return await db
      .select({
        id: supportMessages.id,
        ticketId: supportMessages.ticketId,
        senderId: supportMessages.senderId,
        message: supportMessages.message,
        attachments: supportMessages.attachments,
        isInternal: supportMessages.isInternal,
        createdAt: supportMessages.createdAt,
        senderName: users.name,
        senderEmail: users.email,
        senderRole: users.role,
        isAdmin: sql<boolean>`CASE WHEN ${users.role} = 'admin' THEN true ELSE false END`.as('isAdmin'),
      })
      .from(supportMessages)
      .leftJoin(users, eq(supportMessages.senderId, users.id))
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(supportMessages.createdAt);
  }

  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const [newMessage] = await db.insert(supportMessages).values(message).returning();
    return newMessage;
  }

  async getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
    return await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId))
      .orderBy(asc(supportMessages.createdAt));
  }

  async updateTicketStatus(id: string, status: string, assignedTo?: string): Promise<void> {
    await db
      .update(supportTickets)
      .set({ 
        status: status as any,
        updatedAt: new Date(),
        ...(assignedTo && { assignedTo })
      })
      .where(eq(supportTickets.id, id));
  }

  async updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const [updated] = await db
      .update(supportTickets)
      .set({ ...ticket, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated || undefined;
  }

  // FAQs
  async getFAQs(category?: string): Promise<Faq[]> {
    if (category) {
      return await db
        .select()
        .from(faqs)
        .where(and(
          eq(faqs.category, category),
          eq(faqs.isActive, true)
        ))
        .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
    }
    return await db
      .select()
      .from(faqs)
      .where(eq(faqs.isActive, true))
      .orderBy(asc(faqs.sortOrder), asc(faqs.createdAt));
  }

  async getFAQ(id: string): Promise<Faq | undefined> {
    const [faq] = await db.select().from(faqs).where(eq(faqs.id, id));
    return faq || undefined;
  }

  async createFAQ(faq: InsertFaq): Promise<Faq> {
    const [newFaq] = await db.insert(faqs).values(faq).returning();
    return newFaq;
  }

  async updateFAQ(id: string, faq: Partial<InsertFaq>): Promise<Faq | undefined> {
    const [updated] = await db
      .update(faqs)
      .set({ ...faq, updatedAt: new Date() })
      .where(eq(faqs.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFAQ(id: string): Promise<void> {
    await db.delete(faqs).where(eq(faqs.id, id));
  }

  // Reviews
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async getBookingReview(bookingId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId));
    return review || undefined;
  }

  async getTechnicianReviews(technicianId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.technicianId, technicianId))
      .orderBy(desc(reviews.createdAt));
  }

  // Promotions
  async getActivePromotions(): Promise<Promotion[]> {
    const now = new Date();
    return await db
      .select()
      .from(promotions)
      .where(
        and(
          eq(promotions.isActive, true),
          lte(promotions.validFrom, now),
          gte(promotions.validUntil, now)
        )
      );
  }

  async getPromotionByCode(code: string): Promise<Promotion | undefined> {
    const [promotion] = await db.select().from(promotions).where(eq(promotions.code, code));
    return promotion || undefined;
  }

  async createPromotion(promotion: InsertPromotion): Promise<Promotion> {
    const [newPromotion] = await db.insert(promotions).values(promotion).returning();
    return newPromotion;
  }

  async updatePromotionUsage(id: string): Promise<void> {
    await db
      .update(promotions)
      .set({ usageCount: sql`${promotions.usageCount} + 1` })
      .where(eq(promotions.id, id));
  }

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(resourceType?: string, resourceId?: string, limit = 100): Promise<AuditLog[]> {
    const conditions = [];
    if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
    if (resourceId) conditions.push(eq(auditLogs.resourceId, resourceId));
    
    return await db
      .select()
      .from(auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // Webhook Events
  async createWebhookEvent(event: Partial<WebhookEvent>): Promise<WebhookEvent> {
    const [newEvent] = await db.insert(webhookEvents).values(event as any).returning();
    return newEvent;
  }

  async getWebhookEvents(provider?: string, status?: string): Promise<WebhookEvent[]> {
    const conditions = [];
    if (provider) conditions.push(eq(webhookEvents.provider, provider));
    if (status) conditions.push(eq(webhookEvents.status, status));
    
    return await db
      .select()
      .from(webhookEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(webhookEvents.createdAt));
  }

  async updateWebhookEventStatus(id: string, status: string, error?: string): Promise<void> {
    await db
      .update(webhookEvents)
      .set({ 
        status,
        attempts: sql`${webhookEvents.attempts} + 1`,
        ...(status === 'processed' && { processedAt: new Date() }),
        ...(error && { error })
      })
      .where(eq(webhookEvents.id, id));
  }

  // Order Status Logs
  async createOrderStatusLog(log: Partial<OrderStatusLog>): Promise<OrderStatusLog> {
    const [newLog] = await db.insert(orderStatusLogs).values(log as any).returning();
    return newLog;
  }

  async getBookingStatusLogs(bookingId: string): Promise<OrderStatusLog[]> {
    return await db
      .select()
      .from(orderStatusLogs)
      .where(eq(orderStatusLogs.bookingId, bookingId))
      .orderBy(asc(orderStatusLogs.createdAt));
  }

  // Analytics
  async getOrderStats(startDate?: Date, endDate?: Date): Promise<any> {
    const conditions = [];
    if (startDate) conditions.push(gte(bookings.createdAt, startDate));
    if (endDate) conditions.push(lte(bookings.createdAt, endDate));

    const result = await db
      .select({
        totalOrders: count(),
        totalRevenue: sql<number>`SUM(${bookings.totalAmount})`,
        completedOrders: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
        cancelledOrders: sql<number>`SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`,
        pendingOrders: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
        inProgressOrders: sql<number>`SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)`,
      })
      .from(bookings)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result[0];
  }

  async getRevenueStats(startDate?: Date, endDate?: Date): Promise<any> {
    const conditions = [eq(payments.status, 'paid')];
    if (startDate) conditions.push(gte(payments.createdAt, startDate));
    if (endDate) conditions.push(lte(payments.createdAt, endDate));

    const result = await db
      .select({
        totalPayments: sql<number>`SUM(${payments.amount})`,
        walletPayments: sql<number>`SUM(${payments.walletAmount})`,
        gatewayPayments: sql<number>`SUM(${payments.gatewayAmount})`,
        moyasarPayments: sql<number>`SUM(CASE WHEN payment_method = 'moyasar' THEN ${payments.gatewayAmount} ELSE 0 END)`,
        tabbyPayments: sql<number>`SUM(CASE WHEN payment_method = 'tabby' THEN ${payments.gatewayAmount} ELSE 0 END)`,
      })
      .from(payments)
      .where(and(...conditions));

    return result[0];
  }

  async getMonthlyRevenueStats(): Promise<any[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${payments.createdAt}, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${payments.createdAt})::int`,
        revenue: sql<number>`COALESCE(SUM(${payments.amount}::decimal), 0)`,
      })
      .from(payments)
      .where(and(
        eq(payments.status, 'paid'),
        gte(payments.createdAt, sixMonthsAgo)
      ))
      .groupBy(sql`TO_CHAR(${payments.createdAt}, 'Mon')`, sql`EXTRACT(MONTH FROM ${payments.createdAt})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${payments.createdAt})`);

    return result.map((row: any) => ({
      month: row.month,
      revenue: Number(row.revenue) || 0,
    }));
  }

  async getMonthlyBookingStats(): Promise<any[]> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${bookings.createdAt}, 'Mon')`,
        monthNum: sql<number>`EXTRACT(MONTH FROM ${bookings.createdAt})::int`,
        bookings: sql<number>`COUNT(${bookings.id})::int`,
      })
      .from(bookings)
      .where(gte(bookings.createdAt, sixMonthsAgo))
      .groupBy(sql`TO_CHAR(${bookings.createdAt}, 'Mon')`, sql`EXTRACT(MONTH FROM ${bookings.createdAt})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${bookings.createdAt})`);

    return result.map((row: any) => ({
      month: row.month,
      bookings: Number(row.bookings) || 0,
    }));
  }

  async getTechnicianStats(technicianId?: string): Promise<any> {
    const conditions = [eq(bookings.status, 'completed')];
    if (technicianId) conditions.push(eq(bookings.technicianId, technicianId));

    const result = await db
      .select({
        completedOrders: sql<number>`COUNT(DISTINCT ${bookings.id})::int`,
        totalRevenue: sql<number>`COALESCE(SUM(${bookings.totalAmount}::decimal), 0)`,
        avgRating: sql<number>`COALESCE(AVG(${reviews.technicianRating}), 0)`,
      })
      .from(bookings)
      .leftJoin(reviews, eq(bookings.id, reviews.bookingId))
      .where(and(...conditions));

    return result[0];
  }

  async getTopServices(): Promise<any> {
    const result = await db
      .select({
        name: services.name,
        orders: sql<number>`COUNT(${bookings.id})::int`,
        revenue: sql<number>`COALESCE(SUM(${bookings.totalAmount}::decimal), 0)`,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .where(eq(bookings.status, 'completed'))
      .groupBy(services.id, services.name)
      .orderBy(desc(sql<number>`COUNT(${bookings.id})::int`))
      .limit(5);

    return result.map((service: any) => ({
      name: service.name?.en || 'Unknown Service',
      orders: Number(service.orders) || 0,
      revenue: Number(service.revenue) || 0,
    }));
  }

  async getCouponStats(startDate?: Date, endDate?: Date): Promise<any> {
    const conditions = [];
    if (startDate) conditions.push(gte(coupons.createdAt, startDate));
    if (endDate) conditions.push(lte(coupons.createdAt, endDate));

    // Get overall coupon statistics
    const totalCoupons = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(coupons)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const activeCoupons = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(coupons)
      .where(
        conditions.length > 0 
          ? and(eq(coupons.isActive, true), ...conditions)
          : eq(coupons.isActive, true)
      );

    // Get coupon usage stats from bookings
    const usageConditions = [sql`${bookings.couponCode} IS NOT NULL`];
    if (startDate) usageConditions.push(gte(bookings.createdAt, startDate));
    if (endDate) usageConditions.push(lte(bookings.createdAt, endDate));

    const usageStats = await db
      .select({
        totalRedemptions: sql<number>`COUNT(*)::int`,
        totalDiscount: sql<number>`COALESCE(SUM(${bookings.couponDiscount}::decimal), 0)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${bookings.userId})::int`,
        avgDiscount: sql<number>`COALESCE(AVG(${bookings.couponDiscount}::decimal), 0)`,
      })
      .from(bookings)
      .where(and(...usageConditions));

    // Get top performing coupons
    const topCoupons = await db
      .select({
        code: bookings.couponCode,
        redemptions: sql<number>`COUNT(*)::int`,
        totalDiscount: sql<number>`COALESCE(SUM(${bookings.couponDiscount}::decimal), 0)`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${bookings.userId})::int`,
      })
      .from(bookings)
      .where(and(...usageConditions))
      .groupBy(bookings.couponCode)
      .orderBy(desc(sql<number>`COUNT(*)::int`))
      .limit(5);

    return {
      totalCoupons: Number(totalCoupons[0]?.count) || 0,
      activeCoupons: Number(activeCoupons[0]?.count) || 0,
      totalRedemptions: Number(usageStats[0]?.totalRedemptions) || 0,
      totalDiscountDistributed: Number(usageStats[0]?.totalDiscount) || 0,
      uniqueUsers: Number(usageStats[0]?.uniqueUsers) || 0,
      avgDiscountPerUse: Number(usageStats[0]?.avgDiscount) || 0,
      topCoupons: topCoupons.map((c: any) => ({
        code: c.code,
        redemptions: Number(c.redemptions) || 0,
        totalDiscount: Number(c.totalDiscount) || 0,
        uniqueUsers: Number(c.uniqueUsers) || 0,
      })),
    };
  }

  async getCreditStats(startDate?: Date, endDate?: Date): Promise<any> {
    const conditions = [];
    if (startDate) conditions.push(gte(creditTransactions.createdAt, startDate));
    if (endDate) conditions.push(lte(creditTransactions.createdAt, endDate));

    // Get credit stats by type
    const creditsByType = await db
      .select({
        type: creditTransactions.type,
        totalAmount: sql<number>`COALESCE(SUM(${creditTransactions.amount}::decimal), 0)`,
        count: sql<number>`COUNT(*)::int`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${creditTransactions.userId})::int`,
      })
      .from(creditTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(creditTransactions.type);

    // Get overall credit statistics
    const overallStats = await db
      .select({
        totalGranted: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransactions.amount} > 0 THEN ${creditTransactions.amount}::decimal ELSE 0 END), 0)`,
        totalUsed: sql<number>`COALESCE(ABS(SUM(CASE WHEN ${creditTransactions.amount} < 0 THEN ${creditTransactions.amount}::decimal ELSE 0 END)), 0)`,
        totalExpired: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransactions.type} = 'expiration' THEN ABS(${creditTransactions.amount}::decimal) ELSE 0 END), 0)`,
        activeUsers: sql<number>`COUNT(DISTINCT ${creditTransactions.userId})::int`,
      })
      .from(creditTransactions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Get current active credits balance (non-expired)
    const activeBalance = await db
      .select({
        totalBalance: sql<number>`COALESCE(SUM(${creditTransactions.amount}::decimal), 0)`,
      })
      .from(creditTransactions)
      .where(
        and(
          or(
            sql`${creditTransactions.expiresAt} IS NULL`,
            gte(creditTransactions.expiresAt, new Date())
          )
        )
      );

    return {
      totalGranted: Number(overallStats[0]?.totalGranted) || 0,
      totalUsed: Number(overallStats[0]?.totalUsed) || 0,
      totalExpired: Number(overallStats[0]?.totalExpired) || 0,
      activeBalance: Number(activeBalance[0]?.totalBalance) || 0,
      activeUsers: Number(overallStats[0]?.activeUsers) || 0,
      byType: creditsByType.map((row: any) => ({
        type: row.type,
        totalAmount: Number(row.totalAmount) || 0,
        count: Number(row.count) || 0,
        uniqueUsers: Number(row.uniqueUsers) || 0,
      })),
    };
  }

  async getLoyaltyMetrics(): Promise<any> {
    // Get loyalty settings
    const settings = await db.select().from(loyaltySettings).limit(1);
    const loyaltyConfig = settings[0];

    if (!loyaltyConfig || !loyaltyConfig.isActive) {
      return {
        isEnabled: false,
        message: 'Loyalty program is not enabled',
      };
    }

    // Get total rewards distributed by type
    const rewardsByType = await db
      .select({
        type: creditTransactions.type,
        totalAmount: sql<number>`COALESCE(SUM(${creditTransactions.amount}::decimal), 0)`,
        count: sql<number>`COUNT(*)::int`,
        uniqueUsers: sql<number>`COUNT(DISTINCT ${creditTransactions.userId})::int`,
      })
      .from(creditTransactions)
      .where(
        sql`${creditTransactions.type} IN ('welcome_bonus', 'first_booking_bonus', 'referral_inviter', 'referral_invitee', 'loyalty_cashback')`
      )
      .groupBy(creditTransactions.type);

    // Get total rewards distributed (all time)
    const totalRewards = await db
      .select({
        total: sql<number>`COALESCE(SUM(${creditTransactions.amount}::decimal), 0)`,
      })
      .from(creditTransactions)
      .where(
        sql`${creditTransactions.type} IN ('welcome_bonus', 'first_booking_bonus', 'referral_inviter', 'referral_invitee', 'loyalty_cashback')`
      );

    // Get users with credits
    const usersWithCredits = await db
      .select({
        userId: creditTransactions.userId,
        balance: sql<number>`COALESCE(SUM(${creditTransactions.amount}::decimal), 0)`,
      })
      .from(creditTransactions)
      .where(
        and(
          or(
            sql`${creditTransactions.expiresAt} IS NULL`,
            gte(creditTransactions.expiresAt, new Date())
          )
        )
      )
      .groupBy(creditTransactions.userId)
      .having(sql`SUM(${creditTransactions.amount}::decimal) > 0`);

    // Calculate average customer lifetime value for users with loyalty rewards
    const loyaltyUserIds = await db
      .selectDistinct({ userId: creditTransactions.userId })
      .from(creditTransactions)
      .where(
        sql`${creditTransactions.type} IN ('welcome_bonus', 'first_booking_bonus', 'referral_inviter', 'referral_invitee', 'loyalty_cashback')`
      );

    let avgLifetimeValue = 0;
    if (loyaltyUserIds.length > 0) {
      const userIds = loyaltyUserIds.map(u => u.userId);
      const lifetimeValues = await db
        .select({
          avgValue: sql<number>`COALESCE(AVG(total_spent), 0)`,
        })
        .from(
          sql`(
            SELECT 
              ${bookings.userId},
              SUM(${bookings.totalAmount}::decimal) as total_spent
            FROM ${bookings}
            WHERE ${bookings.userId} IN (${sql.join(userIds.map(id => sql`${id}`), sql`, `)})
              AND ${bookings.status} = 'completed'
            GROUP BY ${bookings.userId}
          ) as user_spending`
        );
      avgLifetimeValue = Number(lifetimeValues[0]?.avgValue) || 0;
    }

    return {
      isEnabled: true,
      totalRewardsDistributed: Number(totalRewards[0]?.total) || 0,
      activeUsersWithCredits: usersWithCredits.length,
      totalActiveBalance: usersWithCredits.reduce((sum, u) => sum + Number(u.balance || 0), 0),
      avgCustomerLifetimeValue: avgLifetimeValue,
      rewardsByType: rewardsByType.map((row: any) => ({
        type: row.type,
        totalAmount: Number(row.totalAmount) || 0,
        count: Number(row.count) || 0,
        uniqueUsers: Number(row.uniqueUsers) || 0,
      })),
      settings: {
        welcomeBonusAmount: Number(loyaltyConfig.welcomeBonusAmount) || 0,
        firstBookingBonusAmount: Number(loyaltyConfig.firstBookingBonusAmount) || 0,
        referrerRewardAmount: Number(loyaltyConfig.referrerRewardAmount) || 0,
        refereeRewardAmount: Number(loyaltyConfig.refereeRewardAmount) || 0,
        cashbackPercentage: Number(loyaltyConfig.cashbackPercentage) || 0,
        creditExpiryDays: loyaltyConfig.creditExpiryDays || 90,
        maxCreditUsagePercentage: Number(loyaltyConfig.maxCreditPercentage) || 30,
        minBookingAmountForCredits: Number(loyaltyConfig.minBookingForCredit) || 50,
      },
    };
  }

  async getMarketingSettings(): Promise<MarketingSettings | null> {
    const [settings] = await db.select().from(marketingSettings).limit(1);
    return settings || null;
  }

  async isMarketingFeatureEnabled(feature: 'coupon' | 'credit' | 'referral' | 'loyalty'): Promise<boolean> {
    const settings = await this.getMarketingSettings();
    
    // If no settings exist, assume all features are enabled (default behavior)
    if (!settings) {
      return true;
    }
    
    switch (feature) {
      case 'coupon':
        return settings.couponSystemEnabled;
      case 'credit':
        return settings.creditSystemEnabled;
      case 'referral':
        return settings.referralSystemEnabled;
      case 'loyalty':
        return settings.loyaltyProgramEnabled;
      default:
        return true;
    }
  }

  async updateMarketingSettings(settings: Partial<InsertMarketingSettings>, updatedBy: string): Promise<MarketingSettings> {
    // Check if settings exist
    const existingSettings = await this.getMarketingSettings();
    
    if (existingSettings) {
      // Update existing settings
      const [updated] = await db
        .update(marketingSettings)
        .set({ ...settings, updatedBy, updatedAt: new Date() })
        .where(eq(marketingSettings.id, existingSettings.id))
        .returning();
      return updated;
    } else {
      // Create new settings with defaults
      const [newSettings] = await db
        .insert(marketingSettings)
        .values({
          couponSystemEnabled: settings.couponSystemEnabled ?? true,
          creditSystemEnabled: settings.creditSystemEnabled ?? true,
          referralSystemEnabled: settings.referralSystemEnabled ?? true,
          loyaltyProgramEnabled: settings.loyaltyProgramEnabled ?? true,
          updatedBy,
        })
        .returning();
      return newSettings;
    }
  }

  async getCustomerMarketingProfile(userId: string): Promise<any> {
    // Get coupons used by this customer
    const couponsUsed = await db
      .select({
        id: couponUsages.id,
        couponCode: coupons.code,
        couponName: coupons.name,
        discountAmount: couponUsages.discountAmount,
        bookingId: couponUsages.bookingId,
        usedAt: couponUsages.createdAt,
      })
      .from(couponUsages)
      .leftJoin(coupons, eq(couponUsages.couponId, coupons.id))
      .where(eq(couponUsages.userId, userId))
      .orderBy(desc(couponUsages.createdAt))
      .limit(50);

    // Get credit balance and transactions
    const creditTransactionsData = await db
      .select()
      .from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(100);

    // Calculate active credit balance
    const activeBalance = creditTransactionsData
      .filter(tx => !tx.isExpired && (!tx.expiresAt || tx.expiresAt > new Date()))
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    // Get referral stats
    const referralsMade = await db
      .select()
      .from(referrals)
      .where(eq(referrals.inviterId, userId))
      .orderBy(desc(referrals.createdAt));

    const totalReferralRewards = creditTransactionsData
      .filter(tx => tx.type === 'referral_reward')
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      couponsUsed: couponsUsed.map(c => ({
        id: c.id,
        code: c.couponCode,
        name: c.couponName,
        discountAmount: Number(c.discountAmount),
        bookingId: c.bookingId,
        usedAt: c.usedAt,
      })),
      credits: {
        activeBalance: Number(activeBalance.toFixed(2)),
        transactions: creditTransactionsData.map(tx => ({
          id: tx.id,
          type: tx.type,
          amount: Number(tx.amount),
          balance: Number(tx.balance),
          reason: tx.reason,
          expiresAt: tx.expiresAt,
          isExpired: tx.isExpired,
          createdAt: tx.createdAt,
        })),
        totalGranted: creditTransactionsData
          .filter(tx => Number(tx.amount) > 0)
          .reduce((sum, tx) => sum + Number(tx.amount), 0),
        totalUsed: Math.abs(creditTransactionsData
          .filter(tx => Number(tx.amount) < 0)
          .reduce((sum, tx) => sum + Number(tx.amount), 0)),
      },
      referrals: {
        totalReferrals: referralsMade.length,
        successfulReferrals: referralsMade.filter(r => r.status === 'completed').length,
        totalRewardsEarned: Number(totalReferralRewards.toFixed(2)),
        referrals: referralsMade.map(r => ({
          id: r.id,
          referralCode: r.referralCode,
          inviteeId: r.inviteeId,
          status: r.status,
          rewardDistributedAt: r.rewardDistributedAt,
          createdAt: r.createdAt,
        })),
      },
    };
  }

  async getCustomerOverview(userId: string): Promise<any> {
    // Get user details
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('Customer not found');
    }

    // Get all bookings with stats, including technician info
    const allBookings = await db
      .select({
        id: bookings.id,
        status: bookings.status,
        scheduledDate: bookings.scheduledDate,
        scheduledTime: bookings.scheduledTime,
        totalAmount: bookings.totalAmount,
        paymentStatus: bookings.paymentStatus,
        serviceName: services.name,
        technicianId: bookings.technicianId,
        technicianName: users.name,
        technicianPhone: users.phone,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(users, eq(bookings.technicianId, users.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    // Calculate booking stats
    const totalBookings = allBookings.length;
    const completedBookings = allBookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length;
    const totalSpent = allBookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

    // Get recent bookings (last 10)
    const recentBookings = allBookings.slice(0, 10);

    // Get payments
    const allPayments = await db
      .select({
        id: payments.id,
        paymentMethod: payments.paymentMethod,
        amount: payments.amount,
        status: payments.status,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .leftJoin(bookings, eq(payments.bookingId, bookings.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(payments.createdAt));

    const recentPayments = allPayments.slice(0, 10);

    // Get support tickets
    const allTickets = await db
      .select({
        id: supportTickets.id,
        subject: supportTickets.subject,
        status: supportTickets.status,
        priority: supportTickets.priority,
        createdAt: supportTickets.createdAt,
      })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));

    const recentSupportTickets = allTickets.slice(0, 10);

    // Get reviews with service and technician info
    const allReviews = await db
      .select({
        serviceName: services.name,
        technicianName: users.name,
        rating: reviews.technicianRating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .leftJoin(bookings, eq(reviews.bookingId, bookings.id))
      .leftJoin(services, eq(bookings.serviceId, services.id))
      .leftJoin(users, eq(reviews.technicianId, users.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(reviews.createdAt));

    const recentReviews = allReviews.slice(0, 10);
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0 
      ? allReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / totalReviews 
      : 0;

    // Get wallet info
    const wallet = await this.getWallet(userId);
    const walletTransactions = await this.getWalletTransactions(userId, 100);
    const recentWalletTransactions = walletTransactions.slice(0, 10);
    
    const walletBalance = Number(wallet?.balance || 0);
    const walletEarned = walletTransactions
      .filter((t: any) => t.type === 'credit')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const walletSpent = walletTransactions
      .filter((t: any) => t.type === 'debit')
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    // Get referrals (both as inviter and invitee)
    const referralsAsInviter = await db
      .select({
        id: referrals.id,
        inviteeName: users.name,
        inviteeEmail: users.email,
        status: referrals.status,
        reward: referrals.inviterReward,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.inviteeId, users.id))
      .where(eq(referrals.inviterId, userId))
      .orderBy(desc(referrals.createdAt));

    const referralsAsInvitee = await db
      .select({
        id: referrals.id,
        inviterName: users.name,
        inviterEmail: users.email,
        status: referrals.status,
        discount: referrals.inviteeDiscount,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .leftJoin(users, eq(referrals.inviterId, users.id))
      .where(eq(referrals.inviteeId, userId))
      .orderBy(desc(referrals.createdAt));

    const totalReferralsGiven = referralsAsInviter.length;
    const totalRewardsEarned = referralsAsInviter
      .filter(r => r.status === 'rewarded')
      .reduce((sum, r) => sum + Number(r.reward || 0), 0);

    return {
      totalBookings,
      completedBookings,
      cancelledBookings,
      totalSpent,
      averageRating,
      totalReviews,
      walletBalance,
      walletEarned,
      walletSpent,
      totalReferralsGiven,
      totalRewardsEarned,
      recentBookings,
      recentPayments,
      recentSupportTickets,
      recentReviews,
      recentWalletTransactions,
      referralsAsInviter: referralsAsInviter.slice(0, 10),
      referralsAsInvitee: referralsAsInvitee.slice(0, 10),
    };
  }

  async getMonthlyUserGrowth(months = 6): Promise<any[]> {
    const result = await db
      .select({
        month: sql<string>`TO_CHAR(${users.createdAt}, 'Mon YYYY')`,
        count: sql<number>`COUNT(*)::int`,
        monthDate: sql<string>`DATE_TRUNC('month', ${users.createdAt})`,
      })
      .from(users)
      .where(sql`${users.createdAt} >= NOW() - INTERVAL '${sql.raw(months.toString())} months'`)
      .groupBy(sql`DATE_TRUNC('month', ${users.createdAt})`, sql`TO_CHAR(${users.createdAt}, 'Mon YYYY')`)
      .orderBy(sql`DATE_TRUNC('month', ${users.createdAt})`);

    return result.map((r: any) => ({
      month: r.month,
      users: Number(r.count) || 0,
    }));
  }

  async getRecentActivity(limit = 20): Promise<any[]> {
    // Get recent audit logs for key activities
    const recentAuditLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        userId: auditLogs.userId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        createdAt: auditLogs.createdAt,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(sql`${auditLogs.resourceType} IN ('booking', 'payment', 'wallet', 'refund')`)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return recentAuditLogs;
  }

  async getWalletTotals(): Promise<any> {
    const result = await db
      .select({
        totalBalance: sql<number>`COALESCE(SUM(${wallets.balance}::decimal), 0)`,
        totalEarned: sql<number>`COALESCE(SUM(${wallets.totalEarned}::decimal), 0)`,
        totalSpent: sql<number>`COALESCE(SUM(${wallets.totalSpent}::decimal), 0)`,
      })
      .from(wallets);

    return {
      totalBalance: Number(result[0]?.totalBalance) || 0,
      totalEarned: Number(result[0]?.totalEarned) || 0,
      totalSpent: Number(result[0]?.totalSpent) || 0,
    };
  }

  async getUncollectedPayments(): Promise<number> {
    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(${bookings.totalAmount}::decimal), 0)`,
      })
      .from(bookings)
      .where(sql`${bookings.paymentStatus} IN ('pending', 'authorized')`);

    return Number(result[0]?.total) || 0;
  }

  async getBookingsByPaymentMethod(): Promise<any[]> {
    const result = await db
      .select({
        method: payments.paymentMethod,
        count: sql<number>`COUNT(*)::int`,
        total: sql<number>`COALESCE(SUM(${payments.amount}::decimal), 0)`,
      })
      .from(payments)
      .where(sql`${payments.status} = 'paid'`)
      .groupBy(payments.paymentMethod)
      .orderBy(desc(sql<number>`COUNT(*)::int`));

    return result.map((r: any) => ({
      method: r.method,
      count: Number(r.count) || 0,
      total: Number(r.total) || 0,
    }));
  }

  async getCustomerInvoices(bookingId: string): Promise<any[]> {
    const result = await db
      .select()
      .from(invoices)
      .where(eq(invoices.bookingId, bookingId))
      .orderBy(desc(invoices.createdAt));

    return result;
  }

  async createInvoice(invoiceData: any): Promise<any> {
    const [invoice] = await db
      .insert(invoices)
      .values({
        bookingId: invoiceData.bookingId,
        userId: invoiceData.userId,
        invoiceNumber: invoiceData.invoiceNumber,
        totalAmount: invoiceData.totalAmount,
        filePath: invoiceData.filePath,
        fileUrl: invoiceData.fileUrl || invoiceData.filePath,
      })
      .returning();

    return invoice;
  }

  async getInvoice(invoiceNumber: string): Promise<any> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceNumber));

    return invoice;
  }

  // Subscriptions
  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    const [subscription] = await db
      .insert(subscriptions)
      .values(subscriptionData)
      .returning();
    return subscription;
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id));
    return subscription || undefined;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt));
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return await db
      .select()
      .from(subscriptions)
      .orderBy(desc(subscriptions.createdAt));
  }

  async updateSubscription(id: string, subscriptionData: Partial<InsertSubscription>): Promise<Subscription> {
    const [updatedSubscription] = await db
      .update(subscriptions)
      .set({ ...subscriptionData, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return updatedSubscription;
  }
}

export const storage = new DatabaseStorage();
