import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Calendar, CheckCircle, XCircle } from 'lucide-react';

export default function AdminOverview() {
  const { data: stats, isLoading } = useQuery<{ data: { order_stats: any; revenue_stats: any } }>({
    queryKey: ['/api/v2/admin/analytics'],
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const orderStats = stats?.data?.order_stats || {};
  const revenueStats = stats?.data?.revenue_stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Admin Dashboard</h1>
        <p className="text-foreground/70">Welcome to Rakeez admin portal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-revenue">
              {(Number(revenueStats.total_revenue) || 0).toLocaleString()} SAR
            </div>
            <p className="text-xs text-foreground/80">All-time earnings</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-orders">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Calendar className="h-4 w-4 text-primary/60" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-orders">
              {orderStats.total_orders || '0'}
            </div>
            <p className="text-xs text-foreground/80">All bookings</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed">
              {orderStats.completed_orders || '0'}
            </div>
            <p className="text-xs text-foreground/80">Successfully completed</p>
          </CardContent>
        </Card>

        <Card data-testid="card-cancelled">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-cancelled">
              {orderStats.cancelled_orders || '0'}
            </div>
            <p className="text-xs text-foreground/80">Cancelled bookings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Wallet</span>
                <span className="text-sm font-medium">{(Number(revenueStats.revenue_by_payment_method?.wallet) || 0).toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Moyasar</span>
                <span className="text-sm font-medium">{(Number(revenueStats.revenue_by_payment_method?.moyasar) || 0).toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Tabby</span>
                <span className="text-sm font-medium">{(Number(revenueStats.revenue_by_payment_method?.tabby) || 0).toLocaleString()} SAR</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Pending</span>
                <span className="text-sm font-medium">{orderStats.pending_orders || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">In Progress</span>
                <span className="text-sm font-medium">{orderStats.in_progress_orders || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Completed</span>
                <span className="text-sm font-medium">{orderStats.completed_orders || '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
