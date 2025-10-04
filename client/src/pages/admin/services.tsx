import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { SarSymbol } from '@/components/sar-symbol';

const categorySchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  description_en: z.string().min(1, 'English description is required'),
  description_ar: z.string().min(1, 'Arabic description is required'),
  icon: z.string().optional(),
  sort_order: z.coerce.number().default(0),
});

const serviceSchema = z.object({
  category_id: z.string().min(1, 'Category is required'),
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  description_en: z.string().min(1, 'English description is required'),
  description_ar: z.string().min(1, 'Arabic description is required'),
  base_price: z.coerce.number().min(0, 'Base price must be positive'),
  duration_minutes: z.coerce.number().min(30, 'Duration must be at least 30 minutes'),
  vat_percentage: z.coerce.number().min(0).max(100),
});

const packageSchema = z.object({
  service_id: z.string().min(1, 'Service is required'),
  tier: z.string().min(1, 'Tier is required'),
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  discount_percentage: z.coerce.number().min(0).max(100),
  inclusions_en: z.string().min(1, 'English inclusions required'),
  inclusions_ar: z.string().min(1, 'Arabic inclusions required'),
});

export default function AdminServices() {
  const { toast } = useToast();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [editService, setEditService] = useState<any>(null);
  const [editPackage, setEditPackage] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ type: string; id: string; name: string } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/services'],
  });

  const servicesData = data?.data || [];

  const categoryForm = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      icon: '',
      sort_order: 0,
    },
  });

  const serviceForm = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      category_id: '',
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      base_price: 0,
      duration_minutes: 60,
      vat_percentage: 15,
    },
  });

  const packageForm = useForm({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      service_id: '',
      tier: 'basic',
      name_en: '',
      name_ar: '',
      price: 0,
      discount_percentage: 0,
      inclusions_en: '',
      inclusions_ar: '',
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/v2/admin/categories', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/services'] });
      toast({ title: 'Success', description: 'Category created successfully' });
      setCategoryDialogOpen(false);
      categoryForm.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create category', variant: 'destructive' });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/v2/admin/categories/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/services'] });
      toast({ title: 'Success', description: 'Category updated successfully' });
      setCategoryDialogOpen(false);
      setEditCategory(null);
      categoryForm.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update category', variant: 'destructive' });
    },
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/v2/admin/services', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/services'] });
      toast({ title: 'Success', description: 'Service created successfully' });
      setServiceDialogOpen(false);
      serviceForm.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create service', variant: 'destructive' });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/v2/admin/services/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/services'] });
      toast({ title: 'Success', description: 'Service updated successfully' });
      setServiceDialogOpen(false);
      setEditService(null);
      serviceForm.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update service', variant: 'destructive' });
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/v2/admin/packages', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/services'] });
      toast({ title: 'Success', description: 'Package created successfully' });
      setPackageDialogOpen(false);
      packageForm.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create package', variant: 'destructive' });
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest(`/api/v2/admin/packages/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/services'] });
      toast({ title: 'Success', description: 'Package updated successfully' });
      setPackageDialogOpen(false);
      setEditPackage(null);
      packageForm.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update package', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ type, id }: any) => {
      const endpoints: Record<string, string> = {
        category: `/api/v2/admin/categories/${id}`,
        service: `/api/v2/admin/services/${id}`,
        package: `/api/v2/admin/packages/${id}`,
      };
      return apiRequest(endpoints[type], 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/services'] });
      toast({ title: 'Success', description: 'Item deleted successfully' });
      setDeleteDialogOpen(false);
      setDeleteItem(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    },
  });

  const handleCategorySubmit = (values: any) => {
    const payload = {
      name: { en: values.name_en, ar: values.name_ar },
      description: { en: values.description_en, ar: values.description_ar },
      icon: values.icon || null,
      sort_order: values.sort_order,
    };

    if (editCategory) {
      updateCategoryMutation.mutate({ id: editCategory.id, data: payload });
    } else {
      createCategoryMutation.mutate(payload);
    }
  };

  const handleServiceSubmit = (values: any) => {
    const payload = {
      category_id: values.category_id,
      name: { en: values.name_en, ar: values.name_ar },
      description: { en: values.description_en, ar: values.description_ar },
      base_price: values.base_price,
      duration_minutes: values.duration_minutes,
      vat_percentage: values.vat_percentage,
    };

    if (editService) {
      updateServiceMutation.mutate({ id: editService.id, data: payload });
    } else {
      createServiceMutation.mutate(payload);
    }
  };

  const handlePackageSubmit = (values: any) => {
    const payload = {
      service_id: values.service_id,
      tier: values.tier,
      name: { en: values.name_en, ar: values.name_ar },
      price: values.price,
      discount_percentage: values.discount_percentage,
      inclusions: {
        en: values.inclusions_en.split('\n').filter(Boolean),
        ar: values.inclusions_ar.split('\n').filter(Boolean),
      },
    };

    if (editPackage) {
      updatePackageMutation.mutate({ id: editPackage.id, data: payload });
    } else {
      createPackageMutation.mutate(payload);
    }
  };

  const openEditCategory = (category: any) => {
    setEditCategory(category);
    categoryForm.reset({
      name_en: category.name?.en || '',
      name_ar: category.name?.ar || '',
      description_en: category.description?.en || '',
      description_ar: category.description?.ar || '',
      icon: category.icon || '',
      sort_order: category.sortOrder || 0,
    });
    setCategoryDialogOpen(true);
  };

  const openEditService = (service: any) => {
    setEditService(service);
    serviceForm.reset({
      category_id: service.categoryId || '',
      name_en: service.name?.en || '',
      name_ar: service.name?.ar || '',
      description_en: service.description?.en || '',
      description_ar: service.description?.ar || '',
      base_price: Number(service.basePrice) || 0,
      duration_minutes: service.durationMinutes || 60,
      vat_percentage: Number(service.vatPercentage) || 15,
    });
    setServiceDialogOpen(true);
  };

  const openEditPackage = (pkg: any, serviceId: string) => {
    setEditPackage(pkg);
    packageForm.reset({
      service_id: serviceId,
      tier: pkg.tier || 'basic',
      name_en: pkg.name?.en || '',
      name_ar: pkg.name?.ar || '',
      price: Number(pkg.price) || 0,
      discount_percentage: Number(pkg.discountPercentage) || 0,
      inclusions_en: pkg.inclusions?.en?.join('\n') || '',
      inclusions_ar: pkg.inclusions?.ar?.join('\n') || '',
    });
    setPackageDialogOpen(true);
  };

  const openCreateService = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    serviceForm.reset({
      category_id: categoryId,
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      base_price: 0,
      duration_minutes: 60,
      vat_percentage: 15,
    });
    setServiceDialogOpen(true);
  };

  const openCreatePackage = (serviceId: string) => {
    packageForm.reset({
      service_id: serviceId,
      tier: 'basic',
      name_en: '',
      name_ar: '',
      price: 0,
      discount_percentage: 0,
      inclusions_en: '',
      inclusions_ar: '',
    });
    setPackageDialogOpen(true);
  };

  const openDeleteDialog = (type: string, id: string, name: string) => {
    setDeleteItem({ type, id, name });
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary" data-testid="text-page-title">Services & Pricing</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Manage service catalog, categories, and pricing packages
          </p>
        </div>
        <Button onClick={() => { setEditCategory(null); categoryForm.reset(); setCategoryDialogOpen(true); }} data-testid="button-add-category">
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : servicesData.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Categories Found</CardTitle>
            <CardDescription>Create your first service category to get started.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Tabs defaultValue={servicesData[0]?.category?.id || '0'} className="space-y-4">
          <TabsList>
            {servicesData.map((categoryData: any, idx: number) => (
              <div key={categoryData.category.id} className="flex items-center gap-1">
                <TabsTrigger
                  value={categoryData.category.id}
                  data-testid={`tab-category-${idx}`}
                >
                  {categoryData.category.name?.en || categoryData.category.name}
                </TabsTrigger>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => openEditCategory(categoryData.category)}
                  data-testid={`button-edit-category-${idx}`}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => openDeleteDialog('category', categoryData.category.id, categoryData.category.name?.en)}
                  data-testid={`button-delete-category-${idx}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </TabsList>

          {servicesData.map((categoryData: any) => (
            <TabsContent key={categoryData.category.id} value={categoryData.category.id}>
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => openCreateService(categoryData.category.id)} data-testid={`button-add-service-${categoryData.category.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </div>

                {categoryData.services.length === 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>No Services</CardTitle>
                      <CardDescription>Add services to this category.</CardDescription>
                    </CardHeader>
                  </Card>
                ) : (
                  categoryData.services.map((service: any) => (
                    <Card key={service.id} data-testid={`card-service-${service.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle data-testid={`text-service-name-${service.id}`}>
                              {service.name?.en || service.name}
                            </CardTitle>
                            <CardDescription data-testid={`text-service-description-${service.id}`}>
                              {service.description?.en || service.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-2xl font-bold" data-testid={`text-service-price-${service.id}`}>
                                <SarSymbol className="mr-1" />{(Number(service.basePrice) || 0).toFixed(2)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                +{(Number(service.vatPercentage) || 0).toFixed(0)}% VAT
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" onClick={() => openEditService(service)} data-testid={`button-edit-service-${service.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openDeleteDialog('service', service.id, service.name?.en)} data-testid={`button-delete-service-${service.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold" data-testid={`text-packages-title-${service.id}`}>
                            Available Packages
                          </h4>
                          <Button size="sm" onClick={() => openCreatePackage(service.id)} data-testid={`button-add-package-${service.id}`}>
                            <Plus className="mr-2 h-3 w-3" />
                            Add Package
                          </Button>
                        </div>

                        {service.packages?.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Package</TableHead>
                                <TableHead>Tier</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {service.packages.map((pkg: any) => (
                                <TableRow key={pkg.id} data-testid={`row-package-${pkg.id}`}>
                                  <TableCell data-testid={`text-package-name-${pkg.id}`}>
                                    {pkg.name?.en || pkg.name}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" data-testid={`badge-package-tier-${pkg.id}`}>
                                      {pkg.tier}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-semibold" data-testid={`text-package-price-${pkg.id}`}>
                                      <SarSymbol className="mr-1" size={12} />{(Number(pkg.price) || 0).toFixed(2)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {pkg.discountPercentage > 0 && (
                                      <Badge variant="secondary" data-testid={`badge-package-discount-${pkg.id}`}>
                                        -{(Number(pkg.discountPercentage) || 0).toFixed(0)}%
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button size="icon" variant="ghost" onClick={() => openEditPackage(pkg, service.id)} data-testid={`button-edit-package-${pkg.id}`}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => openDeleteDialog('package', pkg.id, pkg.name?.en)} data-testid={`button-delete-package-${pkg.id}`}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-muted-foreground">No packages available for this service.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-category">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {editCategory ? 'Update category information' : 'Create a new service category'}
            </DialogDescription>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(handleCategorySubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={categoryForm.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Home Cleaning" data-testid="input-name-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoryForm.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Arabic)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: تنظيف المنزل" data-testid="input-name-ar" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={categoryForm.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (English)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe the category" data-testid="input-description-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoryForm.control}
                  name="description_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Arabic)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="وصف الفئة" data-testid="input-description-ar" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={categoryForm.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Icon URL or name" data-testid="input-icon" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={categoryForm.control}
                  name="sort_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-sort-order"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending} data-testid="button-submit">
                  {editCategory ? 'Update' : 'Create'} Category
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-service">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editService ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
            <DialogDescription>
              {editService ? 'Update service information' : 'Create a new service'}
            </DialogDescription>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(handleServiceSubmit)} className="space-y-4">
              <FormField
                control={serviceForm.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {servicesData.map((cat: any) => (
                          <SelectItem key={cat.category.id} value={cat.category.id}>
                            {cat.category.name?.en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Deep Cleaning" data-testid="input-service-name-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Arabic)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: تنظيف عميق" data-testid="input-service-name-ar" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (English)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe the service" data-testid="input-service-description-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="description_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Arabic)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="وصف الخدمة" data-testid="input-service-description-ar" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={serviceForm.control}
                  name="base_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Price (SAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-base-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (min)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="vat_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-vat"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setServiceDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createServiceMutation.isPending || updateServiceMutation.isPending} data-testid="button-submit">
                  {editService ? 'Update' : 'Create'} Service
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Package Dialog */}
      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-package">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editPackage ? 'Edit Package' : 'Add Package'}
            </DialogTitle>
            <DialogDescription>
              {editPackage ? 'Update package information' : 'Create a new service package'}
            </DialogDescription>
          </DialogHeader>
          <Form {...packageForm}>
            <form onSubmit={packageForm.handleSubmit(handlePackageSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={packageForm.control}
                  name="tier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-tier">
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={packageForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (SAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          data-testid="input-package-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={packageForm.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Basic Package" data-testid="input-package-name-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={packageForm.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Arabic)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: باقة أساسية" data-testid="input-package-name-ar" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={packageForm.control}
                name="discount_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-discount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={packageForm.control}
                  name="inclusions_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inclusions (English, one per line)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Deep cleaning&#10;Kitchen cleaning&#10;Bathroom cleaning" rows={4} data-testid="input-inclusions-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={packageForm.control}
                  name="inclusions_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inclusions (Arabic, one per line)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="تنظيف عميق&#10;تنظيف المطبخ&#10;تنظيف الحمام" rows={4} data-testid="input-inclusions-ar" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPackageDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createPackageMutation.isPending || updatePackageMutation.isPending} data-testid="button-submit">
                  {editPackage ? 'Update' : 'Create'} Package
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{deleteItem?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItem && deleteMutation.mutate({ type: deleteItem.type, id: deleteItem.id })}
              disabled={deleteMutation.isPending}
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
