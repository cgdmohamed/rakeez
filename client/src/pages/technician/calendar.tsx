import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookingCalendar } from '@/components/BookingCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Clock, User, MapPin, Phone, X, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  service: {
    id: string;
    name: { en: string; ar: string };
  };
  tier?: {
    name: { en: string; ar: string };
  };
  customer: {
    id: string;
    fullName: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
  };
  totalAmount: string;
  paymentStatus: string;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100 border-yellow-300', text: 'text-yellow-800', label: 'Pending' },
  confirmed: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800', label: 'Confirmed' },
  technician_assigned: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', label: 'Assigned to You' },
  en_route: { bg: 'bg-indigo-100 border-indigo-300', text: 'text-indigo-800', label: 'En Route' },
  in_progress: { bg: 'bg-orange-100 border-orange-300', text: 'text-orange-800', label: 'In Progress' },
  quotation_pending: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: 'Quotation' },
  completed: { bg: 'bg-green-100 border-green-300', text: 'text-green-800', label: 'Completed' },
  cancelled: { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'Cancelled' },
};

export default function TechnicianCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: bookingsData, isLoading } = useQuery<{ success: boolean; data: Booking[] }>({
    queryKey: ['/api/v2/technician/bookings'],
  });

  const bookings = bookingsData?.data || [];

  const selectedDateBookings = selectedDate
    ? bookings.filter(booking => 
        format(new Date(booking.scheduledDate), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
    : [];

  const upcomingBookings = bookings
    .filter(b => new Date(b.scheduledDate) >= new Date() && b.status !== 'completed' && b.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">My Schedule</h1>
          <p className="text-muted-foreground">View your assigned bookings and upcoming jobs</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-bold" data-testid="text-total-bookings">{bookings.length}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600" data-testid="text-upcoming-bookings">
              {upcomingBookings.length}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BookingCalendar
            bookings={bookings}
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Upcoming Jobs'}
              </CardTitle>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(null)}
                  data-testid="button-clear-date"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                selectedDateBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No bookings on this date
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {selectedDateBookings
                        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                        .map(booking => (
                          <Card
                            key={booking.id}
                            className={cn(
                              'border-l-4',
                              statusColors[booking.status]?.bg || 'border-gray-300'
                            )}
                            data-testid={`booking-card-${booking.id}`}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">{booking.scheduledTime}</span>
                                  </div>
                                  <h4 className="font-semibold text-sm">{booking.service.name.en}</h4>
                                </div>
                                <Badge
                                  className={cn(
                                    'text-xs',
                                    statusColors[booking.status]?.bg,
                                    statusColors[booking.status]?.text
                                  )}
                                >
                                  {statusColors[booking.status]?.label || booking.status}
                                </Badge>
                              </div>

                              <div className="space-y-1.5 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{booking.customer.fullName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{booking.customer.phone}</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                                  <span className="text-xs">
                                    {booking.address.street}, {booking.address.city}
                                  </span>
                                </div>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => window.location.href = `/technician/bookings?id=${booking.id}`}
                                data-testid={`button-view-booking-${booking.id}`}
                              >
                                View Details
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </ScrollArea>
                )
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {upcomingBookings.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No upcoming bookings
                      </p>
                    ) : (
                      upcomingBookings.map(booking => (
                        <Card
                          key={booking.id}
                          className={cn(
                            'border-l-4 cursor-pointer hover:shadow-md transition-shadow',
                            statusColors[booking.status]?.bg || 'border-gray-300'
                          )}
                          onClick={() => setSelectedDate(new Date(booking.scheduledDate))}
                          data-testid={`upcoming-booking-${booking.id}`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-medium">
                                    {format(new Date(booking.scheduledDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs">{booking.scheduledTime}</span>
                                </div>
                              </div>
                              <Badge
                                className={cn(
                                  'text-xs',
                                  statusColors[booking.status]?.bg,
                                  statusColors[booking.status]?.text
                                )}
                              >
                                {statusColors[booking.status]?.label || booking.status}
                              </Badge>
                            </div>

                            <h4 className="font-semibold text-sm">{booking.service.name.en}</h4>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              <span>{booking.customer.fullName}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
