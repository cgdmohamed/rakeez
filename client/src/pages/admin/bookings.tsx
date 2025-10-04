import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { XCircle, DollarSign, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BookingResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    user?: { name: string };
    service?: { name: { en: string; ar: string } };
    scheduled_date: string;
    scheduled_time: string;
    total_amount: number;
    status: string;
    payment_id?: string;
  }[];
}

export default function AdminBookings() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; bookingId: string | null; reason: string }>({
    open: false,
    bookingId: null,
    reason: '',
  });
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    bookingId: string | null;
    paymentId: string;
    reason: string;
  }>({
    open: false,
    bookingId: null,
    paymentId: '',
    reason: '',
  });

  const { data: bookingsData, isLoading } = useQuery<BookingResponse>({
    queryKey: ['/api/v2/admin/bookings'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/v2/admin/bookings/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/bookings'] });
      toast({
        title: 'Status updated',
        description: 'Booking status has been updated successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const cancelBookingMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiRequest('PATCH', `/api/v2/admin/bookings/${id}/cancel`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/bookings'] });
      setCancelDialog({ open: false, bookingId: null, reason: '' });
      toast({
        title: 'Booking cancelled',
        description: 'Booking has been cancelled successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cancel booking',
        variant: 'destructive',
      });
    },
  });

  const refundPaymentMutation = useMutation({
    mutationFn: async ({ id, payment_id, reason }: { id: string; payment_id: string; reason: string }) => {
      const response = await apiRequest('POST', `/api/v2/admin/bookings/${id}/refund`, {
        payment_id,
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/payments'] });
      setRefundDialog({ open: false, bookingId: null, paymentId: '', reason: '' });
      toast({
        title: 'Payment refunded',
        description: 'Payment has been refunded successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to refund payment',
        variant: 'destructive',
      });
    },
  });

  const bookings = bookingsData?.data || [];
  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter((b) => b.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      confirmed: 'default',
      in_progress: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const handleCancelClick = (bookingId: string) => {
    setCancelDialog({ open: true, bookingId, reason: '' });
  };

  const handleRefundClick = (bookingId: string, paymentId: string) => {
    setRefundDialog({ open: true, bookingId, paymentId, reason: '' });
  };

  const handleCancelSubmit = () => {
    if (cancelDialog.bookingId && cancelDialog.reason.trim()) {
      cancelBookingMutation.mutate({
        id: cancelDialog.bookingId,
        reason: cancelDialog.reason,
      });
    }
  };

  const handleRefundSubmit = () => {
    if (refundDialog.bookingId && refundDialog.paymentId && refundDialog.reason.trim()) {
      refundPaymentMutation.mutate({
        id: refundDialog.bookingId,
        payment_id: refundDialog.paymentId,
        reason: refundDialog.reason,
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="text-title">Bookings Management</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-all">All Bookings</SelectItem>
            <SelectItem value="pending" data-testid="select-item-pending">Pending</SelectItem>
            <SelectItem value="confirmed" data-testid="select-item-confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress" data-testid="select-item-in-progress">In Progress</SelectItem>
            <SelectItem value="completed" data-testid="select-item-completed">Completed</SelectItem>
            <SelectItem value="cancelled" data-testid="select-item-cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="text-muted-foreground">
                      No bookings found. {statusFilter !== 'all' && 'Try changing the filter.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                    <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}</TableCell>
                    <TableCell>{booking.user?.name || 'N/A'}</TableCell>
                    <TableCell>{booking.service?.name?.en || 'N/A'}</TableCell>
                    <TableCell>
                      {booking.scheduled_date && format(new Date(booking.scheduled_date), 'MMM dd, yyyy')}
                      <br />
                      <span className="text-xs text-muted-foreground">{booking.scheduled_time}</span>
                    </TableCell>
                    <TableCell>{booking.total_amount} SAR</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={booking.status}
                          onValueChange={(status) => updateStatusMutation.mutate({ id: booking.id, status })}
                          data-testid={`select-status-${booking.id}`}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending" data-testid={`select-item-pending-${booking.id}`}>Pending</SelectItem>
                            <SelectItem value="confirmed" data-testid={`select-item-confirmed-${booking.id}`}>Confirmed</SelectItem>
                            <SelectItem value="in_progress" data-testid={`select-item-in-progress-${booking.id}`}>In Progress</SelectItem>
                            <SelectItem value="completed" data-testid={`select-item-completed-${booking.id}`}>Completed</SelectItem>
                            <SelectItem value="cancelled" data-testid={`select-item-cancelled-${booking.id}`}>Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" data-testid={`button-actions-${booking.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleCancelClick(booking.id)}
                              disabled={booking.status === 'completed' || booking.status === 'cancelled'}
                              data-testid={`button-cancel-${booking.id}`}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Cancel Booking
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRefundClick(booking.id, booking.payment_id || '')}
                              disabled={
                                booking.status !== 'completed' && booking.status !== 'confirmed' ||
                                !booking.payment_id
                              }
                              data-testid={`button-refund-${booking.id}`}
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Refund Payment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}>
        <DialogContent data-testid="dialog-cancel-booking">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this booking. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">Cancellation Reason</Label>
              <Textarea
                id="cancel-reason"
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
                placeholder="Enter reason for cancellation..."
                rows={4}
                data-testid="input-cancel-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialog({ open: false, bookingId: null, reason: '' })}
              data-testid="button-cancel-dialog-close"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              disabled={!cancelDialog.reason.trim() || cancelBookingMutation.isPending}
              data-testid="button-cancel-confirm"
            >
              {cancelBookingMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Payment Dialog */}
      <Dialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog({ ...refundDialog, open })}>
        <DialogContent data-testid="dialog-refund-payment">
          <DialogHeader>
            <DialogTitle>Refund Payment</DialogTitle>
            <DialogDescription>
              This will refund the payment to the customer's wallet. Please provide a reason for the refund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-id">Payment ID</Label>
              <Input
                id="payment-id"
                value={refundDialog.paymentId}
                onChange={(e) => setRefundDialog({ ...refundDialog, paymentId: e.target.value })}
                placeholder="Enter payment ID..."
                data-testid="input-payment-id"
              />
            </div>
            <div>
              <Label htmlFor="refund-reason">Refund Reason</Label>
              <Textarea
                id="refund-reason"
                value={refundDialog.reason}
                onChange={(e) => setRefundDialog({ ...refundDialog, reason: e.target.value })}
                placeholder="Enter reason for refund..."
                rows={4}
                data-testid="input-refund-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialog({ open: false, bookingId: null, paymentId: '', reason: '' })}
              data-testid="button-refund-dialog-close"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefundSubmit}
              disabled={!refundDialog.paymentId.trim() || !refundDialog.reason.trim() || refundPaymentMutation.isPending}
              data-testid="button-refund-confirm"
            >
              {refundPaymentMutation.isPending ? 'Processing...' : 'Confirm Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
