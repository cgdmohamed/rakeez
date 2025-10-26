import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, Calendar, User, Clock, Package } from 'lucide-react';
import { useState } from 'react';

export default function TechnicianBookings() {
  const { toast } = useToast();
  const userId = localStorage.getItem('user_id');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: [`/api/v2/technician/${userId}/bookings`],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PUT', `/api/v2/bookings/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v2/technician/${userId}/bookings`] });
      toast({
        title: 'Success',
        description: 'Booking status has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const bookings = bookingsData?.data || [];
  
  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter((b: any) => b.status === statusFilter);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      technician_assigned: 'bg-purple-100 text-purple-800',
      en_route: 'bg-indigo-100 text-indigo-800',
      in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      quotation_pending: 'bg-amber-100 text-amber-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-title">My Bookings</h1>
          <p className="text-muted-foreground">Manage and track your assigned bookings</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{filteredBookings.length}</span>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="confirmed" data-testid="tab-confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="en_route" data-testid="tab-enroute">En Route</TabsTrigger>
          <TabsTrigger value="in_progress" data-testid="tab-inprogress">In Progress</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {filteredBookings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
                <p className="text-muted-foreground text-center">
                  {statusFilter === 'all' 
                    ? "You don't have any bookings assigned yet. New bookings will appear here."
                    : `No ${statusFilter.replace('_', ' ')} bookings at the moment.`}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredBookings.map((booking: any) => (
                <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{booking.service?.name?.en || 'Service'}</CardTitle>
                        <div className="flex gap-2 mt-3">
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="font-semibold">
                            {booking.total_amount} SAR
                          </Badge>
                        </div>
                      </div>
                      {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                        <Select
                          value={booking.status}
                          onValueChange={(status) => updateStatusMutation.mutate({ id: booking.id, status })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`select-status-${booking.id}`}
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="en_route">En Route</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Date:</span>
                          <span>{booking.scheduled_date} at {booking.scheduled_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Customer:</span>
                          <span>{booking.user?.name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Phone:</span>
                          <span>{booking.user?.phone || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <span className="font-medium">Address:</span>
                            <p className="text-muted-foreground mt-1">
                              {booking.address?.street_name || 'N/A'}
                              {booking.address?.district && `, ${booking.address.district}`}
                              {booking.address?.house_no && ` - House ${booking.address.house_no}`}
                            </p>
                          </div>
                        </div>
                        {booking.notes && (
                          <div className="text-sm">
                            <span className="font-medium">Notes:</span>
                            <p className="text-muted-foreground mt-1">{booking.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
