import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Plus, Search, Trash2, X, ArrowUpDown, Filter, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getConversations, getLeads } from '@/lib/api';
import api from '@/lib/api';
import { toast } from 'sonner';

import ConversationDetail from '@/components/conversations/ConversationDetail';
import ConversationListItem from '@/components/conversations/ConversationListItem';
import ComposeEmailDialog from '@/components/conversations/ComposeEmailDialog';
import EditEmailDialog from '@/components/conversations/EditEmailDialog';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'sentiment_best', label: 'Best Sentiment' },
  { value: 'sentiment_worst', label: 'Worst Sentiment' },
];

const FILTER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'has_replies', label: 'Has Replies' },
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'drafts', label: 'Drafts Only' },
];

export default function Conversations() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sending, setSending] = useState(false);

  // Sort & filter
  const [sortBy, setSortBy] = useState('recent');
  const [filterBy, setFilterBy] = useState('');

  // Mobile detail modal
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // Edit email modal
  const [editEmailOpen, setEditEmailOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState({ subject: '', body: '', leadId: '' });

  // Compose modal
  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState({ to: '', subject: '', body: '', businessName: '', leadId: '' });
  const [attachments, setAttachments] = useState([]);

  // Bulk delete
  const [selectedForDelete, setSelectedForDelete] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open compose dialog when navigated with ?new=leadId
  useEffect(() => {
    const newLeadId = searchParams.get('new');
    if (newLeadId && leads.length > 0) {
      const lead = leads.find((l) => l.id === newLeadId);
      if (lead?.email) {
        setNewEmail({
          to: lead.email,
          subject: '',
          body: '',
          businessName: lead.business_name || '',
          leadId: lead.id,
        });
        setNewEmailOpen(true);
      }
    }
  }, [searchParams, leads]);

  const fetchData = useCallback(async () => {
    try {
      const params = { limit: 100, sort_by: sortBy };
      if (filterBy) params.filter_by = filterBy;

      const [convRes, leadsRes] = await Promise.all([
        getConversations(params),
        getLeads({ limit: 500 }),
      ]);
      setConversations(convRes.data);
      setLeads(leadsRes.data);
      if (!selectedConv && convRes.data.length > 0) {
        setSelectedConv(convRes.data[0]);
      }
    } catch {
      toast.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [sortBy, filterBy, selectedConv]);

  // ---- Helpers ----

  const getLeadForConv = (conv) => {
    if (conv.is_manual || conv.lead_id?.startsWith('manual_')) {
      return {
        id: conv.lead_id,
        business_name: conv.recipient_name || 'Manual Email',
        email: conv.recipient_email,
        category: 'Manual',
      };
    }
    return leads.find((l) => l.id === conv.lead_id);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchTerm) return true;
    const lead = getLeadForConv(conv);
    const name = lead?.business_name || conv.recipient_name || 'Unknown';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // ---- Actions ----

  const handleSelectConversation = (conv) => {
    setSelectedConv(conv);
    if (window.innerWidth < 1024) {
      setIsMobileDetailOpen(true);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConv) return;
    try {
      const firstMsg = selectedConv.messages?.[0]?.content || '';
      const subjectMatch = firstMsg.match(/^Subject:\s*(.+?)(?:\n|$)/);
      const originalSubject = subjectMatch ? subjectMatch[1].trim() : '';
      const replySubject = originalSubject.startsWith('Re:')
        ? originalSubject
        : `Re: ${originalSubject || 'Your inquiry'}`;

      await api.post(`/conversations/${selectedConv.lead_id}/send`, {
        subject: replySubject,
        body: newMessage,
      });

      const params = { limit: 100, sort_by: sortBy };
      if (filterBy) params.filter_by = filterBy;
      const { data } = await getConversations(params);
      setConversations(data);
      const updated = data.find((c) => c.lead_id === selectedConv.lead_id);
      if (updated) setSelectedConv(updated);

      setNewMessage('');
      toast.success('Email sent');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    }
  };

  const handleEditEmail = (message, leadId) => {
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
        body: editingEmail.body,
      });
      toast.success('Email sent successfully!');
      setEditEmailOpen(false);
      const params = { limit: 100, sort_by: sortBy };
      if (filterBy) params.filter_by = filterBy;
      const { data } = await getConversations(params);
      setConversations(data);
      const updated = data.find((c) => c.lead_id === editingEmail.leadId);
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
        business_name: newEmail.businessName || null,
        lead_id: newEmail.leadId || null,
        attachments: attachments.length > 0 ? attachments : null,
      });
      toast.success('Email sent successfully!');
      setNewEmailOpen(false);
      setNewEmail({ to: '', subject: '', body: '', businessName: '', leadId: '' });
      setAttachments([]);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  // ---- Bulk delete ----

  const toggleSelectForDelete = (convId) => {
    setSelectedForDelete((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedForDelete.length === 0) return;
    if (!confirm(`Delete ${selectedForDelete.length} conversation(s)?`)) return;
    try {
      await api.post('/conversations/bulk-delete', { ids: selectedForDelete });
      toast.success(`${selectedForDelete.length} conversation(s) deleted`);
      setConversations((prev) => prev.filter((c) => !selectedForDelete.includes(c.id)));
      if (selectedForDelete.includes(selectedConv?.id)) setSelectedConv(null);
      setSelectedForDelete([]);
      setDeleteMode(false);
    } catch {
      toast.error('Failed to delete conversations');
    }
  };

  // ---- Render ----

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

  return (
    <div className="space-y-6" data-testid="conversations-page">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-muted-foreground">{conversations.length} conversations</p>
        </div>
        <div className="flex gap-2">
          {deleteMode ? (
            <>
              <Button variant="outline" onClick={() => { setDeleteMode(false); setSelectedForDelete([]); }}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={selectedForDelete.length === 0}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete ({selectedForDelete.length})
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setDeleteMode(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button
                onClick={() => setNewEmailOpen(true)}
                className="bg-red-600 hover:bg-red-700"
                data-testid="new-conversation-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Left: conversation list */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-2 space-y-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Sort & Filter row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-background border border-input rounded-md pl-7 pr-2 py-1.5 text-xs text-foreground"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="w-full bg-background border border-input rounded-md pl-7 pr-2 py-1.5 text-xs text-foreground"
                >
                  {FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-1 p-2">
                {filteredConversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conv={conv}
                    lead={getLeadForConv(conv)}
                    isActive={selectedConv?.id === conv.id}
                    deleteMode={deleteMode}
                    isSelectedForDelete={selectedForDelete.includes(conv.id)}
                    onClick={handleSelectConversation}
                    onToggleSelect={toggleSelectForDelete}
                  />
                ))}
                {filteredConversations.length === 0 && conversations.length > 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No matches</p>
                    <p className="text-sm mt-1">Try a different search or filter</p>
                  </div>
                )}
                {conversations.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No conversations yet</p>
                    <p className="text-sm mt-1 mb-4 px-4">
                      Conversations appear when the pipeline contacts leads, or you can start one manually.
                    </p>
                    <div className="flex flex-col gap-2 items-center">
                      <Button size="sm" onClick={() => setNewEmailOpen(true)} className="bg-red-600 hover:bg-red-700">
                        <Plus className="w-3 h-3 mr-1" />
                        New Conversation
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/leads')}>
                        <Users className="w-3 h-3 mr-1" />
                        Go to Leads
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right: detail (desktop) */}
        <Card className="lg:col-span-2 hidden lg:flex lg:flex-col">
          {selectedConv ? (
            <ConversationDetail
              conv={selectedConv}
              lead={getLeadForConv(selectedConv)}
              inModal={false}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={handleSendMessage}
              onEditEmail={handleEditEmail}
            />
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm mt-1 mb-4">Choose from the list to view messages</p>
                <Button size="sm" onClick={() => setNewEmailOpen(true)} className="bg-red-600 hover:bg-red-700">
                  <Plus className="w-3 h-3 mr-1" />
                  New Conversation
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Mobile detail modal */}
      <Dialog open={isMobileDetailOpen} onOpenChange={setIsMobileDetailOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md p-0 max-h-[90vh]">
          <DialogHeader className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">Conversation</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileDetailOpen(false)}
                className="text-slate-400"
                aria-label="Close conversation"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>
          {selectedConv && (
            <ConversationDetail
              conv={selectedConv}
              lead={getLeadForConv(selectedConv)}
              inModal={true}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={handleSendMessage}
              onEditEmail={handleEditEmail}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit email modal */}
      <EditEmailDialog
        open={editEmailOpen}
        onOpenChange={setEditEmailOpen}
        editingEmail={editingEmail}
        setEditingEmail={setEditingEmail}
        onSend={handleSendEditedEmail}
        sending={sending}
      />

      {/* Compose modal */}
      <ComposeEmailDialog
        open={newEmailOpen}
        onOpenChange={setNewEmailOpen}
        email={newEmail}
        setEmail={setNewEmail}
        leads={leads}
        attachments={attachments}
        setAttachments={setAttachments}
        onSend={handleSendNewEmail}
        sending={sending}
      />
    </div>
  );
}
