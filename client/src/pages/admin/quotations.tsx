import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Plus, Eye, X } from 'lucide-react';
import { SarSymbol } from '@/components/sar-symbol';

const quotationSchema = z.object({
  booking_id: z.string().min(1, 'Booking is required'),
  technician_id: z.string().min(1, 'Technician is required'),
  additional_cost: z.coerce.number().min(0, 'Additional cost must be positive'),
  notes: z.string().optional(),
});

interface SparePartItem {
  spare_part_id: string;
  quantity: number;
  unit_price: number;
  name?: string;
}

export default function AdminQuotations() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [sparePartItems, setSparePartItems] = useState<SparePartItem[]>([]);
  const [newSparePartId, setNewSparePartId] = useState('');
  const [newQuantity, setNewQuantity] = useState(1);
  const [newUnitPrice, setNewUnitPrice] = useState(0);

  const { data: quotationsData, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/quotations'],
  });

  const { data: bookingsData } = useQuery<any>({
    queryKey: ['/api/v2/admin/bookings'],
  });

  const { data: techsData } = useQuery<any>({
    queryKey: ['/api/v2/admin/users'],
  });

  const { data: sparePartsData } = useQuery<any>({
    queryKey: ['/api/v2/admin/spare-parts'],
  });

  const form = useForm({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      booking_id: '',
      technician_id: '',
      additional_cost: 0,
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/v2/admin/quotations', data),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/quotations'] });
      toast({ title: 'Success', description: 'Quotation created successfully' });
      setCreateDialogOpen(false);
      setSparePartItems([]);
      form.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create quotation', variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest('PUT', `/api/v2/admin/quotations/${id}`, { status }),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/v2/admin/quotations'] });
      toast({ title: 'Success', description: 'Quotation status updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    },
  });

  const quotations = quotationsData?.data || [];
  const bookings = bookingsData?.data || [];
  const technicians = (techsData?.data || []).filter((u: any) => u.role === 'technician');
  const spareParts = sparePartsData?.data || [];

  const handleSubmit = (values: any) => {
    const payload = {
      booking_id: values.booking_id,
      technician_id: values.technician_id,
      additional_cost: values.additional_cost,
      spare_parts: sparePartItems.map(item => ({
        spare_part_id: item.spare_part_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
      notes: values.notes,
    };
    createMutation.mutate(payload);
  };

  const addSparePartItem = () => {
    if (!newSparePartId) return;
    const sparePart = spareParts.find((sp: any) => sp.id === newSparePartId);
    setSparePartItems([
      ...sparePartItems,
      {
        spare_part_id: newSparePartId,
        quantity: newQuantity,
        unit_price: newUnitPrice,
        name: sparePart?.name?.en || 'Unknown Part',
      },
    ]);
    setNewSparePartId('');
    setNewQuantity(1);
    setNewUnitPrice(0);
  };

  const removeSparePartItem = (index: number) => {
    setSparePartItems(sparePartItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const sparePartsTotal = sparePartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const additionalCost = form.watch('additional_cost') || 0;
    const subtotal = sparePartsTotal + additionalCost;
    const vat = subtotal * 0.15;
    const total = subtotal + vat;
    return { subtotal, vat, total };
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'badge-pending' },
      approved: { label: 'Approved', className: 'badge-completed' },
      rejected: { label: 'Rejected', className: 'badge-cancelled' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-muted' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary" data-testid="text-title">Quotations Management</h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Create and manage service quotations with spare parts
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-quotation">
          <Plus className="mr-2 h-4 w-4" />
          Create Quotation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotations ({quotations.length})</CardTitle>
          <CardDescription>View and manage quotations for bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <div className="text-muted-foreground">
                        No quotations found. Create your first quotation to get started.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  quotations.map((quotation: any) => (
                    <TableRow key={quotation.id} data-testid={`row-quotation-${quotation.id}`}>
                      <TableCell className="font-mono text-xs">{quotation.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-mono text-xs">{quotation.booking_id?.slice(0, 8)}</TableCell>
                      <TableCell>{quotation.technician_name || 'N/A'}</TableCell>
                      <TableCell><SarSymbol className="mr-1" />{(Number(quotation.additional_cost) || 0).toFixed(2)}</TableCell>
                      <TableCell><SarSymbol className="mr-1" />{(Number(quotation.vat_amount) || 0).toFixed(2)}</TableCell>
                      <TableCell className="font-medium"><SarSymbol className="mr-1" />{(Number(quotation.total_amount) || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Select
                          value={quotation.status}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: quotation.id, status: value })}
                        >
                          <SelectTrigger className="w-[120px]" data-testid={`select-status-${quotation.id}`}>
                            <SelectValue>
                              {getStatusBadge(quotation.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {quotation.created_at && format(new Date(quotation.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedQuotation(quotation); setViewDialogOpen(true); }}
                          data-testid={`button-view-${quotation.id}`}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Quotation Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-quotation">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Create Quotation</DialogTitle>
            <DialogDescription>
              Create a new quotation for a booking with spare parts and additional costs
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="booking_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-booking">
                            <SelectValue placeholder="Select booking" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bookings.map((booking: any) => (
                            <SelectItem key={booking.id} value={booking.id}>
                              {booking.id.slice(0, 8)} - {booking.serviceName || 'Unknown Service'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="technician_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Technician</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-technician">
                            <SelectValue placeholder="Select technician" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {technicians.map((tech: any) => (
                            <SelectItem key={tech.id} value={tech.id}>
                              {tech.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="additional_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Cost (SAR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-additional-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold">Spare Parts</h4>
                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-5">
                    <Select value={newSparePartId} onValueChange={setNewSparePartId}>
                      <SelectTrigger data-testid="select-spare-part">
                        <SelectValue placeholder="Select spare part" />
                      </SelectTrigger>
                      <SelectContent>
                        {spareParts.map((part: any) => (
                          <SelectItem key={part.id} value={part.id}>
                            {part.name?.en || 'Unknown Part'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                      data-testid="input-quantity"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newUnitPrice}
                      onChange={(e) => setNewUnitPrice(parseFloat(e.target.value) || 0)}
                      placeholder="Unit Price"
                      data-testid="input-unit-price"
                    />
                  </div>
                  <div className="col-span-2">
                    <Button type="button" onClick={addSparePartItem} className="w-full" data-testid="button-add-item">
                      Add
                    </Button>
                  </div>
                </div>

                {sparePartItems.length > 0 && (
                  <div className="border rounded-md p-3 space-y-2">
                    {sparePartItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded" data-testid={`spare-part-item-${index}`}>
                        <div className="flex-1">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {item.quantity} × <SarSymbol size={12} />{item.unit_price.toFixed(2)} = <SarSymbol size={12} />{(item.quantity * item.unit_price).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSparePartItem(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2 bg-muted p-4 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Spare Parts Total:</span>
                  <span className="font-medium"><SarSymbol className="mr-1" size={12} />{sparePartItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Additional Cost:</span>
                  <span className="font-medium"><SarSymbol className="mr-1" size={12} />{(form.watch('additional_cost') || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium"><SarSymbol className="mr-1" size={12} />{calculateTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT (15%):</span>
                  <span className="font-medium"><SarSymbol className="mr-1" size={12} />{calculateTotals().vat.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span><SarSymbol className="mr-1" />{calculateTotals().total.toFixed(2)}</span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes..." rows={3} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                  Create Quotation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Quotation Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-view-quotation">
          <DialogHeader>
            <DialogTitle>Quotation Details</DialogTitle>
            <DialogDescription>
              Quotation #{selectedQuotation?.id?.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Booking ID</p>
                  <p className="font-mono text-sm">{selectedQuotation.booking_id?.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Technician</p>
                  <p className="font-medium">{selectedQuotation.technician_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedQuotation.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p>{selectedQuotation.created_at && format(new Date(selectedQuotation.created_at), 'MMM dd, yyyy')}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Cost Breakdown</h4>
                <div className="space-y-2 bg-muted p-4 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span>Additional Cost:</span>
                    <span className="font-medium"><SarSymbol className="mr-1" size={12} />{(Number(selectedQuotation.additional_cost) || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (15%):</span>
                    <span className="font-medium"><SarSymbol className="mr-1" size={12} />{(Number(selectedQuotation.vat_amount) || 0).toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total Amount:</span>
                    <span><SarSymbol className="mr-1" />{(Number(selectedQuotation.total_amount) || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {selectedQuotation.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{selectedQuotation.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)} data-testid="button-close">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
