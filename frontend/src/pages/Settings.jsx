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
  User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
              />
              <p className="text-xs text-muted-foreground">Max emails per day</p>
            </div>
            <div className="space-y-2">
              <Label>Max Follow-ups</Label>
              <Input
                type="number"
                value={config?.max_follow_ups || 2}
                onChange={(e) => setConfig({...config, max_follow_ups: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Per lead before stopping</p>
            </div>
            <div className="space-y-2">
              <Label>Outreach Score Threshold</Label>
              <Input
                type="number"
                value={config?.outreach_score_threshold || 70}
                onChange={(e) => setConfig({...config, outreach_score_threshold: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Minimum score to contact</p>
            </div>
            <div className="space-y-2">
              <Label>Priority Score Threshold</Label>
              <Input
                type="number"
                value={config?.priority_score_threshold || 80}
                onChange={(e) => setConfig({...config, priority_score_threshold: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Score for priority queue</p>
            </div>
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
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => toggleShowKey('openai')}
              >
                {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Used for AI-powered message personalization and lead scoring</p>
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

          {/* Calendly */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Calendly API Key
                {config?.calendly_api_key ? (
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
                type={showKeys.calendly ? 'text' : 'password'}
                value={config?.calendly_api_key || ''}
                onChange={(e) => setConfig({...config, calendly_api_key: e.target.value})}
                placeholder="Calendly API key"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => toggleShowKey('calendly')}
              >
                {showKeys.calendly ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Used for calendar booking integration</p>
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
                <li>1. <strong>Discovery Engine</strong> finds leads from Reddit, job postings, and web searches</li>
                <li>2. <strong>AI Scoring</strong> evaluates each lead for AI consulting opportunity</li>
                <li>3. <strong>Outreach Engine</strong> sends personalized emails via Resend</li>
                <li>4. <strong>Follow-up Engine</strong> automatically follows up with non-responders</li>
                <li>5. <strong>Learning Loop</strong> optimizes based on what converts</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                Press <strong>Start System</strong> in the sidebar to begin autonomous operation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
