import { Send, Mail, Phone, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import MessageBubble from './MessageBubble';

function sentimentColor(val) {
  if (val > 0.2) return 'bg-emerald-500';
  if (val < -0.2) return 'bg-red-500';
  return 'bg-slate-500';
}

function sentimentLabel(val) {
  if (val > 0.5) return 'Very Positive';
  if (val > 0.2) return 'Positive';
  if (val < -0.5) return 'Very Negative';
  if (val < -0.2) return 'Negative';
  return 'Neutral';
}

function dateLabel(date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

export default function ConversationDetail({
  conv,
  lead,
  inModal,
  newMessage,
  setNewMessage,
  onSendMessage,
  onEditEmail,
}) {
  const navigate = useNavigate();
  const sentiment = conv.current_sentiment || 0;
  const outboundCount = conv.messages.filter((m) => m.direction === 'outbound').length;
  const inboundCount = conv.messages.filter((m) => m.direction === 'inbound').length;
  const draftCount = conv.messages.filter((m) => m.status === 'draft').length;

  // Group messages by date for date dividers
  const messagesWithDates = [];
  let lastDate = null;
  for (const msg of conv.messages) {
    const msgDate = new Date(msg.timestamp);
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      messagesWithDates.push({ type: 'date', date: msgDate });
      lastDate = msgDate;
    }
    messagesWithDates.push({ type: 'message', message: msg });
  }

  return (
    <div className={cn("flex flex-col min-h-0", inModal ? "h-[70vh]" : "h-full")}>
      {/* Header */}
      <div className={cn("border-b p-4 flex-shrink-0", inModal ? "border-slate-700" : "border-border")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-white truncate">
                {lead?.business_name}
              </h3>
              {lead?.id && !conv.is_manual && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-white"
                  onClick={() => navigate(`/dashboard/leads?view=${lead.id}`)}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Lead
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
              {lead?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{lead.email}</span>
                </span>
              )}
              {lead?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {lead.phone}
                </span>
              )}
            </div>
          </div>
          <Badge>{lead?.category}</Badge>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
          {/* Sentiment indicator */}
          <div className="flex items-center gap-1.5">
            <div className={cn("w-2 h-2 rounded-full", sentimentColor(sentiment))} />
            <span className="text-xs text-muted-foreground">{sentimentLabel(sentiment)}</span>
          </div>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{outboundCount} sent</span>
          {inboundCount > 0 && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-emerald-400">{inboundCount} {inboundCount === 1 ? 'reply' : 'replies'}</span>
            </>
          )}
          {draftCount > 0 && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-amber-400">{draftCount} {draftCount === 1 ? 'draft' : 'drafts'}</span>
            </>
          )}
        </div>
      </div>

      {/* Messages with date grouping */}
      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {messagesWithDates.map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${idx}`} className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {dateLabel(item.date)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              );
            }
            return (
              <MessageBubble
                key={item.message.id || idx}
                message={item.message}
                onEditEmail={onEditEmail}
                leadId={conv.lead_id}
              />
            );
          })}
        </div>
      </ScrollArea>

      {/* Compose */}
      <div className={cn("p-4 border-t flex-shrink-0", inModal ? "border-slate-700" : "border-border")}>
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a reply..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className={cn(
              "min-h-[60px] resize-none",
              inModal && "bg-slate-800 border-slate-700"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
          />
          <Button
            onClick={onSendMessage}
            disabled={!newMessage.trim()}
            className="self-end"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
