import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

export default function AdminTechnicians() {
  const { data: techniciansData, isLoading } = useQuery({
    queryKey: ['/api/v2/admin/users?role=technician'],
  });

  const technicians = techniciansData?.data || [];

  if (isLoading) {
    return <div className="text-center py-8">Loading technicians...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="text-title">Technicians Management</h1>

      <Card>
        <CardHeader>
          <CardTitle>All Technicians ({technicians.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Completed Jobs</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.map((tech: any) => (
                <TableRow key={tech.id} data-testid={`row-technician-${tech.id}`}>
                  <TableCell className="font-medium">{tech.name}</TableCell>
                  <TableCell>{tech.email || 'N/A'}</TableCell>
                  <TableCell>{tech.phone || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{tech.avg_rating ? (Number(tech.avg_rating) || 0).toFixed(1) : 'N/A'}</span>
                    </div>
                  </TableCell>
                  <TableCell>{Number(tech.completed_orders) || 0}</TableCell>
                  <TableCell>
                    {tech.is_verified ? (
                      <Badge>Active</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
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
