import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  MessageSquare, 
  Target, 
  Calendar, 
  BarChart3, 
  Settings,
  Play,
  Square,
  Menu,
  X,
  TestTube,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { getConfig, startSystem, stopSystem, getSystemStatus } from '@/lib/api';
import { toast } from 'sonner';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/leads', icon: Users, label: 'Leads' },
  { path: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { path: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { path: '/discovery', icon: Target, label: 'Discovery' },
  { path: '/bookings', icon: Calendar, label: 'Bookings' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [isRunning, setIsRunning] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await getSystemStatus();
      setIsRunning(data.is_running);
      setTestMode(data.test_mode || false);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const fetchConfig = async () => {
    await fetchStatus();
  };

  const handleSystemToggle = async () => {
    setLoading(true);
    try {
      if (isRunning) {
        await stopSystem();
        setIsRunning(false);
        toast.success('Pipeline stopped');
      } else {
        const { data: config } = await getConfig();
        const useTestMode = config.test_mode || false;
        await startSystem(useTestMode);
        setIsRunning(true);
        setTestMode(useTestMode);
        toast.success(useTestMode ? 'Pipeline started (Test Mode)' : 'Pipeline started');
      }
    } catch (error) {
      toast.error('Failed to toggle pipeline');
    } finally {
      setLoading(false);
    }
  };

  const NavLinks = ({ mobile = false }) => (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => mobile && setMobileOpen(false)}
          className={({ isActive }) => cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive 
              ? "bg-slate-900 text-white" 
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
            mobile && "w-full"
          )}
          data-testid={`nav-${item.label.toLowerCase()}`}
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <NavLink to="/" className="flex items-center gap-2" data-testid="logo">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight">AutoBookd</span>
              </NavLink>

              {/* Desktop Nav */}
              <div className="hidden lg:flex items-center gap-1">
                <NavLinks />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* System Status */}
              <div className="hidden sm:flex items-center gap-2">
                {isRunning && testMode && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">
                    <TestTube className="w-3 h-3" />
                    TEST
                  </div>
                )}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                  isRunning 
                    ? "bg-emerald-100 text-emerald-700" 
                    : "bg-slate-100 text-slate-600"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  )} />
                  {isRunning ? "Active" : "Idle"}
                </div>
              </div>

              {/* System Toggle */}
              <Button
                onClick={handleSystemToggle}
                disabled={loading}
                size="sm"
                data-testid="system-toggle-btn"
                className={cn(
                  "gap-2 font-medium",
                  isRunning 
                    ? "bg-red-500 hover:bg-red-600 text-white" 
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                )}
              >
                {isRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Stop</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Start</span>
                  </>
                )}
              </Button>

              {/* Mobile Menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <div className="flex flex-col gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-lg">AutoBookd</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <NavLinks mobile />
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-xs text-slate-500">ARI Solutions Inc.</p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ isRunning, testMode, fetchConfig, navigate }} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-slate-500 text-center">
            © 2025 ARI Solutions Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
