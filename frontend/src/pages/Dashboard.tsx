
import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, CheckCircle, Clock } from 'lucide-react';

interface ActivityData {
  date: string;
  orders: number;
  credits: number;
}

const Dashboard = () => {
  const { user, loading } = useApp();
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        setLoadingActivity(true);
        const statsData = await api.user.getUserStats();
        console.log('Raw stats data:', statsData);
        
        // Transform the activity data to ensure proper formatting
        const transformedActivity = (statsData.activity || []).map((item: any) => ({
          date: item.date,
          orders: item.orders || 0,
          credits: item.credits || 0
        }));
        
        console.log('Transformed activity data:', transformedActivity);
        setActivityData(transformedActivity);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        setActivityData([]);
      } finally {
        setLoadingActivity(false);
      }
    };
    
    fetchActivity();
  }, []);
  
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-upvote-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500">Welcome back, {user?.username}!</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-upvote-primary mr-4" />
              <span className="text-3xl font-bold">{user?.stats?.total_orders || 0}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-upvote-warning mr-4" />
              <span className="text-3xl font-bold">{user?.stats?.active_orders || 0}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Completed Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-upvote-success mr-4" />
              <span className="text-3xl font-bold">{user?.stats?.completed_orders || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your order and credit activity over the past 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-upvote-primary" />
            </div>
          ) : activityData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-2">No activity data available</p>
                <p className="text-sm">Create some orders to see your activity here.</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString();
                    }}
                  />
                  <Bar dataKey="orders" fill="#9b87f5" name="Orders" />
                  <Bar dataKey="credits" fill="#7E69AB" name="Credits Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Username:</span>
              <span className="font-medium">{user?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Credits Balance:</span>
              <span className="font-medium">{user?.credits.toFixed(2)} credits</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-upvote-gray-100 p-3 rounded-md">
              <h3 className="font-medium mb-1">Order Timing</h3>
              <p className="text-sm text-gray-600">
                Space out your orders to maximize the natural appearance of upvotes.
              </p>
            </div>
            <div className="bg-upvote-gray-100 p-3 rounded-md">
              <h3 className="font-medium mb-1">Bulk Discounts</h3>
              <p className="text-sm text-gray-600">
                Purchase more credits at once to receive better rates.
              </p>
            </div>
            <div className="bg-upvote-gray-100 p-3 rounded-md">
              <h3 className="font-medium mb-1">Referral Program</h3>
              <p className="text-sm text-gray-600">
                Invite friends and earn 10% of their first purchase.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
