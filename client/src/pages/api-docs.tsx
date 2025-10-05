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
      description: 'Create a new service booking',
      descriptionAr: 'إنشاء حجز خدمة جديد',
      auth: true,
      requestBody: {
        type: 'object',
        example: {
          service_id: 'srv_123',
          package_id: 'pkg_123',
          address_id: 'addr_123',
          scheduled_date: '2024-01-20',
          scheduled_time: '10:00',
          notes: 'Please bring cleaning supplies'
        }
      },
      responseExample: {
        success: {
          success: true,
          message: 'Booking created successfully',
          data: {
            booking_id: 'bkg_123',
            status: 'pending',
            total_amount: 500
          }
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
      path: '/api/v2/referrals/generate',
      title: 'Generate Referral Code',
      titleAr: 'إنشاء رمز الإحالة',
      description: 'Generate a unique referral code for the user',
      descriptionAr: 'إنشاء رمز إحالة فريد للمستخدم',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            referral_code: 'AHMED2024',
            share_url: 'https://rakeez.sa/ref/AHMED2024'
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/referrals/stats',
      title: 'Get Referral Stats',
      titleAr: 'إحصائيات الإحالة',
      description: 'Get referral statistics and earnings',
      descriptionAr: 'الحصول على إحصائيات الإحالة والأرباح',
      auth: true,
      responseExample: {
        success: {
          success: true,
          data: {
            total_referrals: 5,
            active_referrals: 3,
            total_earnings: 150,
            pending_earnings: 50
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
      path: '/api/v2/technician/bookings',
      title: 'Get Assigned Bookings',
      titleAr: 'الحجوزات المخصصة',
      description: 'Get all bookings assigned to technician',
      descriptionAr: 'الحصول على جميع الحجوزات المخصصة للفني',
      auth: true,
      roles: ['technician'],
      queryParams: [
        {
          name: 'status',
          type: 'string',
          required: false,
          description: 'Filter by status',
          descriptionAr: 'التصفية حسب الحالة'
        }
      ],
      responseExample: {
        success: {
          success: true,
          data: [
            {
              id: 'bkg_123',
              service_name: { en: 'Deep Cleaning', ar: 'تنظيف عميق' },
              customer_name: 'Ahmed Ali',
              address: '123 King Fahd Road',
              status: 'confirmed',
              scheduled_date: '2024-01-20',
              scheduled_time: '10:00'
            }
          ]
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
  const [selectedCategory, setSelectedCategory] = useState<string>('auth');
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
    auth: { en: 'Authentication', ar: 'المصادقة' },
    profile: { en: 'Profile & Addresses', ar: 'الملف الشخصي والعناوين' },
    services: { en: 'Services & Parts', ar: 'الخدمات وقطع الغيار' },
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
                <Badge variant="secondary">
                  {endpoints[selectedCategory].length} {isArabic ? 'نقطة نهاية' : 'endpoints'}
                </Badge>
              </div>

              {endpoints[selectedCategory].map((endpoint, index) => (
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
              ))}
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
