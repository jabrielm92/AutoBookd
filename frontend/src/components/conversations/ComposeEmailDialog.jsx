import { Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ComposeEmailDialog({
  open,
  onOpenChange,
  email,
  setEmail,
  leads,
  attachments,
  setAttachments,
  onSend,
  sending,
}) {
  const handleLeadSelect = (leadId) => {
    if (leadId) {
      const lead = leads.find((l) => l.id === leadId);
      if (lead) {
        setEmail((prev) => ({
          ...prev,
          leadId,
          to: lead.email || prev.to,
          businessName: lead.business_name || prev.businessName,
        }));
      }
    } else {
      setEmail((prev) => ({ ...prev, leadId: '' }));
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const newAttachments = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        continue;
      }

      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      newAttachments.push({ filename: file.name, content: base64 });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setEmail({ to: '', subject: '', body: '', businessName: '', leadId: '' });
    setAttachments([]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
        if (!val) reset();
      }}
    >
      <DialogContent className="bg-slate-900 border-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">New Conversation</DialogTitle>
          <p className="text-sm text-slate-400">Compose and send a new email</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Lead selector */}
          <div className="space-y-2">
            <Label className="text-slate-300">Link to Existing Lead (Optional)</Label>
            <select
              value={email.leadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm"
              data-testid="new-email-lead-select"
            >
              <option value="">-- Select a lead or enter email manually --</option>
              {leads
                .filter((l) => l.email)
                .map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.business_name} ({lead.email})
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">To (Email) *</Label>
            <Input
              type="email"
              value={email.to}
              onChange={(e) => setEmail({ ...email, to: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="recipient@example.com"
              data-testid="new-email-to"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Contact/Business Name (Optional)</Label>
            <Input
              value={email.businessName}
              onChange={(e) => setEmail({ ...email, businessName: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="John Smith or Acme Corp"
              data-testid="new-email-name"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Subject *</Label>
            <Input
              value={email.subject}
              onChange={(e) => setEmail({ ...email, subject: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Email subject..."
              data-testid="new-email-subject"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Body *</Label>
            <Textarea
              value={email.body}
              onChange={(e) => setEmail({ ...email, body: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white min-h-[150px]"
              placeholder="Write your message..."
              data-testid="new-email-body"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="text-slate-300">Attachments (Optional)</Label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md cursor-pointer hover:bg-slate-700 transition-colors">
                <Paperclip className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">Add Files</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif"
                  data-testid="new-email-attachments"
                />
              </label>
              <span className="text-xs text-slate-500">Max 5MB per file</span>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1 mt-2">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded-md"
                  >
                    <span className="text-sm text-slate-300 truncate">
                      {att.filename}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(idx)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                      aria-label={`Remove ${att.filename}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
            className="border-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={onSend}
            disabled={sending || !email.to || !email.subject || !email.body}
            className="bg-red-600 hover:bg-red-700"
            data-testid="send-new-email-btn"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
