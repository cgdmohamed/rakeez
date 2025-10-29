import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { User, Lock, Mail, Calendar, Shield, Save, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { formatDistanceToNow } from 'date-fns';

const profileUpdateSchema = z.object({
  nameEn: z.string().min(2, 'English name must be at least 2 characters'),
  nameAr: z.string().min(2, 'Arabic name must be at least 2 characters'),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
type PasswordChange = z.infer<typeof passwordChangeSchema>;

export default function AdminMyProfile() {
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const userId = localStorage.getItem('user_id');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/v2/admin/users', userId],
    enabled: !!userId,
  });

  const profileForm = useForm<ProfileUpdate>({
    resolver: zodResolver(profileUpdateSchema),
    values: {
      nameEn: profile?.data?.nameEn || '',
      nameAr: profile?.data?.nameAr || '',
    },
  });

  const passwordForm = useForm<PasswordChange>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      return apiRequest('PATCH', `/api/v2/admin/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/users', userId] });
      setIsEditingProfile(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      return apiRequest('POST', '/api/v2/auth/change-password', data);
    },
    onSuccess: () => {
      passwordForm.reset();
      setIsChangingPassword(false);
      toast({
        title: "Password Changed",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileUpdate) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordChange) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const user = profile?.data;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary" data-testid="text-title">My Profile</h1>
          <p className="text-foreground/70">Manage your account settings and preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information Card */}
        <Card className="md:col-span-1 animate-in fade-in slide-in-from-bottom-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300" style={{ animationDelay: '100ms', animationDuration: '500ms' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              {!isEditingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                  data-testid="button-edit-profile"
                  className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                >
                  Edit Profile
                </Button>
              )}
            </div>
            <CardDescription>Your personal and account information</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="nameEn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (English)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John Doe" data-testid="input-name-en" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={profileForm.control}
                    name="nameAr"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name (Arabic)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="جون دو" dir="rtl" data-testid="input-name-ar" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                      className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditingProfile(false);
                        profileForm.reset();
                      }}
                      data-testid="button-cancel-profile"
                      className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Name (English)</Label>
                  <p className="text-sm font-medium mt-1" data-testid="text-name-en">{user?.nameEn}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Name (Arabic)</Label>
                  <p className="text-sm font-medium mt-1" dir="rtl" data-testid="text-name-ar">{user?.nameAr}</p>
                </div>
                <Separator />
                <div>
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </Label>
                  <p className="text-sm font-medium mt-1" data-testid="text-email">{user?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Role
                  </Label>
                  <Badge variant="secondary" className="mt-1">
                    {user?.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Member Since
                  </Label>
                  <p className="text-sm font-medium mt-1">
                    {user?.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card className="md:col-span-1 animate-in fade-in slide-in-from-bottom-4 hover:shadow-md hover:-translate-y-1 transition-all duration-300" style={{ animationDelay: '200ms', animationDuration: '500ms' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Password & Security</CardTitle>
            </div>
            <CardDescription>Update your password to keep your account secure</CardDescription>
          </CardHeader>
          <CardContent>
            {!isChangingPassword ? (
              <Button
                variant="outline"
                onClick={() => setIsChangingPassword(true)}
                data-testid="button-change-password"
                className="w-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
              >
                <Lock className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            ) : (
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showCurrentPassword ? 'text' : 'password'}
                              placeholder="Enter current password"
                              data-testid="input-current-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showNewPassword ? 'text' : 'password'}
                              placeholder="Enter new password"
                              data-testid="input-new-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Must be 8+ characters with uppercase, lowercase, number, and special character
                        </p>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirm new password"
                              data-testid="input-confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      data-testid="button-save-password"
                      className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsChangingPassword(false);
                        passwordForm.reset();
                      }}
                      data-testid="button-cancel-password"
                      className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
