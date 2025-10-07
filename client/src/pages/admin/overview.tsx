import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Users, 
  Wallet, 
  AlertTriangle,
  Activity,
  UserCheck,
  Star,
  FileDown,
  Plus,
  UserPlus,
  ArrowRight,
  Bell,
  Clock,
  Zap
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { Link } from 'wouter';
import { useState } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const COLORS = {
  primary: 'hsl(217, 100%, 30%)',
  secondary: 'hsl(175, 65%, 62%)',
  accent: 'hsl(151, 65%, 58%)',
  destructive: 'hsl(0, 84%, 60%)',
  warning: 'hsl(25, 95%, 53%)',
  purple: 'hsl(280, 70%, 60%)',
};

interface AnalyticsData {
  orderStats: {
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
    cancelledOrders: number;
    pendingOrders: number;
    inProgressOrders: number;
  };
  revenueStats: {
    totalRevenue: number;
    revenueByPaymentMethod: {
      wallet: number;
      moyasar: number;
      tabby: number;
    };
  };
  technicianStats: {
    completedOrders: number;
    totalRevenue: number;
    avgRating: number;
  };
  topServices: any[];
  technicianPerformance: any[];
  monthlyRevenue: any[];
  monthlyBookings: any[];
  userGrowth: any[];
  recentActivity: any[];
  walletTotals: {
    totalBalance: number;
    totalEarned: number;
    totalSpent: number;
  };
  uncollectedPayments: number;
  bookingsByPaymentMethod: any[];
}

export default function AdminOverview() {
  const { toast } = useToast();
  const [quickActionDialog, setQuickActionDialog] = useState<string | null>(null);
  
  const { data: stats, isLoading } = useQuery<{ data: AnalyticsData }>({
    queryKey: ['/api/v2/admin/analytics'],
  });

  const handleExportReport = async () => {
    try {
      const response = await apiRequest('/api/v2/admin/analytics/export?format=csv&type=analytics');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Report Downloaded",
        description: "Analytics report has been exported successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const orderStats = stats?.data?.orderStats || {};
  const revenueStats = stats?.data?.revenueStats || {};
  const technicianStats = stats?.data?.technicianStats || {};
  const topServices = stats?.data?.topServices || [];
  const monthlyRevenue = stats?.data?.monthlyRevenue || [];
  const monthlyBookings = stats?.data?.monthlyBookings || [];
  const userGrowth = stats?.data?.userGrowth || [];
  const recentActivity = stats?.data?.recentActivity || [];
  const walletTotals = stats?.data?.walletTotals || { totalBalance: 0, totalEarned: 0, totalSpent: 0 };
  const uncollectedPayments = stats?.data?.uncollectedPayments || 0;
  const bookingsByPaymentMethod = stats?.data?.bookingsByPaymentMethod || [];

  const activeOrdersValue = (orderStats.inProgressOrders || 0) * (revenueStats.totalRevenue / Math.max(orderStats.totalOrders, 1) || 0);

  const topService = topServices[0] || { name: 'N/A', orders: 0 };

  const paymentMethodData = bookingsByPaymentMethod.map((item: any) => ({
    name: item.method === 'wallet' ? 'Wallet' : item.method === 'moyasar' ? 'Moyasar' : 'Tabby',
    value: item.count,
    total: item.total,
    color: item.method === 'wallet' ? COLORS.primary : item.method === 'moyasar' ? COLORS.secondary : COLORS.accent,
  })).filter(item => item.value > 0);

  const revenueData = monthlyRevenue.map((rev: any, index: number) => ({
    month: rev.month,
    revenue: Number(rev.revenue) || 0,
    expenses: Number(rev.revenue) * 0.3, // Mock expenses as 30% of revenue
  }));

  const actionTypes: Record<string, string> = {
    create: 'Created',
    update: 'Updated',
    delete: 'Deleted',
    cancel: 'Cancelled',
    refund: 'Refunded',
    status_change: 'Status Changed',
  };

  const resourceIcons: Record<string, any> = {
    booking: Calendar,
    payment: DollarSign,
    wallet: Wallet,
    refund: ArrowRight,
  };

  // Calculate alerts
  const alerts = [
    orderStats.pendingOrders > 0 && {
      type: 'warning',
      message: `${orderStats.pendingOrders} pending booking${orderStats.pendingOrders !== 1 ? 's' : ''} need approval`,
      action: 'View Bookings',
      link: '/admin/bookings?status=pending',
    },
    uncollectedPayments > 0 && {
      type: 'info',
      message: `${uncollectedPayments.toLocaleString()} SAR in uncollected payments`,
      action: 'View Payments',
      link: '/admin/payments',
    },
  ].filter(Boolean);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Admin Dashboard</h1>
            <p className="text-foreground/70">Operational Analytics & Performance Overview</p>
          </div>
          <Button onClick={handleExportReport} variant="outline" className="gap-2">
            <FileDown className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Enhanced KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {/* Pending Bookings - Amber Warning */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/bookings?status=pending">
                <Card 
                  data-testid="card-pending-bookings" 
                  className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-warning/30 bg-warning/5"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-warning">Pending</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning" data-testid="text-pending">
                      {orderStats.pendingOrders || '0'}
                    </div>
                    <p className="text-xs text-foreground/80">Need approval</p>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Click to view pending bookings</TooltipContent>
          </Tooltip>

          {/* Active Orders */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/bookings?status=in_progress">
                <Card data-testid="card-active-orders" className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-secondary">Active</CardTitle>
                    <Activity className="h-4 w-4 text-secondary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-active">
                      {orderStats.inProgressOrders || '0'}
                    </div>
                    <p className="text-xs text-foreground/80">{activeOrdersValue.toLocaleString()} SAR</p>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Active in-progress orders</TooltipContent>
          </Tooltip>

          {/* Technician Performance */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/technicians">
                <Card data-testid="card-tech-performance" className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-primary">Technicians</CardTitle>
                    <UserCheck className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-tech-jobs">
                      {technicianStats.completedOrders || '0'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-foreground/80">
                      <Star className="w-3 h-3 fill-accent text-accent" />
                      <span>{(technicianStats.avgRating || 0).toFixed(1)} avg rating</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Technician performance metrics</TooltipContent>
          </Tooltip>

          {/* Wallet Totals */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/wallets">
                <Card data-testid="card-wallet-totals" className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-purple">Wallets</CardTitle>
                    <Wallet className="h-4 w-4 text-purple" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-wallet-balance">
                      {walletTotals.totalBalance.toLocaleString()} SAR
                    </div>
                    <p className="text-xs text-foreground/80">Total balance</p>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Total wallet balances across all users</TooltipContent>
          </Tooltip>

          {/* Total Revenue */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/payments">
                <Card data-testid="card-total-revenue" className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer card-accent-blue">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-primary">Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-revenue">
                      {(Number(revenueStats.totalRevenue) || 0).toLocaleString()} SAR
                    </div>
                    <p className="text-xs text-foreground/80">All-time earnings</p>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Total revenue from all bookings</TooltipContent>
          </Tooltip>

          {/* Top Service */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/admin/services">
                <Card data-testid="card-top-service" className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer card-accent-green">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-accent">Top Service</CardTitle>
                    <TrendingUp className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold truncate" data-testid="text-top-service">
                      {topService.name}
                    </div>
                    <p className="text-xs text-foreground/80">{topService.orders} orders</p>
                  </CardContent>
                </Card>
              </Link>
            </TooltipTrigger>
            <TooltipContent>Most booked service this period</TooltipContent>
          </Tooltip>
        </div>

        {/* Alerts & Tasks Widget */}
        {alerts.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-warning" />
                <CardTitle className="text-lg">Alerts & Tasks</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${alert.type === 'warning' ? 'bg-warning' : 'bg-secondary'}`} />
                      <p className="text-sm">{alert.message}</p>
                    </div>
                    <Link href={alert.link}>
                      <Button size="sm" variant="ghost" className="gap-2">
                        {alert.action}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </div>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Link href="/admin/bookings">
                <Button variant="outline" className="w-full gap-2 hover:bg-primary/10" data-testid="button-create-booking">
                  <Plus className="w-4 h-4" />
                  Create Booking
                </Button>
              </Link>
              <Link href="/admin/technicians">
                <Button variant="outline" className="w-full gap-2 hover:bg-secondary/10" data-testid="button-assign-technician">
                  <UserPlus className="w-4 h-4" />
                  Assign Technician
                </Button>
              </Link>
              <Link href="/admin/payments">
                <Button variant="outline" className="w-full gap-2 hover:bg-accent/10" data-testid="button-issue-refund">
                  <ArrowRight className="w-4 h-4" />
                  Issue Refund
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Analytics Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Revenue vs Expenses */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Revenue vs Expenses</CardTitle>
              <CardDescription>Last 6 months financial overview</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                    <YAxis stroke="hsl(var(--foreground))" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary, r: 4 }} name="Revenue" />
                    <Line type="monotone" dataKey="expenses" stroke={COLORS.destructive} strokeWidth={2} dot={{ fill: COLORS.destructive, r: 4 }} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No revenue data available</p>
              )}
            </CardContent>
          </Card>

          {/* Customer Growth */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Customer Growth</CardTitle>
              <CardDescription>New users per month</CardDescription>
            </CardHeader>
            <CardContent>
              {userGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={userGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                    <YAxis stroke="hsl(var(--foreground))" />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                    <Area type="monotone" dataKey="users" stroke={COLORS.accent} fill={COLORS.accent} fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No user growth data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Bookings by Payment Method */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Bookings by Payment Method</CardTitle>
              <CardDescription>Distribution of payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethodData.length > 0 ? (
                <div className="flex items-center justify-between">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={paymentMethodData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {paymentMethodData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex-1">
                    {paymentMethodData.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{item.value} bookings</div>
                          <div className="text-xs text-muted-foreground">{item.total.toLocaleString()} SAR</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No payment data available</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Recent Activity</CardTitle>
              <CardDescription>Latest system activities</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {recentActivity.slice(0, 10).map((activity: any) => {
                    const Icon = resourceIcons[activity.resourceType] || Activity;
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="mt-1">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {activity.resourceType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {actionTypes[activity.action] || activity.action}
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            by <span className="font-medium">{activity.userName || 'System'}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No recent activity</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Trends */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Bookings Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyBookings.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyBookings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="bookings" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No booking data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
