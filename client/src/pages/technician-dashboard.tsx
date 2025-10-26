import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { Route, Switch } from 'wouter';
import {
  Calendar,
  Upload,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Import sub-pages
import TechnicianOverview from './technician/overview';
import TechnicianBookings from './technician/bookings';
import TechnicianCalendar from './technician/calendar';
import TechnicianUploads from './technician/uploads';
import TechnicianChat from './technician/chat';

const navigation = [
  { name: 'Overview', href: '/technician/dashboard', icon: Home },
  { name: 'My Bookings', href: '/technician/bookings', icon: Calendar },
  { name: 'Calendar', href: '/technician/calendar', icon: Calendar },
  { name: 'Uploads', href: '/technician/uploads', icon: Upload },
  { name: 'Chat', href: '/technician/chat', icon: MessageSquare },
];

export default function TechnicianDashboard() {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role');

    if (!token || role !== 'technician') {
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
        <Link href="/technician/dashboard" className="flex items-center space-x-2">
          <span className="text-2xl">🧽</span>
          <div className="flex flex-col">
            <span className="text-lg font-bold">Rakeez</span>
            <span className="text-xs text-muted-foreground">Technician Portal</span>
          </div>
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== '/technician/dashboard' && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
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
      <aside className="hidden lg:block w-64 h-full">
        <Sidebar />
      </aside>

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

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-6 lg:p-8 pt-20 lg:pt-8">
          <Switch>
            <Route path="/technician/dashboard" component={TechnicianOverview} />
            <Route path="/technician/bookings" component={TechnicianBookings} />
            <Route path="/technician/calendar" component={TechnicianCalendar} />
            <Route path="/technician/uploads" component={TechnicianUploads} />
            <Route path="/technician/chat" component={TechnicianChat} />
          </Switch>
        </div>
      </main>
    </div>
  );
}
