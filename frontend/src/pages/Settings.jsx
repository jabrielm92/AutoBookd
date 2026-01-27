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
  Moon,
  Sun,
  Flame,
  Clock
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
import { getConfig, updateConfig } from '@/lib/api';
import { toast } from 'sonner';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchConfig();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
  }, []);

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
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">System configuration and API keys</p>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
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

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                System Settings
              </CardTitle>
              <CardDescription>Configure automation behavior</CardDescription>
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
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <AlertCircle className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Campaign Configuration</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Products, Discovery Sets, and Email Rules are configured on the <strong>Discovery</strong> page.
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
    </div>
  );
}
