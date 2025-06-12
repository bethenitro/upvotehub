
import React from 'react';
import { useAuth } from '../context/AuthContext'; // Adjusted path
import { api } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react'; // Added AlertCircle for errors

interface ActivityData {
  date: string;
  orders: number;
  credits: number;
}

// Assuming the User object from AuthContext might have a stats structure
// If not, this needs to be adjusted based on actual User structure from useAuth()
interface UserStats {
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
}

interface UserFromAuth {
  id: string;
  username: string;
  email: string;
  credits: number;
  profileImage?: string;
  stats?: UserStats; // Make stats optional or ensure it's part of the User type
  joinedDate?: string; // Make joinedDate optional
}


const Dashboard = () => {
  const { user, isLoading: isAuthLoading } = useAuth();

  const {
    data: activityData,
    isLoading: isLoadingActivity,
    isError: isActivityError,
    error: activityError
  } = useQuery<ActivityData[], Error>({ // Specify types for useQuery
    queryKey: ['accountActivity'],
    queryFn: () => api.user.getAccountActivity(),
    enabled: !!user, // Only run query if user is loaded
  });
  
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-upvote-primary" />
      </div>
    );
  }

  // Type assertion for user if necessary, or ensure useAuth().user has the extended type
  const currentUser = user as UserFromAuth | null;
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500">Welcome back, {currentUser?.username}!</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-upvote-primary mr-4" />
              <span className="text-3xl font-bold">{currentUser?.stats?.totalOrders ?? 'N/A'}</span>
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
              <span className="text-3xl font-bold">{currentUser?.stats?.activeOrders ?? 'N/A'}</span>
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
              <span className="text-3xl font-bold">{currentUser?.stats?.completedOrders ?? 'N/A'}</span>
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
          {isLoadingActivity ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-upvote-primary" />
            </div>
          ) : isActivityError ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>Error loading activity: {activityError?.message || 'Unknown error'}</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData || []}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getDate()}/${date.getMonth() + 1}`;
                    }}
                  />
                  <YAxis yAxisId="left" orientation="left" stroke="#9b87f5" />
                  <YAxis yAxisId="right" orientation="right" stroke="#7E69AB" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="orders" fill="#9b87f5" name="Orders" />
                  <Bar yAxisId="right" dataKey="credits" fill="#7E69AB" name="Credits Spent" />
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
              <span className="font-medium">{currentUser?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Credits Balance:</span>
              <span className="font-medium">{currentUser?.credits?.toFixed(2) ?? '0.00'} credits</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Member Since:</span>
              <span className="font-medium">
                {currentUser?.joinedDate ? new Date(currentUser.joinedDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-upvote-gray-100 p-3 rounded-md">
              <h3 className="font-medium mb-1">Auto Orders</h3>
              <p className="text-sm text-gray-600">
                Set up recurring upvotes for your most important Reddit posts.
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
