import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Mail, 
  Brain, 
  Send, 
  BarChart3, 
  CheckCircle, 
  AlertCircle,
  Info,
  AlertTriangle,
  X,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPipelineActivity } from '@/lib/api';

const stageConfig = {
  system: { icon: Activity, color: 'text-slate-400', bg: 'bg-slate-800' },
  scrape: { icon: Search, color: 'text-blue-400', bg: 'bg-blue-900/30' },
  enrich: { icon: Mail, color: 'text-purple-400', bg: 'bg-purple-900/30' },
  research: { icon: Brain, color: 'text-cyan-400', bg: 'bg-cyan-900/30' },
  sequence: { icon: Send, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
  analytics: { icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-900/30' },
};

const typeIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const typeColors = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-slate-400',
};

export default function RealTimeProgressModal({ isOpen, onClose, isRunning }) {
  const [activities, setActivities] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const fetchActivities = async () => {
    try {
      const { data } = await getPipelineActivity(50);
      setActivities(data.activities || []);
      setCounts(data.counts || {});
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  useEffect(() => {
    let interval;
    if (isOpen && isRunning) {
      // Initial fetch after a microtask to avoid synchronous setState
      Promise.resolve().then(fetchActivities);
      interval = setInterval(fetchActivities, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, isRunning]);

  useEffect(() => {
    // Auto-scroll to bottom when new activities come in
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });
  };

  const stages = [
    { key: 'scrape', label: 'Scraped', count: counts.scraped || 0 },
    { key: 'enrich', label: 'Enriched', count: counts.enriched || 0 },
    { key: 'research', label: 'Researched', count: counts.researched || 0 },
    { key: 'sequence', label: 'Contacted', count: counts.contacted || 0 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col bg-slate-900 border-slate-800" data-testid="progress-modal">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-white">
              <div className="relative">
                <Activity className="w-5 h-5" />
                {isRunning && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                )}
              </div>
              Pipeline Activity
            </DialogTitle>
            <Badge 
              variant="outline" 
              className={cn(
                isRunning 
                  ? "bg-emerald-900/30 text-emerald-400 border-emerald-700" 
                  : "bg-slate-800 text-slate-400 border-slate-700"
              )}
            >
              {isRunning ? 'Running' : 'Stopped'}
            </Badge>
          </div>
        </DialogHeader>

        {/* Stage Progress Cards */}
        <div className="grid grid-cols-4 gap-3 py-4 flex-shrink-0">
          {stages.map((stage) => {
            const config = stageConfig[stage.key];
            const Icon = config.icon;
            return (
              <div
                key={stage.key}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-lg border border-slate-700",
                  config.bg
                )}
                data-testid={`stage-${stage.key}`}
              >
                <Icon className={cn("w-5 h-5 mb-1", config.color)} />
                <span className="text-2xl font-bold text-white">{stage.count}</span>
                <span className="text-xs text-slate-400">{stage.label}</span>
              </div>
            );
          })}
        </div>

        {/* Activity Feed */}
        <div className="flex-1 min-h-0 border border-slate-700 rounded-lg bg-slate-950">
          <div className="p-2 border-b border-slate-700 bg-slate-900 rounded-t-lg flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">ACTIVITY LOG</span>
            <span className="text-xs text-slate-500">{activities.length} events</span>
          </div>
          <ScrollArea className="h-[300px]" ref={scrollRef}>
            <div className="p-2 space-y-1 font-mono text-xs">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-slate-500">
                  <Activity className="w-4 h-4 mr-2 animate-spin" />
                  Loading activities...
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                  <Activity className="w-8 h-8 mb-2 opacity-50" />
                  <p>No activities yet</p>
                  <p className="text-xs">Start the pipeline to see real-time updates</p>
                </div>
              ) : (
                activities.map((activity, idx) => {
                  const stageConf = stageConfig[activity.stage] || stageConfig.system;
                  const StageIcon = stageConf.icon;
                  const TypeIcon = typeIcons[activity.type] || Info;
                  const typeColor = typeColors[activity.type] || 'text-slate-400';
                  
                  return (
                    <div
                      key={activity.id || idx}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded transition-colors",
                        activity.type === 'success' && "bg-emerald-900/20",
                        activity.type === 'error' && "bg-red-900/20",
                        activity.type === 'warning' && "bg-amber-900/20"
                      )}
                      data-testid={`activity-${idx}`}
                    >
                      <span className="text-slate-500 flex-shrink-0">
                        {formatTime(activity.timestamp)}
                      </span>
                      <div className={cn("flex-shrink-0 p-1 rounded", stageConf.bg)}>
                        <StageIcon className={cn("w-3 h-3", stageConf.color)} />
                      </div>
                      <TypeIcon className={cn("w-3.5 h-3.5 flex-shrink-0 mt-0.5", typeColor)} />
                      <span className="flex-1 text-slate-300">
                        {activity.message}
                        {activity.lead_name && (
                          <span className="ml-1 text-slate-500">
                            [{activity.lead_name}]
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 flex-shrink-0 border-t">
          <p className="text-xs text-muted-foreground">
            Auto-refreshing every 2 seconds
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
