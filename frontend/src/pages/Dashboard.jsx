import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  TrendingUp,
  Target,
  ArrowUpRight,
  Mail,
  Search,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getAnalytics, getPriorityQueue, getFollowUpQueue, getPipelineAnalytics } from '@/lib/api';
import { cn } from '@/lib/utils';

const statusLabels = {
  uncontacted: 'Uncontacted',
  scraped: 'Scraped',
  outreach_sent: 'Outreach Sent',
  engaged: 'Engaged',
  discovery: 'Discovery',
  qualified: 'Qualified',
  calendar_offered: 'Calendar Offered',
  booked: 'Booked',
  stalled: 'Stalled',
  disqualified: 'Disqualified'
};

export default function Dashboard() {
  const { isRunning, testMode } = useOutletContext();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [pipelineData, setPipelineData] = useState(null);
  const [priorityLeads, setPriorityLeads] = useState([]);
  const [followUpLeads, setFollowUpLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, pipelineRes, priorityRes, followUpRes] = await Promise.all([
        getAnalytics().catch(() => ({ data: {} })),
        getPipelineAnalytics().catch(() => ({ data: {} })),
        getPriorityQueue(5).catch(() => ({ data: [] })),
        getFollowUpQueue(5).catch(() => ({ data: [] }))
      ]);
      setAnalytics(analyticsRes.data);
      setPipelineData(pipelineRes.data);
      setPriorityLeads(priorityRes.data || []);
      setFollowUpLeads(followUpRes.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = pipelineData?.metrics || {};

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-500">Monitor your autonomous lead engine</p>
        </div>
        <div className="flex items-center gap-3">
          {testMode && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Test Mode Active
            </Badge>
          )}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            isRunning 
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
              : "bg-slate-100 text-slate-600"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            )} />
            {isRunning ? "Pipeline Active" : "Pipeline Idle"}
          </div>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card 
          className="metric-card"
          onClick={() => navigate('/leads?stage=scraped')}
          data-testid="stat-scraped"
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Scraped</p>
                <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.total_scraped || analytics?.total_leads || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="metric-card"
          onClick={() => navigate('/leads?stage=needs_research')}
          data-testid="stat-enriched"
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Enriched</p>
                <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.total_enriched || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">{metrics.scrape_to_enrich_rate || 0}% conversion</p>
          </CardContent>
        </Card>

        <Card 
          className="metric-card"
          onClick={() => navigate('/leads?stage=in_sequence')}
          data-testid="stat-contacted"
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Contacted</p>
                <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.total_contacted || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <MessageSquare className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{analytics?.reply_rate || metrics.reply_rate || 0}%</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">reply rate</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="metric-card"
          onClick={() => navigate('/bookings')}
          data-testid="stat-bookings"
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Booked</p>
                <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.total_booked || analytics?.total_bookings || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{analytics?.booking_rate || metrics.booking_rate || 0}%</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">conversion</span>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="metric-card"
          onClick={() => navigate('/discovery')}
          data-testid="stat-ready"
        >
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ready</p>
                <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{metrics.total_ready || 0}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">Awaiting outreach</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Status + Priority Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics?.leads_by_status || {}).slice(0, 6).map(([status, count]) => {
                const total = analytics?.total_leads || 1;
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{statusLabels[status] || status}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
              {Object.keys(analytics?.leads_by_status || {}).length === 0 && (
                <p className="text-slate-400 text-center py-8">No leads yet. Start the pipeline!</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Priority Queue</CardTitle>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Score ≥ 80
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {priorityLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                  onClick={() => navigate('/leads')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                      "bg-emerald-100 text-emerald-700"
                    )}>
                      {lead.lead_score}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{lead.business_name}</p>
                      <p className="text-sm text-slate-500">{lead.category} • {lead.city}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-slate-500">View</Button>
                </div>
              ))}
              {priorityLeads.length === 0 && (
                <p className="text-slate-400 text-center py-8">No priority leads yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Follow-up Queue + Niche Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Follow-up Queue</CardTitle>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Needs Action
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {followUpLeads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
                  onClick={() => navigate('/leads')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                      lead.lead_score >= 80 
                        ? "bg-emerald-100 text-emerald-700"
                        : lead.lead_score >= 60
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    )}>
                      {lead.lead_score}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{lead.business_name}</p>
                      <p className="text-sm text-slate-500">
                        {lead.follow_up_count || 0} follow-ups sent
                      </p>
                    </div>
                  </div>
                  <Badge className={`status-${lead.status}`}>
                    {statusLabels[lead.status] || lead.status}
                  </Badge>
                </div>
              ))}
              {followUpLeads.length === 0 && (
                <p className="text-slate-400 text-center py-8">No follow-ups needed</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Niche Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.niches_performance?.map((niche, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">{niche.name}</p>
                    <p className="text-sm text-slate-500">
                      {niche.leads_scraped} leads • {niche.bookings} bookings
                    </p>
                  </div>
                  <Badge variant={niche.booking_rate > 5 ? "default" : "secondary"}>
                    {niche.booking_rate?.toFixed(1) || 0}% conv
                  </Badge>
                </div>
              ))}
              {(!analytics?.niches_performance || analytics.niches_performance.length === 0) && (
                <div className="text-center py-8">
                  <Target className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-400">No niches configured yet</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate('/discovery')}
                  >
                    Configure Discovery
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
