import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  integer, 
  timestamp, 
  decimal, 
  boolean, 
  jsonb, 
  uuid, 
  pgEnum 
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum('user_role', ['customer', 'technician', 'admin', 'support', 'finance']);
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'suspended']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending', 'confirmed', 'technician_assigned', 'en_route', 
  'in_progress', 'quotation_pending', 'completed', 'cancelled'
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', 'authorized', 'paid', 'failed', 'refunded', 'cancelled'
]);
export const paymentMethodEnum = pgEnum('payment_method', ['wallet', 'moyasar', 'tabby']);
export const quotationStatusEnum = pgEnum('quotation_status', ['pending', 'approved', 'rejected']);
export const supportStatusEnum = pgEnum('support_status', ['open', 'in_progress', 'resolved', 'closed']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'order_update', 'technician_assigned', 'payment_confirmation', 'promotional', 'quotation_request', 'subscription'
]);
export const referralStatusEnum = pgEnum('referral_status', ['pending', 'completed', 'rewarded']);
export const discountTypeEnum = pgEnum('discount_type', ['percentage', 'fixed']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'expired']);
export const packageTierEnum = pgEnum('package_tier', ['basic', 'premium', 'vip', 'enterprise']);
export const addressTypeEnum = pgEnum("address_type", ["home", "office", "other"]);
export const availabilityStatusEnum = pgEnum("availability_status", ["available", "busy", "on_job", "off_duty"]);
export const couponTypeEnum = pgEnum('coupon_type', ['percentage', 'fixed_amount']);
export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
  'welcome_bonus', 'referral_reward', 'loyalty_cashback', 'admin_credit', 'booking_deduction', 'expired'
]);

// Roles table (for custom role management)
export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  nameAr: varchar("name_ar", { length: 100 }),
  description: text("description"),
  descriptionAr: text("description_ar"),
  permissions: jsonb("permissions").notNull().default('[]'), // Array of permission strings
  isSystemRole: boolean("is_system_role").default(false).notNull(), // Prevent deletion of core roles
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }).unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  role: userRoleEnum("role").default('customer').notNull(),
  customRoleId: uuid("custom_role_id").references(() => roles.id), // For custom roles
  status: userStatusEnum("status").default('active').notNull(),
  language: varchar("language", { length: 2 }).default('en').notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  deviceToken: text("device_token"),
  avatar: text("avatar"),
  referralCode: varchar("referral_code", { length: 20 }).unique(), // User's unique referral code
  specializations: jsonb("specializations"), // For technicians: array of service category IDs they can handle
  // Technician-specific fields for 360 profile
  workingHours: jsonb("working_hours"), // {monday: {start: "09:00", end: "18:00"}, tuesday: {...}, ...}
  daysOff: jsonb("days_off"), // Array of dates ["2024-12-25", "2024-01-01", ...]
  serviceRadius: integer("service_radius").default(50), // Max distance in km
  homeLatitude: decimal("home_latitude", { precision: 10, scale: 8 }), // Home base location
  homeLongitude: decimal("home_longitude", { precision: 11, scale: 8 }),
  maxDailyBookings: integer("max_daily_bookings").default(8), // Capacity limit per day
  availabilityStatus: availabilityStatusEnum("availability_status").default('available'), // Real-time status
  certifications: jsonb("certifications"), // [{name: "HVAC Certified", issuedDate: "2023-01-15", expiryDate: "2025-01-15"}, ...]
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Addresses table
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  addressName: varchar("address_name", { length: 100 }).notNull(), // User-defined name for this address
  addressType: addressTypeEnum("address_type").default('home').notNull(), // home, office, other
  streetName: text("street_name").notNull(),
  houseNo: varchar("house_no", { length: 50 }).notNull(),
  district: varchar("district", { length: 100 }).notNull(), // District/Area
  directions: text("directions"), // Optional directions/notes
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Service categories table
export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // { "en": "Home Cleaning", "ar": "تنظيف المنازل" }
  description: jsonb("description").notNull(),
  icon: text("icon"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Services table (Single Services - one-time bookings)
export const services = pgTable("services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: uuid("category_id").references(() => serviceCategories.id).notNull(),
  name: jsonb("name").notNull(), // { "en": "Deep Cleaning", "ar": "تنظيف عميق" }
  description: jsonb("description").notNull(),
  image: text("image"), // Service image for display
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  vatPercentage: decimal("vat_percentage", { precision: 5, scale: 2 }).default('15').notNull(),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default('0').notNull(), // Customer ratings (0-5)
  reviewCount: integer("review_count").default(0).notNull(), // Total number of reviews
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Service tiers table (Pricing options for single services)
export const serviceTiers = pgTable("service_tiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  tier: varchar("tier", { length: 50 }).notNull(), // basic, premium
  name: jsonb("name").notNull(), // { "en": "Basic Package", "ar": "الباقة الأساسية" }
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default('0').notNull(),
  inclusions: jsonb("inclusions").notNull(), // Array of strings in both languages
  termsAndConditions: jsonb("terms_and_conditions"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscription packages table (Multi-service bundles with recurring billing)
export const subscriptionPackages = pgTable("subscription_packages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // { "en": "Monthly Premium Package", "ar": "الباقة الشهرية المميزة" }
  description: jsonb("description").notNull(),
  categoryId: uuid("category_id").references(() => serviceCategories.id), // Optional categorization
  image: text("image"), // Package display image
  tier: packageTierEnum("tier").default('basic').notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(), // Subscription duration (e.g., 30 for monthly)
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default('0').notNull(),
  inclusions: jsonb("inclusions").notNull(), // { "en": [...], "ar": [...] } - list of benefits
  termsAndConditions: jsonb("terms_and_conditions"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscription package services junction table (Many-to-many relationship)
export const subscriptionPackageServices = pgTable("subscription_package_services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  packageId: uuid("package_id").references(() => subscriptionPackages.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  usageLimit: integer("usage_limit"), // Optional limit for how many times this service can be used
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default('0').notNull(), // Service-specific discount
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Brands table
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  logo: text("logo"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Spare parts table
export const spareParts = pgTable("spare_parts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // { "en": "AC Filter", "ar": "فلتر تكييف" }
  description: jsonb("description").notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  brandId: uuid("brand_id").references(() => brands.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0).notNull(),
  image: text("image"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Home Slider Images table (for mobile app homepage)
export const homeSliderImages = pgTable("home_slider_images", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull(), // 1, 2, or 3
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Home Banner table (for mobile app homepage)
export const homeBanner = pgTable("home_banner", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: jsonb("title").notNull(), // { "en": "Summer Sale", "ar": "تخفيضات الصيف" }
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"), // Deep link or URL to navigate to
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Bookings/Orders table
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  serviceId: uuid("service_id").references(() => services.id).notNull(),
  tierId: uuid("tier_id").references(() => serviceTiers.id), // Optional pricing tier for single service bookings
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id), // Track subscription-based bookings
  addressId: uuid("address_id").references(() => addresses.id).notNull(),
  technicianId: uuid("technician_id").references(() => users.id),
  status: orderStatusEnum("status").default('pending').notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: varchar("scheduled_time", { length: 10 }).notNull(), // "10:00"
  notes: text("notes"),
  notesAr: text("notes_ar"),
  serviceCost: decimal("service_cost", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  referralCode: varchar("referral_code", { length: 20 }),
  referralDiscount: decimal("referral_discount", { precision: 10, scale: 2 }).default('0').notNull(),
  subscriptionDiscount: decimal("subscription_discount", { precision: 10, scale: 2 }).default('0').notNull(), // Discount from active subscription
  couponCode: varchar("coupon_code", { length: 50 }),
  couponDiscount: decimal("coupon_discount", { precision: 10, scale: 2 }).default('0').notNull(),
  sparePartsCost: decimal("spare_parts_cost", { precision: 10, scale: 2 }).default('0').notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default('pending').notNull(),
  assignedAt: timestamp("assigned_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: uuid("cancelled_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Assignment Logs table - Tracks technician assignment decisions
export const assignmentLogs = pgTable("assignment_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  technicianId: uuid("technician_id").references(() => users.id).notNull(),
  assignmentMethod: varchar("assignment_method", { length: 20 }).notNull(), // 'auto' or 'manual'
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }), // Distance from technician to customer
  workloadScore: integer("workload_score"), // Score based on current workload (0-100)
  availabilityScore: integer("availability_score"), // Score based on availability (0-100)
  skillScore: integer("skill_score"), // Score based on skill match (0-100)
  performanceScore: integer("performance_score"), // Score based on past performance (0-100)
  totalScore: integer("total_score"), // Combined weighted score
  rejectionReason: text("rejection_reason"), // If assignment failed, why?
  adminNotes: text("admin_notes"), // Notes if manually assigned
  assignedBy: uuid("assigned_by").references(() => users.id), // Admin who manually assigned (if manual)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Quotations table
export const quotations = pgTable("quotations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  technicianId: uuid("technician_id").references(() => users.id).notNull(),
  status: quotationStatusEnum("status").default('pending').notNull(),
  additionalCost: decimal("additional_cost", { precision: 10, scale: 2 }).default('0').notNull(),
  notes: text("notes"),
  notesAr: text("notes_ar"),
  expiresAt: timestamp("expires_at").notNull(),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Quotation spare parts junction table
export const quotationSpareParts = pgTable("quotation_spare_parts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  quotationId: uuid("quotation_id").references(() => quotations.id).notNull(),
  sparePartId: uuid("spare_part_id").references(() => spareParts.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

// Payments table
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default('SAR').notNull(),
  status: paymentStatusEnum("status").default('pending').notNull(),
  gatewayPaymentId: text("gateway_payment_id"), // Moyasar/Tabby payment ID
  gatewayResponse: jsonb("gateway_response"), // Full response from gateway
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  refundReason: text("refund_reason"),
  walletAmount: decimal("wallet_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  gatewayAmount: decimal("gateway_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  filePath: text("file_path"), // Path to generated PDF
  fileUrl: text("file_url"), // Public URL to invoice
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscriptions table (Customer subscriptions to packages)
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  packageId: uuid("package_id").references(() => subscriptionPackages.id).notNull(),
  status: subscriptionStatusEnum("status").default('active').notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  autoRenew: boolean("auto_renew").default(false).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  benefits: jsonb("benefits"), // Snapshot of package benefits at time of purchase
  usageCount: integer("usage_count").default(0).notNull(), // Track how many bookings used this subscription
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet table
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default('0').notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default('0').notNull(),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default('0').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Wallet transactions table
export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: uuid("wallet_id").references(() => wallets.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // credit, debit
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  descriptionAr: text("description_ar"),
  reason: text("reason"), // Additional reason for admin-initiated transactions
  referenceType: varchar("reference_type", { length: 50 }), // booking, topup, referral, refund
  referenceId: uuid("reference_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Referral campaigns table
export const referralCampaigns = pgTable("referral_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: jsonb("name").notNull(), // { "en": "Launch Campaign", "ar": "حملة الإطلاق" }
  description: jsonb("description").notNull(),
  inviterReward: decimal("inviter_reward", { precision: 10, scale: 2 }).notNull(), // Reward for referrer
  inviteeDiscountType: discountTypeEnum("invitee_discount_type").notNull(), // percentage or fixed
  inviteeDiscountValue: decimal("invitee_discount_value", { precision: 10, scale: 2 }).notNull(), // Discount for new user
  maxUsagePerUser: integer("max_usage_per_user").default(1).notNull(), // How many times each user can refer
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Referrals table
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").references(() => referralCampaigns.id).notNull(),
  inviterId: uuid("inviter_id").references(() => users.id).notNull(),
  inviteeId: uuid("invitee_id").references(() => users.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  referralCode: varchar("referral_code", { length: 50 }).notNull(),
  status: referralStatusEnum("status").default('pending').notNull(),
  inviterReward: decimal("inviter_reward", { precision: 10, scale: 2 }).notNull(),
  inviteeDiscount: decimal("invitee_discount", { precision: 10, scale: 2 }).notNull(),
  completedAt: timestamp("completed_at"),
  rewardDistributedAt: timestamp("reward_distributed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Coupons table
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: jsonb("name").notNull(), // { "en": "New Year Sale", "ar": "تخفيضات السنة الجديدة" }
  description: jsonb("description"),
  type: couponTypeEnum("type").notNull(), // percentage or fixed_amount
  value: decimal("value", { precision: 10, scale: 2 }).notNull(), // Discount value
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }), // Minimum order to use coupon
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }), // Maximum discount for percentage coupons
  maxUsesTotal: integer("max_uses_total"), // Total uses allowed (null = unlimited)
  maxUsesPerUser: integer("max_uses_per_user").default(1).notNull(), // Per-user limit
  currentUses: integer("current_uses").default(0).notNull(), // Track total uses
  serviceIds: jsonb("service_ids"), // Array of service UUIDs (null = all services)
  firstTimeOnly: boolean("first_time_only").default(false).notNull(), // Only for first-time users
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until"),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Coupon usage tracking table
export const couponUsages = pgTable("coupon_usages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  couponId: uuid("coupon_id").references(() => coupons.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Credit transactions table (for marketing credits with expiration)
export const creditTransactions = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: creditTransactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Positive for credit, negative for deduction
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(), // User's credit balance after this transaction
  reason: jsonb("reason").notNull(), // { "en": "Welcome bonus", "ar": "مكافأة الترحيب" }
  referenceType: varchar("reference_type", { length: 50 }), // booking, referral, admin
  referenceId: uuid("reference_id"),
  expiresAt: timestamp("expires_at"), // When this credit expires
  isExpired: boolean("is_expired").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Loyalty settings table (system-wide configuration)
export const loyaltySettings = pgTable("loyalty_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  welcomeBonusAmount: decimal("welcome_bonus_amount", { precision: 10, scale: 2 }).default('20').notNull(),
  firstBookingBonusAmount: decimal("first_booking_bonus_amount", { precision: 10, scale: 2 }).default('30').notNull(),
  referrerRewardAmount: decimal("referrer_reward_amount", { precision: 10, scale: 2 }).default('50').notNull(),
  refereeRewardAmount: decimal("referee_reward_amount", { precision: 10, scale: 2 }).default('30').notNull(),
  cashbackPercentage: decimal("cashback_percentage", { precision: 5, scale: 2 }).default('2').notNull(), // 2% cashback
  creditExpiryDays: integer("credit_expiry_days").default(90).notNull(), // Credits expire after 90 days
  maxCreditPercentage: decimal("max_credit_percentage", { precision: 5, scale: 2 }).default('30').notNull(), // Max 30% of booking can be credits
  minBookingForCredit: decimal("min_booking_for_credit", { precision: 10, scale: 2 }).default('50').notNull(), // Min 50 SAR to use credits
  isActive: boolean("is_active").default(true).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Marketing Settings table (global on/off switches for marketing features)
export const marketingSettings = pgTable("marketing_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  couponSystemEnabled: boolean("coupon_system_enabled").default(true).notNull(),
  creditSystemEnabled: boolean("credit_system_enabled").default(true).notNull(),
  referralSystemEnabled: boolean("referral_system_enabled").default(true).notNull(),
  loyaltyProgramEnabled: boolean("loyalty_program_enabled").default(true).notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notification Settings table
export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  orderUpdates: boolean("order_updates").default(true).notNull(),
  promotions: boolean("promotions").default(true).notNull(),
  technicianMessages: boolean("technician_messages").default(true).notNull(),
  paymentNotifications: boolean("payment_notifications").default(true).notNull(),
  subscriptionReminders: boolean("subscription_reminders").default(true).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  smsNotifications: boolean("sms_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: jsonb("title").notNull(),
  body: jsonb("body").notNull(),
  data: jsonb("data"), // Additional data for the notification
  isRead: boolean("is_read").default(false).notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  subjectAr: text("subject_ar"),
  description: text("description"), // Initial request/issue description
  priority: varchar("priority", { length: 10 }).default('medium').notNull(),
  status: supportStatusEnum("status").default('open').notNull(),
  assignedTo: uuid("assigned_to").references(() => users.id),
  bookingId: uuid("booking_id").references(() => bookings.id), // Optional link to booking
  rating: integer("rating"), // Customer rating 1-5 stars
  ratingComment: text("rating_comment"), // Optional customer feedback on support quality
  ratedAt: timestamp("rated_at"), // When the rating was submitted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Support messages table
export const supportMessages = pgTable("support_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: uuid("ticket_id").references(() => supportTickets.id).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  attachments: jsonb("attachments"), // Array of attachment objects
  isInternal: boolean("is_internal").default(false).notNull(), // For internal agent notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// FAQs table
export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category", { length: 50 }).notNull(), // general, booking, payment, services, etc.
  question: jsonb("question").notNull(), // { "en": "...", "ar": "..." }
  answer: jsonb("answer").notNull(), // { "en": "...", "ar": "..." }
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  technicianId: uuid("technician_id").references(() => users.id).notNull(),
  serviceRating: integer("service_rating").notNull(),
  technicianRating: integer("technician_rating").notNull(),
  comment: text("comment"),
  commentAr: text("comment_ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Promotions table
export const promotions = pgTable("promotions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: jsonb("name").notNull(),
  description: jsonb("description").notNull(),
  discountType: varchar("discount_type", { length: 20 }).notNull(), // percentage, fixed
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default('0').notNull(),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: uuid("resource_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Webhook events table
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar("provider", { length: 50 }).notNull(), // moyasar, tabby
  eventType: varchar("event_type", { length: 100 }).notNull(),
  eventId: varchar("event_id", { length: 255 }).notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status", { length: 20 }).default('pending').notNull(),
  attempts: integer("attempts").default(0).notNull(),
  processedAt: timestamp("processed_at"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Order status logs table for tracking
export const orderStatusLogs = pgTable("order_status_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  changedBy: uuid("changed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// App Configuration table
export const appConfig = pgTable("app_config", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // maintenance, version, features, limits
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  addresses: many(addresses),
  bookings: many(bookings),
  payments: many(payments),
  notifications: many(notifications),
  supportTickets: many(supportTickets),
  reviews: many(reviews),
  referralsAsInviter: many(referrals, { relationName: 'inviter' }),
  referralsAsInvitee: many(referrals, { relationName: 'invitee' }),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
  tiers: many(serviceTiers),
  subscriptionPackageServices: many(subscriptionPackageServices),
  bookings: many(bookings),
}));

export const serviceTiersRelations = relations(serviceTiers, ({ one, many }) => ({
  service: one(services, {
    fields: [serviceTiers.serviceId],
    references: [services.id],
  }),
  bookings: many(bookings),
}));

export const subscriptionPackagesRelations = relations(subscriptionPackages, ({ one, many }) => ({
  category: one(serviceCategories, {
    fields: [subscriptionPackages.categoryId],
    references: [serviceCategories.id],
  }),
  subscriptionPackageServices: many(subscriptionPackageServices),
  subscriptions: many(subscriptions),
}));

export const subscriptionPackageServicesRelations = relations(subscriptionPackageServices, ({ one }) => ({
  package: one(subscriptionPackages, {
    fields: [subscriptionPackageServices.packageId],
    references: [subscriptionPackages.id],
  }),
  service: one(services, {
    fields: [subscriptionPackageServices.serviceId],
    references: [services.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  service: one(services, {
    fields: [bookings.serviceId],
    references: [services.id],
  }),
  tier: one(serviceTiers, {
    fields: [bookings.tierId],
    references: [serviceTiers.id],
  }),
  subscription: one(subscriptions, {
    fields: [bookings.subscriptionId],
    references: [subscriptions.id],
  }),
  address: one(addresses, {
    fields: [bookings.addressId],
    references: [addresses.id],
  }),
  technician: one(users, {
    fields: [bookings.technicianId],
    references: [users.id],
  }),
  quotations: many(quotations),
  payments: many(payments),
  statusLogs: many(orderStatusLogs),
  reviews: many(reviews),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [quotations.bookingId],
    references: [bookings.id],
  }),
  technician: one(users, {
    fields: [quotations.technicianId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [quotations.approvedBy],
    references: [users.id],
  }),
  spareParts: many(quotationSpareParts),
}));

export const quotationSparePartsRelations = relations(quotationSpareParts, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationSpareParts.quotationId],
    references: [quotations.id],
  }),
  sparePart: one(spareParts, {
    fields: [quotationSpareParts.sparePartId],
    references: [spareParts.id],
  }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletTransactions.walletId],
    references: [wallets.id],
  }),
  user: one(users, {
    fields: [walletTransactions.userId],
    references: [users.id],
  }),
}));

export const referralCampaignsRelations = relations(referralCampaigns, ({ many }) => ({
  referrals: many(referrals),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  campaign: one(referralCampaigns, {
    fields: [referrals.campaignId],
    references: [referralCampaigns.id],
  }),
  inviter: one(users, {
    fields: [referrals.inviterId],
    references: [users.id],
    relationName: 'inviter',
  }),
  invitee: one(users, {
    fields: [referrals.inviteeId],
    references: [users.id],
    relationName: 'invitee',
  }),
  booking: one(bookings, {
    fields: [referrals.bookingId],
    references: [bookings.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  assignedToUser: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [supportTickets.bookingId],
    references: [bookings.id],
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(users, {
    fields: [supportMessages.senderId],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  technician: one(users, {
    fields: [reviews.technicianId],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  booking: one(bookings, {
    fields: [invoices.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAddressSchema = createInsertSchema(addresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true,
  createdAt: true,
});

export const insertServiceSchema = createInsertSchema(services).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceTierSchema = createInsertSchema(serviceTiers).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionPackageSchema = createInsertSchema(subscriptionPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionPackageServiceSchema = createInsertSchema(subscriptionPackageServices).omit({
  id: true,
  createdAt: true,
});

export const insertBrandSchema = createInsertSchema(brands).omit({
  id: true,
  createdAt: true,
});

export const insertSparePartSchema = createInsertSchema(spareParts).omit({
  id: true,
  createdAt: true,
});

export const insertHomeSliderImageSchema = createInsertSchema(homeSliderImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHomeBannerSchema = createInsertSchema(homeBanner).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQuotationSchema = createInsertSchema(quotations).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertReferralCampaignSchema = createInsertSchema(referralCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSettingsSchema = createInsertSchema(notificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export const insertFaqSchema = createInsertSchema(faqs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertPromotionSchema = createInsertSchema(promotions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppConfigSchema = createInsertSchema(appConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  currentUses: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouponUsageSchema = createInsertSchema(couponUsages).omit({
  id: true,
  createdAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  balance: true,
  isExpired: true,
  createdAt: true,
});

export const insertLoyaltySettingsSchema = createInsertSchema(loyaltySettings).omit({
  id: true,
  updatedAt: true,
});

export const insertMarketingSettingsSchema = createInsertSchema(marketingSettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceTier = typeof serviceTiers.$inferSelect;
export type InsertServiceTier = z.infer<typeof insertServiceTierSchema>;
export type SubscriptionPackage = typeof subscriptionPackages.$inferSelect;
export type InsertSubscriptionPackage = z.infer<typeof insertSubscriptionPackageSchema>;
export type SubscriptionPackageService = typeof subscriptionPackageServices.$inferSelect;
export type InsertSubscriptionPackageService = z.infer<typeof insertSubscriptionPackageServiceSchema>;
export type Brand = typeof brands.$inferSelect;
export type InsertBrand = z.infer<typeof insertBrandSchema>;
export type SparePart = typeof spareParts.$inferSelect;
export type InsertSparePart = z.infer<typeof insertSparePartSchema>;
export type HomeSliderImage = typeof homeSliderImages.$inferSelect;
export type InsertHomeSliderImage = z.infer<typeof insertHomeSliderImageSchema>;
export type HomeBanner = typeof homeBanner.$inferSelect;
export type InsertHomeBanner = z.infer<typeof insertHomeBannerSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type ReferralCampaign = typeof referralCampaigns.$inferSelect;
export type InsertReferralCampaign = z.infer<typeof insertReferralCampaignSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Promotion = typeof promotions.$inferSelect;
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type OrderStatusLog = typeof orderStatusLogs.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type AppConfig = typeof appConfig.$inferSelect;
export type InsertAppConfig = z.infer<typeof insertAppConfigSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type CouponUsage = typeof couponUsages.$inferSelect;
export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type LoyaltySettings = typeof loyaltySettings.$inferSelect;
export type InsertLoyaltySettings = z.infer<typeof insertLoyaltySettingsSchema>;
export type MarketingSettings = typeof marketingSettings.$inferSelect;
export type InsertMarketingSettings = z.infer<typeof insertMarketingSettingsSchema>;
