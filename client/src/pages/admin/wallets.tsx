import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminWallets() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/wallets'],
  });

  const wallets = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Wallets Management</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          View and manage user wallet balances and transactions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-section-title">All Wallets</CardTitle>
          <CardDescription data-testid="text-section-description">
            {wallets.length} wallets registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-user">User</TableHead>
                  <TableHead data-testid="header-role">Role</TableHead>
                  <TableHead data-testid="header-balance">Balance</TableHead>
                  <TableHead data-testid="header-earned">Total Earned</TableHead>
                  <TableHead data-testid="header-spent">Total Spent</TableHead>
                  <TableHead data-testid="header-created">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wallets.map((wallet: any) => (
                  <TableRow key={wallet.id} data-testid={`row-wallet-${wallet.id}`}>
                    <TableCell>
                      <div>
                        <div className="font-medium" data-testid={`text-wallet-name-${wallet.id}`}>
                          {wallet.userName}
                        </div>
                        <div className="text-sm text-muted-foreground" data-testid={`text-wallet-email-${wallet.id}`}>
                          {wallet.userEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-wallet-role-${wallet.id}`}>
                        {wallet.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-lg" data-testid={`text-wallet-balance-${wallet.id}`}>
                        ${(Number(wallet.balance) || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-green-600" data-testid={`text-wallet-earned-${wallet.id}`}>
                        +${(Number(wallet.totalEarned) || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-red-600" data-testid={`text-wallet-spent-${wallet.id}`}>
                        -${(Number(wallet.totalSpent) || 0).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell data-testid={`text-wallet-created-${wallet.id}`}>
                      {format(new Date(wallet.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
