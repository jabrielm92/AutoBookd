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
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getLeads, updateLead } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const pipelineStages = [
  { id: 'uncontacted', label: 'Uncontacted', icon: Users, color: 'bg-gray-500' },
  { id: 'outreach_sent', label: 'Outreach Sent', icon: Mail, color: 'bg-blue-500' },
  { id: 'engaged', label: 'Engaged', icon: MessageSquare, color: 'bg-amber-500' },
  { id: 'discovery', label: 'Discovery', icon: SearchIcon, color: 'bg-purple-500' },
  { id: 'qualified', label: 'Qualified', icon: CheckCircle, color: 'bg-cyan-500' },
  { id: 'calendar_offered', label: 'Calendar Offered', icon: Calendar, color: 'bg-indigo-500' },
  { id: 'booked', label: 'Booked', icon: CalendarCheck, color: 'bg-emerald-500' },
];

const secondaryStages = [
  { id: 'stalled', label: 'Stalled', icon: Clock, color: 'bg-orange-500' },
  { id: 'disqualified', label: 'Disqualified', icon: XCircle, color: 'bg-red-500' },
];

const allStages = [...pipelineStages, ...secondaryStages];

export default function Pipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data } = await getLeads({ limit: 500 });
      setLeads(data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const getLeadsByStatus = (status) => {
    return leads.filter(lead => lead.status === status);
  };

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedLead || draggedLead.status === newStatus) {
      setDraggedLead(null);
      return;
    }

    try {
      await updateLead(draggedLead.id, { status: newStatus });
      setLeads(leads.map(l => 
        l.id === draggedLead.id ? { ...l, status: newStatus } : l
      ));
      toast.success(`Moved to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update lead');
    } finally {
      setDraggedLead(null);
    }
  };

  const handleMobileMove = async (newStatus) => {
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

  const openMoveModal = (lead) => {
    setSelectedLead(lead);
    setIsMoveModalOpen(true);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-400';
    if (score >= 60) return 'text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-400';
    return 'text-red-600 bg-red-100 dark:bg-red-900/50 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-96 skeleton rounded-xl" />
          ))}
        </div>
        <div className="md:hidden space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pipeline-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-muted-foreground hidden sm:block">Drag leads between stages</p>
          <p className="text-muted-foreground sm:hidden">Tap to move leads</p>
        </div>
      </div>

      {/* Desktop: Horizontal Pipeline */}
      <div className="hidden md:flex gap-4 overflow-x-auto pb-4">
        {pipelineStages.map((stage) => {
          const stageLeads = getLeadsByStatus(stage.id);
          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
              data-testid={`pipeline-column-${stage.id}`}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                      {stage.label}
                    </div>
                    <Badge variant="secondary">{stageLeads.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[calc(100vh-320px)]">
                    <div className="space-y-2 pr-2">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          className={cn(
                            "p-3 rounded-lg border border-border bg-card cursor-grab active:cursor-grabbing",
                            "hover:border-primary/50 hover:shadow-sm transition-all",
                            draggedLead?.id === lead.id && "opacity-50"
                          )}
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
                              {lead.lead_score}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{lead.city}</span>
                            {lead.email && <span>• {lead.email.split('@')[0]}...</span>}
                          </div>
                        </div>
                      ))}
                      {stageLeads.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No leads
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Desktop: Secondary Stages */}
      <div className="hidden md:grid grid-cols-2 gap-4">
        {secondaryStages.map((stage) => {
          const stageLeads = getLeadsByStatus(stage.id);
          return (
            <Card
              key={stage.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                    {stage.label}
                  </div>
                  <Badge variant="secondary">{stageLeads.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="flex flex-wrap gap-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        className="px-3 py-1.5 rounded-full border border-border bg-muted/50 text-sm cursor-grab"
                      >
                        {lead.business_name}
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <p className="text-muted-foreground text-sm">No leads</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mobile: Vertical Stage List */}
      <div className="md:hidden space-y-4">
        {allStages.map((stage) => {
          const stageLeads = getLeadsByStatus(stage.id);
          const StageIcon = stage.icon;
          return (
            <Card key={stage.id} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stage.color)}>
                      <StageIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white">{stage.label}</span>
                  </div>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-300">{stageLeads.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {stageLeads.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No leads</p>
                ) : (
                  <div className="space-y-2">
                    {stageLeads.slice(0, 5).map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => openMoveModal(lead)}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer active:bg-slate-700"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                            getScoreColor(lead.lead_score)
                          )}>
                            {lead.lead_score}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-white truncate">{lead.business_name}</p>
                            <p className="text-xs text-slate-400 truncate">{lead.city}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      </div>
                    ))}
                    {stageLeads.length > 5 && (
                      <p className="text-xs text-slate-500 text-center">+{stageLeads.length - 5} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mobile Move Modal */}
      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Move Lead</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
                <p className="font-medium text-white">{selectedLead.business_name}</p>
                <p className="text-sm text-slate-400">{selectedLead.category} • {selectedLead.city}</p>
              </div>
              <p className="text-sm text-slate-400">Select new stage:</p>
              <div className="grid grid-cols-2 gap-2">
                {allStages.map((stage) => {
                  const StageIcon = stage.icon;
                  const isCurrentStage = selectedLead.status === stage.id;
                  return (
                    <Button
                      key={stage.id}
                      variant={isCurrentStage ? "secondary" : "outline"}
                      className={cn(
                        "justify-start h-auto py-3",
                        isCurrentStage && "bg-slate-700 border-slate-600",
                        !isCurrentStage && "border-slate-700 text-slate-300 hover:bg-slate-800"
                      )}
                      onClick={() => handleMobileMove(stage.id)}
                      disabled={isCurrentStage}
                    >
                      <div className={cn("w-6 h-6 rounded flex items-center justify-center mr-2", stage.color)}>
                        <StageIcon className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-xs">{stage.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
