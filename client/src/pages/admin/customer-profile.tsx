import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, Wallet, Star } from 'lucide-react';
import { Link } from 'wouter';
import { SarSymbol } from '@/components/sar-symbol';

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [topupDialog, setTopupDialog] = useState({ open: false, amount: '', reason: '' });

  const { data: overviewData, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/customers', id, 'overview'],
    queryFn: async () => {
      const response = await fetch(`/api/v2/admin/customers/${id}/overview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch customer overview');
      return response.json();
    },
    enabled: !!id,
  });

  const topupWalletMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      const response = await apiRequest('POST', `/api/v2/admin/customers/${id}/wallet/topup`, {
        amount,
        reason,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/customers', id, 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/wallets'] });
      setTopupDialog({ open: false, amount: '', reason: '' });
      toast({
        title: 'Wallet credited',
        description: 'Customer wallet has been topped up successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to top up wallet',
        variant: 'destructive',
      });
    },
  });

  const handleTopupSubmit = () => {
    const amount = parseFloat(topupDialog.amount);
    if (amount > 0 && topupDialog.reason.trim()) {
      topupWalletMutation.mutate({
        amount,
        reason: topupDialog.reason,
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading customer profile...</div>;
  }

  if (!overviewData?.data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Customer not found</p>
        <Link href="/admin/customers">
          <Button variant="link" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const { user, stats, recentBookings, recentPayments, recentSupportTickets, recentReviews } = overviewData.data;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      confirmed: 'default',
      in_progress: 'default',
      completed: 'outline',
      cancelled: 'destructive',
      paid: 'outline',
      failed: 'destructive',
      refunded: 'secondary',
      open: 'secondary',
      closed: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/customers">
            <Button variant="outline" size="sm" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-customer-name">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          onClick={() => setTopupDialog({ open: true, amount: '', reason: '' })}
          data-testid="button-topup-wallet"
        >
          <Wallet className="mr-2 h-4 w-4" />
          Top-up Wallet
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-bookings">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedBookings} completed, {stats.cancelledBookings} cancelled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1" data-testid="stat-total-spent">
              {(Number(stats.totalSpent) || 0).toFixed(2)}
              <SarSymbol size={20} />
            </div>
            <p className="text-xs text-muted-foreground">Lifetime spending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1" data-testid="stat-wallet-balance">
              {(Number(stats.walletBalance) || 0).toFixed(2)}
              <SarSymbol size={20} />
            </div>
            <p className="text-xs text-muted-foreground">
              Earned: {(Number(stats.walletEarned) || 0).toFixed(2)}, 
              Spent: {(Number(stats.walletSpent) || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1" data-testid="stat-avg-rating">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              {(Number(stats.averageRating) || 0).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">{stats.totalReviews} reviews</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
          <TabsTrigger value="tickets" data-testid="tab-tickets">Support Tickets</TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Customer ID</dt>
                  <dd className="mt-1 font-mono text-sm" data-testid="text-customer-id">{user.id.slice(0, 8)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                  <dd className="mt-1 text-sm" data-testid="text-customer-phone">{user.phone || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Language</dt>
                  <dd className="mt-1 text-sm" data-testid="text-customer-language">{user.language === 'ar' ? 'Arabic' : 'English'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Verified</dt>
                  <dd className="mt-1">
                    {user.isVerified ? (
                      <Badge variant="outline">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Not Verified</Badge>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Member Since</dt>
                  <dd className="mt-1 text-sm" data-testid="text-customer-joined">
                    {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBookings && recentBookings.length > 0 ? (
                    recentBookings.map((booking: any) => (
                      <TableRow key={booking.id} data-testid={`row-order-${booking.id}`}>
                        <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}</TableCell>
                        <TableCell>{booking.serviceName?.en || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(booking.scheduledDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {(Number(booking.totalAmount) || 0).toFixed(2)}
                          <SarSymbol size={14} />
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="text-muted-foreground">No orders found</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments && recentPayments.length > 0 ? (
                    recentPayments.map((payment: any) => (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}</TableCell>
                        <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          {(Number(payment.amount) || 0).toFixed(2)}
                          <SarSymbol size={14} />
                        </TableCell>
                        <TableCell>{format(new Date(payment.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="text-muted-foreground">No payments found</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSupportTickets && recentSupportTickets.length > 0 ? (
                    recentSupportTickets.map((ticket: any) => (
                      <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                        <TableCell className="font-mono text-xs">{ticket.id.slice(0, 8)}</TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>{getStatusBadge(ticket.priority)}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="text-muted-foreground">No support tickets found</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReviews && recentReviews.length > 0 ? (
                    recentReviews.map((review: any, index: number) => (
                      <TableRow key={index} data-testid={`row-review-${index}`}>
                        <TableCell>{review.serviceName?.en || 'N/A'}</TableCell>
                        <TableCell>{review.technicianName || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {review.rating}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{review.comment || 'No comment'}</TableCell>
                        <TableCell>{format(new Date(review.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="text-muted-foreground">No reviews found</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Top-up Wallet Dialog */}
      <Dialog open={topupDialog.open} onOpenChange={(open) => setTopupDialog({ ...topupDialog, open })}>
        <DialogContent data-testid="dialog-topup-wallet">
          <DialogHeader>
            <DialogTitle>Top-up Customer Wallet</DialogTitle>
            <DialogDescription>
              Add credits to the customer's wallet. This will be recorded in the wallet transaction history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="topup-amount">Amount (SAR)</Label>
              <Input
                id="topup-amount"
                type="number"
                min="0"
                step="0.01"
                value={topupDialog.amount}
                onChange={(e) => setTopupDialog({ ...topupDialog, amount: e.target.value })}
                placeholder="0.00"
                data-testid="input-topup-amount"
              />
            </div>
            <div>
              <Label htmlFor="topup-reason">Reason</Label>
              <Textarea
                id="topup-reason"
                value={topupDialog.reason}
                onChange={(e) => setTopupDialog({ ...topupDialog, reason: e.target.value })}
                placeholder="Enter reason for top-up..."
                rows={3}
                data-testid="input-topup-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTopupDialog({ open: false, amount: '', reason: '' })}
              data-testid="button-topup-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopupSubmit}
              disabled={
                !topupDialog.amount ||
                parseFloat(topupDialog.amount) <= 0 ||
                !topupDialog.reason.trim() ||
                topupWalletMutation.isPending
              }
              data-testid="button-topup-confirm"
            >
              {topupWalletMutation.isPending ? 'Processing...' : 'Confirm Top-up'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
