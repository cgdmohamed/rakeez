import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText } from 'lucide-react';

export default function TechnicianUploads() {
  const { toast } = useToast();
  const [bookingId, setBookingId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'invoice' | 'spare_part'>('invoice');

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !bookingId) throw new Error('Missing file or booking ID');

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = uploadType === 'invoice' 
        ? `/api/v2/bookings/${bookingId}/invoice`
        : `/api/v2/quotations/${bookingId}/spare-parts`;

      return await apiRequest(endpoint, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Upload successful',
        description: `${uploadType === 'invoice' ? 'Invoice' : 'Spare part image'} uploaded successfully`,
      });
      setFile(null);
      setBookingId('');
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-title">Upload Documents</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="booking-id">Booking ID</Label>
              <Input
                id="booking-id"
                data-testid="input-booking-id"
                placeholder="Enter booking ID"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-type">Upload Type</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as 'invoice' | 'spare_part')}>
                <SelectTrigger data-testid="select-upload-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="spare_part">Spare Part Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                data-testid="input-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected: {file.name}
                </p>
              )}
            </div>

            <Button
              className="w-full"
              onClick={() => uploadMutation.mutate()}
              disabled={!file || !bookingId || uploadMutation.isPending}
              data-testid="button-upload"
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Invoices must be in PDF format</p>
            <p>• Spare part images can be PNG, JPG, or JPEG</p>
            <p>• Maximum file size: 10MB</p>
            <p>• Ensure the booking ID is correct</p>
            <p>• Files are automatically linked to the booking</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
