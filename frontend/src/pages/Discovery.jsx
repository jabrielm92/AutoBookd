import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  MapPin,
  Plus,
  X,
  Play,
  RefreshCw,
  CheckCircle,
  Mail,
  FileText,
  Send,
  ArrowRight,
  Package,
  Shield,
  Trash2,
  Save,
  Pencil
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api, { getConfig, updateConfig, getProducts, createProduct, deleteProduct, updateProduct, getDiscoverySets, createDiscoverySet, deleteDiscoverySet, updateDiscoverySet, getPipelineActivity } from '@/lib/api';

export default function Discovery() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [pipelineCounts, setPipelineCounts] = useState({});
  const [products, setProducts] = useState([]);
  const [discoverySets, setDiscoverySets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  
  // Quick scrape inputs
  const [manualKeyword, setManualKeyword] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  
  // New product form
  const [newProduct, setNewProduct] = useState({ name: '', description: '', features: '', email_guidelines: '' });
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  
  // Edit product
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] = useState(false);
  
  // New discovery set form
  const [newDiscoverySet, setNewDiscoverySet] = useState({ 
    name: '', 
    keywords: '', 
    locations: '',
    min_reviews: 5,
    max_per_search: 20,
    daily_limit: 50
  });
  const [isDiscoveryDialogOpen, setIsDiscoveryDialogOpen] = useState(false);
  
  // Edit discovery set
  const [editingDiscoverySet, setEditingDiscoverySet] = useState(null);
  const [isEditDiscoveryDialogOpen, setIsEditDiscoveryDialogOpen] = useState(false);
  
  // Email guidelines
  const [emailGuidelines, setEmailGuidelines] = useState({
    forbidden_words: [],
    preferred_words: [],
    tone: 'professional',
    max_words: 150,
    custom_prompt: '',
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
    const interval = setInterval(() => fetchCounts(), 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, activityRes, productsRes, setsRes] = await Promise.all([
        getConfig(),
        getPipelineActivity(1).catch(() => ({ data: { counts: {} } })),
        getProducts().catch(() => ({ data: [] })),
        getDiscoverySets().catch(() => ({ data: [] }))
      ]);
      setConfig(configRes.data);
      setPipelineCounts(activityRes.data?.counts || {});
      setProducts(productsRes.data || []);
      setDiscoverySets(setsRes.data || []);
      
      if (configRes.data?.email_guidelines) {
        setEmailGuidelines(configRes.data.email_guidelines);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    try {
      const res = await getPipelineActivity(1);
      setPipelineCounts(res.data?.counts || {});
    } catch (error) {
      console.error('Failed to fetch counts');
    }
  };

  const handleSaveEmailGuidelines = async () => {
    setSaving(true);
    try {
      await updateConfig({ email_guidelines: emailGuidelines });
      toast.success('Email guidelines saved');
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleScrapeNow = async () => {
    if (!manualKeyword || !manualLocation) {
      toast.error('Enter keyword and location');
      return;
    }
    
    setScraping(true);
    try {
      const { data } = await api.post(`/scrape/now?keyword=${encodeURIComponent(manualKeyword)}&location=${encodeURIComponent(manualLocation)}&limit=20`);
      toast.success(`Scraped ${data.scraped} leads, saved ${data.saved} new`);
      fetchCounts();
    } catch (error) {
      toast.error('Scraping failed');
    } finally {
      setScraping(false);
    }
  };

  const handleAddProduct = async () => {
    try {
      const features = newProduct.features.split(',').map(f => f.trim()).filter(f => f);
      await createProduct({ 
        name: newProduct.name,
        description: newProduct.description,
        features,
        email_guidelines: newProduct.email_guidelines || null
      });
      toast.success('Product added');
      setIsProductDialogOpen(false);
      setNewProduct({ name: '', description: '', features: '', email_guidelines: '' });
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
      toast.error('Failed to delete');
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct({
      ...product,
      features: product.features?.join(', ') || ''
    });
    setIsEditProductDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    try {
      const features = editingProduct.features.split(',').map(f => f.trim()).filter(f => f);
      await updateProduct(editingProduct.id, {
        name: editingProduct.name,
        description: editingProduct.description,
        features,
        email_guidelines: editingProduct.email_guidelines || null
      });
      toast.success('Product updated');
      setIsEditProductDialogOpen(false);
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const handleAddDiscoverySet = async () => {
    try {
      const keywords = newDiscoverySet.keywords.split(',').map(k => k.trim()).filter(k => k);
      const locations = newDiscoverySet.locations.split(',').map(l => l.trim()).filter(l => l);
      await createDiscoverySet({ 
        name: newDiscoverySet.name,
        keywords, 
        locations,
        min_reviews: newDiscoverySet.min_reviews,
        max_per_search: newDiscoverySet.max_per_search,
        daily_limit: newDiscoverySet.daily_limit
      });
      toast.success('Discovery set saved');
      setIsDiscoveryDialogOpen(false);
      setNewDiscoverySet({ name: '', keywords: '', locations: '', min_reviews: 5, max_per_search: 20, daily_limit: 50 });
      fetchData();
    } catch (error) {
      toast.error('Failed to save');
    }
  };

  const handleDeleteDiscoverySet = async (id) => {
    try {
      await deleteDiscoverySet(id);
      toast.success('Deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleEditDiscoverySet = (set) => {
    setEditingDiscoverySet({
      ...set,
      keywords: set.keywords?.join(', ') || '',
      locations: set.locations?.join(', ') || ''
    });
    setIsEditDiscoveryDialogOpen(true);
  };

  const handleUpdateDiscoverySet = async () => {
    try {
      const keywords = editingDiscoverySet.keywords.split(',').map(k => k.trim()).filter(k => k);
      const locations = editingDiscoverySet.locations.split(',').map(l => l.trim()).filter(l => l);
      await updateDiscoverySet(editingDiscoverySet.id, {
        name: editingDiscoverySet.name,
        keywords,
        locations,
        min_reviews: editingDiscoverySet.min_reviews,
        max_per_search: editingDiscoverySet.max_per_search,
        daily_limit: editingDiscoverySet.daily_limit
      });
      toast.success('Discovery set updated');
      setIsEditDiscoveryDialogOpen(false);
      setEditingDiscoverySet(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to update discovery set');
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

  const navigateToStage = (stage) => {
    navigate(`/leads?stage=${stage}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Discovery</h1>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const pipelineStages = [
    { key: 'scraped', label: 'Scraped', value: pipelineCounts.scraped || 0, icon: Search, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30', stage: 'scraped' },
    { key: 'enriched', label: 'Enriched', value: pipelineCounts.enriched || 0, icon: Mail, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30', stage: 'needs_research' },
    { key: 'researched', label: 'Researched', value: pipelineCounts.researched || 0, icon: FileText, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30', stage: 'ready_for_outreach' },
    { key: 'contacted', label: 'Contacted', value: pipelineCounts.in_sequence || 0, icon: Send, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30', stage: 'in_sequence' },
    { key: 'emails_sent', label: 'Emails Sent', value: pipelineCounts.emails_sent || 0, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30', stage: 'booked' }
  ];

  return (
    <div className="space-y-6" data-testid="discovery-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discovery & Campaign Setup</h1>
          <p className="text-slate-500 dark:text-slate-400">Configure targets, products, and email rules</p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pipeline Funnel - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        {pipelineStages.map((stage) => (
          <Card 
            key={stage.key}
            className="pipeline-card clickable cursor-pointer hover:border-blue-400 dark:hover:border-blue-500"
            onClick={() => navigateToStage(stage.stage)}
            data-testid={`pipeline-card-${stage.key}`}
          >
            <CardContent className="pt-4 pb-3 px-3 text-center">
              <div className={cn("w-8 h-8 md:w-10 md:h-10 rounded-lg mx-auto mb-2 flex items-center justify-center", stage.color.split(' ').slice(1).join(' '))}>
                <stage.icon className={cn("w-4 h-4 md:w-5 md:h-5", stage.color.split(' ')[0])} />
              </div>
              <p className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white">{stage.value}</p>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium truncate">{stage.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scrape" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="scrape" className="text-xs md:text-sm">Quick Scrape</TabsTrigger>
          <TabsTrigger value="targets" className="text-xs md:text-sm">Discovery Sets</TabsTrigger>
          <TabsTrigger value="products" className="text-xs md:text-sm">Products</TabsTrigger>
          <TabsTrigger value="email" className="text-xs md:text-sm">Email Rules</TabsTrigger>
        </TabsList>

        {/* Quick Scrape Tab */}
        <TabsContent value="scrape">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="w-5 h-5" />
                Quick Scrape (Google Maps via SerpAPI)
              </CardTitle>
              <CardDescription>Test scraping with a single search - uses 1 API credit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Keyword</Label>
                  <Input
                    placeholder="e.g., accounting firm"
                    value={manualKeyword}
                    onChange={(e) => setManualKeyword(e.target.value)}
                    data-testid="scrape-keyword-input"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Location</Label>
                  <Input
                    placeholder="e.g., Philadelphia, PA"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    data-testid="scrape-location-input"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleScrapeNow} disabled={scraping} className="w-full md:w-auto" data-testid="scrape-now-btn">
                    {scraping ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                    Scrape Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discovery Sets Tab */}
        <TabsContent value="targets">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="w-5 h-5" />
                    Saved Discovery Sets
                  </CardTitle>
                  <CardDescription>Target configurations for different campaigns</CardDescription>
                </div>
                <Dialog open={isDiscoveryDialogOpen} onOpenChange={setIsDiscoveryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-discovery-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      New Set
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Discovery Set</DialogTitle>
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
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Min Reviews</Label>
                          <Input
                            type="number"
                            value={newDiscoverySet.min_reviews}
                            onChange={(e) => setNewDiscoverySet({...newDiscoverySet, min_reviews: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max/Search</Label>
                          <Input
                            type="number"
                            value={newDiscoverySet.max_per_search}
                            onChange={(e) => setNewDiscoverySet({...newDiscoverySet, max_per_search: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Daily Limit</Label>
                          <Input
                            type="number"
                            value={newDiscoverySet.daily_limit}
                            onChange={(e) => setNewDiscoverySet({...newDiscoverySet, daily_limit: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleAddDiscoverySet} disabled={!newDiscoverySet.name || !newDiscoverySet.keywords}>
                        Save Set
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {discoverySets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>No discovery sets saved</p>
                  <p className="text-sm">Create a set to define your target audience</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {discoverySets.map((set) => (
                    <div key={set.id} className="flex items-start justify-between p-4 rounded-lg border dark:border-slate-700 bg-card">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{set.name}</h3>
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                          Min {set.min_reviews} reviews • Max {set.max_per_search}/search • {set.daily_limit}/day
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditDiscoverySet(set)} data-testid={`edit-discovery-set-${set.id}`}>
                          <Pencil className="w-4 h-4 text-slate-400 hover:text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDiscoverySet(set.id)} data-testid={`delete-discovery-set-${set.id}`}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="w-5 h-5" />
                    Products / Services
                  </CardTitle>
                  <CardDescription>What you sell - AI uses this to personalize outreach</CardDescription>
                </div>
                <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-product-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-white">Add Product / Service</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-slate-300">Name *</Label>
                        <Input
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                          placeholder="Business Process Solutions"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Description *</Label>
                        <Textarea
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                          placeholder="We help businesses streamline operations..."
                          rows={3}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">Key Features (comma separated)</Label>
                        <Input
                          value={newProduct.features}
                          onChange={(e) => setNewProduct({...newProduct, features: e.target.value})}
                          placeholder="Lead capture, Customer response"
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-300">AI Email Instructions</Label>
                        <p className="text-xs text-slate-400 mb-1">Tell the AI how to pitch this product. Be specific!</p>
                        <Textarea
                          value={newProduct.email_guidelines}
                          onChange={(e) => setNewProduct({...newProduct, email_guidelines: e.target.value})}
                          placeholder="Examples:&#10;• Focus on our 24/7 emergency response&#10;• Mention we're locally owned for 15 years&#10;• Emphasize cost savings over competitors&#10;• Reference their Google reviews when relevant&#10;• Highlight our same-day service guarantee"
                          rows={5}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" className="border-slate-700 text-slate-300">Cancel</Button>
                      </DialogClose>
                      <Button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.description} className="bg-red-600 hover:bg-red-700">
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
                  <p>No products defined</p>
                  <p className="text-sm">Add a product to personalize outreach</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-start justify-between p-4 rounded-lg border dark:border-slate-700 bg-card">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                        {product.features?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {product.features.map((f, i) => (
                              <Badge key={i} variant="secondary">{f}</Badge>
                            ))}
                          </div>
                        )}
                        {product.email_guidelines && (
                          <p className="text-xs text-blue-400 dark:text-blue-300 mt-2">
                            ✓ Has AI email instructions
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} data-testid={`edit-product-${product.id}`}>
                          <Pencil className="w-4 h-4 text-slate-400 hover:text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} data-testid={`delete-product-${product.id}`}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Rules Tab */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5" />
                    Email Guidelines
                  </CardTitle>
                  <CardDescription>Control how AI writes your outreach emails</CardDescription>
                </div>
                <Button onClick={handleSaveEmailGuidelines} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Rules'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Forbidden Words */}
              <div className="space-y-3">
                <Label className="text-red-600 dark:text-red-400">Forbidden Words (Never Use)</Label>
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
                <Label className="text-emerald-600 dark:text-emerald-400">Preferred Words (Favor Using)</Label>
                <div className="flex gap-2">
                  <Input
                    value={preferredInput}
                    onChange={(e) => setPreferredInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPreferredWord()}
                    placeholder="e.g., solutions, streamline"
                  />
                  <Button onClick={addPreferredWord} size="icon">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {emailGuidelines.preferred_words.map((word, i) => (
                    <Badge key={i} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
                      {word}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removePreferredWord(word)} />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Tone & Length */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    onChange={(e) => setEmailGuidelines({...emailGuidelines, max_words: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
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
                    { key: 'no_roi_promises', label: "Don't make ROI/results promises" }
                  ].map((rule) => (
                    <div key={rule.key} className="flex items-center justify-between py-2">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{rule.label}</span>
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

              <Separator />

              {/* Note about product-specific guidelines */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  <strong>Tip:</strong> For product-specific AI instructions (how to pitch your service), add them when creating/editing a Product above. 
                  The rules on this tab apply globally to all emails.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductDialogOpen} onOpenChange={setIsEditProductDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Product / Service</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Name *</Label>
                <Input
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  placeholder="Business Process Solutions"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Description *</Label>
                <Textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  placeholder="We help businesses streamline operations..."
                  rows={3}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Key Features (comma separated)</Label>
                <Input
                  value={editingProduct.features}
                  onChange={(e) => setEditingProduct({...editingProduct, features: e.target.value})}
                  placeholder="Lead capture, Customer response"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">AI Email Instructions</Label>
                <p className="text-xs text-slate-400 mb-1">Tell the AI how to pitch this product. Be specific!</p>
                <Textarea
                  value={editingProduct.email_guidelines || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, email_guidelines: e.target.value})}
                  placeholder="Examples:&#10;• Focus on our 24/7 emergency response&#10;• Mention we're locally owned for 15 years&#10;• Emphasize cost savings over competitors"
                  rows={5}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-slate-700 text-slate-300">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleUpdateProduct} 
              disabled={!editingProduct?.name || !editingProduct?.description} 
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Discovery Set Dialog */}
      <Dialog open={isEditDiscoveryDialogOpen} onOpenChange={setIsEditDiscoveryDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Discovery Set</DialogTitle>
          </DialogHeader>
          {editingDiscoverySet && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Set Name *</Label>
                <Input
                  value={editingDiscoverySet.name}
                  onChange={(e) => setEditingDiscoverySet({...editingDiscoverySet, name: e.target.value})}
                  placeholder="e.g., Service Businesses - Philly"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Keywords * (comma separated)</Label>
                <Textarea
                  value={editingDiscoverySet.keywords}
                  onChange={(e) => setEditingDiscoverySet({...editingDiscoverySet, keywords: e.target.value})}
                  placeholder="plumber, electrician, HVAC contractor"
                  rows={2}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Locations * (comma separated)</Label>
                <Input
                  value={editingDiscoverySet.locations}
                  onChange={(e) => setEditingDiscoverySet({...editingDiscoverySet, locations: e.target.value})}
                  placeholder="Philadelphia PA, Camden NJ"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Min Reviews</Label>
                  <Input
                    type="number"
                    value={editingDiscoverySet.min_reviews}
                    onChange={(e) => setEditingDiscoverySet({...editingDiscoverySet, min_reviews: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Max/Search</Label>
                  <Input
                    type="number"
                    value={editingDiscoverySet.max_per_search}
                    onChange={(e) => setEditingDiscoverySet({...editingDiscoverySet, max_per_search: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Daily Limit</Label>
                  <Input
                    type="number"
                    value={editingDiscoverySet.daily_limit}
                    onChange={(e) => setEditingDiscoverySet({...editingDiscoverySet, daily_limit: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-slate-700 text-slate-300">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleUpdateDiscoverySet} 
              disabled={!editingDiscoverySet?.name || !editingDiscoverySet?.keywords}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
