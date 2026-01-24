import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  TrendingUp,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getAnalytics, getPriorityQueue, getFollowUpQueue } from '@/lib/api';
import { cn } from '@/lib/utils';

const statusLabels = {
  uncontacted: 'Uncontacted',
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
  const { isRunning } = useOutletContext();
  const [analytics, setAnalytics] = useState(null);
  const [priorityLeads, setPriorityLeads] = useState([]);
  const [followUpLeads, setFollowUpLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, priorityRes, followUpRes] = await Promise.all([
        getAnalytics(),
        getPriorityQueue(5),
        getFollowUpQueue(5)
      ]);
      setAnalytics(analyticsRes.data);
      setPriorityLeads(priorityRes.data);
      setFollowUpLeads(followUpRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
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

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your autonomous lead engine</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
            isRunning 
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          )}>
            <span className={cn(
              "w-2 h-2 rounded-full",
              isRunning ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
            )} />
            {isRunning ? "System Active" : "System Idle"}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="stat-total-leads">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold mt-1">{analytics?.total_leads || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Avg Score:</span>
              <span className={cn("font-semibold", getScoreColor(analytics?.avg_score || 0))}>
                {analytics?.avg_score || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-conversations">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Conversations</p>
                <p className="text-3xl font-bold mt-1">{analytics?.total_conversations || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <MessageSquare className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500 font-medium">{analytics?.reply_rate || 0}%</span>
              <span className="text-muted-foreground">reply rate</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-bookings">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bookings</p>
                <p className="text-3xl font-bold mt-1">{analytics?.total_bookings || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Calendar className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-500 font-medium">{analytics?.booking_rate || 0}%</span>
              <span className="text-muted-foreground">conversion</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-niches">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Niches</p>
                <p className="text-3xl font-bold mt-1">{analytics?.niches_performance?.length || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <Zap className="w-4 h-4 text-purple-500" />
              <span className="text-muted-foreground">Targeting high-ticket services</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics?.leads_by_status || {}).map(([status, count]) => {
                const total = analytics?.total_leads || 1;
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{statusLabels[status] || status}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
              {Object.keys(analytics?.leads_by_status || {}).length === 0 && (
                <p className="text-muted-foreground text-center py-8">No leads yet</p>
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
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium">{niche.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {niche.leads_scraped} leads • {niche.bookings} bookings
                    </p>
                  </div>
                  <Badge variant={niche.booking_rate > 5 ? "default" : "secondary"}>
                    {niche.booking_rate.toFixed(1)}% conv
                  </Badge>
                </div>
              ))}
              {(!analytics?.niches_performance || analytics.niches_performance.length === 0) && (
                <p className="text-muted-foreground text-center py-8">No niches configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                    )}>
                      {lead.lead_score}
                    </div>
                    <div>
                      <p className="font-medium">{lead.business_name}</p>
                      <p className="text-sm text-muted-foreground">{lead.category} • {lead.city}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">View</Button>
                </div>
              ))}
              {priorityLeads.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No priority leads</p>
              )}
            </div>
          </CardContent>
        </Card>

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
                <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                      lead.lead_score >= 80 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                        : lead.lead_score >= 60
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                    )}>
                      {lead.lead_score}
                    </div>
                    <div>
                      <p className="font-medium">{lead.business_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {lead.follow_up_count} follow-ups sent
                      </p>
                    </div>
                  </div>
                  <Badge className={`status-${lead.status}`}>
                    {statusLabels[lead.status] || lead.status}
                  </Badge>
                </div>
              ))}
              {followUpLeads.length === 0 && (
                <p className="text-muted-foreground text-center py-8">No follow-ups needed</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
