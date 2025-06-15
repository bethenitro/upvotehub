import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
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
import { Label } from '@/components/ui/label';
import { CheckCircle, Loader2, Bitcoin, ExternalLink, X } from 'lucide-react';
import { api } from '@/services/api';

const TopUpAccount = () => {
  const { user, refreshUser } = useApp();
  
  // Form state
  const [amount, setAmount] = useState<number>(50);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkoutLink, setCheckoutLink] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [lastStatusCheck, setLastStatusCheck] = useState<string>('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>('');

  // Auto-refresh payment status every 30 seconds when payment is pending
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefreshEnabled && paymentId && success) {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 30000); // Check every 30 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefreshEnabled, paymentId, success]);
  
  // Predefined amounts with crypto-friendly values
  const creditPackages = [
    { amount: 20, label: '20 credits', bonus: 0, usd: 20 },
    { amount: 50, label: '50 credits', bonus: 5, usd: 50 },
    { amount: 100, label: '100 credits', bonus: 15, usd: 100 },
    { amount: 250, label: '250 credits', bonus: 50, usd: 250 },
  ];
  
  // Handle custom amount input
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setAmount(value);
    }
  };
  
  // Handle crypto payment submission
  const handleCryptoPayment = async () => {
    try {
      setIsSubmitting(true);
      
      // Basic validation
      if (amount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount",
          variant: "destructive"
        });
        return;
      }
      
      // Calculate bonus credits if applicable
      let totalCredits = amount;
      const package_ = creditPackages.find(p => p.amount === amount);
      if (package_) {
        totalCredits += package_.bonus;
      }
      
      // Create crypto payment
      const result = await api.payments.createCryptoPayment(amount, {
        buyer_email: user?.email,
        description: `Account top-up: ${totalCredits} credits`
      });
      
      if (result.success && result.checkout_link) {
        setCheckoutLink(result.checkout_link);
        setPaymentId(result.payment_id);
        setSuccess(true);
        setCurrentPaymentStatus('pending'); // Set initial status as pending
        setAutoRefreshEnabled(true); // Enable auto-refresh for new payments
        setLastStatusCheck('Payment created - Waiting for completion...');
        
        toast({
          title: "Payment Created",
          description: "You will be redirected to complete your crypto payment. We'll monitor the status automatically.",
        });
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an issue creating your crypto payment.",
        variant: "destructive"
      });
      console.error('Crypto payment failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Check payment status
  const checkPaymentStatus = async () => {
    if (!paymentId) return;
    
    setIsCheckingStatus(true);
    
    try {
      const status = await api.payments.getPaymentStatus(paymentId);
      const currentTime = new Date().toLocaleTimeString();
      
      // Update current payment status
      setCurrentPaymentStatus(status.status);
      
      if (status.status === 'completed') {
        await refreshUser();
        toast({
          title: "Payment Completed! 🎉",
          description: `${amount} credits have been added to your account.`,
        });
        setSuccess(false);
        setCheckoutLink('');
        setPaymentId('');
        setLastStatusCheck('');
        setAutoRefreshEnabled(false);
        setCurrentPaymentStatus('');
      } else if (status.status === 'failed') {
        toast({
          title: "Payment Failed",
          description: "Your crypto payment was not successful. Please try again.",
          variant: "destructive"
        });
        setSuccess(false);
        setCheckoutLink('');
        setPaymentId('');
        setLastStatusCheck('');
        setAutoRefreshEnabled(false);
        setCurrentPaymentStatus('');
      } else if (status.status === 'pending') {
        setLastStatusCheck(`Pending - Last checked at ${currentTime}`);
        setAutoRefreshEnabled(true); // Enable auto-refresh for pending payments
        toast({
          title: "Payment Pending",
          description: "Your payment is still being processed. We'll check automatically every 30 seconds.",
        });
      } else {
        // Handle other statuses like 'processing', 'expired', etc.
        const statusMessage = status.status.charAt(0).toUpperCase() + status.status.slice(1);
        setLastStatusCheck(`${statusMessage} - Last checked at ${currentTime}`);
        setAutoRefreshEnabled(true); // Continue auto-refresh for processing payments
        toast({
          title: `Payment ${statusMessage}`,
          description: `Your payment status is currently: ${statusMessage}`,
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: "Status Check Failed",
        description: "Unable to check payment status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Cancel payment handler
  const handleCancelPayment = async () => {
    if (!paymentId) return;
    
    try {
      setIsCancelling(true);
      
      const result = await api.payments.cancelPayment(paymentId);
      
      if (result.success) {
        toast({
          title: "Payment Cancelled",
          description: "Your payment has been cancelled successfully.",
        });
        
        // Reset the form state
        setSuccess(false);
        setCheckoutLink('');
        setPaymentId('');
        setLastStatusCheck('');
        setAutoRefreshEnabled(false);
        setCurrentPaymentStatus('');
      }
    } catch (error) {
      console.error('Error cancelling payment:', error);
      toast({
        title: "Cancel Failed",
        description: "Unable to cancel payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Top Up Account with Cryptocurrency</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bitcoin className="h-5 w-5 text-orange-500" />
                Add Credits with Crypto
              </CardTitle>
              <CardDescription>
                Purchase credits using Bitcoin, Ethereum, and other cryptocurrencies via BTCPay Server
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success && checkoutLink ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="bg-orange-100 text-orange-800 rounded-full p-3 mb-4">
                    <Bitcoin className="h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Complete Your Crypto Payment</h3>
                  <p className="text-gray-500 mb-4 text-center">
                    Click the button below to open BTCPay Server and complete your ${amount} payment.
                  </p>
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => window.open(checkoutLink, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Pay with Crypto
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={checkPaymentStatus}
                      disabled={isCheckingStatus}
                    >
                      {isCheckingStatus ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Checking...
                        </>
                      ) : (
                        'Check Status'
                      )}
                    </Button>
                    {(currentPaymentStatus === 'pending' || currentPaymentStatus === 'failed' || (!currentPaymentStatus && paymentId)) && (
                      <Button 
                        variant="destructive" 
                        onClick={handleCancelPayment}
                        disabled={isCancelling}
                      >
                        {isCancelling ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Cancel Payment
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {lastStatusCheck && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800 font-medium">Status: {lastStatusCheck}</p>
                      {autoRefreshEnabled && (
                        <p className="text-xs text-blue-600 mt-1">
                          🔄 Auto-checking every 30 seconds...
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-4">
                    Keep this page open and click "Check Status" after completing payment
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Select Credit Package</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {creditPackages.map((pkg) => (
                        <div 
                          key={pkg.amount}
                          className={`border rounded-md p-4 text-center cursor-pointer transition-colors ${
                            amount === pkg.amount 
                              ? 'border-orange-500 bg-orange-50' 
                              : 'border-gray-200 hover:border-orange-500'
                          }`}
                          onClick={() => setAmount(pkg.amount)}
                        >
                          <div className="font-bold text-lg mb-1">{pkg.amount} credits</div>
                          <div className="text-sm text-gray-500">${pkg.usd}</div>
                          {pkg.bonus > 0 && (
                            <div className="mt-2 text-xs bg-green-100 text-green-800 rounded-full px-2 py-1">
                              +{pkg.bonus} bonus
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <label className="text-sm font-medium" htmlFor="custom-amount">
                        Or enter custom amount (USD)
                      </label>
                      <div className="flex items-center mt-1">
                        <span className="bg-gray-100 px-3 py-2 border border-r-0 rounded-l-md">$</span>
                        <Input
                          id="custom-amount"
                          type="number"
                          min="1"
                          step="1"
                          value={
                            creditPackages.some(pkg => pkg.amount === amount) 
                              ? '' 
                              : amount
                          }
                          onChange={handleCustomAmountChange}
                          placeholder="Custom amount"
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Supported Cryptocurrencies</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-700">
                      <div className="flex items-center gap-1">
                        <Bitcoin className="h-3 w-3" />
                        Bitcoin (BTC)
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                        Ethereum (ETH)
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                        Litecoin (LTC)
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                        And more...
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border rounded-md p-4">
                    <h4 className="font-medium mb-2">How it works:</h4>
                    <ol className="text-sm text-gray-600 space-y-1">
                      <li>1. Select your credit package amount</li>
                      <li>2. Click "Pay with Crypto" to create payment</li>
                      <li>3. Complete payment in BTCPay Server</li>
                      <li>4. Credits are automatically added to your account</li>
                    </ol>
                  </div>
                </div>
              )}
            </CardContent>
            {!success && (
              <CardFooter className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total (USD):</p>
                  <p className="text-xl font-bold">${amount.toFixed(2)}</p>
                </div>
                <Button 
                  onClick={handleCryptoPayment} 
                  disabled={isSubmitting || amount <= 0}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Payment...
                    </>
                  ) : (
                    <>
                      <Bitcoin className="h-4 w-4" />
                      Pay with Crypto
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Credits to purchase:</span>
                  <span>{amount}</span>
                </div>
                
                {creditPackages.find(p => p.amount === amount)?.bonus > 0 && (
                  <div className="flex justify-between mb-2 text-green-600">
                    <span>Bonus credits:</span>
                    <span>+{creditPackages.find(p => p.amount === amount)?.bonus}</span>
                  </div>
                )}
                
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Price per credit:</span>
                  <span>$1.00</span>
                </div>
                
                <hr className="my-2" />
                
                <div className="flex justify-between font-medium">
                  <span>Total price (USD):</span>
                  <span>${amount.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Current balance:</span>
                  <span>{user?.credits.toFixed(2) || 0} credits</span>
                </div>
                
                <div className="flex justify-between mb-2 text-green-600">
                  <span>Credits to add:</span>
                  <span>
                    +{amount}
                    {creditPackages.find(p => p.amount === amount)?.bonus > 0 && (
                      <span className="text-xs ml-1">
                        (+{creditPackages.find(p => p.amount === amount)?.bonus} bonus)
                      </span>
                    )}
                  </span>
                </div>
                
                <hr className="my-2" />
                
                <div className="flex justify-between font-medium">
                  <span>New balance:</span>
                  <span>
                    {user ? (
                      user.credits + amount + (creditPackages.find(p => p.amount === amount)?.bonus || 0)
                    ).toFixed(2) : '0'} credits
                  </span>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <h4 className="font-medium mb-2">Credits Usage</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>One-time orders: from 0.008 credits per upvote</li>
                  <li>Bulk orders get better rates</li>
                  <li>Credits never expire</li>
                  <li>Larger packages include bonus credits</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Why Crypto?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Cryptocurrency payments offer enhanced privacy, lower fees, and faster processing times.
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <Bitcoin className="h-8 w-8 text-orange-500 mx-auto mb-1" />
                  <div className="text-xs text-gray-500">Bitcoin</div>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 bg-blue-500 rounded-full mx-auto mb-1"></div>
                  <div className="text-xs text-gray-500">Ethereum</div>
                </div>
                <div className="text-center">
                  <div className="h-8 w-8 bg-green-500 rounded-full mx-auto mb-1"></div>
                  <div className="text-xs text-gray-500">Litecoin</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TopUpAccount;