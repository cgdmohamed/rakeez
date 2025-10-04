import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminServices() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['/api/v2/admin/services'],
  });

  const servicesData = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Services & Pricing</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          View service catalog and pricing packages
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue={servicesData[0]?.category?.id || '0'} className="space-y-4">
          <TabsList>
            {servicesData.map((categoryData: any, idx: number) => (
              <TabsTrigger
                key={categoryData.category.id}
                value={categoryData.category.id}
                data-testid={`tab-category-${idx}`}
              >
                {categoryData.category.name?.en || categoryData.category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {servicesData.map((categoryData: any, idx: number) => (
            <TabsContent key={categoryData.category.id} value={categoryData.category.id}>
              <div className="space-y-4">
                {categoryData.services.map((service: any) => (
                  <Card key={service.id} data-testid={`card-service-${service.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle data-testid={`text-service-name-${service.id}`}>
                            {service.name?.en || service.name}
                          </CardTitle>
                          <CardDescription data-testid={`text-service-description-${service.id}`}>
                            {service.description?.en || service.description}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold" data-testid={`text-service-price-${service.id}`}>
                            ${(Number(service.basePrice) || 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            +{(Number(service.vatPercentage) || 0).toFixed(0)}% VAT
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {service.packages?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3" data-testid={`text-packages-title-${service.id}`}>
                            Available Packages
                          </h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Package</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Discount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {service.packages.map((pkg: any) => (
                                <TableRow key={pkg.id} data-testid={`row-package-${pkg.id}`}>
                                  <TableCell data-testid={`text-package-name-${pkg.id}`}>
                                    {pkg.name?.en || pkg.name}
                                  </TableCell>
                                  <TableCell data-testid={`text-package-duration-${pkg.id}`}>
                                    {pkg.duration} hours
                                  </TableCell>
                                  <TableCell>
                                    <span className="font-semibold" data-testid={`text-package-price-${pkg.id}`}>
                                      ${(Number(pkg.price) || 0).toFixed(2)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    {pkg.discountPercentage > 0 && (
                                      <Badge variant="secondary" data-testid={`badge-package-discount-${pkg.id}`}>
                                        -{(Number(pkg.discountPercentage) || 0).toFixed(0)}%
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
