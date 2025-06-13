
import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Loader2, CheckCircle } from 'lucide-react';

const TopUpAccount = () => {
  const { user, topUpAccount, refreshUser } = useApp();
  
  // Form state
  const [amount, setAmount] = useState<number>(50);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Predefined amounts
  const creditPackages = [
    { amount: 20, label: '20 credits', bonus: 0 },
    { amount: 50, label: '50 credits', bonus: 5 },
    { amount: 100, label: '100 credits', bonus: 15 },
    { amount: 250, label: '250 credits', bonus: 50 },
  ];
  
  // Handle custom amount input
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setAmount(value);
    }
  };
  
  // Format card number with spaces
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };
  
  // Format card expiry
  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    
    if (v.length >= 3) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    
    return value;
  };
  
  // Handle payment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }
    
    if (paymentMethod === 'credit_card') {
      // Basic credit card validation
      if (cardNumber.replace(/\s+/g, '').length !== 16) {
        toast({
          title: "Invalid Card Number",
          description: "Please enter a valid 16-digit card number",
          variant: "destructive"
        });
        return;
      }
      
      if (cardName.trim() === '') {
        toast({
          title: "Invalid Card Name",
          description: "Please enter the cardholder's name",
          variant: "destructive"
        });
        return;
      }
      
      if (cardExpiry.length !== 5) {
        toast({
          title: "Invalid Expiry Date",
          description: "Please enter a valid expiry date (MM/YY)",
          variant: "destructive"
        });
        return;
      }
      
      if (cardCvc.length !== 3) {
        toast({
          title: "Invalid CVC",
          description: "Please enter a valid 3-digit CVC",
          variant: "destructive"
        });
        return;
      }
    }
    
    try {
      setIsSubmitting(true);
      
      // Calculate bonus credits if applicable
      let totalAmount = amount;
      const package_ = creditPackages.find(p => p.amount === amount);
      if (package_) {
        totalAmount += package_.bonus;
      }
      
      // Create payment details object based on method
      const paymentDetails = paymentMethod === 'credit_card' 
        ? {
            cardNumber: cardNumber.replace(/\s+/g, ''),
            cardName,
            cardExpiry,
            cardCvc,
          } 
        : {};
      
      const success = await topUpAccount(totalAmount, paymentMethod, paymentDetails);
      
      if (success) {
        setSuccess(true);
        // Reset form
        setCardNumber('');
        setCardName('');
        setCardExpiry('');
        setCardCvc('');
        
        // Update user data
        await refreshUser();
        
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "There was an issue processing your payment.",
        variant: "destructive"
      });
      console.error('Payment failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Top Up Account</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Add Credits</CardTitle>
              <CardDescription>
                Purchase credits to place orders for Reddit upvotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {success ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="bg-green-100 text-green-800 rounded-full p-3 mb-4">
                    <CheckCircle className="h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
                  <p className="text-gray-500 mb-4">
                    {amount} credits have been added to your account.
                  </p>
                  <Button onClick={() => setSuccess(false)}>Make another payment</Button>
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
                              ? 'border-upvote-primary bg-upvote-primary bg-opacity-5' 
                              : 'border-gray-200 hover:border-upvote-primary'
                          }`}
                          onClick={() => setAmount(pkg.amount)}
                        >
                          <div className="font-bold text-lg mb-1">{pkg.amount} credits</div>
                          <div className="text-sm text-gray-500">${pkg.amount.toFixed(2)}</div>
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
                        Or enter custom amount
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
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Payment Method</h3>
                    
                    <Tabs defaultValue="credit_card" onValueChange={setPaymentMethod}>
                      <TabsList className="grid grid-cols-3 mb-4">
                        <TabsTrigger value="credit_card">Credit Card</TabsTrigger>
                        <TabsTrigger value="paypal">PayPal</TabsTrigger>
                        <TabsTrigger value="crypto">Crypto</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="credit_card" className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="card-number">Card Number</Label>
                          <div className="relative">
                            <Input
                              id="card-number"
                              value={cardNumber}
                              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                              placeholder="0000 0000 0000 0000"
                              maxLength={19}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              <CreditCard className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="card-name">Cardholder Name</Label>
                          <Input
                            id="card-name"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            placeholder="John Doe"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="card-expiry">Expiry Date</Label>
                            <Input
                              id="card-expiry"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                              placeholder="MM/YY"
                              maxLength={5}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="card-cvc">CVC</Label>
                            <Input
                              id="card-cvc"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                              placeholder="123"
                              maxLength={3}
                              type="password"
                            />
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="paypal">
                        <div className="p-6 text-center border rounded-md bg-gray-50">
                          <p className="mb-4">You will be redirected to PayPal to complete your payment after clicking the button below.</p>
                          <img 
                            src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" 
                            alt="PayPal" 
                            className="mx-auto mb-4"
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="crypto">
                        <div className="p-6 text-center border rounded-md bg-gray-50">
                          <p className="mb-4">You will be redirected to our crypto payment processor after clicking the button below.</p>
                          <p className="text-sm text-gray-500">We accept Bitcoin, Ethereum, and other major cryptocurrencies</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}
            </CardContent>
            {!success && (
              <CardFooter className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total:</p>
                  <p className="text-xl font-bold">${amount.toFixed(2)}</p>
                </div>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    'Complete Payment'
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
                  <span>Total price:</span>
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
                  <li>One-time orders: from 0.8 credits per upvote</li>
                  <li>Auto orders: from 0.7 credits per upvote</li>
                  <li>Credits never expire</li>
                  <li>Larger packages include bonus credits</li>
                </ul>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Secure Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                All transactions are secure and encrypted. We never store your full payment details on our servers.
              </p>
              <div className="flex items-center justify-center gap-2">
                <img src="https://cdn.pixabay.com/photo/2021/12/06/13/48/visa-6850402_640.png" alt="Visa" width="40" />
                <img src="https://cdn.pixabay.com/photo/2021/12/06/13/48/mastercard-6850401_640.png" alt="MasterCard" width="40" />
                <img src="https://cdn.pixabay.com/photo/2015/05/26/09/37/paypal-784404_640.png" alt="PayPal" width="40" />
                <img src="https://cdn.pixabay.com/photo/2021/05/27/12/30/btc-6288327_640.png" alt="Bitcoin" width="40" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TopUpAccount;
