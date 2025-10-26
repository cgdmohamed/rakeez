import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  MapPin, 
  Calendar,
  Save,
  Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function TechnicianAvailability() {
  const { toast } = useToast();
  
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['/api/v2/profile'],
  });

  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [serviceRadius, setServiceRadius] = useState(50);
  const [maxDailyBookings, setMaxDailyBookings] = useState(10);
  const [homeLatitude, setHomeLatitude] = useState<number | null>(null);
  const [homeLongitude, setHomeLongitude] = useState<number | null>(null);
  const [workingHours, setWorkingHours] = useState<any>({});

  useEffect(() => {
    if (profileData?.data) {
      const profile = profileData.data;
      setAvailabilityStatus(profile.availability_status || 'available');
      setServiceRadius(profile.service_radius || 50);
      setMaxDailyBookings(profile.max_daily_bookings || 10);
      setHomeLatitude(profile.home_latitude ? parseFloat(profile.home_latitude) : null);
      setHomeLongitude(profile.home_longitude ? parseFloat(profile.home_longitude) : null);
      
      // Initialize working hours
      const hours = profile.working_hours || {};
      const initialHours: any = {};
      DAYS_OF_WEEK.forEach(day => {
        initialHours[day.key] = hours[day.key] || {
          enabled: true,
          start: '09:00',
          end: '17:00',
        };
      });
      setWorkingHours(initialHours);
    }
  }, [profileData]);

  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', '/api/v2/technician/availability', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/profile'] });
      toast({
        title: 'Success',
        description: 'Availability settings updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update availability settings',
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

  const handleSave = () => {
    updateAvailabilityMutation.mutate({
      availabilityStatus,
      serviceRadius,
      maxDailyBookings,
      homeLatitude,
      homeLongitude,
      workingHours,
    });
  };

  const updateWorkingHours = (day: string, field: string, value: any) => {
    setWorkingHours({
      ...workingHours,
      [day]: {
        ...workingHours[day],
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-title">Availability Settings</h1>
          <p className="text-muted-foreground">Manage your working hours and availability</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateAvailabilityMutation.isPending}
          data-testid="button-save"
        >
          <Save className="mr-2 h-4 w-4" />
          {updateAvailabilityMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Current Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Availability Status</Label>
              <Select value={availabilityStatus} onValueChange={setAvailabilityStatus}>
                <SelectTrigger id="status" data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="on_job">On Job</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Set your current availability status
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Service Area
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="radius">Service Radius (km)</Label>
              <Input
                id="radius"
                type="number"
                value={serviceRadius}
                onChange={(e) => setServiceRadius(parseInt(e.target.value))}
                data-testid="input-radius"
              />
              <p className="text-sm text-muted-foreground">
                Maximum distance you're willing to travel
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-bookings">Max Daily Bookings</Label>
              <Input
                id="max-bookings"
                type="number"
                value={maxDailyBookings}
                onChange={(e) => setMaxDailyBookings(parseInt(e.target.value))}
                data-testid="input-max-bookings"
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of bookings per day
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Home Location
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="0.000001"
              value={homeLatitude || ''}
              onChange={(e) => setHomeLatitude(parseFloat(e.target.value) || null)}
              placeholder="e.g., 24.7136"
              data-testid="input-latitude"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="0.000001"
              value={homeLongitude || ''}
              onChange={(e) => setHomeLongitude(parseFloat(e.target.value) || null)}
              placeholder="e.g., 46.6753"
              data-testid="input-longitude"
            />
          </div>
          <p className="text-sm text-muted-foreground col-span-2">
            Your home base location for calculating distances to jobs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map((day) => (
              <div 
                key={day.key} 
                className="flex items-center gap-4 p-4 border rounded-lg"
                data-testid={`day-${day.key}`}
              >
                <div className="flex items-center gap-3 w-32">
                  <Switch
                    checked={workingHours[day.key]?.enabled}
                    onCheckedChange={(checked) => updateWorkingHours(day.key, 'enabled', checked)}
                    data-testid={`switch-${day.key}`}
                  />
                  <Label className="font-medium">{day.label}</Label>
                </div>
                
                {workingHours[day.key]?.enabled && (
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${day.key}-start`} className="text-sm">Start:</Label>
                      <Input
                        id={`${day.key}-start`}
                        type="time"
                        value={workingHours[day.key]?.start || '09:00'}
                        onChange={(e) => updateWorkingHours(day.key, 'start', e.target.value)}
                        className="w-32"
                        data-testid={`input-${day.key}-start`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${day.key}-end`} className="text-sm">End:</Label>
                      <Input
                        id={`${day.key}-end`}
                        type="time"
                        value={workingHours[day.key]?.end || '17:00'}
                        onChange={(e) => updateWorkingHours(day.key, 'end', e.target.value)}
                        className="w-32"
                        data-testid={`input-${day.key}-end`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
