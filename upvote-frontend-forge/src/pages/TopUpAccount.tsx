
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useAuth } from '../context/AuthContext'; // Changed from useApp
import { toast } from "@/components/ui/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query'; // Added imports
import { api } from '@/services/api'; // Import api service
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

interface TopUpPayload {
  amount: number;
  paymentMethod: string;
  paymentDetails: any; // Consider defining a more specific type for paymentDetails
}

// Assuming API response structure
interface TopUpResponse {
  success: boolean;
  transaction: any; // Define specific type if known
  message?: string;
}

const TopUpAccount = () => {
  const { user } = useAuth(); // Changed from useApp
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number>(50); // Initial selected amount
  const [displayAmount, setDisplayAmount] = useState<number>(50); // Amount shown in summary, includes bonus
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  
  // UI state - isSubmitting and success will be from useMutation
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Predefined amounts
  const creditPackages = [
    { amount: 20, label: '20 credits', bonus: 0, price: 20 },
    { amount: 50, label: '50 credits', bonus: 5, price: 50 },
    { amount: 100, label: '100 credits', bonus: 15, price: 100 },
    { amount: 250, label: '250 credits', bonus: 50, price: 250 },
  ];

  const selectedPackage = creditPackages.find(p => p.amount === amount);
  const currentBonus = selectedPackage?.bonus || 0;
  const currentPrice = selectedPackage?.price || amount;


  const {
    mutate: topUpMutation,
    isLoading: isSubmitting,
    // isSuccess: mutationIsSuccess, // Can use this if not managing temporary success message
  } = useMutation<TopUpResponse, Error, TopUpPayload>(
    (payload) => api.user.topUpAccount(payload.amount, payload.paymentMethod, payload.paymentDetails),
    {
      onSuccess: (data) => {
        if (data.success) {
          setShowSuccessMessage(true);
          toast({
            title: "Payment Successful!",
            description: `${displayAmount} credits have been added to your account.`,
          });
          // Reset form
          setCardNumber('');
          setCardName('');
          setCardExpiry('');
          setCardCvc('');

          queryClient.invalidateQueries({ queryKey: ['currentUser'] });
          queryClient.invalidateQueries({ queryKey: ['userActivity'] });

        } else {
          toast({
            title: "Payment Failed",
            description: data.message || "There was an issue processing your payment.",
            variant: "destructive"
          });
        }
      },
      onError: (error) => {
        toast({
          title: "Payment Failed",
          description: error.message || "There was an issue processing your payment.",
          variant: "destructive"
        });
        console.error('Payment failed:', error);
      },
    }
  );

  useEffect(() => {
    // Update display amount (including bonus) when base amount changes
    const pkg = creditPackages.find(p => p.amount === amount);
    setDisplayAmount(amount + (pkg?.bonus || 0));
  }, [amount]);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccessMessage) {
      timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000); // Show success message for 3 seconds
    }
    return () => clearTimeout(timer);
  }, [showSuccessMessage]);


  // Handle custom amount input
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newAmount = !isNaN(value) && value >= 1 ? value : 1; // Min custom amount 1
    setAmount(newAmount);
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
    if (currentPrice <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter or select a valid amount",
        variant: "destructive"
      });
      return;
    }
    
    if (paymentMethod === 'credit_card') {
      // Basic credit card validation
      if (cardNumber.replace(/\s+/g, '').length < 13 || cardNumber.replace(/\s+/g, '').length > 16) { // Common card lengths
        toast({
          title: "Invalid Card Number",
          description: "Please enter a valid card number",
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
      
      if (cardExpiry.length !== 5 || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
        toast({
          title: "Invalid Expiry Date",
          description: "Please enter a valid expiry date (MM/YY)",
          variant: "destructive"
        });
        return;
      }
      
      if (cardCvc.length !== 3 && cardCvc.length !== 4) { // CVC can be 3 or 4 digits
        toast({
          title: "Invalid CVC",
          description: "Please enter a valid 3 or 4-digit CVC",
          variant: "destructive"
        });
        return;
      }
    }
    
    const paymentDetails = paymentMethod === 'credit_card'
      ? {
          cardNumber: cardNumber.replace(/\s+/g, ''),
          cardName,
          cardExpiry,
          cardCvc,
        }
      : {}; // Add details for PayPal, Crypto if needed, or handle in backend

    topUpMutation({
      amount: displayAmount, // Send total amount including bonus
      paymentMethod,
      paymentDetails
    });
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
              {showSuccessMessage ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="bg-green-100 text-green-800 rounded-full p-3 mb-4">
                    <CheckCircle className="h-12 w-12" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Payment Successful!</h3>
                  <p className="text-gray-500 mb-4">
                    {displayAmount} credits have been added to your account.
                  </p>
                  <Button onClick={() => setShowSuccessMessage(false)}>Make another payment</Button>
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
                            amount === pkg.amount // base amount for selection
                              ? 'border-upvote-primary bg-upvote-primary bg-opacity-5' 
                              : 'border-gray-200 hover:border-upvote-primary'
                          }`}
                          onClick={() => setAmount(pkg.amount)} // Set base amount
                        >
                          <div className="font-bold text-lg mb-1">{pkg.amount} credits</div>
                          <div className="text-sm text-gray-500">${pkg.price.toFixed(2)}</div>
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
                          min="1" // Min custom amount
                          step="1"
                          value={
                            // Clear custom input if a package is selected, otherwise show current custom amount
                            selectedPackage ? '' : amount
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
                              maxLength={19} // Max length for display with spaces
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
                              onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} // CVC up to 4 digits
                              placeholder="123"
                              maxLength={4} // Max CVC length
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
            {!showSuccessMessage && ( // Hide footer when success message is shown
              <CardFooter className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total:</p>
                  <p className="text-xl font-bold">${currentPrice.toFixed(2)}</p>
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
                  <span>{amount}</span> {/* Base amount */}
                </div>
                
                {currentBonus > 0 && (
                  <div className="flex justify-between mb-2 text-green-600">
                    <span>Bonus credits:</span>
                    <span>+{currentBonus}</span>
                  </div>
                )}
                
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Price per credit:</span>
                  <span>$1.00</span> {/* Assuming $1 per base credit, adjust if packages change this */}
                </div>
                
                <hr className="my-2" />
                
                <div className="flex justify-between font-medium">
                  <span>Total price:</span>
                  <span>${currentPrice.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Current balance:</span>
                  <span>{user?.credits?.toFixed(2) || '0.00'} credits</span>
                </div>
                
                <div className="flex justify-between mb-2 text-green-600">
                  <span>Credits to add:</span>
                  <span>
                    +{displayAmount} {/* Total credits including bonus */}
                    {currentBonus > 0 && (
                      <span className="text-xs ml-1">
                        ({amount} + {currentBonus} bonus)
                      </span>
                    )}
                  </span>
                </div>
                
                <hr className="my-2" />
                
                <div className="flex justify-between font-medium">
                  <span>New balance:</span>
                  <span>
                    {user ? (
                      user.credits + displayAmount
                    ).toFixed(2) : displayAmount.toFixed(2)} credits
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
