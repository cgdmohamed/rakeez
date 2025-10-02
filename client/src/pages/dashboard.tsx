import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';

interface DashboardStats {
  total_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  revenue_by_payment_method: {
    wallet: number;
    moyasar: number;
    tabby: number;
  };
  top_services: Array<{
    service_id: string;
    name: string;
    orders: number;
    revenue: number;
  }>;
  technician_performance: Array<{
    technician_id: string;
    name: string;
    completed_orders: number;
    avg_rating: number;
  }>;
}

export default function Dashboard() {
  const [dateRange, setDateRange] = useState('last_30_days');
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/v2/admin/analytics', dateRange],
    enabled: true,
  });

  const { data: systemHealth } = useQuery<{ healthy: boolean }>({
    queryKey: ['/api/v2/admin/system-health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Unable to load dashboard data. Please check your connection and try again.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(selectedLanguage === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background p-6" dir={selectedLanguage === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {selectedLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {selectedLanguage === 'ar' 
                ? 'نظرة عامة على أداء كلين سيرف' 
                : 'CleanServe performance overview'
              }
            </p>
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

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40" data-testid="date-range-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_7_days">
                  {selectedLanguage === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}
                </SelectItem>
                <SelectItem value="last_30_days">
                  {selectedLanguage === 'ar' ? 'آخر 30 يوم' : 'Last 30 days'}
                </SelectItem>
                <SelectItem value="last_90_days">
                  {selectedLanguage === 'ar' ? 'آخر 90 يوم' : 'Last 90 days'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* System Health Alert */}
        {systemHealth && !systemHealth.healthy && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <i className="fas fa-exclamation-triangle text-destructive"></i>
              <span className="font-semibold text-destructive">
                {selectedLanguage === 'ar' ? 'تحذير النظام' : 'System Alert'}
              </span>
            </div>
            <p className="text-sm mt-1">
              {selectedLanguage === 'ar' 
                ? 'هناك مشاكل في النظام تحتاج إلى اهتمام'
                : 'There are system issues that need attention'
              }
            </p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover-card" data-testid="card-total-orders">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {selectedLanguage === 'ar' ? 'إجمالي الطلبات' : 'Total Orders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats?.total_orders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {selectedLanguage === 'ar' ? 'جميع الطلبات' : 'All bookings'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover-card" data-testid="card-completed-orders">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {selectedLanguage === 'ar' ? 'الطلبات المكتملة' : 'Completed Orders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats?.completed_orders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats && stats.total_orders > 0 
                  ? `${Math.round((stats.completed_orders / stats.total_orders) * 100)}% ${selectedLanguage === 'ar' ? 'معدل الإكمال' : 'completion rate'}`
                  : selectedLanguage === 'ar' ? 'لا توجد طلبات' : 'No orders yet'
                }
              </p>
            </CardContent>
          </Card>

          <Card className="hover-card" data-testid="card-total-revenue">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {selectedLanguage === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{formatCurrency(stats?.total_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {selectedLanguage === 'ar' ? 'شامل الضريبة' : 'Including VAT'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover-card" data-testid="card-cancelled-orders">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {selectedLanguage === 'ar' ? 'الطلبات الملغاة' : 'Cancelled Orders'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.cancelled_orders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats && stats.total_orders > 0 
                  ? `${Math.round((stats.cancelled_orders / stats.total_orders) * 100)}% ${selectedLanguage === 'ar' ? 'معدل الإلغاء' : 'cancellation rate'}`
                  : selectedLanguage === 'ar' ? 'لا إلغاءات' : 'No cancellations'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="revenue" data-testid="tab-revenue">
              {selectedLanguage === 'ar' ? 'الإيرادات' : 'Revenue'}
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">
              {selectedLanguage === 'ar' ? 'الخدمات' : 'Services'}
            </TabsTrigger>
            <TabsTrigger value="technicians" data-testid="tab-technicians">
              {selectedLanguage === 'ar' ? 'الفنيين' : 'Technicians'}
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">
              {selectedLanguage === 'ar' ? 'الدفعات' : 'Payments'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card data-testid="revenue-breakdown">
              <CardHeader>
                <CardTitle>
                  {selectedLanguage === 'ar' ? 'تفصيل الإيرادات' : 'Revenue Breakdown'}
                </CardTitle>
                <CardDescription>
                  {selectedLanguage === 'ar' 
                    ? 'تحليل الإيرادات حسب طريقة الدفع'
                    : 'Revenue analysis by payment method'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-primary"></div>
                      <span>{selectedLanguage === 'ar' ? 'محفظة' : 'Wallet'}</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(stats?.revenue_by_payment_method?.wallet || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-secondary"></div>
                      <span>{selectedLanguage === 'ar' ? 'ميسر' : 'Moyasar'}</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(stats?.revenue_by_payment_method?.moyasar || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded bg-accent"></div>
                      <span>{selectedLanguage === 'ar' ? 'تابي' : 'Tabby'}</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(stats?.revenue_by_payment_method?.tabby || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card data-testid="top-services">
              <CardHeader>
                <CardTitle>
                  {selectedLanguage === 'ar' ? 'أهم الخدمات' : 'Top Services'}
                </CardTitle>
                <CardDescription>
                  {selectedLanguage === 'ar' 
                    ? 'الخدمات الأكثر طلباً'
                    : 'Most requested services'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.top_services?.map((service, index) => (
                    <div key={service.service_id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {service.orders} {selectedLanguage === 'ar' ? 'طلب' : 'orders'}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold">{formatCurrency(service.revenue)}</span>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-center py-8">
                      {selectedLanguage === 'ar' ? 'لا توجد بيانات خدمات' : 'No service data available'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technicians">
            <Card data-testid="technician-performance">
              <CardHeader>
                <CardTitle>
                  {selectedLanguage === 'ar' ? 'أداء الفنيين' : 'Technician Performance'}
                </CardTitle>
                <CardDescription>
                  {selectedLanguage === 'ar' 
                    ? 'إحصائيات الفنيين والتقييمات'
                    : 'Technician statistics and ratings'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.technician_performance?.map((technician) => (
                    <div key={technician.technician_id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{technician.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {technician.completed_orders} {selectedLanguage === 'ar' ? 'طلب مكتمل' : 'completed orders'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-yellow-500">★</span>
                        <span className="font-semibold">{technician.avg_rating.toFixed(1)}</span>
                      </div>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-center py-8">
                      {selectedLanguage === 'ar' ? 'لا توجد بيانات فنيين' : 'No technician data available'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card data-testid="payment-methods">
              <CardHeader>
                <CardTitle>
                  {selectedLanguage === 'ar' ? 'طرق الدفع' : 'Payment Methods'}
                </CardTitle>
                <CardDescription>
                  {selectedLanguage === 'ar' 
                    ? 'توزيع الدفعات حسب الطريقة'
                    : 'Payment distribution by method'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary mb-2">
                      {formatCurrency(stats?.revenue_by_payment_method?.wallet || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedLanguage === 'ar' ? 'محفظة' : 'Wallet'}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-secondary mb-2">
                      {formatCurrency(stats?.revenue_by_payment_method?.moyasar || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedLanguage === 'ar' ? 'ميسر (بطاقات)' : 'Moyasar (Cards)'}
                    </p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-accent mb-2">
                      {formatCurrency(stats?.revenue_by_payment_method?.tabby || 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedLanguage === 'ar' ? 'تابي (BNPL)' : 'Tabby (BNPL)'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
