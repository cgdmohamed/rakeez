import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookingCalendar } from '@/components/BookingCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Clock, User, MapPin, Phone, Mail, X } from 'lucide-react';
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
  technician?: {
    id: string;
    fullName: string;
    phone: string;
  };
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email: string;
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
  technician_assigned: { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', label: 'Assigned' },
  en_route: { bg: 'bg-indigo-100 border-indigo-300', text: 'text-indigo-800', label: 'En Route' },
  in_progress: { bg: 'bg-orange-100 border-orange-300', text: 'text-orange-800', label: 'In Progress' },
  quotation_pending: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', label: 'Quotation' },
  completed: { bg: 'bg-green-100 border-green-300', text: 'text-green-800', label: 'Completed' },
  cancelled: { bg: 'bg-red-100 border-red-300', text: 'text-red-800', label: 'Cancelled' },
};

export default function AdminCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [technicianFilter, setTechnicianFilter] = useState<string>('all');

  const { data: bookingsData, isLoading } = useQuery<{ success: boolean; data: Booking[] }>({
    queryKey: ['/api/v2/admin/bookings'],
  });

  const { data: techniciansData } = useQuery<{ success: boolean; data: Array<{ id: string; fullName: string }> }>({
    queryKey: ['/api/v2/admin/technicians'],
  });

  const bookings = bookingsData?.data || [];
  const technicians = techniciansData?.data || [];

  const filteredBookings = bookings.filter(booking => {
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    if (technicianFilter !== 'all' && booking.technician?.id !== technicianFilter) return false;
    return true;
  });

  const selectedDateBookings = selectedDate
    ? filteredBookings.filter(booking => 
        format(new Date(booking.scheduledDate), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
    : [];

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
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Booking Calendar</h1>
          <p className="text-muted-foreground">View and manage all bookings</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="technician_assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={technicianFilter} onValueChange={setTechnicianFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-technician-filter">
              <SelectValue placeholder="Filter by technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Technicians</SelectItem>
              {technicians.map(tech => (
                <SelectItem key={tech.id} value={tech.id}>{tech.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BookingCalendar
            bookings={filteredBookings}
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
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
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click on a date to view bookings
                </p>
              ) : selectedDateBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No bookings on this date
                </p>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
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
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{booking.scheduledTime}</span>
                                </div>
                                <h4 className="font-semibold">{booking.service.name.en}</h4>
                                {booking.tier && (
                                  <Badge variant="outline" className="text-xs">
                                    {booking.tier.name.en}
                                  </Badge>
                                )}
                              </div>
                              <Badge
                                className={cn(
                                  statusColors[booking.status]?.bg,
                                  statusColors[booking.status]?.text
                                )}
                              >
                                {statusColors[booking.status]?.label || booking.status}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span>{booking.customer.fullName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{booking.customer.phone}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs">{booking.customer.email}</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <span className="text-xs">
                                  {booking.address.street}, {booking.address.city}
                                </span>
                              </div>
                              {booking.technician && (
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <User className="h-4 w-4 text-purple-600" />
                                  <span className="text-purple-600">
                                    Technician: {booking.technician.fullName}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                              <span className="text-sm font-medium">
                                SAR {parseFloat(booking.totalAmount).toFixed(2)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {booking.paymentStatus}
                              </Badge>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => window.location.href = `/admin/bookings?id=${booking.id}`}
                              data-testid={`button-view-booking-${booking.id}`}
                            >
                              View Details
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
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
