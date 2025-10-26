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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowLeft, Wallet, Star, Calendar, DollarSign, XCircle, CheckCircle, Award, Users, Copy, MapPin, Home, Building2, Package, Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { Link } from 'wouter';
import { SarSymbol } from '@/components/sar-symbol';

const addressFormSchema = z.object({
  addressName: z.string().min(1, 'Address name is required'),
  addressType: z.enum(['home', 'office', 'other']),
  streetName: z.string().min(1, 'Street name is required'),
  houseNo: z.string().min(1, 'House number is required'),
  district: z.string().min(1, 'District is required'),
  directions: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  isDefault: z.boolean(),
});

type AddressFormData = z.infer<typeof addressFormSchema>;

export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [topupDialog, setTopupDialog] = useState({ open: false, amount: '', reason: '' });
  const [addressDialog, setAddressDialog] = useState<{ 
    open: boolean; 
    mode: 'create' | 'edit'; 
    address: Address | null 
  }>({ open: false, mode: 'create', address: null });

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

  interface ReferralData {
    referral_code: string;
    total_referrals: number;
    completed_referrals: number;
    pending_referrals: number;
    total_rewards_earned: number;
    referrals: Array<{
      id: string;
      invitee_name: string;
      invitee_email: string;
      status: string;
      reward: string;
      campaign_name: { en: string; ar: string };
      created_at: Date;
      completed_at: Date | null;
    }>;
    referrals_used: Array<{
      id: string;
      inviter_name: string;
      discount: string;
      campaign_name: { en: string; ar: string };
      created_at: Date;
    }>;
  }

  interface Address {
    id: string;
    userId: string;
    addressName: string;
    addressType: 'home' | 'office' | 'other';
    streetName: string;
    houseNo: string;
    district: string;
    directions: string | null;
    latitude: number | null;
    longitude: number | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  interface Subscription {
    id: string;
    userId: string;
    packageId: string;
    startDate: Date;
    endDate: Date;
    status: string;
    totalAmount: number;
    autoRenew: boolean;
    usageCount: number;
    benefits: any;
    package: {
      id: string;
      name: { en: string; ar: string };
      tier: string;
      price: number;
    } | null;
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

  const { data: referralData } = useQuery<{ success: boolean; data: ReferralData }>({
    queryKey: [`/api/v2/admin/users/${id}/referrals`],
    enabled: !!id,
  });

  const { data: addressesData } = useQuery<{ success: boolean; data: Address[] }>({
    queryKey: [`/api/v2/admin/users/${id}/addresses`],
    enabled: !!id,
  });

  const { data: subscriptionsData } = useQuery<{ success: boolean; data: Subscription[] }>({
    queryKey: [`/api/v2/users/${id}/subscriptions`],
    enabled: !!id,
  });

  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      addressName: '',
      addressType: 'home',
      streetName: '',
      houseNo: '',
      district: '',
      directions: '',
      latitude: '',
      longitude: '',
      isDefault: false,
    },
  });

  const topupWalletMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: number; reason: string }) => {
      return apiRequest('POST', `/api/v2/admin/customers/${id}/wallet/topup`, {
        amount,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [`/api/v2/admin/customers/${id}/overview`] });
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/wallets'] });
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

  const createAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const payload = {
        ...data,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      };
      return apiRequest('POST', `/api/v2/admin/users/${id}/addresses`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/users/${id}/addresses`] });
      setAddressDialog({ open: false, mode: 'create', address: null });
      addressForm.reset();
      toast({
        title: 'Address created',
        description: 'Address has been added successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create address',
        variant: 'destructive',
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ addressId, data }: { addressId: string; data: AddressFormData }) => {
      const payload = {
        ...data,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      };
      return apiRequest('PUT', `/api/v2/admin/addresses/${addressId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/users/${id}/addresses`] });
      setAddressDialog({ open: false, mode: 'create', address: null });
      addressForm.reset();
      toast({
        title: 'Address updated',
        description: 'Address has been updated successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update address',
        variant: 'destructive',
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (addressId: string) => {
      return apiRequest('DELETE', `/api/v2/admin/addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/users/${id}/addresses`] });
      toast({
        title: 'Address deleted',
        description: 'Address has been deleted successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete address',
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

  const handleOpenAddressDialog = (mode: 'create' | 'edit', address: Address | null = null) => {
    if (mode === 'edit' && address) {
      addressForm.reset({
        addressName: address.addressName,
        addressType: address.addressType,
        streetName: address.streetName,
        houseNo: address.houseNo,
        district: address.district,
        directions: address.directions || '',
        latitude: address.latitude?.toString() || '',
        longitude: address.longitude?.toString() || '',
        isDefault: address.isDefault,
      });
    } else {
      addressForm.reset();
    }
    setAddressDialog({ open: true, mode, address });
  };

  const handleAddressSubmit = (data: AddressFormData) => {
    if (addressDialog.mode === 'create') {
      createAddressMutation.mutate(data);
    } else if (addressDialog.mode === 'edit' && addressDialog.address) {
      updateAddressMutation.mutate({ addressId: addressDialog.address.id, data });
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      deleteAddressMutation.mutate(addressId);
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
          <TabsTrigger value="referrals" data-testid="tab-referrals">Referrals</TabsTrigger>
          <TabsTrigger value="subscriptions" data-testid="tab-subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="addresses" data-testid="tab-addresses">Addresses</TabsTrigger>
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

        <TabsContent value="referrals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Award className="w-4 h-4 mr-2 text-blue-500" />
                  Referral Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="text-2xl font-bold font-mono" data-testid="text-referral-code">
                    {referralData?.data.referral_code || 'N/A'}
                  </code>
                  {referralData?.data.referral_code && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(referralData.data.referral_code);
                        toast({ title: 'Copied!', description: 'Referral code copied to clipboard' });
                      }}
                      data-testid="button-copy-code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="w-4 h-4 mr-2 text-green-500" />
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-referrals">
                  {referralData?.data.total_referrals || 0}
                </div>
                <p className="text-xs text-foreground/80">
                  {referralData?.data.completed_referrals || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-orange-500" />
                  Rewards Earned
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-rewards-earned">
                  {(referralData?.data.total_rewards_earned || 0).toFixed(0)} SAR
                </div>
                <p className="text-xs text-foreground/80">
                  From referrals
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary">Referrals Made</CardTitle>
            </CardHeader>
            <CardContent>
              {referralData?.data.referrals && referralData.data.referrals.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header-primary">Invitee</TableHead>
                      <TableHead className="table-header-primary">Email</TableHead>
                      <TableHead className="table-header-primary">Campaign</TableHead>
                      <TableHead className="table-header-primary">Status</TableHead>
                      <TableHead className="table-header-primary text-right">Reward</TableHead>
                      <TableHead className="table-header-primary">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralData.data.referrals.map((referral: any, idx: number) => (
                      <TableRow key={referral.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} data-testid={`row-referral-${referral.id}`}>
                        <TableCell>{referral.invitee_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{referral.invitee_email}</TableCell>
                        <TableCell>{referral.campaign_name?.en || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(referral.status)}</TableCell>
                        <TableCell className="numeric-cell">
                          {Number(referral.reward).toFixed(0)} SAR
                        </TableCell>
                        <TableCell>{format(new Date(referral.created_at), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No referrals made yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {referralData?.data.referrals_used && referralData.data.referrals_used.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-primary">Referral Codes Used</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header-primary">Inviter</TableHead>
                      <TableHead className="table-header-primary">Campaign</TableHead>
                      <TableHead className="table-header-primary text-right">Discount</TableHead>
                      <TableHead className="table-header-primary">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referralData.data.referrals_used.map((referral: any, idx: number) => (
                      <TableRow key={referral.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} data-testid={`row-referral-used-${referral.id}`}>
                        <TableCell>{referral.inviter_name}</TableCell>
                        <TableCell>{referral.campaign_name?.en || 'N/A'}</TableCell>
                        <TableCell className="numeric-cell">
                          {Number(referral.discount).toFixed(0)} SAR
                        </TableCell>
                        <TableCell>{format(new Date(referral.created_at), 'MMM dd, yyyy')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptionsData?.data && subscriptionsData.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="table-header-primary">Package</TableHead>
                      <TableHead className="table-header-primary">Tier</TableHead>
                      <TableHead className="table-header-primary">Start Date</TableHead>
                      <TableHead className="table-header-primary">End Date</TableHead>
                      <TableHead className="table-header-primary text-right">Amount</TableHead>
                      <TableHead className="table-header-primary">Status</TableHead>
                      <TableHead className="table-header-primary">Usage</TableHead>
                      <TableHead className="table-header-primary">Auto-Renew</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptionsData.data.map((subscription: Subscription, idx: number) => (
                      <TableRow key={subscription.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} data-testid={`row-subscription-${subscription.id}`}>
                        <TableCell className="font-medium">
                          {subscription.package?.name?.en || 'Unknown Package'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {subscription.package?.tier || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(subscription.startDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>{format(new Date(subscription.endDate), 'MMM dd, yyyy')}</TableCell>
                        <TableCell className="numeric-cell">
                          {(Number(subscription.totalAmount) || 0).toLocaleString()} SAR
                        </TableCell>
                        <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {subscription.usageCount || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {subscription.autoRenew ? (
                            <Badge className="badge-completed">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No active subscriptions found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-primary flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Saved Addresses
                </CardTitle>
                <Button
                  onClick={() => handleOpenAddressDialog('create')}
                  size="sm"
                  data-testid="button-add-address"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {addressesData?.data && addressesData.data.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {addressesData.data.map((address: Address) => {
                    const addressTypeIcon = address.addressType === 'home' ? Home : address.addressType === 'office' ? Building2 : Package;
                    const AddressIcon = addressTypeIcon;
                    
                    return (
                      <Card key={address.id} className="shadow-sm border" data-testid={`card-address-${address.id}`}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <AddressIcon className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg" data-testid={`text-address-name-${address.id}`}>
                                {address.addressName}
                              </h3>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className="capitalize" data-testid={`badge-address-type-${address.id}`}>
                                {address.addressType}
                              </Badge>
                              {address.isDefault && (
                                <Badge className="badge-completed" data-testid={`badge-default-${address.id}`}>
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex gap-2">
                              <span className="font-medium text-foreground">House #:</span>
                              <span data-testid={`text-house-no-${address.id}`}>{address.houseNo}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-medium text-foreground">Street:</span>
                              <span data-testid={`text-street-${address.id}`}>{address.streetName}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-medium text-foreground">District:</span>
                              <span data-testid={`text-district-${address.id}`}>{address.district}</span>
                            </div>
                            {address.directions && (
                              <div className="flex gap-2">
                                <span className="font-medium text-foreground">Directions:</span>
                                <span className="italic" data-testid={`text-directions-${address.id}`}>{address.directions}</span>
                              </div>
                            )}
                            {address.latitude && address.longitude && (
                              <div className="flex gap-2 pt-2 border-t">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-mono" data-testid={`text-coordinates-${address.id}`}>
                                  {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                                </span>
                              </div>
                            )}
                            <div className="text-xs pt-2 border-t">
                              <span className="text-muted-foreground">
                                Added {format(new Date(address.createdAt), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 mt-4 pt-4 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAddressDialog('edit', address)}
                              className="flex-1"
                              data-testid={`button-edit-address-${address.id}`}
                            >
                              <Pencil className="h-3 w-3 mr-2" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteAddress(address.id)}
                              className="flex-1 text-destructive hover:text-destructive"
                              data-testid={`button-delete-address-${address.id}`}
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No saved addresses found</p>
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

      {/* Address Dialog */}
      <Dialog open={addressDialog.open} onOpenChange={(open) => setAddressDialog({ ...addressDialog, open })}>
        <DialogContent className="max-w-2xl" data-testid="dialog-address">
          <DialogHeader>
            <DialogTitle>
              {addressDialog.mode === 'create' ? 'Add New Address' : 'Edit Address'}
            </DialogTitle>
            <DialogDescription>
              {addressDialog.mode === 'create' 
                ? 'Add a new address for this customer.' 
                : 'Update the address details.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="addressName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Home, Office" {...field} data-testid="input-address-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addressForm.control}
                  name="addressType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-address-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="home">Home</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="houseNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>House/Building Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 123" {...field} data-testid="input-house-no" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addressForm.control}
                  name="streetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., King Fahd Road" {...field} data-testid="input-street-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addressForm.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>District/Area</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Al Malqa" {...field} data-testid="input-district" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={addressForm.control}
                name="directions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Directions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional directions to help find the location..." 
                        {...field} 
                        rows={2}
                        data-testid="input-directions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g., 24.7136" 
                          {...field} 
                          data-testid="input-latitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addressForm.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="e.g., 46.6753" 
                          {...field} 
                          data-testid="input-longitude"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={addressForm.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Default Address</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Set this as the default address for the customer
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-default"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddressDialog({ open: false, mode: 'create', address: null })}
                  data-testid="button-address-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                  data-testid="button-address-submit"
                >
                  {createAddressMutation.isPending || updateAddressMutation.isPending 
                    ? 'Saving...' 
                    : addressDialog.mode === 'create' ? 'Add Address' : 'Update Address'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
