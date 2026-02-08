import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  Bookmark,
  FileSpreadsheet,
  Clock,
  X,
  Download,
  MessageSquare,
  PauseCircle,
  PlayCircle
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
import { getLeads, createLead, deleteLead, updateLead, bulkDeleteLeads, importCSV, exportLeadsCSV, markLeadBooked, toggleLeadFollowups } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { STAGE_LABELS as stageLabels, STAGE_BADGE_COLORS as stageColors } from '@/lib/constants';
import { format, parseISO } from 'date-fns';

export default function Leads() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || 'all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
      setStageFilter(stage);
    }
  }, [searchParams]);

  const fetchLeads = async () => {
    try {
      const params = { limit: 200 };
      if (stageFilter && stageFilter !== 'all') {
        params.stage = stageFilter;
      }
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
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
  }, [stageFilter, dateFrom, dateTo]);

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
      await exportLeadsCSV();
      toast.success('Export started');
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

  const handleMarkBooked = async (id) => {
    try {
      await markLeadBooked(id);
      toast.success('Lead marked as booked');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleToggleFollowups = async (id, pause) => {
    try {
      await toggleLeadFollowups(id, pause);
      toast.success(pause ? 'Follow-ups paused' : 'Follow-ups resumed');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update lead');
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

  // Filter happens client-side on already fetched data
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
    if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400';
    if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400';
    return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy');
    } catch {
      return '-';
    }
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'MMM d');
    } catch {
      return '-';
    }
  };

  // Handle ?view=leadId to auto-open detail
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && leads.length > 0) {
      const lead = leads.find((l) => l.id === viewId);
      if (lead) setSelectedLead(lead);
    }
  }, [searchParams, leads]);

  return (
    <div className="space-y-6" data-testid="leads-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-slate-500">{leads.length} total leads</p>
        </div>
        <div className="flex items-center gap-3">
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

          <Button variant="outline" onClick={handleExportCSV} data-testid="csv-export-btn">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          <Dialog open={isCSVDialogOpen} onOpenChange={setIsCSVDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="csv-import-btn">
                <Upload className="w-4 h-4 mr-2" />
                Import
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
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-xs font-mono">
                  business_name, category, city, state, phone, email, website, rating, reviews
                </div>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
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

      {/* Filters - Simplified */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48" data-testid="stage-filter">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads</SelectItem>
            <SelectItem value="scraped">Scraped (no email)</SelectItem>
            <SelectItem value="enriched">Enriched (has email)</SelectItem>
            <SelectItem value="researched">Researched (has score)</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-36"
            placeholder="From"
            data-testid="date-from"
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-36"
            placeholder="To"
            data-testid="date-to"
          />
          {(dateFrom || dateTo) && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        <Button variant="outline" size="icon" onClick={fetchLeads}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

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
                <th>Emails</th>
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
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
                      getScoreBadgeClass(lead.lead_score)
                    )}>
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
                    <div className="text-sm">
                      {lead.emails_sent > 0 ? (
                        <span className={cn(
                          "font-medium",
                          lead.pause_followups ? "text-slate-400 line-through" : "text-blue-600 dark:text-blue-400"
                        )}>
                          {lead.emails_sent}/{lead.emails_total || 4} sent
                        </span>
                      ) : (
                        <span className="text-slate-400">0 sent</span>
                      )}
                      {lead.pause_followups && (
                        <span className="ml-2 text-amber-600 dark:text-amber-400 text-xs">
                          Paused
                        </span>
                      )}
                      {lead.has_replied && (
                        <span className="ml-2 text-emerald-600 dark:text-emerald-400 text-xs">
                          Replied ✓
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDateShort(lead.created_at)}
                    </span>
                  </td>
                  <td>
                    <Badge className={cn("text-xs", stageColors[lead.stage] || stageColors.scraped)}>
                      {stageLabels[lead.stage] || 'Scraped'}
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
                        {lead.email && lead.emails_sent > 0 && (
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/conversations?lead=${lead.id}`)}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            View Conversation
                          </DropdownMenuItem>
                        )}
                        {lead.email && !lead.emails_sent && (
                          <DropdownMenuItem onClick={() => navigate(`/dashboard/conversations?new=${lead.id}`)}>
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Start Conversation
                          </DropdownMenuItem>
                        )}
                        {lead.stage === 'contacted' && (
                          <DropdownMenuItem onClick={() => handleToggleFollowups(lead.id, !lead.pause_followups)}>
                            {lead.pause_followups ? (
                              <>
                                <PlayCircle className="w-4 h-4 mr-2" />
                                Resume Follow-ups
                              </>
                            ) : (
                              <>
                                <PauseCircle className="w-4 h-4 mr-2" />
                                Pause Follow-ups
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {lead.stage !== 'booked' && (
                          <DropdownMenuItem onClick={() => handleMarkBooked(lead.id)}>
                            <Bookmark className="w-4 h-4 mr-2" />
                            Mark as Booked
                          </DropdownMenuItem>
                        )}
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
                  <td colSpan={9} className="text-center py-12 text-slate-400">
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
          <Card key={lead.id} data-testid={`lead-card-${lead.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedIds.has(lead.id)}
                    onCheckedChange={() => toggleSelect(lead.id)}
                    className="mt-1"
                  />
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                    getScoreBadgeClass(lead.lead_score)
                  )}>
                    {lead.lead_score || 0}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lead.business_name}</p>
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
                    {lead.email && lead.emails_sent > 0 && (
                      <DropdownMenuItem onClick={() => navigate(`/dashboard/conversations?lead=${lead.id}`)}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        View Conversation
                      </DropdownMenuItem>
                    )}
                    {lead.email && !lead.emails_sent && (
                      <DropdownMenuItem onClick={() => navigate(`/dashboard/conversations?new=${lead.id}`)}>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Start Conversation
                      </DropdownMenuItem>
                    )}
                    {lead.stage === 'contacted' && (
                      <DropdownMenuItem onClick={() => handleToggleFollowups(lead.id, !lead.pause_followups)}>
                        {lead.pause_followups ? (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Resume Follow-ups
                          </>
                        ) : (
                          <>
                            <PauseCircle className="w-4 h-4 mr-2" />
                            Pause Follow-ups
                          </>
                        )}
                      </DropdownMenuItem>
                    )}
                    {lead.stage !== 'booked' && (
                      <DropdownMenuItem onClick={() => handleMarkBooked(lead.id)}>
                        <Bookmark className="w-4 h-4 mr-2" />
                        Mark as Booked
                      </DropdownMenuItem>
                    )}
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
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{lead.city}{lead.state && `, ${lead.state}`}</span>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", stageColors[lead.stage] || stageColors.scraped)}>
                    {stageLabels[lead.stage] || 'Scraped'}
                  </Badge>
                  {lead.emails_sent > 0 && (
                    <span className="text-xs text-blue-400">{lead.emails_sent}/{lead.emails_total || 4} sent</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">{formatDateShort(lead.created_at)}</span>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedLead && (
            <LeadDetailContent 
              lead={selectedLead} 
              onUpdate={async (updates) => {
                await updateLead(selectedLead.id, updates);
                fetchLeads();
                setSelectedLead({...selectedLead, ...updates});
                toast.success('Lead updated');
              }}
              onClose={() => setSelectedLead(null)}
              formatDate={formatDate}
              getScoreBadgeClass={getScoreBadgeClass}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadDetailContent({ lead, onUpdate, onClose, formatDate, getScoreBadgeClass }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    business_name: lead.business_name || '',
    category: lead.category || '',
    city: lead.city || '',
    state: lead.state || '',
    email: lead.email || '',
    phone: lead.phone || '',
    website: lead.website || ''
  });

  const handleSave = async () => {
    await onUpdate(form);
    setEditing(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", 
            lead.lead_score >= 80 ? "bg-emerald-500" : lead.lead_score >= 60 ? "bg-amber-500" : "bg-red-500"
          )}>
            {lead.lead_score}
          </div>
          {editing ? (
            <Input value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} className="text-lg font-semibold" />
          ) : lead.business_name}
        </DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-500 text-xs">Category</Label>
            {editing ? <Input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="mt-1" />
              : <p className="font-medium">{lead.category}</p>}
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Location</Label>
            {editing ? (
              <div className="flex gap-2 mt-1">
                <Input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" className="flex-1" />
                <Input value={form.state} onChange={e => setForm({...form, state: e.target.value})} placeholder="State" className="w-20" />
              </div>
            ) : <p className="font-medium">{lead.city}, {lead.state}</p>}
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Email</Label>
            {editing ? <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1" />
              : <p className="font-medium">{lead.email || '-'}</p>}
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Phone</Label>
            {editing ? <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1" />
              : <p className="font-medium">{lead.phone || '-'}</p>}
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Website</Label>
            {editing ? <Input value={form.website} onChange={e => setForm({...form, website: e.target.value})} className="mt-1" />
              : <p className="font-medium">{lead.website || '-'}</p>}
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Added</Label>
            <p className="font-medium">{formatDate(lead.created_at)}</p>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Stage</Label>
            <Badge className={cn("mt-1", stageColors[lead.stage] || stageColors.scraped)}>
              {stageLabels[lead.stage] || 'Scraped'}
            </Badge>
          </div>
          <div>
            <Label className="text-slate-500 text-xs">Emails Sent</Label>
            <p className="font-medium">{lead.emails_sent || 0} / {lead.emails_total || 4}</p>
          </div>
        </div>
        
        {lead.research && (
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-4">
            <Label className="text-slate-400 text-xs">AI Research</Label>
            {lead.research.pain_point && <p className="text-sm mt-1"><strong>Pain Point:</strong> {lead.research.pain_point}</p>}
            {lead.research.opportunity && <p className="text-sm mt-1"><strong>Opportunity:</strong> {lead.research.opportunity}</p>}
            {lead.research.opener && <p className="text-sm mt-1"><strong>Opener:</strong> {lead.research.opener}</p>}
          </div>
        )}

        {lead.score_breakdown && Object.keys(lead.score_breakdown).length > 0 && (
          <div>
            <Label className="text-slate-500 text-xs">Score Breakdown</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.entries(lead.score_breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded bg-slate-100 dark:bg-slate-800/50 text-sm">
                  <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className={cn("font-medium", value > 0 ? "text-emerald-600" : "text-red-600")}>
                    {value > 0 ? '+' : ''}{value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        {editing ? (
          <>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </>
        ) : (
          <Button onClick={() => setEditing(true)} variant="outline">Edit Lead</Button>
        )}
      </DialogFooter>
    </>
  );
}
