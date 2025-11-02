import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Percent, Gift, Heart, Users, Save, Info, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface MarketingSettings {
  couponSystemEnabled: boolean;
  creditSystemEnabled: boolean;
  referralSystemEnabled: boolean;
  loyaltyProgramEnabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export default function AdminMarketingSettings() {
  const { toast } = useToast();
  const [pendingChanges, setPendingChanges] = useState<Partial<MarketingSettings>>({});

  const { data: settings, isLoading } = useQuery<{ data: MarketingSettings }>({
    queryKey: ['/api/v2/admin/marketing/settings'],
  });

  const { data: analytics } = useQuery<{ data: any }>({
    queryKey: ['/api/v2/admin/analytics'],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<MarketingSettings>) => {
      return apiRequest('PATCH', '/api/v2/admin/marketing/settings', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/marketing/settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/analytics'] });
      setPendingChanges({});
      toast({
        title: "Settings Updated",
        description: "Marketing settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (key: keyof MarketingSettings, value: boolean) => {
    setPendingChanges({ ...pendingChanges, [key]: value });
  };

  const handleSave = () => {
    if (Object.keys(pendingChanges).length > 0) {
      updateSettingsMutation.mutate(pendingChanges);
    }
  };

  const handleCancel = () => {
    setPendingChanges({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading marketing settings...</p>
        </div>
      </div>
    );
  }

  const currentSettings = {
    ...settings?.data,
    ...pendingChanges,
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;
  const lastUpdated = settings?.data?.updatedAt;

  const marketingStats = analytics?.data?.marketing;
  const activeCoupons = marketingStats?.coupons?.activeCoupons || 0;
  const usersWithCredits = marketingStats?.credits?.activeUsers || 0;
  const totalReferrals = analytics?.data?.recentActivity?.filter((a: any) => a.resourceType === 'referral').length || 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Marketing Settings</h1>
          <p className="text-foreground/70">Control marketing features system-wide</p>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </p>
          )}
        </div>
        {hasPendingChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save"
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-300">
          These settings control marketing features globally. When disabled, features will be unavailable to all users.
        </AlertDescription>
      </Alert>

      {/* Marketing System Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Coupon System */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-600" />
              Coupon System
            </CardTitle>
            <CardDescription>
              Control coupon code functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Coupon System</p>
                <p className="text-sm text-muted-foreground">
                  Allow users to redeem coupon codes
                </p>
              </div>
              <Switch
                checked={currentSettings.couponSystemEnabled ?? true}
                onCheckedChange={(checked) => handleToggle('couponSystemEnabled', checked)}
                data-testid="switch-coupon-system"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active Coupons</span>
                <span className="font-semibold">{activeCoupons}</span>
              </div>
              <Link href="/admin/coupons">
                <Button variant="outline" size="sm" className="w-full" data-testid="link-view-coupons">
                  View Coupons
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Credit System */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-accent" />
              Credit System
            </CardTitle>
            <CardDescription>
              Control promotional credits functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Credit System</p>
                <p className="text-sm text-muted-foreground">
                  Allow granting and using promotional credits
                </p>
              </div>
              <Switch
                checked={currentSettings.creditSystemEnabled ?? true}
                onCheckedChange={(checked) => handleToggle('creditSystemEnabled', checked)}
                data-testid="switch-credit-system"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Users with Credits</span>
                <span className="font-semibold">{usersWithCredits}</span>
              </div>
              <Link href="/admin/loyalty-settings">
                <Button variant="outline" size="sm" className="w-full" data-testid="link-view-credits">
                  View Credit Settings
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Referral System */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Referral System
            </CardTitle>
            <CardDescription>
              Control referral program functionality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Referral System</p>
                <p className="text-sm text-muted-foreground">
                  Allow users to refer new customers
                </p>
              </div>
              <Switch
                checked={currentSettings.referralSystemEnabled ?? true}
                onCheckedChange={(checked) => handleToggle('referralSystemEnabled', checked)}
                data-testid="switch-referral-system"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Referrals</span>
                <span className="font-semibold">{totalReferrals}</span>
              </div>
              <Link href="/admin/promos">
                <Button variant="outline" size="sm" className="w-full" data-testid="link-view-referrals">
                  View Referrals
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Program */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-600" />
              Loyalty Program
            </CardTitle>
            <CardDescription>
              Control automated loyalty rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Loyalty Program</p>
                <p className="text-sm text-muted-foreground">
                  Grant automatic rewards (welcome, cashback, etc.)
                </p>
              </div>
              <Switch
                checked={currentSettings.loyaltyProgramEnabled ?? true}
                onCheckedChange={(checked) => handleToggle('loyaltyProgramEnabled', checked)}
                data-testid="switch-loyalty-program"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Program Status</span>
                <span className="font-semibold">
                  {currentSettings.loyaltyProgramEnabled ? 'Active' : 'Inactive'}
                </span>
              </div>
              <Link href="/admin/loyalty-settings">
                <Button variant="outline" size="sm" className="w-full" data-testid="link-view-loyalty">
                  Configure Loyalty
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning for Disabled Features */}
      {(!currentSettings.couponSystemEnabled || 
        !currentSettings.creditSystemEnabled || 
        !currentSettings.referralSystemEnabled || 
        !currentSettings.loyaltyProgramEnabled) && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900">
          <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <AlertDescription className="text-orange-800 dark:text-orange-300">
            <strong>Warning:</strong> One or more marketing systems are disabled. Users will not be able to use disabled features.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
