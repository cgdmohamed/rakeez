import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ImageWithFallback } from '@/components/ImageWithFallback';

interface Brand {
  id: string;
  name: string;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminBrands() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    isActive: true,
  });

  const { data: brandsResponse, isLoading } = useQuery<{ success: boolean; data: Brand[] }>({
    queryKey: ['/api/v2/admin/brands'],
  });

  const brands = brandsResponse?.data || [];

  // Apply search filter
  const filteredBrands = brands.filter((brand) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      brand.name?.toLowerCase().includes(query) ||
      brand.id.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredBrands.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBrands = filteredBrands.slice(startIndex, endIndex);

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
    mutationFn: async (data: { name: string; logo?: string; isActive: boolean }) => {
      return apiRequest('POST', '/api/v2/admin/brands', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/brands'] });
      toast({
        title: 'Success',
        description: 'Brand created successfully',
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create brand',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; logo?: string; isActive?: boolean } }) => {
      return apiRequest('PUT', `/api/v2/admin/brands/${id}`, data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/brands'] });
      toast({
        title: 'Success',
        description: 'Brand updated successfully',
      });
      setEditingBrand(null);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update brand',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/v2/admin/brands/${id}`, {});
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/brands'] });
      toast({
        title: 'Success',
        description: 'Brand deleted successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete brand',
        variant: 'destructive',
      });
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
      setFormData({ ...formData, logo: imageUrl });
      toast({ title: 'Success', description: 'Logo uploaded successfully' });
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload logo';
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

  const resetForm = () => {
    setFormData({
      name: '',
      logo: '',
      isActive: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate({
      name: formData.name,
      logo: formData.logo || undefined,
      isActive: formData.isActive,
    });
  };

  const handleUpdate = () => {
    if (!editingBrand) return;
    updateMutation.mutate({
      id: editingBrand.id,
      data: {
        name: formData.name,
        logo: formData.logo || undefined,
        isActive: formData.isActive,
      },
    });
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      logo: brand.logo || '',
      isActive: brand.isActive,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this brand?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading brands...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Brands Management</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-brand">
              <Plus className="mr-2 h-4 w-4" />
              Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-create-brand">
            <DialogHeader>
              <DialogTitle>Create New Brand</DialogTitle>
              <DialogDescription>Add a new brand to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="brand-name">Brand Name</Label>
                <Input
                  id="brand-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter brand name"
                  data-testid="input-brand-name"
                />
              </div>
              <div>
                <Label htmlFor="brand-logo">Logo</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="brand-logo"
                      value={formData.logo}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      data-testid="input-brand-logo"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={uploading}
                      onClick={() => document.getElementById('file-upload-create-brand')?.click()}
                      data-testid="button-upload-logo"
                    >
                      {uploading ? '...' : <Upload className="h-4 w-4" />}
                    </Button>
                  </div>
                  <input
                    id="file-upload-create-brand"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  {formData.logo && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                      <span className="truncate">{formData.logo}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="brand-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  data-testid="switch-brand-active"
                />
                <Label htmlFor="brand-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={!formData.name.trim() || createMutation.isPending}
                data-testid="button-confirm-create"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Brand'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>All Brands ({brands.length})</CardTitle>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search brands..."
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
          <Table>
            <TableHeader>
              <TableRow className="table-header-primary">
                <TableHead>Name</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBrands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No brands found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBrands.map((brand) => (
                  <TableRow key={brand.id} data-testid={`row-brand-${brand.id}`}>
                    <TableCell className="font-medium">{brand.name}</TableCell>
                    <TableCell>
                      <ImageWithFallback
                        src={brand.logo}
                        alt={brand.name}
                        className="h-8 w-8 object-contain rounded"
                        fallbackType="icon"
                      />
                    </TableCell>
                    <TableCell>
                      {brand.isActive ? (
                        <Badge className="badge-success">Active</Badge>
                      ) : (
                        <Badge className="badge-destructive">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(brand.createdAt), 'PP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(brand)}
                          data-testid={`button-edit-${brand.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(brand.id)}
                          data-testid={`button-delete-${brand.id}`}
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredBrands.length)} of {filteredBrands.length} brands
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
        </CardContent>
      </Card>

      {/* Edit Brand Dialog */}
      <Dialog open={!!editingBrand} onOpenChange={(open) => !open && setEditingBrand(null)}>
        <DialogContent data-testid="dialog-edit-brand">
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>Update brand information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-brand-name">Brand Name</Label>
              <Input
                id="edit-brand-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter brand name"
                data-testid="input-edit-brand-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-brand-logo">Logo</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="edit-brand-logo"
                    value={formData.logo}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    data-testid="input-edit-brand-logo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={uploading}
                    onClick={() => document.getElementById('file-upload-edit-brand')?.click()}
                    data-testid="button-upload-logo-edit"
                  >
                    {uploading ? '...' : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                <input
                  id="file-upload-edit-brand"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {formData.logo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span className="truncate">{formData.logo}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-brand-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                data-testid="switch-edit-brand-active"
              />
              <Label htmlFor="edit-brand-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBrand(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name.trim() || updateMutation.isPending}
              data-testid="button-confirm-edit"
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Brand'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
