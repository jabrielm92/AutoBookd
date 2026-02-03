import { useState, useEffect } from 'react';
import { 
  Users,
  Mail,
  MessageSquare,
  Search as SearchIcon,
  CheckCircle,
  Calendar,
  CalendarCheck,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getLeads, updateLead } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const pipelineStages = [
  { id: 'scraped', label: 'Scraped', icon: Users, color: 'bg-slate-500', textColor: 'text-slate-600 dark:text-slate-400' },
  { id: 'uncontacted', label: 'Uncontacted', icon: Users, color: 'bg-gray-500', textColor: 'text-gray-600 dark:text-gray-400' },
  { id: 'outreach_sent', label: 'Outreach Sent', icon: Mail, color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
  { id: 'engaged', label: 'Engaged', icon: MessageSquare, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' },
  { id: 'discovery', label: 'Discovery', icon: SearchIcon, color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400' },
  { id: 'qualified', label: 'Qualified', icon: CheckCircle, color: 'bg-cyan-500', textColor: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'calendar_offered', label: 'Calendar Offered', icon: Calendar, color: 'bg-indigo-500', textColor: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'booked', label: 'Booked', icon: CalendarCheck, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'stalled', label: 'Stalled', icon: Clock, color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400' },
  { id: 'disqualified', label: 'Disqualified', icon: XCircle, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' },
];

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [expandedStages, setExpandedStages] = useState(new Set(['uncontacted', 'outreach_sent', 'engaged', 'booked']));

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data } = await getLeads({ limit: 500 });
      setLeads(data || []);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const getLeadsByStatus = (status) => {
    return leads.filter(lead => lead.status === status);
  };

  const toggleStage = (stageId) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const handleMoveClick = (lead) => {
    setSelectedLead(lead);
    setIsMoveModalOpen(true);
  };

  const handleMoveToStage = async (newStatus) => {
    if (!selectedLead || selectedLead.status === newStatus) {
      setIsMoveModalOpen(false);
      setSelectedLead(null);
      return;
    }

    try {
      await updateLead(selectedLead.id, { status: newStatus });
      setLeads(leads.map(l => 
        l.id === selectedLead.id ? { ...l, status: newStatus } : l
      ));
      toast.success(`Moved to ${newStatus.replace(/_/g, ' ')}`);
    } catch (error) {
      toast.error('Failed to update lead');
    } finally {
      setIsMoveModalOpen(false);
      setSelectedLead(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400';
  };

  const totalLeads = leads.length;
  const bookedLeads = getLeadsByStatus('booked').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pipeline-page">
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

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {pipelineStages.slice(0, 5).map((stage) => {
          const count = getLeadsByStatus(stage.id).length;
          const StageIcon = stage.icon;
          return (
            <Card key={stage.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => toggleStage(stage.id)}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", stage.color.replace('bg-', 'bg-opacity-20 bg-'))}>
                    <StageIcon className={cn("w-4 h-4", stage.textColor)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stage.label}</p>
                    <p className="text-lg font-bold">{count}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pipeline Stages - Vertical Accordion Layout */}
      <div className="space-y-3">
        {pipelineStages.map((stage) => {
          const stageLeads = getLeadsByStatus(stage.id);
          const isExpanded = expandedStages.has(stage.id);
          const StageIcon = stage.icon;
          
          return (
            <Card key={stage.id} data-testid={`pipeline-section-${stage.id}`}>
              <CardHeader 
                className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleStage(stage.id)}
              >
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                    <StageIcon className={cn("w-4 h-4", stage.textColor)} />
                    <span>{stage.label}</span>
                    <Badge variant="secondary" className="ml-2">{stageLeads.length}</Badge>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardTitle>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0 pb-4 px-4">
                  {stageLeads.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No leads in this stage</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {stageLeads.slice(0, 20).map((lead) => (
                        <div
                          key={lead.id}
                          className="p-3 rounded-lg border border-border bg-muted/30 hover:border-primary/50 transition-all cursor-pointer"
                          onClick={() => handleMoveClick(lead)}
                          data-testid={`pipeline-card-${lead.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{lead.business_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{lead.category}</p>
                            </div>
                            <div className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                              getScoreColor(lead.lead_score)
                            )}>
                              {lead.lead_score || 0}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{lead.city}</span>
                            {lead.email && <span>• {lead.email.split('@')[0]}...</span>}
                          </div>
                        </div>
                      ))}
                      {stageLeads.length > 20 && (
                        <div className="p-3 rounded-lg border border-dashed border-border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">+{stageLeads.length - 20} more</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Move Lead Dialog */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{selectedLead.business_name}</p>
                <p className="text-sm text-muted-foreground">{selectedLead.category} • {selectedLead.city}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current: <Badge variant="secondary">{selectedLead.status?.replace(/_/g, ' ')}</Badge>
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Move to stage:</label>
                <Select onValueChange={handleMoveToStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelineStages.map((stage) => (
                      <SelectItem 
                        key={stage.id} 
                        value={stage.id}
                        disabled={stage.id === selectedLead.status}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                          {stage.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
