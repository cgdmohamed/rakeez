import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminCustomers() {
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['/api/v2/admin/users?role=customer'],
  });

  const customers = customersData?.data || [];

  if (isLoading) {
    return <div className="text-center py-8">Loading customers...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-title">Customers Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer: any) => (
                <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.email || 'N/A'}</TableCell>
                  <TableCell>{customer.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.language?.toUpperCase() || 'EN'}</Badge>
                  </TableCell>
                  <TableCell>
                    {customer.is_verified ? (
                      <Badge>Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Not Verified</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {customer.created_at && format(new Date(customer.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
