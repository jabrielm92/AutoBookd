import { User, Bot, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function MessageBubble({ message, onEditEmail, leadId }) {
  const isOutbound = message.direction === 'outbound';

  return (
    <div className={cn("flex gap-3", isOutbound && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isOutbound ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-between mt-1">
          <p
            className={cn(
              "text-xs",
              isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {format(new Date(message.timestamp), 'h:mm a')}
            {message.status === 'draft' && (
              <span className="ml-2 text-amber-300">(Draft)</span>
            )}
          </p>
          {isOutbound && message.status !== 'sent' && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => onEditEmail(message, leadId)}
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Edit & Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
