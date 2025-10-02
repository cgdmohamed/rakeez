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
                  <i className="fas fa-broom text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {isArabic ? 'واجهة برمجة التطبيقات كلين سيرف' : 'CleanServe API'}
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
              {isArabic ? 'واجهة برمجة تطبيقات كلين سيرف' : 'CleanServe Backend API'}
            </h1>
            <p className="text-xl text-white/90 mb-8">
              {isArabic 
                ? 'توثيق شامل لواجهة برمجة التطبيقات REST لتطبيق خدمات التنظيف ثنائي اللغة مع تكامل بوابات الدفع المتعددة'
                : 'Complete RESTful API documentation for bilingual cleaning services mobile application with multi-gateway payment integration'
              }
            </p>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-lg">
                <div className="text-sm opacity-80">{isArabic ? 'الرابط الأساسي' : 'Base URL'}</div>
                <div className="font-mono font-semibold">https://api.cleanserve.sa/v2</div>
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
                             category === 'payments' ? (isArabic ? 'الدفعات' : 'Payments') : category}
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
                            sk_test_4eC39HqLyjWDarjtT1zdp7dc
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
                            pk_test_51HqLyjWDarjtT1zdp7dc
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
