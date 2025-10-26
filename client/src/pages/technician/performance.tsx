import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Star,
  DollarSign,
  Clock,
  BarChart3
} from 'lucide-react';
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
} from 'recharts';

export default function TechnicianPerformance() {
  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['/api/v2/technician/performance'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const performance = performanceData?.data;
  const overall = performance?.overall || {};
  const monthlyStats = performance?.monthlyStats || [];
  const recentJobs = performance?.recentCompletedJobs || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-title">Performance & Earnings</h1>
        <p className="text-muted-foreground">Track your performance metrics and earnings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-jobs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-jobs">{overall.totalJobs || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completed-jobs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-completed-jobs">
              {overall.completedJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overall.completionRate?.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-average-rating">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-average-rating">
              {overall.averageRating?.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">Out of 5.0</p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-revenue">
              {overall.totalRevenue?.toFixed(2) || '0.00'} SAR
            </div>
            <p className="text-xs text-muted-foreground">From completed jobs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled Jobs</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-cancelled-jobs">
              {overall.cancelledJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overall.cancellationRate?.toFixed(1)}% cancellation rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-response-time">
              {overall.averageResponseTime?.toFixed(1) || '0.0'}h
            </div>
            <p className="text-xs text-muted-foreground">Time to accept job</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-performance-score">
              {overall.completionRate?.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Based on completion rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#22c55e" name="Completed" />
                <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Revenue (SAR)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentJobs.length > 0 ? (
            <div className="space-y-3">
              {recentJobs.map((job: any) => (
                <div 
                  key={job.id} 
                  className="flex justify-between items-center p-3 border rounded-lg"
                  data-testid={`job-${job.id}`}
                >
                  <div>
                    <p className="font-medium">{job.service?.name?.en || 'Service'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(job.scheduled_date).toLocaleDateString()} at {job.scheduled_time}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {job.total_amount} SAR
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No completed jobs yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
