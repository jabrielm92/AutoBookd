import { useState, useEffect } from 'react';
import { 
  Search,
  Radar,
  Globe,
  MapPin,
  Briefcase,
  MessageSquare,
  Play,
  Pause,
  RefreshCw,
  Plus,
  X,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const sourceIcons = {
  reddit: MessageSquare,
  jobs: Briefcase,
  web_search: Globe,
  google_maps: MapPin
};

export default function Discovery() {
  const [config, setConfig] = useState(null);
  const [sources, setSources] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, sourcesRes, statsRes] = await Promise.all([
        api.get('/discovery/config'),
        api.get('/discovery/sources'),
        api.get('/discovery/stats')
      ]);
      setConfig(configRes.data);
      setSources(sourcesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load discovery settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/discovery/config', config);
      toast.success('Discovery settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await api.post('/discovery/run-now');
      toast.success('Discovery cycle started');
      // Refresh stats after a delay
      setTimeout(fetchData, 5000);
    } catch (error) {
      toast.error('Failed to start discovery');
    } finally {
      setRunning(false);
    }
  };

  const toggleSource = (sourceId) => {
    const current = config?.enabled_sources || [];
    const updated = current.includes(sourceId)
      ? current.filter(s => s !== sourceId)
      : [...current, sourceId];
    setConfig({ ...config, enabled_sources: updated });
  };

  const toggleIndustry = (industryId) => {
    const current = config?.industries || [];
    const updated = current.includes(industryId)
      ? current.filter(i => i !== industryId)
      : [...current, industryId];
    setConfig({ ...config, industries: updated });
  };

  const addLocation = () => {
    if (!newLocation.trim()) return;
    const locations = [...(config?.locations || []), newLocation.trim()];
    setConfig({ ...config, locations });
    setNewLocation('');
  };

  const removeLocation = (loc) => {
    const locations = (config?.locations || []).filter(l => l !== loc);
    setConfig({ ...config, locations });
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const keywords = [...(config?.custom_keywords || []), newKeyword.trim()];
    setConfig({ ...config, custom_keywords: keywords });
    setNewKeyword('');
  };

  const removeKeyword = (kw) => {
    const keywords = (config?.custom_keywords || []).filter(k => k !== kw);
    setConfig({ ...config, custom_keywords: keywords });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Discovery Engine</h1>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" data-testid="discovery-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Discovery Engine</h1>
          <p className="text-muted-foreground">Configure autonomous lead discovery</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleRunNow}
            disabled={running}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", running && "animate-spin")} />
            {running ? 'Running...' : 'Run Now'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total_discovered || 0}</p>
                <p className="text-sm text-muted-foreground">Leads Discovered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.cycles_run || 0}</p>
                <p className="text-sm text-muted-foreground">Cycles Run</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {stats?.last_cycle_at 
                    ? new Date(stats.last_cycle_at).toLocaleString() 
                    : 'Never'}
                </p>
                <p className="text-sm text-muted-foreground">Last Run</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scope Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Discovery Scope
          </CardTitle>
          <CardDescription>Target local businesses or search anywhere</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant={config?.scope === 'local' ? 'default' : 'outline'}
              onClick={() => setConfig({ ...config, scope: 'local' })}
              className="flex-1"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Local Only
            </Button>
            <Button
              variant={config?.scope === 'any' ? 'default' : 'outline'}
              onClick={() => setConfig({ ...config, scope: 'any' })}
              className="flex-1"
            >
              <Globe className="w-4 h-4 mr-2" />
              Anywhere
            </Button>
          </div>
          
          {config?.scope === 'local' && (
            <div className="mt-4 space-y-3">
              <Label>Target Locations</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Phoenix, AZ"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLocation()}
                />
                <Button onClick={addLocation} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(config?.locations || []).map((loc, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    {loc}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-500" 
                      onClick={() => removeLocation(loc)}
                    />
                  </Badge>
                ))}
                {(config?.locations || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No locations added</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discovery Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="w-5 h-5" />
            Discovery Sources
          </CardTitle>
          <CardDescription>Choose where to find potential leads</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {sources?.sources?.map((source) => {
              const Icon = sourceIcons[source.id] || Search;
              const isEnabled = config?.enabled_sources?.includes(source.id);
              const isComingSoon = source.id === 'google_maps';
              
              return (
                <div
                  key={source.id}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all cursor-pointer",
                    isEnabled ? "border-primary bg-primary/5" : "border-border hover:border-primary/30",
                    isComingSoon && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => !isComingSoon && toggleSource(source.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isEnabled ? "bg-primary/20" : "bg-muted"
                      )}>
                        <Icon className={cn("w-5 h-5", isEnabled && "text-primary")} />
                      </div>
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-sm text-muted-foreground">{source.description}</p>
                      </div>
                    </div>
                    {isEnabled && <CheckCircle className="w-5 h-5 text-primary" />}
                    {isComingSoon && <Badge variant="outline">Soon</Badge>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Industries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Target Industries
          </CardTitle>
          <CardDescription>Industries to focus on for AI consulting opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sources?.industries?.map((industry) => {
              const isEnabled = config?.industries?.includes(industry.id);
              
              return (
                <div
                  key={industry.id}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all cursor-pointer",
                    isEnabled ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                  )}
                  onClick={() => toggleIndustry(industry.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{industry.name}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {industry.keywords.map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                    {isEnabled && <CheckCircle className="w-5 h-5 text-primary" />}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Pain Keywords</CardTitle>
          <CardDescription>Add custom keywords to detect AI consulting opportunities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="e.g., 'manual data entry', 'slow response'"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            />
            <Button onClick={addKeyword} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(config?.custom_keywords || []).map((kw, i) => (
              <Badge key={i} variant="secondary" className="flex items-center gap-1">
                {kw}
                <X 
                  className="w-3 h-3 cursor-pointer hover:text-red-500" 
                  onClick={() => removeKeyword(kw)}
                />
              </Badge>
            ))}
            {(config?.custom_keywords || []).length === 0 && (
              <p className="text-sm text-muted-foreground">Using default AI/automation keywords</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Cycle Interval (seconds)</Label>
              <Input
                type="number"
                value={config?.cycle_interval_seconds || 300}
                onChange={(e) => setConfig({...config, cycle_interval_seconds: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">How often to run discovery (default: 5 min)</p>
            </div>
            <div className="space-y-2">
              <Label>Max Leads Per Cycle</Label>
              <Input
                type="number"
                value={config?.max_leads_per_cycle || 50}
                onChange={(e) => setConfig({...config, max_leads_per_cycle: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Limit leads discovered per cycle</p>
            </div>
            <div className="space-y-2">
              <Label>Minimum Intent Score</Label>
              <Input
                type="number"
                value={config?.min_intent_score || 30}
                onChange={(e) => setConfig({...config, min_intent_score: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Only save leads above this score</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
