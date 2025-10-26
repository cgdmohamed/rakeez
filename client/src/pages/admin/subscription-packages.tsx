import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Search, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Package, X } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ServiceLink {
  serviceId: string;
  usageLimit: number;
  discountPercentage: number;
}

interface SubscriptionPackage {
  id: string;
  tier: string;
  name: { en: string; ar: string };
  duration: number;
  price: string;
  inclusions: { en: string[]; ar: string[] };
  termsAndConditions: { en: string; ar: string } | null;
  isActive: boolean;
  createdAt: string;
  services?: Array<{
    serviceId: string;
    usageLimit: number;
    discountPercentage: number;
    service: {
      id: string;
      name: { en: string; ar: string };
    };
  }>;
}

interface PackagesResponse {
  success: boolean;
  message: string;
  data: SubscriptionPackage[];
}

interface Service {
  id: string;
  name: { en: string; ar: string };
}

export default function AdminSubscriptionPackages() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<SubscriptionPackage | null>(null);
  const [formData, setFormData] = useState({
    tier: 'basic',
    nameEn: '',
    nameAr: '',
    duration: '30',
    price: '',
    inclusionsEn: '',
    inclusionsAr: '',
    termsEn: '',
    termsAr: '',
    isActive: true,
    services: [] as ServiceLink[],
  });

  const { data: packagesData, isLoading } = useQuery<PackagesResponse>({
    queryKey: ['/api/v2/admin/service-packages'],
  });

  const { data: servicesData } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['/api/v2/admin/services'],
  });

  const packages = packagesData?.data || [];
  const servicesRaw = servicesData?.data || [];
  
  // Flatten services from categories
  const services: Service[] = servicesRaw.flatMap((categoryData: any) =>
    (categoryData.services || []).map((service: any) => ({
      id: service.id,
      name: service.name,
    }))
  );

  // Apply filters
  const filteredPackages = packages.filter((pkg) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pkg.name?.en?.toLowerCase().includes(query) ||
      pkg.name?.ar?.toLowerCase().includes(query) ||
      pkg.tier?.toLowerCase().includes(query) ||
      pkg.id.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredPackages.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPackages = filteredPackages.slice(startIndex, endIndex);

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
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/v2/admin/service-packages', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/service-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/subscription-packages'] });
      toast({
        title: 'Success',
        description: 'Package created successfully',
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create package',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest('PUT', `/api/v2/admin/service-packages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/service-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/subscription-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/users'], refetchType: 'active' });
      toast({
        title: 'Success',
        description: 'Package updated successfully',
      });
      setDialogOpen(false);
      setEditingPackage(null);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update package',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/v2/admin/service-packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/service-packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/subscription-packages'] });
      toast({
        title: 'Success',
        description: 'Package deleted successfully',
      });
      setDeleteDialogOpen(false);
      setDeletingPackage(null);
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete package',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      tier: 'basic',
      nameEn: '',
      nameAr: '',
      duration: '30',
      price: '',
      inclusionsEn: '',
      inclusionsAr: '',
      termsEn: '',
      termsAr: '',
      isActive: true,
      services: [],
    });
  };

  const openEditDialog = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg);
    setFormData({
      tier: pkg.tier,
      nameEn: pkg.name?.en || '',
      nameAr: pkg.name?.ar || '',
      duration: pkg.duration?.toString() || '30',
      price: pkg.price,
      inclusionsEn: pkg.inclusions?.en?.join('\n') || '',
      inclusionsAr: pkg.inclusions?.ar?.join('\n') || '',
      termsEn: pkg.termsAndConditions?.en || '',
      termsAr: pkg.termsAndConditions?.ar || '',
      isActive: pkg.isActive,
      services: pkg.services?.map(s => ({
        serviceId: s.serviceId,
        usageLimit: s.usageLimit,
        discountPercentage: s.discountPercentage,
      })) || [],
    });
    setDialogOpen(true);
  };

  const addService = () => {
    setFormData({
      ...formData,
      services: [...formData.services, { serviceId: '', usageLimit: 1, discountPercentage: 0 }],
    });
  };

  const removeService = (index: number) => {
    setFormData({
      ...formData,
      services: formData.services.filter((_, i) => i !== index),
    });
  };

  const updateService = (index: number, field: keyof ServiceLink, value: string | number) => {
    const updated = [...formData.services];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, services: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.services.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one service to the package',
        variant: 'destructive',
      });
      return;
    }

    // Validate all services have required fields
    const invalidServices = formData.services.filter(
      s => !s.serviceId || !s.usageLimit || s.usageLimit < 1 || isNaN(s.discountPercentage)
    );
    
    if (invalidServices.length > 0) {
      toast({
        title: 'Validation Error',
        description: 'Please ensure all services have a selected service, valid usage limit (≥1), and discount percentage',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      tier: formData.tier,
      name: {
        en: formData.nameEn,
        ar: formData.nameAr,
      },
      duration: parseInt(formData.duration),
      price: parseFloat(formData.price),
      inclusions: {
        en: formData.inclusionsEn.split('\n').filter(line => line.trim()),
        ar: formData.inclusionsAr.split('\n').filter(line => line.trim()),
      },
      termsAndConditions: formData.termsEn || formData.termsAr ? {
        en: formData.termsEn,
        ar: formData.termsAr,
      } : null,
      isActive: formData.isActive,
      services: formData.services.map(s => ({
        serviceId: s.serviceId,
        usageLimit: s.usageLimit,
        discountPercentage: s.discountPercentage || 0,
      })),
    };

    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const stats = {
    total: packages.length,
    active: packages.filter(p => p.isActive).length,
    inactive: packages.filter(p => !p.isActive).length,
    basic: packages.filter(p => p.tier === 'basic').length,
    premium: packages.filter(p => p.tier === 'premium').length,
    vip: packages.filter(p => p.tier === 'vip').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Subscription Packages</h1>
          <p className="text-muted-foreground">Manage multi-service subscription bundles</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-create-package">
          <Plus className="mr-2 h-4 w-4" />
          Create Package
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Packages</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600" data-testid="stat-inactive">{stats.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Basic Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="stat-basic">{stats.basic}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Premium Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="stat-premium">{stats.premium}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">VIP Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600" data-testid="stat-vip">{stats.vip}</div>
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
                placeholder="Search by package name, tier, or ID..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
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

      {/* Packages Table */}
      <Card>
        <CardContent className="pt-6">
          {paginatedPackages.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No packages found</p>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try adjusting your search' : 'Create your first subscription package'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package Name</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPackages.map((pkg) => (
                    <TableRow key={pkg.id} data-testid={`row-package-${pkg.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium" data-testid={`text-name-${pkg.id}`}>
                            {pkg.name?.en || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">{pkg.name?.ar || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{pkg.tier}</Badge>
                      </TableCell>
                      <TableCell>{pkg.duration} days</TableCell>
                      <TableCell className="font-semibold">SAR {parseFloat(pkg.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {pkg.services?.length || 0} services
                        </span>
                      </TableCell>
                      <TableCell>
                        {pkg.isActive ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(pkg)}
                            data-testid={`button-edit-${pkg.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDeletingPackage(pkg);
                              setDeleteDialogOpen(true);
                            }}
                            data-testid={`button-delete-${pkg.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredPackages.length)} of {filteredPackages.length} packages
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPackage ? 'Edit Package' : 'Create Package'}</DialogTitle>
            <DialogDescription>
              {editingPackage ? 'Update subscription package details' : 'Create a new multi-service subscription package'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tier">Tier *</Label>
                  <Select 
                    value={formData.tier} 
                    onValueChange={(value) => setFormData({ ...formData, tier: value })}
                  >
                    <SelectTrigger data-testid="select-tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (days) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    data-testid="input-duration"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nameEn">Name (English) *</Label>
                  <Input
                    id="nameEn"
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    data-testid="input-name-en"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameAr">Name (Arabic) *</Label>
                  <Input
                    id="nameAr"
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    data-testid="input-name-ar"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (SAR) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  data-testid="input-price"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inclusionsEn">Inclusions (English) - One per line</Label>
                  <Textarea
                    id="inclusionsEn"
                    value={formData.inclusionsEn}
                    onChange={(e) => setFormData({ ...formData, inclusionsEn: e.target.value })}
                    placeholder="Free delivery&#10;Priority support&#10;24/7 availability"
                    rows={4}
                    data-testid="textarea-inclusions-en"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inclusionsAr">Inclusions (Arabic) - One per line</Label>
                  <Textarea
                    id="inclusionsAr"
                    value={formData.inclusionsAr}
                    onChange={(e) => setFormData({ ...formData, inclusionsAr: e.target.value })}
                    placeholder="توصيل مجاني&#10;دعم على مدار الساعة&#10;أولوية الخدمة"
                    rows={4}
                    data-testid="textarea-inclusions-ar"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="termsEn">Terms & Conditions (English)</Label>
                  <Textarea
                    id="termsEn"
                    value={formData.termsEn}
                    onChange={(e) => setFormData({ ...formData, termsEn: e.target.value })}
                    rows={3}
                    data-testid="textarea-terms-en"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termsAr">Terms & Conditions (Arabic)</Label>
                  <Textarea
                    id="termsAr"
                    value={formData.termsAr}
                    onChange={(e) => setFormData({ ...formData, termsAr: e.target.value })}
                    rows={3}
                    data-testid="textarea-terms-ar"
                  />
                </div>
              </div>

              {/* Services Section */}
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Included Services *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addService}
                    data-testid="button-add-service"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
                
                {formData.services.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      No services added yet. Click "Add Service" to include services in this package.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.services.map((service, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-12 gap-3 items-start">
                          <div className="col-span-5">
                            <Label className="text-xs">Service</Label>
                            <Select
                              value={service.serviceId}
                              onValueChange={(value) => updateService(index, 'serviceId', value)}
                            >
                              <SelectTrigger data-testid={`select-service-${index}`}>
                                <SelectValue placeholder="Select service" />
                              </SelectTrigger>
                              <SelectContent>
                                {services.map((svc) => (
                                  <SelectItem key={svc.id} value={svc.id}>
                                    {svc.name?.en || 'Unknown'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Usage Limit</Label>
                            <Input
                              type="number"
                              min="1"
                              value={service.usageLimit}
                              onChange={(e) => updateService(index, 'usageLimit', parseInt(e.target.value))}
                              data-testid={`input-usage-limit-${index}`}
                            />
                          </div>
                          <div className="col-span-3">
                            <Label className="text-xs">Discount (%)</Label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={service.discountPercentage}
                              onChange={(e) => updateService(index, 'discountPercentage', parseFloat(e.target.value))}
                              data-testid={`input-discount-${index}`}
                            />
                          </div>
                          <div className="col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(index)}
                              data-testid={`button-remove-service-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 border-t pt-4">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-is-active"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active package (visible to customers)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-package"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : (editingPackage ? 'Update Package' : 'Create Package')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the package "{deletingPackage?.name?.en}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPackage && deleteMutation.mutate(deletingPackage.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
