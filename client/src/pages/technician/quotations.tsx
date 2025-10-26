import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Calendar, 
  User, 
  DollarSign,
  Clock
} from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TechnicianQuotations() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const queryKey = statusFilter === 'all' 
    ? ['/api/v2/technician/quotations']
    : [`/api/v2/technician/quotations?status=${statusFilter}`];
  
  const { data: quotationsData, isLoading } = useQuery({
    queryKey,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const quotations = quotationsData?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return <Badge className={variants[status] || variants.pending}>{status}</Badge>;
  };

  const stats = {
    total: quotations.length,
    pending: quotations.filter((q: any) => q.status === 'pending').length,
    approved: quotations.filter((q: any) => q.status === 'approved').length,
    rejected: quotations.filter((q: any) => q.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-title">My Quotations</h1>
          <p className="text-muted-foreground">View and manage your quotations</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Quotations</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total">{stats.total}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-pending">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-pending">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-approved">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-approved">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-rejected">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <FileText className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="text-rejected">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          {quotations.length > 0 ? (
            <div className="space-y-3">
              {quotations.map((quotation: any) => (
                <div 
                  key={quotation.id} 
                  className="p-4 border rounded-lg space-y-3"
                  data-testid={`quotation-${quotation.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {quotation.booking?.service?.name?.en || 'Service'}
                        </h3>
                        {getStatusBadge(quotation.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{quotation.booking?.user?.name || 'Customer'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Created: {new Date(quotation.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {quotation.total_cost} SAR
                      </div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Additional Cost</p>
                      <p className="font-medium">{quotation.additional_cost} SAR</p>
                    </div>
                    {quotation.notes && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm">{quotation.notes}</p>
                      </div>
                    )}
                  </div>

                  {quotation.spare_parts && JSON.parse(quotation.spare_parts).length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Spare Parts:</p>
                      <div className="space-y-1">
                        {JSON.parse(quotation.spare_parts).map((part: any, index: number) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>{part.name} (x{part.quantity})</span>
                            <span>{(part.price * part.quantity).toFixed(2)} SAR</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No quotations found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
