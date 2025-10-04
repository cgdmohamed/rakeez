import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = {
  primary: 'hsl(217, 100%, 30%)',
  secondary: 'hsl(175, 65%, 62%)',
  accent: 'hsl(151, 65%, 58%)',
  destructive: 'hsl(0, 84%, 60%)',
  warning: 'hsl(25, 95%, 53%)',
};

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery<{ data: { orderStats: any; revenueStats: any; monthlyRevenue: any[]; monthlyBookings: any[] } }>({
    queryKey: ['/api/v2/admin/analytics'],
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const orderStats = stats?.data?.orderStats || {};
  const revenueStats = stats?.data?.revenueStats || {};
  const monthlyRevenue = stats?.data?.monthlyRevenue || [];
  const monthlyBookings = stats?.data?.monthlyBookings || [];

  const paymentMethodData = [
    { name: 'Wallet', value: Number(revenueStats.revenueByPaymentMethod?.wallet) || 0, color: COLORS.primary },
    { name: 'Moyasar', value: Number(revenueStats.revenueByPaymentMethod?.moyasar) || 0, color: COLORS.secondary },
    { name: 'Tabby', value: Number(revenueStats.revenueByPaymentMethod?.tabby) || 0, color: COLORS.accent },
  ].filter(item => item.value > 0);

  const orderStatusData = [
    { name: 'Pending', value: Number(orderStats.pendingOrders) || 0, color: COLORS.warning },
    { name: 'In Progress', value: Number(orderStats.inProgressOrders) || 0, color: COLORS.secondary },
    { name: 'Completed', value: Number(orderStats.completedOrders) || 0, color: COLORS.accent },
    { name: 'Cancelled', value: Number(orderStats.cancelledOrders) || 0, color: COLORS.destructive },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Admin Dashboard</h1>
        <p className="text-foreground/70">Welcome to Rakeez admin portal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue" className="card-accent-blue shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue">
              {(Number(revenueStats.totalRevenue) || 0).toLocaleString()} SAR
            </div>
            <p className="text-xs text-foreground/80">All-time earnings</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-orders" className="card-accent-cyan shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">Total Orders</CardTitle>
            <Calendar className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-orders">
              {orderStats.totalOrders || '0'}
            </div>
            <p className="text-xs text-foreground/80">All bookings</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed" className="card-accent-green shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-accent">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed">
              {orderStats.completedOrders || '0'}
            </div>
            <p className="text-xs text-foreground/80">Successfully completed</p>
          </CardContent>
        </Card>

        <Card data-testid="card-cancelled" className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-cancelled">
              {orderStats.cancelledOrders || '0'}
            </div>
            <p className="text-xs text-foreground/80">Cancelled bookings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Revenue Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Bar dataKey="revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No revenue data available for the last 6 months</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Bookings Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyBookings.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyBookings}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                  />
                  <Line type="monotone" dataKey="bookings" stroke={COLORS.secondary} strokeWidth={2} dot={{ fill: COLORS.secondary, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">No booking data available for the last 6 months</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Revenue by Payment Method</CardTitle>
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
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {paymentMethodData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value.toLocaleString()} SAR</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No payment data available</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-primary">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {orderStatusData.length > 0 ? (
              <div className="flex items-center justify-between">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {orderStatusData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No order data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
