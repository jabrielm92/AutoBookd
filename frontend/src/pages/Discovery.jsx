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
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export default function Discovery() {
  const navigate = useNavigate();
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
    const interval = setInterval(fetchData, 30000);
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

  const metrics = analytics?.metrics || {};
  const funnel = analytics?.funnel || {};

  // Pipeline stages with clickable navigation
  const pipelineStages = [
    { 
      key: 'scraped', 
      label: 'Scraped', 
      value: metrics.total_scraped || 0,
      icon: Search,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      stage: 'scraped'
    },
    { 
      key: 'enriched', 
      label: 'Enriched', 
      value: metrics.total_enriched || 0,
      icon: Mail,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      rate: metrics.scrape_to_enrich_rate,
      stage: 'needs_research'
    },
    { 
      key: 'researched', 
      label: 'Ready', 
      value: metrics.total_ready || 0,
      icon: FileText,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      rate: metrics.enrich_to_ready_rate,
      stage: 'ready_for_outreach'
    },
    { 
      key: 'contacted', 
      label: 'Contacted', 
      value: metrics.total_contacted || 0,
      icon: Send,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      rate: metrics.reply_rate,
      stage: 'in_sequence'
    },
    { 
      key: 'booked', 
      label: 'Booked', 
      value: metrics.total_booked || 0,
      icon: CheckCircle,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      rate: metrics.booking_rate,
      stage: 'booked'
    }
  ];

  return (
    <div className="space-y-6" data-testid="discovery-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discovery Pipeline</h1>
          <p className="text-slate-500">Scrape → Enrich → Research → Outreach → Book</p>
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

      {/* Pipeline Funnel - Clickable Cards */}
      <div className="grid grid-cols-5 gap-4">
        {pipelineStages.map((stage, idx) => (
          <Card 
            key={stage.key}
            className={cn(
              "pipeline-card clickable border",
              stage.color.split(' ').slice(1).join(' ')
            )}
            onClick={() => navigateToStage(stage.stage)}
            data-testid={`pipeline-card-${stage.key}`}
          >
            <CardContent className="pt-6 text-center">
              <stage.icon className={cn("w-8 h-8 mx-auto mb-2", stage.color.split(' ')[0])} />
              <p className="text-3xl font-bold">{stage.value}</p>
              <p className="text-sm text-slate-600 font-medium">{stage.label}</p>
              {stage.rate !== undefined && (
                <p className="text-xs text-slate-400 mt-1">{stage.rate || 0}% rate</p>
              )}
              <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                View <ArrowRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Scrape */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5" />
            Quick Scrape (Google Maps via SerpAPI)
          </CardTitle>
          <CardDescription>Test scraping with a single search - uses 1 API credit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-xs text-slate-500">Keyword</Label>
              <Input
                placeholder="e.g., accounting firm"
                value={manualKeyword}
                onChange={(e) => setManualKeyword(e.target.value)}
                data-testid="scrape-keyword-input"
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-slate-500">Location</Label>
              <Input
                placeholder="e.g., Philadelphia, PA"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                data-testid="scrape-location-input"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleScrapeNow} disabled={scraping} data-testid="scrape-now-btn">
                {scraping ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Scrape Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Keywords */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Target Keywords</CardTitle>
            <CardDescription>Business types to search for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="e.g., law firm"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                data-testid="add-keyword-input"
              />
              <Button onClick={addKeyword} size="icon" data-testid="add-keyword-btn">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(config?.keywords || []).map((kw, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1 py-1.5 px-3">
                  {kw}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500 ml-1" 
                    onClick={() => removeKeyword(kw)}
                  />
                </Badge>
              ))}
              {(config?.keywords || []).length === 0 && (
                <p className="text-sm text-slate-400">No keywords configured</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Target Locations</CardTitle>
            <CardDescription>Cities to search in</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="e.g., Austin, TX"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLocation()}
                data-testid="add-location-input"
              />
              <Button onClick={addLocation} size="icon" data-testid="add-location-btn">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(config?.locations || []).map((loc, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1 py-1.5 px-3">
                  <MapPin className="w-3 h-3" />
                  {loc}
                  <X 
                    className="w-3 h-3 cursor-pointer hover:text-red-500 ml-1" 
                    onClick={() => removeLocation(loc)}
                  />
                </Badge>
              ))}
              {(config?.locations || []).length === 0 && (
                <p className="text-sm text-slate-400">No locations configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scraping Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scraping Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Minimum Reviews</Label>
              <Input
                type="number"
                value={config?.min_reviews || 5}
                onChange={(e) => setConfig({...config, min_reviews: parseInt(e.target.value)})}
                data-testid="min-reviews-input"
              />
              <p className="text-xs text-slate-400">Filter out new businesses</p>
            </div>
            <div className="space-y-2">
              <Label>Max Per Search</Label>
              <Input
                type="number"
                value={config?.max_per_search || 20}
                onChange={(e) => setConfig({...config, max_per_search: parseInt(e.target.value)})}
                data-testid="max-per-search-input"
              />
              <p className="text-xs text-slate-400">Results per keyword/location</p>
            </div>
            <div className="space-y-2">
              <Label>Daily Limit</Label>
              <Input
                type="number"
                value={config?.daily_limit || 50}
                onChange={(e) => setConfig({...config, daily_limit: parseInt(e.target.value)})}
                data-testid="daily-limit-input"
              />
              <p className="text-xs text-slate-400">Max leads scraped per day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Stages Detail */}
      {Object.keys(funnel).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Stage Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(funnel).map(([stage, count]) => (
                <div 
                  key={stage} 
                  className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg -mx-2 transition-colors"
                  onClick={() => navigateToStage(stage)}
                >
                  <div className="w-40 text-sm font-medium capitalize text-slate-700">
                    {stage.replace(/_/g, ' ')}
                  </div>
                  <div className="flex-1">
                    <Progress value={Math.min((count / Math.max(...Object.values(funnel))) * 100, 100)} className="h-2" />
                  </div>
                  <div className="w-16 text-right text-sm font-bold text-slate-900">{count}</div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
