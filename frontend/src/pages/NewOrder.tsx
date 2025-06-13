
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { api } from '@/services/api';
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NewOrder = () => {
  const { user, refreshUser } = useApp();
  const navigate = useNavigate();
  const [redditUrl, setRedditUrl] = useState('');
  const [upvotes, setUpvotes] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  
  // Calculate cost based on upvotes (0.8 credits per upvote)
  const cost = upvotes * 0.8;
  
  // Check if user has enough credits
  const hasEnoughCredits = user && user.credits >= cost;
  
  // URL validation
  const isValidRedditUrl = () => {
    // Basic validation for Reddit URL
    return redditUrl.trim() !== '' && redditUrl.includes('reddit.com');
  };
  
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
      
      const result = await api.orders.createOrder({
        redditUrl,
        upvotes
      });
      
      if (result.success) {
        setOrderSuccess(true);
        await refreshUser(); // Refresh user data to update credits
        
        setTimeout(() => {
          navigate('/orders/history');
        }, 2000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
      console.error('Failed to place order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (orderSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-full max-w-md">
          <Card className="w-full">
            <CardHeader>
              <div className="mx-auto bg-upvote-success bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-upvote-success" />
              </div>
              <CardTitle className="text-center">Order Placed Successfully!</CardTitle>
              <CardDescription className="text-center">
                Your upvotes will be delivered soon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Order Type:</span>
                  <span>One-time</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Upvotes:</span>
                  <span>{upvotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cost:</span>
                  <span>{cost.toFixed(2)} credits</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => navigate('/orders/history')}>
                View Order History
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">New Order</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Place a One-Time Order</CardTitle>
              <CardDescription>
                Boost your Reddit post with one-time upvotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
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
                      Number of Upvotes
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
              </form>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Cost:</p>
                <p className="text-xl font-bold">{cost.toFixed(2)} credits</p>
              </div>
              <Button onClick={handleSubmit} disabled={isSubmitting || !hasEnoughCredits}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  'Place Order'
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Order Type:</span>
                  <span>One-time</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Upvotes:</span>
                  <span>{upvotes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cost:</span>
                  <span>{cost.toFixed(2)} credits</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Your balance:</span>
                  <span>{user?.credits.toFixed(2) || 0} credits</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Order cost:</span>
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
    </div>
  );
};

export default NewOrder;
