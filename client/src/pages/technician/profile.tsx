import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Phone, Save } from 'lucide-react';
import { useState } from 'react';

export default function TechnicianProfile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['/api/v2/profile'],
  });

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', '/api/v2/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/profile'] });
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const profile = profileData?.data;

  const handleEdit = () => {
    setFormData({
      name: profile?.name || '',
      name_ar: profile?.name_ar || '',
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: '',
      name_ar: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="text-title">My Profile</h1>
        {!isEditing && (
          <Button onClick={handleEdit} data-testid="button-edit">
            <User className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profile?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold" data-testid="text-name">{profile?.name}</h2>
              {profile?.name_ar && (
                <p className="text-muted-foreground" data-testid="text-name-ar">{profile.name_ar}</p>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (English)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name_ar">Name (Arabic)</Label>
                  <Input
                    id="name_ar"
                    value={formData.name_ar}
                    onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                    data-testid="input-name-ar"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={updateProfileMutation.isPending}
                    className="flex-1"
                    data-testid="button-save"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                  <span data-testid="text-email">{profile?.email}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-5 w-5" />
                  <span data-testid="text-phone">{profile?.phone}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Role</Label>
              <p className="text-lg font-medium capitalize" data-testid="text-role">{profile?.role}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Account Status</Label>
              <p className="text-lg font-medium" data-testid="text-status">
                {profile?.is_verified ? (
                  <span className="text-green-600">Verified</span>
                ) : (
                  <span className="text-yellow-600">Pending Verification</span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Member Since</Label>
              <p className="text-lg font-medium" data-testid="text-created-at">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Wallet Balance</Label>
              <p className="text-lg font-medium" data-testid="text-wallet">
                {profile?.wallet_balance || '0.00'} SAR
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
