import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Search, Users, Filter, Edit, CheckCircle, XCircle } from 'lucide-react';

interface Technician {
  id: string;
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  status: string;
  availabilityStatus: string;
  specializations: Array<{
    id: string;
    name: string;
  }>;
}

interface Category {
  id: string;
  name: string;
  nameAr: string;
}

export default function TechnicianSpecializations() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editDialog, setEditDialog] = useState<{ open: boolean; technician: Technician | null }>({
    open: false,
    technician: null,
  });
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);

  const { data: techData, isLoading } = useQuery({
    queryKey: [categoryFilter !== 'all' ? `/api/v2/admin/technicians/specializations?categoryId=${categoryFilter}` : '/api/v2/admin/technicians/specializations'],
  });

  const updateSpecsMutation = useMutation({
    mutationFn: async ({ techId, specializations }: { techId: string; specializations: string[] }) => {
      return apiRequest('PUT', `/api/v2/admin/technicians/${techId}/specializations`, { specializations });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v2/admin/technicians/specializations'] });
      setEditDialog({ open: false, technician: null });
      toast({
        title: 'Specializations updated',
        description: 'Technician specializations have been updated successfully',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update specializations',
        variant: 'destructive',
      });
    },
  });

  const technicians: Technician[] = techData?.data?.technicians || [];
  const categories: Category[] = techData?.data?.categories || [];
  const coverageStats = techData?.data?.coverageStats || [];

  const filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch = tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tech.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEditSpecializations = (technician: Technician) => {
    setSelectedSpecs(technician.specializations.map(s => s.id));
    setEditDialog({ open: true, technician });
  };

  const handleSaveSpecializations = () => {
    if (!editDialog.technician) return;
    updateSpecsMutation.mutate({
      techId: editDialog.technician.id,
      specializations: selectedSpecs,
    });
  };

  const toggleSpecialization = (categoryId: string) => {
    setSelectedSpecs(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary" data-testid="text-title">
            Technician Specializations
          </h1>
          <p className="text-foreground/70">Manage technician service categories and coverage</p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Users className="mr-2 h-4 w-4" />
          {technicians.length} Technicians
        </Badge>
      </div>

      {/* Coverage Statistics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {coverageStats.slice(0, 8).map((stat: any) => (
          <Card key={stat.categoryId} className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{stat.categoryName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">{stat.technicianCount}</span>
                <span className="text-xs text-muted-foreground">technician{stat.technicianCount !== 1 ? 's' : ''}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Filter Technicians</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-filter">Category Filter</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter" data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technicians Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Technicians</CardTitle>
          <CardDescription>
            {filteredTechnicians.length} technician{filteredTechnicians.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Specializations</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTechnicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="text-muted-foreground">No technicians found</div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechnicians.map((tech) => (
                  <TableRow key={tech.id} data-testid={`row-tech-${tech.id}`}>
                    <TableCell>
                      <div className="font-medium">{tech.name}</div>
                      {tech.nameAr && <div className="text-sm text-muted-foreground">{tech.nameAr}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{tech.email}</div>
                      <div className="text-sm text-muted-foreground">{tech.phone}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tech.status === 'active' ? 'default' : 'secondary'}
                        className={tech.status === 'active' ? 'bg-green-500' : ''}
                      >
                        {tech.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {tech.specializations.length === 0 ? (
                          <Badge variant="outline" className="text-xs">All Services</Badge>
                        ) : (
                          tech.specializations.slice(0, 3).map((spec) => (
                            <Badge key={spec.id} variant="secondary" className="text-xs">
                              {spec.name}
                            </Badge>
                          ))
                        )}
                        {tech.specializations.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{tech.specializations.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditSpecializations(tech)}
                        data-testid={`button-edit-specs-${tech.id}`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Specializations Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, technician: null })}>
        <DialogContent className="max-w-2xl" data-testid="dialog-edit-specializations">
          <DialogHeader>
            <DialogTitle>Edit Specializations - {editDialog.technician?.name}</DialogTitle>
            <DialogDescription>
              Select the service categories this technician can handle. Leave empty for all services.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50"
                >
                  <Checkbox
                    id={`spec-${category.id}`}
                    checked={selectedSpecs.includes(category.id)}
                    onCheckedChange={() => toggleSpecialization(category.id)}
                    data-testid={`checkbox-spec-${category.id}`}
                  />
                  <Label
                    htmlFor={`spec-${category.id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{category.name}</div>
                    {category.nameAr && (
                      <div className="text-sm text-muted-foreground">{category.nameAr}</div>
                    )}
                  </Label>
                  {selectedSpecs.includes(category.id) ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog({ open: false, technician: null })}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSpecializations}
              disabled={updateSpecsMutation.isPending}
              data-testid="button-save"
            >
              {updateSpecsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
