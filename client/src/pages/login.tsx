import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'wouter';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    const savedIdentifier = localStorage.getItem('saved_identifier');
    const savedRememberMe = localStorage.getItem('remember_me') === 'true';
    if (savedIdentifier && savedRememberMe) {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: { identifier: string; password: string }) => {
      const response = await apiRequest('POST', '/api/v2/auth/login', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data?.access_token) {
        localStorage.setItem('auth_token', data.data.access_token);
        localStorage.setItem('user_role', data.data.user.role);
        localStorage.setItem('user_id', data.data.user.id);
        
        // Handle "Remember me"
        if (rememberMe) {
          localStorage.setItem('saved_identifier', identifier);
          localStorage.setItem('remember_me', 'true');
        } else {
          localStorage.removeItem('saved_identifier');
          localStorage.removeItem('remember_me');
        }
        
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(211,100%,97%)] via-[hsl(177,100%,97%)] to-[hsl(100,100%,97%)] dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="Rakeez" className="h-16 w-auto" />
          </div>
          <CardDescription>Admin & Technician Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Phone</Label>
              <Input
                id="identifier"
                data-testid="input-identifier"
                type="text"
                placeholder="Enter your email or phone number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="input-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    data-testid="checkbox-remember"
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                <Link href="/forgot-password">
                  <a className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                    Forgot password?
                  </a>
                </Link>
              </div>

            <Button
              type="submit"
              className="w-full"
              data-testid="button-login"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Logging in...' : 'Login'}
            </Button>
          </form>

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
