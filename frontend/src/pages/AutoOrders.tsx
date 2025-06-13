
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/api';
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, CheckCircle, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AutoOrder {
  id: string;
  redditUrl: string;
  upvotes: number;
  frequency: string;
  nextRunAt: string;
  status: string;
  createdAt: string;
  costPerRun: number;
}

const AutoOrders = () => {
  const { user, refreshUser } = useApp();
  const navigate = useNavigate();
  
  // Form state
  const [redditUrl, setRedditUrl] = useState('');
  const [upvotes, setUpvotes] = useState(20);
  const [frequency, setFrequency] = useState('daily');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // Auto orders list
  const [autoOrders, setAutoOrders] = useState<AutoOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  // Cost calculation
  const costMap = {
    'daily': 0.7,
    'weekly': 0.75,
    'monthly': 0.8
  };
  
  const cost = upvotes * (costMap[frequency as keyof typeof costMap] || 0.7);
  
  // Check if user has enough credits
  const hasEnoughCredits = user && user.credits >= cost;
  
  // URL validation
  const isValidRedditUrl = () => {
    return redditUrl.trim() !== '' && redditUrl.includes('reddit.com');
  };
  
  // Load auto orders
  useEffect(() => {
    const fetchAutoOrders = async () => {
      try {
        setLoadingOrders(true);
        const data = await api.orders.getAutoOrders();
        setAutoOrders(data);
      } catch (error) {
        console.error('Failed to fetch auto orders:', error);
        toast({
          title: "Error",
          description: "Failed to load auto orders.",
          variant: "destructive"
        });
      } finally {
        setLoadingOrders(false);
      }
    };
    
    fetchAutoOrders();
  }, []);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidRedditUrl()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Reddit post URL",
        variant: "destructive"
      });
      return;
    }
    
    if (!hasEnoughCredits) {
      toast({
        title: "Insufficient Credits",
        description: "Please top up your account to place this order",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const result = await api.orders.createAutoOrder({
        redditUrl,
        upvotes,
        frequency: frequency as "daily" | "weekly" | "monthly"
      });
      
      if (result.success) {
        setOrderSuccess(true);
        await refreshUser(); // Refresh user data to update credits
        
        // Add the new order to the list
        setAutoOrders([result.order, ...autoOrders]);
        
        // Reset form
        setRedditUrl('');
        setUpvotes(20);
        setFrequency('daily');
        
        toast({
          title: "Success",
          description: "Auto order created successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create auto order. Please try again.",
        variant: "destructive"
      });
      console.error('Failed to create auto order:', error);
    } finally {
      setIsSubmitting(false);
      setOrderSuccess(false);
    }
  };
  
  // Handle order cancellation
  const handleCancel = async (orderId: string) => {
    try {
      const result = await api.orders.cancelAutoOrder(orderId);
      
      if (result.success) {
        // Remove or update the order in the list
        setAutoOrders(autoOrders.filter(order => order.id !== orderId));
        
        toast({
          title: "Success",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel auto order.",
        variant: "destructive"
      });
      console.error('Failed to cancel auto order:', error);
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Auto Orders</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Auto Order</CardTitle>
              <CardDescription>
                Schedule recurring upvotes for your Reddit posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="reddit-url" className="text-sm font-medium">
                    Reddit Post URL
                  </label>
                  <Input
                    id="reddit-url"
                    placeholder="https://reddit.com/r/subreddit/comments/..."
                    value={redditUrl}
                    onChange={(e) => setRedditUrl(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">
                    Enter the full URL to the Reddit post you want to boost
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label htmlFor="upvotes" className="text-sm font-medium">
                      Number of Upvotes (per run)
                    </label>
                    <span>{upvotes} upvotes</span>
                  </div>
                  <Slider
                    id="upvotes"
                    min={5}
                    max={100}
                    step={5}
                    value={[upvotes]}
                    onValueChange={(value) => setUpvotes(value[0])}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>5</span>
                    <span>100</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="frequency" className="text-sm font-medium">
                    Frequency
                  </label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Cost per run:</p>
                <p className="text-xl font-bold">{cost.toFixed(2)} credits</p>
              </div>
              <Button onClick={handleSubmit} disabled={isSubmitting || !hasEnoughCredits}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  'Create Auto Order'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Auto Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Order Type:</span>
                  <span>Recurring ({frequency})</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Upvotes per run:</span>
                  <span>{upvotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cost per run:</span>
                  <span>{cost.toFixed(2)} credits</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Your balance:</span>
                  <span>{user?.credits.toFixed(2) || 0} credits</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Next run cost:</span>
                  <span>-{cost.toFixed(2)} credits</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Remaining balance:</span>
                  <span>{user ? (user.credits - cost).toFixed(2) : '0'} credits</span>
                </div>
              </div>
              
              {!hasEnoughCredits && (
                <div className="bg-red-50 p-4 rounded-md text-red-600 text-sm">
                  <p className="font-medium">Insufficient credits</p>
                  <p>Please top up your account to place this order.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => navigate('/account/topup')}
                  >
                    Top Up Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your Auto Orders</CardTitle>
          <CardDescription>
            Manage your recurring upvote orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-upvote-primary" />
            </div>
          ) : autoOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">You don't have any auto orders yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reddit Post</TableHead>
                    <TableHead>Upvotes</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {autoOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="max-w-[200px] truncate">
                        <a 
                          href={order.redditUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-upvote-primary hover:underline"
                        >
                          {order.redditUrl}
                        </a>
                      </TableCell>
                      <TableCell>{order.upvotes}</TableCell>
                      <TableCell className="capitalize">{order.frequency}</TableCell>
                      <TableCell>{formatDate(order.nextRunAt)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : order.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {order.status === 'paused' && <PauseCircle className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{order.status}</span>
                        </span>
                      </TableCell>
                      <TableCell>{order.costPerRun.toFixed(2)} credits</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {order.status === 'active' ? (
                            <Button variant="outline" size="icon" title="Pause">
                              <PauseCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="icon" title="Resume">
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Auto Order</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel this auto order? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleCancel(order.id)} className="bg-red-500 hover:bg-red-600">
                                  Confirm
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoOrders;
