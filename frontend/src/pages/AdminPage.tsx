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
  Activity
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

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [botConfig, setBotConfig] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Check if user is admin (this should match the backend admin email check)
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL || user?.email === 'admin@upvotezone.com';

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
      fetchBotConfig();
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

  const fetchBotConfig = async () => {
    try {
      setLoadingConfig(true);
      const config = await api.admin.getBotConfig();
      setBotConfig(config);
    } catch (error) {
      console.error('Failed to fetch bot config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadConfig = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      const result = await api.admin.uploadBotConfig(selectedFile);
      
      toast({
        title: "Success",
        description: `Bot configuration uploaded successfully: ${result.filename}`,
      });
      
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('config-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Refresh bot config
      await fetchBotConfig();
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload configuration",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="bot-setup">Bot Setup</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Bot Configuration
              </CardTitle>
              <CardDescription>
                Upload and manage bot configuration files. Supports JSON and YAML formats.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Config Status */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center">
                      <FileCode className="h-4 w-4 mr-2" />
                      Current Configuration
                    </h4>
                    {loadingConfig ? (
                      <p className="text-sm text-gray-600 mt-1">Loading...</p>
                    ) : botConfig?.config_data ? (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">
                          Version: {botConfig.version || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Uploaded: {formatDate(botConfig.uploaded_at)}
                        </p>
                        <Badge className="mt-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Badge variant="secondary">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          No Configuration
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">No bot configuration uploaded yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Section */}
              <div className="space-y-4">
                <h4 className="font-semibold">Upload New Configuration</h4>
                <div className="flex items-center gap-4">
                  <Input
                    id="config-file"
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleUploadConfig}
                    disabled={!selectedFile || uploading}
                    className="whitespace-nowrap"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Config
                      </>
                    )}
                  </Button>
                </div>
                
                {selectedFile && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Selected file:</strong> {selectedFile.name}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      File size: {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Supported formats: JSON (.json), YAML (.yml, .yaml)</p>
                  <p>• Maximum file size: 1 MB</p>
                  <p>• Uploading a new configuration will replace the current one</p>
                </div>
              </div>

              {/* View Current Config */}
              {botConfig?.config_data && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <FileCode className="h-4 w-4 mr-2" />
                      View Current Configuration
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Current Bot Configuration</DialogTitle>
                      <DialogDescription>
                        Version {botConfig.version} • Uploaded {formatDate(botConfig.uploaded_at)}
                      </DialogDescription>
                    </DialogHeader>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                      {JSON.stringify(botConfig.config_data, null, 2)}
                    </pre>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
