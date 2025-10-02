import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Phone, Calendar } from 'lucide-react';

export default function TechnicianBookings() {
  const { toast } = useToast();
  const userId = localStorage.getItem('user_id');

  const { data: bookingsData, isLoading } = useQuery({
    queryKey: [`/api/v2/technician/${userId}/bookings`],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/v2/bookings/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v2/technician/${userId}/bookings`] });
      toast({
        title: 'Status updated',
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

  const bookings = bookingsData?.data || [];

  if (isLoading) {
    return <div className="text-center py-8">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-title">My Bookings</h1>

      <div className="grid gap-4">
        {bookings.map((booking: any) => (
          <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{booking.service?.name?.en || 'Service'}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge>{booking.status}</Badge>
                    <Badge variant="outline">{booking.total_amount} SAR</Badge>
                  </div>
                </div>
                <Select
                  value={booking.status}
                  onValueChange={(status) => updateStatusMutation.mutate({ id: booking.id, status })}
                  data-testid={`select-status-${booking.id}`}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="en_route">En Route</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{booking.scheduled_date} at {booking.scheduled_time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{booking.user?.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{booking.address?.address || 'No address'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
