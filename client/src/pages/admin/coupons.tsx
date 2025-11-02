import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Eye, Copy, Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { SarSymbol } from '@/components/sar-symbol';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const couponFormSchema = z.object({
  code: z.string()
    .min(3, 'Code must be at least 3 characters')
    .max(50, 'Code must be at most 50 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase alphanumeric'),
  type: z.enum(['percentage', 'fixed_amount']),
  value: z.coerce.number().positive('Value must be positive'),
  description_en: z.string().min(1, 'English description is required'),
  description_ar: z.string().min(1, 'Arabic description is required'),
  validFrom: z.date({ required_error: 'Valid from date is required' }),
  validUntil: z.date().optional().nullable(),
  maxUsesTotal: z.coerce.number().positive().optional().nullable(),
  maxUsesPerUser: z.coerce.number().positive().optional().nullable(),
  minOrderAmount: z.coerce.number().min(0).optional().nullable(),
  maxDiscountAmount: z.coerce.number().min(0).optional().nullable(),
  serviceIds: z.array(z.string()).optional().nullable(),
  firstTimeOnly: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).refine((data) => {
  if (data.validUntil && data.validFrom) {
    return data.validUntil > data.validFrom;
  }
  return true;
}, {
  message: 'Valid until must be after valid from',
  path: ['validUntil'],
});

type CouponFormValues = z.infer<typeof couponFormSchema>;

interface Coupon {
  id: string;
  code: string;
  name?: { en: string; ar: string };
  description?: { en: string; ar: string };
  type: 'percentage' | 'fixed_amount';
  value: string;
  minOrderAmount?: string;
  maxDiscountAmount?: string;
  maxUsesTotal?: number;
  maxUsesPerUser: number;
  currentUses: number;
  serviceIds?: string[];
  firstTimeOnly: boolean;
  isActive: boolean;
  validFrom: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

interface CouponUsage {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  booking: {
    id: string;
    scheduledDate: string;
  };
  discountAmount: string;
  createdAt: string;
}

interface Service {
  id: string;
  name: { en: string; ar: string };
}

export default function AdminCoupons() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 50;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [viewingUsageCouponId, setViewingUsageCouponId] = useState<string | null>(null);

  const { data: couponsData, isLoading: couponsLoading } = useQuery<{ success: boolean; data: Coupon[] }>({
    queryKey: ['/api/v2/admin/coupons', activeTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.append('status', activeTab);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '1000');
      params.append('offset', '0');
      
      const url = `/api/v2/admin/coupons?${params.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch coupons');
      return res.json();
    },
  });

  const { data: servicesData } = useQuery<{ success: boolean; data: Service[] }>({
    queryKey: ['/api/v2/admin/services/list'],
    queryFn: async () => {
      const res = await fetch('/api/v2/admin/services', {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch services');
      const result = await res.json();
      
      // Flatten services from categories
      const services: Service[] = [];
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach((categoryData: any) => {
          if (categoryData.services && Array.isArray(categoryData.services)) {
            services.push(...categoryData.services);
          }
        });
      }
      return { success: true, data: services };
    },
  });

  const { data: usageData } = useQuery<{ success: boolean; data: CouponUsage[] }>({
    queryKey: ['/api/v2/admin/coupons', viewingUsageCouponId, 'usage'],
    queryFn: async () => {
      const res = await fetch(`/api/v2/admin/coupons/${viewingUsageCouponId}/usage`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` },
      });
      if (!res.ok) throw new Error('Failed to fetch usage data');
      return res.json();
    },
    enabled: !!viewingUsageCouponId && usageDialogOpen,
  });

  const coupons = couponsData?.data || [];
  const services = servicesData?.data || [];
  const usages = usageData?.data || [];

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: '',
      type: 'percentage',
      value: 0,
      description_en: '',
      description_ar: '',
      validFrom: new Date(),
      validUntil: null,
      maxUsesTotal: null,
      maxUsesPerUser: 1,
      minOrderAmount: null,
      maxDiscountAmount: null,
      serviceIds: [],
      firstTimeOnly: false,
      isActive: true,
    },
  });

  const filteredCoupons = coupons.filter((coupon) => {
    const now = new Date();
    const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;
    const isExpired = validUntil && validUntil < now;
    
    if (activeTab === 'active') return coupon.isActive && !isExpired;
    if (activeTab === 'expired') return isExpired || !coupon.isActive;
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCoupons = filteredCoupons.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const createMutation = useMutation({
    mutationFn: async (data: CouponFormValues) => {
      return apiRequest('POST', '/api/v2/admin/coupons', {
        code: data.code.toUpperCase(),
        name: { en: data.code, ar: data.code },
        description: { en: data.description_en, ar: data.description_ar },
        type: data.type,
        value: data.value.toString(),
        min_order_amount: data.minOrderAmount?.toString() || null,
        max_discount_amount: data.maxDiscountAmount?.toString() || null,
        max_uses_total: data.maxUsesTotal || null,
        max_uses_per_user: data.maxUsesPerUser || 1,
        service_ids: data.serviceIds || null,
        first_time_only: data.firstTimeOnly,
        is_active: data.isActive,
        valid_from: data.validFrom.toISOString(),
        valid_until: data.validUntil?.toISOString() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/coupons'] });
      toast({ title: 'Success', description: 'Coupon created successfully' });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create coupon',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CouponFormValues }) => {
      return apiRequest('PUT', `/api/v2/admin/coupons/${id}`, {
        code: data.code.toUpperCase(),
        name: { en: data.code, ar: data.code },
        description: { en: data.description_en, ar: data.description_ar },
        type: data.type,
        value: data.value.toString(),
        min_order_amount: data.minOrderAmount?.toString() || null,
        max_discount_amount: data.maxDiscountAmount?.toString() || null,
        max_uses_total: data.maxUsesTotal || null,
        max_uses_per_user: data.maxUsesPerUser || 1,
        service_ids: data.serviceIds || null,
        first_time_only: data.firstTimeOnly,
        is_active: data.isActive,
        valid_from: data.validFrom.toISOString(),
        valid_until: data.validUntil?.toISOString() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/coupons'] });
      toast({ title: 'Success', description: 'Coupon updated successfully' });
      setDialogOpen(false);
      setEditingCoupon(null);
      form.reset();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update coupon',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/v2/admin/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/coupons'] });
      toast({ title: 'Success', description: 'Coupon deleted successfully' });
      setDeleteDialogOpen(false);
      setDeletingCoupon(null);
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete coupon',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    setEditingCoupon(null);
    form.reset({
      code: '',
      type: 'percentage',
      value: 0,
      description_en: '',
      description_ar: '',
      validFrom: new Date(),
      validUntil: null,
      maxUsesTotal: null,
      maxUsesPerUser: 1,
      minOrderAmount: null,
      maxDiscountAmount: null,
      serviceIds: [],
      firstTimeOnly: false,
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    form.reset({
      code: coupon.code,
      type: coupon.type,
      value: parseFloat(coupon.value),
      description_en: coupon.description?.en || '',
      description_ar: coupon.description?.ar || '',
      validFrom: new Date(coupon.validFrom),
      validUntil: coupon.validUntil ? new Date(coupon.validUntil) : null,
      maxUsesTotal: coupon.maxUsesTotal || null,
      maxUsesPerUser: coupon.maxUsesPerUser || 1,
      minOrderAmount: coupon.minOrderAmount ? parseFloat(coupon.minOrderAmount) : null,
      maxDiscountAmount: coupon.maxDiscountAmount ? parseFloat(coupon.maxDiscountAmount) : null,
      serviceIds: coupon.serviceIds || [],
      firstTimeOnly: coupon.firstTimeOnly,
      isActive: coupon.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = (coupon: Coupon) => {
    setDeletingCoupon(coupon);
    setDeleteDialogOpen(true);
  };

  const handleViewUsage = (couponId: string) => {
    setViewingUsageCouponId(couponId);
    setUsageDialogOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Copied', description: `Coupon code "${code}" copied to clipboard` });
  };

  const onSubmit = (values: CouponFormValues) => {
    if (editingCoupon) {
      updateMutation.mutate({ id: editingCoupon.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const validUntil = coupon.validUntil ? new Date(coupon.validUntil) : null;
    const isExpired = validUntil && validUntil < now;

    if (isExpired) {
      return <Badge className="bg-gray-200 text-gray-800">Expired</Badge>;
    }
    if (!coupon.isActive) {
      return <Badge className="bg-red-100 text-red-800">Inactive</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Active</Badge>;
  };

  const getTypeBadge = (type: string) => {
    if (type === 'percentage') {
      return <Badge className="bg-blue-100 text-blue-800">Percentage</Badge>;
    }
    return <Badge className="bg-purple-100 text-purple-800">Fixed Amount</Badge>;
  };

  const formatValue = (coupon: Coupon) => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}%`;
    }
    return (
      <span className="flex items-center gap-1">
        <SarSymbol size={14} />
        {parseFloat(coupon.value).toFixed(2)}
      </span>
    );
  };

  const getUsageProgress = (coupon: Coupon) => {
    if (!coupon.maxUsesTotal) {
      return <span className="text-sm text-muted-foreground">{coupon.currentUses} uses</span>;
    }
    const percentage = (coupon.currentUses / coupon.maxUsesTotal) * 100;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>{coupon.currentUses} / {coupon.maxUsesTotal}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    );
  };

  if (couponsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-coupons-page">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Coupons Management</h1>
        <Button onClick={handleCreate} data-testid="button-create-coupon">
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Coupons</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by code or description..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="active" data-testid="tab-active">Active Coupons</TabsTrigger>
              <TabsTrigger value="expired" data-testid="tab-expired">Expired Coupons</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="table-header-primary">
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Value</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">Usage</TableHead>
                      <TableHead className="font-semibold">Valid Period</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCoupons.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No coupons found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedCoupons.map((coupon, index) => (
                        <TableRow 
                          key={coupon.id} 
                          className={index % 2 === 0 ? 'bg-muted/30' : ''}
                          data-testid={`row-coupon-${coupon.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary">{coupon.code}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCopyCode(coupon.code)}
                                className="h-6 w-6 p-0"
                                data-testid={`button-copy-${coupon.id}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{getTypeBadge(coupon.type)}</TableCell>
                          <TableCell>{formatValue(coupon)}</TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={coupon.description?.en}>
                              {coupon.description?.en || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[150px]">{getUsageProgress(coupon)}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{format(new Date(coupon.validFrom), 'MMM dd, yyyy')}</div>
                              {coupon.validUntil && (
                                <div className="text-muted-foreground">
                                  to {format(new Date(coupon.validUntil), 'MMM dd, yyyy')}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(coupon)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewUsage(coupon.id)}
                                data-testid={`button-view-usage-${coupon.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(coupon)}
                                data-testid={`button-edit-coupon-${coupon.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(coupon)}
                                data-testid={`button-delete-coupon-${coupon.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredCoupons.length)} of {filteredCoupons.length} coupons
                  </div>
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
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? 'Update coupon details' : 'Create a new discount coupon'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Code *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="SUMMER2024"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch('type') === 'percentage' ? 'Percentage (%)' : 'Amount (SAR)'} *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                          data-testid="input-value"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('type') === 'percentage' && (
                  <FormField
                    control={form.control}
                    name="maxDiscountAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Discount (SAR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            data-testid="input-max-discount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {form.watch('type') === 'fixed_amount' && (
                  <FormField
                    control={form.control}
                    name="minOrderAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Order Amount (SAR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            data-testid="input-min-order"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="description_en"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (English) *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Summer sale discount"
                        rows={2}
                        data-testid="input-description-en"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Arabic) *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="خصم الصيف"
                        rows={2}
                        dir="rtl"
                        data-testid="input-description-ar"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valid From *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                              data-testid="input-valid-from"
                            >
                              {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Valid Until</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                              data-testid="input-valid-until"
                            >
                              {field.value ? format(field.value, 'PPP') : <span>No expiry</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxUsesTotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Total Uses</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          placeholder="Unlimited"
                          data-testid="input-max-uses-total"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxUsesPerUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Uses Per User</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                          data-testid="input-max-uses-per-user"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="serviceIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Applicable Services (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const currentValues = field.value || [];
                        if (!currentValues.includes(value)) {
                          field.onChange([...currentValues, value]);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-services">
                          <SelectValue placeholder="All services (leave empty)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name?.en || 'Unnamed Service'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map((serviceId) => {
                          const service = services.find((s) => s.id === serviceId);
                          return (
                            <Badge key={serviceId} variant="secondary" className="gap-1">
                              {service?.name?.en || 'Unknown'}
                              <button
                                type="button"
                                onClick={() => {
                                  field.onChange(field.value?.filter((id) => id !== serviceId));
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstTimeOnly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-first-time-only"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>First-time customers only</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-is-active"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingCoupon(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete coupon "{deletingCoupon?.code}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCoupon && deleteMutation.mutate(deletingCoupon.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={usageDialogOpen} onOpenChange={setUsageDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Coupon Usage Statistics
            </DialogTitle>
            <DialogDescription>
              View detailed usage history for this coupon
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {usages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No usage history found
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Booking ID</TableHead>
                      <TableHead className="font-semibold">Discount Amount</TableHead>
                      <TableHead className="font-semibold">Used At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usages.map((usage, index) => (
                      <TableRow key={usage.id} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{usage.user.name}</div>
                            <div className="text-sm text-muted-foreground">{usage.user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{usage.booking.id}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 font-semibold text-green-600">
                            <SarSymbol size={14} />
                            {parseFloat(usage.discountAmount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>{format(new Date(usage.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
