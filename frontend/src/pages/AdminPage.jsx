import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, CreditCard, BarChart3, Mail, Trash2, 
  CheckCircle, XCircle, Clock, ArrowLeft, RefreshCw,
  TrendingUp, Database, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteUserId, setDeleteUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [analyticsRes, usersRes, subsRes, contactsRes] = await Promise.all([
          api.get('/admin/analytics'),
          api.get('/admin/users'),
          api.get('/admin/subscriptions').catch(() => ({ data: [] })),
          api.get('/admin/contact-submissions').catch(() => ({ data: [] }))
        ]);
        setAnalytics(analyticsRes.data);
        setUsers(usersRes.data);
        setSubscriptions(subsRes.data);
        setContacts(contactsRes.data);
      } catch (error) {
        if (error.response?.status === 403) {
          toast.error('Admin access required');
          navigate('/dashboard');
        } else {
          toast.error('Failed to load admin data');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    try {
      await api.delete(`/admin/users/${deleteUserId}`);
      toast.success('User deleted');
      setUsers(users.filter(u => u.id !== deleteUserId));
      setDeleteUserId(null);
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      trial: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      cancelled: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      expired: 'bg-red-500/10 text-red-500 border-red-500/20',
      none: 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    };
    return styles[status] || styles.none;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950/10 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400">Manage users, subscriptions, and analytics</p>
          </div>
          <Button onClick={fetchData} variant="outline" className="border-slate-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-900/80 border-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Users</p>
                  <p className="text-3xl font-bold text-white">{analytics?.total_users || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Subscribed</p>
                  <p className="text-3xl font-bold text-white">{analytics?.subscribed_users || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Leads</p>
                  <p className="text-3xl font-bold text-white">{analytics?.total_leads || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Database className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-red-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Email Sequences</p>
                  <p className="text-3xl font-bold text-white">{analytics?.total_email_sequences || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {['overview', 'users', 'subscriptions', 'contacts'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? 'bg-red-600 hover:bg-red-700' : 'text-slate-400'}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <Card className="bg-slate-900/80 border-red-900/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Signups</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Signed Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics?.recent_signups?.map((user) => (
                    <TableRow key={user.id} className="border-slate-800">
                      <TableCell className="text-white">{user.name}</TableCell>
                      <TableCell className="text-slate-400">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadge(user.subscription_status)}>
                          {user.subscription_status || 'none'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">{formatDate(user.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card className="bg-slate-900/80 border-red-900/20">
            <CardHeader>
              <CardTitle className="text-white">All Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800">
                    <TableHead className="text-slate-400">Name</TableHead>
                    <TableHead className="text-slate-400">Email</TableHead>
                    <TableHead className="text-slate-400">Role</TableHead>
                    <TableHead className="text-slate-400">Subscription</TableHead>
                    <TableHead className="text-slate-400">Leads</TableHead>
                    <TableHead className="text-slate-400">Verified</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-slate-800">
                      <TableCell className="text-white">{user.name}</TableCell>
                      <TableCell className="text-slate-400">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={user.role === 'admin' ? 'bg-red-500/10 text-red-500' : ''}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadge(user.subscription_status)}>
                          {user.subscription_status || 'none'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">{user.lead_count || 0}</TableCell>
                      <TableCell>
                        {user.email_verified ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {user.role !== 'admin' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteUserId(user.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'subscriptions' && (
          <Card className="bg-slate-900/80 border-red-900/20">
            <CardHeader>
              <CardTitle className="text-white">Stripe Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No subscriptions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">ID</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Current Period</TableHead>
                      <TableHead className="text-slate-400">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id} className="border-slate-800">
                        <TableCell className="text-white font-mono text-sm">{sub.id.slice(0, 20)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusBadge(sub.status)}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {formatDate(sub.current_period_start)} - {formatDate(sub.current_period_end)}
                        </TableCell>
                        <TableCell className="text-slate-400">{formatDate(sub.created)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'contacts' && (
          <Card className="bg-slate-900/80 border-red-900/20">
            <CardHeader>
              <CardTitle className="text-white">Contact Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <p className="text-slate-400 text-center py-8">No contact submissions yet</p>
              ) : (
                <div className="space-y-4">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">{contact.name}</span>
                          <span className="text-slate-400 ml-2">({contact.email})</span>
                        </div>
                        <span className="text-slate-500 text-sm">{formatDate(contact.created_at)}</span>
                      </div>
                      <p className="text-slate-300">{contact.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete the user and all their data (leads, sequences, etc.). 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
