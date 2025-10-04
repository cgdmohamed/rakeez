import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Route, Switch } from 'wouter';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  CreditCard,
  Users,
  Wrench,
  BarChart3,
  LogOut,
  Menu,
  X,
  Wallet,
  Bell,
  MessageSquare,
  Settings,
  Package,
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
import AdminTechnicians from './admin/technicians';
import AdminAnalytics from './admin/analytics';
import AdminWallets from './admin/wallets';
import AdminNotifications from './admin/notifications';
import AdminSupport from './admin/support';
import AdminServices from './admin/services';
import AdminSpareParts from './admin/spare-parts';

const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'Quotations', href: '/admin/quotations', icon: FileText },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Wallets', href: '/admin/wallets', icon: Wallet },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Technicians', href: '/admin/technicians', icon: Wrench },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Support', href: '/admin/support', icon: MessageSquare },
  { name: 'Services', href: '/admin/services', icon: Settings },
  { name: 'Spare Parts', href: '/admin/spare-parts', icon: Package },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

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
    <div className="flex h-full flex-col bg-card border-r">
      <div className="p-6">
        <Link href="/admin/dashboard" className="flex items-center space-x-2">
          <span className="text-2xl">🧽</span>
          <div className="flex flex-col">
            <span className="text-lg font-bold">Rakeez</span>
            <span className="text-xs text-muted-foreground">Admin Portal</span>
          </div>
        </Link>
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
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
            <Route path="/admin/dashboard" component={AdminOverview} />
            <Route path="/admin/bookings" component={AdminBookings} />
            <Route path="/admin/quotations" component={AdminQuotations} />
            <Route path="/admin/payments" component={AdminPayments} />
            <Route path="/admin/wallets" component={AdminWallets} />
            <Route path="/admin/customers" component={AdminCustomers} />
            <Route path="/admin/technicians" component={AdminTechnicians} />
            <Route path="/admin/notifications" component={AdminNotifications} />
            <Route path="/admin/support" component={AdminSupport} />
            <Route path="/admin/services" component={AdminServices} />
            <Route path="/admin/spare-parts" component={AdminSpareParts} />
            <Route path="/admin/analytics" component={AdminAnalytics} />
          </Switch>
        </div>
      </main>
    </div>
  );
}
