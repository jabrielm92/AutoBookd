import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  MoreHorizontal,
  Check,
  X,
  Video
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getBookings, createBooking, updateBooking, getLeads } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, parseISO, isSameDay } from 'date-fns';

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

const timezones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix'
];

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    lead_id: '',
    meeting_date: '',
    meeting_time: '10:00',
    timezone: 'America/New_York',
    duration_minutes: 30,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch bookings first
      let bookingsData = [];
      try {
        const bookingsRes = await getBookings({ limit: 100 });
        bookingsData = bookingsRes.data || [];
      } catch (e) {
        console.log('No bookings yet');
      }
      setBookings(bookingsData);

      // Fetch leads for dropdown - get all leads with email
      let leadsData = [];
      try {
        const leadsRes = await getLeads({ limit: 100 });
        leadsData = (leadsRes.data || []).filter(l => l.email);
      } catch (e) {
        console.log('No leads yet');
      }
      setLeads(leadsData);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    try {
      const payload = {
        ...formData,
        meeting_date: formData.meeting_date || selectedDate.toISOString().split('T')[0],
        duration_minutes: parseInt(formData.duration_minutes)
      };
      await createBooking(payload);
      toast.success('Booking created');
      setIsDialogOpen(false);
      setFormData({
        lead_id: '',
        meeting_date: '',
        meeting_time: '10:00',
        timezone: 'America/New_York',
        duration_minutes: 30,
        notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to create booking');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateBooking(id, { status });
      toast.success('Booking updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update booking');
    }
  };

  const getLeadName = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    return lead?.business_name || 'Unknown';
  };

  const getBookingsForDate = (date) => {
    return bookings.filter(b => {
      try {
        const bookingDate = parseISO(b.meeting_date);
        return isSameDay(bookingDate, date);
      } catch {
        return false;
      }
    });
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  const statusColors = {
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    no_show: 'bg-amber-50 text-amber-700 border-amber-200'
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeleton h-96 rounded-xl" />
          <div className="lg:col-span-2 skeleton h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="bookings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-slate-500">{bookings.length} total meetings</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-booking-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule New Meeting</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Lead *</Label>
                <Select 
                  value={formData.lead_id} 
                  onValueChange={(v) => setFormData({...formData, lead_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">No leads with email available</div>
                    ) : (
                      leads.map(lead => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.business_name} ({lead.email})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.meeting_date}
                    onChange={(e) => setFormData({...formData, meeting_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time *</Label>
                  <Select 
                    value={formData.meeting_time} 
                    onValueChange={(v) => setFormData({...formData, meeting_time: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select 
                    value={formData.timezone} 
                    onValueChange={(v) => setFormData({...formData, timezone: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz} value={tz}>{tz.split('/')[1].replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select 
                    value={formData.duration_minutes.toString()} 
                    onValueChange={(v) => setFormData({...formData, duration_minutes: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Meeting notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                onClick={handleCreateBooking}
                disabled={!formData.lead_id || !formData.meeting_date}
              >
                Create Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md"
              modifiers={{
                booked: bookings.map(b => {
                  try { return parseISO(b.meeting_date); } catch { return new Date(); }
                })
              }}
              modifiersStyles={{
                booked: { fontWeight: 'bold', textDecoration: 'underline' }
              }}
            />
          </CardContent>
        </Card>

        {/* Day View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateBookings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No meetings scheduled for this day</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDateBookings.map((booking) => (
                  <div 
                    key={booking.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                    data-testid={`booking-card-${booking.id}`}
                  >
                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-slate-900 text-white">
                      <span className="text-2xl font-bold">{booking.meeting_time?.split(':')[0] || '00'}</span>
                      <span className="text-xs">{booking.meeting_time?.split(':')[1] || '00'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">{getLeadName(booking.lead_id)}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {booking.duration_minutes} min
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {booking.timezone?.split('/')[1]?.replace('_', ' ') || 'EST'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("border", statusColors[booking.status] || statusColors.scheduled)}>
                            {booking.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'completed')}>
                                <Check className="w-4 h-4 mr-2" />
                                Mark Completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(booking.id, 'no_show')}>
                                <Video className="w-4 h-4 mr-2" />
                                Mark No Show
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                                className="text-red-600"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {booking.notes && (
                        <p className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded">
                          {booking.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All Bookings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Upcoming Meetings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bookings.filter(b => b.status === 'scheduled').length === 0 ? (
              <p className="text-center py-8 text-slate-400">No upcoming meetings</p>
            ) : (
              bookings.filter(b => b.status === 'scheduled').map((booking) => (
                <div 
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-sm">
                      <span className="font-bold">{format(parseISO(booking.meeting_date), 'dd')}</span>
                      <span className="text-xs text-slate-500">{format(parseISO(booking.meeting_date), 'MMM')}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{getLeadName(booking.lead_id)}</p>
                      <p className="text-sm text-slate-500">
                        {booking.meeting_time} • {booking.duration_minutes} min
                      </p>
                    </div>
                  </div>
                  <Badge className={cn("border", statusColors[booking.status])}>
                    {booking.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
