import { Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from '@/pages/dashboard';
import ApiDocumentation from '@/components/api-documentation';
import NotFound from '@/pages/not-found';
import Login from '@/pages/login';
import AdminDashboard from '@/pages/admin-dashboard';
import TechnicianDashboard from '@/pages/technician-dashboard';
import CustomerProfile from '@/pages/admin/customer-profile';

// Custom error type
interface HttpError extends Error {
  status?: number;
  data?: any;
}

// Create a client with error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 404s
        const httpError = error as HttpError;
        if (httpError?.status === 404) return false;
        return failureCount < 3;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (previously cacheTime)
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx)
        const httpError = error as HttpError;
        if (httpError?.status && httpError.status >= 400 && httpError.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});

// Custom fetcher for react-query
const defaultFetcher = async (url: string): Promise<any> => {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const error: any = new Error(`HTTP error! status: ${response.status}`);
    error.status = response.status;
    
    try {
      const errorData = await response.json();
      error.message = errorData.message || error.message;
      error.data = errorData;
    } catch {
      // If we can't parse JSON, use the status text
      error.message = response.statusText || error.message;
    }
    
    throw error;
  }

  try {
    return await response.json();
  } catch {
    // If response is not JSON, return null
    return null;
  }
};

// Set default query function
queryClient.setDefaultOptions({
  queries: {
    queryFn: ({ queryKey }) => {
      if (typeof queryKey[0] === 'string') {
        return defaultFetcher(queryKey[0]);
      }
      throw new Error('Invalid query key');
    },
  },
});

// API request helper for mutations
export const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('auth_token');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    const error: any = new Error(`HTTP error! status: ${response.status}`);
    error.status = response.status;
    
    try {
      const errorData = await response.json();
      error.message = errorData.message || error.message;
      error.data = errorData;
    } catch {
      error.message = response.statusText || error.message;
    }
    
    throw error;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/" component={ApiDocumentation} />
          <Route path="/login" component={Login} />
          <Route path="/admin/customers/:id/overview">
            {(params) => <CustomerProfile key={params.id} />}
          </Route>
          <Route path="/admin/customers/:id">
            {(params) => <CustomerProfile key={params.id} />}
          </Route>
          <Route path="/admin/:rest*" component={AdminDashboard} />
          <Route path="/technician/:rest*" component={TechnicianDashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/docs" component={ApiDocumentation} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
