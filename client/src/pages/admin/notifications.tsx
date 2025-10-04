import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Bell } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function AdminNotifications() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    role: '',
    type: 'system' as const,
    title_en: '',
    body_en: '',
  });

  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/notifications'],
  });

  const sendMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/v2/admin/notifications/send', {
        role: data.role,
        type: data.type,
        title: { en: data.title_en },
        body: { en: data.body_en },
      });
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Notification sent successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/notifications'] });
      setShowDialog(false);
      setFormData({ role: '', type: 'system', title_en: '', body_en: '' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to send notification', variant: 'destructive' });
    },
  });

  const notifications = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Notifications</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">
            Send and manage push notifications
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} data-testid="button-send-notification">
          <Bell className="mr-2 h-4 w-4" />
          Send Notification
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle data-testid="text-section-title">Recent Notifications</CardTitle>
          <CardDescription data-testid="text-section-description">
            {notifications.length} notifications sent
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
                  <TableHead data-testid="header-type">Type</TableHead>
                  <TableHead data-testid="header-title">Title</TableHead>
                  <TableHead data-testid="header-status">Status</TableHead>
                  <TableHead data-testid="header-sent">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification: any) => (
                  <TableRow key={notification.id} data-testid={`row-notification-${notification.id}`}>
                    <TableCell>
                      <div className="font-medium" data-testid={`text-notification-name-${notification.id}`}>
                        {notification.userName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-notification-type-${notification.id}`}>
                        {notification.type}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-notification-title-${notification.id}`}>
                      {notification.title?.en || notification.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant={notification.isRead ? 'secondary' : 'default'} data-testid={`badge-notification-status-${notification.id}`}>
                        {notification.isRead ? 'Read' : 'Unread'}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`text-notification-sent-${notification.id}`}>
                      {format(new Date(notification.createdAt), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="dialog-send-notification">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Send Notification</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">
              Send a push notification to users
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role" data-testid="label-role">Target Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="technician">Technicians</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type" data-testid="label-type">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title" data-testid="label-title">Title</Label>
              <Input
                id="title"
                value={formData.title_en}
                onChange={(e) => setFormData({ ...formData, title_en: e.target.value })}
                placeholder="Notification title"
                data-testid="input-title"
              />
            </div>
            <div>
              <Label htmlFor="body" data-testid="label-body">Message</Label>
              <Textarea
                id="body"
                value={formData.body_en}
                onChange={(e) => setFormData({ ...formData, body_en: e.target.value })}
                placeholder="Notification message"
                data-testid="input-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={() => sendMutation.mutate(formData)} disabled={sendMutation.isPending} data-testid="button-submit">
              {sendMutation.isPending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
