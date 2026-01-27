import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
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
  Eye,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Clock,
  X,
  Download
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { getLeads, createLead, deleteLead, updateLead, bulkDeleteLeads, importCSV } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const statusLabels = {
  uncontacted: 'Uncontacted',
  scraped: 'Scraped',
  outreach_sent: 'Outreach Sent',
  engaged: 'Engaged',
  discovery: 'Discovery',
  qualified: 'Qualified',
  calendar_offered: 'Calendar Offered',
  booked: 'Booked',
  stalled: 'Stalled',
  disqualified: 'Disqualified'
};

const pipelineLabels = {
  needs_enrichment: 'Needs Enrichment',
  needs_research: 'Needs Research',
  ready_for_outreach: 'Ready for Outreach',
  in_sequence: 'In Sequence',
  replied: 'Replied',
  booked: 'Booked'
};

export default function Leads() {
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('stage') || 'all');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCSVDialogOpen, setIsCSVDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const [newLead, setNewLead] = useState({
    business_name: '',
    category: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    website: '',
    rating: '',
    review_count: ''
  });

  useEffect(() => {
    const stage = searchParams.get('stage');
    if (stage) {
      setStatusFilter(stage);
    }
  }, [searchParams]);

  const fetchLeads = async () => {
    try {
      const params = { limit: 200 };
      if (statusFilter && statusFilter !== 'all') {
        const pipelineStages = ['needs_enrichment', 'needs_research', 'ready_for_outreach', 'in_sequence', 'low_score', 'no_email', 'no_domain'];
        if (pipelineStages.includes(statusFilter)) {
          params.pipeline_stage = statusFilter;
        } else {
          params.status = statusFilter;
        }
      }
      const { data } = await getLeads(params);
      setLeads(data || []);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error('Failed to fetch leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleAddLead = async () => {
    try {
      const leadData = {
        ...newLead,
        rating: newLead.rating ? parseFloat(newLead.rating) : null,
        review_count: newLead.review_count ? parseInt(newLead.review_count) : 0
      };
      await createLead(leadData);
      toast.success('Lead added');
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
        review_count: ''
      });
      fetchLeads();
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await importCSV(formData);
      toast.success(`Imported ${data.created} leads (${data.skipped} skipped)`);
      setIsCSVDialogOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error('CSV import failed');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/leads/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'autobookd_leads.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Leads exported successfully');
    } catch (error) {
      toast.error('Failed to export leads');
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { data } = await bulkDeleteLeads(Array.from(selectedIds));
      toast.success(`Deleted ${data.deleted} leads`);
      setSelectedIds(new Set());
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete leads');
    } finally {
      setIsDeleting(false);
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

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  };

  // Filter happens client-side on already fetched data (backend already filtered by statusFilter)
  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    const matchesSearch = 
      lead.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getScoreBadgeClass = (score) => {
    if (score >= 80) return 'score-badge-high';
    if (score >= 60) return 'score-badge-medium';
    return 'score-badge-low';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6" data-testid="leads-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-slate-500">{leads.length} total leads</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bulk Delete */}
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              data-testid="bulk-delete-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
          )}

          {/* CSV Import */}
          <Dialog open={isCSVDialogOpen} onOpenChange={setIsCSVDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="csv-import-btn">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Leads from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-slate-500">
                  Upload a CSV file with lead data. Supported columns:
                </p>
                <div className="bg-slate-50 rounded-lg p-4 text-xs font-mono">
                  business_name, category, city, state, phone, email, website, rating, reviews
                </div>
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer text-blue-600 hover:underline font-medium"
                  >
                    Choose a CSV file
                  </label>
                  <p className="text-xs text-slate-400 mt-2">Max 10,000 rows</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Lead */}
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
                    <Label>Email (Priority)</Label>
                    <Input
                      value={newLead.email}
                      onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                      placeholder="mike@roofing.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Website</Label>
                    <Input
                      value={newLead.website}
                      onChange={(e) => setNewLead({...newLead, website: e.target.value})}
                      placeholder="mikesroofing.com"
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
                    <Label>Phone (Optional)</Label>
                    <Input
                      value={newLead.phone}
                      onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                      placeholder="555-123-4567"
                    />
                  </div>
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
                </div>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-56" data-testid="status-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            <SelectItem value="needs_enrichment">Needs Enrichment</SelectItem>
            <SelectItem value="needs_research">Needs Research</SelectItem>
            <SelectItem value="ready_for_outreach">Ready for Outreach</SelectItem>
            <SelectItem value="in_sequence">In Sequence</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchLeads}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Leads - Desktop Table / Mobile Cards */}
      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12">
                  <Checkbox
                    checked={selectedIds.size === filteredLeads.length && filteredLeads.length > 0}
                    onCheckedChange={toggleSelectAll}
                    data-testid="select-all-checkbox"
                  />
                </th>
                <th className="w-16">Score</th>
                <th>Business</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Added</th>
                <th>Stage</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} data-testid={`lead-row-${lead.id}`}>
                  <td>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                    />
                  </td>
                  <td>
                    <div className={cn("score-badge", getScoreBadgeClass(lead.lead_score))}>
                      {lead.lead_score || 0}
                    </div>
                  </td>
                  <td>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{lead.business_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{lead.category}</p>
                      {lead.website && (
                        <a 
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          {lead.website.replace(/^https?:\/\//, '').substring(0, 25)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="space-y-1">
                      {lead.email ? (
                        <div className="flex items-center gap-1.5 text-sm">
                          <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{lead.email}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">No email</span>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {lead.city}{lead.state && `, ${lead.state}`}
                    </div>
                    {lead.rating && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        {lead.rating} ({lead.review_count || 0})
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="w-3 h-3" />
                      {formatDate(lead.created_at)}
                    </div>
                  </td>
                  <td>
                    <Badge className={cn(
                      "text-xs",
                      lead.pipeline_stage ? `status-${lead.pipeline_stage.replace(/_/g, '')}` : `status-${lead.status}`
                    )}>
                      {pipelineLabels[lead.pipeline_stage] || statusLabels[lead.status] || lead.status}
                    </Badge>
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'qualified')}>
                          <CheckSquare className="w-4 h-4 mr-2" />
                          Mark Qualified
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
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    {loading ? 'Loading...' : 'No leads found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredLeads.map((lead) => (
          <Card key={lead.id} className="bg-slate-900 border-slate-800" data-testid={`lead-card-${lead.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedIds.has(lead.id)}
                    onCheckedChange={() => toggleSelect(lead.id)}
                    className="mt-1"
                  />
                  <div className={cn("score-badge flex-shrink-0", getScoreBadgeClass(lead.lead_score))}>
                    {lead.lead_score || 0}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{lead.business_name}</p>
                    <p className="text-xs text-slate-400">{lead.category}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateStatus(lead.id, 'qualified')}>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Mark Qualified
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteLead(lead.id)} className="text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="mt-3 space-y-2 text-sm">
                {lead.email && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{lead.city}{lead.state && `, ${lead.state}`}</span>
                </div>
                {lead.website && (
                  <a 
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{lead.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <Badge className={cn(
                  "text-xs",
                  lead.pipeline_stage ? `status-${lead.pipeline_stage.replace(/_/g, '')}` : `status-${lead.status}`
                )}>
                  {pipelineLabels[lead.pipeline_stage] || statusLabels[lead.status] || lead.status}
                </Badge>
                <span className="text-xs text-slate-500">{formatDate(lead.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            {loading ? 'Loading...' : 'No leads found'}
          </div>
        )}
      </div>

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
                    <Label className="text-slate-500 text-xs">Category</Label>
                    <p className="font-medium">{selectedLead.category}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs">Location</Label>
                    <p className="font-medium">{selectedLead.city}, {selectedLead.state}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs">Email</Label>
                    <p className="font-medium">{selectedLead.email || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs">Phone</Label>
                    <p className="font-medium">{selectedLead.phone || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs">Added</Label>
                    <p className="font-medium">{formatDate(selectedLead.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500 text-xs">Stage</Label>
                    <Badge className={`status-${selectedLead.status} mt-1`}>
                      {pipelineLabels[selectedLead.pipeline_stage] || statusLabels[selectedLead.status]}
                    </Badge>
                  </div>
                </div>
                
                {selectedLead.research && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <Label className="text-slate-500 text-xs">AI Research</Label>
                    <p className="text-sm mt-1"><strong>Pain Point:</strong> {selectedLead.research.pain_point}</p>
                    <p className="text-sm mt-1"><strong>Opportunity:</strong> {selectedLead.research.opportunity}</p>
                    <p className="text-sm mt-1"><strong>Opener:</strong> {selectedLead.research.opener}</p>
                  </div>
                )}

                <div>
                  <Label className="text-slate-500 text-xs">Score Breakdown</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {Object.entries(selectedLead.score_breakdown || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-2 rounded bg-slate-50 text-sm">
                        <span className="text-slate-600">{key.replace(/_/g, ' ')}</span>
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
