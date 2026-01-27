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
  Database,
  Flame,
  Clock,
  RotateCcw,
  MapPin,
  Pencil,
  Trash2,
  Plus,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getConfig, updateConfig, resetDailyLimits, getDiscoverySets, createDiscoverySet, updateDiscoverySet, deleteDiscoverySet, getMySubscription } from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [resettingLimits, setResettingLimits] = useState(false);
  
  // Discovery Sets state
  const [discoverySets, setDiscoverySets] = useState([]);
  const [editingSet, setEditingSet] = useState(null);
  const [isSetDialogOpen, setIsSetDialogOpen] = useState(false);
  const [setForm, setSetForm] = useState({
    name: '',
    keywords: '',
    locations: '',
    daily_limit: 100,
    max_per_search: 20,
    min_reviews: 0
  });
  
  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchDiscoverySets();
    fetchSubscription();
  }, []);
  
  const fetchSubscription = async () => {
    setLoadingSubscription(true);
    try {
      const { data } = await getMySubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription');
    } finally {
      setLoadingSubscription(false);
    }
  };
  
  const handleManageSubscription = async () => {
    try {
      const { data } = await api.post('/stripe/portal');
      if (data.portal_url) {
        window.open(data.portal_url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to open billing portal');
    }
  };
  
  const handleSubscribe = async () => {
    try {
      const { data } = await api.post('/stripe/create-checkout');
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (error) {
      toast.error('Failed to start checkout');
    }
  };

  const fetchConfig = async () => {
    try {
      const { data } = await getConfig();
      setConfig(data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscoverySets = async () => {
    try {
      const { data } = await getDiscoverySets();
      setDiscoverySets(data || []);
    } catch (error) {
      console.error('Failed to load discovery sets');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig(config);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetLimits = async () => {
    setResettingLimits(true);
    try {
      await resetDailyLimits();
      toast.success('Daily limits reset successfully');
    } catch (error) {
      toast.error('Failed to reset limits');
    } finally {
      setResettingLimits(false);
    }
  };

  const openSetDialog = (set = null) => {
    if (set) {
      setEditingSet(set);
      setSetForm({
        name: set.name || '',
        keywords: (set.keywords || []).join(', '),
        locations: (set.locations || []).join(', '),
        daily_limit: set.daily_limit || 100,
        max_per_search: set.max_per_search || 20,
        min_reviews: set.min_reviews || 0
      });
    } else {
      setEditingSet(null);
      setSetForm({
        name: '',
        keywords: '',
        locations: '',
        daily_limit: 100,
        max_per_search: 20,
        min_reviews: 0
      });
    }
    setIsSetDialogOpen(true);
  };

  const handleSaveSet = async () => {
    try {
      const payload = {
        name: setForm.name,
        keywords: setForm.keywords.split(',').map(k => k.trim()).filter(Boolean),
        locations: setForm.locations.split(',').map(l => l.trim()).filter(Boolean),
        daily_limit: parseInt(setForm.daily_limit) || 100,
        max_per_search: parseInt(setForm.max_per_search) || 20,
        min_reviews: parseInt(setForm.min_reviews) || 0
      };
      
      if (editingSet) {
        await updateDiscoverySet(editingSet.id, payload);
        toast.success('Discovery set updated');
      } else {
        await createDiscoverySet(payload);
        toast.success('Discovery set created');
      }
      setIsSetDialogOpen(false);
      fetchDiscoverySets();
    } catch (error) {
      toast.error('Failed to save discovery set');
    }
  };

  const handleDeleteSet = async (id) => {
    if (!window.confirm('Delete this discovery set?')) return;
    try {
      await deleteDiscoverySet(id);
      toast.success('Discovery set deleted');
      fetchDiscoverySets();
    } catch (error) {
      toast.error('Failed to delete discovery set');
    }
  };

  const toggleShowKey = (key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle number input that allows backspace
  const handleNumberChange = (field, value) => {
    if (value === '') {
      setConfig({ ...config, [field]: '' });
    } else {
      const num = parseInt(value);
      if (!isNaN(num)) {
        setConfig({ ...config, [field]: num });
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400">System configuration and API keys</p>
        </div>
        <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn" className="bg-red-600 hover:bg-red-700">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-slate-800">
          <TabsTrigger value="general" className="text-xs md:text-sm">General</TabsTrigger>
          <TabsTrigger value="subscription" className="text-xs md:text-sm">Subscription</TabsTrigger>
          <TabsTrigger value="discovery" className="text-xs md:text-sm">Discovery</TabsTrigger>
          <TabsTrigger value="system" className="text-xs md:text-sm">System</TabsTrigger>
          <TabsTrigger value="api" className="text-xs md:text-sm">API Keys</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          {/* Test Mode */}
          <Card className={config?.test_mode ? "border-amber-500 bg-amber-950/20" : "bg-slate-900 border-slate-800"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <TestTube className="w-5 h-5" />
                Test Mode
                {config?.test_mode && (
                  <Badge variant="outline" className="bg-amber-900/50 text-amber-400 border-amber-700">
                    ACTIVE
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Simulate the full pipeline without sending real emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Enable Test Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Emails are simulated but not sent.
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
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CreditCard className="w-5 h-5" />
                Subscription Status
              </CardTitle>
              <CardDescription className="text-slate-400">
                Manage your AutoBookd subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingSubscription ? (
                <div className="h-32 skeleton rounded-lg" />
              ) : subscription ? (
                <>
                  {/* Current Plan */}
                  <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{subscription.plan_name}</h3>
                        <p className="text-slate-400">{subscription.plan_price}</p>
                      </div>
                      <Badge className={
                        subscription.subscription_status === 'active' ? 'bg-emerald-600' :
                        subscription.subscription_status === 'trial' ? 'bg-blue-600' :
                        subscription.subscription_status === 'cancelled' ? 'bg-orange-600' :
                        'bg-slate-600'
                      }>
                        {subscription.subscription_status === 'none' ? 'No Subscription' : 
                         subscription.subscription_status.charAt(0).toUpperCase() + subscription.subscription_status.slice(1)}
                      </Badge>
                    </div>
                    
                    <Separator className="bg-slate-700 my-4" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {subscription.trial_ends_at && (
                        <div>
                          <p className="text-slate-500">Trial Ends</p>
                          <p className="text-white font-medium">
                            {format(new Date(subscription.trial_ends_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                      )}
                      {subscription.next_payment_date && (
                        <div>
                          <p className="text-slate-500">Next Payment</p>
                          <p className="text-white font-medium">
                            {format(new Date(subscription.next_payment_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      )}
                      {subscription.subscription_ends_at && subscription.subscription_status === 'cancelled' && (
                        <div>
                          <p className="text-slate-500">Access Until</p>
                          <p className="text-white font-medium">
                            {format(new Date(subscription.subscription_ends_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {subscription.cancel_at_period_end && (
                      <div className="mt-4 p-3 rounded bg-orange-900/30 border border-orange-700">
                        <p className="text-orange-400 text-sm">
                          Your subscription is set to cancel at the end of the current billing period.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    {subscription.subscription_status === 'none' || subscription.subscription_status === 'expired' ? (
                      <Button 
                        onClick={handleSubscribe}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Subscribe Now
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleManageSubscription}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-800"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Manage Subscription
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-400">Unable to load subscription info</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discovery Tab */}
        <TabsContent value="discovery" className="space-y-6">
          {/* Reset Daily Limits */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <RotateCcw className="w-5 h-5" />
                Daily Scrape Limits
              </CardTitle>
              <CardDescription className="text-slate-400">
                Reset your daily scrape counter if you hit the limit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div>
                  <p className="text-sm text-slate-300">If your pipeline stopped due to daily limits, reset here to continue scraping.</p>
                  <p className="text-xs text-slate-500 mt-1">Limits reset automatically at midnight UTC</p>
                </div>
                <Button 
                  onClick={handleResetLimits} 
                  disabled={resettingLimits}
                  variant="outline"
                  className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/30"
                  data-testid="reset-limits-btn"
                >
                  <RotateCcw className={`w-4 h-4 mr-2 ${resettingLimits ? 'animate-spin' : ''}`} />
                  {resettingLimits ? 'Resetting...' : 'Reset Limits'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <SettingsIcon className="w-5 h-5" />
                System Settings
              </CardTitle>
              <CardDescription className="text-slate-400">Configure automation behavior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Daily Outreach Limit</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={config?.daily_outreach_limit ?? ''}
                    onChange={(e) => handleNumberChange('daily_outreach_limit', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Max emails per day</p>
                </div>
                <div className="space-y-2">
                  <Label>Max Follow-ups</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={config?.max_follow_ups ?? ''}
                    onChange={(e) => handleNumberChange('max_follow_ups', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Per lead before stopping</p>
                </div>
                <div className="space-y-2">
                  <Label>Outreach Score Threshold</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={config?.outreach_score_threshold ?? ''}
                    onChange={(e) => handleNumberChange('outreach_score_threshold', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Minimum score to contact</p>
                </div>
                <div className="space-y-2">
                  <Label>Priority Score Threshold</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={config?.priority_score_threshold ?? ''}
                    onChange={(e) => handleNumberChange('priority_score_threshold', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Score for priority queue</p>
                </div>
                <div className="space-y-2">
                  <Label>Follow-up Delay (Days)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={config?.follow_up_days ?? 2}
                    onChange={(e) => handleNumberChange('follow_up_days', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Days between follow-up emails</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Sending Settings */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5" />
                Email Sending
              </CardTitle>
              <CardDescription className="text-slate-400">
                Control how emails are handled during pipeline runs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div>
                  <p className="font-medium text-white">Auto-Send Emails</p>
                  <p className="text-sm text-slate-400">When OFF, emails are generated as drafts only (you can review and send manually)</p>
                </div>
                <Switch
                  checked={config?.auto_send_emails ?? false}
                  onCheckedChange={(checked) => setConfig({...config, auto_send_emails: checked})}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auto-Reply Settings */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Mail className="w-5 h-5" />
                Auto-Reply Settings
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure how the system handles incoming replies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div>
                  <p className="font-medium text-white">AI Auto-Reply</p>
                  <p className="text-sm text-slate-400">Let AI read and respond to replies automatically</p>
                </div>
                <Switch
                  checked={config?.auto_reply_enabled ?? false}
                  onCheckedChange={(checked) => setConfig({...config, auto_reply_enabled: checked})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Reply Domain</Label>
                <Input
                  value={config?.reply_domain || ''}
                  onChange={(e) => setConfig({...config, reply_domain: e.target.value})}
                  placeholder="replies.yourdomain.com"
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">Configure MX records in Resend to receive replies</p>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-red-900/30">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Campaign Configuration</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Products, Discovery Sets, and Email Guidelines are configured on the <strong className="text-white">Discovery</strong> page.
                    Use the Start button to select which product and target audience to use.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          {/* Enrichment Provider Selection */}
          <Card className="border-red-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Email Enrichment Provider
              </CardTitle>
              <CardDescription>Choose your preferred provider for finding contact emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Active Provider</Label>
                <Select
                  value={config?.enrichment_provider || 'hunter'}
                  onValueChange={(value) => setConfig({...config, enrichment_provider: value})}
                >
                  <SelectTrigger className="w-full" data-testid="enrichment-provider-select">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hunter">Hunter.io</SelectItem>
                    <SelectItem value="apollo">Apollo.io</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {config?.enrichment_provider === 'apollo' 
                    ? 'Apollo.io provides richer company data and decision-maker contacts'
                    : 'Hunter.io is optimized for finding generic business emails'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Email Warm-up Coming Soon */}
          <Card className="border-amber-500/30 bg-amber-950/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Email Warm-up Schedule
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  <Clock className="w-3 h-3 mr-1" />
                  Coming Soon
                </Badge>
              </CardTitle>
              <CardDescription>Gradually increase sending volume to build domain reputation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <p className="text-sm text-slate-400">
                  Email warm-up will automatically manage your sending volume, starting with a few emails per day 
                  and gradually increasing to your target limit. This protects your domain reputation and improves deliverability.
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                  <Flame className="w-4 h-4" />
                  <span>Feature launching soon - stay tuned!</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
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
                <p className="text-xs text-muted-foreground">For AI research and personalization</p>
              </div>

              <Separator />

              {/* SerpAPI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    SerpAPI Key
                    {config?.serpapi_key ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Not Set
                      </Badge>
                    )}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.serpapi ? 'text' : 'password'}
                    value={config?.serpapi_key || ''}
                    onChange={(e) => setConfig({...config, serpapi_key: e.target.value})}
                    placeholder="SerpAPI key"
                  />
                  <Button variant="outline" size="icon" onClick={() => toggleShowKey('serpapi')}>
                    {showKeys.serpapi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">For Google Maps lead discovery</p>
              </div>

              <Separator />

              {/* Resend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Resend API Key
                    {config?.resend_api_key ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
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
                <p className="text-xs text-muted-foreground">For sending outreach emails</p>
              </div>

              <Separator />

              {/* Hunter.io */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Hunter.io API Key
                    {config?.hunter_api_key ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Not Set
                      </Badge>
                    )}
                  </Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.hunter ? 'text' : 'password'}
                    value={config?.hunter_api_key || ''}
                    onChange={(e) => setConfig({...config, hunter_api_key: e.target.value})}
                    placeholder="Hunter.io API key"
                  />
                  <Button variant="outline" size="icon" onClick={() => toggleShowKey('hunter')}>
                    {showKeys.hunter ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">For email enrichment (if Hunter is selected)</p>
              </div>

              <Separator />

              {/* Apollo.io */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Apollo.io API Key
                    {config?.apollo_api_key ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Not Set
                      </Badge>
                    )}
                  </Label>
                </div>
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
                <p className="text-xs text-muted-foreground">For richer lead data (if Apollo is selected)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Discovery Set Dialog */}
      <Dialog open={isSetDialogOpen} onOpenChange={setIsSetDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">{editingSet ? 'Edit Discovery Set' : 'Create Discovery Set'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Name</Label>
              <Input
                value={setForm.name}
                onChange={(e) => setSetForm({...setForm, name: e.target.value})}
                placeholder="e.g., HVAC Companies Texas"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Keywords (comma-separated)</Label>
              <Textarea
                value={setForm.keywords}
                onChange={(e) => setSetForm({...setForm, keywords: e.target.value})}
                placeholder="HVAC, Air Conditioning, Heating"
                rows={2}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Locations (comma-separated)</Label>
              <Textarea
                value={setForm.locations}
                onChange={(e) => setSetForm({...setForm, locations: e.target.value})}
                placeholder="Austin TX, Dallas TX, Houston TX"
                rows={2}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Daily Limit</Label>
                <Input
                  type="number"
                  value={setForm.daily_limit}
                  onChange={(e) => setSetForm({...setForm, daily_limit: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Per Search</Label>
                <Input
                  type="number"
                  value={setForm.max_per_search}
                  onChange={(e) => setSetForm({...setForm, max_per_search: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Min Reviews</Label>
                <Input
                  type="number"
                  value={setForm.min_reviews}
                  onChange={(e) => setSetForm({...setForm, min_reviews: e.target.value})}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSetDialogOpen(false)} className="border-slate-700 text-slate-300">
              Cancel
            </Button>
            <Button onClick={handleSaveSet} className="bg-red-600 hover:bg-red-700">
              {editingSet ? 'Save Changes' : 'Create Set'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
