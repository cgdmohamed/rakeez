import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock } from 'lucide-react';

export default function TechnicianOverview() {
  const userId = localStorage.getItem('user_id');
  
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: [`/api/v2/technician/${userId}/bookings`],
  });

  const bookings = bookingsData?.data || [];
  const pending = bookings.filter((b: any) => b.status === 'pending' || b.status === 'confirmed').length;
  const inProgress = bookings.filter((b: any) => b.status === 'in_progress').length;
  const completed = bookings.filter((b: any) => b.status === 'completed').length;

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-title">Technician Dashboard</h1>
        <p className="text-muted-foreground">Welcome to your Rakeez technician portal</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="card-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending">{pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card data-testid="card-in-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-in-progress">{inProgress}</div>
            <p className="text-xs text-muted-foreground">Active jobs</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-completed">{completed}</div>
            <p className="text-xs text-muted-foreground">Successfully finished</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.slice(0, 5).map((booking: any) => (
            <div key={booking.id} className="flex justify-between items-center py-3 border-b last:border-0">
              <div>
                <p className="font-medium">{booking.service?.name?.en || 'Service'}</p>
                <p className="text-sm text-muted-foreground">
                  {booking.scheduled_date} at {booking.scheduled_time}
                </p>
              </div>
              <div className="text-sm font-medium">{booking.total_amount} SAR</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
