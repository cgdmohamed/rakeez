import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Route, Switch } from 'wouter';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  CreditCard,
  Users,
  UserCog,
  Wrench,
  BarChart3,
  LogOut,
  Menu,
  X,
  Bell,
  MessageSquare,
  Settings,
  Package,
  Shield,
  Gift,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Import sub-pages
import AdminOverview from './admin/overview';
import AdminBookings from './admin/bookings';
import AdminQuotations from './admin/quotations';
import AdminPayments from './admin/payments';
import AdminCustomers from './admin/customers';
import CustomerProfile from './admin/customer-profile';
import AdminTechnicians from './admin/technicians';
import AdminUsers from './admin/users';
import AdminRoles from './admin/roles';
import AdminAnalytics from './admin/analytics';
import AdminWallets from './admin/wallets';
import AdminNotifications from './admin/notifications';
import AdminSupport from './admin/support';
import AdminServices from './admin/services';
import AdminBrands from './admin/brands';
import AdminSpareParts from './admin/spare-parts';
import AdminPromos from './admin/promos';
import AdminMobileContent from './admin/mobile-content';

const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'Quotations', href: '/admin/quotations', icon: FileText },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Technicians', href: '/admin/technicians', icon: Wrench },
  { name: 'Users', href: '/admin/users', icon: UserCog },
  { name: 'Roles', href: '/admin/roles', icon: Shield },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Support', href: '/admin/support', icon: MessageSquare },
  { name: 'Services', href: '/admin/services', icon: Settings },
  { name: 'Brands', href: '/admin/brands', icon: Package },
  { name: 'Spare Parts', href: '/admin/spare-parts', icon: Package },
  { name: 'Promos', href: '/admin/promos', icon: Gift },
  { name: 'Mobile Content', href: '/admin/mobile-content', icon: Smartphone },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

// Export a wrapper component for pages that need the admin layout
export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and has admin role
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
      setLocation('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    setLocation('/login');
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6">
        <Link href="/admin/dashboard" className="flex items-center justify-center">
          <img src="/logo.svg" alt="Rakeez" className="h-12 w-auto" />
        </Link>
        <p className="text-center text-xs mt-2 text-sidebar-foreground/70">Admin Portal</p>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== '/admin/dashboard' && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-full">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-40"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-6 lg:p-8 pt-20 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if user is authenticated and has admin role
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
      setLocation('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    setLocation('/login');
  };

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6">
        <Link href="/admin/dashboard" className="flex items-center justify-center">
          <img src="/logo.svg" alt="Rakeez" className="h-12 w-auto" />
        </Link>
        <p className="text-center text-xs mt-2 text-sidebar-foreground/70">Admin Portal</p>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== '/admin/dashboard' && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </a>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-full">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-40"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-6 lg:p-8 pt-20 lg:pt-8">
          <Switch>
            <Route path="/admin/customers/:id/overview" component={CustomerProfile} />
            <Route path="/admin/customers/:id" component={CustomerProfile} />
            <Route path="/admin/overview" component={AdminOverview} />
            <Route path="/admin/dashboard" component={AdminOverview} />
            <Route path="/admin/bookings" component={AdminBookings} />
            <Route path="/admin/quotations" component={AdminQuotations} />
            <Route path="/admin/payments" component={AdminPayments} />
            <Route path="/admin/wallets" component={AdminWallets} />
            <Route path="/admin/customers" component={AdminCustomers} />
            <Route path="/admin/technicians" component={AdminTechnicians} />
            <Route path="/admin/users" component={AdminUsers} />
            <Route path="/admin/roles" component={AdminRoles} />
            <Route path="/admin/notifications" component={AdminNotifications} />
            <Route path="/admin/support" component={AdminSupport} />
            <Route path="/admin/services" component={AdminServices} />
            <Route path="/admin/brands" component={AdminBrands} />
            <Route path="/admin/spare-parts" component={AdminSpareParts} />
            <Route path="/admin/promos" component={AdminPromos} />
            <Route path="/admin/mobile-content" component={AdminMobileContent} />
            <Route path="/admin/analytics" component={AdminAnalytics} />
            <Route path="/admin" component={AdminOverview} />
            <Route>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Admin page not found</p>
              </div>
            </Route>
          </Switch>
        </div>
      </main>
    </div>
  );
}
