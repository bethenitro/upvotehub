import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  CreditCard,
  Settings,
  Upload,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Clock,
  Activity,
  Plus,
  Trash2,
  Server
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface AdminStats {
  overview: {
    total_users: number;
    active_users: number;
    total_orders: number;
    total_payments: number;
    total_revenue: number;
    total_topups: number;
    order_success_rate: number;
    payment_success_rate: number;
  };
  time_based_stats: {
    last_24h: { orders: number; payments: number; revenue: number };
    last_7d: { orders: number; payments: number; revenue: number };
    last_30d: { orders: number; payments: number; revenue: number };
  };
  status_breakdown: {
    orders: Record<string, number>;
    payments: Record<string, number>;
  };
  payment_methods: Record<string, { count: number; total_amount: number }>;
  recent_activity: {
    orders: any[];
    payments: any[];
  };
}

interface UserData {
  users: any[];
  total_count: number;
}

interface ProxyConfig {
  server: string;
  username: string;
  password: string;
  rotation_url: string;
}

interface ProxyData {
  proxies: ProxyConfig[];
  total_count: number;
}

interface SystemSettings {
  min_upvotes: number;
  max_upvotes: number;
  min_upvotes_per_minute: number;
  max_upvotes_per_minute: number;
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Proxy management state
  const [proxies, setProxies] = useState<ProxyData | null>(null);
  const [loadingProxies, setLoadingProxies] = useState(false);
  const [addingProxy, setAddingProxy] = useState(false);
  const [showAddProxyDialog, setShowAddProxyDialog] = useState(false);
  const [newProxy, setNewProxy] = useState<ProxyConfig>({
    server: '',
    username: '',
    password: '',
    rotation_url: ''
  });

  // System settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    min_upvotes: 1,
    max_upvotes: 1000,
    min_upvotes_per_minute: 1,
    max_upvotes_per_minute: 60
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Profiles folder and bot accounts state
  const [selectedProfilesFolder, setSelectedProfilesFolder] = useState<File | null>(null);
  const [uploadingProfiles, setUploadingProfiles] = useState(false);
  const [botAccounts, setBotAccounts] = useState<{accounts: {account_id: number, reddit_username: string}[], total_accounts: number} | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, accountId: number, username: string}>({show: false, accountId: 0, username: ''});

  // Check if user is admin (this should match the backend admin email check)
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL || user?.email === 'admin@upvotezone.com';

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
      fetchProxies();
      fetchSystemSettings();
      fetchBotAccounts();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsData, usersData] = await Promise.all([
        api.admin.getStats(),
        api.admin.getUsers()
      ]);
      setStats(statsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProxies = async () => {
    try {
      setLoadingProxies(true);
      const proxyData = await api.admin.getProxies();
      setProxies(proxyData);
    } catch (error) {
      console.error('Failed to fetch proxies:', error);
      toast({
        title: "Error",
        description: "Failed to load proxy configurations",
        variant: "destructive"
      });
    } finally {
      setLoadingProxies(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      setLoadingSettings(true);
      const settings = await api.admin.getSystemSettings();
      setSystemSettings({
        min_upvotes: settings.min_upvotes,
        max_upvotes: settings.max_upvotes,
        min_upvotes_per_minute: settings.min_upvotes_per_minute,
        max_upvotes_per_minute: settings.max_upvotes_per_minute
      });
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
      toast({
        title: "Error",
        description: "Failed to load system settings",
        variant: "destructive"
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchBotAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const accountsData = await api.admin.getBotAccounts();
      setBotAccounts(accountsData);
    } catch (error) {
      console.error('Failed to fetch bot accounts:', error);
      // Don't show error toast for accounts as it's optional
    } finally {
      setLoadingAccounts(false);
    }
  };

  const updateSystemSettings = async () => {
    try {
      setSavingSettings(true);
      await api.admin.updateSystemSettings(systemSettings);
      toast({
        title: "Success",
        description: "System settings updated successfully",
      });
    } catch (error) {
      console.error('Failed to update system settings:', error);
      toast({
        title: "Error",
        description: "Failed to update system settings",
        variant: "destructive"
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddProxy = async () => {
    if (!newProxy.server || !newProxy.username || !newProxy.password || !newProxy.rotation_url) {
      toast({
        title: "Error",
        description: "Please fill in all proxy fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setAddingProxy(true);
      await api.admin.addProxy(newProxy);
      
      toast({
        title: "Success",
        description: "Proxy added successfully",
      });
      
      setNewProxy({
        server: '',
        username: '',
        password: '',
        rotation_url: ''
      });
      setShowAddProxyDialog(false);
      await fetchProxies();
      
    } catch (error) {
      console.error('Add proxy failed:', error);
      toast({
        title: "Add Failed",
        description: error instanceof Error ? error.message : "Failed to add proxy",
        variant: "destructive"
      });
    } finally {
      setAddingProxy(false);
    }
  };

  const handleDeleteProxy = async (proxyIndex: number) => {
    try {
      await api.admin.deleteProxy(proxyIndex);
      
      toast({
        title: "Success",
        description: "Proxy deleted successfully",
      });
      
      await fetchProxies();
      
    } catch (error) {
      console.error('Delete proxy failed:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete proxy",
        variant: "destructive"
      });
    }
  };

  const handleProfilesFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast({
          title: "Error",
          description: "Please select a ZIP file containing the profiles folder",
          variant: "destructive"
        });
        return;
      }
      setSelectedProfilesFolder(file);
    }
  };

  const handleUploadProfilesFolder = async () => {
    if (!selectedProfilesFolder) {
      toast({
        title: "Error",
        description: "Please select a profiles folder ZIP file to upload",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploadingProfiles(true);
      const result = await api.admin.uploadProfilesFolder(selectedProfilesFolder);
      
      toast({
        title: "Success",
        description: `Profiles folder uploaded successfully with ${result.total_accounts} accounts`,
      });
      
      setSelectedProfilesFolder(null);
      // Reset file input
      const fileInput = document.getElementById('profiles-folder-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Refresh bot accounts
      await fetchBotAccounts();
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload profiles folder",
        variant: "destructive"
      });
    } finally {
      setUploadingProfiles(false);
    }
  };

  const handleDeleteBotAccount = async (accountId: number, redditUsername: string) => {
    // Show confirmation dialog
    setShowDeleteConfirm({show: true, accountId, username: redditUsername});
  };

  const confirmDeleteBotAccount = async () => {
    try {
      const { accountId, username } = showDeleteConfirm;
      const result = await api.admin.deleteBotAccount(accountId);
      
      toast({
        title: "Success",
        description: `Account ${accountId} (${username}) deleted successfully`,
      });
      
      // Refresh bot accounts list
      await fetchBotAccounts();
      
    } catch (error) {
      console.error('Delete account failed:', error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete account",
        variant: "destructive"
      });
    } finally {
      setShowDeleteConfirm({show: false, accountId: 0, username: ''});
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Redirect if not admin
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-upvote-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">System overview and management</p>
        </div>
        <Button onClick={fetchAdminData} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="bot-setup">Bot Setup</TabsTrigger>
          <TabsTrigger value="proxies">Proxies</TabsTrigger>
          <TabsTrigger value="settings">System Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overview.total_users || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.overview.active_users || 0} active in last 7 days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Total Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overview.total_orders || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.overview.order_success_rate || 0}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Total Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overview.total_payments || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.overview.payment_success_rate || 0}% success rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Revenue & Topups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <div className="text-2xl font-bold">${stats?.overview.total_revenue || 0}</div>
                    <p className="text-xs text-gray-500">From completed orders</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-600">${stats?.overview.total_topups || 0}</div>
                    <p className="text-xs text-gray-500">Total topups received</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ${stats?.time_based_stats.last_30d.revenue || 0} revenue last 30 days
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time-based Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['last_24h', 'last_7d', 'last_30d'].map((period) => (
              <Card key={period}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {period === 'last_24h' ? 'Last 24 Hours' : 
                     period === 'last_7d' ? 'Last 7 Days' : 'Last 30 Days'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span>Orders:</span>
                    <span className="font-semibold">
                      {stats?.time_based_stats[period as keyof typeof stats.time_based_stats]?.orders || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payments:</span>
                    <span className="font-semibold">
                      {stats?.time_based_stats[period as keyof typeof stats.time_based_stats]?.payments || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-semibold">
                      ${stats?.time_based_stats[period as keyof typeof stats.time_based_stats]?.revenue || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Status Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats?.status_breakdown.orders || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="capitalize">{status}:</span>
                      <Badge className={getStatusColor(status)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(stats?.status_breakdown.payments || {}).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="capitalize">{status}:</span>
                      <Badge className={getStatusColor(status)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Overview of all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>${user.credits?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>{user.total_orders || 0}</TableCell>
                        <TableCell>${user.total_spent?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell>
                          {user.last_login ? formatDate(user.last_login) : 'Never'}
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recent_activity.orders?.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">Order #{order.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600">{order.upvotes} upvotes</p>
                        <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                  )) || <p>No recent orders</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recent_activity.payments?.slice(0, 10).map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">${payment.amount}</p>
                        <p className="text-sm text-gray-600">{payment.method}</p>
                        <p className="text-xs text-gray-500">{formatDate(payment.created_at)}</p>
                      </div>
                      <Badge className={getStatusColor(payment.status)}>{payment.status}</Badge>
                    </div>
                  )) || <p>No recent payments</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bot-setup" className="space-y-6">
          {/* Profiles Folder Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Bot Profiles Management
              </CardTitle>
              <CardDescription>
                Upload profiles folder from your local bot instance and manage bot accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Accounts Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Current Bot Accounts
                    </h4>
                    {loadingAccounts ? (
                      <p className="text-sm text-gray-600 mt-1">Loading accounts...</p>
                    ) : botAccounts?.accounts?.length ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">
                          Total Accounts: {botAccounts.total_accounts}
                        </p>
                        <Badge className="mt-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {botAccounts.total_accounts} Accounts Available
                        </Badge>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No Profiles Found
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">No profiles folder uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Profiles Folder Section */}
              <div className="space-y-4">
                <h4 className="font-semibold">Upload Profiles Folder</h4>
                
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-upvote-primary/30 rounded-lg p-6 bg-upvote-primary/5 hover:bg-upvote-primary/10 transition-colors">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="p-3 bg-upvote-primary/10 rounded-full">
                        <Upload className="h-8 w-8 text-upvote-primary" />
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Choose Profiles Folder
                      </p>
                      <p className="text-sm text-gray-600 mb-4">
                        Select a ZIP file containing your bot's profiles folder
                      </p>
                      
                      <label htmlFor="profiles-folder-file" className="cursor-pointer">
                        <Button 
                          type="button"
                          variant="default"
                          size="lg"
                          className="bg-upvote-primary hover:bg-upvote-primary/90 text-white font-bold px-10 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                          asChild
                        >
                          <span>
                            <Upload className="h-6 w-6 mr-3" />
                            Choose ZIP File
                          </span>
                        </Button>
                      </label>
                      
                      <Input
                        id="profiles-folder-file"
                        type="file"
                        accept=".zip"
                        onChange={handleProfilesFolderSelect}
                        className="hidden"
                      />
                    </div>
                    
                    {selectedProfilesFolder && (
                      <div className="mt-4">
                        <div className="p-3 bg-green-50 rounded border border-green-200">
                          <p className="text-sm text-green-800 font-medium">
                            ✓ Selected file: {selectedProfilesFolder.name}
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            File size: {(selectedProfilesFolder.size / 1024 / 1024).toFixed(1)} MB
                          </p>
                        </div>
                        
                        <Button 
                          onClick={handleUploadProfilesFolder}
                          disabled={uploadingProfiles}
                          className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                          size="lg"
                        >
                          {uploadingProfiles ? (
                            <>
                              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                              Uploading Profiles...
                            </>
                          ) : (
                            <>
                              <Upload className="h-5 w-5 mr-2" />
                              Upload Profiles Folder
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Upload a ZIP file containing the 'profiles' folder from your local bot instance</p>
                  <p>• The profiles folder should contain an 'accounts.json' file</p>
                  <p>• Maximum file size: 50 MB</p>
                </div>
              </div>

              {/* Bot Accounts List */}
              {botAccounts?.accounts?.length ? (
                <div className="space-y-4">
                  <h4 className="font-semibold">Available Bot Accounts</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account ID</TableHead>
                          <TableHead>Reddit Username</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {botAccounts.accounts.map((account) => (
                          <TableRow key={account.account_id}>
                            <TableCell className="font-medium">{account.account_id}</TableCell>
                            <TableCell>{account.reddit_username}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleDeleteBotAccount(account.account_id, account.reddit_username)} 
                                  variant="destructive" 
                                  size="icon"
                                  aria-label="Delete account"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proxies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Proxy Configurations
              </CardTitle>
              <CardDescription>
                Manage proxy settings for the application. Used for routing and API access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Proxy List */}
              <div className="space-y-4">
                {loadingProxies ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-upvote-primary" />
                  </div>
                ) : proxies?.proxies.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Server</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Rotation URL</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proxies.proxies.map((proxy, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{proxy.server}</TableCell>
                            <TableCell>{proxy.username}</TableCell>
                            <TableCell>{proxy.password}</TableCell>
                            <TableCell>{proxy.rotation_url}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleDeleteProxy(index)} 
                                  variant="destructive" 
                                  size="icon"
                                  aria-label="Delete proxy"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No proxy configurations found</p>
                )}
              </div>

              {/* Add Proxy Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={() => setShowAddProxyDialog(true)} 
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Proxy
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                System Settings
              </CardTitle>
              <CardDescription>
                Configure order limits and validation rules for the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-upvote-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upvotes Limits */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Upvotes per Order Limits</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="min-upvotes">Minimum Upvotes</Label>
                        <Input
                          id="min-upvotes"
                          type="number"
                          min="1"
                          value={systemSettings.min_upvotes}
                          onChange={(e) => setSystemSettings({ 
                            ...systemSettings, 
                            min_upvotes: Math.max(1, parseInt(e.target.value) || 1)
                          })}
                          placeholder="Minimum upvotes per order"
                        />
                        <p className="text-xs text-gray-500">
                          Minimum number of upvotes allowed per order
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-upvotes">Maximum Upvotes</Label>
                        <Input
                          id="max-upvotes"
                          type="number"
                          min="1"
                          value={systemSettings.max_upvotes}
                          onChange={(e) => setSystemSettings({ 
                            ...systemSettings, 
                            max_upvotes: Math.max(1, parseInt(e.target.value) || 1000)
                          })}
                          placeholder="Maximum upvotes per order"
                        />
                        <p className="text-xs text-gray-500">
                          Maximum number of upvotes allowed per order
                        </p>
                      </div>
                    </div>

                    {/* Upvotes per Minute Limits */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Upvotes per Minute Limits</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor="min-upvotes-per-minute">Minimum Upvotes per Minute</Label>
                        <Input
                          id="min-upvotes-per-minute"
                          type="number"
                          min="1"
                          value={systemSettings.min_upvotes_per_minute}
                          onChange={(e) => setSystemSettings({ 
                            ...systemSettings, 
                            min_upvotes_per_minute: Math.max(1, parseInt(e.target.value) || 1)
                          })}
                          placeholder="Minimum upvotes per minute"
                        />
                        <p className="text-xs text-gray-500">
                          Minimum rate of upvotes per minute
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-upvotes-per-minute">Maximum Upvotes per Minute</Label>
                        <Input
                          id="max-upvotes-per-minute"
                          type="number"
                          min="1"
                          value={systemSettings.max_upvotes_per_minute}
                          onChange={(e) => setSystemSettings({ 
                            ...systemSettings, 
                            max_upvotes_per_minute: Math.max(1, parseInt(e.target.value) || 60)
                          })}
                          placeholder="Maximum upvotes per minute"
                        />
                        <p className="text-xs text-gray-500">
                          Maximum rate of upvotes per minute
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Values Display */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium mb-2">Current Settings Preview</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Min Upvotes:</span>
                        <span className="ml-2 font-semibold">{systemSettings.min_upvotes}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Max Upvotes:</span>
                        <span className="ml-2 font-semibold">{systemSettings.max_upvotes}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Min Rate:</span>
                        <span className="ml-2 font-semibold">{systemSettings.min_upvotes_per_minute}/min</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Max Rate:</span>
                        <span className="ml-2 font-semibold">{systemSettings.max_upvotes_per_minute}/min</span>
                      </div>
                    </div>
                  </div>

                  {/* Validation Messages */}
                  {systemSettings.min_upvotes > systemSettings.max_upvotes && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Error: Minimum upvotes cannot be greater than maximum upvotes
                      </p>
                    </div>
                  )}

                  {systemSettings.min_upvotes_per_minute > systemSettings.max_upvotes_per_minute && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Error: Minimum upvotes per minute cannot be greater than maximum upvotes per minute
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button 
                      onClick={fetchSystemSettings} 
                      variant="outline"
                      disabled={loadingSettings}
                    >
                      {loadingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Reset to Current"
                      )}
                    </Button>
                    <Button 
                      onClick={updateSystemSettings}
                      disabled={
                        savingSettings || 
                        systemSettings.min_upvotes > systemSettings.max_upvotes ||
                        systemSettings.min_upvotes_per_minute > systemSettings.max_upvotes_per_minute
                      }
                    >
                      {savingSettings ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Proxy Dialog */}
      <Dialog open={showAddProxyDialog} onOpenChange={setShowAddProxyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Proxy</DialogTitle>
            <DialogDescription>
              Enter the details for the new proxy configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="proxy-server">Server</Label>
              <Input
                id="proxy-server"
                value={newProxy.server}
                onChange={(e) => setNewProxy({ ...newProxy, server: e.target.value })}
                placeholder="Proxy server address"
              />
            </div>
            <div>
              <Label htmlFor="proxy-username">Username</Label>
              <Input
                id="proxy-username"
                value={newProxy.username}
                onChange={(e) => setNewProxy({ ...newProxy, username: e.target.value })}
                placeholder="Proxy username"
              />
            </div>
            <div>
              <Label htmlFor="proxy-password">Password</Label>
              <Input
                id="proxy-password"
                type="password"
                value={newProxy.password}
                onChange={(e) => setNewProxy({ ...newProxy, password: e.target.value })}
                placeholder="Proxy password"
              />
            </div>
            <div>
              <Label htmlFor="proxy-rotation-url">Rotation URL</Label>
              <Input
                id="proxy-rotation-url"
                value={newProxy.rotation_url}
                onChange={(e) => setNewProxy({ ...newProxy, rotation_url: e.target.value })}
                placeholder="Proxy rotation URL"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              onClick={() => setShowAddProxyDialog(false)} 
              variant="outline"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddProxy}
              disabled={addingProxy}
            >
              {addingProxy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Proxy"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteConfirm.show} onOpenChange={(open) => !open && setShowDeleteConfirm({show: false, accountId: 0, username: ''})}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Bot Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bot account? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Account ID:</strong> {showDeleteConfirm.accountId}
              </p>
              <p className="text-sm text-red-800">
                <strong>Username:</strong> {showDeleteConfirm.username}
              </p>
              <p className="text-xs text-red-600 mt-2">
                This will remove the account from accounts.json and delete its folder from the profiles directory.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              onClick={() => setShowDeleteConfirm({show: false, accountId: 0, username: ''})} 
              variant="outline"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmDeleteBotAccount}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
