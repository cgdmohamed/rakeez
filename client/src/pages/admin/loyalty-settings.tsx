import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Gift, Users, Percent, Clock, Save, RotateCcw, Info } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const DEFAULT_SETTINGS = {
  welcome_bonus_amount: 20,
  first_booking_bonus_amount: 30,
  referrer_reward_amount: 50,
  referee_reward_amount: 30,
  cashback_percentage: 2,
  credit_expiry_days: 90,
  max_credit_percentage: 30,
  min_booking_for_credit: 50,
  is_active: true
};

const loyaltySettingsSchema = z.object({
  welcome_bonus_amount: z.coerce.number().min(0, 'Must be at least 0').max(10000, 'Cannot exceed 10000'),
  first_booking_bonus_amount: z.coerce.number().min(0, 'Must be at least 0').max(10000, 'Cannot exceed 10000'),
  referrer_reward_amount: z.coerce.number().min(0, 'Must be at least 0').max(10000, 'Cannot exceed 10000'),
  referee_reward_amount: z.coerce.number().min(0, 'Must be at least 0').max(10000, 'Cannot exceed 10000'),
  cashback_percentage: z.coerce.number().min(0, 'Must be at least 0').max(50, 'Cannot exceed 50'),
  credit_expiry_days: z.coerce.number().min(1, 'Must be at least 1 day').max(365, 'Cannot exceed 365 days'),
  max_credit_percentage: z.coerce.number().min(0, 'Must be at least 0').max(100, 'Cannot exceed 100'),
  min_booking_for_credit: z.coerce.number().min(0, 'Must be at least 0').max(10000, 'Cannot exceed 10000'),
  is_active: z.boolean(),
});

type LoyaltySettings = z.infer<typeof loyaltySettingsSchema>;

interface LoyaltySettingsResponse {
  data: LoyaltySettings & { updated_at?: string };
}

export default function AdminLoyaltySettings() {
  const { toast } = useToast();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const { data: settings, isLoading } = useQuery<LoyaltySettingsResponse>({
    queryKey: ['/api/v2/admin/loyalty-settings'],
  });

  const form = useForm<LoyaltySettings>({
    resolver: zodResolver(loyaltySettingsSchema),
    values: settings?.data || DEFAULT_SETTINGS,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: LoyaltySettings) => {
      return apiRequest('PUT', '/api/v2/admin/loyalty-settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/loyalty-settings'] });
      toast({
        title: "Settings Updated",
        description: "Loyalty settings have been updated successfully.",
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

  const onSubmit = (data: LoyaltySettings) => {
    updateSettingsMutation.mutate(data);
  };

  const handleResetToDefaults = () => {
    form.reset(DEFAULT_SETTINGS);
    setResetDialogOpen(false);
    toast({
      title: "Reset to Defaults",
      description: "Settings have been reset to default values. Click Save to apply.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading loyalty settings...</p>
        </div>
      </div>
    );
  }

  const settingsData = settings?.data;
  const lastUpdated = settingsData?.updated_at;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Loyalty Settings</h1>
          <p className="text-foreground/70">Configure loyalty rewards, cashback, and credit settings</p>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </p>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-900">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          Changes to loyalty settings will affect all future customer transactions. Existing credits and rewards will not be modified.
        </AlertDescription>
      </Alert>

      {/* Main Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Welcome Rewards Section */}
          <Card className="animate-in fade-in slide-in-from-bottom-4 hover:shadow-md transition-all duration-300" style={{ animationDelay: '100ms', animationDuration: '500ms' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                <CardTitle>Welcome Rewards</CardTitle>
              </div>
              <CardDescription>Bonus credits awarded to new customers</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
                <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Welcome Bonus:</strong> Credits given immediately upon account creation.
                  <br />
                  <strong>First Booking Bonus:</strong> Additional credits awarded after completing the first booking.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="welcome_bonus_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Welcome Bonus Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="10000"
                            step="1"
                            placeholder={DEFAULT_SETTINGS.welcome_bonus_amount.toString()}
                            data-testid="input-welcome-bonus"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">SAR</span>
                        </div>
                      </FormControl>
                      <FormDescription>Credits given when customer creates account (0-10000 SAR)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="first_booking_bonus_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Booking Bonus Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="10000"
                            step="1"
                            placeholder={DEFAULT_SETTINGS.first_booking_bonus_amount.toString()}
                            data-testid="input-first-booking-bonus"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">SAR</span>
                        </div>
                      </FormControl>
                      <FormDescription>Credits given after first booking completion (0-10000 SAR)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Referral Rewards Section */}
          <Card className="animate-in fade-in slide-in-from-bottom-4 hover:shadow-md transition-all duration-300" style={{ animationDelay: '200ms', animationDuration: '500ms' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Referral Rewards</CardTitle>
              </div>
              <CardDescription>Credits awarded through the referral program</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-900">
                <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <AlertDescription className="text-purple-800 dark:text-purple-200">
                  <strong>Referrer Reward:</strong> Credits given to the customer who shares their referral code.
                  <br />
                  <strong>Referee Reward:</strong> Credits given to the new customer who uses a referral code.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="referrer_reward_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referrer Reward Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="10000"
                            step="1"
                            placeholder={DEFAULT_SETTINGS.referrer_reward_amount.toString()}
                            data-testid="input-referrer-reward"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">SAR</span>
                        </div>
                      </FormControl>
                      <FormDescription>Credits for customer who refers (0-10000 SAR)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referee_reward_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referee Reward Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="10000"
                            step="1"
                            placeholder={DEFAULT_SETTINGS.referee_reward_amount.toString()}
                            data-testid="input-referee-reward"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">SAR</span>
                        </div>
                      </FormControl>
                      <FormDescription>Credits for new customer using referral code (0-10000 SAR)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Loyalty Cashback Section */}
          <Card className="animate-in fade-in slide-in-from-bottom-4 hover:shadow-md transition-all duration-300" style={{ animationDelay: '300ms', animationDuration: '500ms' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-primary" />
                <CardTitle>Loyalty Cashback</CardTitle>
              </div>
              <CardDescription>Percentage of booking amount returned as credits</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900">
                <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                  Customers earn credits back on each completed booking. For example, a 2% cashback on a 500 SAR booking gives 10 SAR in credits.
                </AlertDescription>
              </Alert>

              <div className="max-w-md">
                <FormField
                  control={form.control}
                  name="cashback_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cashback Percentage</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="50"
                            step="0.1"
                            placeholder={DEFAULT_SETTINGS.cashback_percentage.toString()}
                            data-testid="input-cashback-percentage"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                        </div>
                      </FormControl>
                      <FormDescription>Percentage of booking amount returned as credits (0-50%)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Credit Settings Section */}
          <Card className="animate-in fade-in slide-in-from-bottom-4 hover:shadow-md transition-all duration-300" style={{ animationDelay: '400ms', animationDuration: '500ms' }}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Credit Settings</CardTitle>
              </div>
              <CardDescription>Configure credit expiration and usage limits</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4 border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-900">
                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  <strong>Expiry Days:</strong> How long credits remain valid before expiring.
                  <br />
                  <strong>Max Credit %:</strong> Maximum percentage of booking that can be paid with credits.
                  <br />
                  <strong>Min Booking:</strong> Minimum booking amount required to use credits.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="credit_expiry_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Expiry Days</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            max="365"
                            step="1"
                            placeholder={DEFAULT_SETTINGS.credit_expiry_days.toString()}
                            data-testid="input-credit-expiry-days"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">days</span>
                        </div>
                      </FormControl>
                      <FormDescription>Days until credits expire (1-365 days)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_credit_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Credit Percentage</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            placeholder={DEFAULT_SETTINGS.max_credit_percentage.toString()}
                            data-testid="input-max-credit-percentage"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">%</span>
                        </div>
                      </FormControl>
                      <FormDescription>Max % of booking payable with credits (0-100%)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="min_booking_for_credit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Booking for Credit</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="10000"
                            step="1"
                            placeholder={DEFAULT_SETTINGS.min_booking_for_credit.toString()}
                            data-testid="input-min-booking-for-credit"
                          />
                          <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">SAR</span>
                        </div>
                      </FormControl>
                      <FormDescription>Minimum booking amount to use credits (0-10000 SAR)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status Section */}
          <Card className="animate-in fade-in slide-in-from-bottom-4 hover:shadow-md transition-all duration-300" style={{ animationDelay: '500ms', animationDuration: '500ms' }}>
            <CardHeader>
              <CardTitle>Loyalty Program Status</CardTitle>
              <CardDescription>Enable or disable the entire loyalty program</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Loyalty Program Active</FormLabel>
                      <FormDescription>
                        When disabled, customers will not earn or be able to use credits
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: '600ms', animationDuration: '500ms' }}>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetDialogOpen(true)}
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-reset-defaults"
                  className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                  className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95"
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to Default Settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset all loyalty settings to their default values:
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Welcome Bonus: {DEFAULT_SETTINGS.welcome_bonus_amount} SAR</li>
                <li>• First Booking Bonus: {DEFAULT_SETTINGS.first_booking_bonus_amount} SAR</li>
                <li>• Referrer Reward: {DEFAULT_SETTINGS.referrer_reward_amount} SAR</li>
                <li>• Referee Reward: {DEFAULT_SETTINGS.referee_reward_amount} SAR</li>
                <li>• Cashback: {DEFAULT_SETTINGS.cashback_percentage}%</li>
                <li>• Credit Expiry: {DEFAULT_SETTINGS.credit_expiry_days} days</li>
                <li>• Max Credit: {DEFAULT_SETTINGS.max_credit_percentage}%</li>
                <li>• Min Booking: {DEFAULT_SETTINGS.min_booking_for_credit} SAR</li>
              </ul>
              <p className="mt-2">You will need to click Save to apply these changes.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetToDefaults}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
