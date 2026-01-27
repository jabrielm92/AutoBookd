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
              ? "bg-red-600 text-white" 
              : "text-slate-300 hover:text-white hover:bg-slate-800",
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

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Navbar - Simplified */}
      <nav className="sticky top-0 z-50 w-full bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2" data-testid="logo">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">AutoBookd</span>
            </NavLink>

            {/* Desktop Nav - Icons only on medium screens */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-red-600 text-white" 
                      : "text-slate-300 hover:text-white hover:bg-slate-800"
                  )}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Right Section - Minimal */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-8 w-8 text-slate-300 hover:text-white">
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Admin Button */}
              {user?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/admin')}
                  className="h-8 w-8 text-amber-400 hover:text-amber-300"
                  title="Admin"
                >
                  <Shield className="w-4 h-4" />
                </Button>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-slate-300 hover:text-white">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
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

              {/* Mobile Menu */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="text-slate-300" data-testid="mobile-menu-btn">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-slate-900 border-slate-800">
                  <div className="flex flex-col gap-6 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-lg text-white">AutoBookd</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <NavLinks mobile onMobileClick={() => setMobileOpen(false)} />
                    </div>
                    <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
                      <p className="text-xs text-slate-400">ARI Solutions Inc.</p>
                      <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="text-slate-300">
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

      {/* Control Bar - Below Nav */}
      <div className="sticky top-14 z-40 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            isRunning 
              ? "bg-emerald-900/50 text-emerald-400 border border-emerald-700" 
              : "bg-slate-800 text-slate-400 border border-slate-700"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
            )} />
            {isRunning ? "Pipeline Active" : "Pipeline Idle"}
            {isRunning && testMode && (
              <span className="ml-1 text-amber-400 text-xs">(TEST)</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {isRunning ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProgressModalOpen(true)}
                  className="gap-1.5 border-slate-600 text-slate-300 hover:text-white"
                  data-testid="view-activity-btn"
                >
                  <Activity className="w-4 h-4" />
                  Activity
                </Button>
                <Button
                  onClick={handleStop}
                  disabled={loading}
                  size="sm"
                  data-testid="system-stop-btn"
                  className="gap-1.5 font-medium bg-red-600 hover:bg-red-700 text-white"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
              </>
            ) : (
              <Button
                onClick={openStartModal}
                disabled={loading}
                size="sm"
                data-testid="system-start-btn"
                className="gap-1.5 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="w-4 h-4" />
                Start Pipeline
              </Button>
            )}
          </div>
        </div>
      </div>

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
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet context={{ isRunning, testMode, fetchConfig, navigate }} />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <p className="text-xs text-slate-500 text-center">
            © 2025 ARI Solutions Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
