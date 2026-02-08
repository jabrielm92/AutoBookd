import { Clock, ArrowUpRight, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { STAGE_BADGE_COLORS, STAGE_LABELS } from '@/lib/constants';

function sentimentDot(sentiment) {
  if (sentiment > 0.2) return 'bg-emerald-400';
  if (sentiment < -0.2) return 'bg-red-400';
  return 'bg-slate-400';
}

export default function ConversationListItem({
  conv,
  lead,
  isActive,
  deleteMode,
  isSelectedForDelete,
  onClick,
  onToggleSelect,
}) {
  const lastMessage = conv.messages[conv.messages.length - 1];
  const inboundCount = conv.messages.filter((m) => m.direction === 'inbound').length;
  const hasDrafts = conv.messages.some((m) => m.status === 'draft');
  const stage = lead?.stage;

  return (
    <div
      onClick={() => (deleteMode ? onToggleSelect(conv.id) : onClick(conv))}
      className={cn(
        "p-3 rounded-lg cursor-pointer transition-colors",
        deleteMode && isSelectedForDelete
          ? "bg-red-500/20 border border-red-500/40"
          : isActive
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-muted"
      )}
      data-testid={`conversation-item-${conv.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        {deleteMode && (
          <input
            type="checkbox"
            checked={isSelectedForDelete}
            onChange={() => onToggleSelect(conv.id)}
            className="mt-1 mr-2"
          />
        )}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + sentiment dot */}
          <div className="flex items-center gap-1.5">
            <span
              className={cn("w-2 h-2 rounded-full flex-shrink-0", sentimentDot(conv.current_sentiment || 0))}
              title={`Sentiment: ${(conv.current_sentiment || 0).toFixed(2)}`}
            />
            <p className="font-medium text-sm truncate">
              {lead?.business_name || conv.recipient_name || 'Unknown'}
            </p>
          </div>

          {/* Row 2: preview */}
          <p className="text-xs text-muted-foreground truncate mt-0.5 ml-3.5">
            {lastMessage?.content?.substring(0, 60)}...
          </p>
        </div>

        {/* Right side badges */}
        {!deleteMode && (
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {inboundCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                {inboundCount}
              </span>
            )}
            {hasDrafts && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                Draft
              </span>
            )}
          </div>
        )}
      </div>

      {/* Row 3: stage + time + message count */}
      <div className="flex items-center gap-2 mt-1.5 ml-3.5">
        {stage && STAGE_LABELS[stage] && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STAGE_BADGE_COLORS[stage] || "bg-slate-100 text-slate-700")}>
            {STAGE_LABELS[stage]}
          </span>
        )}
        {conv.is_manual && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">Manual</span>
        )}
        {lastMessage && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(lastMessage.timestamp), { addSuffix: true })}
          </span>
        )}
        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
          <MessageCircle className="w-2.5 h-2.5" />
          {conv.messages.length}
        </span>
      </div>
    </div>
  );
}
