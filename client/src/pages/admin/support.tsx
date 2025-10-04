import { useQuery, useMutation } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

export default function AdminSupport() {
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/support/tickets'],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest('PUT', `/api/v2/admin/support/tickets/${id}`, { status });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Ticket updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/support/tickets'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update ticket', variant: 'destructive' });
    },
  });

  const tickets = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Support Tickets</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Manage customer support requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-section-title">All Tickets</CardTitle>
          <CardDescription data-testid="text-section-description">
            {tickets.length} support tickets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-user">User</TableHead>
                  <TableHead data-testid="header-subject">Subject</TableHead>
                  <TableHead data-testid="header-priority">Priority</TableHead>
                  <TableHead data-testid="header-status">Status</TableHead>
                  <TableHead data-testid="header-created">Created</TableHead>
                  <TableHead data-testid="header-actions">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket: any) => (
                  <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                    <TableCell>
                      <div className="font-medium" data-testid={`text-ticket-name-${ticket.id}`}>
                        {ticket.userName}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`text-ticket-subject-${ticket.id}`}>
                      {ticket.subject}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ticket.priority === 'urgent' ? 'destructive' : ticket.priority === 'high' ? 'default' : 'secondary'}
                        data-testid={`badge-ticket-priority-${ticket.id}`}
                      >
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) => updateMutation.mutate({ id: ticket.id, status: value })}
                      >
                        <SelectTrigger className="w-[140px]" data-testid={`select-ticket-status-${ticket.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell data-testid={`text-ticket-created-${ticket.id}`}>
                      {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" data-testid={`button-view-ticket-${ticket.id}`}>
                        View
                      </Button>
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
