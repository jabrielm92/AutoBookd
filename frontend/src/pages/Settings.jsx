import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon,
  Key,
  Mail,
  Calendar,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  User,
  TestTube,
  Link,
  Linkedin,
  Database,
  Plus,
  Trash2,
  Package,
  FileText,
  Shield,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getConfig, updateConfig, getProducts, createProduct, deleteProduct, getDiscoverySets, createDiscoverySet, deleteDiscoverySet } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [products, setProducts] = useState([]);
  const [discoverySets, setDiscoverySets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  
  // New product form
  const [newProduct, setNewProduct] = useState({ name: '', description: '', features: '' });
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  
  // New discovery set form
  const [newDiscoverySet, setNewDiscoverySet] = useState({ name: '', keywords: '', locations: '' });
  const [isDiscoveryDialogOpen, setIsDiscoveryDialogOpen] = useState(false);
  
  // Email guidelines state
  const [emailGuidelines, setEmailGuidelines] = useState({
    forbidden_words: [],
    preferred_words: [],
    tone: 'professional',
    max_words: 150,
    rules: {
      no_exclamation_marks: false,
      always_include_question: true,
      first_name_only: true,
      no_competitor_mentions: true,
      no_roi_promises: true
    }
  });
  const [forbiddenInput, setForbiddenInput] = useState('');
  const [preferredInput, setPreferredInput] = useState('');

  useEffect(() => {
    fetchData();
    // Check for saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, productsRes, setsRes] = await Promise.all([
        getConfig(),
        getProducts().catch(() => ({ data: [] })),
        getDiscoverySets().catch(() => ({ data: [] }))
      ]);
      setConfig(configRes.data);
      setProducts(productsRes.data || []);
      setDiscoverySets(setsRes.data || []);
      
      if (configRes.data?.email_guidelines) {
        setEmailGuidelines(configRes.data.email_guidelines);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig({ ...config, email_guidelines: emailGuidelines });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
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

  const toggleShowKey = (key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddProduct = async () => {
    try {
      const features = newProduct.features.split(',').map(f => f.trim()).filter(f => f);
      await createProduct({ ...newProduct, features });
      toast.success('Product added');
      setIsProductDialogOpen(false);
      setNewProduct({ name: '', description: '', features: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add product');
    }
  };

  const handleDeleteProduct = async (id) => {
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const handleAddDiscoverySet = async () => {
    try {
      const keywords = newDiscoverySet.keywords.split(',').map(k => k.trim()).filter(k => k);
      const locations = newDiscoverySet.locations.split(',').map(l => l.trim()).filter(l => l);
      await createDiscoverySet({ ...newDiscoverySet, keywords, locations });
      toast.success('Discovery set added');
      setIsDiscoveryDialogOpen(false);
      setNewDiscoverySet({ name: '', keywords: '', locations: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add discovery set');
    }
  };

  const handleDeleteDiscoverySet = async (id) => {
    try {
      await deleteDiscoverySet(id);
      toast.success('Discovery set deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const addForbiddenWord = () => {
    if (!forbiddenInput.trim()) return;
    setEmailGuidelines(prev => ({
      ...prev,
      forbidden_words: [...prev.forbidden_words, forbiddenInput.trim()]
    }));
    setForbiddenInput('');
  };

  const removeForbiddenWord = (word) => {
    setEmailGuidelines(prev => ({
      ...prev,
      forbidden_words: prev.forbidden_words.filter(w => w !== word)
    }));
  };

  const addPreferredWord = () => {
    if (!preferredInput.trim()) return;
    setEmailGuidelines(prev => ({
      ...prev,
      preferred_words: [...prev.preferred_words, preferredInput.trim()]
    }));
    setPreferredInput('');
  };

  const removePreferredWord = (word) => {
    setEmailGuidelines(prev => ({
      ...prev,
      preferred_words: prev.preferred_words.filter(w => w !== word)
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your automation system</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={toggleDarkMode} data-testid="theme-toggle">
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="email">Email Rules</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Test Mode */}
          <Card className={config?.test_mode ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Test Mode
                {config?.test_mode && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                    ACTIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Simulate the full pipeline without sending real emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Enable Test Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Emails are simulated but not sent. Perfect for testing.
                  </p>
                </div>
                <Switch
                  checked={config?.test_mode || false}
                  onCheckedChange={(checked) => setConfig({...config, test_mode: checked})}
                  data-testid="test-mode-toggle"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sender Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Sender Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Your Name</Label>
                  <Input
                    value={config?.sender_name || ''}
                    onChange={(e) => setConfig({...config, sender_name: e.target.value})}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={config?.sender_company || ''}
                    onChange={(e) => setConfig({...config, sender_company: e.target.value})}
                    placeholder="ARI Solutions"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>From Email Address</Label>
                <Input
                  value={config?.from_email || ''}
                  onChange={(e) => setConfig({...config, from_email: e.target.value})}
                  placeholder="outreach@yourdomain.com"
                />
                <p className="text-xs text-muted-foreground">Must be verified in Resend</p>
              </div>
            </CardContent>
          </Card>

          {/* Calendar Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendar Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Calendly Booking Link
                </Label>
                <Input
                  value={config?.calendly_link || ''}
                  onChange={(e) => setConfig({...config, calendly_link: e.target.value})}
                  placeholder="https://calendly.com/your-name/30min"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-sent when leads show positive intent
                </p>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                System Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Daily Outreach Limit</Label>
                  <Input
                    type="number"
                    value={config?.daily_outreach_limit || 50}
                    onChange={(e) => setConfig({...config, daily_outreach_limit: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Follow-ups</Label>
                  <Input
                    type="number"
                    value={config?.max_follow_ups || 2}
                    onChange={(e) => setConfig({...config, max_follow_ups: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Outreach Score Threshold</Label>
                  <Input
                    type="number"
                    value={config?.outreach_score_threshold || 70}
                    onChange={(e) => setConfig({...config, outreach_score_threshold: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority Score Threshold</Label>
                  <Input
                    type="number"
                    value={config?.priority_score_threshold || 80}
                    onChange={(e) => setConfig({...config, priority_score_threshold: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Products / Services
                  </CardTitle>
                  <CardDescription>
                    Define what you're selling. AI uses this to personalize outreach.
                  </CardDescription>
                </div>
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-product-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Product / Service</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Name *</Label>
                        <Input
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          placeholder="Business Process Solutions"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Textarea
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                          placeholder="We help businesses streamline operations, reduce manual work, and capture more leads..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Key Features (comma separated)</Label>
                        <Input
                          value={newProduct.features}
                          onChange={(e) => setNewProduct({...newProduct, features: e.target.value})}
                          placeholder="Lead capture, Customer response, Scheduling"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.description}>
                        Add Product
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No products defined yet</p>
                  <p className="text-sm">Add a product to personalize your outreach</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-start justify-between p-4 rounded-lg border bg-card">
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                        {product.features?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {product.features.map((f, i) => (
                              <Badge key={i} variant="secondary">{f}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discovery Sets Tab */}
        <TabsContent value="discovery" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Discovery Sets
                  </CardTitle>
                  <CardDescription>
                    Save different target configurations for various campaigns
                  </CardDescription>
                </div>
                <Dialog open={isDiscoveryDialogOpen} onOpenChange={setIsDiscoveryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-discovery-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Discovery Set
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Discovery Set</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Set Name *</Label>
                        <Input
                          value={newDiscoverySet.name}
                          onChange={(e) => setNewDiscoverySet({...newDiscoverySet, name: e.target.value})}
                          placeholder="Philadelphia Accountants"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Keywords (comma separated) *</Label>
                        <Input
                          value={newDiscoverySet.keywords}
                          onChange={(e) => setNewDiscoverySet({...newDiscoverySet, keywords: e.target.value})}
                          placeholder="accounting firm, CPA, bookkeeper"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Locations (comma separated) *</Label>
                        <Input
                          value={newDiscoverySet.locations}
                          onChange={(e) => setNewDiscoverySet({...newDiscoverySet, locations: e.target.value})}
                          placeholder="Philadelphia PA, Camden NJ"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleAddDiscoverySet} disabled={!newDiscoverySet.name || !newDiscoverySet.keywords}>
                        Add Set
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {discoverySets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No discovery sets saved yet</p>
                  <p className="text-sm">Add a set to save your target configuration</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {discoverySets.map((set) => (
                    <div key={set.id} className="flex items-start justify-between p-4 rounded-lg border bg-card">
                      <div className="flex-1">
                        <h3 className="font-semibold">{set.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {set.keywords?.map((k, i) => (
                            <Badge key={i} variant="secondary">{k}</Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {set.locations?.map((l, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{l}</Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteDiscoverySet(set.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Rules Tab */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Email Guidelines
              </CardTitle>
              <CardDescription>
                Control how AI writes your outreach emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Forbidden Words */}
              <div className="space-y-3">
                <Label className="text-red-600">Forbidden Words (Never Use)</Label>
                <div className="flex gap-2">
                  <Input
                    value={forbiddenInput}
                    onChange={(e) => setForbiddenInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addForbiddenWord()}
                    placeholder="e.g., AI, automation, bot"
                  />
                  <Button onClick={addForbiddenWord} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {emailGuidelines.forbidden_words.map((word, i) => (
                    <Badge key={i} variant="destructive" className="flex items-center gap-1">
                      {word}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeForbiddenWord(word)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Preferred Words */}
              <div className="space-y-3">
                <Label className="text-emerald-600">Preferred Words (Favor Using)</Label>
                <div className="flex gap-2">
                  <Input
                    value={preferredInput}
                    onChange={(e) => setPreferredInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPreferredWord()}
                    placeholder="e.g., solutions, streamline, growth"
                  />
                  <Button onClick={addPreferredWord} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {emailGuidelines.preferred_words.map((word, i) => (
                    <Badge key={i} variant="default" className="bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      {word}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removePreferredWord(word)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Tone & Length */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Email Tone</Label>
                  <Select 
                    value={emailGuidelines.tone} 
                    onValueChange={(v) => setEmailGuidelines({...emailGuidelines, tone: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Words Per Email</Label>
                  <Input
                    type="number"
                    value={emailGuidelines.max_words}
                    onChange={(e) => setEmailGuidelines({...emailGuidelines, max_words: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <Separator />

              {/* Rule Toggles */}
              <div className="space-y-4">
                <Label>Email Rules</Label>
                <div className="space-y-3">
                  {[
                    { key: 'no_exclamation_marks', label: 'No exclamation marks' },
                    { key: 'always_include_question', label: 'Always end with a question' },
                    { key: 'first_name_only', label: 'Use first name only (not Mr./Ms.)' },
                    { key: 'no_competitor_mentions', label: 'Never mention competitors' },
                    { key: 'no_roi_promises', label: 'Don\'t make ROI/results promises' }
                  ].map((rule) => (
                    <div key={rule.key} className="flex items-center justify-between py-2">
                      <span className="text-sm">{rule.label}</span>
                      <Switch
                        checked={emailGuidelines.rules[rule.key] || false}
                        onCheckedChange={(checked) => setEmailGuidelines({
                          ...emailGuidelines,
                          rules: { ...emailGuidelines.rules, [rule.key]: checked }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Keys
              </CardTitle>
              <CardDescription>Configure your integration credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenAI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    OpenAI API Key
                    {config?.openai_api_key ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Not Set
                      </Badge>
                    )}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.openai ? 'text' : 'password'}
                    value={config?.openai_api_key || ''}
                    onChange={(e) => setConfig({...config, openai_api_key: e.target.value})}
                    placeholder="sk-..."
                  />
                  <Button variant="outline" size="icon" onClick={() => toggleShowKey('openai')}>
                    {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Resend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Resend API Key
                    {config?.resend_api_key ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Not Set
                      </Badge>
                    )}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.resend ? 'text' : 'password'}
                    value={config?.resend_api_key || ''}
                    onChange={(e) => setConfig({...config, resend_api_key: e.target.value})}
                    placeholder="re_..."
                  />
                  <Button variant="outline" size="icon" onClick={() => toggleShowKey('resend')}>
                    {showKeys.resend ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Apollo (Future) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Apollo.io API Key
                  <Badge variant="outline" className="bg-slate-100 text-slate-600">Future</Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.apollo ? 'text' : 'password'}
                    value={config?.apollo_api_key || ''}
                    onChange={(e) => setConfig({...config, apollo_api_key: e.target.value})}
                    placeholder="Apollo.io API key"
                  />
                  <Button variant="outline" size="icon" onClick={() => toggleShowKey('apollo')}>
                    {showKeys.apollo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
