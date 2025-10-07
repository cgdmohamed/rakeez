import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { MessageSquare, Send, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminSupport() {
  const { toast } = useToast();
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/support/tickets'],
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/support/tickets', selectedTicket?.id, 'messages'],
    enabled: !!selectedTicket?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest('PUT', `/api/v2/admin/support/tickets/${id}`, { status }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Ticket status updated successfully' });
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/support/tickets'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update ticket status', variant: 'destructive' });
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: string }) =>
      apiRequest('PUT', `/api/v2/admin/support/tickets/${id}`, { priority }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Ticket priority updated successfully' });
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/support/tickets'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update ticket priority', variant: 'destructive' });
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      apiRequest('POST', `/api/v2/admin/support/tickets/${id}/messages`, { message }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Reply sent successfully' });
      setReplyMessage('');
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/support/tickets', selectedTicket?.id, 'messages'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to send reply', variant: 'destructive' });
    },
  });

  const tickets = data?.data || [];
  const messages = messagesData?.data || [];

  // Apply search filter
  const filteredTickets = tickets.filter((ticket: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.id?.toLowerCase().includes(query) ||
      ticket.userName?.toLowerCase().includes(query) ||
      ticket.subject?.toLowerCase().includes(query) ||
      ticket.ticketNumber?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Reset currentPage if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
  };

  const handleSendReply = () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    replyMutation.mutate({ id: selectedTicket.id, message: replyMessage });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      open: { label: 'Open', className: 'badge-open' },
      in_progress: { label: 'In Progress', className: 'badge-in-progress' },
      resolved: { label: 'Resolved', className: 'badge-resolved' },
      closed: { label: 'Closed', className: 'badge-closed' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-muted' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary" data-testid="text-page-title">Support Tickets</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Manage customer support requests and conversations
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle data-testid="text-section-title">All Tickets</CardTitle>
            <CardDescription data-testid="text-section-description">
              {tickets.length} support tickets
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-[250px]"
                data-testid="input-search"
              />
            </div>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[100px]" data-testid="select-items-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-header-primary" data-testid="header-user">User</TableHead>
                  <TableHead className="table-header-primary" data-testid="header-subject">Subject</TableHead>
                  <TableHead className="table-header-primary" data-testid="header-priority">Priority</TableHead>
                  <TableHead className="table-header-primary" data-testid="header-status">Status</TableHead>
                  <TableHead className="table-header-primary" data-testid="header-created">Created</TableHead>
                  <TableHead className="table-header-primary" data-testid="header-actions">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="text-muted-foreground">
                        No support tickets found.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTickets.map((ticket: any, index: number) => (
                    <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`} className={index % 2 === 1 ? 'bg-muted/30' : ''}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-ticket-name-${ticket.id}`}>
                          {ticket.userName}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-ticket-subject-${ticket.id}`}>
                        {ticket.subject}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ticket.priority}
                          onValueChange={(value) => updatePriorityMutation.mutate({ id: ticket.id, priority: value })}
                        >
                          <SelectTrigger className="w-[120px]" data-testid={`select-ticket-priority-${ticket.id}`}>
                            <SelectValue>
                              <Badge variant={getPriorityColor(ticket.priority)}>
                                {ticket.priority}
                              </Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: ticket.id, status: value })}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewTicket(ticket)}
                          data-testid={`button-view-ticket-${ticket.id}`}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredTickets.length)} of {filteredTickets.length} tickets
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Ticket Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col" data-testid="dialog-ticket-details">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {selectedTicket?.subject}
            </DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <span>Created by {selectedTicket?.userName}</span>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant={getPriorityColor(selectedTicket?.priority)}>
                  {selectedTicket?.priority}
                </Badge>
                {getStatusBadge(selectedTicket?.status || 'open')}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Initial Message */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Initial Request</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{selectedTicket?.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedTicket?.createdAt && format(new Date(selectedTicket.createdAt), 'MMM d, yyyy h:mm a')}
                </p>
              </CardContent>
            </Card>

            {/* Messages */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <h4 className="font-semibold mb-2">Conversation</h4>
              <ScrollArea className="flex-1 pr-4">
                {messagesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No messages yet. Be the first to reply!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message: any, idx: number) => (
                      <Card
                        key={idx}
                        className={message.isAdmin ? 'ml-8 bg-primary/5' : 'mr-8'}
                        data-testid={`message-${idx}`}
                      >
                        <CardHeader className="py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">
                              {message.isAdmin ? 'Support Team' : selectedTicket?.userName}
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="py-3 pt-0">
                          <p className="text-sm">{message.message}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Reply Section */}
            <div className="space-y-2">
              <Textarea
                placeholder="Type your reply..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={3}
                data-testid="input-reply-message"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setViewDialogOpen(false)}
                  data-testid="button-close-dialog"
                >
                  Close
                </Button>
                <Button
                  onClick={handleSendReply}
                  disabled={!replyMessage.trim() || replyMutation.isPending}
                  data-testid="button-send-reply"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Reply
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
