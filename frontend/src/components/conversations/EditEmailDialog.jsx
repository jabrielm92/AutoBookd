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

export default function EditEmailDialog({
  open,
  onOpenChange,
  editingEmail,
  setEditingEmail,
  onSend,
  sending,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Edit & Send Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Subject</Label>
            <Input
              value={editingEmail.subject}
              onChange={(e) =>
                setEditingEmail({ ...editingEmail, subject: e.target.value })
              }
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Email subject..."
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Body</Label>
            <Textarea
              value={editingEmail.body}
              onChange={(e) =>
                setEditingEmail({ ...editingEmail, body: e.target.value })
              }
              className="bg-slate-800 border-slate-700 text-white min-h-[200px]"
              placeholder="Email body..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={onSend}
            disabled={sending}
            className="bg-red-600 hover:bg-red-700"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
