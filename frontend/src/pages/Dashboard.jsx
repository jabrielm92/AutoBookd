import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Search,
  Mail,
  Brain,
  MessageSquare,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  Target,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getAnalytics, getPriorityQueue, getFollowUpQueue, getPipelineActivity } from '@/lib/api';
import { cn } from '@/lib/utils';
import { STAGE_LABELS, STAGE_COLORS, STAGE_LIGHT_BG } from '@/lib/constants';
import SetupGuide from '@/components/SetupGuide';

// Stage icons (keep per-page since icons are view-specific)
const stageIcons = {
  scraped: Search, enriched: Mail, researched: Brain, contacted: MessageSquare, booked: CalendarCheck,
};

// Compose stageConfig from shared constants + local icons
const stageConfig = Object.fromEntries(
  Object.entries(STAGE_LABELS).map(([key, label]) => [
    key,
    { label, icon: stageIcons[key], color: STAGE_COLORS[key], lightBg: STAGE_LIGHT_BG[key] },
  ])
);

export default function Dashboard() {
  const { isRunning, autoSendEmails } = useOutletContext();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [stageCounts, setStageCounts] = useState({});
  const [priorityLeads, setPriorityLeads] = useState([]);
  const [followUpLeads, setFollowUpLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isRunning) {
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [isRunning]);

  const fetchData = async () => {
    try {
      const [analyticsRes, activityRes, priorityRes, followUpRes] = await Promise.all([
        getAnalytics().catch(() => ({ data: {} })),
        getPipelineActivity(1).catch(() => ({ data: { counts: {} } })),
        getPriorityQueue(5).catch(() => ({ data: [] })),
        getFollowUpQueue(5).catch(() => ({ data: [] }))
      ]);
      setAnalytics(analyticsRes.data);
      setStageCounts(activityRes.data?.counts || {});
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

  // Calculate conversion rates
  const totalLeads = Object.values(stageCounts).reduce((a, b) => a + b, 0);
  const enrichedRate = stageCounts.scraped > 0 ? Math.round((stageCounts.enriched || 0) / stageCounts.scraped * 100) : 0;
  const researchedRate = stageCounts.enriched > 0 ? Math.round((stageCounts.researched || 0) / stageCounts.enriched * 100) : 0;
  const contactedRate = stageCounts.researched > 0 ? Math.round((stageCounts.contacted || 0) / stageCounts.researched * 100) : 0;
  const bookedRate = stageCounts.contacted > 0 ? Math.round((stageCounts.booked || 0) / stageCounts.contacted * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-500">Monitor your autonomous lead engine</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSetupGuide(true)}
            className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800"
            data-testid="setup-guide-btn"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Setup Guide
          </Button>
          {!autoSendEmails && isRunning && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Drafts Only Mode
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

      {/* Stage Cards - New Simplified System */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(stageConfig).map(([stage, config]) => {
          const count = stageCounts[stage] || 0;
          const Icon = config.icon;
          let conversionRate = null;
          let conversionLabel = '';
          
          if (stage === 'enriched') { conversionRate = enrichedRate; conversionLabel = 'of scraped'; }
          if (stage === 'researched') { conversionRate = researchedRate; conversionLabel = 'of enriched'; }
          if (stage === 'contacted') { conversionRate = contactedRate; conversionLabel = 'of researched'; }
          if (stage === 'booked') { conversionRate = bookedRate; conversionLabel = 'of contacted'; }

          return (
            <Card 
              key={stage}
              className="metric-card cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => navigate(`/dashboard/leads?stage=${stage}`)}
              data-testid={`stat-${stage}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{config.label}</p>
                    <p className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">{count}</p>
                  </div>
                  <div className={cn("p-2.5 rounded-lg", config.lightBg)}>
                    <Icon className={cn("w-5 h-5", config.color.replace('bg-', 'text-'))} />
                  </div>
                </div>
                {conversionRate !== null && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                    {conversionRate}% {conversionLabel}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stageConfig).map(([stage, config]) => {
                const count = stageCounts[stage] || 0;
                const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
                return (
                  <div key={stage} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-300">{config.label}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
              {totalLeads === 0 && (
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
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => navigate('/dashboard/leads')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                    )}>
                      {lead.lead_score}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{lead.business_name}</p>
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
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
                  onClick={() => navigate('/dashboard/leads')}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                      lead.lead_score >= 80 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                        : lead.lead_score >= 60
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                    )}>
                      {lead.lead_score}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{lead.business_name}</p>
                      <p className="text-sm text-slate-500">
                        {lead.emails_sent || 0}/{lead.emails_total || 4} emails sent
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    Contacted
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
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{niche.name}</p>
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
                    onClick={() => navigate('/dashboard/discovery')}
                  >
                    Configure Discovery
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup Guide Modal */}
      <SetupGuide 
        isOpen={showSetupGuide} 
        onClose={() => setShowSetupGuide(false)} 
        isModal={true}
      />
    </div>
  );
}
