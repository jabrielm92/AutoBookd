import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search,
  Mail,
  Brain,
  MessageSquare,
  CalendarCheck,
  MoreVertical,
  RefreshCw,
  Star,
  Eye,
  Bookmark,
  Trash2,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getLeads, updateLead, markLeadBooked, deleteLead, toggleLeadFollowups } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LEAD_STAGES, STAGE_LABELS, STAGE_COLORS, STAGE_LIGHT_BG } from '@/lib/constants';

// Stage icons and descriptions are view-specific
const stageIcons = {
  scraped: Search, enriched: Mail, researched: Brain, contacted: MessageSquare, booked: CalendarCheck,
};
const stageDescriptions = {
  scraped: 'Discovered, no email',
  enriched: 'Has email address',
  researched: 'AI analyzed',
  contacted: 'Email(s) sent',
  booked: 'Meeting scheduled',
};
const stageBorderColors = {
  scraped: 'border-slate-300 dark:border-slate-700',
  enriched: 'border-purple-300 dark:border-purple-700',
  researched: 'border-amber-300 dark:border-amber-700',
  contacted: 'border-blue-300 dark:border-blue-700',
  booked: 'border-emerald-300 dark:border-emerald-700',
};

// Compose stages array from shared constants + local view-specific data
const stages = LEAD_STAGES.map((id) => ({
  id,
  label: STAGE_LABELS[id],
  icon: stageIcons[id],
  color: STAGE_COLORS[id],
  bgLight: STAGE_LIGHT_BG[id],
  borderColor: stageBorderColors[id],
  description: stageDescriptions[id],
}));

function LeadCard({ lead, onViewDetails, onMarkBooked, onDelete, onToggleFollowups }) {
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400';
    if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
  };

  const emailProgress = lead.emails_sent > 0 
    ? `${lead.emails_sent}/${lead.emails_total || 4} sent`
    : null;

  const isPaused = lead.pause_followups;

  return (
    <div 
      className="p-3 rounded-lg border bg-white dark:bg-slate-800 hover:shadow-md transition-shadow cursor-pointer group"
      data-testid={`lead-card-${lead.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate text-slate-900 dark:text-white">
            {lead.business_name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {lead.category}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isPaused && (
            <PauseCircle className="w-4 h-4 text-amber-500" title="Follow-ups paused" />
          )}
          {lead.lead_score > 0 && (
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
              getScoreColor(lead.lead_score)
            )}>
              {lead.lead_score}
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(lead)}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {lead.stage === 'contacted' && (
                <DropdownMenuItem onClick={() => onToggleFollowups(lead.id, !isPaused)}>
                  {isPaused ? (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Resume Follow-ups
                    </>
                  ) : (
                    <>
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Pause Follow-ups
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {lead.stage !== 'booked' && (
                <DropdownMenuItem onClick={() => onMarkBooked(lead.id)}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  Mark as Booked
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDelete(lead.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="mt-2 space-y-1">
        {lead.email && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {lead.email}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          {lead.city && <span>{lead.city}</span>}
          {emailProgress && (
            <>
              <span>•</span>
              <span className={cn("text-blue-600 dark:text-blue-400", isPaused && "line-through")}>{emailProgress}</span>
            </>
          )}
          {lead.has_replied && (
            <>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400">Replied ✓</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageCounts, setStageCounts] = useState({});

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data } = await getLeads({ limit: 500 });
      setLeads(data || []);
      
      // Calculate stage counts
      const counts = {};
      (data || []).forEach(lead => {
        const stage = lead.stage || 'scraped';
        counts[stage] = (counts[stage] || 0) + 1;
      });
      setStageCounts(counts);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const getLeadsByStage = (stageId) => {
    return leads.filter(lead => (lead.stage || 'scraped') === stageId);
  };

  const handleMarkBooked = async (leadId) => {
    try {
      await markLeadBooked(leadId);
      toast.success('Lead marked as booked');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleToggleFollowups = async (leadId, pause) => {
    try {
      await toggleLeadFollowups(leadId, pause);
      toast.success(pause ? 'Follow-ups paused' : 'Follow-ups resumed');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleDelete = async (leadId) => {
    try {
      await deleteLead(leadId);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleViewDetails = (lead) => {
    navigate(`/dashboard/leads?view=${lead.id}`);
  };

  const totalLeads = leads.length;
  const bookedLeads = stageCounts.booked || 0;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="pipeline-page">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-96 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pipeline-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground">
            {totalLeads} leads • {bookedLeads} booked
          </p>
        </div>
        <Button variant="outline" onClick={fetchLeads}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {stages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.id);
          const StageIcon = stage.icon;
          
          return (
            <Card 
              key={stage.id} 
              className={cn("flex flex-col h-[calc(100vh-280px)] min-h-[400px]", stage.borderColor)}
              data-testid={`pipeline-column-${stage.id}`}
            >
              <CardHeader className={cn("py-3 px-4 border-b", stage.bgLight)}>
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <div className={cn("p-1.5 rounded-lg", stage.color)}>
                    <StageIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="block">{stage.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {stage.description}
                    </span>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {stageLeads.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
                {stageLeads.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground text-sm text-center">
                      No leads in this stage
                    </p>
                  </div>
                ) : (
                  stageLeads.slice(0, 50).map((lead) => (
                    <LeadCard 
                      key={lead.id} 
                      lead={lead}
                      onViewDetails={handleViewDetails}
                      onMarkBooked={handleMarkBooked}
                      onDelete={handleDelete}
                      onToggleFollowups={handleToggleFollowups}
                    />
                  ))
                )}
                {stageLeads.length > 50 && (
                  <div className="p-3 text-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/dashboard/leads?stage=${stage.id}`)}
                    >
                      View all {stageLeads.length} leads
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
