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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  XCircle, 
  DollarSign, 
  Eye, 
  UserCheck, 
  CheckCircle, 
  PlayCircle, 
  Users,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  MapPin,
  Wallet,
  History,
  ArrowRight
} from 'lucide-react';

interface Booking {
  id: string;
  user?: { 
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  service?: { 
    id: string;
    name: { en: string; ar: string };
  };
  technician?: {
    id: string;
    name: string;
    phone?: string;
  };
  address?: {
    id: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  scheduled_date: string;
  scheduled_time: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  notes?: string;
  created_at: string;
}

interface BookingResponse {
  success: boolean;
  data: Booking[];
}

interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  wallet_balance?: number;
  total_bookings?: number;
  completed_bookings?: number;
}

interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
}

export default function AdminBookings() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; bookingId: string | null; technicianId: string }>({
    open: false,
    bookingId: null,
    technicianId: '',
  });
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; bookingId: string | null; reason: string }>({
    open: false,
    bookingId: null,
    reason: '',
  });

  const { data: bookingsData, isLoading } = useQuery<BookingResponse>({
    queryKey: ['/api/v2/admin/bookings'],
  });

  const { data: techniciansData } = useQuery<{ success: boolean; data: Technician[] }>({
    queryKey: ['/api/v2/admin/users', { role: 'technician' }],
    queryFn: async () => {
      const response = await fetch('/api/v2/admin/users?role=technician', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return response.json();
    },
  });

  const { data: customerData } = useQuery<{ success: boolean; data: CustomerProfile }>({
    queryKey: ['/api/v2/admin/customers', selectedBooking?.user?.id, 'overview'],
    queryFn: async () => {
      const response = await fetch(`/api/v2/admin/customers/${selectedBooking?.user?.id}/overview`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return response.json();
    },
    enabled: !!selectedBooking?.user?.id,
  });

  const { data: auditLogsData } = useQuery<{ success: boolean; data: AuditLog[] }>({
    queryKey: ['/api/v2/admin/audit-logs', selectedBooking?.id],
    queryFn: async () => {
      const response = await fetch(`/api/v2/admin/audit-logs?resourceId=${selectedBooking?.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      return response.json();
    },
    enabled: !!selectedBooking?.id && detailsOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest('PUT', `/api/v2/admin/bookings/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/bookings'] });
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/audit-logs'] });
      toast({
        title: 'Success',
        description: 'Booking status updated successfully',
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

  const assignTechnicianMutation = useMutation({
    mutationFn: async ({ bookingId, technicianId }: { bookingId: string; technicianId: string }) => {
      const response = await apiRequest('PUT', `/api/v2/admin/bookings/${bookingId}/assign-technician`, {
        technician_id: technicianId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/bookings'] });
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/audit-logs'] });
      setAssignDialog({ open: false, bookingId: null, technicianId: '' });
      toast({
        title: 'Success',
        description: 'Technician assigned successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign technician',
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
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/bookings'] });
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/audit-logs'] });
      setCancelDialog({ open: false, bookingId: null, reason: '' });
      toast({
        title: 'Success',
        description: 'Booking cancelled successfully',
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

  const bookings = bookingsData?.data || [];
  const technicians = techniciansData?.data || [];
  const filteredBookings = statusFilter === 'all' 
    ? bookings 
    : bookings.filter((b) => b.status === statusFilter);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'badge-pending' },
      confirmed: { label: 'Confirmed', className: 'badge-confirmed' },
      technician_assigned: { label: 'Assigned', className: 'badge-confirmed' },
      en_route: { label: 'En Route', className: 'badge-in-progress' },
      in_progress: { label: 'In Progress', className: 'badge-in-progress' },
      quotation_pending: { label: 'Quotation', className: 'bg-purple-100 text-purple-800' },
      completed: { label: 'Completed', className: 'badge-completed' },
      cancelled: { label: 'Cancelled', className: 'badge-cancelled' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-muted' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getActionButtons = (booking: Booking) => {
    const actions = [];

    if (booking.status === 'pending') {
      actions.push(
        <Button
          key="confirm"
          size="sm"
          variant="default"
          onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'confirmed' })}
          data-testid={`button-confirm-${booking.id}`}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Accept
        </Button>
      );
    }

    if (booking.status === 'confirmed' && !booking.technician) {
      actions.push(
        <Button
          key="assign"
          size="sm"
          variant="outline"
          onClick={() => setAssignDialog({ open: true, bookingId: booking.id, technicianId: '' })}
          data-testid={`button-assign-${booking.id}`}
        >
          <UserCheck className="h-4 w-4 mr-1" />
          Assign
        </Button>
      );
    }

    if (booking.status === 'technician_assigned' || booking.status === 'confirmed') {
      actions.push(
        <Button
          key="start"
          size="sm"
          variant="outline"
          onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'in_progress' })}
          data-testid={`button-start-${booking.id}`}
        >
          <PlayCircle className="h-4 w-4 mr-1" />
          Start
        </Button>
      );
    }

    if (booking.status === 'in_progress') {
      actions.push(
        <Button
          key="complete"
          size="sm"
          variant="default"
          onClick={() => updateStatusMutation.mutate({ id: booking.id, status: 'completed' })}
          data-testid={`button-complete-${booking.id}`}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Complete
        </Button>
      );
    }

    if (booking.status !== 'completed' && booking.status !== 'cancelled') {
      actions.push(
        <Button
          key="cancel"
          size="sm"
          variant="destructive"
          onClick={() => setCancelDialog({ open: true, bookingId: booking.id, reason: '' })}
          data-testid={`button-cancel-${booking.id}`}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Cancel
        </Button>
      );
    }

    return actions;
  };

  const StatusTimeline = ({ booking }: { booking: Booking }) => {
    const statuses = ['pending', 'confirmed', 'technician_assigned', 'in_progress', 'completed'];
    const currentIndex = statuses.indexOf(booking.status);
    
    if (booking.status === 'cancelled') {
      return (
        <div className="bg-red-50 p-4 rounded-lg">
          <Badge className="badge-cancelled">Cancelled</Badge>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between">
        {statuses.map((status, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={status} className="flex items-center">
              <div className={`flex flex-col items-center ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCurrent ? 'bg-primary text-white' : isActive ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  {isActive ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>
                <p className="text-xs mt-1 text-center max-w-[80px]">
                  {status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </p>
              </div>
              {index < statuses.length - 1 && (
                <ArrowRight className={`mx-2 h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Bookings Management</h1>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" data-testid="select-item-all">All Bookings</SelectItem>
            <SelectItem value="pending" data-testid="select-item-pending">Pending</SelectItem>
            <SelectItem value="confirmed" data-testid="select-item-confirmed">Confirmed</SelectItem>
            <SelectItem value="technician_assigned" data-testid="select-item-assigned">Assigned</SelectItem>
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
                <TableHead className="table-header-primary">ID</TableHead>
                <TableHead className="table-header-primary">Customer</TableHead>
                <TableHead className="table-header-primary">Service</TableHead>
                <TableHead className="table-header-primary">Technician</TableHead>
                <TableHead className="table-header-primary">Date & Time</TableHead>
                <TableHead className="table-header-primary numeric-cell">Amount</TableHead>
                <TableHead className="table-header-primary">Status</TableHead>
                <TableHead className="table-header-primary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="text-muted-foreground">
                      No bookings found. {statusFilter !== 'all' && 'Try changing the filter.'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking, index) => (
                  <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`} className={index % 2 === 1 ? 'bg-muted/30' : ''}>
                    <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{booking.user?.name || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{booking.user?.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{booking.service?.name?.en || 'N/A'}</TableCell>
                    <TableCell>
                      {booking.technician ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{booking.technician.name}</span>
                          {booking.technician.phone && (
                            <span className="text-xs text-muted-foreground">{booking.technician.phone}</span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {booking.scheduled_date && format(new Date(booking.scheduled_date), 'MMM dd, yyyy')}
                      <br />
                      <span className="text-xs text-muted-foreground">{booking.scheduled_time}</span>
                    </TableCell>
                    <TableCell className="numeric-cell font-semibold">{booking.total_amount} SAR</TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setDetailsOpen(true);
                          }}
                          data-testid={`button-view-${booking.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {getActionButtons(booking)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-booking-details">
          <DialogHeader>
            <DialogTitle>Booking Details #{selectedBooking?.id.slice(0, 8)}</DialogTitle>
            <DialogDescription>
              Complete information about this booking
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="technician">Technician</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Status Timeline</h3>
                  {selectedBooking && <StatusTimeline booking={selectedBooking} />}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium">
                          {selectedBooking?.scheduled_date && format(new Date(selectedBooking.scheduled_date), 'PPP')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Scheduled Time</p>
                        <p className="font-medium">{selectedBooking?.scheduled_time}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <p className="font-medium">{selectedBooking?.total_amount} SAR</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="font-medium text-sm">
                          {selectedBooking?.address ? 
                            `${selectedBooking.address.street}, ${selectedBooking.address.city}` 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedBooking?.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm">{selectedBooking.notes}</p>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="customer" className="space-y-4">
              {customerData?.data ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{customerData.data.name}</h3>
                      <p className="text-sm text-muted-foreground">Customer Profile</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{customerData.data.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{customerData.data.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Wallet Balance</p>
                        <p className="font-medium">{customerData.data.wallet_balance || 0} SAR</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Total Bookings</p>
                        <p className="font-medium">{customerData.data.total_bookings || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Loading customer data...</p>
              )}
            </TabsContent>

            <TabsContent value="technician" className="space-y-4">
              {selectedBooking?.technician ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedBooking.technician.name}</h3>
                      <p className="text-sm text-muted-foreground">Assigned Technician</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {selectedBooking.technician.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="font-medium">{selectedBooking.technician.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setAssignDialog({ 
                      open: true, 
                      bookingId: selectedBooking.id, 
                      technicianId: selectedBooking.technician?.id || '' 
                    })}
                  >
                    Reassign Technician
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No technician assigned yet</p>
                  <Button
                    onClick={() => setAssignDialog({ 
                      open: true, 
                      bookingId: selectedBooking?.id || '', 
                      technicianId: '' 
                    })}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Assign Technician
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Audit Logs
                </h3>
                {auditLogsData?.data && auditLogsData.data.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {auditLogsData.data.map((log) => (
                      <div key={log.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-medium text-sm">{log.action.replace(/_/g, ' ').toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.createdAt), 'MMM dd, HH:mm')}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          By: {log.userName || 'System'}
                        </p>
                        {log.newValues && (
                          <p className="text-xs mt-1">
                            {JSON.stringify(log.newValues, null, 2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No audit logs available</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Assign Technician Dialog */}
      <Dialog open={assignDialog.open} onOpenChange={(open) => setAssignDialog({ ...assignDialog, open })}>
        <DialogContent data-testid="dialog-assign-technician">
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
            <DialogDescription>
              Select a technician to assign to this booking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="technician">Technician</Label>
              <Select
                value={assignDialog.technicianId}
                onValueChange={(value) => setAssignDialog({ ...assignDialog, technicianId: value })}
              >
                <SelectTrigger data-testid="select-technician">
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id} data-testid={`select-item-technician-${tech.id}`}>
                      {tech.name} - {tech.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialog({ open: false, bookingId: null, technicianId: '' })}
              data-testid="button-assign-dialog-close"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (assignDialog.bookingId && assignDialog.technicianId) {
                  assignTechnicianMutation.mutate({
                    bookingId: assignDialog.bookingId,
                    technicianId: assignDialog.technicianId,
                  });
                }
              }}
              disabled={!assignDialog.technicianId || assignTechnicianMutation.isPending}
              data-testid="button-assign-confirm"
            >
              {assignTechnicianMutation.isPending ? 'Assigning...' : 'Assign Technician'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}>
        <DialogContent data-testid="dialog-cancel-booking">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this booking. This action will be logged in the audit trail.
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
              onClick={() => {
                if (cancelDialog.bookingId && cancelDialog.reason.trim()) {
                  cancelBookingMutation.mutate({
                    id: cancelDialog.bookingId,
                    reason: cancelDialog.reason,
                  });
                }
              }}
              disabled={!cancelDialog.reason.trim() || cancelBookingMutation.isPending}
              data-testid="button-cancel-confirm"
            >
              {cancelBookingMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
