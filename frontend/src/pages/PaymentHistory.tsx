
import React, { useState, useEffect } from 'react';
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bitcoin, Loader2, Eye, CreditCard, DollarSign, Clock } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  completed_at?: string;
  description?: string;
  cardLast4?: string;
  order_id?: string;
  user_id: string;
  refund_amount?: number;
  refund_reason?: string;
  error_message?: string;
  payment_details: {
    [key: string]: any;
  };
}

const PaymentHistory = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Pagination (simplified for this implementation)
  const [currentPage, setCurrentPage] = useState(1);
  const paymentsPerPage = 10;
  
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const data = await api.payments.getPayments();
        setPayments(data);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
        toast({
          title: "Error",
          description: "Failed to load payment history.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPayments();
  }, []);
  
  // Filter and sort payments
  const filteredPayments = payments.filter(payment => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      payment.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.description && payment.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.order_id && payment.order_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Method filter
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    
    return matchesSearch && matchesMethod;
  });
  
  // Sort filtered payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'highest-amount':
        return b.amount - a.amount;
      case 'lowest-amount':
        return a.amount - b.amount;
      default:
        return 0;
    }
  });
  
  // Get current payments
  const indexOfLastPayment = currentPage * paymentsPerPage;
  const indexOfFirstPayment = indexOfLastPayment - paymentsPerPage;
  const currentPayments = sortedPayments.slice(indexOfFirstPayment, indexOfLastPayment);
  const totalPages = Math.ceil(sortedPayments.length / paymentsPerPage);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Format payment method display name
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'crypto':
        return 'Cryptocurrency';
      case 'credit_card':
        return 'Credit Card';
      case 'paypal':
        return 'PayPal';
      case 'credits':
        return 'Credits';
      default:
        return method;
    }
  };

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      case 'refunded':
        return 'outline';
      default:
        return 'secondary';
    }
  };
  
  // Payment method icon
  const PaymentMethodIcon = ({ method }: { method: string }) => {
    let icon;
    
    switch (method) {
      case 'crypto':
        icon = <Bitcoin className="w-4 h-4 mr-1 text-orange-500" />;
        break;
      case 'credit_card':
        icon = <CreditCard className="w-4 h-4 mr-1 text-blue-500" />;
        break;
      case 'credits':
        icon = <DollarSign className="w-4 h-4 mr-1 text-green-500" />;
        break;
      default:
        icon = <DollarSign className="w-4 h-4 mr-1 text-gray-500" />;
    }
    
    return (
      <div className="flex items-center">
        {icon}
        <span>{formatPaymentMethod(method)}</span>
      </div>
    );
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payment History</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>
            View detailed information about your transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-2">
                <Input
                  placeholder="Search by payment ID or description"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                Showing {Math.min(filteredPayments.length, indexOfFirstPayment + 1)}-{Math.min(indexOfLastPayment, filteredPayments.length)} of {filteredPayments.length} payments
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest-amount">Highest Amount</SelectItem>
                  <SelectItem value="lowest-amount">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-upvote-primary" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No payments found matching your filters.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPayments.map((payment) => (
                        <TableRow key={payment.id} className="table-row">
                          <TableCell className="font-medium">{payment.id}</TableCell>
                          <TableCell>{formatDate(payment.created_at)}</TableCell>
                          <TableCell>
                            {payment.order_id ? (
                              <span>
                                {payment.description || 'Payment'}
                                <span className="text-xs text-upvote-primary ml-1">
                                  (#{payment.order_id})
                                </span>
                              </span>
                            ) : (
                              payment.description || 'Payment'
                            )}
                          </TableCell>
                          <TableCell>
                            <PaymentMethodIcon method={payment.method} />
                            {payment.cardLast4 && (
                              <span className="text-xs text-gray-500 ml-1">
                                ending in {payment.cardLast4}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">${payment.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(payment.status)}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedPayment(payment)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Payment Details</DialogTitle>
                                  <DialogDescription>
                                    Complete information for payment {payment.id}
                                  </DialogDescription>
                                </DialogHeader>
                                
                                <div className="space-y-6">
                                  {/* Basic Payment Info */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Payment Information</h4>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Payment ID:</span>
                                          <span className="font-mono text-sm">{payment.id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Amount:</span>
                                          <span className="font-semibold">${payment.amount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Status:</span>
                                          <Badge variant={getStatusBadgeVariant(payment.status)}>
                                            {payment.status}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="font-medium">Method:</span>
                                          <span>{formatPaymentMethod(payment.method)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <h4 className="font-semibold mb-2">Timestamps</h4>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Created:</span>
                                          <span className="text-sm">{formatDate(payment.created_at)}</span>
                                        </div>
                                        {payment.completed_at && (
                                          <div className="flex justify-between">
                                            <span className="font-medium">Completed:</span>
                                            <span className="text-sm">{formatDate(payment.completed_at)}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Order Information */}
                                  {payment.order_id && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Order Information</h4>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Order ID:</span>
                                          <span className="font-mono text-sm">{payment.order_id}</span>
                                        </div>
                                        {payment.description && (
                                          <div className="flex justify-between">
                                            <span className="font-medium">Description:</span>
                                            <span>{payment.description}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Refund Information */}
                                  {payment.refund_amount && (
                                    <div>
                                      <h4 className="font-semibold mb-2 text-orange-600">Refund Information</h4>
                                      <div className="space-y-2">
                                        <div className="flex justify-between">
                                          <span className="font-medium">Refund Amount:</span>
                                          <span className="font-semibold text-orange-600">
                                            ${payment.refund_amount.toFixed(2)}
                                          </span>
                                        </div>
                                        {payment.refund_reason && (
                                          <div className="flex justify-between">
                                            <span className="font-medium">Reason:</span>
                                            <span>{payment.refund_reason}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Error Information */}
                                  {payment.error_message && (
                                    <div>
                                      <h4 className="font-semibold mb-2 text-red-600">Error Information</h4>
                                      <div className="bg-red-50 p-3 rounded-md">
                                        <p className="text-sm text-red-700">{payment.error_message}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center space-x-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {[...Array(totalPages)].map((_, i) => (
                        <Button
                          key={i}
                          variant={currentPage === i + 1 ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;
