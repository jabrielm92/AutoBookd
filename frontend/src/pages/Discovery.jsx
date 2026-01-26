import { useState, useEffect } from 'react';
import { 
  Search,
  MapPin,
  Plus,
  X,
  Play,
  RefreshCw,
  Zap,
  CheckCircle,
  Clock,
  Mail,
  FileText,
  Send,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export default function Discovery() {
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [manualKeyword, setManualKeyword] = useState('');
  const [manualLocation, setManualLocation] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [configRes, analyticsRes] = await Promise.all([
        api.get('/scrape/config'),
        api.get('/pipeline/analytics')
      ]);
      setConfig(configRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/scrape/config', config);
      toast.success('Configuration saved');
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
      fetchData();
    } catch (error) {
      toast.error('Scraping failed');
    } finally {
      setScraping(false);
    }
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const keywords = [...(config?.keywords || []), newKeyword.trim()];
    setConfig({ ...config, keywords });
    setNewKeyword('');
  };

  const removeKeyword = (kw) => {
    const keywords = (config?.keywords || []).filter(k => k !== kw);
    setConfig({ ...config, keywords });
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <div className="grid gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = analytics?.metrics || {};
  const funnel = analytics?.funnel || {};
  const deliverability = analytics?.deliverability || {};

  return (
    <div className="space-y-6" data-testid="discovery-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-muted-foreground">Scrape → Enrich → Research → Send → Book</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Config'}
          </Button>
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Search className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-3xl font-bold">{metrics.total_scraped || 0}</p>
            <p className="text-sm text-muted-foreground">Scraped</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-3xl font-bold">{metrics.total_enriched || 0}</p>
            <p className="text-sm text-muted-foreground">Enriched</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.scrape_to_enrich_rate || 0}% rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-3xl font-bold">{metrics.total_ready || 0}</p>
            <p className="text-sm text-muted-foreground">Ready</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.enrich_to_ready_rate || 0}% rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Send className="w-8 h-8 mx-auto mb-2 text-cyan-500" />
            <p className="text-3xl font-bold">{metrics.total_contacted || 0}</p>
            <p className="text-sm text-muted-foreground">Contacted</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.reply_rate || 0}% reply</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-3xl font-bold">{metrics.total_booked || 0}</p>
            <p className="text-sm text-muted-foreground">Booked</p>
            <p className="text-xs text-muted-foreground mt-1">{metrics.booking_rate || 0}% rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Manual Scrape */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Quick Scrape (Google Maps via SerpAPI)
          </CardTitle>
          <CardDescription>Test scraping with a single search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Keyword</Label>
              <Input
                placeholder="e.g., accounting firm"
                value={manualKeyword}
                onChange={(e) => setManualKeyword(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground">Location</Label>
              <Input
                placeholder="e.g., Philadelphia, PA"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleScrapeNow} disabled={scraping}>
                {scraping ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Scrape Now
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Uses 1 SerpAPI credit per search. You have 250 free credits.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Keywords */}
        <Card>
          <CardHeader>
            <CardTitle>Target Keywords</CardTitle>
            <CardDescription>Business types to search for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="e.g., law firm"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              />
              <Button onClick={addKeyword} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(config?.keywords || []).map((kw, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1 py-1">
                  {kw}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeKeyword(kw)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle>Target Locations</CardTitle>
            <CardDescription>Cities to search in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="e.g., Austin, TX"
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
                <Badge key={i} variant="secondary" className="flex items-center gap-1 py-1">
                  <MapPin className="w-3 h-3" />
                  {loc}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500" 
                    onClick={() => removeLocation(loc)}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scraping Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Scraping Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Minimum Reviews</Label>
              <Input
                type="number"
                value={config?.min_reviews || 5}
                onChange={(e) => setConfig({...config, min_reviews: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Filter out new businesses</p>
            </div>
            <div className="space-y-2">
              <Label>Max Per Search</Label>
              <Input
                type="number"
                value={config?.max_per_search || 20}
                onChange={(e) => setConfig({...config, max_per_search: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Results per keyword/location</p>
            </div>
            <div className="space-y-2">
              <Label>Daily Limit</Label>
              <Input
                type="number"
                value={config?.daily_limit || 50}
                onChange={(e) => setConfig({...config, daily_limit: parseInt(e.target.value)})}
              />
              <p className="text-xs text-muted-foreground">Max leads scraped per day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Pipeline Stages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(funnel).map(([stage, count]) => (
              <div key={stage} className="flex items-center gap-4">
                <div className="w-40 text-sm font-medium capitalize">
                  {stage.replace(/_/g, ' ')}
                </div>
                <div className="flex-1">
                  <Progress value={Math.min((count / Math.max(...Object.values(funnel))) * 100, 100)} />
                </div>
                <div className="w-16 text-right text-sm font-bold">{count}</div>
              </div>
            ))}
            {Object.keys(funnel).length === 0 && (
              <p className="text-muted-foreground text-center py-4">No pipeline data yet. Start scraping!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deliverability */}
      {deliverability && Object.keys(deliverability).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Email Deliverability (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{deliverability.sent || 0}</p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{deliverability.open_rate || 0}%</p>
                <p className="text-sm text-muted-foreground">Open Rate</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{deliverability.click_rate || 0}%</p>
                <p className="text-sm text-muted-foreground">Click Rate</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-red-500">{deliverability.bounce_rate || 0}%</p>
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
