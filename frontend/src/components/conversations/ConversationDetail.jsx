import { Send, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import MessageBubble from './MessageBubble';

export default function ConversationDetail({
  conv,
  lead,
  inModal,
  newMessage,
  setNewMessage,
  onSendMessage,
  onEditEmail,
}) {
  return (
    <div className={cn("flex flex-col", inModal ? "h-[70vh]" : "h-full")}>
      {/* Header */}
      <div className={cn("border-b p-4", inModal ? "border-slate-700" : "border-border")}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-white">
              {lead?.business_name}
            </h3>
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
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conv.messages.map((message, idx) => (
            <MessageBubble
              key={message.id || idx}
              message={message}
              onEditEmail={onEditEmail}
              leadId={conv.lead_id}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Compose */}
      <div className={cn("p-4 border-t", inModal ? "border-slate-700" : "border-border")}>
        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
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
