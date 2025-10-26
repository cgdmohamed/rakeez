import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ImageWithFallback } from '@/components/ImageWithFallback';

interface SliderImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Banner {
  id: string;
  title: { en: string; ar: string };
  imageUrl: string;
  linkUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminMobileContent() {
  const { toast } = useToast();
  const [isSliderDialogOpen, setIsSliderDialogOpen] = useState(false);
  const [isBannerDialogOpen, setIsBannerDialogOpen] = useState(false);
  const [editingSlider, setEditingSlider] = useState<SliderImage | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sliderFormData, setSliderFormData] = useState({
    imageUrl: '',
    sortOrder: 1,
    isActive: true,
  });
  const [bannerFormData, setBannerFormData] = useState({
    titleEn: '',
    titleAr: '',
    imageUrl: '',
    linkUrl: '',
    isActive: true,
  });

  const { data: sliderResponse, isLoading: sliderLoading } = useQuery<{ success: boolean; data: SliderImage[] }>({
    queryKey: ['/api/v2/admin/mobile-content/slider'],
  });

  const { data: bannerResponse, isLoading: bannerLoading } = useQuery<{ success: boolean; data: Banner[] }>({
    queryKey: ['/api/v2/admin/mobile-content/banner'],
  });

  const sliderImages = sliderResponse?.data || [];
  const banners = bannerResponse?.data || [];

  // Slider Mutations
  const createSliderMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; sortOrder: number; isActive: boolean }) => {
      return apiRequest('POST', '/api/v2/admin/mobile-content/slider', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/mobile-content/slider'] });
      toast({ title: 'Success', description: 'Slider image created successfully' });
      setIsSliderDialogOpen(false);
      resetSliderForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create slider image',
        variant: 'destructive',
      });
    },
  });

  const updateSliderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { imageUrl?: string; sortOrder?: number; isActive?: boolean } }) => {
      return apiRequest('PUT', `/api/v2/admin/mobile-content/slider/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/mobile-content/slider'] });
      toast({ title: 'Success', description: 'Slider image updated successfully' });
      setEditingSlider(null);
      resetSliderForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update slider image',
        variant: 'destructive',
      });
    },
  });

  const deleteSliderMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/v2/admin/mobile-content/slider/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/mobile-content/slider'] });
      toast({ title: 'Success', description: 'Slider image deleted successfully' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete slider image',
        variant: 'destructive',
      });
    },
  });

  const reorderSliderMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      return apiRequest('POST', '/api/v2/admin/mobile-content/slider/reorder', { imageIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/mobile-content/slider'] });
      toast({ title: 'Success', description: 'Slider images reordered successfully' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reorder slider images',
        variant: 'destructive',
      });
    },
  });

  // Banner Mutations
  const createBannerMutation = useMutation({
    mutationFn: async (data: { title: { en: string; ar: string }; imageUrl: string; linkUrl?: string; isActive: boolean }) => {
      return apiRequest('POST', '/api/v2/admin/mobile-content/banner', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/mobile-content/banner'] });
      toast({ title: 'Success', description: 'Banner created successfully' });
      setIsBannerDialogOpen(false);
      resetBannerForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create banner',
        variant: 'destructive',
      });
    },
  });

  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: { en: string; ar: string }; imageUrl?: string; linkUrl?: string; isActive?: boolean } }) => {
      return apiRequest('PUT', `/api/v2/admin/mobile-content/banner/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/mobile-content/banner'] });
      toast({ title: 'Success', description: 'Banner updated successfully' });
      setEditingBanner(null);
      resetBannerForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update banner',
        variant: 'destructive',
      });
    },
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/v2/admin/mobile-content/banner/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/mobile-content/banner'] });
      toast({ title: 'Success', description: 'Banner deleted successfully' });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete banner',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: 'slider' | 'banner') => {
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
        body: JSON.stringify({
          fileSize: file.size,
          fileType: file.type,
        }),
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
      
      if (target === 'slider') {
        setSliderFormData({ ...sliderFormData, imageUrl });
      } else {
        setBannerFormData({ ...bannerFormData, imageUrl });
      }
      
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

  const resetSliderForm = () => {
    setSliderFormData({
      imageUrl: '',
      sortOrder: 1,
      isActive: true,
    });
  };

  const resetBannerForm = () => {
    setBannerFormData({
      titleEn: '',
      titleAr: '',
      imageUrl: '',
      linkUrl: '',
      isActive: true,
    });
  };

  const handleCreateSlider = () => {
    if (sliderImages.length >= 3) {
      toast({ title: 'Error', description: 'Maximum 3 slider images allowed', variant: 'destructive' });
      return;
    }
    createSliderMutation.mutate({
      imageUrl: sliderFormData.imageUrl,
      sortOrder: sliderFormData.sortOrder,
      isActive: sliderFormData.isActive,
    });
  };

  const handleUpdateSlider = () => {
    if (!editingSlider) return;
    updateSliderMutation.mutate({
      id: editingSlider.id,
      data: {
        imageUrl: sliderFormData.imageUrl,
        sortOrder: sliderFormData.sortOrder,
        isActive: sliderFormData.isActive,
      },
    });
  };

  const handleCreateBanner = () => {
    createBannerMutation.mutate({
      title: { en: bannerFormData.titleEn, ar: bannerFormData.titleAr },
      imageUrl: bannerFormData.imageUrl,
      linkUrl: bannerFormData.linkUrl || undefined,
      isActive: bannerFormData.isActive,
    });
  };

  const handleUpdateBanner = () => {
    if (!editingBanner) return;
    updateBannerMutation.mutate({
      id: editingBanner.id,
      data: {
        title: { en: bannerFormData.titleEn, ar: bannerFormData.titleAr },
        imageUrl: bannerFormData.imageUrl,
        linkUrl: bannerFormData.linkUrl || undefined,
        isActive: bannerFormData.isActive,
      },
    });
  };

  const handleEditSlider = (slider: SliderImage) => {
    setEditingSlider(slider);
    setSliderFormData({
      imageUrl: slider.imageUrl,
      sortOrder: slider.sortOrder,
      isActive: slider.isActive,
    });
    setIsSliderDialogOpen(true);
  };

  const handleEditBanner = (banner: Banner) => {
    setEditingBanner(banner);
    setBannerFormData({
      titleEn: banner.title.en,
      titleAr: banner.title.ar,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      isActive: banner.isActive,
    });
    setIsBannerDialogOpen(true);
  };

  const moveSliderImage = (index: number, direction: 'up' | 'down') => {
    const sortedImages = [...sliderImages].sort((a, b) => a.sortOrder - b.sortOrder);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedImages.length - 1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [sortedImages[index], sortedImages[newIndex]] = [sortedImages[newIndex], sortedImages[index]];
    
    const imageIds = sortedImages.map(img => img.id);
    reorderSliderMutation.mutate(imageIds);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Mobile Content Management</h1>
      </div>

      <Tabs defaultValue="slider" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="slider" data-testid="tab-slider">Home Slider</TabsTrigger>
          <TabsTrigger value="banner" data-testid="tab-banner">Home Banner</TabsTrigger>
        </TabsList>

        {/* Slider Tab */}
        <TabsContent value="slider">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle data-testid="text-slider-title">Home Slider Images (Max 3)</CardTitle>
              <Dialog open={isSliderDialogOpen} onOpenChange={(open) => {
                setIsSliderDialogOpen(open);
                if (!open) {
                  setEditingSlider(null);
                  resetSliderForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-slider" disabled={sliderImages.length >= 3}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Slider Image
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle data-testid="text-dialog-title">
                      {editingSlider ? 'Edit Slider Image' : 'Add Slider Image'}
                    </DialogTitle>
                    <DialogDescription>
                      Upload an image for the home slider. Recommended size: 1920x1080px
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="slider-image">Image</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="slider-image-file"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'slider')}
                          disabled={uploading}
                          data-testid="input-slider-image-file"
                        />
                        {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                      </div>
                      {sliderFormData.imageUrl && (
                        <div className="mt-2 border rounded-lg overflow-hidden" data-testid="img-slider-preview">
                          <ImageWithFallback
                            src={sliderFormData.imageUrl}
                            alt="Slider preview"
                            className="w-full h-32 object-cover"
                            fallbackType="placeholder"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slider-order">Sort Order</Label>
                      <Input
                        id="slider-order"
                        type="number"
                        min={1}
                        max={3}
                        value={sliderFormData.sortOrder}
                        onChange={(e) => setSliderFormData({ ...sliderFormData, sortOrder: parseInt(e.target.value) })}
                        data-testid="input-slider-order"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="slider-active"
                        checked={sliderFormData.isActive}
                        onCheckedChange={(checked) => setSliderFormData({ ...sliderFormData, isActive: checked })}
                        data-testid="switch-slider-active"
                      />
                      <Label htmlFor="slider-active">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={editingSlider ? handleUpdateSlider : handleCreateSlider}
                      disabled={!sliderFormData.imageUrl || createSliderMutation.isPending || updateSliderMutation.isPending}
                      data-testid="button-submit-slider"
                    >
                      {editingSlider ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {sliderLoading ? (
                <div className="text-center py-8" data-testid="text-slider-loading">Loading...</div>
              ) : sliderImages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-slider-empty">
                  No slider images yet. Add up to 3 images.
                </div>
              ) : (
                <div className="space-y-4">
                  {[...sliderImages].sort((a, b) => a.sortOrder - b.sortOrder).map((slider, index) => (
                    <div key={slider.id} className="flex items-center gap-4 p-4 border rounded-lg" data-testid={`slider-item-${slider.id}`}>
                      <div className="w-24 h-16 border rounded overflow-hidden flex-shrink-0">
                        <ImageWithFallback
                          src={slider.imageUrl}
                          alt={`Slider ${slider.sortOrder}`}
                          className="w-full h-full object-cover"
                          fallbackType="placeholder"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">Position {slider.sortOrder}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(slider.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <Badge variant={slider.isActive ? 'default' : 'secondary'} data-testid={`badge-slider-status-${slider.id}`}>
                        {slider.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveSliderImage(index, 'up')}
                          disabled={index === 0}
                          data-testid={`button-move-up-${slider.id}`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => moveSliderImage(index, 'down')}
                          disabled={index === sliderImages.length - 1}
                          data-testid={`button-move-down-${slider.id}`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSlider(slider)}
                          data-testid={`button-edit-slider-${slider.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteSliderMutation.mutate(slider.id)}
                          data-testid={`button-delete-slider-${slider.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banner Tab */}
        <TabsContent value="banner">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle data-testid="text-banner-title">Home Banner</CardTitle>
              <Dialog open={isBannerDialogOpen} onOpenChange={(open) => {
                setIsBannerDialogOpen(open);
                if (!open) {
                  setEditingBanner(null);
                  resetBannerForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-banner">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Banner
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle data-testid="text-banner-dialog-title">
                      {editingBanner ? 'Edit Banner' : 'Add Banner'}
                    </DialogTitle>
                    <DialogDescription>
                      Create a banner for the home screen with bilingual title
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="banner-title-en">Title (English)</Label>
                      <Input
                        id="banner-title-en"
                        value={bannerFormData.titleEn}
                        onChange={(e) => setBannerFormData({ ...bannerFormData, titleEn: e.target.value })}
                        placeholder="Special Offer"
                        data-testid="input-banner-title-en"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-title-ar">Title (Arabic)</Label>
                      <Input
                        id="banner-title-ar"
                        value={bannerFormData.titleAr}
                        onChange={(e) => setBannerFormData({ ...bannerFormData, titleAr: e.target.value })}
                        placeholder="عرض خاص"
                        dir="rtl"
                        data-testid="input-banner-title-ar"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-image">Image</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="banner-image-file"
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'banner')}
                          disabled={uploading}
                          data-testid="input-banner-image-file"
                        />
                        {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                      </div>
                      {bannerFormData.imageUrl && (
                        <div className="mt-2 border rounded-lg overflow-hidden" data-testid="img-banner-preview">
                          <ImageWithFallback
                            src={bannerFormData.imageUrl}
                            alt="Banner preview"
                            className="w-full h-32 object-cover"
                            fallbackType="placeholder"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="banner-link">Link URL (Optional)</Label>
                      <Input
                        id="banner-link"
                        value={bannerFormData.linkUrl}
                        onChange={(e) => setBannerFormData({ ...bannerFormData, linkUrl: e.target.value })}
                        placeholder="https://..."
                        data-testid="input-banner-link"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="banner-active"
                        checked={bannerFormData.isActive}
                        onCheckedChange={(checked) => setBannerFormData({ ...bannerFormData, isActive: checked })}
                        data-testid="switch-banner-active"
                      />
                      <Label htmlFor="banner-active">Active</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={editingBanner ? handleUpdateBanner : handleCreateBanner}
                      disabled={!bannerFormData.titleEn || !bannerFormData.titleAr || !bannerFormData.imageUrl || createBannerMutation.isPending || updateBannerMutation.isPending}
                      data-testid="button-submit-banner"
                    >
                      {editingBanner ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {bannerLoading ? (
                <div className="text-center py-8" data-testid="text-banner-loading">Loading...</div>
              ) : banners.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-banner-empty">
                  No banners yet. Add a banner to display on the home screen.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Title (EN)</TableHead>
                      <TableHead>Title (AR)</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banners.map((banner) => (
                      <TableRow key={banner.id} data-testid={`banner-row-${banner.id}`}>
                        <TableCell>
                          <div className="w-20 h-12 border rounded overflow-hidden">
                            <ImageWithFallback
                              src={banner.imageUrl}
                              alt={banner.title.en}
                              className="w-full h-full object-cover"
                              fallbackType="placeholder"
                            />
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-banner-title-en-${banner.id}`}>{banner.title.en}</TableCell>
                        <TableCell data-testid={`text-banner-title-ar-${banner.id}`} dir="rtl">{banner.title.ar}</TableCell>
                        <TableCell data-testid={`text-banner-link-${banner.id}`}>
                          {banner.linkUrl ? (
                            <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              {banner.linkUrl.substring(0, 30)}...
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={banner.isActive ? 'default' : 'secondary'} data-testid={`badge-banner-status-${banner.id}`}>
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-banner-created-${banner.id}`}>
                          {format(new Date(banner.createdAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditBanner(banner)}
                              data-testid={`button-edit-banner-${banner.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteBannerMutation.mutate(banner.id)}
                              data-testid={`button-delete-banner-${banner.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
