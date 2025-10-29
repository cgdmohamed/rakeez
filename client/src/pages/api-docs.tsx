import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Send, Sparkles, Check, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  auth: boolean;
  roles?: string[];
  requestBody?: {
    type: string;
    example: any;
  };
  queryParams?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    descriptionAr: string;
  }>;
  responseExample?: {
    success: any;
    error?: any;
  };
}

const methodColors = {
  GET: 'bg-green-500 hover:bg-green-600',
  POST: 'bg-blue-500 hover:bg-blue-600',
  PUT: 'bg-yellow-500 hover:bg-yellow-600',
  PATCH: 'bg-orange-500 hover:bg-orange-600',
  DELETE: 'bg-red-500 hover:bg-red-600'
};

const endpoints: Record<string, ApiEndpoint[]> = {
  auth: [
    {
      method: 'POST',
      path: '/api/v2/auth/register',
      title: 'Register User',
      titleAr: 'تسجيل مستخدم جديد',
      description: 'Register a new user account with email or phone number',
      descriptionAr: 'تسجيل حساب مستخدم جديد باستخدام البريد الإلكتروني أو رقم الهاتف',
      auth: false,
      requestBody: {
        type: 'object',
        example: {
          email: 'user@example.com',
          phone: '+966501234567',
          password: 'SecurePass123!',
          name: 'Ahmed Ali',
          name_ar: 'أحمد علي',
          language: 'en',
          device_token: 'ExponentPushToken[...]'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'تم إنشاء الحساب بنجاح. يرجى التحقق من رمز OTP',
          data: {
            user_id: 'usr_1a2b3c4d5e',
            requires_verification: true,
            verification_method: 'phone'
          }
        },
        error: {
          success: false,
          message: 'User already exists'
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/auth/login',
      title: 'User Login',
      titleAr: 'تسجيل الدخول',
      description: 'Authenticate user and receive JWT access token',
      descriptionAr: 'مصادقة المستخدم والحصول على رمز الوصول JWT',
      auth: false,
      requestBody: {
        type: 'object',
        example: {
          identifier: 'user@example.com',
          password: 'SecurePass123!',
          language: 'en'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Login successful',
          data: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'ref_...',
            expires_in: 86400,
            user: {
              id: 'usr_123',
              name: 'Ahmed Ali',
              email: 'user@example.com',
              role: 'customer',
              language: 'en'
            }
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/auth/verify-otp',
      title: 'Verify OTP',
      titleAr: 'التحقق من رمز OTP',
      description: 'Verify OTP code sent via SMS or email',
      descriptionAr: 'التحقق من رمز OTP المرسل عبر الرسائل القصيرة أو البريد الإلكتروني',
      auth: false,
      requestBody: {
        type: 'object',
        example: {
          identifier: '+966501234567',
          otp_code: '123456',
          language: 'en'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Verification successful',
          data: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'ref_...',
            expires_in: 86400,
            user: {
              id: 'usr_123',
              name: 'Ahmed Ali'
            }
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/auth/resend-otp',
      title: 'Resend OTP',
      titleAr: 'إعادة إرسال رمز OTP',
      description: 'Resend OTP code to user',
      descriptionAr: 'إعادة إرسال رمز OTP إلى المستخدم',
      auth: false,
      requestBody: {
        type: 'object',
        example: {
          identifier: '+966501234567',
          language: 'en'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'OTP resent successfully'
        }
      }
    }
  ],
  profile: [
    {
      method: 'GET',
      path: '/api/v2/profile',
      title: 'Get Profile',
      titleAr: 'الحصول على الملف الشخصي',
      description: 'Retrieve authenticated user profile information',
      descriptionAr: 'استرداد معلومات الملف الشخصي للمستخدم المصادق عليه',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            id: 'usr_123',
            name: 'Ahmed Ali',
            name_ar: 'أحمد علي',
            email: 'user@example.com',
            phone: '+966501234567',
            language: 'en',
            avatar: 'https://storage.example.com/avatar.jpg',
            role: 'customer',
            created_at: '2024-01-01T00:00:00Z'
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/profile',
      title: 'Update Profile',
      titleAr: 'تحديث الملف الشخصي',
      description: 'Update user profile information',
      descriptionAr: 'تحديث معلومات الملف الشخصي للمستخدم',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          name: 'Ahmed Ali Updated',
          name_ar: 'أحمد علي محدث',
          language: 'ar',
          device_token: 'ExponentPushToken[...]'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Profile updated successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/addresses',
      title: 'Get Addresses',
      titleAr: 'الحصول على العناوين',
      description: 'Retrieve all addresses for authenticated user',
      descriptionAr: 'استرداد جميع عناوين المستخدم المصادق عليه',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'addr_123',
              label: 'Home',
              label_ar: 'المنزل',
              address: '123 King Fahd Road, Riyadh',
              city: 'Riyadh',
              latitude: 24.7136,
              longitude: 46.6753,
              is_default: true
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/addresses',
      title: 'Create Address',
      titleAr: 'إنشاء عنوان',
      description: 'Add a new address for the user',
      descriptionAr: 'إضافة عنوان جديد للمستخدم',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          label: 'Home',
          label_ar: 'المنزل',
          address: '123 King Fahd Road, Riyadh',
          address_ar: '123 طريق الملك فهد، الرياض',
          city: 'Riyadh',
          city_ar: 'الرياض',
          latitude: 24.7136,
          longitude: 46.6753,
          is_default: true
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Address created successfully',
          data: {
            id: 'addr_123',
            label: 'Home'
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/addresses/:id',
      title: 'Update Address',
      titleAr: 'تحديث العنوان',
      description: 'Update an existing address',
      descriptionAr: 'تحديث عنوان موجود',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          label: 'Office',
          is_default: false
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Address updated successfully'
        }
      }
    },
    {
      method: 'DELETE',
      path: '/api/v2/addresses/:id',
      title: 'Delete Address',
      titleAr: 'حذف العنوان',
      description: 'Delete an address',
      descriptionAr: 'حذف عنوان',
      auth: true,
      responseExample: {
        success: {
          success: true,
          message: 'Address deleted successfully'
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/profile/avatar',
      title: 'Update Avatar',
      titleAr: 'تحديث الصورة الشخصية',
      description: 'Update user avatar/profile picture',
      descriptionAr: 'تحديث الصورة الشخصية للمستخدم',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          avatar_url: 'https://storage.rakeez.sa/avatars/user123.jpg'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Avatar updated successfully'
        }
      }
    }
  ],
  services: [
    {
      method: 'GET',
      path: '/api/v2/services/categories',
      title: 'Get Service Categories',
      titleAr: 'الحصول على فئات الخدمات',
      description: 'Retrieve all active service categories',
      descriptionAr: 'استرداد جميع فئات الخدمات النشطة',
      auth: false,
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'cat_123',
              name: { en: 'Home Cleaning', ar: 'تنظيف المنزل' },
              description: { en: 'Professional home cleaning services', ar: 'خدمات تنظيف منزلية احترافية' },
              icon: 'https://storage.rakeez.sa/icons/home-cleaning.png'
            }
          ]
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/services/categories/:categoryId/services',
      title: 'Get Services by Category',
      titleAr: 'الحصول على الخدمات حسب الفئة',
      description: 'Retrieve all services within a specific category',
      descriptionAr: 'استرداد جميع الخدمات ضمن فئة معينة',
      auth: false,
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'srv_123',
              name: { en: 'Deep Cleaning', ar: 'تنظيف عميق' },
              description: { en: 'Complete deep cleaning service', ar: 'خدمة تنظيف عميق شاملة' },
              base_price: 500,
              estimated_duration: 180,
              packages: [
                {
                  id: 'pkg_123',
                  name: { en: 'Basic Package', ar: 'الباقة الأساسية' },
                  price: 500,
                  discount_percentage: 0
                }
              ]
            }
          ]
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/spare-parts',
      title: 'Get Spare Parts',
      titleAr: 'الحصول على قطع الغيار',
      description: 'Retrieve available spare parts with optional category filter',
      descriptionAr: 'استرداد قطع الغيار المتاحة مع تصفية اختيارية حسب الفئة',
      auth: false,
      queryParams: [
        {
          name: 'category_id',
          type: 'string',
          required: false,
          description: 'Filter by category ID',
          descriptionAr: 'التصفية حسب معرف الفئة'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'sp_123',
              name: { en: 'Air Filter', ar: 'فلتر هواء' },
              description: { en: 'High quality air filter', ar: 'فلتر هواء عالي الجودة' },
              price: 50,
              image_url: 'https://storage.rakeez.sa/parts/filter.jpg'
            }
          ]
        }
      }
    }
  ],
  subscriptions: [
    {
      method: 'GET',
      path: '/api/v2/subscription-packages',
      title: 'Get Subscription Packages',
      titleAr: 'الحصول على باقات الاشتراكات',
      description: 'Browse all active subscription packages with optional filtering by tier or category (returns localized content based on Accept-Language header)',
      descriptionAr: 'تصفح جميع باقات الاشتراكات النشطة مع تصفية اختيارية حسب المستوى أو الفئة (يعيد محتوى محلي بناءً على ترويسة Accept-Language)',
      auth: false,
      queryParams: [
        {
          name: 'tier',
          type: 'string',
          required: false,
          description: 'Filter by tier (basic, premium, vip, enterprise)',
          descriptionAr: 'التصفية حسب المستوى (أساسي، مميز، VIP، مؤسسي)'
        },
        {
          name: 'category_id',
          type: 'string',
          required: false,
          description: 'Filter by service category ID',
          descriptionAr: 'التصفية حسب معرف فئة الخدمة'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'pkg_123',
              name: 'Premium Cleaning Package',
              description: 'Professional cleaning services bundle',
              tier: 'premium',
              price: '500.00',
              duration_days: 30,
              discount_percentage: '10.00',
              inclusions: ['Free delivery', 'Priority support'],
              terms_and_conditions: 'Terms apply',
              image: 'https://storage.example.com/packages/premium.jpg',
              category_id: 'cat_123'
            }
          ]
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/subscription-packages/:id',
      title: 'Get Package Details',
      titleAr: 'تفاصيل الباقة',
      description: 'Get detailed information about a specific subscription package with all included services (returns localized content)',
      descriptionAr: 'الحصول على معلومات تفصيلية حول باقة اشتراك محددة مع جميع الخدمات المضمنة (يعيد محتوى محلي)',
      auth: false,
      responseExample: {
        success: {
          success: true,
          data: {
            id: 'pkg_123',
            name: 'Premium Cleaning Package',
            description: 'Professional cleaning services bundle',
            tier: 'premium',
            price: '500.00',
            duration_days: 30,
            discount_percentage: '10.00',
            inclusions: ['Free delivery', 'Priority support'],
            terms_and_conditions: 'Terms apply',
            image: 'https://storage.example.com/packages/premium.jpg',
            category_id: 'cat_123',
            included_services: [
              {
                id: 'link_123',
                usage_limit: 3,
                discount_percentage: '10.00',
                service: {
                  id: 'srv_123',
                  name: 'Deep Cleaning',
                  description: 'Professional deep cleaning service',
                  category: 'Home Cleaning',
                  image: 'https://storage.example.com/services/deep-cleaning.jpg'
                }
              }
            ]
          }
        }
      }
    }
  ],
  bookings: [
    {
      method: 'GET',
      path: '/api/v2/bookings/available-slots',
      title: 'Get Available Slots',
      titleAr: 'الحصول على المواعيد المتاحة',
      description: 'Get available time slots for a service on a specific date',
      descriptionAr: 'الحصول على الأوقات المتاحة لخدمة في تاريخ محدد',
      auth: false,
      queryParams: [
        {
          name: 'date',
          type: 'string',
          required: true,
          description: 'Date in YYYY-MM-DD format',
          descriptionAr: 'التاريخ بصيغة YYYY-MM-DD'
        },
        {
          name: 'service_id',
          type: 'string',
          required: true,
          description: 'Service UUID',
          descriptionAr: 'معرف الخدمة'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: {
            date: '2024-01-20',
            slots: [
              { time: '10:00', available: true },
              { time: '14:00', available: true },
              { time: '16:00', available: false }
            ]
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/bookings/create',
      title: 'Create Booking',
      titleAr: 'إنشاء حجز',
      description: 'Create a new service booking (one-time or subscription-based). Supports referral codes for discounts.',
      descriptionAr: 'إنشاء حجز خدمة جديد (دفعة واحدة أو بناءً على اشتراك). يدعم رموز الإحالة للحصول على خصومات.',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          service_id: 'srv_123',
          tier_id: 'tier_123',
          subscription_id: 'sub_123 (optional - use for subscription-based bookings)',
          address_id: 'addr_123',
          scheduled_date: '2024-01-20',
          scheduled_time: '10:00',
          notes: 'Please bring cleaning supplies',
          referral_code: 'ABC123 (optional - customer referral code for discount)'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Booking created successfully',
          data: {
            booking_id: 'bkg_123',
            status: 'pending',
            total_amount: 400,
            referral_discount: 100,
            payment_status: 'pending'
          }
        },
        error: {
          success: false,
          message: 'Invalid referral code',
          error: 'No active referral campaign available'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/bookings/:id',
      title: 'Get Booking Details',
      titleAr: 'الحصول على تفاصيل الحجز',
      description: 'Retrieve details of a specific booking',
      descriptionAr: 'استرداد تفاصيل حجز معين',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            id: 'bkg_123',
            service_name: { en: 'Deep Cleaning', ar: 'تنظيف عميق' },
            status: 'confirmed',
            scheduled_date: '2024-01-20',
            scheduled_time: '10:00',
            total_amount: 500,
            technician: {
              name: 'Mohammed Ahmed',
              phone: '+966501234567'
            }
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/bookings/:id/status',
      title: 'Update Booking Status',
      titleAr: 'تحديث حالة الحجز',
      description: 'Update the status of a booking (Technician only)',
      descriptionAr: 'تحديث حالة الحجز (للفنيين فقط)',
      auth: true,
      roles: ['technician'],
      requestBody: {
        type: 'object',
        example: {
          status: 'in_progress',
          notes: 'Started cleaning'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Status updated successfully'
        }
      }
    }
  ],
  quotations: [
    {
      method: 'POST',
      path: '/api/v2/quotations/create',
      title: 'Create Quotation',
      titleAr: 'إنشاء عرض سعر',
      description: 'Create a quotation for a booking (Technician only)',
      descriptionAr: 'إنشاء عرض سعر للحجز (للفنيين فقط)',
      auth: true,
      roles: ['technician'],
      requestBody: {
        type: 'object',
        example: {
          booking_id: 'bkg_123',
          additional_cost: 100,
          notes: { en: 'Additional parts needed', ar: 'قطع إضافية مطلوبة' },
          spare_parts: [
            {
              spare_part_id: 'sp_123',
              quantity: 2,
              unit_price: 50
            }
          ]
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Quotation created successfully',
          data: {
            quotation_id: 'quo_123',
            status: 'pending_approval'
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/quotations/:id/approve',
      title: 'Approve Quotation',
      titleAr: 'الموافقة على عرض السعر',
      description: 'Approve a quotation (Customer)',
      descriptionAr: 'الموافقة على عرض السعر (العميل)',
      auth: true,
      responseExample: {
        success: {
          success: true,
          message: 'Quotation approved successfully'
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/quotations/:id/reject',
      title: 'Reject Quotation',
      titleAr: 'رفض عرض السعر',
      description: 'Reject a quotation (Customer)',
      descriptionAr: 'رفض عرض السعر (العميل)',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          rejection_reason: 'Price too high'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Quotation rejected'
        }
      }
    }
  ],
  payments: [
    {
      method: 'POST',
      path: '/api/v2/payments/create',
      title: 'Create Payment',
      titleAr: 'إنشاء دفع',
      description: 'Process payment for booking using wallet and/or gateway',
      descriptionAr: 'معالجة الدفع للحجز باستخدام المحفظة و/أو البوابة',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          booking_id: 'bkg_123',
          payment_method: 'moyasar',
          wallet_amount: 100,
          gateway_amount: 400
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Payment processed',
          data: {
            payment_id: 'pay_123',
            status: 'paid',
            payment_url: 'https://moyasar.com/checkout/...'
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/payments/moyasar/verify',
      title: 'Verify Moyasar Payment',
      titleAr: 'التحقق من دفع ميسر',
      description: 'Verify payment status with Moyasar',
      descriptionAr: 'التحقق من حالة الدفع مع ميسر',
      auth: true,
      queryParams: [
        {
          name: 'payment_id',
          type: 'string',
          required: true,
          description: 'Moyasar payment ID',
          descriptionAr: 'معرف دفع ميسر'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: {
            status: 'paid',
            amount: 500,
            payment_id: 'pay_123'
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/payments/tabby/capture',
      title: 'Capture Tabby Payment',
      titleAr: 'تأكيد دفع تابي',
      description: 'Capture authorized Tabby payment (Admin/Technician)',
      descriptionAr: 'تأكيد دفع تابي المصرح (مسؤول/فني)',
      auth: true,
      roles: ['admin', 'technician'],
      requestBody: {
        type: 'object',
        example: {
          payment_id: 'pay_123',
          amount: 500
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Payment captured successfully'
        }
      }
    }
  ],
  wallet: [
    {
      method: 'GET',
      path: '/api/v2/wallet',
      title: 'Get Wallet',
      titleAr: 'الحصول على المحفظة',
      description: 'Get wallet balance and recent transactions',
      descriptionAr: 'الحصول على رصيد المحفظة والمعاملات الأخيرة',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            balance: 250.50,
            currency: 'SAR',
            transactions: [
              {
                id: 'txn_123',
                type: 'credit',
                amount: 100,
                description: 'Referral bonus',
                created_at: '2024-01-15T10:00:00Z'
              }
            ]
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/wallet/topup',
      title: 'Top Up Wallet',
      titleAr: 'شحن المحفظة',
      description: 'Add credit to wallet',
      descriptionAr: 'إضافة رصيد إلى المحفظة',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          amount: 100,
          payment_method: 'moyasar'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Wallet topped up successfully',
          data: {
            new_balance: 350.50,
            payment_url: 'https://moyasar.com/checkout/...'
          }
        }
      }
    }
  ],
  referrals: [
    {
      method: 'POST',
      path: '/api/v2/referrals/validate',
      title: 'Validate Referral Code',
      titleAr: 'التحقق من رمز الإحالة',
      description: 'Validate a referral code before applying it to a booking. Checks if code exists, has active campaign, and usage limits.',
      descriptionAr: 'التحقق من رمز الإحالة قبل تطبيقه على الحجز. يتحقق من وجود الرمز، والحملة النشطة، وحدود الاستخدام.',
      auth: false,
      requestBody: {
        type: 'object',
        example: {
          referral_code: 'ABC123'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Referral code is valid',
          data: {
            discount_type: 'percentage',
            discount_value: 20,
            inviter_name: 'Ahmed Ali',
            campaign_name: { en: 'Launch Campaign', ar: 'حملة الإطلاق' }
          }
        },
        error: {
          success: false,
          message: 'Invalid referral code',
          error: 'No active referral campaign available'
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/referrals/redeem',
      title: 'Redeem Referral Code',
      titleAr: 'استخدام رمز الإحالة',
      description: 'Redeem a referral code (applied during booking creation). Creates referral record and applies discount.',
      descriptionAr: 'استخدام رمز الإحالة (يتم تطبيقه عند إنشاء الحجز). ينشئ سجل إحالة ويطبق الخصم.',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          referral_code: 'ABC123',
          booking_id: 'bkg_123'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Referral code redeemed successfully',
          data: {
            referral_id: 'ref_123',
            discount_applied: 100,
            inviter_reward: 50
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/referrals/stats',
      title: 'Get Referral Stats',
      titleAr: 'إحصائيات الإحالة',
      description: 'Get referral statistics and earnings for authenticated user',
      descriptionAr: 'الحصول على إحصائيات الإحالة والأرباح للمستخدم',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            referral_code: 'ABC123',
            total_referrals: 5,
            completed_referrals: 3,
            pending_referrals: 2,
            total_rewards_earned: 150.00,
            pending_rewards: 50.00,
            referrals: [
              {
                id: 'ref_123',
                invitee_name: 'Mohammed Ali',
                status: 'completed',
                reward: 50.00,
                created_at: '2024-01-15T10:00:00Z'
              }
            ]
          }
        }
      }
    }
  ],
  orders: [
    {
      method: 'GET',
      path: '/api/v2/orders',
      title: 'Get Orders',
      titleAr: 'الحصول على الطلبات',
      description: 'Retrieve all bookings/orders for authenticated customer',
      descriptionAr: 'استرداد جميع الحجوزات/الطلبات للعميل',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'bkg_123',
              service_name: { en: 'Deep Cleaning', ar: 'تنظيف عميق' },
              status: 'completed',
              scheduled_date: '2024-01-15',
              total_amount: 500
            }
          ]
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/orders/:id/status',
      title: 'Get Order Status',
      titleAr: 'حالة الطلب',
      description: 'Get detailed status of an order with timeline',
      descriptionAr: 'الحصول على حالة مفصلة للطلب مع الجدول الزمني',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            current_status: 'in_progress',
            status_history: [
              {
                status: 'confirmed',
                timestamp: '2024-01-15T08:00:00Z',
                notes: 'Booking confirmed'
              },
              {
                status: 'in_progress',
                timestamp: '2024-01-15T10:00:00Z',
                notes: 'Technician started work'
              }
            ]
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/orders/:id/invoice',
      title: 'Download Invoice',
      titleAr: 'تحميل الفاتورة',
      description: 'Generate and download PDF invoice for completed order',
      descriptionAr: 'إنشاء وتحميل فاتورة PDF للطلب المكتمل',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            invoice_url: 'https://storage.rakeez.sa/invoices/bkg_123.pdf'
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/orders/:id/review',
      title: 'Submit Review',
      titleAr: 'إرسال تقييم',
      description: 'Submit a review for completed service',
      descriptionAr: 'إرسال تقييم للخدمة المكتملة',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          rating: 5,
          comment: 'Excellent service!',
          comment_ar: 'خدمة ممتازة!'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Review submitted successfully'
        }
      }
    }
  ],
  support: [
    {
      method: 'GET',
      path: '/api/v2/support/faqs',
      title: 'Get FAQs',
      titleAr: 'الأسئلة الشائعة',
      description: 'Retrieve frequently asked questions',
      descriptionAr: 'استرداد الأسئلة المتكررة',
      auth: false,
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'faq_123',
              question: { en: 'How do I book a service?', ar: 'كيف أحجز خدمة؟' },
              answer: { en: 'You can book...', ar: 'يمكنك الحجز...' },
              category: 'booking'
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/support/tickets',
      title: 'Create Support Ticket',
      titleAr: 'إنشاء تذكرة دعم',
      description: 'Create a new support ticket',
      descriptionAr: 'إنشاء تذكرة دعم جديدة',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          subject: 'Issue with payment',
          subject_ar: 'مشكلة في الدفع',
          description: 'Payment failed but amount was deducted',
          priority: 'high',
          category: 'payment'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Support ticket created',
          data: {
            ticket_id: 'tkt_123',
            ticket_number: '#12345'
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/support/tickets',
      title: 'Get My Tickets',
      titleAr: 'تذاكري',
      description: 'Retrieve all support tickets for authenticated user',
      descriptionAr: 'استرداد جميع تذاكر الدعم للمستخدم',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'tkt_123',
              ticket_number: '#12345',
              subject: 'Issue with payment',
              status: 'open',
              priority: 'high',
              created_at: '2024-01-15T10:00:00Z'
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/support/messages',
      title: 'Send Ticket Message',
      titleAr: 'إرسال رسالة',
      description: 'Send a message within a support ticket',
      descriptionAr: 'إرسال رسالة ضمن تذكرة الدعم',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          ticket_id: 'tkt_123',
          message: 'I am still waiting for resolution'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Message sent successfully'
        }
      }
    }
  ],
  notifications: [
    {
      method: 'GET',
      path: '/api/v2/notifications',
      title: 'Get Notifications',
      titleAr: 'الإشعارات',
      description: 'Retrieve all notifications for authenticated user',
      descriptionAr: 'استرداد جميع الإشعارات للمستخدم',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'not_123',
              title: { en: 'Booking Confirmed', ar: 'تم تأكيد الحجز' },
              body: { en: 'Your booking has been confirmed', ar: 'تم تأكيد حجزك' },
              is_read: false,
              created_at: '2024-01-15T10:00:00Z'
            }
          ]
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/notifications/:id/read',
      title: 'Mark as Read',
      titleAr: 'وضع علامة مقروء',
      description: 'Mark notification as read',
      descriptionAr: 'وضع علامة على الإشعار كمقروء',
      auth: true,
      responseExample: {
        success: {
          success: true,
          message: 'Notification marked as read'
        }
      }
    }
  ],
  technician: [
    {
      method: 'GET',
      path: '/api/v2/profile',
      title: 'Get Profile',
      titleAr: 'عرض الملف الشخصي',
      description: 'Get authenticated technician profile information',
      descriptionAr: 'الحصول على معلومات الملف الشخصي للفني',
      auth: true,
      responseExample: {
        success: {
          success: true,
          message: 'Profile retrieved successfully',
          data: {
            id: 'tech-uuid',
            name: 'Ahmed Al-Rashid',
            name_ar: 'أحمد الراشد',
            email: 'ahmed@rakeez.sa',
            phone: '+966501234567',
            language: 'en',
            role: 'technician',
            created_at: '2025-01-15T10:30:00.000Z'
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/profile',
      title: 'Update Profile',
      titleAr: 'تحديث الملف الشخصي',
      description: 'Update technician personal information',
      descriptionAr: 'تحديث المعلومات الشخصية للفني',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          name: 'Ahmed Al-Rashid',
          name_ar: 'أحمد الراشد',
          language: 'en',
          device_token: 'ExponentPushToken[...]'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Profile updated successfully',
          data: {
            id: 'tech-uuid',
            name: 'Ahmed Al-Rashid',
            name_ar: 'أحمد الراشد'
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/auth/change-password',
      title: 'Change Password',
      titleAr: 'تغيير كلمة المرور',
      description: 'Change password with strong validation (8+ chars, uppercase, lowercase, number, special char)',
      descriptionAr: 'تغيير كلمة المرور مع التحقق القوي (8+ أحرف، أحرف كبيرة، صغيرة، رقم، حرف خاص)',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          current_password: 'OldPass123!',
          new_password: 'NewPass456@'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Password changed successfully'
        },
        error: {
          success: false,
          message: 'Invalid current password'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/technician/orders',
      title: 'Get All Orders',
      titleAr: 'الحصول على جميع الطلبات',
      description: 'Get all bookings assigned to technician',
      descriptionAr: 'الحصول على جميع الحجوزات المخصصة للفني',
      auth: true,
      roles: ['technician'],
      queryParams: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by status (pending, confirmed, technician_assigned, en_route, in_progress, completed, cancelled)',
          descriptionAr: 'التصفية حسب الحالة'
        }
      ],
      responseExample: {
        success: {
          success: true,
          message: 'Technician orders retrieved successfully',
          data: [
            {
              id: 'booking-uuid',
              userId: 'user-uuid',
              serviceId: 'service-uuid',
              status: 'confirmed',
              scheduledDate: '2025-10-30',
              scheduledTime: '14:00',
              totalAmount: '350.00',
              user: {
                id: 'user-uuid',
                name: 'Mohammed Ali',
                email: 'mohammed@example.com',
                phone: '+966501111111'
              },
              service: {
                id: 'service-uuid',
                name: 'Deep Cleaning'
              },
              address: {
                streetName: 'King Fahd Road',
                houseNo: '123',
                district: 'Al Olaya'
              }
            }
          ]
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/technician/:userId/bookings',
      title: 'Get Technician Bookings',
      titleAr: 'حجوزات الفني',
      description: 'Alternative endpoint to get technician bookings',
      descriptionAr: 'نقطة نهاية بديلة للحصول على حجوزات الفني',
      auth: true,
      queryParams: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by booking status',
          descriptionAr: 'التصفية حسب حالة الحجز'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'booking-uuid',
              status: 'completed',
              scheduledDate: '2025-10-25',
              totalAmount: '450.00',
              user: {
                name: 'Sara Ahmed',
                phone: '+966502222222'
              },
              service: {
                name: 'Home Cleaning'
              }
            }
          ]
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/technician/orders/:id/accept',
      title: 'Accept Order',
      titleAr: 'قبول الطلب',
      description: 'Accept a booking assigned to technician',
      descriptionAr: 'قبول حجز تم تعيينه للفني',
      auth: true,
      roles: ['technician'],
      responseExample: {
        success: {
          success: true,
          message: 'Order accepted successfully'
        },
        error: {
          success: false,
          message: 'Booking not assigned to you'
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/technician/orders/:id/status',
      title: 'Update Order Status',
      titleAr: 'تحديث حالة الطلب',
      description: 'Update booking status during service delivery (en_route, in_progress, completed)',
      descriptionAr: 'تحديث حالة الحجز أثناء تقديم الخدمة',
      auth: true,
      roles: ['technician'],
      requestBody: {
        type: 'object',
        example: {
          status: 'en_route',
          notes: 'On my way to the location'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Order status updated successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/technician/performance',
      title: 'Get Performance Metrics',
      titleAr: 'مقاييس الأداء',
      description: 'Get comprehensive performance statistics and earnings data',
      descriptionAr: 'الحصول على إحصاءات الأداء الشاملة وبيانات الأرباح',
      auth: true,
      roles: ['technician'],
      responseExample: {
        success: {
          success: true,
          message: 'Performance retrieved successfully',
          data: {
            overall: {
              totalJobs: 85,
              completedJobs: 78,
              cancelledJobs: 7,
              completionRate: 91.76,
              cancellationRate: 8.24,
              averageRating: 4.65,
              averageResponseTime: 2.5,
              totalRevenue: 34500.00
            },
            monthlyStats: [
              {
                month: 'Oct 2025',
                completed: 12,
                cancelled: 1,
                total: 13,
                revenue: 5000.00
              }
            ],
            recentCompletedJobs: []
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/technician/quotations',
      title: 'Get Quotations',
      titleAr: 'عروض الأسعار',
      description: 'Get all quotations created by technician',
      descriptionAr: 'الحصول على جميع عروض الأسعار التي أنشأها الفني',
      auth: true,
      roles: ['technician'],
      queryParams: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by status (pending, approved, rejected)',
          descriptionAr: 'التصفية حسب الحالة'
        }
      ],
      responseExample: {
        success: {
          success: true,
          message: 'Quotations retrieved successfully',
          data: [
            {
              id: 'quotation-uuid',
              bookingId: 'booking-uuid',
              status: 'pending',
              estimatedCost: '550.00',
              estimatedDuration: 180,
              notes: 'Additional cleaning required',
              createdAt: '2025-10-26T09:00:00.000Z',
              booking: {
                scheduledDate: '2025-10-30',
                service: {
                  name: 'Deep Cleaning'
                },
                user: {
                  name: 'Mohammed Ali',
                  phone: '+966501111111'
                }
              }
            }
          ]
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/technician/availability',
      title: 'Update Availability',
      titleAr: 'تحديث التوفر',
      description: 'Update availability settings including working hours, service radius, and status',
      descriptionAr: 'تحديث إعدادات التوفر بما في ذلك ساعات العمل ونطاق الخدمة والحالة',
      auth: true,
      roles: ['technician'],
      requestBody: {
        type: 'object',
        example: {
          availabilityStatus: 'available',
          workingHours: {
            sunday: { start: '08:00', end: '17:00', enabled: true },
            monday: { start: '08:00', end: '17:00', enabled: true }
          },
          daysOff: ['2025-10-30', '2025-11-05'],
          serviceRadius: 25,
          homeLatitude: 24.7136,
          homeLongitude: 46.6753,
          maxDailyBookings: 5
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Availability updated successfully'
        }
      }
    }
  ],
  admin: [
    {
      method: 'GET',
      path: '/api/v2/admin/analytics',
      title: 'Get Analytics',
      titleAr: 'التحليلات',
      description: 'Get system analytics and statistics (Admin only)',
      descriptionAr: 'الحصول على تحليلات النظام والإحصائيات (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'from',
          type: 'string',
          required: false,
          description: 'Start date (YYYY-MM-DD)',
          descriptionAr: 'تاريخ البدء (YYYY-MM-DD)'
        },
        {
          name: 'to',
          type: 'string',
          required: false,
          description: 'End date (YYYY-MM-DD)',
          descriptionAr: 'تاريخ الانتهاء (YYYY-MM-DD)'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: {
            total_bookings: 150,
            total_revenue: 75000,
            active_customers: 85,
            completion_rate: 95.5
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/users',
      title: 'Get Users',
      titleAr: 'المستخدمون',
      description: 'Get all users with optional role filter (Admin only)',
      descriptionAr: 'الحصول على جميع المستخدمين مع تصفية اختيارية حسب الدور (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'role',
          type: 'string',
          required: false,
          description: 'Filter by role',
          descriptionAr: 'التصفية حسب الدور'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'usr_123',
              name: 'Ahmed Ali',
              email: 'user@example.com',
              role: 'customer',
              status: 'active',
              created_at: '2024-01-01T00:00:00Z'
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/users',
      title: 'Create User',
      titleAr: 'إنشاء مستخدم',
      description: 'Create a new user (Admin only)',
      descriptionAr: 'إنشاء مستخدم جديد (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          name: 'New User',
          role: 'technician',
          phone: '+966501234567'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'User created successfully',
          data: {
            user_id: 'usr_456'
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/roles',
      title: 'Get Roles',
      titleAr: 'الأدوار',
      description: 'Get all roles with permissions (Admin only)',
      descriptionAr: 'الحصول على جميع الأدوار مع الصلاحيات (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'role_123',
              name: 'Technician',
              name_ar: 'فني',
              permissions: ['manage_bookings', 'create_quotations'],
              is_system_role: true
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/roles',
      title: 'Create Role',
      titleAr: 'إنشاء دور',
      description: 'Create a new custom role (Admin only)',
      descriptionAr: 'إنشاء دور مخصص جديد (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          name: 'Custom Role',
          name_ar: 'دور مخصص',
          permissions: ['view_bookings', 'view_customers']
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Role created successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/bookings',
      title: 'Get All Bookings',
      titleAr: 'جميع الحجوزات',
      description: 'Retrieve all bookings with filters (Admin only)',
      descriptionAr: 'استرداد جميع الحجوزات مع التصفية (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by status',
          descriptionAr: 'التصفية حسب الحالة'
        },
        {
          name: 'from_date',
          type: 'string',
          required: false,
          description: 'Start date filter',
          descriptionAr: 'تصفية تاريخ البدء'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'bkg_123',
              customer_name: 'Ahmed Ali',
              service_name: 'Deep Cleaning',
              status: 'confirmed',
              total_amount: 500,
              scheduled_date: '2024-01-20'
            }
          ]
        }
      }
    },
    {
      method: 'PATCH',
      path: '/api/v2/admin/bookings/:id/cancel',
      title: 'Cancel Booking',
      titleAr: 'إلغاء الحجز',
      description: 'Cancel a booking (Admin only)',
      descriptionAr: 'إلغاء حجز (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          cancellation_reason: 'Customer request'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Booking cancelled successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/services',
      title: 'Manage Services',
      titleAr: 'إدارة الخدمات',
      description: 'Get all services for management (Admin only)',
      descriptionAr: 'الحصول على جميع الخدمات للإدارة (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'srv_123',
              name: { en: 'Deep Cleaning', ar: 'تنظيف عميق' },
              category: 'Home Cleaning',
              base_price: 500,
              is_active: true
            }
          ]
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/support/tickets',
      title: 'All Support Tickets',
      titleAr: 'جميع تذاكر الدعم',
      description: 'Get all support tickets with filters (Admin only)',
      descriptionAr: 'الحصول على جميع تذاكر الدعم مع التصفية (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by status (open, in_progress, resolved, closed)',
          descriptionAr: 'التصفية حسب الحالة (مفتوح، قيد التنفيذ، محلول، مغلق)'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'tkt_123',
              ticket_number: '#12345',
              customer_name: 'Ahmed Ali',
              subject: 'Payment Issue',
              status: 'open',
              priority: 'high',
              created_at: '2024-01-15T10:00:00Z'
            }
          ]
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/admin/support/tickets/:id',
      title: 'Update Ticket',
      titleAr: 'تحديث التذكرة',
      description: 'Update support ticket status/assignment (Admin only)',
      descriptionAr: 'تحديث حالة/تعيين تذكرة الدعم (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          status: 'in_progress',
          assigned_to: 'support_usr_456',
          priority: 'medium'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Ticket updated successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/customers/:id/overview',
      title: 'Customer Overview',
      titleAr: 'نظرة عامة على العميل',
      description: 'Get comprehensive customer information (Admin only)',
      descriptionAr: 'الحصول على معلومات شاملة عن العميل (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          data: {
            customer: {
              id: 'usr_123',
              name: 'Ahmed Ali',
              email: 'ahmed@example.com',
              phone: '+966501234567',
              total_bookings: 15,
              total_spent: 7500,
              wallet_balance: 250
            },
            recent_bookings: [],
            wallet_transactions: []
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/notifications/send',
      title: 'Send Notification',
      titleAr: 'إرسال إشعار',
      description: 'Send push notification to users (Admin only)',
      descriptionAr: 'إرسال إشعار دفع للمستخدمين (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          title: { en: 'New Offer', ar: 'عرض جديد' },
          body: { en: '50% discount on all services', ar: 'خصم 50٪ على جميع الخدمات' },
          target_type: 'all',
          role_filter: 'customer'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Notifications sent successfully',
          data: {
            sent_count: 150
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/analytics/export',
      title: 'Export Analytics',
      titleAr: 'تصدير التحليلات',
      description: 'Export analytics data to CSV/Excel (Admin only)',
      descriptionAr: 'تصدير بيانات التحليلات إلى CSV/Excel (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'format',
          type: 'string',
          required: false,
          description: 'Export format (csv or excel)',
          descriptionAr: 'تنسيق التصدير (csv أو excel)'
        },
        {
          name: 'from',
          type: 'string',
          required: false,
          description: 'Start date',
          descriptionAr: 'تاريخ البدء'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: {
            download_url: 'https://storage.rakeez.sa/exports/analytics_2024.csv'
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/service-packages',
      title: 'Get All Subscription Packages',
      titleAr: 'جميع باقات الاشتراكات',
      description: 'Get all subscription packages (active and inactive) with included services (Admin only)',
      descriptionAr: 'الحصول على جميع باقات الاشتراكات (النشطة وغير النشطة) مع الخدمات المضمنة (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'pkg_123',
              tier: 'premium',
              name: { en: 'Premium Cleaning Package', ar: 'باقة التنظيف المميزة' },
              description: { en: 'Professional cleaning bundle', ar: 'حزمة تنظيف احترافية' },
              durationDays: 30,
              price: '500.00',
              discountPercentage: '10.00',
              inclusions: { en: ['Free delivery'], ar: ['توصيل مجاني'] },
              termsAndConditions: { en: 'Terms apply', ar: 'تطبق الشروط' },
              image: null,
              categoryId: 'cat_123',
              isActive: true,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              services: [
                {
                  id: 'srv_123',
                  name: { en: 'Deep Cleaning', ar: 'تنظيف عميق' },
                  description: { en: 'Professional service', ar: 'خدمة احترافية' },
                  usageLimit: 3,
                  discountPercentage: '10.00',
                  linkId: 'link_123'
                }
              ]
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/service-packages',
      title: 'Create Subscription Package',
      titleAr: 'إنشاء باقة اشتراك',
      description: 'Create a new subscription package with multiple services (Admin only). Requires bilingual name and description.',
      descriptionAr: 'إنشاء باقة اشتراك جديدة مع خدمات متعددة (للمسؤولين فقط). يتطلب اسماً ووصفاً ثنائي اللغة.',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          tier: 'premium',
          name: { en: 'Premium Cleaning Package', ar: 'باقة التنظيف المميزة' },
          description: { en: 'Professional cleaning bundle', ar: 'حزمة تنظيف احترافية' },
          durationDays: 30,
          price: '500.00',
          discountPercentage: '10.00',
          inclusions: { en: ['Free delivery', 'Priority support'], ar: ['توصيل مجاني', 'دعم أولوية'] },
          termsAndConditions: { en: 'Terms apply', ar: 'تطبق الشروط' },
          categoryId: 'cat_123',
          image: null,
          isActive: true,
          services: [
            {
              serviceId: 'srv_123',
              usageLimit: 3,
              discountPercentage: '10.00'
            },
            {
              serviceId: 'srv_456',
              usageLimit: 2,
              discountPercentage: '15.00'
            }
          ]
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Subscription package created successfully',
          data: {
            id: 'pkg_789',
            tier: 'premium',
            name: { en: 'Premium Cleaning Package', ar: 'باقة التنظيف المميزة' },
            durationDays: 30,
            price: '500.00',
            isActive: true
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/admin/service-packages/:id',
      title: 'Update Subscription Package',
      titleAr: 'تحديث باقة الاشتراك',
      description: 'Update an existing subscription package and its services (Admin only). All fields optional, services array replaces existing links.',
      descriptionAr: 'تحديث باقة اشتراك موجودة وخدماتها (للمسؤولين فقط). جميع الحقول اختيارية، مصفوفة الخدمات تستبدل الروابط الحالية.',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          tier: 'vip',
          name: { en: 'VIP Cleaning Package', ar: 'باقة التنظيف VIP' },
          description: { en: 'Luxury cleaning bundle', ar: 'حزمة تنظيف فاخرة' },
          durationDays: 60,
          price: '900.00',
          discountPercentage: '20.00',
          isActive: true,
          services: [
            {
              serviceId: 'srv_123',
              usageLimit: 5,
              discountPercentage: '20.00'
            }
          ]
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Subscription package updated successfully'
        }
      }
    },
    {
      method: 'DELETE',
      path: '/api/v2/admin/service-packages/:id',
      title: 'Delete Subscription Package',
      titleAr: 'حذف باقة الاشتراك',
      description: 'Delete a subscription package (Admin only)',
      descriptionAr: 'حذف باقة اشتراك (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          message: 'Subscription package deleted successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/subscriptions',
      title: 'Get All Subscriptions',
      titleAr: 'جميع الاشتراكات',
      description: 'Get all customer subscriptions with filters (Admin only)',
      descriptionAr: 'الحصول على جميع اشتراكات العملاء مع التصفية (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by status (active, expired, cancelled)',
          descriptionAr: 'التصفية حسب الحالة (نشط، منتهي، ملغى)'
        },
        {
          name: 'userId',
          type: 'string',
          required: false,
          description: 'Filter by user ID',
          descriptionAr: 'التصفية حسب معرف المستخدم'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'sub_123',
              userId: 'usr_456',
              packageId: 'pkg_789',
              startDate: '2024-01-01',
              endDate: '2024-01-31',
              status: 'active',
              totalAmount: '500.00',
              usageCount: 2,
              autoRenew: true,
              benefits: { en: ['Service 1', 'Service 2'], ar: ['خدمة 1', 'خدمة 2'] },
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/subscriptions',
      title: 'Create Customer Subscription',
      titleAr: 'إنشاء اشتراك عميل',
      description: 'Manually create a subscription for a customer (Admin only). Server sets totalAmount from package price, status as active, and usageCount as 0.',
      descriptionAr: 'إنشاء اشتراك يدوياً لعميل (للمسؤولين فقط). يحدد الخادم totalAmount من سعر الباقة، والحالة نشطة، و usageCount كـ 0.',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          userId: 'usr_456',
          packageId: 'pkg_789',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          autoRenew: false,
          benefits: { en: ['Service 1', 'Service 2'], ar: ['خدمة 1', 'خدمة 2'] }
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Subscription created successfully',
          data: {
            id: 'sub_123',
            userId: 'usr_456',
            packageId: 'pkg_789',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            status: 'active',
            totalAmount: '500.00',
            usageCount: 0,
            autoRenew: false
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/users',
      title: 'Get All Users',
      titleAr: 'جميع المستخدمين',
      description: 'Retrieve all users with optional filtering by role and status (Admin only)',
      descriptionAr: 'استرداد جميع المستخدمين مع تصفية اختيارية حسب الدور والحالة (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'role',
          type: 'string',
          required: false,
          description: 'Filter by role (customer, technician, admin)',
          descriptionAr: 'التصفية حسب الدور (عميل، فني، مدير)'
        },
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by status (active, inactive, suspended)',
          descriptionAr: 'التصفية حسب الحالة (نشط، غير نشط، معلق)'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'usr_123',
              name: 'Ahmed Ali',
              email: 'ahmed@example.com',
              phone: '+966501234567',
              role: 'customer',
              status: 'active',
              createdAt: '2024-01-01T00:00:00Z'
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/users',
      title: 'Create User',
      titleAr: 'إنشاء مستخدم',
      description: 'Create a new user account (Admin only)',
      descriptionAr: 'إنشاء حساب مستخدم جديد (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          name: 'John Doe',
          name_ar: 'جون دو',
          email: 'john@example.com',
          phone: '+966501234567',
          password: 'SecurePass123!',
          role: 'customer',
          status: 'active'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'User created successfully',
          data: {
            id: 'usr_123',
            name: 'John Doe',
            email: 'john@example.com'
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/technicians/specializations',
      title: 'Get Technician Specializations',
      titleAr: 'تخصصات الفنيين',
      description: 'Get all technicians with their specializations and coverage statistics (Admin only)',
      descriptionAr: 'الحصول على جميع الفنيين مع تخصصاتهم وإحصائيات التغطية (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'categoryId',
          type: 'string',
          required: false,
          description: 'Filter by service category',
          descriptionAr: 'التصفية حسب فئة الخدمة'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: {
            technicians: [
              {
                id: 'tech_123',
                name: 'Ahmed Al-Rashid',
                email: 'ahmed@rakeez.sa',
                status: 'active',
                specializations: [
                  { id: 'cat_1', name: 'AC Repair' }
                ]
              }
            ],
            categories: [
              { id: 'cat_1', name: 'AC Repair', nameAr: 'صيانة المكيفات' }
            ],
            coverageStats: [
              { categoryId: 'cat_1', categoryName: 'AC Repair', technicianCount: 15 }
            ]
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/admin/technicians/:id/specializations',
      title: 'Update Technician Specializations',
      titleAr: 'تحديث تخصصات الفني',
      description: 'Update service categories for a technician (Admin only). Empty array means all services.',
      descriptionAr: 'تحديث فئات الخدمة للفني (للمسؤولين فقط). المصفوفة الفارغة تعني جميع الخدمات.',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          specializations: ['cat_1', 'cat_2', 'cat_3']
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Specializations updated successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/support/analytics',
      title: 'Support Analytics',
      titleAr: 'تحليلات الدعم',
      description: 'Get support ticket analytics including ratings and metrics (Admin only)',
      descriptionAr: 'الحصول على تحليلات تذاكر الدعم بما في ذلك التقييمات والمقاييس (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          data: {
            totalTickets: 150,
            averageRating: 4.5,
            ratingDistribution: {
              '1': 2,
              '2': 5,
              '3': 10,
              '4': 50,
              '5': 83
            },
            statusCounts: {
              open: 25,
              in_progress: 15,
              resolved: 90,
              closed: 20
            }
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/bookings/:id/assign',
      title: 'Assign Technician',
      titleAr: 'تعيين فني',
      description: 'Manually assign a technician to a booking (Admin only)',
      descriptionAr: 'تعيين فني يدوياً لحجز (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          technician_id: 'tech_123'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Technician assigned successfully',
          data: {
            bookingId: 'bkg_123',
            technicianId: 'tech_123',
            technicianName: 'Ahmed Al-Rashid'
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/bookings/:id/auto-assign',
      title: 'Auto-Assign Technician',
      titleAr: 'تعيين فني تلقائي',
      description: 'Use smart algorithm to automatically assign best technician (Admin only)',
      descriptionAr: 'استخدام خوارزمية ذكية لتعيين أفضل فني تلقائياً (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          message: 'Technician auto-assigned successfully',
          data: {
            bookingId: 'bkg_123',
            technicianId: 'tech_123',
            technicianName: 'Ahmed Al-Rashid',
            matchScore: 95
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/support/tickets/:id/messages',
      title: 'Reply to Support Ticket',
      titleAr: 'الرد على تذكرة الدعم',
      description: 'Send a message reply to a support ticket (Admin only)',
      descriptionAr: 'إرسال رد رسالة إلى تذكرة الدعم (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          message: 'We have assigned a technician to your issue'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Message sent successfully',
          data: {
            id: 'msg_123',
            message: 'We have assigned a technician to your issue',
            created_at: '2025-10-29T13:00:00.000Z'
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/admin/subscriptions/:id',
      title: 'Update Subscription',
      titleAr: 'تحديث الاشتراك',
      description: 'Update customer subscription details (Admin only). All fields optional.',
      descriptionAr: 'تحديث تفاصيل اشتراك العميل (للمسؤولين فقط). جميع الحقول اختيارية.',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          status: 'cancelled',
          endDate: '2024-02-28',
          autoRenew: false
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Subscription updated successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/referrals/campaigns',
      title: 'Get Referral Campaigns',
      titleAr: 'حملات الإحالة',
      description: 'Get all referral campaigns (Admin only)',
      descriptionAr: 'الحصول على جميع حملات الإحالة (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'camp_123',
              name: { en: 'Launch Campaign', ar: 'حملة الإطلاق' },
              description: { en: 'New customer promo', ar: 'عرض ترويجي للعملاء الجدد' },
              inviterReward: '50.00',
              inviteeDiscountType: 'percentage',
              inviteeDiscountValue: '20.00',
              maxUsagePerUser: 5,
              isActive: true,
              validFrom: '2024-01-01T00:00:00Z',
              validUntil: '2024-12-31T23:59:59Z',
              createdAt: '2024-01-01T00:00:00Z'
            }
          ]
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/referrals/campaigns',
      title: 'Create Referral Campaign',
      titleAr: 'إنشاء حملة إحالة',
      description: 'Create a new referral campaign (Admin only). Defines rewards for referrers and discounts for new customers.',
      descriptionAr: 'إنشاء حملة إحالة جديدة (للمسؤولين فقط). يحدد مكافآت للمحيلين وخصومات للعملاء الجدد.',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          name: { en: 'Summer Promo', ar: 'عرض الصيف' },
          description: { en: 'Summer referral campaign', ar: 'حملة إحالة صيفية' },
          inviterReward: 50,
          inviteeDiscountType: 'percentage',
          inviteeDiscountValue: 20,
          maxUsagePerUser: 10,
          isActive: true,
          validFrom: '2024-06-01T00:00:00Z',
          validUntil: '2024-08-31T23:59:59Z'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Referral campaign created successfully',
          data: {
            id: 'camp_456',
            name: { en: 'Summer Promo', ar: 'عرض الصيف' }
          }
        }
      }
    },
    {
      method: 'PUT',
      path: '/api/v2/admin/referrals/campaigns/:id',
      title: 'Update Referral Campaign',
      titleAr: 'تحديث حملة الإحالة',
      description: 'Update an existing referral campaign (Admin only)',
      descriptionAr: 'تحديث حملة إحالة موجودة (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      requestBody: {
        type: 'object',
        example: {
          isActive: false,
          maxUsagePerUser: 5
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Referral campaign updated successfully'
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/referrals',
      title: 'Get All Referrals',
      titleAr: 'جميع الإحالات',
      description: 'Get all referral records with filters (Admin only)',
      descriptionAr: 'الحصول على جميع سجلات الإحالة مع التصفية (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      queryParams: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by status (pending, completed, expired)',
          descriptionAr: 'التصفية حسب الحالة (قيد الانتظار، مكتمل، منتهي)'
        },
        {
          name: 'campaignId',
          type: 'string',
          required: false,
          description: 'Filter by campaign ID',
          descriptionAr: 'التصفية حسب معرف الحملة'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'ref_123',
              campaignId: 'camp_123',
              inviterId: 'usr_123',
              inviterName: 'Ahmed Ali',
              inviteeId: 'usr_456',
              inviteeName: 'Mohammed Ali',
              referralCode: 'ABC123',
              status: 'completed',
              inviterReward: '50.00',
              inviteeDiscount: '100.00',
              completedAt: '2024-01-15T10:00:00Z',
              createdAt: '2024-01-10T10:00:00Z'
            }
          ]
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/referrals/analytics',
      title: 'Get Referral Analytics',
      titleAr: 'تحليلات الإحالة',
      description: 'Get referral system analytics and statistics (Admin only)',
      descriptionAr: 'الحصول على تحليلات وإحصائيات نظام الإحالة (للمسؤولين فقط)',
      auth: true,
      roles: ['admin'],
      responseExample: {
        success: {
          success: true,
          data: {
            total_referrals: 150,
            completed_referrals: 120,
            pending_referrals: 25,
            expired_referrals: 5,
            total_rewards_distributed: 6000.00,
            total_discounts_given: 12000.00,
            active_campaigns: 3,
            top_referrers: [
              {
                userId: 'usr_123',
                name: 'Ahmed Ali',
                totalReferrals: 15,
                totalRewardsEarned: 750.00
              }
            ]
          }
        }
      }
    }
  ],
  uploads: [
    {
      method: 'POST',
      path: '/api/v2/objects/upload',
      title: 'Get Upload URL',
      titleAr: 'الحصول على رابط الرفع',
      description: 'Get presigned URL for uploading files to object storage',
      descriptionAr: 'الحصول على رابط موقع مسبقاً لرفع الملفات إلى التخزين',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            uploadURL: 'https://storage.googleapis.com/...'
          }
        }
      }
    }
  ]
};

export default function ApiDocs() {
  const [language, setLanguage] = useState<'en' | 'ar'>('en');
  const [selectedCategory, setSelectedCategory] = useState<string>('security');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testHeaders, setTestHeaders] = useState('{\n  "Authorization": "Bearer YOUR_TOKEN_HERE"\n}');
  const [testBody, setTestBody] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const { toast } = useToast();
  const isArabic = language === 'ar';

  const categoryNames: Record<string, { en: string; ar: string }> = {
    security: { en: 'Security & Rate Limits', ar: 'الأمان وحدود المعدل' },
    auth: { en: 'Authentication', ar: 'المصادقة' },
    profile: { en: 'Profile & Addresses', ar: 'الملف الشخصي والعناوين' },
    services: { en: 'Services & Parts', ar: 'الخدمات وقطع الغيار' },
    subscriptions: { en: 'Subscription Packages', ar: 'باقات الاشتراكات' },
    bookings: { en: 'Bookings', ar: 'الحجوزات' },
    quotations: { en: 'Quotations', ar: 'عروض الأسعار' },
    payments: { en: 'Payments', ar: 'الدفعات' },
    wallet: { en: 'Wallet', ar: 'المحفظة' },
    referrals: { en: 'Referrals', ar: 'الإحالات' },
    orders: { en: 'Orders & Reviews', ar: 'الطلبات والتقييمات' },
    support: { en: 'Support', ar: 'الدعم' },
    notifications: { en: 'Notifications', ar: 'الإشعارات' },
    technician: { en: 'Technician', ar: 'الفني' },
    admin: { en: 'Admin', ar: 'الإدارة' },
    uploads: { en: 'File Uploads', ar: 'رفع الملفات' }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast({
        title: isArabic ? 'تم النسخ' : 'Copied',
        description: isArabic ? 'تم نسخ النص إلى الحافظة' : 'Text copied to clipboard',
      });
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: isArabic ? 'فشل النسخ' : 'Failed to copy',
        variant: 'destructive',
      });
    }
  };

  const handleTryEndpoint = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setTestBody(endpoint.requestBody ? JSON.stringify(endpoint.requestBody.example, null, 2) : '');
    setTestResponse('');
    setTestDialogOpen(true);
  };

  const executeTest = async () => {
    if (!selectedEndpoint) return;
    
    setIsTesting(true);
    setTestResponse('');
    
    try {
      const headers = JSON.parse(testHeaders);
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      if (selectedEndpoint.method !== 'GET' && testBody) {
        options.body = testBody;
      }

      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}${selectedEndpoint.path}`, options);
      const data = await response.json();
      
      setTestResponse(JSON.stringify(data, null, 2));
      
      if (response.ok) {
        toast({
          title: isArabic ? 'نجح الطلب' : 'Request Successful',
          description: `${isArabic ? 'الحالة' : 'Status'}: ${response.status}`,
        });
      } else {
        toast({
          title: isArabic ? 'خطأ في الطلب' : 'Request Failed',
          description: `${isArabic ? 'الحالة' : 'Status'}: ${response.status}`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setTestResponse(JSON.stringify({ error: error.message }, null, 2));
      toast({
        title: isArabic ? 'خطأ' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {isArabic ? 'توثيق واجهة برمجة التطبيقات - راكيز' : 'Rakeez API Documentation'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {isArabic ? 'الإصدار 2.0 - تفاعلي' : 'v2.0 Interactive'}
                </p>
              </div>
            </div>
            
            <Select value={language} onValueChange={(val) => setLanguage(val as 'en' | 'ar')}>
              <SelectTrigger className="w-32" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {isArabic ? 'وثائق شاملة وتفاعلية' : 'Comprehensive Interactive Documentation'}
            </h2>
            <p className="text-lg text-white/90 mb-6">
              {isArabic 
                ? 'استكشف وجرب جميع نقاط النهاية API الخاصة بمنصة راكيز للخدمات المنزلية'
                : 'Explore and test all API endpoints for Rakeez home services platform'
              }
            </p>
            
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-sm opacity-80">{isArabic ? 'الرابط الأساسي' : 'Base URL'}</div>
                <div className="font-mono font-semibold">https://api.rakeez.sa/v2</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-sm opacity-80">{isArabic ? 'المصادقة' : 'Authentication'}</div>
                <div className="font-mono font-semibold">Bearer JWT Token</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-sm opacity-80">{isArabic ? 'نقاط النهاية' : 'Endpoints'}</div>
                <div className="font-mono font-semibold">
                  {Object.values(endpoints).reduce((sum, cat) => sum + cat.length, 0)}+
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Information Banner */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-start gap-3">
            <Info className="text-primary mt-1" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                {isArabic ? 'معلومات الأمان' : 'Security Information'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isArabic 
                  ? 'جميع نقاط النهاية محمية بـ JWT والحد من معدل الطلبات. تحقق من قسم "الأمان" للحصول على تفاصيل.'
                  : 'All endpoints are protected with JWT authentication and rate limiting. Check the "Security" section for details.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {isArabic ? 'الفئات' : 'Categories'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-1">
                    {Object.entries(endpoints).map(([key, categoryEndpoints]) => (
                      <Button
                        key={key}
                        variant={selectedCategory === key ? 'default' : 'ghost'}
                        className="w-full justify-start text-sm"
                        onClick={() => setSelectedCategory(key)}
                        data-testid={`category-${key}`}
                      >
                        <Badge variant="outline" className="mr-2">{categoryEndpoints.length}</Badge>
                        {isArabic ? categoryNames[key].ar : categoryNames[key].en}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Endpoints List */}
          <main className="lg:col-span-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {isArabic ? categoryNames[selectedCategory].ar : categoryNames[selectedCategory].en}
                </h2>
                {selectedCategory !== 'security' && (
                  <Badge variant="secondary">
                    {endpoints[selectedCategory]?.length || 0} {isArabic ? 'نقطة نهاية' : 'endpoints'}
                  </Badge>
                )}
              </div>

              {selectedCategory === 'security' ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{isArabic ? 'المصادقة والتفويض' : 'Authentication & Authorization'}</CardTitle>
                      <CardDescription>
                        {isArabic ? 'كيفية المصادقة مع Rakeez API' : 'How to authenticate with Rakeez API'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">{isArabic ? 'مخطط المصادقة' : 'Authentication Scheme'}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {isArabic 
                            ? 'يستخدم Rakeez API مصادقة JWT (JSON Web Token). قم بتضمين الرمز في رأس Authorization لجميع الطلبات المصادق عليها.'
                            : 'Rakeez API uses JWT (JSON Web Token) authentication. Include the token in the Authorization header for all authenticated requests.'
                          }
                        </p>
                        <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                          Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-semibold mb-2">{isArabic ? 'مدة الرمز' : 'Token Duration'}</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• {isArabic ? 'رمز الوصول: 24 ساعة' : 'Access Token: 24 hours'}</li>
                          <li>• {isArabic ? 'رمز التحديث: 30 يوماً' : 'Refresh Token: 30 days'}</li>
                          <li>• {isArabic ? 'رمز OTP: 15 دقيقة' : 'OTP Code: 15 minutes'}</li>
                          <li>• {isArabic ? 'رمز إعادة تعيين كلمة المرور: 1 ساعة' : 'Password Reset Token: 1 hour'}</li>
                        </ul>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-semibold mb-2">{isArabic ? 'التحكم في الوصول على أساس الأدوار (RBAC)' : 'Role-Based Access Control (RBAC)'}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          <div className="bg-muted/50 p-3 rounded">
                            <div className="font-medium text-sm mb-1">Customer</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'الوصول إلى الحجوزات والمحفظة والملف الشخصي' : 'Access to bookings, wallet, profile'}</div>
                          </div>
                          <div className="bg-muted/50 p-3 rounded">
                            <div className="font-medium text-sm mb-1">Technician</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'إدارة الحجوزات المخصصة وعروض الأسعار' : 'Manage assigned bookings, quotations'}</div>
                          </div>
                          <div className="bg-muted/50 p-3 rounded">
                            <div className="font-medium text-sm mb-1">Admin</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'وصول كامل إلى جميع نقاط النهاية' : 'Full access to all endpoints'}</div>
                          </div>
                          <div className="bg-muted/50 p-3 rounded">
                            <div className="font-medium text-sm mb-1">Support</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'إدارة التذاكر والرسائل' : 'Manage tickets and messages'}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{isArabic ? 'حدود معدل الطلبات' : 'Rate Limiting'}</CardTitle>
                      <CardDescription>
                        {isArabic ? 'حماية API من الإساءة والطلبات المفرطة' : 'API protection against abuse and excessive requests'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2">{isArabic ? 'نقطة النهاية' : 'Endpoint'}</th>
                              <th className="text-left py-2">{isArabic ? 'الحد' : 'Limit'}</th>
                              <th className="text-left py-2">{isArabic ? 'النافذة' : 'Window'}</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b">
                              <td className="py-2 font-mono text-xs">POST /api/v2/auth/login</td>
                              <td className="py-2">5 requests</td>
                              <td className="py-2">15 minutes</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 font-mono text-xs">POST /api/v2/auth/verify-otp</td>
                              <td className="py-2">3 requests</td>
                              <td className="py-2">15 minutes</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 font-mono text-xs">POST /api/v2/auth/resend-otp</td>
                              <td className="py-2">3 requests</td>
                              <td className="py-2">15 minutes</td>
                            </tr>
                            <tr className="border-b">
                              <td className="py-2 font-mono text-xs">General API</td>
                              <td className="py-2">100 requests</td>
                              <td className="py-2">15 minutes</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                        <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                          {isArabic ? '⚠️ تجاوز الحد' : '⚠️ Rate Limit Exceeded'}
                        </div>
                        <div className="text-xs text-amber-700 dark:text-amber-300">
                          {isArabic 
                            ? 'عند تجاوز الحد، ستتلقى رمز حالة HTTP 429 مع رسالة "Too many requests". انتظر حتى انتهاء النافذة قبل إعادة المحاولة.'
                            : 'When rate limit is exceeded, you will receive HTTP 429 status code with "Too many requests" message. Wait until window expires before retrying.'
                          }
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{isArabic ? 'رؤوس الأمان' : 'Security Headers'}</CardTitle>
                      <CardDescription>
                        {isArabic ? 'الرؤوس المطلوبة والموصى بها للطلبات الآمنة' : 'Required and recommended headers for secure requests'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">{isArabic ? 'الرؤوس المطلوبة' : 'Required Headers'}</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="font-mono">Authorization</Badge>
                            <span className="text-muted-foreground">{isArabic ? 'رمز JWT للمصادقة' : 'JWT token for authentication'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="font-mono">Content-Type</Badge>
                            <span className="text-muted-foreground">{isArabic ? 'application/json للطلبات JSON' : 'application/json for JSON requests'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-semibold mb-2">{isArabic ? 'الرؤوس الاختيارية' : 'Optional Headers'}</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="font-mono">Accept-Language</Badge>
                            <span className="text-muted-foreground">{isArabic ? 'en أو ar للغة الرد' : 'en or ar for response language'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="font-mono">Idempotency-Key</Badge>
                            <span className="text-muted-foreground">{isArabic ? 'منع الطلبات المكررة' : 'Prevent duplicate requests (recommended for bookings)'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{isArabic ? 'رموز الأخطاء' : 'Error Codes'}</CardTitle>
                      <CardDescription>
                        {isArabic ? 'فهم رموز حالة HTTP ورسائل الخطأ' : 'Understanding HTTP status codes and error messages'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Badge className="bg-red-500">400</Badge>
                          <div>
                            <div className="font-medium text-sm">Bad Request</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'طلب غير صالح - تحقق من بنية JSON ومعاملات الطلب' : 'Invalid request - check JSON structure and parameters'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="bg-red-500">401</Badge>
                          <div>
                            <div className="font-medium text-sm">Unauthorized</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'مصادقة مفقودة أو غير صالحة' : 'Missing or invalid authentication'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="bg-red-500">403</Badge>
                          <div>
                            <div className="font-medium text-sm">Forbidden</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'لا يملك دورك صلاحيات كافية' : 'Your role lacks sufficient permissions'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="bg-amber-500">429</Badge>
                          <div>
                            <div className="font-medium text-sm">Too Many Requests</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'تجاوز حد معدل الطلبات' : 'Rate limit exceeded'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Badge className="bg-red-500">500</Badge>
                          <div>
                            <div className="font-medium text-sm">Internal Server Error</div>
                            <div className="text-xs text-muted-foreground">{isArabic ? 'خطأ في الخادم - اتصل بالدعم إذا استمر' : 'Server error - contact support if persists'}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>{isArabic ? 'أفضل ممارسات الأمان' : 'Security Best Practices'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          <span>{isArabic ? 'استخدم HTTPS دائماً للاتصالات' : 'Always use HTTPS for communications'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          <span>{isArabic ? 'لا تقم بتضمين رموز الوصول في عناوين URL أو السجلات' : 'Never include access tokens in URLs or logs'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          <span>{isArabic ? 'قم بتجديد الرمز قبل انتهاء صلاحيته باستخدام رمز التحديث' : 'Refresh token before expiration using refresh token'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          <span>{isArabic ? 'قم بتنفيذ آلية إعادة المحاولة مع التراجع الأسي' : 'Implement retry logic with exponential backoff'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          <span>{isArabic ? 'تحقق من صحة وتنظيف المدخلات على جانب العميل والخادم' : 'Validate and sanitize inputs on both client and server'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">✓</span>
                          <span>{isArabic ? 'قم بتخزين البيانات الحساسة بشكل آمن (لا تستخدم localStorage للرموز)' : 'Store sensitive data securely (avoid localStorage for tokens)'}</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                endpoints[selectedCategory]?.map((endpoint, index) => (
                <Card key={index} className="overflow-hidden" data-testid={`endpoint-card-${index}`}>
                  <CardHeader className="bg-muted/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={`${methodColors[endpoint.method]} text-white`}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {endpoint.path}
                          </code>
                          {endpoint.auth && (
                            <Badge variant="outline" className="text-xs">
                              🔒 {isArabic ? 'يتطلب مصادقة' : 'Auth Required'}
                            </Badge>
                          )}
                          {endpoint.roles && (
                            <Badge variant="outline" className="text-xs">
                              {endpoint.roles.join(', ')}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">
                          {isArabic ? endpoint.titleAr : endpoint.title}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {isArabic ? endpoint.descriptionAr : endpoint.description}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleTryEndpoint(endpoint)}
                        className="bg-secondary hover:bg-secondary/90"
                        data-testid={`try-button-${index}`}
                      >
                        <Send size={16} className="mr-2" />
                        {isArabic ? 'جرب' : 'Try It'}
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    <Tabs defaultValue="request" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="request">{isArabic ? 'الطلب' : 'Request'}</TabsTrigger>
                        <TabsTrigger value="response">{isArabic ? 'الاستجابة' : 'Response'}</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="request" className="space-y-4">
                        {/* Headers */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold">
                              {isArabic ? 'الرؤوس' : 'Headers'}
                            </h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(
                                endpoint.auth ? '{\n  "Authorization": "Bearer YOUR_TOKEN_HERE",\n  "Content-Type": "application/json"\n}' : '{\n  "Content-Type": "application/json"\n}',
                                `headers-${index}`
                              )}
                            >
                              {copiedText === `headers-${index}` ? <Check size={14} /> : <Copy size={14} />}
                            </Button>
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <pre className="text-xs font-mono overflow-x-auto">
                              {endpoint.auth 
                                ? '{\n  "Authorization": "Bearer YOUR_TOKEN_HERE",\n  "Content-Type": "application/json"\n}'
                                : '{\n  "Content-Type": "application/json"\n}'
                              }
                            </pre>
                          </div>
                        </div>

                        {/* Query Parameters */}
                        {endpoint.queryParams && endpoint.queryParams.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              {isArabic ? 'معاملات الاستعلام' : 'Query Parameters'}
                            </h4>
                            <div className="space-y-2">
                              {endpoint.queryParams.map((param, pIndex) => (
                                <div key={pIndex} className="bg-muted rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <code className="text-sm font-mono">{param.name}</code>
                                    <Badge variant="outline" className="text-xs">{param.type}</Badge>
                                    {param.required && (
                                      <Badge variant="destructive" className="text-xs">
                                        {isArabic ? 'مطلوب' : 'Required'}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {isArabic ? param.descriptionAr : param.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Request Body */}
                        {endpoint.requestBody && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold">
                                {isArabic ? 'نص الطلب' : 'Request Body'}
                              </h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(
                                  JSON.stringify(endpoint.requestBody?.example, null, 2),
                                  `body-${index}`
                                )}
                              >
                                {copiedText === `body-${index}` ? <Check size={14} /> : <Copy size={14} />}
                              </Button>
                            </div>
                            <div className="bg-muted rounded-lg p-3">
                              <pre className="text-xs font-mono overflow-x-auto">
                                {JSON.stringify(endpoint.requestBody.example, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="response" className="space-y-4">
                        {/* Success Response */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Badge className="bg-green-500">200</Badge>
                              {isArabic ? 'استجابة ناجحة' : 'Success Response'}
                            </h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(
                                JSON.stringify(endpoint.responseExample?.success, null, 2),
                                `response-${index}`
                              )}
                            >
                              {copiedText === `response-${index}` ? <Check size={14} /> : <Copy size={14} />}
                            </Button>
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <pre className="text-xs font-mono overflow-x-auto">
                              {JSON.stringify(endpoint.responseExample?.success, null, 2)}
                            </pre>
                          </div>
                        </div>

                        {/* Error Response */}
                        {endpoint.responseExample?.error && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Badge className="bg-red-500">400</Badge>
                                {isArabic ? 'استجابة خطأ' : 'Error Response'}
                              </h4>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(
                                  JSON.stringify(endpoint.responseExample?.error, null, 2),
                                  `error-${index}`
                                )}
                              >
                                {copiedText === `error-${index}` ? <Check size={14} /> : <Copy size={14} />}
                              </Button>
                            </div>
                            <div className="bg-muted rounded-lg p-3">
                              <pre className="text-xs font-mono overflow-x-auto">
                                {JSON.stringify(endpoint.responseExample.error, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ))
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Try It Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedEndpoint && (
                <>
                  <Badge className={`${methodColors[selectedEndpoint.method]} text-white`}>
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="text-sm font-mono">{selectedEndpoint.path}</code>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isArabic ? 'اختبر هذه النقطة مباشرة من المتصفح' : 'Test this endpoint directly from your browser'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Headers Input */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {isArabic ? 'الرؤوس (JSON)' : 'Headers (JSON)'}
              </label>
              <Textarea
                value={testHeaders}
                onChange={(e) => setTestHeaders(e.target.value)}
                className="font-mono text-xs"
                rows={4}
                data-testid="test-headers"
              />
            </div>

            {/* Body Input */}
            {selectedEndpoint?.method !== 'GET' && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {isArabic ? 'نص الطلب (JSON)' : 'Request Body (JSON)'}
                </label>
                <Textarea
                  value={testBody}
                  onChange={(e) => setTestBody(e.target.value)}
                  className="font-mono text-xs"
                  rows={8}
                  data-testid="test-body"
                />
              </div>
            )}

            {/* Execute Button */}
            <Button
              onClick={executeTest}
              disabled={isTesting}
              className="w-full bg-primary"
              data-testid="execute-test"
            >
              {isTesting ? (
                <>
                  {isArabic ? 'جاري الإرسال...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  {isArabic ? 'إرسال الطلب' : 'Send Request'}
                </>
              )}
            </Button>

            {/* Response */}
            {testResponse && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {isArabic ? 'الاستجابة' : 'Response'}
                </label>
                <div className="bg-muted rounded-lg p-3">
                  <pre className="text-xs font-mono overflow-x-auto">
                    {testResponse}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
