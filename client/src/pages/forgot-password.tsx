import { useState } from 'react';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { identifier: string }) => {
      const response = await apiRequest('POST', '/api/v2/auth/forgot-password', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setResetSent(true);
        toast({
          title: 'Reset code sent',
          description: data.message || 'Check your email or SMS for the reset code',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Request failed',
        description: error.message || 'Could not send reset code',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate({ identifier });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(211,100%,97%)] via-[hsl(177,100%,97%)] to-[hsl(100,100%,97%)] dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/login">
              <a className="text-muted-foreground hover:text-foreground" data-testid="link-back-to-login">
                <ArrowLeft className="h-5 w-5" />
              </a>
            </Link>
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
          </div>
          <CardDescription>
            {resetSent
              ? 'Reset code sent! Check your email or SMS.'
              : 'Enter your email or phone number to receive a password reset code'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetSent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We've sent a password reset code to your email or phone number. 
                Use the code to reset your password.
              </p>
              <Button className="w-full" data-testid="button-reset-password" asChild>
                <Link href="/reset-password">
                  <a>Enter Reset Code</a>
                </Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setResetSent(false)}
                data-testid="button-try-again"
              >
                Try Different Email/Phone
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">Email or Phone Number</Label>
                <Input
                  id="identifier"
                  data-testid="input-identifier"
                  type="text"
                  placeholder="your@email.com or +966123456789"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                data-testid="button-send-reset"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Code'}
              </Button>
              <div className="text-center">
                <Link href="/login">
                  <a className="text-sm text-primary hover:underline" data-testid="link-back">
                    Back to Login
                  </a>
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
