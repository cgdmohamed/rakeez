import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'admin' | 'technician'>('admin');

  const loginMutation = useMutation({
    mutationFn: async (data: { identifier: string; password: string }) => {
      const response = await apiRequest('/api/v2/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.success && data.data?.access_token) {
        localStorage.setItem('auth_token', data.data.access_token);
        localStorage.setItem('user_role', data.data.user.role);
        localStorage.setItem('user_id', data.data.user.id);
        
        toast({
          title: 'Login successful',
          description: 'Redirecting to dashboard...',
        });

        // Redirect based on role
        if (data.data.user.role === 'admin') {
          setLocation('/admin/dashboard');
        } else if (data.data.user.role === 'technician') {
          setLocation('/technician/dashboard');
        } else {
          toast({
            title: 'Access Denied',
            description: 'This portal is for admin and technician users only',
            variant: 'destructive',
          });
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ identifier, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="text-4xl mb-2">🧽</div>
          <CardTitle className="text-2xl font-bold">ركيز - Rakeez</CardTitle>
          <CardDescription>Admin & Technician Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={userType} onValueChange={(v) => setUserType(v as 'admin' | 'technician')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="admin" data-testid="tab-admin">Admin</TabsTrigger>
              <TabsTrigger value="technician" data-testid="tab-technician">Technician</TabsTrigger>
            </TabsList>

            <TabsContent value="admin">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-identifier">Email or Phone</Label>
                  <Input
                    id="admin-identifier"
                    data-testid="input-identifier"
                    type="text"
                    placeholder="admin@rakeez.sa"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    data-testid="input-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  data-testid="button-login"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Logging in...' : 'Login as Admin'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="technician">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tech-identifier">Email or Phone</Label>
                  <Input
                    id="tech-identifier"
                    data-testid="input-identifier"
                    type="text"
                    placeholder="technician@rakeez.sa"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tech-password">Password</Label>
                  <Input
                    id="tech-password"
                    data-testid="input-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  data-testid="button-login"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Logging in...' : 'Login as Technician'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Demo Credentials:</p>
            <p className="text-xs mt-1">Admin: admin@rakeez.sa / admin123</p>
            <p className="text-xs">Technician: tech@rakeez.sa / tech123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
