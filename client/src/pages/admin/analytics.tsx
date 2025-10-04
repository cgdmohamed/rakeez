import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AdminAnalytics() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState('analytics');
  const [exportFormat, setExportFormat] = useState('csv');

  const { data: stats } = useQuery({
    queryKey: ['/api/v2/admin/analytics'],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/v2/admin/export/${reportType}?format=${exportFormat}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: 'Export successful',
        description: `${reportType} report downloaded as ${exportFormat}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export report',
        variant: 'destructive',
      });
    },
  });

  const topServices = stats?.data?.top_services || [];
  const technicianPerformance = stats?.data?.technician_performance || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold" data-testid="text-title">Analytics & Reports</h1>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]" data-testid="select-report-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="analytics">Analytics</SelectItem>
              <SelectItem value="bookings">Bookings</SelectItem>
              <SelectItem value="payments">Payments</SelectItem>
              <SelectItem value="technicians">Technicians</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-[120px]" data-testid="select-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            data-testid="button-export"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topServices.map((service: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{service.name}</div>
                    <div className="text-sm text-muted-foreground">{service.orders} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{service.revenue} SAR</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technician Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {technicianPerformance.map((tech: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{tech.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {tech.completed_orders} completed
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">⭐ {tech.avg_rating ? (Number(tech.avg_rating) || 0).toFixed(1) : 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
