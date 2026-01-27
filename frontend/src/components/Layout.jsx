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
  Zap,
  Moon,
  Sun,
  Activity,
  Shield,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getConfig, startSystem, stopSystem, getSystemStatus, getProducts, getDiscoverySets } from '@/lib/api';
import { toast } from 'sonner';
import RealTimeProgressModal from './RealTimeProgressModal';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/dashboard/leads', icon: Users, label: 'Leads' },
  { path: '/dashboard/pipeline', icon: Kanban, label: 'Pipeline' },
  { path: '/dashboard/conversations', icon: MessageSquare, label: 'Conversations' },
  { path: '/dashboard/discovery', icon: Target, label: 'Discovery' },
  { path: '/dashboard/bookings', icon: Calendar, label: 'Bookings' },
  { path: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

function NavLinks({ mobile = false, onMobileClick }) {
  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => mobile && onMobileClick && onMobileClick()}
          className={({ isActive }) => cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive 
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" 
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800",
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
}

export default function Layout() {
  const [isRunning, setIsRunning] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Start flow modal state
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [discoverySets, setDiscoverySets] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedDiscoverySet, setSelectedDiscoverySet] = useState('');
  const [startTestMode, setStartTestMode] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Load user from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    // Check for saved theme - default to dark
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme !== 'light') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/');
    toast.success('Logged out successfully');
  };

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

  const openStartModal = async () => {
    // Fetch products and discovery sets
    try {
      const [productsRes, setsRes, configRes] = await Promise.all([
        getProducts().catch(() => ({ data: [] })),
        getDiscoverySets().catch(() => ({ data: [] })),
        getConfig()
      ]);
      setProducts(productsRes.data || []);
      setDiscoverySets(setsRes.data || []);
      setStartTestMode(configRes.data?.test_mode || false);
      setIsStartModalOpen(true);
    } catch (error) {
      toast.error('Failed to load configuration');
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const productId = selectedProduct === 'none' ? null : selectedProduct || null;
      const discoverySetId = selectedDiscoverySet === 'none' ? null : selectedDiscoverySet || null;
      await startSystem(startTestMode, productId, discoverySetId);
      setIsRunning(true);
      setTestMode(startTestMode);
      setIsStartModalOpen(false);
      toast.success(startTestMode ? 'Pipeline started (Test Mode)' : 'Pipeline started');
    } catch (error) {
      toast.error('Failed to start pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopSystem();
      setIsRunning(false);
      toast.success('Pipeline stopped');
    } catch (error) {
      toast.error('Failed to stop pipeline');
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <NavLink to="/" className="flex items-center gap-2" data-testid="logo">
                <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white dark:text-slate-900" />
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
              {/* Theme Toggle */}
              <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="hidden sm:flex">
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Admin Button */}
              {user?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin')}
                  className="hidden sm:flex gap-1.5 text-amber-600 hover:text-amber-500"
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden md:inline text-sm">{user?.name || 'User'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm">
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {user?.role === 'admin' && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* System Status */}
              <div className="hidden sm:flex items-center gap-2">
                {isRunning && testMode && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium">
                    <TestTube className="w-3 h-3" />
                    TEST
                  </div>
                )}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                  isRunning 
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  )} />
                  {isRunning ? "Active" : "Idle"}
                </div>
              </div>

              {/* System Toggle */}
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <Button
                    onClick={handleStop}
                    disabled={loading}
                    size="sm"
                    data-testid="system-stop-btn"
                    className="gap-2 font-medium bg-red-500 hover:bg-red-600 text-white"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Stop</span>
                  </Button>
                ) : (
                  <Button
                    onClick={openStartModal}
                    disabled={loading}
                    size="sm"
                    data-testid="system-start-btn"
                    className="gap-2 font-medium bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Start</span>
                  </Button>
                )}
                {isRunning && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsProgressModalOpen(true)}
                    className="gap-1.5 text-xs"
                    data-testid="view-activity-btn"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Activity</span>
                  </Button>
                )}
              </div>

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
                      <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white dark:text-slate-900" />
                      </div>
                      <span className="font-bold text-lg">AutoBookd</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <NavLinks mobile onMobileClick={() => setMobileOpen(false)} />
                    </div>
                    <div className="pt-4 border-t flex items-center justify-between">
                      <p className="text-xs text-slate-500">ARI Solutions Inc.</p>
                      <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
                        {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Start Flow Modal */}
      <Dialog open={isStartModalOpen} onOpenChange={setIsStartModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Pipeline</DialogTitle>
            <DialogDescription>
              Select your product and target audience before starting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Product / Service</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger data-testid="select-product">
                  <SelectValue placeholder="Select a product (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No product selected</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {products.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No products defined. <button onClick={() => { setIsStartModalOpen(false); navigate('/settings'); }} className="text-blue-600 underline">Add one in Settings</button>
                </p>
              )}
            </div>

            {/* Discovery Set Selection */}
            <div className="space-y-2">
              <Label>Discovery Set</Label>
              <Select value={selectedDiscoverySet} onValueChange={setSelectedDiscoverySet}>
                <SelectTrigger data-testid="select-discovery-set">
                  <SelectValue placeholder="Select a discovery set (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Use default settings</SelectItem>
                  {discoverySets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {discoverySets.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No discovery sets saved. <button onClick={() => { setIsStartModalOpen(false); navigate('/settings'); }} className="text-blue-600 underline">Add one in Settings</button>
                </p>
              )}
            </div>

            {/* Test Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-0.5">
                <Label className="font-medium">Test Mode</Label>
                <p className="text-xs text-muted-foreground">Simulate without sending emails</p>
              </div>
              <Switch
                checked={startTestMode}
                onCheckedChange={setStartTestMode}
                data-testid="start-test-mode-toggle"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStartModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStart} 
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              <Play className="w-4 h-4 mr-2" />
              {loading ? 'Starting...' : 'Start Pipeline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Real-time Progress Modal */}
      <RealTimeProgressModal 
        isOpen={isProgressModalOpen} 
        onClose={() => setIsProgressModalOpen(false)}
        isRunning={isRunning}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ isRunning, testMode, fetchConfig, navigate }} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-xs text-slate-500 text-center">
            © 2025 ARI Solutions Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
