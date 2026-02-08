import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
          <p className="font-medium text-sm truncate">
            {lead?.business_name || 'Unknown'}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {lastMessage?.content?.substring(0, 50)}...
          </p>
        </div>
        {!deleteMode && (
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {conv.messages.length}
          </Badge>
        )}
      </div>
      {lastMessage && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {format(new Date(lastMessage.timestamp), 'MMM d, h:mm a')}
        </div>
      )}
    </div>
  );
}
