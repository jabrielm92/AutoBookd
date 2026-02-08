import { User, Bot, Edit3, Send as SendIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const EMAIL_TYPE_LABELS = {
  opener: 'Opener',
  follow_up: 'Follow-up',
  proof: 'Social Proof',
  breakup: 'Breakup',
  auto_reply: 'Auto Reply',
  manual: 'Manual',
  unknown: null,
};

const EMAIL_TYPE_COLORS = {
  opener: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  follow_up: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  proof: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  breakup: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  auto_reply: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  manual: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

function parseSubjectAndBody(content) {
  if (!content) return { subject: null, body: content || '' };
  if (content.startsWith('Subject:')) {
    const lines = content.split('\n');
    const subject = lines[0].replace('Subject:', '').trim();
    const body = lines.slice(2).join('\n').trim();
    return { subject, body };
  }
  return { subject: null, body: content };
}

export default function MessageBubble({ message, onEditEmail, leadId }) {
  const isOutbound = message.direction === 'outbound';
  const isDraft = message.status === 'draft';
  const { subject, body } = parseSubjectAndBody(message.content);
  const typeLabel = EMAIL_TYPE_LABELS[message.email_type];

  return (
    <div className={cn("flex gap-3", isOutbound && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isOutbound ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {isOutbound ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={cn("max-w-[80%]", isOutbound ? "items-end" : "items-start")}>
        {/* Type label + draft badge row */}
        {isOutbound && (typeLabel || isDraft) && (
          <div className={cn("flex items-center gap-1.5 mb-1", isOutbound && "justify-end")}>
            {typeLabel && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                  EMAIL_TYPE_COLORS[message.email_type] || EMAIL_TYPE_COLORS.manual
                )}
              >
                {typeLabel}
              </span>
            )}
            {isDraft && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                DRAFT
              </span>
            )}
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isOutbound
              ? isDraft
                ? "bg-amber-900/30 border border-amber-500/20 text-amber-50 rounded-br-md"
                : "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          {/* Subject header */}
          {subject && (
            <p className={cn(
              "text-xs font-semibold mb-1 pb-1 border-b",
              isOutbound
                ? isDraft
                  ? "border-amber-500/20 text-amber-200"
                  : "border-primary-foreground/20 text-primary-foreground/90"
                : "border-muted-foreground/20 text-muted-foreground"
            )}>
              {subject}
            </p>
          )}
          <p className="text-sm break-words whitespace-pre-wrap">{body}</p>

          {/* Footer: timestamp + actions */}
          <div className="flex items-center justify-between mt-1 gap-2">
            <p className={cn(
              "text-xs",
              isOutbound ? (isDraft ? "text-amber-300/70" : "text-primary-foreground/70") : "text-muted-foreground"
            )}>
              {format(new Date(message.timestamp), 'h:mm a')}
            </p>
            {isOutbound && isDraft && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-amber-300 hover:text-amber-200"
                onClick={() => onEditEmail(message, leadId)}
              >
                <SendIcon className="w-3 h-3 mr-1" />
                Review & Send
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
