import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send,
  User,
  Bot,
  Clock,
  Mail,
  Phone,
  Search,
  X,
  Edit3,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getConversations, getLeads, createConversation } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function Conversations() {
  const [conversations, setConversations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const [editEmailOpen, setEditEmailOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState({ subject: '', body: '', leadId: '' });
  const [sending, setSending] = useState(false);
  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({ to: '', subject: '', body: '', businessName: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [convRes, leadsRes] = await Promise.all([
        getConversations({ limit: 100 }),
        getLeads({ limit: 500 })
      ]);
      setConversations(convRes.data);
      setLeads(leadsRes.data);
      if (convRes.data.length > 0) {
        setSelectedConv(convRes.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const getLeadForConv = (leadId) => {
    return leads.find(l => l.id === leadId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;

    try {
      await createConversation({
        lead_id: selectedConv.lead_id,
        content: newMessage,
        direction: 'outbound',
        channel: 'email'
      });
      
      // Refresh conversations
      const { data } = await getConversations({ limit: 100 });
      setConversations(data);
      const updated = data.find(c => c.lead_id === selectedConv.lead_id);
      if (updated) setSelectedConv(updated);
      
      setNewMessage('');
      toast.success('Message sent');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleEditEmail = (message, leadId) => {
    // Parse subject and body from message content
    const content = message.content || '';
    let subject = '';
    let body = content;
    
    if (content.startsWith('Subject:')) {
      const lines = content.split('\n');
      subject = lines[0].replace('Subject:', '').trim();
      body = lines.slice(2).join('\n').trim();
    }
    
    setEditingEmail({ subject, body, leadId });
    setEditEmailOpen(true);
  };

  const handleSendEditedEmail = async () => {
    if (!editingEmail.subject || !editingEmail.body) {
      toast.error('Subject and body are required');
      return;
    }
    
    setSending(true);
    try {
      await api.post(`/conversations/${editingEmail.leadId}/send`, {
        subject: editingEmail.subject,
        body: editingEmail.body
      });
      
      toast.success('Email sent successfully!');
      setEditEmailOpen(false);
      
      // Refresh conversations
      const { data } = await getConversations({ limit: 100 });
      setConversations(data);
      const updated = data.find(c => c.lead_id === editingEmail.leadId);
      if (updated) setSelectedConv(updated);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleSendNewEmail = async () => {
    if (!newEmail.to || !newEmail.subject || !newEmail.body) {
      toast.error('Recipient, subject, and body are required');
      return;
    }
    
    // Basic email validation
    if (!newEmail.to.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setSending(true);
    try {
      await api.post('/conversations/manual', {
        to_email: newEmail.to,
        subject: newEmail.subject,
        body: newEmail.body,
        business_name: newEmail.businessName || null
      });
      
      toast.success('Email sent successfully!');
      setNewEmailOpen(false);
      setNewEmail({ to: '', subject: '', body: '', businessName: '' });
      
      // Refresh conversations
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setSelectedConv(conv);
    // On mobile, open modal
    if (window.innerWidth < 1024) {
      setIsMobileDetailOpen(true);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const lead = getLeadForConv(conv.lead_id);
    if (!lead) return false;
    return lead.business_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Conversations</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <div className="skeleton rounded-xl" />
          <div className="col-span-2 skeleton rounded-xl hidden lg:block" />
        </div>
      </div>
    );
  }

  const ConversationDetail = ({ conv, inModal = false }) => {
    const lead = getLeadForConv(conv.lead_id);
    return (
      <div className={cn("flex flex-col", inModal ? "h-[70vh]" : "h-full")}>
        <div className={cn("border-b p-4", inModal ? "border-slate-700" : "border-border")}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-white">{lead?.business_name}</h3>
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
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {conv.messages.map((message, idx) => (
              <div
                key={message.id || idx}
                className={cn(
                  "flex gap-3",
                  message.direction === 'outbound' ? "flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.direction === 'outbound' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  {message.direction === 'outbound' ? (
                    <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2",
                  message.direction === 'outbound'
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}>
                  <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className={cn(
                      "text-xs",
                      message.direction === 'outbound' 
                        ? "text-primary-foreground/70" 
                        : "text-muted-foreground"
                    )}>
                      {format(new Date(message.timestamp), 'h:mm a')}
                      {message.status === 'draft' && <span className="ml-2 text-amber-300">(Draft)</span>}
                    </p>
                    {message.direction === 'outbound' && message.status !== 'sent' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleEditEmail(message, conv.lead_id)}
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit & Send
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className={cn("p-4 border-t", inModal ? "border-slate-700" : "border-border")}>
          <div className="flex gap-2">
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className={cn("min-h-[60px] resize-none", inModal && "bg-slate-800 border-slate-700")}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="conversations-page">
      <div>
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-muted-foreground">{conversations.length} active conversations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversation List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-340px)]">
              <div className="space-y-1 p-2">
                {filteredConversations.map((conv) => {
                  const lead = getLeadForConv(conv.lead_id);
                  const lastMessage = conv.messages[conv.messages.length - 1];
                  return (
                    <div
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-colors",
                        selectedConv?.id === conv.id 
                          ? "bg-primary/10 border border-primary/20" 
                          : "hover:bg-muted"
                      )}
                      data-testid={`conversation-item-${conv.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {lead?.business_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {lastMessage?.content?.substring(0, 50)}...
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {conv.messages.length}
                        </Badge>
                      </div>
                      {lastMessage && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(lastMessage.timestamp), 'MMM d, h:mm a')}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredConversations.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No conversations yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Desktop: Conversation Detail */}
        <Card className="lg:col-span-2 hidden lg:flex lg:flex-col">
          {selectedConv ? (
            <ConversationDetail conv={selectedConv} />
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose from the list to view messages</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Mobile: Conversation Detail Modal */}
      <Dialog open={isMobileDetailOpen} onOpenChange={setIsMobileDetailOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md p-0 max-h-[90vh]">
          <DialogHeader className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">Conversation</DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileDetailOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          {selectedConv && (
            <ConversationDetail conv={selectedConv} inModal={true} />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit & Send Email Modal */}
      <Dialog open={editEmailOpen} onOpenChange={setEditEmailOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit & Send Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Subject</Label>
              <Input
                value={editingEmail.subject}
                onChange={(e) => setEditingEmail({...editingEmail, subject: e.target.value})}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Email subject..."
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Body</Label>
              <Textarea
                value={editingEmail.body}
                onChange={(e) => setEditingEmail({...editingEmail, body: e.target.value})}
                className="bg-slate-800 border-slate-700 text-white min-h-[200px]"
                placeholder="Email body..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmailOpen(false)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleSendEditedEmail} disabled={sending} className="bg-red-600 hover:bg-red-700">
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
