import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Award, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ReferralCampaign {
  id: string;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  inviterReward: string;
  inviteeDiscountType: 'percentage' | 'fixed';
  inviteeDiscountValue: string;
  maxUsagePerUser: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
  total_referrals?: number;
  total_rewards_distributed?: number;
}

interface ReferralAnalytics {
  monthly_data: Array<{
    month: string;
    total_referrals: number;
    total_rewards: number;
    total_discounts: number;
  }>;
  top_referrers: Array<{
    user_id: string;
    user_name: string;
    user_email: string;
    total_referrals: number;
    total_rewards: number;
  }>;
  conversion_rate: string;
  total_stats: {
    total_referrals: number;
    completed_referrals: number;
    rewarded_referrals: number;
  };
}

export default function AdminPromos() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ReferralCampaign | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: '',
    inviter_reward: '',
    invitee_discount_type: 'fixed' as 'percentage' | 'fixed',
    invitee_discount_value: '',
    max_usage_per_user: '1',
    valid_from: '',
    valid_until: '',
  });

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['/api/v2/admin/referrals/campaigns'],
    staleTime: 0,
  });

  const { data: analyticsData } = useQuery<{ success: boolean; data: ReferralAnalytics }>({
    queryKey: ['/api/v2/admin/referrals/analytics'],
    staleTime: 0,
  });

  const campaigns: ReferralCampaign[] = campaignsData?.data || [];
  const analytics = analyticsData?.data;

  const filteredCampaigns = campaigns.filter(campaign => {
    if (statusFilter === 'active') return campaign.isActive;
    if (statusFilter === 'inactive') return !campaign.isActive;
    return true;
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest('POST', '/api/v2/admin/referrals/campaigns', {
        name: { en: data.name_en, ar: data.name_ar },
        description: { en: data.description_en, ar: data.description_ar },
        inviter_reward: data.inviter_reward,
        invitee_discount_type: data.invitee_discount_type,
        invitee_discount_value: data.invitee_discount_value,
        max_usage_per_user: parseInt(data.max_usage_per_user),
        valid_from: data.valid_from,
        valid_until: data.valid_until || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/referrals/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/referrals/analytics'] });
      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create campaign',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return apiRequest('PUT', `/api/v2/admin/referrals/campaigns/${id}`, {
        name: data.name_en && data.name_ar ? { en: data.name_en, ar: data.name_ar } : undefined,
        description: data.description_en && data.description_ar ? { en: data.description_en, ar: data.description_ar } : undefined,
        inviter_reward: data.inviter_reward,
        invitee_discount_type: data.invitee_discount_type,
        invitee_discount_value: data.invitee_discount_value,
        max_usage_per_user: data.max_usage_per_user ? parseInt(data.max_usage_per_user) : undefined,
        valid_from: data.valid_from,
        valid_until: data.valid_until || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/referrals/campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/referrals/analytics'] });
      toast({
        title: 'Success',
        description: 'Campaign updated successfully',
      });
      setEditingCampaign(null);
      resetForm();
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update campaign',
        variant: 'destructive',
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest('PUT', `/api/v2/admin/referrals/campaigns/${id}`, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/referrals/campaigns'] });
      toast({
        title: 'Success',
        description: 'Campaign status updated successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update campaign status',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name_en: '',
      name_ar: '',
      description_en: '',
      description_ar: '',
      inviter_reward: '',
      invitee_discount_type: 'fixed',
      invitee_discount_value: '',
      max_usage_per_user: '1',
      valid_from: '',
      valid_until: '',
    });
  };

  const handleEdit = (campaign: ReferralCampaign) => {
    setFormData({
      name_en: campaign.name.en,
      name_ar: campaign.name.ar,
      description_en: campaign.description.en,
      description_ar: campaign.description.ar,
      inviter_reward: campaign.inviterReward,
      invitee_discount_type: campaign.inviteeDiscountType,
      invitee_discount_value: campaign.inviteeDiscountValue,
      max_usage_per_user: campaign.maxUsagePerUser.toString(),
      valid_from: campaign.validFrom ? format(new Date(campaign.validFrom), 'yyyy-MM-dd') : '',
      valid_until: campaign.validUntil ? format(new Date(campaign.validUntil), 'yyyy-MM-dd') : '',
    });
    setEditingCampaign(campaign);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCampaign) {
      updateMutation.mutate({ id: editingCampaign.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="admin-promos-page">
      <div>
        <h1 className="text-3xl font-bold">Referral & Promo Management</h1>
        <p className="text-gray-500">Manage referral campaigns, track analytics, and view performance</p>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Referral Campaigns</CardTitle>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-campaign">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Referral Campaign</DialogTitle>
                    <DialogDescription>
                      Set up a new referral campaign with rewards and discounts
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name_en">Name (English)</Label>
                        <Input
                          id="name_en"
                          data-testid="input-name-en"
                          value={formData.name_en}
                          onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="name_ar">Name (Arabic)</Label>
                        <Input
                          id="name_ar"
                          data-testid="input-name-ar"
                          value={formData.name_ar}
                          onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="description_en">Description (English)</Label>
                        <Textarea
                          id="description_en"
                          data-testid="input-description-en"
                          value={formData.description_en}
                          onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description_ar">Description (Arabic)</Label>
                        <Textarea
                          id="description_ar"
                          data-testid="input-description-ar"
                          value={formData.description_ar}
                          onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="inviter_reward">Inviter Reward (SAR)</Label>
                        <Input
                          id="inviter_reward"
                          data-testid="input-inviter-reward"
                          type="number"
                          step="0.01"
                          value={formData.inviter_reward}
                          onChange={(e) => setFormData({ ...formData, inviter_reward: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="max_usage">Max Usage Per User</Label>
                        <Input
                          id="max_usage"
                          data-testid="input-max-usage"
                          type="number"
                          value={formData.max_usage_per_user}
                          onChange={(e) => setFormData({ ...formData, max_usage_per_user: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="discount_type">Invitee Discount Type</Label>
                        <Select
                          value={formData.invitee_discount_type}
                          onValueChange={(value: 'percentage' | 'fixed') => 
                            setFormData({ ...formData, invitee_discount_type: value })
                          }
                        >
                          <SelectTrigger data-testid="select-discount-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Amount (SAR)</SelectItem>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="discount_value">
                          Invitee Discount {formData.invitee_discount_type === 'percentage' ? '(%)' : '(SAR)'}
                        </Label>
                        <Input
                          id="discount_value"
                          data-testid="input-discount-value"
                          type="number"
                          step="0.01"
                          value={formData.invitee_discount_value}
                          onChange={(e) => setFormData({ ...formData, invitee_discount_value: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="valid_from">Valid From</Label>
                        <Input
                          id="valid_from"
                          data-testid="input-valid-from"
                          type="date"
                          value={formData.valid_from}
                          onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="valid_until">Valid Until (Optional)</Label>
                        <Input
                          id="valid_until"
                          data-testid="input-valid-until"
                          type="date"
                          value={formData.valid_until}
                          onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="submit" data-testid="button-submit-campaign" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campaigns</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {campaignsLoading ? (
                <div className="text-center py-8">Loading campaigns...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Max Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valid Period</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id} data-testid={`campaign-row-${campaign.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.name.en}</div>
                            <div className="text-sm text-gray-500">{campaign.name.ar}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {campaign.inviterReward} SAR
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            {campaign.inviteeDiscountValue}{campaign.inviteeDiscountType === 'percentage' ? '%' : ' SAR'}
                          </Badge>
                        </TableCell>
                        <TableCell>{campaign.maxUsagePerUser}x</TableCell>
                        <TableCell>
                          <Badge variant={campaign.isActive ? 'default' : 'secondary'}>
                            {campaign.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{format(new Date(campaign.validFrom), 'MMM dd, yyyy')}</div>
                          {campaign.validUntil && (
                            <div className="text-gray-500">to {format(new Date(campaign.validUntil), 'MMM dd, yyyy')}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{campaign.total_referrals || 0} referrals</div>
                            <div className="text-gray-500">{campaign.total_rewards_distributed || 0} SAR paid</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(campaign)}
                              data-testid={`button-edit-${campaign.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={campaign.isActive ? 'ghost' : 'outline'}
                              size="sm"
                              onClick={() => toggleStatusMutation.mutate({ id: campaign.id, isActive: !campaign.isActive })}
                              data-testid={`button-toggle-${campaign.id}`}
                            >
                              {campaign.isActive ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {filteredCampaigns.length === 0 && !campaignsLoading && (
                <div className="text-center py-8 text-gray-500">
                  No campaigns found
                </div>
              )}
            </CardContent>
          </Card>

          {editingCampaign && (
            <Dialog open={!!editingCampaign} onOpenChange={() => setEditingCampaign(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Campaign</DialogTitle>
                  <DialogDescription>
                    Update campaign details and settings
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_name_en">Name (English)</Label>
                      <Input
                        id="edit_name_en"
                        value={formData.name_en}
                        onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_name_ar">Name (Arabic)</Label>
                      <Input
                        id="edit_name_ar"
                        value={formData.name_ar}
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_description_en">Description (English)</Label>
                      <Textarea
                        id="edit_description_en"
                        value={formData.description_en}
                        onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_description_ar">Description (Arabic)</Label>
                      <Textarea
                        id="edit_description_ar"
                        value={formData.description_ar}
                        onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_inviter_reward">Inviter Reward (SAR)</Label>
                      <Input
                        id="edit_inviter_reward"
                        type="number"
                        step="0.01"
                        value={formData.inviter_reward}
                        onChange={(e) => setFormData({ ...formData, inviter_reward: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_max_usage">Max Usage Per User</Label>
                      <Input
                        id="edit_max_usage"
                        type="number"
                        value={formData.max_usage_per_user}
                        onChange={(e) => setFormData({ ...formData, max_usage_per_user: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_discount_type">Invitee Discount Type</Label>
                      <Select
                        value={formData.invitee_discount_type}
                        onValueChange={(value: 'percentage' | 'fixed') => 
                          setFormData({ ...formData, invitee_discount_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Amount (SAR)</SelectItem>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="edit_discount_value">
                        Invitee Discount {formData.invitee_discount_type === 'percentage' ? '(%)' : '(SAR)'}
                      </Label>
                      <Input
                        id="edit_discount_value"
                        type="number"
                        step="0.01"
                        value={formData.invitee_discount_value}
                        onChange={(e) => setFormData({ ...formData, invitee_discount_value: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="edit_valid_from">Valid From</Label>
                      <Input
                        id="edit_valid_from"
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit_valid_until">Valid Until (Optional)</Label>
                      <Input
                        id="edit_valid_until"
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? 'Updating...' : 'Update Campaign'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="w-4 h-4 mr-2 text-blue-500" />
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-referrals">
                  {analytics?.total_stats.total_referrals || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {analytics?.total_stats.completed_referrals || 0} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Award className="w-4 h-4 mr-2 text-green-500" />
                  Rewarded
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-rewarded">
                  {analytics?.total_stats.rewarded_referrals || 0}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Successful conversions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                  Conversion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-conversion-rate">
                  {analytics?.conversion_rate || '0'}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Referral success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-orange-500" />
                  Total Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-rewards">
                  {analytics?.monthly_data.reduce((sum, month) => sum + (Number(month.total_rewards) || 0), 0).toFixed(0) || 0} SAR
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total paid out
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Referrals Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.monthly_data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total_referrals" stroke="#3b82f6" name="Referrals" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rewards & Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.monthly_data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total_rewards" fill="#10b981" name="Rewards (SAR)" />
                    <Bar dataKey="total_discounts" fill="#f59e0b" name="Discounts (SAR)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2 text-yellow-500" />
                Top Referrers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Referrals</TableHead>
                    <TableHead>Total Rewards Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.top_referrers.map((referrer, index) => (
                    <TableRow key={referrer.user_id} data-testid={`leaderboard-row-${referrer.user_id}`}>
                      <TableCell>
                        <Badge variant={index === 0 ? 'default' : 'outline'}>
                          #{index + 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{referrer.user_name}</TableCell>
                      <TableCell className="text-gray-500">{referrer.user_email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{referrer.total_referrals}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {referrer.total_rewards} SAR
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {(!analytics?.top_referrers || analytics.top_referrers.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No referrer data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
