import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function AdminQuotations() {
  const { data: quotationsData, isLoading } = useQuery({
    queryKey: ['/api/v2/admin/quotations'],
  });

  const quotations = quotationsData?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading quotations...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-title">Quotations Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Quotations ({quotations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>VAT</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="text-muted-foreground">
                      No quotations found.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation: any) => (
                  <TableRow key={quotation.id} data-testid={`row-quotation-${quotation.id}`}>
                    <TableCell className="font-mono text-xs">{quotation.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{quotation.booking_id?.slice(0, 8)}</TableCell>
                    <TableCell>{quotation.amount} SAR</TableCell>
                    <TableCell>{quotation.vat_amount} SAR</TableCell>
                    <TableCell className="font-medium">{quotation.total_amount} SAR</TableCell>
                    <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                    <TableCell>
                      {quotation.created_at && format(new Date(quotation.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
