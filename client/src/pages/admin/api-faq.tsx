import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Code, AlertTriangle, CheckCircle, Info, ArrowLeft, BookOpen } from 'lucide-react';
import { Link } from 'wouter';

export default function ApiFaq() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/">
              <a className="flex items-center gap-2 font-semibold">
                <BookOpen className="h-5 w-5" />
                <span>Rakeez API</span>
              </a>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/api-docs">
                <a className="text-muted-foreground hover:text-foreground transition-colors">
                  API Documentation
                </a>
              </Link>
              <Link href="/api-faq">
                <a className="text-foreground font-medium">
                  FAQ
                </a>
              </Link>
            </nav>
          </div>
          <div>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Integration FAQ</h1>
          <p className="text-muted-foreground mt-2">
            Common issues and solutions for integrating with the Rakeez API
          </p>
        </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            <CardTitle>Frequently Asked Questions</CardTitle>
          </div>
          <CardDescription>
            Quick solutions to common integration challenges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            
            {/* CORS Issues */}
            <AccordionItem value="cors">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Critical</Badge>
                  <span className="font-semibold">CORS errors when calling API from web/mobile app</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> "Access to XMLHttpRequest has been blocked by CORS policy"
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Common Causes:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Your app's origin is not in the <code className="bg-muted px-1 py-0.5 rounded">ALLOWED_ORIGINS</code> environment variable</li>
                    <li>Backend server wasn't restarted after updating environment variables</li>
                    <li><strong>Most Common:</strong> Nginx/reverse proxy not configured for CORS</li>
                  </ul>

                  <h4 className="font-semibold text-sm mt-4">Solution for Nginx:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Add this to your Nginx location block:</p>
                    <pre className="text-xs overflow-x-auto">
{`location / {
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, PATCH, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Accept-Language, X-API-Key' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' 86400 always;
        return 204;
    }

    # Add CORS headers to all responses
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    proxy_pass http://127.0.0.1:3000/;
    # ... rest of proxy config
}`}
                    </pre>
                  </div>

                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      After updating Nginx: <code className="bg-muted px-1 py-0.5 rounded">sudo nginx -t</code> then <code className="bg-muted px-1 py-0.5 rounded">sudo systemctl reload nginx</code>
                    </AlertDescription>
                  </Alert>

                  <h4 className="font-semibold text-sm mt-4">Environment Variable Setup:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2">Add your app's origin to .env:</p>
                    <pre className="text-xs">
{`ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:8080,http://localhost:56246`}
                    </pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Authentication */}
            <AccordionItem value="auth">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Authentication</Badge>
                  <span className="font-semibold">401 Unauthorized errors</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Common Causes:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Missing or invalid JWT token in Authorization header</li>
                    <li>Token expired (tokens expire after configured time)</li>
                    <li>Token format incorrect (should be: <code className="bg-muted px-1 py-0.5 rounded">Bearer YOUR_TOKEN</code>)</li>
                    <li>User account not verified</li>
                  </ul>

                  <h4 className="font-semibold text-sm mt-4">Proper Authentication Flow:</h4>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-xs font-semibold">1. Login to get token:</p>
                    <pre className="text-xs overflow-x-auto">
{`POST /api/v2/auth/login
{
  "identifier": "user@example.com",
  "password": "yourpassword",
  "language": "en"
}`}
                    </pre>
                    
                    <p className="text-xs font-semibold mt-3">2. Include token in subsequent requests:</p>
                    <pre className="text-xs overflow-x-auto">
{`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
                    </pre>
                  </div>

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      For customer endpoints, use the customer-specific login endpoint. Admin and technician portals use <code className="bg-muted px-1 py-0.5 rounded">/api/v2/auth/login</code>
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Rate Limiting */}
            <AccordionItem value="rate-limit">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Performance</Badge>
                  <span className="font-semibold">429 Too Many Requests</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Error:</strong> You've exceeded the rate limit for this endpoint
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Rate Limits:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li><strong>Login:</strong> 5 attempts per 15 minutes per IP</li>
                    <li><strong>OTP Verification:</strong> 5 attempts per 5 minutes</li>
                    <li><strong>Password Reset:</strong> 3 attempts per hour</li>
                    <li><strong>General API:</strong> 100 requests per minute per user</li>
                  </ul>

                  <h4 className="font-semibold text-sm mt-4">Best Practices:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Implement exponential backoff for failed requests</li>
                    <li>Cache responses when appropriate</li>
                    <li>Check response headers for rate limit info</li>
                    <li>Batch requests when possible</li>
                  </ul>

                  <div className="bg-muted p-4 rounded-lg mt-4">
                    <p className="text-xs text-muted-foreground mb-2">Rate limit headers in responses:</p>
                    <pre className="text-xs">
{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1635724800`}
                    </pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Response Format */}
            <AccordionItem value="response-format">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Integration</Badge>
                  <span className="font-semibold">Understanding API response formats</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Admin/Technician API Response Format:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
{`{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data with bilingual fields
    "nameEn": "Service Name",
    "nameAr": "اسم الخدمة",
    "descriptionEn": "Description",
    "descriptionAr": "الوصف"
  }
}`}
                    </pre>
                  </div>

                  <h4 className="font-semibold text-sm mt-4">Customer API Response Format:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
{`{
  "success": true,
  "message_en": "Operation successful",
  "message_ar": "نجحت العملية",
  "data": {
    // Response data with localized single language fields
    "name": "Service Name",
    "description": "Description"
  }
}`}
                    </pre>
                  </div>

                  <Alert className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Admin APIs use camelCase with bilingual objects. Customer APIs use snake_case with localized responses based on the <code className="bg-muted px-1 py-0.5 rounded">language</code> parameter.
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Environment Setup */}
            <AccordionItem value="environment">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Setup</Badge>
                  <span className="font-semibold">Production deployment checklist</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Required Environment Variables:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li><code className="bg-muted px-1 py-0.5 rounded">DATABASE_URL</code> - PostgreSQL connection string</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">JWT_SECRET</code> - Strong random secret for token signing</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">ALLOWED_ORIGINS</code> - Comma-separated list of allowed domains</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">REDIS_URL</code> - Redis connection for sessions (optional but recommended)</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">TWILIO_*</code> - SMS/OTP configuration</li>
                    <li><code className="bg-muted px-1 py-0.5 rounded">SMTP_*</code> - Email configuration</li>
                  </ul>

                  <h4 className="font-semibold text-sm mt-4">Security Checklist:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Generate strong, unique secrets for JWT and session</li>
                    <li>Use HTTPS in production (SSL/TLS certificates)</li>
                    <li>Configure CORS with specific origins (avoid wildcards)</li>
                    <li>Enable Redis for session management and rate limiting</li>
                    <li>Set up proper database backups</li>
                    <li>Monitor error logs and API usage</li>
                  </ul>

                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Never commit secrets to version control. Use environment-specific .env files and keep them secure.
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* WebSocket Connection */}
            <AccordionItem value="websocket">
              <AccordionTrigger className="text-left hover:no-underline">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Real-time</Badge>
                  <span className="font-semibold">WebSocket connection issues</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Common Issues:</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Nginx not configured for WebSocket upgrade</li>
                    <li>Using HTTP instead of WS/WSS protocol</li>
                    <li>Firewall blocking WebSocket connections</li>
                  </ul>

                  <h4 className="font-semibold text-sm mt-4">Nginx WebSocket Configuration:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
{`location /ws {
    proxy_pass http://127.0.0.1:3000/ws;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 900s;
    proxy_send_timeout 900s;
}`}
                    </pre>
                  </div>

                  <h4 className="font-semibold text-sm mt-4">Connection URL:</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs">
{`Development: ws://localhost:5000/ws
Production:  wss://yourdomain.com/ws`}
                    </pre>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need More Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>For detailed API documentation, refer to:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><code className="bg-muted px-1 py-0.5 rounded">docs/CUSTOMER_API.md</code> - Customer/Client API reference</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">docs/ADMIN_API.md</code> - Complete admin API reference</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">docs/TECHNICIAN_API.md</code> - Technician API documentation</li>
            <li><code className="bg-muted px-1 py-0.5 rounded">docs/WEBSOCKET_API.md</code> - Real-time WebSocket events</li>
          </ul>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
