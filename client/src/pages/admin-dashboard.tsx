import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Route, Switch } from 'wouter';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  CreditCard,
  Users,
  User,
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
  Repeat,
  BookOpen,
  Tags,
  ChevronRight,
  CalendarDays,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';

// Import sub-pages
import AdminOverview from './admin/overview';
import AdminBookings from './admin/bookings';
import AdminCalendar from './admin/calendar';
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
import AdminSubscriptions from './admin/subscriptions';
import AdminSubscriptionPackages from './admin/subscription-packages';
import AdminMyProfile from './admin/my-profile';

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
}

interface NavigationGroup {
  section: string;
  items: NavigationItem[];
  defaultOpen?: boolean;
}

const navigationGroups: NavigationGroup[] = [
  {
    section: 'Dashboard',
    items: [
      { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    ],
    defaultOpen: true,
  },
  {
    section: 'Operations',
    items: [
      { name: 'Bookings', href: '/admin/bookings', icon: CalendarDays },
      { name: 'Calendar', href: '/admin/calendar', icon: Calendar },
      { name: 'Quotations', href: '/admin/quotations', icon: FileText },
      { name: 'Payments', href: '/admin/payments', icon: CreditCard },
    ],
    defaultOpen: true,
  },
  {
    section: 'User Management',
    items: [
      { name: 'My Profile', href: '/admin/my-profile', icon: User },
      { name: 'Customers', href: '/admin/customers', icon: Users },
      { name: 'Technicians', href: '/admin/technicians', icon: Wrench },
      { name: 'Users', href: '/admin/users', icon: UserCog },
      { name: 'Roles', href: '/admin/roles', icon: Shield },
    ],
    defaultOpen: false,
  },
  {
    section: 'Services & Products',
    items: [
      { name: 'Services', href: '/admin/services', icon: Settings },
      { name: 'Brands', href: '/admin/brands', icon: Tags },
      { name: 'Spare Parts', href: '/admin/spare-parts', icon: Package },
      { name: 'Subscription Packages', href: '/admin/subscription-packages', icon: BookOpen },
      { name: 'Subscriptions', href: '/admin/subscriptions', icon: Repeat },
    ],
    defaultOpen: false,
  },
  {
    section: 'Marketing',
    items: [
      { name: 'Promos', href: '/admin/promos', icon: Gift },
      { name: 'Mobile Content', href: '/admin/mobile-content', icon: Smartphone },
    ],
    defaultOpen: false,
  },
  {
    section: 'Communications',
    items: [
      { name: 'Support', href: '/admin/support', icon: MessageSquare },
      { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    ],
    defaultOpen: false,
  },
  {
    section: 'Analytics',
    items: [
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
    defaultOpen: false,
  },
];

// Export a wrapper component for pages that need the admin layout
export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    navigationGroups.reduce((acc, group) => {
      acc[group.section] = group.defaultOpen ?? false;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const userId = localStorage.getItem('user_id');
  
  const { data: userProfile } = useQuery<{ data: { nameEn?: string; nameAr?: string; email?: string } }>({
    queryKey: ['/api/v2/admin/users', userId],
    enabled: !!userId,
  });

  useEffect(() => {
    // Check if user is authenticated and has admin role
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'admin') {
      setLocation('/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  useEffect(() => {
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_id');
    setLocation('/login');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleGroup = (section: string) => {
    setOpenGroups(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const user = userProfile?.data;
  const userInitials = user?.nameEn ? user.nameEn.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AD';

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6">
        <Link href="/admin/dashboard" className="flex items-center justify-center group">
          <img 
            src="/logo.svg" 
            alt="Rakeez" 
            className="h-12 w-auto transition-transform duration-300 group-hover:scale-110" 
          />
        </Link>
        <p className="text-center text-xs mt-2 font-medium text-sidebar-foreground/70 animate-in fade-in duration-500">
          Rakeez Admin Portal
        </p>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {navigationGroups.map((group, groupIndex) => {
            const isOpen = openGroups[group.section];

            return (
              <div key={group.section} className="space-y-1">
                {groupIndex > 0 && <Separator className="my-3" />}
                
                <Collapsible open={isOpen} onOpenChange={() => toggleGroup(group.section)}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all duration-200 group">
                    <span className="uppercase tracking-wider group-hover:tracking-widest transition-all duration-200">
                      {group.section}
                    </span>
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? 'rotate-90' : 'rotate-0'}`} />
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="space-y-0.5 mt-1 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200">
                    {group.items.map((item, itemIndex) => {
                      const Icon = item.icon;
                      const isActive = location === item.href || (item.href !== '/admin/dashboard' && location.startsWith(item.href));
                      return (
                        <Link key={item.name} href={item.href}>
                          <a
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group/item
                              ${isActive
                                ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm hover:shadow-md scale-100'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:-translate-y-0.5 hover:shadow-sm'
                            }`}
                            data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                            onClick={() => setMobileMenuOpen(false)}
                            style={{ 
                              animationDelay: `${itemIndex * 50}ms`,
                              animationFillMode: 'backwards'
                            }}
                          >
                            <Icon className={`h-4 w-4 transition-all duration-200 group-hover/item:scale-110 ${
                              isActive 
                                ? 'text-sidebar-primary-foreground' 
                                : 'text-sidebar-foreground/70 group-hover/item:text-sidebar-accent-foreground'
                            }`} />
                            <span className="transition-all duration-200">{item.name}</span>
                          </a>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      
      {/* Compact Bottom Section */}
      <div className="p-3 space-y-3">
        {/* User Info with Avatar */}
        <Link href="/admin/my-profile">
          <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-sidebar-accent transition-all duration-200 cursor-pointer group">
            <Avatar className="h-9 w-9 border-2 border-sidebar-border group-hover:border-sidebar-primary transition-colors duration-200">
              <AvatarImage src={user?.avatar || undefined} alt={user?.nameEn || 'Admin'} />
              <AvatarFallback className="text-xs font-semibold bg-sidebar-primary text-sidebar-primary-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-sidebar-primary transition-colors duration-200">
                {user?.nameEn || 'Admin User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.role || 'Administrator'}
              </p>
            </div>
          </div>
        </Link>

        {/* Action Icons Row */}
        <div className="flex items-center justify-between px-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-sidebar-accent hover:scale-110 active:scale-95"
            data-testid="button-theme-toggle"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors" />
            ) : (
              <Sun className="h-4 w-4 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors" />
            )}
          </Button>

          {/* Logout Icon */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 rounded-lg transition-all duration-200 hover:bg-destructive/10 hover:scale-110 active:scale-95 group/logout"
            data-testid="button-logout"
            title="Logout"
          >
            <LogOut className="h-4 w-4 text-sidebar-foreground/70 group-hover/logout:text-destructive transition-all duration-200 group-hover/logout:rotate-12" />
          </Button>
        </div>
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
            className="fixed top-4 left-4 z-40 transition-all duration-200 hover:scale-110 hover:bg-sidebar-accent active:scale-95"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 transition-transform duration-200 rotate-0 hover:rotate-90" />
            ) : (
              <Menu className="h-6 w-6 transition-transform duration-200" />
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-6 lg:p-8 pt-20 lg:pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}

// Main Admin Dashboard Component
export default function AdminDashboard() {
  return (
    <AdminLayoutWrapper>
      <Switch>
        <Route path="/admin/customers/:id/overview" component={CustomerProfile} />
        <Route path="/admin/customers/:id" component={CustomerProfile} />
        <Route path="/admin/overview" component={AdminOverview} />
        <Route path="/admin/dashboard" component={AdminOverview} />
        <Route path="/admin/my-profile" component={AdminMyProfile} />
        <Route path="/admin/bookings" component={AdminBookings} />
        <Route path="/admin/calendar" component={AdminCalendar} />
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
        <Route path="/admin/subscriptions" component={AdminSubscriptions} />
        <Route path="/admin/subscription-packages" component={AdminSubscriptionPackages} />
        <Route path="/admin/promos" component={AdminPromos} />
        <Route path="/admin/mobile-content" component={AdminMobileContent} />
        <Route path="/admin/analytics" component={AdminAnalytics} />
      </Switch>
    </AdminLayoutWrapper>
  );
}
