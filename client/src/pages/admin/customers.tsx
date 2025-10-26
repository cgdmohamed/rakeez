import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  language: string;
  isVerified: boolean;
  createdAt: Date;
}

interface CustomersResponse {
  success: boolean;
  message: string;
  data: Customer[];
}

export default function AdminCustomers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    language: 'en',
    isVerified: true,
  });

  const { data: customersData, isLoading } = useQuery<CustomersResponse>({
    queryKey: ['/api/v2/admin/users', { role: 'customer' }],
  });

  const customers = customersData?.data || [];

  // Apply search filter
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.id.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
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
      name: string;
      email: string;
      phone: string;
      password: string;
      language: string;
      isVerified: boolean;
    }) => {
      return apiRequest('POST', '/api/v2/admin/users', {
        ...data,
        role: 'customer',
      });
    },
    onSuccess: () => {
      // Invalidate customer lists (both formats for compatibility)
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/users', { role: 'customer' }] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/users'] });
      // Invalidate analytics dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/analytics'] });
      toast({
        title: 'Success',
        description: 'Customer created successfully',
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create customer',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { 
      id: string; 
      data: {
        name: string;
        email: string;
        phone: string;
        language: string;
        isVerified: boolean;
        password?: string;
      }
    }) => {
      return apiRequest('PUT', `/api/v2/admin/users/${id}`, data);
    },
    onSuccess: (_, { id }) => {
      // Invalidate customer lists (both formats for compatibility)
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/users', { role: 'customer' }] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/users'] });
      // Invalidate specific customer profile
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/customers/${id}/overview`] });
      // Invalidate customer's subscriptions, addresses, orders, etc.
      queryClient.invalidateQueries({ queryKey: [`/api/v2/users/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/customers/${id}`] });
      toast({
        title: 'Success',
        description: 'Customer updated successfully',
      });
      setEditingCustomer(null);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update customer',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      language: 'en',
      isVerified: true,
    });
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      password: '',
      language: customer.language || 'en',
      isVerified: customer.isVerified || false,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomer) {
      const updateData: {
        name: string;
        email: string;
        phone: string;
        language: string;
        isVerified: boolean;
        password?: string;
      } = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        language: formData.language,
        isVerified: formData.isVerified,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: editingCustomer.id, data: updateData });
    } else {
      if (!formData.password) {
        toast({
          title: 'Error',
          description: 'Password is required for new customers',
          variant: 'destructive',
        });
        return;
      }
      createMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Customers Management</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-customer">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Customer</DialogTitle>
              <DialogDescription>
                Add a new customer to the platform
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  data-testid="input-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  data-testid="input-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+966501234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="input-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language Preference</Label>
                <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                  <SelectTrigger data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en" data-testid="select-item-en">English</SelectItem>
                    <SelectItem value="ar" data-testid="select-item-ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="verified">Verified Status</Label>
                <Switch
                  id="verified"
                  data-testid="switch-verified"
                  checked={formData.isVerified}
                  onCheckedChange={(checked) => setFormData({ ...formData, isVerified: checked })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} data-testid="button-cancel-create">
                  Cancel
                </Button>
                <Button type="submit" data-testid="button-submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Customer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Customers ({filteredCustomers.length})</CardTitle>
            <div className="flex gap-2 items-center">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-customers"
                />
              </div>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[130px]" data-testid="select-items-per-page">
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="table-header-primary">Name</TableHead>
                <TableHead className="table-header-primary">Email</TableHead>
                <TableHead className="table-header-primary">Phone</TableHead>
                <TableHead className="table-header-primary">Language</TableHead>
                <TableHead className="table-header-primary">Verified</TableHead>
                <TableHead className="table-header-primary">Joined</TableHead>
                <TableHead className="table-header-primary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer: Customer, index: number) => (
                <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`} className={index % 2 === 1 ? 'bg-muted/30' : ''}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email || 'N/A'}</TableCell>
                  <TableCell>{customer.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.language?.toUpperCase() || 'EN'}</Badge>
                  </TableCell>
                  <TableCell>
                    {customer.isVerified ? (
                      <Badge>Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Not Verified</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.createdAt && format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/customers/${customer.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-view-${customer.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(customer)}
                        data-testid={`button-edit-${customer.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {filteredCustomers.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;
                      return (
                        <div key={page} className="flex items-center">
                          {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            data-testid={`button-page-${page}`}
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => !open && setEditingCustomer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
              <Input
                id="edit-name"
                data-testid="input-edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                data-testid="input-edit-email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                data-testid="input-edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+966501234567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                data-testid="input-edit-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-language">Language Preference</Label>
              <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                <SelectTrigger data-testid="select-edit-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-verified">Verified Status</Label>
              <Switch
                id="edit-verified"
                data-testid="switch-edit-verified"
                checked={formData.isVerified}
                onCheckedChange={(checked) => setFormData({ ...formData, isVerified: checked })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingCustomer(null)}>
                Cancel
              </Button>
              <Button type="submit" data-testid="button-edit-submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
