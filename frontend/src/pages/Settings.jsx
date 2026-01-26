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
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { getConfig, updateConfig } from '@/lib/api';
import { toast } from 'sonner';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    fetchConfig();
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

  const toggleShowKey = (key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
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
        <Button onClick={handleSave} disabled={saving} data-testid="save-settings-btn">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Test Mode Card */}
      <Card className={config?.test_mode ? "border-amber-500 bg-amber-50/50" : ""}>
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
                When enabled, emails are simulated but not actually sent. Perfect for testing the pipeline safely.
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
          <CardDescription>Your details for outreach emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your Name</Label>
              <Input
                value={config?.sender_name || ''}
                onChange={(e) => setConfig({...config, sender_name: e.target.value})}
                placeholder="John Smith"
                data-testid="sender-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={config?.sender_company || ''}
                onChange={(e) => setConfig({...config, sender_company: e.target.value})}
                placeholder="ARI Solutions"
                data-testid="sender-company-input"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>From Email Address</Label>
            <Input
              value={config?.from_email || ''}
              onChange={(e) => setConfig({...config, from_email: e.target.value})}
              placeholder="outreach@yourdomain.com"
              data-testid="from-email-input"
            />
            <p className="text-xs text-muted-foreground">Must be a verified domain in Resend</p>
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
          <CardDescription>Configure automation behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Daily Outreach Limit</Label>
              <Input
                type="number"
                value={config?.daily_outreach_limit || 50}
                onChange={(e) => setConfig({...config, daily_outreach_limit: parseInt(e.target.value)})}
                data-testid="daily-limit-input"
              />
              <p className="text-xs text-muted-foreground">Max emails per day</p>
            </div>
            <div className="space-y-2">
              <Label>Max Follow-ups</Label>
              <Input
                type="number"
                value={config?.max_follow_ups || 2}
                onChange={(e) => setConfig({...config, max_follow_ups: parseInt(e.target.value)})}
                data-testid="max-followups-input"
              />
              <p className="text-xs text-muted-foreground">Per lead before stopping</p>
            </div>
            <div className="space-y-2">
              <Label>Outreach Score Threshold</Label>
              <Input
                type="number"
                value={config?.outreach_score_threshold || 70}
                onChange={(e) => setConfig({...config, outreach_score_threshold: parseInt(e.target.value)})}
                data-testid="outreach-threshold-input"
              />
              <p className="text-xs text-muted-foreground">Minimum score to contact</p>
            </div>
            <div className="space-y-2">
              <Label>Priority Score Threshold</Label>
              <Input
                type="number"
                value={config?.priority_score_threshold || 80}
                onChange={(e) => setConfig({...config, priority_score_threshold: parseInt(e.target.value)})}
                data-testid="priority-threshold-input"
              />
              <p className="text-xs text-muted-foreground">Score for priority queue</p>
            </div>
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
          <CardDescription>Setup auto-booking for positive replies</CardDescription>
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
              data-testid="calendly-link-input"
            />
            <p className="text-xs text-muted-foreground">
              This link will be included in emails and sent automatically when a lead shows positive intent
            </p>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                Calendly API Key
                {config?.calendly_api_key ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200">
                    Optional
                  </Badge>
                )}
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                type={showKeys.calendly ? 'text' : 'password'}
                value={config?.calendly_api_key || ''}
                onChange={(e) => setConfig({...config, calendly_api_key: e.target.value})}
                placeholder="Calendly API key for webhook verification"
                data-testid="calendly-api-input"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => toggleShowKey('calendly')}
              >
                {showKeys.calendly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Webhook URL: <code className="bg-muted px-1 py-0.5 rounded">/api/webhooks/calendly</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
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
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
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
                data-testid="openai-api-input"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => toggleShowKey('openai')}
              >
                {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Used for AI-powered personalization, research, and reply classification</p>
          </div>

          <Separator />

          {/* Resend */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Resend API Key
                {config?.resend_api_key ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
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
                data-testid="resend-api-input"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => toggleShowKey('resend')}
              >
                {showKeys.resend ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Used for sending outreach emails. Get a key at resend.com</p>
          </div>

          <Separator />

          {/* Apollo (Future) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Apollo.io API Key
                {config?.apollo_api_key ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200">
                    Future Integration
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
                data-testid="apollo-api-input"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => toggleShowKey('apollo')}
              >
                {showKeys.apollo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">For richer lead data enrichment (coming soon)</p>
          </div>

          <Separator />

          {/* LinkedIn Cookie */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn Session Cookie
                {config?.linkedin_cookie ? (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200">
                    Optional
                  </Badge>
                )}
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                type={showKeys.linkedin ? 'text' : 'password'}
                value={config?.linkedin_cookie || ''}
                onChange={(e) => setConfig({...config, linkedin_cookie: e.target.value})}
                placeholder="li_at cookie value"
                data-testid="linkedin-cookie-input"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => toggleShowKey('linkedin')}
              >
                {showKeys.linkedin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">For LinkedIn profile scraping (use manual import for now)</p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">How the Autonomous System Works</h3>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>1. <strong>Scraping Loop</strong> finds leads from Google Maps via SerpAPI</li>
                <li>2. <strong>Enrichment Loop</strong> finds emails via Hunter.io</li>
                <li>3. <strong>Research Loop</strong> analyzes websites and generates personalized openers</li>
                <li>4. <strong>Sequence Loop</strong> sends 4-step email campaigns via Resend</li>
                <li>5. <strong>Analytics Loop</strong> tracks full-funnel metrics</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                Press <strong>Start System</strong> in the sidebar to begin autonomous operation.
                Enable <strong>Test Mode</strong> to simulate without sending real emails.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
