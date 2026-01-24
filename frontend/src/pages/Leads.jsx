import { useState, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  Search, 
  Filter,
  MoreHorizontal,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  Star,
  RefreshCw,
  Trash2,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getLeads, createLead, bulkCreateLeads, deleteLead, updateLead, getNiches } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusLabels = {
  uncontacted: 'Uncontacted',
  outreach_sent: 'Outreach Sent',
  engaged: 'Engaged',
  discovery: 'Discovery',
  qualified: 'Qualified',
  calendar_offered: 'Calendar Offered',
  booked: 'Booked',
  stalled: 'Stalled',
  disqualified: 'Disqualified'
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [niches, setNiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    business_name: '',
    category: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    website: '',
    rating: '',
    review_count: '',
    niche_id: ''
  });
  const [bulkData, setBulkData] = useState('');

  useEffect(() => {
    fetchLeads();
    fetchNiches();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const { data } = await getLeads(params);
      setLeads(data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchNiches = async () => {
    try {
      const { data } = await getNiches();
      setNiches(data);
    } catch (error) {
      console.error('Failed to fetch niches:', error);
    }
  };

  const handleAddLead = async () => {
    try {
      const leadData = {
        ...newLead,
        rating: newLead.rating ? parseFloat(newLead.rating) : null,
        review_count: newLead.review_count ? parseInt(newLead.review_count) : 0
      };
      await createLead(leadData);
      toast.success('Lead added successfully');
      setIsAddDialogOpen(false);
      setNewLead({
        business_name: '',
        category: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        website: '',
        rating: '',
        review_count: '',
        niche_id: ''
      });
      fetchLeads();
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  const handleBulkImport = async () => {
    try {
      const lines = bulkData.trim().split('\n');
      const leads = lines.map(line => {
        const [business_name, category, city, state, phone, email, website, rating, review_count] = line.split(',').map(s => s.trim());
        return {
          business_name,
          category,
          city,
          state,
          phone,
          email,
          website,
          rating: rating ? parseFloat(rating) : null,
          review_count: review_count ? parseInt(review_count) : 0
        };
      }).filter(l => l.business_name);

      const { data } = await bulkCreateLeads(leads);
      toast.success(`Imported ${data.created} leads (${data.skipped} duplicates skipped)`);
      setIsBulkDialogOpen(false);
      setBulkData('');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to import leads');
    }
  };

  const handleDeleteLead = async (id) => {
    try {
      await deleteLead(id);
      toast.success('Lead deleted');
      fetchLeads();
      setSelectedLead(null);
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateLead(id, { status });
      toast.success('Status updated');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredLeads = leads.filter(lead => 
    lead.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreBadgeClass = (score) => {
    if (score >= 80) return 'score-badge-high';
    if (score >= 60) return 'score-badge-medium';
    return 'score-badge-low';
  };

  return (
    <div className="space-y-6" data-testid="leads-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{leads.length} total leads</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="bulk-import-btn">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Leads</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Paste CSV data (one lead per line):<br/>
                  Format: business_name, category, city, state, phone, email, website, rating, review_count
                </p>
                <Textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="Mike's Roofing, Roofing, Phoenix, AZ, 555-1234, mike@roof.com, mikesroofing.com, 4.5, 23"
                  rows={10}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleBulkImport}>Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-lead-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name *</Label>
                    <Input
                      value={newLead.business_name}
                      onChange={(e) => setNewLead({...newLead, business_name: e.target.value})}
                      placeholder="Mike's Roofing"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Input
                      value={newLead.category}
                      onChange={(e) => setNewLead({...newLead, category: e.target.value})}
                      placeholder="Roofing"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={newLead.city}
                      onChange={(e) => setNewLead({...newLead, city: e.target.value})}
                      placeholder="Phoenix"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={newLead.state}
                      onChange={(e) => setNewLead({...newLead, state: e.target.value})}
                      placeholder="AZ"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={newLead.phone}
                      onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                      placeholder="555-123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={newLead.email}
                      onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                      placeholder="mike@roofing.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={newLead.website}
                    onChange={(e) => setNewLead({...newLead, website: e.target.value})}
                    placeholder="https://mikesroofing.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={newLead.rating}
                      onChange={(e) => setNewLead({...newLead, rating: e.target.value})}
                      placeholder="4.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Review Count</Label>
                    <Input
                      type="number"
                      value={newLead.review_count}
                      onChange={(e) => setNewLead({...newLead, review_count: e.target.value})}
                      placeholder="23"
                    />
                  </div>
                </div>
                {niches.length > 0 && (
                  <div className="space-y-2">
                    <Label>Niche</Label>
                    <Select value={newLead.niche_id} onValueChange={(v) => setNewLead({...newLead, niche_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select niche" />
                      </SelectTrigger>
                      <SelectContent>
                        {niches.map(niche => (
                          <SelectItem key={niche.id} value={niche.id}>{niche.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddLead} disabled={!newLead.business_name || !newLead.category}>
                  Add Lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchLeads}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Business</th>
                <th>Category</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Reviews</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} data-testid={`lead-row-${lead.id}`}>
                  <td>
                    <div className={cn("score-badge", getScoreBadgeClass(lead.lead_score))}>
                      {lead.lead_score}
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium">{lead.business_name}</p>
                      {lead.website && (
                        <a 
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          Website <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="text-muted-foreground">{lead.category}</td>
                  <td>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {lead.city}{lead.state && `, ${lead.state}`}
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span>{lead.rating || '-'}</span>
                      <span className="text-muted-foreground">({lead.review_count || 0})</span>
                    </div>
                  </td>
                  <td>
                    <Badge className={`status-${lead.status}`}>
                      {statusLabels[lead.status] || lead.status}
                    </Badge>
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'outreach_sent')}>
                          <Mail className="w-4 h-4 mr-2" />
                          Mark Outreach Sent
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'disqualified')}>
                          Disqualify
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteLead(lead.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    {loading ? 'Loading...' : 'No leads found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          {selectedLead && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={cn("score-badge", getScoreBadgeClass(selectedLead.lead_score))}>
                    {selectedLead.lead_score}
                  </div>
                  {selectedLead.business_name}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-medium">{selectedLead.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Location</Label>
                    <p className="font-medium">{selectedLead.city}, {selectedLead.state}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedLead.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedLead.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Rating</Label>
                    <p className="font-medium flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      {selectedLead.rating || '-'} ({selectedLead.review_count} reviews)
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={`status-${selectedLead.status} mt-1`}>
                      {statusLabels[selectedLead.status]}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Score Breakdown</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(selectedLead.score_breakdown || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm">
                        <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
                        <span className={cn("font-medium", value > 0 ? "text-emerald-600" : "text-red-600")}>
                          {value > 0 ? '+' : ''}{value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
