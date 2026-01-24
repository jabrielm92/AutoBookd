import { useState, useEffect } from 'react';
import { 
  Plus, 
  Target,
  TrendingUp,
  Users,
  Calendar,
  Trash2,
  Edit,
  MoreHorizontal
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
import { Label } from '@/components/ui/label';
import { getNiches, createNiche, deleteNiche, updateNiche } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  expanding: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  holding: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  abandoned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function Niches() {
  const [niches, setNiches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNiche, setEditingNiche] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    keywords: '',
    cities: '',
    avg_deal_size: ''
  });

  useEffect(() => {
    fetchNiches();
  }, []);

  const fetchNiches = async () => {
    try {
      const { data } = await getNiches();
      setNiches(data);
    } catch (error) {
      toast.error('Failed to fetch niches');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: formData.name,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        cities: formData.cities.split(',').map(c => c.trim()).filter(Boolean),
        avg_deal_size: formData.avg_deal_size ? parseFloat(formData.avg_deal_size) : 0
      };

      if (editingNiche) {
        await updateNiche(editingNiche.id, payload);
        toast.success('Niche updated');
      } else {
        await createNiche(payload);
        toast.success('Niche created');
      }

      setIsDialogOpen(false);
      setEditingNiche(null);
      setFormData({ name: '', keywords: '', cities: '', avg_deal_size: '' });
      fetchNiches();
    } catch (error) {
      toast.error('Failed to save niche');
    }
  };

  const handleEdit = (niche) => {
    setEditingNiche(niche);
    setFormData({
      name: niche.name,
      keywords: niche.keywords.join(', '),
      cities: niche.cities.join(', '),
      avg_deal_size: niche.avg_deal_size?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteNiche(id);
      toast.success('Niche deleted');
      fetchNiches();
    } catch (error) {
      toast.error('Failed to delete niche');
    }
  };

  const openNewDialog = () => {
    setEditingNiche(null);
    setFormData({ name: '', keywords: '', cities: '', avg_deal_size: '' });
    setIsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Niches</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="niches-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Niches</h1>
          <p className="text-muted-foreground">Manage your target markets</p>
        </div>
        <Button onClick={openNewDialog} data-testid="add-niche-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Niche
        </Button>
      </div>

      {niches.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No niches configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first niche to start targeting leads
              </p>
              <Button onClick={openNewDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create Niche
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {niches.map((niche) => (
            <Card key={niche.id} className="hover:border-primary/30 transition-colors" data-testid={`niche-card-${niche.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{niche.name}</CardTitle>
                    <Badge className={cn("mt-2", statusColors[niche.status])}>
                      {niche.status}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(niche)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(niche.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {niche.keywords.slice(0, 3).map((kw, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
                      ))}
                      {niche.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{niche.keywords.length - 3}</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Cities</p>
                    <p className="text-sm">{niche.cities.slice(0, 3).join(', ')}{niche.cities.length > 3 && ` +${niche.cities.length - 3}`}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                      </div>
                      <p className="text-lg font-bold">{niche.leads_scraped}</p>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                      </div>
                      <p className="text-lg font-bold">{niche.bookings}</p>
                      <p className="text-xs text-muted-foreground">Bookings</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                      </div>
                      <p className="text-lg font-bold">{niche.booking_rate?.toFixed(1) || 0}%</p>
                      <p className="text-xs text-muted-foreground">Conv.</p>
                    </div>
                  </div>
                  {niche.avg_deal_size > 0 && (
                    <div className="pt-3 border-t text-center">
                      <p className="text-xs text-muted-foreground">Avg Deal Size</p>
                      <p className="text-xl font-bold text-emerald-600">${niche.avg_deal_size.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNiche ? 'Edit Niche' : 'Create New Niche'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Home Services - Phoenix"
              />
            </div>
            <div className="space-y-2">
              <Label>Keywords (comma separated) *</Label>
              <Input
                value={formData.keywords}
                onChange={(e) => setFormData({...formData, keywords: e.target.value})}
                placeholder="roofing, roofer, roof repair"
              />
            </div>
            <div className="space-y-2">
              <Label>Cities (comma separated) *</Label>
              <Input
                value={formData.cities}
                onChange={(e) => setFormData({...formData, cities: e.target.value})}
                placeholder="Phoenix, Scottsdale, Mesa"
              />
            </div>
            <div className="space-y-2">
              <Label>Average Deal Size ($)</Label>
              <Input
                type="number"
                value={formData.avg_deal_size}
                onChange={(e) => setFormData({...formData, avg_deal_size: e.target.value})}
                placeholder="8500"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.keywords || !formData.cities}
            >
              {editingNiche ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
