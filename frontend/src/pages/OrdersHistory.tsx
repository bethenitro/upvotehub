
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import {
  Card,
  CardContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MoreVertical, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle,
  X,
  Copy,
  ExternalLink,
  Calendar,
  DollarSign,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

// Define the Order type (matching backend response)
interface Order {
  id: string;
  type: string;
  reddit_url: string; // Backend uses snake_case
  upvotes: number;
  upvotes_per_minute?: number;
  status: string;
  created_at: string;
  completed_at?: string;
  started_at?: string;
  cancelled_at?: string;
  paused_at?: string;
  cost: number;
  upvotes_processed?: number;
  progress_percentage?: number;
  error_message?: string;
  payment_id?: string;
  card_last4?: string;
}

type SortOption = 'newest' | 'oldest' | 'highest-cost' | 'lowest-cost';
type FilterOption = 'all' | 'completed' | 'active' | 'pending' | 'failed' | 'cancelled';

const OrdersHistory = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: api.orders.getOrders,
  });

  useEffect(() => {
    if (ordersData) {
      // Cast the data to Order[] to ensure type compatibility
      setOrders(ordersData as Order[]);
    }
  }, [ordersData]);

  // Filter orders based on search query and status filter
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter((order) => {
      // Enhanced search filter - search across multiple fields
      const searchTerm = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (order.reddit_url?.toLowerCase() || '').includes(searchTerm) ||
        (order.id?.toLowerCase() || '').includes(searchTerm) ||
        (order.status?.toLowerCase() || '').includes(searchTerm) ||
        (order.type?.toLowerCase() || '').includes(searchTerm) ||
        order.upvotes.toString().includes(searchTerm) ||
        order.cost.toString().includes(searchTerm);

      // Status filter
      const matchesFilter = filterBy === 'all' || 
        order.status?.toLowerCase() === filterBy ||
        (filterBy === 'active' && ['processing', 'in-progress'].includes(order.status?.toLowerCase()));

      return matchesSearch && matchesFilter;
    });

    // Sort the filtered orders
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'highest-cost':
          return b.cost - a.cost;
        case 'lowest-cost':
          return a.cost - b.cost;
        default:
          return 0;
      }
    });

    return sorted;
  }, [orders, searchQuery, filterBy, sortBy]);

  // Handle view details
  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  // Handle reorder - navigate to new order page with pre-filled data
  const handleReorder = (order: Order) => {
    navigate('/order/new', {
      state: {
        reorderData: {
          redditUrl: order.reddit_url,
          upvotes: order.upvotes,
          upvotesPerMinute: order.upvotes_per_minute || 1
        }
      }
    });
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Successfully copied to clipboard
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'active':
      case 'processing':
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" /> Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-muted-foreground border-muted-foreground"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  // Format completion date with status context
  const formatCompletionDate = (order: Order) => {
    if (order.completed_at) {
      return format(new Date(order.completed_at), 'MMM d, yyyy h:mm a');
    }
    
    switch (order.status?.toLowerCase()) {
      case 'pending':
        return <span className="text-muted-foreground italic">Not started</span>;
      case 'in-progress':
      case 'processing':
        const progress = order.progress_percentage || 0;
        const processed = order.upvotes_processed || 0;
        const total = order.upvotes || 0;
        return (
          <div className="flex flex-col">
            <span className="text-blue-600 italic">In progress</span>
            <span className="text-xs text-muted-foreground">
              {processed}/{total} ({progress.toFixed(1)}%)
            </span>
          </div>
        );
      case 'failed':
        return <span className="text-red-500 italic">Failed</span>;
      case 'cancelled':
        return <span className="text-muted-foreground italic">Cancelled</span>;
      default:
        return <span className="text-muted-foreground italic">Pending</span>;
    }
  };

  // Order Details Modal Component
  const OrderDetailsModal = ({ order }: { order: Order | null }) => {
    if (!order) return null;

    return (
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Order Details
              <StatusBadge status={order.status} />
            </DialogTitle>
            <DialogDescription>
              Complete information for order {order.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Order ID</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 px-2 py-1 bg-muted rounded text-sm font-mono">
                      {order.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(order.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Order Type</label>
                  <p className="mt-1 capitalize font-medium">{order.type}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Target Upvotes</label>
                  <p className="mt-1 font-medium">{order.upvotes.toLocaleString()}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Delivery Rate</label>
                  <p className="mt-1 font-medium">{order.upvotes_per_minute || 1} upvotes/min</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cost</label>
                  <p className="mt-1 font-medium flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {order.cost.toFixed(2)} credits
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Progress</label>
                  <div className="mt-1">
                    {order.upvotes_processed !== undefined ? (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {order.upvotes_processed}/{order.upvotes} upvotes
                        </p>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-upvote-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${((order.upvotes_processed / order.upvotes) * 100)}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {((order.upvotes_processed / order.upvotes) * 100).toFixed(1)}% complete
                        </p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Not started</p>
                    )}
                  </div>
                </div>

                {order.payment_id && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Payment ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 px-2 py-1 bg-muted rounded text-sm font-mono text-xs">
                        {order.payment_id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(order.payment_id!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reddit URL */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Reddit URL</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 px-3 py-2 bg-muted rounded text-sm break-all">
                  {order.reddit_url}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(order.reddit_url)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a
                    href={order.reddit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-3 block">Timeline</label>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                </div>

                {order.started_at && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Started</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.started_at)}</p>
                    </div>
                  </div>
                )}

                {order.completed_at && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.completed_at)}</p>
                    </div>
                  </div>
                )}

                {order.cancelled_at && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">Cancelled</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.cancelled_at)}</p>
                    </div>
                  </div>
                )}

                {order.paused_at && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium">Paused</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.paused_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {order.error_message && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Error Message</label>
                <div className="mt-1 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-700 dark:text-red-300">{order.error_message}</p>
                </div>
              </div>
            )}

            {/* Payment Information */}
            {order.card_last4 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                <p className="mt-1 text-sm">Card ending in {order.card_last4}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                handleReorder(order);
                setIsDetailsModalOpen(false);
              }}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reorder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Orders History</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input 
              placeholder="Search orders, URLs, status, or cost..." 
              className="pl-9 pr-8 w-full" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Filter className="h-4 w-4" />
                {filterBy !== 'all' && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-upvote-primary rounded-full" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setFilterBy('all')}
                className={filterBy === 'all' ? 'bg-accent' : ''}
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterBy('completed')}
                className={filterBy === 'completed' ? 'bg-accent' : ''}
              >
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterBy('active')}
                className={filterBy === 'active' ? 'bg-accent' : ''}
              >
                Active
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterBy('pending')}
                className={filterBy === 'pending' ? 'bg-accent' : ''}
              >
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterBy('failed')}
                className={filterBy === 'failed' ? 'bg-accent' : ''}
              >
                Failed
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setFilterBy('cancelled')}
                className={filterBy === 'cancelled' ? 'bg-accent' : ''}
              >
                Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem 
                onClick={() => setSortBy('newest')}
                className={sortBy === 'newest' ? 'bg-accent' : ''}
              >
                Newest first
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortBy('oldest')}
                className={sortBy === 'oldest' ? 'bg-accent' : ''}
              >
                Oldest first
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortBy('highest-cost')}
                className={sortBy === 'highest-cost' ? 'bg-accent' : ''}
              >
                Highest cost
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortBy('lowest-cost')}
                className={sortBy === 'lowest-cost' ? 'bg-accent' : ''}
              >
                Lowest cost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {(searchQuery || filterBy !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterBy('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle>All Orders</CardTitle>
            <div className="text-sm text-muted-foreground">
              Showing {filteredAndSortedOrders.length} of {orders.length} orders
              {(searchQuery || filterBy !== 'all') && (
                <span className="ml-2">
                  {searchQuery && `• Search: "${searchQuery}"`}
                  {filterBy !== 'all' && `• Filter: ${filterBy.charAt(0).toUpperCase() + filterBy.slice(1)}`}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">
              <div className="w-10 h-10 border-4 border-upvote-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-500">
              <AlertCircle className="mx-auto mb-2 h-10 w-10" />
              <p>Failed to load orders</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reddit URL</TableHead>
                    <TableHead>Upvotes</TableHead>
                    <TableHead>Delivery Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Progress/Completed</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedOrders.map((order) => (
                      <TableRow key={order.id} className="table-row">
                        <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}</TableCell>
                        <TableCell className="capitalize">{order.type}</TableCell>
                        <TableCell className="max-w-[180px] truncate">
                          <a 
                            href={order.reddit_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-upvote-primary"
                          >
                            {order.reddit_url}
                          </a>
                        </TableCell>
                        <TableCell>{order.upvotes}</TableCell>
                        <TableCell>{order.upvotes_per_minute || 1}/min</TableCell>
                        <TableCell><StatusBadge status={order.status} /></TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                        <TableCell>{formatCompletionDate(order)}</TableCell>
                        <TableCell>{order.cost.toFixed(2)} credits</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(order)}>
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReorder(order)}>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reorder
                              </DropdownMenuItem>
                              <DropdownMenuItem>Get Support</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <OrderDetailsModal order={selectedOrder} />
    </div>
  );
};

export default OrdersHistory;
