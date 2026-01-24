import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
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
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getConfig, startSystem, stopSystem } from '@/lib/api';
import { toast } from 'sonner';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/leads', icon: Users, label: 'Leads' },
  { path: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { path: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { path: '/niches', icon: Target, label: 'Niches' },
  { path: '/bookings', icon: Calendar, label: 'Bookings' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await getConfig();
      setIsRunning(data.is_running);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const handleSystemToggle = async () => {
    setLoading(true);
    try {
      if (isRunning) {
        await stopSystem();
        setIsRunning(false);
        toast.success('System stopped');
      } else {
        await startSystem();
        setIsRunning(true);
        toast.success('System started');
      }
    } catch (error) {
      toast.error('Failed to toggle system');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-40 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">AutoBooked</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* System Control */}
        <div className="p-4 border-b border-border">
          <Button
            onClick={handleSystemToggle}
            disabled={loading}
            className={cn(
              "w-full justify-center gap-2 font-semibold transition-all",
              isRunning 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            )}
          >
            {isRunning ? (
              <>
                <Square className="w-4 h-4" />
                {!collapsed && "Stop System"}
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                {!collapsed && "Start System"}
              </>
            )}
          </Button>
          {!collapsed && (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
              )} />
              {isRunning ? "Running" : "Stopped"}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                collapsed && "justify-center"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              ARI Solutions Inc.
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={cn(
        "min-h-screen transition-all duration-300",
        collapsed ? "ml-16" : "ml-64"
      )}>
        <div className="p-6">
          <Outlet context={{ isRunning, fetchConfig }} />
        </div>
      </main>
    </div>
  );
}
