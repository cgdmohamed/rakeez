import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  User, 
  Star, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  BarChart3,
  Settings,
  Award,
  Navigation,
  AlertCircle
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";

export default function TechnicianProfile() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/v2/admin/technicians/${id}/profile`],
    enabled: !!id,
  });
  
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: [`/api/v2/admin/technicians/${id}/performance`],
    enabled: !!id,
  });
  
  const { data: assignmentsData, isLoading: assignmentsLoading } = useQuery({
    queryKey: [`/api/v2/admin/technicians/${id}/assignments`],
    enabled: !!id,
  });
  
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/v2/admin/technicians/${id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update availability');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/technicians/${id}/profile`] });
      toast({
        title: "Success",
        description: "Technician availability updated successfully",
      });
      setIsAvailabilityDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    },
  });
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/v2/admin/technicians/${id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v2/admin/technicians/${id}/profile`] });
      toast({
        title: "Success",
        description: "Technician profile updated successfully",
      });
      setIsProfileDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });
  
  if (profileLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  
  if (!(profileData as any)?.data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Technician not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const technician = (profileData as any).data;
  const performance = (performanceData as any)?.data;
  
  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
      suspended: "bg-red-100 text-red-800",
    };
    return <Badge className={variants[status] || variants.inactive}>{status}</Badge>;
  };
  
  const getAvailabilityBadge = (status: string) => {
    const variants: Record<string, { bg: string; icon: any }> = {
      available: { bg: "bg-green-100 text-green-800", icon: CheckCircle2 },
      busy: { bg: "bg-yellow-100 text-yellow-800", icon: Clock },
      on_job: { bg: "bg-blue-100 text-blue-800", icon: Activity },
      off_duty: { bg: "bg-gray-100 text-gray-800", icon: XCircle },
    };
    const config = variants[status] || variants.off_duty;
    const Icon = config.icon;
    return (
      <Badge className={config.bg}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-technician-profile">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Technician Profile</h1>
          <p className="text-gray-500">Comprehensive view of technician performance and availability</p>
        </div>
        <Button variant="outline" onClick={() => window.history.back()} data-testid="button-back">
          Back to List
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Technician Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={technician.avatar} />
                <AvatarFallback className="text-2xl">{technician.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold" data-testid="text-technician-name">{technician.name}</h2>
              {technician.nameAr && (
                <p className="text-gray-500">{technician.nameAr}</p>
              )}
              <div className="flex gap-2 mt-2">
                {getStatusBadge(technician.status)}
                {getAvailabilityBadge(technician.availabilityStatus || 'off_duty')}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span data-testid="text-email">{technician.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span data-testid="text-phone">{technician.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>Service Radius: {technician.serviceRadius || 50} km</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>Max Daily Jobs: {technician.maxDailyBookings || 8}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setIsProfileDialogOpen(true)}
                data-testid="button-edit-profile"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setIsAvailabilityDialogOpen(true)}
                data-testid="button-edit-availability"
              >
                <Clock className="h-4 w-4 mr-2" />
                Manage Availability
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600" data-testid="text-total-completed">
                  {technician.performance?.totalCompleted || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Completed Jobs</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                  <span className="text-3xl font-bold text-green-600" data-testid="text-avg-rating">
                    {technician.performance?.averageRating?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">Average Rating</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600" data-testid="text-active-bookings">
                  {technician.performance?.activeBookings || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">Active Bookings</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600" data-testid="text-completion-rate">
                  {technician.performance?.completionRate?.toFixed(0) || 0}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Completion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
          <TabsTrigger value="availability" data-testid="tab-availability">Availability</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
          <TabsTrigger value="certifications" data-testid="tab-certifications">Certifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Detailed performance statistics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : performance ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Jobs</p>
                      <p className="text-2xl font-bold">{performance.overall.totalJobs}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{performance.overall.completedJobs}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cancelled</p>
                      <p className="text-2xl font-bold text-red-600">{performance.overall.cancelledJobs}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Avg Response Time</p>
                      <p className="text-2xl font-bold">{performance.overall.averageResponseTime.toFixed(1)}h</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Monthly Performance</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={performance.monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="completed" fill="#10b981" name="Completed" />
                        <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Completion Rate</p>
                      <Progress value={performance.overall.completionRate} className="h-2" />
                      <p className="text-sm text-right mt-1">{performance.overall.completionRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Cancellation Rate</p>
                      <Progress value={performance.overall.cancellationRate} className="h-2 bg-red-100" />
                      <p className="text-sm text-right mt-1">{performance.overall.cancellationRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500">No performance data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Availability Settings</CardTitle>
              <CardDescription>Working hours, days off, and service area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Current Status</h3>
                  {getAvailabilityBadge(technician.availabilityStatus || 'off_duty')}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Working Hours</h3>
                  {technician.workingHours ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(technician.workingHours as Record<string, any>).map(([day, hours]) => (
                        <div key={day} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium capitalize">{day}</span>
                          <span className="text-sm text-gray-600">
                            {hours.enabled ? `${hours.start} - ${hours.end}` : 'Off'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No working hours configured</p>
                  )}
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Service Area</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Service Radius</p>
                      <p className="text-xl font-bold text-blue-600">{technician.serviceRadius || 50} km</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Home Location</p>
                      <p className="text-sm font-medium">
                        {technician.homeLatitude && technician.homeLongitude 
                          ? `${parseFloat(technician.homeLatitude).toFixed(4)}, ${parseFloat(technician.homeLongitude).toFixed(4)}`
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Days Off</h3>
                  {technician.daysOff && (technician.daysOff as any[]).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(technician.daysOff as any[]).map((date, idx) => (
                        <Badge key={idx} variant="outline">{date}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No days off scheduled</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment History</CardTitle>
              <CardDescription>Recent assignment decisions and scores</CardDescription>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (assignmentsData as any)?.data && (assignmentsData as any).data.length > 0 ? (
                <div className="space-y-3">
                  {(assignmentsData as any).data.map((assignment: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={assignment.assignmentMethod === 'auto' ? 'default' : 'secondary'}>
                            {assignment.assignmentMethod}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(assignment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {assignment.totalScore && (
                          <Badge variant="outline" className="text-blue-600">
                            Score: {assignment.totalScore}
                          </Badge>
                        )}
                      </div>
                      {assignment.distanceKm && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Distance</p>
                            <p className="font-medium">{assignment.distanceKm} km</p>
                          </div>
                          {assignment.workloadScore && (
                            <div>
                              <p className="text-gray-500">Workload</p>
                              <p className="font-medium">{assignment.workloadScore}/100</p>
                            </div>
                          )}
                          {assignment.availabilityScore && (
                            <div>
                              <p className="text-gray-500">Availability</p>
                              <p className="font-medium">{assignment.availabilityScore}/100</p>
                            </div>
                          )}
                          {assignment.skillScore && (
                            <div>
                              <p className="text-gray-500">Skill</p>
                              <p className="font-medium">{assignment.skillScore}/100</p>
                            </div>
                          )}
                          {assignment.performanceScore && (
                            <div>
                              <p className="text-gray-500">Performance</p>
                              <p className="font-medium">{assignment.performanceScore}/100</p>
                            </div>
                          )}
                        </div>
                      )}
                      {assignment.adminNotes && (
                        <p className="text-sm text-gray-600 mt-2">
                          <span className="font-medium">Notes:</span> {assignment.adminNotes}
                        </p>
                      )}
                      {assignment.rejectionReason && (
                        <p className="text-sm text-red-600 mt-2">
                          <span className="font-medium">Rejected:</span> {assignment.rejectionReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No assignment history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="certifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Certifications & Training</CardTitle>
              <CardDescription>Professional certifications and qualifications</CardDescription>
            </CardHeader>
            <CardContent>
              {technician.certifications && (technician.certifications as any[]).length > 0 ? (
                <div className="space-y-4">
                  {(technician.certifications as any[]).map((cert, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Award className="h-5 w-5 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold">{cert.name}</h3>
                          <p className="text-sm text-gray-600">{cert.issuer}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>Issued: {cert.issuedDate}</span>
                            {cert.expiryDate && <span>Expires: {cert.expiryDate}</span>}
                          </div>
                          {cert.certificateNumber && (
                            <p className="text-xs text-gray-400 mt-1">
                              Certificate #: {cert.certificateNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No certifications added</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Availability</DialogTitle>
            <DialogDescription>
              Update technician availability settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Availability Status</Label>
              <Select defaultValue={technician.availabilityStatus || 'off_duty'}>
                <SelectTrigger data-testid="select-availability-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available" data-testid="option-available">Available</SelectItem>
                  <SelectItem value="busy" data-testid="option-busy">Busy</SelectItem>
                  <SelectItem value="on_job" data-testid="option-on-job">On Job</SelectItem>
                  <SelectItem value="off_duty" data-testid="option-off-duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Radius (km)</Label>
              <Input 
                type="number" 
                defaultValue={technician.serviceRadius || 50}
                data-testid="input-service-radius"
              />
            </div>
            <div>
              <Label>Max Daily Bookings</Label>
              <Input 
                type="number" 
                defaultValue={technician.maxDailyBookings || 8}
                data-testid="input-max-bookings"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAvailabilityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateAvailabilityMutation.mutate({})}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update technician profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input 
                defaultValue={technician.name}
                data-testid="input-name"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input 
                type="email" 
                defaultValue={technician.email}
                data-testid="input-email"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input 
                type="tel" 
                defaultValue={technician.phone}
                data-testid="input-phone"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select defaultValue={technician.status}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" data-testid="option-active">Active</SelectItem>
                  <SelectItem value="inactive" data-testid="option-inactive">Inactive</SelectItem>
                  <SelectItem value="suspended" data-testid="option-suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => updateProfileMutation.mutate({})}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
