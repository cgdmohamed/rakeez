import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Search, ChevronLeft, ChevronRight, Calendar, User, Package, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface Subscription {
  id: string;
  userId: string;
  packageId: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  totalAmount: string;
  benefits: any;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  package: {
    id: string;
    name: any;
    tier: string;
    price: string;
  } | null;
}

interface SubscriptionsResponse {
  success: boolean;
  message: string;
  data: Subscription[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface ServicePackage {
  id: string;
  name: { en: string; ar: string };
  tier: string;
  price: string;
  inclusions: { en: string[]; ar: string[] };
}

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [formData, setFormData] = useState({
    userId: '',
    packageId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    autoRenew: false,
  });

  const { data: subscriptionsData, isLoading } = useQuery<SubscriptionsResponse>({
    queryKey: ['/api/v2/admin/subscriptions'],
  });

  const { data: customersData } = useQuery<{ success: boolean; data: Customer[] }>({
    queryKey: ['/api/v2/admin/users?role=customer'],
    queryFn: async () => {
      const response = await fetch('/api/v2/admin/users?role=customer', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      return response.json();
    },
  });

  const { data: packagesData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/v2/admin/service-packages'],
    queryFn: async () => {
      const response = await fetch('/api/v2/admin/service-packages', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      return response.json();
    },
  });

  const subscriptions = subscriptionsData?.data || [];
  const customers = customersData?.data || [];
  const packages = packagesData?.data || [];

  const filteredCustomers = customers.filter((customer) => {
    if (!customerSearch) return true;
    const query = customerSearch.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    );
  });

  // Apply filters
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        subscription.user?.name?.toLowerCase().includes(query) ||
        subscription.user?.phone?.includes(query) ||
        subscription.user?.email?.toLowerCase().includes(query) ||
        subscription.id.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && subscription.status !== statusFilter) {
      return false;
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Reset currentPage if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const createMutation = useMutation({
    mutationFn: async (data: {
      userId: string;
      packageId: string;
      startDate: string;
      endDate: string;
      autoRenew: boolean;
    }) => {
      return apiRequest('POST', '/api/v2/admin/subscriptions', data);
    },
    onSuccess: (_, variables) => {
      // Invalidate all subscription-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/subscriptions'] });
      // Invalidate customer's subscription tab
      queryClient.invalidateQueries({ queryKey: [`/api/v2/users/${variables.userId}/subscriptions`] });
      // Invalidate analytics dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/analytics'] });
      // Invalidate customer overview
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/customers/${variables.userId}/overview`] });
      toast({
        title: 'Success',
        description: 'Subscription created successfully',
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create subscription',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest('PUT', `/api/v2/admin/subscriptions/${id}`, { status });
    },
    onSuccess: () => {
      // Invalidate all subscription-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/subscriptions'] });
      // Invalidate all user subscription queries (we don't know the userId here, so invalidate all)
      queryClient.invalidateQueries({ queryKey: ['/api/v2/users'], refetchType: 'active' });
      // Invalidate analytics dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/analytics'] });
      // Invalidate all customer overviews
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/customers'], refetchType: 'active' });
      toast({
        title: 'Success',
        description: 'Subscription status updated successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update subscription',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      userId: '',
      packageId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      autoRenew: false,
    });
    setCustomerSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.packageId) {
      toast({
        title: 'Validation Error',
        description: 'Please select both a customer and a package',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600" data-testid={`status-${status}`}><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" data-testid={`status-${status}`}><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'expired':
        return <Badge variant="destructive" data-testid={`status-${status}`}><Clock className="w-3 h-3 mr-1" />Expired</Badge>;
      default:
        return <Badge variant="outline" data-testid={`status-${status}`}>{status}</Badge>;
    }
  };

  const getPackageName = (pkg: any) => {
    if (!pkg || !pkg.name) return 'N/A';
    return pkg.name.en || pkg.name.ar || 'Unknown Package';
  };

  // Calculate statistics
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    cancelled: subscriptions.filter(s => s.status === 'cancelled').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Subscriptions Management</h1>
          <p className="text-muted-foreground">View and manage customer subscriptions</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-subscription">
          <Plus className="mr-2 h-4 w-4" />
          Create Subscription
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-active">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600" data-testid="stat-cancelled">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="stat-expired">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by customer name, phone, email, or ID..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
              <SelectTrigger className="w-full md:w-32" data-testid="select-items-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="pt-6">
          {paginatedSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No subscriptions found</p>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Subscriptions will appear here once created'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Auto Renew</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id} data-testid={`row-subscription-${subscription.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <Link href={`/admin/customers/${subscription.userId}`}>
                              <a className="font-medium hover:underline" data-testid={`link-customer-${subscription.userId}`}>
                                {subscription.user?.name || 'Unknown'}
                              </a>
                            </Link>
                            <p className="text-sm text-muted-foreground">{subscription.user?.phone || 'N/A'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium" data-testid={`text-package-${subscription.id}`}>
                            {getPackageName(subscription.package)}
                          </p>
                          <p className="text-sm text-muted-foreground capitalize">{subscription.package?.tier || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(subscription.startDate), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(subscription.endDate), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {subscription.autoRenew ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">SAR {parseFloat(subscription.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{subscription.usageCount} times</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {subscription.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: subscription.id, status: 'cancelled' })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-cancel-${subscription.id}`}
                            >
                              Cancel
                            </Button>
                          )}
                          {subscription.status === 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: subscription.id, status: 'active' })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-reactivate-${subscription.id}`}
                            >
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredSubscriptions.length)} of {filteredSubscriptions.length} subscriptions
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Subscription Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subscription</DialogTitle>
            <DialogDescription>
              Manually assign a subscription package to a customer
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    data-testid="input-customer-search"
                  />
                  <Select 
                    value={formData.userId} 
                    onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  >
                    <SelectTrigger data-testid="select-customer">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCustomers.slice(0, 50).map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone || customer.email}
                        </SelectItem>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <SelectItem value="none" disabled>No customers found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="package">Subscription Package *</Label>
                <Select 
                  value={formData.packageId} 
                  onValueChange={(value) => setFormData({ ...formData, packageId: value })}
                >
                  <SelectTrigger data-testid="select-package">
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name?.en || 'Unknown'} ({pkg.tier}) - SAR {parseFloat(pkg.price).toFixed(2)}
                      </SelectItem>
                    ))}
                    {packages.length === 0 && (
                      <SelectItem value="none" disabled>No packages available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    data-testid="input-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    data-testid="input-end-date"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="autoRenew"
                  checked={formData.autoRenew}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoRenew: checked })}
                  data-testid="switch-auto-renew"
                />
                <Label htmlFor="autoRenew" className="cursor-pointer">
                  Auto-renew subscription
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-subscription"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Subscription'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
