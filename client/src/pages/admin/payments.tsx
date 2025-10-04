import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function AdminPayments() {
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['/api/v2/admin/payments'],
  });

  const payments = paymentsData?.data || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      completed: 'default',
      failed: 'destructive',
      refunded: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      wallet: 'bg-purple-100 text-purple-800',
      moyasar: 'bg-blue-100 text-blue-800',
      tabby: 'bg-green-100 text-green-800',
    };
    return (
      <Badge className={colors[method] || 'bg-gray-100 text-gray-800'}>
        {method}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading payments...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-title">Payments Tracking</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Payments ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Booking ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Gateway Response</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="text-muted-foreground">
                      No payments found.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment: any) => (
                  <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                    <TableCell className="font-mono text-xs">{payment.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-mono text-xs">{payment.booking_id?.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{payment.amount} SAR</TableCell>
                    <TableCell>{getMethodBadge(payment.payment_method)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.gateway_transaction_id || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {payment.created_at && format(new Date(payment.created_at), 'MMM dd, yyyy HH:mm')}
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
