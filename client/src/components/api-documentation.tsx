import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  auth: boolean;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  requestBody?: {
    type: string;
    properties: Record<string, any>;
  };
  responses: Record<string, {
    description: string;
    schema?: any;
  }>;
}

const endpoints: Record<string, ApiEndpoint[]> = {
  auth: [
    {
      method: 'POST',
      path: '/api/v2/auth/register',
      title: 'Register User',
      description: 'Register new user account with email or phone number',
      auth: false,
      requestBody: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', optional: true },
          phone: { type: 'string', optional: true },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          name_ar: { type: 'string', optional: true },
          language: { type: 'string', enum: ['en', 'ar'], default: 'en' },
        }
      },
      responses: {
        '201': {
          description: 'Account created successfully',
          schema: {
            success: true,
            message: 'تم إنشاء الحساب بنجاح. يرجى التحقق من رمز OTP',
            data: {
              user_id: 'usr_1a2b3c4d5e',
              requires_verification: true
            }
          }
        },
        '400': { description: 'User already exists or validation error' }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/auth/login',
      title: 'User Login',
      description: 'Authenticate user and receive JWT token',
      auth: false,
      requestBody: {
        type: 'object',
        properties: {
          identifier: { type: 'string', description: 'Email or phone number' },
          password: { type: 'string' },
          language: { type: 'string', enum: ['en', 'ar'] }
        }
      },
      responses: {
        '200': {
          description: 'Login successful',
          schema: {
            success: true,
            data: {
              token: 'eyJhbGci...',
              refresh_token: 'ref_...',
              expires_in: 86400,
              user: { id: 'usr_123', name: 'Ahmed' }
            }
          }
        },
        '401': { description: 'Invalid credentials' }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/auth/verify-otp',
      title: 'Verify OTP',
      description: 'Verify OTP code sent via SMS',
      auth: false,
      requestBody: {
        type: 'object',
        properties: {
          identifier: { type: 'string' },
          otp_code: { type: 'string', length: 6 }
        }
      },
      responses: {
        '200': { description: 'OTP verified successfully' },
        '400': { description: 'Invalid or expired OTP' }
      }
    }
  ],
  bookings: [
    {
      method: 'GET',
      path: '/api/v2/bookings/available-slots',
      title: 'Get Available Slots',
      description: 'Get available time slots for booking',
      auth: false,
      parameters: [
        { name: 'date', type: 'string', required: true, description: 'YYYY-MM-DD format' },
        { name: 'service_id', type: 'string', required: true, description: 'Service UUID' }
      ],
      responses: {
        '200': {
          description: 'Available slots retrieved',
          schema: {
            success: true,
            data: {
              date: '2024-01-20',
              slots: [{ time: '10:00', available: true }]
            }
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/bookings/create',
      title: 'Create Booking',
      description: 'Create a new service booking',
      auth: true,
      requestBody: {
        type: 'object',
        properties: {
          service_id: { type: 'string', format: 'uuid' },
          package_id: { type: 'string', format: 'uuid', optional: true },
          address_id: { type: 'string', format: 'uuid' },
          scheduled_date: { type: 'string' },
          scheduled_time: { type: 'string' },
          notes: { type: 'string', optional: true }
        }
      },
      responses: {
        '201': { description: 'Booking created successfully' },
        '400': { description: 'Invalid booking data' }
      }
    }
  ],
  payments: [
    {
      method: 'POST',
      path: '/api/v2/payments/create',
      title: 'Create Payment',
      description: 'Process payment for booking',
      auth: true,
      requestBody: {
        type: 'object',
        properties: {
          booking_id: { type: 'string', format: 'uuid' },
          payment_method: { type: 'string', enum: ['wallet', 'moyasar', 'tabby'] },
          wallet_amount: { type: 'number', minimum: 0 },
          gateway_amount: { type: 'number', minimum: 0 }
        }
      },
      responses: {
        '201': { description: 'Payment created successfully' },
        '400': { description: 'Payment validation error' }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/payments/moyasar/create',
      title: 'Moyasar Payment',
      description: 'Create Moyasar payment charge',
      auth: true,
      responses: {
        '201': { description: 'Moyasar payment created' }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/payments/tabby/checkout',
      title: 'Tabby Checkout',
      description: 'Create Tabby BNPL checkout session',
      auth: true,
      responses: {
        '201': { description: 'Tabby checkout created' }
      }
    }
  ],
  referrals: [
    {
      method: 'POST',
      path: '/api/v2/referrals/validate',
      title: 'Validate Referral Code',
      description: 'Validate a referral code and get discount details',
      auth: false,
      requestBody: {
        type: 'object',
        properties: {
          code: { type: 'string', minLength: 1, maxLength: 20, description: 'Referral code to validate' }
        }
      },
      responses: {
        '200': {
          description: 'Referral code validated successfully',
          schema: {
            success: true,
            data: {
              valid: true,
              referrer_name: 'Ahmed',
              discount_type: 'percentage',
              discount_value: 10,
              discount_amount: 0,
              campaign_id: 'camp_123'
            }
          }
        },
        '400': { description: 'Invalid referral code or no active campaign' },
        '404': { description: 'Referral code not found' }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/referrals/redeem',
      title: 'Redeem Referral Code',
      description: 'Redeem a referral code for an order (creates referral record)',
      auth: true,
      requestBody: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Referral code' },
          order_amount: { type: 'number', description: 'Order amount for discount calculation' }
        }
      },
      responses: {
        '200': {
          description: 'Referral redeemed successfully',
          schema: {
            success: true,
            message: 'Referral code applied successfully',
            data: {
              discount_amount: 50.00,
              referral_id: 'ref_123'
            }
          }
        },
        '400': { description: 'Cannot use own referral code, already used referral, or no active campaign' },
        '404': { description: 'Invalid referral code' }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/referrals/stats',
      title: 'Get Referral Statistics',
      description: 'Get referral statistics for authenticated user',
      auth: true,
      responses: {
        '200': {
          description: 'Statistics retrieved successfully',
          schema: {
            success: true,
            data: {
              referral_code: 'AHMED123',
              total_referrals: 15,
              total_rewards: 450.00,
              pending_rewards: 100.00
            }
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/referrals',
      title: 'List All Referrals (Admin)',
      description: 'List all referrals in the system (Admin only)',
      auth: true,
      responses: {
        '200': {
          description: 'Referrals retrieved successfully',
          schema: {
            success: true,
            data: [
              {
                id: 'ref_123',
                inviter_name: 'Ahmed',
                invitee_name: 'Sara',
                campaign_name: { en: 'Summer Promo', ar: 'عرض الصيف' },
                status: 'rewarded',
                reward_amount: 30.00,
                discount_applied: 15.00,
                created_at: '2024-01-15T10:00:00Z'
              }
            ]
          }
        },
        '403': { description: 'Admin access required' }
      }
    },
    {
      method: 'POST',
      path: '/api/v2/admin/referrals/campaigns',
      title: 'Create Referral Campaign (Admin)',
      description: 'Create a new referral campaign with rewards and discounts (Admin only)',
      auth: true,
      requestBody: {
        type: 'object',
        properties: {
          name: { type: 'object', properties: { en: 'string', ar: 'string' } },
          description: { type: 'object', properties: { en: 'string', ar: 'string' }, optional: true },
          inviter_reward: { type: 'number', minimum: 0 },
          invitee_discount_type: { type: 'string', enum: ['percentage', 'fixed'] },
          invitee_discount_value: { type: 'number', minimum: 0 },
          max_uses_per_user: { type: 'number', minimum: 0 },
          valid_from: { type: 'string', format: 'date' },
          valid_until: { type: 'string', format: 'date', optional: true }
        }
      },
      responses: {
        '201': {
          description: 'Campaign created successfully',
          schema: {
            success: true,
            data: {
              id: 'camp_123',
              name: { en: 'Summer Referral', ar: 'إحالة الصيف' },
              is_active: true
            }
          }
        },
        '403': { description: 'Admin access required' }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/referrals/campaigns',
      title: 'List Referral Campaigns (Admin)',
      description: 'List all referral campaigns (Admin only)',
      auth: true,
      responses: {
        '200': {
          description: 'Campaigns retrieved successfully',
          schema: {
            success: true,
            data: [
              {
                id: 'camp_123',
                name: { en: 'Summer Referral', ar: 'إحالة الصيف' },
                is_active: true,
                inviter_reward: 50.00,
                invitee_discount_type: 'percentage',
                invitee_discount_value: 10,
                valid_from: '2024-01-01',
                valid_until: '2024-12-31'
              }
            ]
          }
        },
        '403': { description: 'Admin access required' }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/referrals/analytics',
      title: 'Get Referral Analytics (Admin)',
      description: 'Get referral analytics with date filtering (Admin only)',
      auth: true,
      parameters: [
        { name: 'from_date', type: 'string', required: false, description: 'Start date (YYYY-MM-DD)' },
        { name: 'to_date', type: 'string', required: false, description: 'End date (YYYY-MM-DD)' }
      ],
      responses: {
        '200': {
          description: 'Analytics retrieved successfully',
          schema: {
            success: true,
            data: {
              total_referrals: 150,
              total_rewards: 4500.00,
              total_discounts: 1200.00,
              monthly_referrals: [{ month: 'January', count: 45 }],
              rewards_distribution: [{ status: 'rewarded', amount: 3000.00 }],
              top_referrers: [{ user: 'Ahmed', referral_count: 12, total_rewards: 360.00 }]
            }
          }
        },
        '403': { description: 'Admin access required' }
      }
    },
    {
      method: 'GET',
      path: '/api/v2/admin/users/:userId/referrals',
      title: 'Get User Referral Data (Admin)',
      description: 'Get user-specific referral data (auto-generates referral code if missing)',
      auth: true,
      parameters: [
        { name: 'userId', type: 'string', required: true, description: 'User ID' }
      ],
      responses: {
        '200': {
          description: 'User referral data retrieved successfully',
          schema: {
            success: true,
            data: {
              referral_code: 'AHMED123',
              stats: {
                total_referrals: 15,
                total_rewards: 450.00,
                total_discounts: 120.00
              },
              referrals: [
                {
                  id: 'ref_123',
                  invitee_name: 'Sara',
                  status: 'rewarded',
                  created_at: '2024-01-15T10:00:00Z'
                }
              ]
            }
          }
        },
        '403': { description: 'Admin access required' },
        '404': { description: 'User not found' }
      }
    }
  ]
};

const methodColors = {
  GET: 'bg-green-500',
  POST: 'bg-blue-500', 
  PUT: 'bg-yellow-500',
  DELETE: 'bg-red-500'
};

export default function ApiDocumentation() {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);

  const isArabic = selectedLanguage === 'ar';

  return (
    <div className="min-h-screen bg-background" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                  <i className="fas fa-sparkles text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {isArabic ? 'واجهة برمجة التطبيقات راكيز' : 'Rakeez API'}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {isArabic ? 'الإصدار 2.0 - التوثيق' : 'v2.0 Documentation'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-32" data-testid="language-selector">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
              
              <Button className="bg-primary text-primary-foreground" data-testid="get-api-keys">
                <i className="fas fa-key mr-2"></i>
                {isArabic ? 'الحصول على مفاتيح API' : 'Get API Keys'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <span className="text-sm font-medium">
                🚀 {isArabic ? 'جاهز للإنتاج • دعم ثنائي اللغة • تحديثات فورية' : 'Production Ready • Bilingual Support • Real-time Updates'}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {isArabic ? 'واجهة برمجة تطبيقات راكيز' : 'Rakeez Backend API'}
            </h1>
            <p className="text-xl text-white/90 mb-8">
              {isArabic 
                ? 'توثيق شامل لواجهة برمجة التطبيقات REST لتطبيق خدمات التنظيف والصيانة ثنائي اللغة مع تكامل بوابات الدفع المتعددة'
                : 'Complete RESTful API documentation for bilingual cleaning and maintenance services mobile application with multi-gateway payment integration'
              }
            </p>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-sm opacity-80">{isArabic ? 'الرابط الأساسي' : 'Base URL'}</div>
                <div className="font-mono font-semibold">https://api.rakeez.sa/v2</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-sm opacity-80">{isArabic ? 'المصادقة' : 'Authentication'}</div>
                <div className="font-mono font-semibold">Bearer JWT Token</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-sm opacity-80">{isArabic ? 'تنسيق الاستجابة' : 'Response Format'}</div>
                <div className="font-mono font-semibold">JSON</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {isArabic ? 'التنقل' : 'Navigation'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-96">
                    <nav className="space-y-1">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm" 
                        onClick={() => setSelectedEndpoint(null)}
                        data-testid="nav-overview"
                      >
                        <i className="fas fa-info-circle w-4 mr-2"></i>
                        {isArabic ? 'نظرة عامة' : 'Overview'}
                      </Button>
                      
                      {Object.entries(endpoints).map(([category, categoryEndpoints]) => (
                        <div key={category} className="space-y-1">
                          <div className="font-medium text-xs text-muted-foreground uppercase tracking-wide px-3 py-2">
                            {category === 'auth' ? (isArabic ? 'المصادقة' : 'Authentication') :
                             category === 'bookings' ? (isArabic ? 'الحجوزات' : 'Bookings') :
                             category === 'payments' ? (isArabic ? 'الدفعات' : 'Payments') :
                             category === 'referrals' ? (isArabic ? 'الإحالات والعروض' : 'Referrals & Promos') : category}
                          </div>
                          {categoryEndpoints.map((endpoint, index) => (
                            <Button
                              key={`${category}-${index}`}
                              variant="ghost"
                              className="w-full justify-start text-xs"
                              onClick={() => setSelectedEndpoint(endpoint)}
                              data-testid={`nav-endpoint-${endpoint.path.replace(/\//g, '-')}`}
                            >
                              <Badge 
                                className={`${methodColors[endpoint.method]} text-white text-xs mr-2 px-1 py-0`}
                              >
                                {endpoint.method}
                              </Badge>
                              <span className="truncate">{endpoint.path.split('/').pop()}</span>
                            </Button>
                          ))}
                        </div>
                      ))}
                    </nav>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="lg:col-span-3 space-y-8">
            {!selectedEndpoint ? (
              <>
                {/* Overview */}
                <section data-testid="api-overview">
                  <h2 className="text-3xl font-bold mb-6">
                    {isArabic ? 'نظرة عامة على API' : 'API Overview'}
                  </h2>
                  
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>{isArabic ? 'المعمارية والميزات' : 'Architecture & Features'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <i className="fas fa-language text-primary"></i>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{isArabic ? 'الدعم ثنائي اللغة' : 'Bilingual Support'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {isArabic ? 'دعم كامل للعربية والإنجليزية مع استجابات جاهزة للـ RTL' : 'Full Arabic & English support with RTL-ready responses'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                            <i className="fas fa-lock text-secondary"></i>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{isArabic ? 'المصادقة الآمنة' : 'Secure Authentication'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {isArabic ? 'رموز JWT مع إدارة الجلسات عبر Redis' : 'JWT tokens with Redis session management'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                            <i className="fas fa-credit-card text-accent"></i>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{isArabic ? 'بوابات دفع متعددة' : 'Multi-Gateway Payments'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {isArabic ? 'تكامل ميسر (البطاقات، Apple Pay) وتابي BNPL' : 'Moyasar (Cards, Apple Pay) & Tabby BNPL integration'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <i className="fas fa-database text-primary"></i>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm">{isArabic ? 'تخزين مؤقت Redis' : 'Redis Caching'}</h4>
                            <p className="text-sm text-muted-foreground">
                              {isArabic ? 'تخزين OTP، طوابير webhook، محدود المعدل' : 'OTP storage, webhook queues, rate limiting'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <i className="fas fa-shield-alt text-primary text-xl"></i>
                          </div>
                          <span className="text-2xl font-bold text-primary">150+</span>
                        </div>
                        <h4 className="font-semibold mb-1">
                          {isArabic ? 'نقاط النهاية API' : 'API Endpoints'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'تغطية شاملة لـ REST API' : 'Comprehensive REST API coverage'}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                            <i className="fas fa-clock text-secondary text-xl"></i>
                          </div>
                          <span className="text-2xl font-bold text-secondary">99.9%</span>
                        </div>
                        <h4 className="font-semibold mb-1">
                          {isArabic ? 'اتفاقية مستوى الخدمة' : 'Uptime SLA'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'موثوقية جاهزة للإنتاج' : 'Production-ready reliability'}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                            <i className="fas fa-bolt text-accent text-xl"></i>
                          </div>
                          <span className="text-2xl font-bold text-accent">&lt;100ms</span>
                        </div>
                        <h4 className="font-semibold mb-1">
                          {isArabic ? 'متوسط الاستجابة' : 'Avg Response'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {isArabic ? 'أداء محسن' : 'Optimized performance'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                {/* Authentication */}
                <section data-testid="authentication-section">
                  <h2 className="text-3xl font-bold mb-6">
                    {isArabic ? 'المصادقة' : 'Authentication'}
                  </h2>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>{isArabic ? 'مصادقة مبنية على JWT Token' : 'JWT Token-Based Authentication'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        {isArabic 
                          ? 'جميع طلبات API يجب أن تتضمن رمز JWT صحيح في رأس Authorization. يتم الحصول على الرموز من خلال نقطة نهاية تسجيل الدخول وتنتهي صلاحيتها بعد 24 ساعة.'
                          : 'All API requests must include a valid JWT token in the Authorization header. Tokens are obtained through the login endpoint and expire after 24 hours.'
                        }
                      </p>
                      
                      <div className="bg-muted rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-sm mb-2">
                          {isArabic ? 'رأس الطلب' : 'Request Header'}
                        </h4>
                        <pre className="text-sm font-mono">
                          <code>Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</code>
                        </pre>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <h4 className="font-semibold text-sm mb-2 flex items-center">
                            <i className="fas fa-key text-primary mr-2"></i>
                            {isArabic ? 'المفتاح السري (الخادم)' : 'Secret Key (Backend)'}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {isArabic ? 'يُستخدم لطلبات الخادم إلى الخادم' : 'Use for server-to-server requests'}
                          </p>
                          <div className="bg-white rounded px-3 py-2 font-mono text-xs break-all">
                            sk_test_your_secret_key_here
                          </div>
                        </div>
                        
                        <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4">
                          <h4 className="font-semibold text-sm mb-2 flex items-center">
                            <i className="fas fa-mobile-alt text-secondary mr-2"></i>
                            {isArabic ? 'المفتاح العام (الموبايل)' : 'Public Key (Mobile)'}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-2">
                            {isArabic ? 'يُستخدم لتطبيقات الجانب العميل' : 'Use for client-side applications'}
                          </p>
                          <div className="bg-white rounded px-3 py-2 font-mono text-xs break-all">
                            pk_test_your_public_key_here
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              </>
            ) : (
              /* Selected Endpoint Details */
              <section data-testid="endpoint-details">
                <div className="flex items-center space-x-3 mb-6">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedEndpoint(null)}
                    data-testid="back-button"
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    {isArabic ? 'العودة' : 'Back'}
                  </Button>
                  <Badge className={`${methodColors[selectedEndpoint.method]} text-white`}>
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="text-lg font-mono">{selectedEndpoint.path}</code>
                  {selectedEndpoint.auth && (
                    <Badge variant="outline">
                      <i className="fas fa-lock mr-1"></i>
                      {isArabic ? 'مطلوب مصادقة' : 'Auth Required'}
                    </Badge>
                  )}
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{selectedEndpoint.title}</CardTitle>
                      <CardDescription>{selectedEndpoint.description}</CardDescription>
                    </CardHeader>
                  </Card>

                  {selectedEndpoint.parameters && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {isArabic ? 'المعاملات' : 'Parameters'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {selectedEndpoint.parameters.map((param) => (
                            <div key={param.name} className="flex items-start space-x-3 p-3 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <code className="font-mono text-sm">{param.name}</code>
                                  <Badge variant={param.required ? "destructive" : "secondary"} className="text-xs">
                                    {param.required ? (isArabic ? 'مطلوب' : 'required') : (isArabic ? 'اختياري' : 'optional')}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{param.description}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {param.type}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedEndpoint.requestBody && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {isArabic ? 'نموذج الطلب' : 'Request Body'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-muted rounded-lg p-4">
                          <pre className="text-sm font-mono overflow-x-auto">
                            <code>{JSON.stringify(selectedEndpoint.requestBody.properties, null, 2)}</code>
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {isArabic ? 'الاستجابات' : 'Responses'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue={Object.keys(selectedEndpoint.responses)[0]}>
                        <TabsList>
                          {Object.keys(selectedEndpoint.responses).map((statusCode) => (
                            <TabsTrigger key={statusCode} value={statusCode}>
                              {statusCode}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {Object.entries(selectedEndpoint.responses).map(([statusCode, response]) => (
                          <TabsContent key={statusCode} value={statusCode}>
                            <div className="space-y-3">
                              <p className="text-sm text-muted-foreground">{response.description}</p>
                              {response.schema && (
                                <div className="bg-muted rounded-lg p-4">
                                  <pre className="text-sm font-mono overflow-x-auto">
                                    <code>{JSON.stringify(response.schema, null, 2)}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
