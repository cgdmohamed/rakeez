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
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, Wallet, Star, Calendar, DollarSign, XCircle, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { SarSymbol } from '@/components/sar-symbol';

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [topupDialog, setTopupDialog] = useState({ open: false, amount: '', reason: '' });

  interface Booking {
    id: string;
    serviceName: { en: string; ar: string };
    scheduledDate: Date;
    totalAmount: number;
    status: string;
  }

  interface Payment {
    id: string;
    paymentMethod: string;
    amount: number;
    status: string;
    createdAt: Date;
  }

  interface SupportTicket {
    id: string;
    subject: string;
    priority: string;
    status: string;
    createdAt: Date;
  }

  interface Review {
    serviceName: { en: string; ar: string };
    technicianName: string;
    rating: number;
    comment: string;
    createdAt: Date;
  }

  interface CustomerOverviewResponse {
    success: boolean;
    message: string;
    data: {
      user: {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        language: string;
        isVerified: boolean;
        createdAt: Date;
      };
      stats: {
        totalBookings: number;
        completedBookings: number;
        cancelledBookings: number;
        totalSpent: number;
        averageRating: number;
        totalReviews: number;
        walletBalance: number;
        walletEarned: number;
        walletSpent: number;
      };
      recentBookings: Booking[];
      recentPayments: Payment[];
      recentSupportTickets: SupportTicket[];
      recentReviews: Review[];
    };
  }

  const { data: overviewData, isLoading, error, isError } = useQuery<CustomerOverviewResponse>({
    queryKey: [`/api/v2/admin/customers/${id}/overview`],
    enabled: !!id,
  });

  const topupWalletMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      return apiRequest('POST', `/api/v2/admin/customers/${id}/wallet/topup`, {
        amount,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/customers/${id}/overview`] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/wallets'] });
      setTopupDialog({ open: false, amount: '', reason: '' });
      toast({
        title: 'Wallet credited',
        description: 'Customer wallet has been topped up successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to top up wallet',
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

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase();
    const classMap: Record<string, string> = {
      pending: 'badge-pending',
      confirmed: 'badge-confirmed',
      in_progress: 'badge-in-progress',
      completed: 'badge-completed',
      cancelled: 'badge-cancelled',
      paid: 'badge-paid',
      failed: 'badge-failed',
      refunded: 'badge-refunded',
      open: 'badge-open',
      closed: 'badge-closed',
      high: 'badge-failed',
      medium: 'badge-pending',
      low: 'badge-confirmed',
    };
    
    return <Badge className={classMap[statusLower] || 'badge-confirmed'}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div>
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !overviewData?.data) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-primary mb-2">Customer Not Found</h2>
        <p className="text-muted-foreground mb-6" data-testid="text-not-found">
          {error instanceof Error ? error.message : 'The customer you are looking for does not exist or has been removed.'}
        </p>
        <Link href="/admin/customers">
          <Button variant="default" data-testid="button-back-to-customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const { user, stats, recentBookings, recentPayments, recentSupportTickets, recentReviews } = overviewData.data;

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
            <h1 className="text-3xl font-bold text-primary" data-testid="text-customer-name">{user.name}</h1>
            <p className="text-foreground/70">{user.email}</p>
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
        <Card data-testid="card-total-bookings" className="card-accent-blue shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-bookings">{stats.totalBookings || 0}</div>
            <p className="text-xs text-foreground/80">
              {stats.completedBookings || 0} completed, {stats.cancelledBookings || 0} cancelled
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-spent" className="card-accent-cyan shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-spent">
              {(Number(stats.totalSpent) || 0).toLocaleString()} <span className="text-lg">SAR</span>
            </div>
            <p className="text-xs text-foreground/80">Lifetime spending</p>
          </CardContent>
        </Card>

        <Card data-testid="card-wallet-balance" className="card-accent-green shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-accent">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1" data-testid="stat-wallet-balance">
              {(Number(stats.walletBalance) || 0).toFixed(2)}
              <SarSymbol size={20} />
            </div>
            <p className="text-xs text-foreground/80">
              +{(Number(stats.walletEarned) || 0).toFixed(0)} earned, 
              -{(Number(stats.walletSpent) || 0).toFixed(0)} spent
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-rating" className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1" data-testid="stat-avg-rating">
              {(Number(stats.averageRating) || 0).toFixed(1)}
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-foreground/80">{stats.totalReviews || 0} reviews</p>
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
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Customer Information</CardTitle>
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
                      <Badge className="badge-completed">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge className="badge-pending">Not Verified</Badge>
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
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {recentBookings && recentBookings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header-primary">Order ID</TableHead>
                      <TableHead className="table-header-primary">Service</TableHead>
                      <TableHead className="table-header-primary">Date</TableHead>
                      <TableHead className="table-header-primary text-right">Amount</TableHead>
                      <TableHead className="table-header-primary">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBookings.map((booking: any, idx: number) => (
                      <TableRow key={booking.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} data-testid={`row-order-${booking.id}`}>
                        <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}</TableCell>
                        <TableCell>{booking.serviceName?.en || 'N/A'}</TableCell>
                        <TableCell>{format(new Date(booking.scheduledDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="numeric-cell">
                          {(Number(booking.totalAmount) || 0).toLocaleString()} SAR
                        </TableCell>
                        <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No orders found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPayments && recentPayments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header-primary">Payment ID</TableHead>
                      <TableHead className="table-header-primary">Method</TableHead>
                      <TableHead className="table-header-primary text-right">Amount</TableHead>
                      <TableHead className="table-header-primary">Date</TableHead>
                      <TableHead className="table-header-primary">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((payment: any, idx: number) => (
                      <TableRow key={payment.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}</TableCell>
                        <TableCell className="capitalize">{payment.paymentMethod}</TableCell>
                        <TableCell className="numeric-cell">
                          {(Number(payment.amount) || 0).toLocaleString()} SAR
                        </TableCell>
                        <TableCell>{format(new Date(payment.createdAt), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No payments found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Recent Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSupportTickets && recentSupportTickets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header-primary">Ticket ID</TableHead>
                      <TableHead className="table-header-primary">Subject</TableHead>
                      <TableHead className="table-header-primary">Priority</TableHead>
                      <TableHead className="table-header-primary">Status</TableHead>
                      <TableHead className="table-header-primary">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentSupportTickets.map((ticket: any, idx: number) => (
                      <TableRow key={ticket.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} data-testid={`row-ticket-${ticket.id}`}>
                        <TableCell className="font-mono text-xs">{ticket.id.slice(0, 8)}</TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>{getStatusBadge(ticket.priority)}</TableCell>
                        <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                        <TableCell>{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No support tickets found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {recentReviews && recentReviews.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header-primary">Service</TableHead>
                      <TableHead className="table-header-primary">Technician</TableHead>
                      <TableHead className="table-header-primary">Rating</TableHead>
                      <TableHead className="table-header-primary">Comment</TableHead>
                      <TableHead className="table-header-primary">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReviews.map((review: any, index: number) => (
                      <TableRow key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'} data-testid={`row-review-${index}`}>
                        <TableCell>{review.serviceName?.en || 'N/A'}</TableCell>
                        <TableCell>{review.technicianName || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{review.rating}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{review.comment || 'No comment'}</TableCell>
                        <TableCell>{format(new Date(review.createdAt), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No reviews found</p>
                </div>
              )}
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
