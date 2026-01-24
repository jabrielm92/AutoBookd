import { useState, useEffect } from 'react';
import { 
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Calendar,
  Target,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { getAnalytics } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

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

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data } = await getAnalytics();
      setAnalytics(data);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 skeleton rounded-xl" />
          <div className="h-80 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  const pipelineData = Object.entries(analytics?.leads_by_status || {}).map(([status, count]) => ({
    name: statusLabels[status] || status,
    value: count,
    status
  }));

  const nicheData = analytics?.niches_performance?.map(niche => ({
    name: niche.name?.substring(0, 15) || 'Unknown',
    leads: niche.leads_scraped || 0,
    bookings: niche.bookings || 0,
    rate: niche.booking_rate || 0
  })) || [];

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Performance metrics and insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-3xl font-bold">{analytics?.total_leads || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Avg Score: {analytics?.avg_score || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reply Rate</p>
                <p className="text-3xl font-bold">{analytics?.reply_rate || 0}%</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <MessageSquare className="w-6 h-6 text-amber-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              {analytics?.reply_rate >= 20 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={analytics?.reply_rate >= 20 ? "text-emerald-500" : "text-red-500"}>
                {analytics?.reply_rate >= 20 ? 'Above' : 'Below'} benchmark
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Booking Rate</p>
                <p className="text-3xl font-bold">{analytics?.booking_rate || 0}%</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <Calendar className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">
                {analytics?.total_bookings || 0} total bookings
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Niches</p>
                <p className="text-3xl font-bold">{analytics?.niches_performance?.length || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Target className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Targeting high-ticket services</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Pipeline Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Niche Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Niche Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nicheData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={nicheData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="leads" fill="#3b82f6" name="Leads" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bookings" fill="#10b981" name="Bookings" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No niche data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(analytics?.leads_by_status || {}).map(([status, count], idx) => (
              <div 
                key={status}
                className="p-4 rounded-lg border border-border text-center"
              >
                <p className="text-2xl font-bold" style={{ color: COLORS[idx % COLORS.length] }}>
                  {count}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {statusLabels[status] || status}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Niche Details Table */}
      {analytics?.niches_performance && analytics.niches_performance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Niche Details</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Niche</th>
                  <th>Leads</th>
                  <th>Contacted</th>
                  <th>Bookings</th>
                  <th>Reply Rate</th>
                  <th>Booking Rate</th>
                </tr>
              </thead>
              <tbody>
                {analytics.niches_performance.map((niche, idx) => (
                  <tr key={idx}>
                    <td className="font-medium">{niche.name}</td>
                    <td>{niche.leads_scraped}</td>
                    <td>{niche.leads_contacted}</td>
                    <td>{niche.bookings}</td>
                    <td>
                      <Badge variant={niche.reply_rate >= 20 ? "default" : "secondary"}>
                        {niche.reply_rate?.toFixed(1) || 0}%
                      </Badge>
                    </td>
                    <td>
                      <Badge 
                        variant={niche.booking_rate >= 5 ? "default" : "secondary"}
                        className={niche.booking_rate >= 5 ? "bg-emerald-500" : ""}
                      >
                        {niche.booking_rate?.toFixed(1) || 0}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
