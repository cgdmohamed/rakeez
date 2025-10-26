import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  DollarSign,
  Star,
  MapPin,
  Phone,
  User,
  Package
} from 'lucide-react';
import { Link } from 'wouter';

export default function TechnicianOverview() {
  const userId = localStorage.getItem('user_id');
  
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: [`/api/v2/technician/${userId}/bookings`],
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['/api/v2/technician/performance'],
  });

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/v2/profile'],
  });

  if (bookingsLoading || performanceLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const bookings = bookingsData?.data || [];
  const performance = performanceData?.data?.overall || {};
  const profile = profileData?.data;

  const todayBookings = bookings.filter((b: any) => {
    const bookingDate = new Date(b.scheduled_date).toDateString();
    const today = new Date().toDateString();
    return bookingDate === today;
  });

  const pending = bookings.filter((b: any) => b.status === 'pending' || b.status === 'confirmed').length;
  const inProgress = bookings.filter((b: any) => b.status === 'in_progress' || b.status === 'en_route').length;
  const upcomingBookings = bookings.filter((b: any) => {
    const bookingDate = new Date(b.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today && (b.status === 'confirmed' || b.status === 'technician_assigned');
  }).slice(0, 5);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      technician_assigned: 'bg-purple-100 text-purple-800',
      en_route: 'bg-indigo-100 text-indigo-800',
      in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-title">Welcome back, {profile?.name}!</h1>
        <p className="text-muted-foreground">Here's what's happening with your work today</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-today">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Jobs</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-today">{todayBookings.length}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending">{pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting action</p>
          </CardContent>
        </Card>

        <Card data-testid="card-in-progress">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-in-progress">{inProgress}</div>
            <p className="text-xs text-muted-foreground">Active jobs</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-completed">
              {performance.completedJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.totalRevenue?.toFixed(2) || '0.00'} SAR</div>
            <p className="text-xs text-muted-foreground">Earned from completed jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.averageRating?.toFixed(1) || '0.0'}</div>
            <p className="text-xs text-muted-foreground">Out of 5.0</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performance.completionRate?.toFixed(0) || 0}%</div>
            <p className="text-xs text-muted-foreground">Job success rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Upcoming Bookings</CardTitle>
          <Link href="/technician/bookings">
            <Button variant="outline" size="sm" data-testid="button-view-all">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-center">No upcoming bookings scheduled</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking: any) => (
                <div 
                  key={booking.id} 
                  className="flex justify-between items-start p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  data-testid={`booking-${booking.id}`}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{booking.service?.name?.en || 'Service'}</h4>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{booking.scheduled_date} at {booking.scheduled_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" />
                        <span>{booking.user?.name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{booking.user?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{booking.address?.district || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-lg font-bold text-blue-600">{booking.total_amount} SAR</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/technician/bookings">
              <Button variant="outline" className="w-full justify-start" data-testid="button-my-bookings">
                <Calendar className="mr-2 h-4 w-4" />
                View My Bookings
              </Button>
            </Link>
            <Link href="/technician/performance">
              <Button variant="outline" className="w-full justify-start" data-testid="button-performance">
                <TrendingUp className="mr-2 h-4 w-4" />
                Check Performance
              </Button>
            </Link>
            <Link href="/technician/availability">
              <Button variant="outline" className="w-full justify-start" data-testid="button-availability">
                <Clock className="mr-2 h-4 w-4" />
                Update Availability
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Availability</span>
              <Badge variant="outline" className="capitalize">
                {profile?.availability_status || 'available'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Service Radius</span>
              <span className="font-medium">{profile?.service_radius || 50} km</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Max Daily Jobs</span>
              <span className="font-medium">{profile?.max_daily_bookings || 10}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Wallet Balance</span>
              <span className="font-semibold text-green-600">{profile?.wallet_balance || '0.00'} SAR</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
