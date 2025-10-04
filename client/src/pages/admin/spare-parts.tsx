import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Pencil, Trash2 } from 'lucide-react';
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
  price: z.coerce.number().min(0, 'Price must be positive'),
  stock_quantity: z.coerce.number().int().min(0, 'Stock quantity must be non-negative'),
  sku: z.string().optional(),
});

export default function AdminSpareParts() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSparePart, setSelectedSparePart] = useState<any>(null);

  const { data: sparePartsData, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/spare-parts'],
  });

  const form = useForm({
    resolver: zodResolver(sparePartSchema),
    defaultValues: {
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      price: 0,
      stock_quantity: 0,
      sku: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/v2/admin/spare-parts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/spare-parts'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/spare-parts'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/spare-parts'] });
      toast({ title: 'Success', description: 'Spare part deleted successfully' });
      setDeleteDialogOpen(false);
      setSelectedSparePart(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete spare part', variant: 'destructive' });
    },
  });

  const spareParts = sparePartsData?.data || [];

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
      price: values.price,
      stock_quantity: values.stock_quantity,
      sku: values.sku || null,
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
      price: values.price,
      stock_quantity: values.stock_quantity,
      sku: values.sku || null,
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
      price: sparePart.price || 0,
      stock_quantity: sparePart.stock_quantity || 0,
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
          <h1 className="text-3xl font-bold" data-testid="text-title">Spare Parts Management</h1>
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
        <CardHeader>
          <CardTitle>All Spare Parts ({spareParts.length})</CardTitle>
          <CardDescription>View and manage your spare parts catalog</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name (EN)</TableHead>
                  <TableHead>Name (AR)</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spareParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="text-muted-foreground">
                        No spare parts found. Add your first spare part to get started.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  spareParts.map((part: any) => (
                    <TableRow key={part.id} data-testid={`row-spare-part-${part.id}`}>
                      <TableCell className="font-medium">{part.name?.en || 'N/A'}</TableCell>
                      <TableCell className="font-arabic">{part.name?.ar || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-xs">{part.sku || '-'}</TableCell>
                      <TableCell>${(Number(part.price) || 0).toFixed(2)}</TableCell>
                      <TableCell>{part.stock_quantity || 0}</TableCell>
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

              <div className="grid grid-cols-3 gap-4">
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
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
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

              <div className="grid grid-cols-3 gap-4">
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
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
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
