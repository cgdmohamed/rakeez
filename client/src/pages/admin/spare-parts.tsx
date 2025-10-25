import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { SarSymbol } from '@/components/sar-symbol';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const sparePartSchema = z.object({
  name_en: z.string().min(1, 'English name is required'),
  name_ar: z.string().min(1, 'Arabic name is required'),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  brandId: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock_quantity: z.coerce.number().int().min(0, 'Stock quantity must be non-negative'),
  image: z.string().optional(),
  sku: z.string().optional(),
});

export default function AdminSpareParts() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSparePart, setSelectedSparePart] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const { data: sparePartsData, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/spare-parts'],
  });

  const { data: brandsData } = useQuery<{ success: boolean; data: Array<{ id: string; name: string }> }>({
    queryKey: ['/api/v2/admin/brands'],
  });

  const brands = brandsData?.data || [];

  const form = useForm({
    resolver: zodResolver(sparePartSchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      category: '',
      brandId: '',
      price: 0,
      stock_quantity: 0,
      image: '',
      sku: '',
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image size must be less than 5MB', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch('/api/v2/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get upload URL: ${response.status} ${errorText.substring(0, 100)}`);
      }
      
      const { uploadURL } = await response.json();
      
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload to storage failed: ${uploadResponse.status}`);
      }

      const imageUrl = uploadURL.split('?')[0];
      form.setValue('image', imageUrl);
      toast({ title: 'Success', description: 'Image uploaded successfully' });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast({ 
        title: 'Upload Error', 
        description: errorMessage.includes('502') || errorMessage.includes('aborted')
          ? 'Server timeout. Please try again or use a smaller image.'
          : errorMessage,
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/v2/admin/spare-parts', data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/spare-parts'] });
      toast({ title: 'Success', description: 'Spare part created successfully' });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create spare part', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest('PUT', `/api/v2/admin/spare-parts/${id}`, data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/spare-parts'] });
      toast({ title: 'Success', description: 'Spare part updated successfully' });
      setEditDialogOpen(false);
      setSelectedSparePart(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update spare part', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/v2/admin/spare-parts/${id}`, {}),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/spare-parts'] });
      toast({ title: 'Success', description: 'Spare part deleted successfully' });
      setDeleteDialogOpen(false);
      setSelectedSparePart(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete spare part', variant: 'destructive' });
    },
  });

  const spareParts = sparePartsData?.data || [];

  // Apply search filter
  const filteredSpareParts = spareParts.filter((part: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      part.name?.en?.toLowerCase().includes(query) ||
      part.name?.ar?.toLowerCase().includes(query) ||
      part.sku?.toLowerCase().includes(query) ||
      part.id?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSpareParts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSpareParts = filteredSpareParts.slice(startIndex, endIndex);

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

  const handleCreate = (values: any) => {
    const payload = {
      name: {
        en: values.name_en,
        ar: values.name_ar,
      },
      description: {
        en: values.description_en || '',
        ar: values.description_ar || '',
      },
      category: values.category,
      brandId: values.brandId && values.brandId !== 'none' ? values.brandId : null,
      price: values.price,
      stock: values.stock_quantity,
      image: values.image || null,
    };
    createMutation.mutate(payload);
  };

  const handleUpdate = (values: any) => {
    if (!selectedSparePart) return;
    const payload = {
      name: {
        en: values.name_en,
        ar: values.name_ar,
      },
      description: {
        en: values.description_en || '',
        ar: values.description_ar || '',
      },
      category: values.category,
      brandId: values.brandId && values.brandId !== 'none' ? values.brandId : null,
      price: values.price,
      stock: values.stock_quantity,
      image: values.image || null,
    };
    updateMutation.mutate({ id: selectedSparePart.id, data: payload });
  };

  const handleEdit = (sparePart: any) => {
    setSelectedSparePart(sparePart);
    form.reset({
      name_en: sparePart.name?.en || '',
      name_ar: sparePart.name?.ar || '',
      description_en: sparePart.description?.en || '',
      description_ar: sparePart.description?.ar || '',
      category: sparePart.category || '',
      brandId: sparePart.brandId || 'none',
      price: sparePart.price || 0,
      stock_quantity: sparePart.stock || sparePart.stock_quantity || 0,
      image: sparePart.image || '',
      sku: sparePart.sku || '',
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (sparePart: any) => {
    setSelectedSparePart(sparePart);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Spare Parts Management</h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Manage spare parts inventory for quotations
          </p>
        </div>
        <Button onClick={() => { form.reset(); setCreateDialogOpen(true); }} data-testid="button-create-spare-part">
          <Plus className="mr-2 h-4 w-4" />
          Add Spare Part
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>All Spare Parts ({spareParts.length})</CardTitle>
            <CardDescription>View and manage your spare parts catalog</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search spare parts..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-[250px]"
                data-testid="input-search"
              />
            </div>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[100px]" data-testid="select-items-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name (EN)</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSpareParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="text-muted-foreground">
                        No spare parts found. Add your first spare part to get started.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSpareParts.map((part: any) => (
                    <TableRow key={part.id} data-testid={`row-spare-part-${part.id}`}>
                      <TableCell>
                        <ImageWithFallback
                          src={part.image}
                          alt={part.name?.en || 'Spare part'}
                          className="h-10 w-10 object-cover rounded"
                          fallbackType="icon"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{part.name?.en || 'N/A'}</TableCell>
                      <TableCell>{part.category || '-'}</TableCell>
                      <TableCell>{part.brand || '-'}</TableCell>
                      <TableCell><SarSymbol className="mr-1" />{(Number(part.price) || 0).toFixed(2)}</TableCell>
                      <TableCell>{part.stock || part.stock_quantity || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(part)}
                            data-testid={`button-edit-${part.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(part)}
                            data-testid={`button-delete-${part.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredSpareParts.length)} of {filteredSpareParts.length} spare parts
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
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-spare-part">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Create Spare Part</DialogTitle>
            <DialogDescription>Add a new spare part to your inventory</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Filter cartridge" data-testid="input-name-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Arabic)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="خرطوشة الفلتر" dir="rtl" data-testid="input-name-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (English)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Optional description..." rows={3} data-testid="input-description-en" />
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
                      <FormLabel>Description (Arabic)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="وصف اختياري..." dir="rtl" rows={3} data-testid="input-description-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Filters, Pumps, Motors" data-testid="input-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-brand">
                            <SelectValue placeholder="Select a brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/image.jpg" data-testid="input-image" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={uploading}
                          onClick={() => document.getElementById('file-upload-create')?.click()}
                          data-testid="button-upload-image"
                        >
                          {uploading ? '...' : <Upload className="h-4 w-4" />}
                        </Button>
                      </div>
                      <input
                        id="file-upload-create"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      {field.value && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                          <span className="truncate">{field.value}</span>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (SAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SKU-001" data-testid="input-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  Create Spare Part
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-spare-part">
          <DialogHeader>
            <DialogTitle>Edit Spare Part</DialogTitle>
            <DialogDescription>Update spare part details</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (English)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Filter cartridge" data-testid="input-edit-name-en" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name (Arabic)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="خرطوشة الفلتر" dir="rtl" data-testid="input-edit-name-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="description_en"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (English)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Optional description..." rows={3} data-testid="input-edit-description-en" />
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
                      <FormLabel>Description (Arabic)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="وصف اختياري..." dir="rtl" rows={3} data-testid="input-edit-description-ar" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Filters, Pumps, Motors" data-testid="input-edit-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand (optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-brand">
                            <SelectValue placeholder="Select a brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {brands.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image</FormLabel>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/image.jpg" data-testid="input-edit-image" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={uploading}
                          onClick={() => document.getElementById('file-upload-edit')?.click()}
                          data-testid="button-upload-image-edit"
                        >
                          {uploading ? '...' : <Upload className="h-4 w-4" />}
                        </Button>
                      </div>
                      <input
                        id="file-upload-edit"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      {field.value && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                          <span className="truncate">{field.value}</span>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (SAR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-edit-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="SKU-001" data-testid="input-edit-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  Update Spare Part
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-spare-part">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Spare Part</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedSparePart?.name?.en}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedSparePart && deleteMutation.mutate(selectedSparePart.id)}
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
