
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
import { Bitcoin, Loader2, Download, ExternalLink } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
  description: string;
  cardLast4?: string;
  orderId?: string;
}

const PaymentHistory = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
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
      payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.orderId && payment.orderId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Method filter
    const matchesMethod = methodFilter === 'all' || payment.method === methodFilter;
    
    return matchesSearch && matchesMethod;
  });
  
  // Sort filtered payments
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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
  
  // Payment method icon
  const PaymentMethodIcon = ({ method }: { method: string }) => {
    let icon = <Bitcoin className="w-4 h-4 mr-1 text-orange-500" />;
    
    return (
      <div className="flex items-center">
        {icon}
        <span className="capitalize">
          {method === 'crypto' ? 'Cryptocurrency' : method}
        </span>
      </div>
    );
  };
  
  // Handle receipt download
  const handleDownloadReceipt = (paymentId: string) => {
    toast({
      title: "Receipt Downloaded",
      description: `Receipt for payment ${paymentId} has been downloaded.`,
    });
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payment History</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
          <CardDescription>
            View and download receipts for your transactions
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
                        <TableHead className="text-right">Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentPayments.map((payment) => (
                        <TableRow key={payment.id} className="table-row">
                          <TableCell className="font-medium">{payment.id}</TableCell>
                          <TableCell>{formatDate(payment.createdAt)}</TableCell>
                          <TableCell>
                            {payment.orderId ? (
                              <span>
                                {payment.description}
                                <span className="text-xs text-upvote-primary ml-1">
                                  (#{payment.orderId})
                                </span>
                              </span>
                            ) : (
                              payment.description
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payment.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadReceipt(payment.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
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
