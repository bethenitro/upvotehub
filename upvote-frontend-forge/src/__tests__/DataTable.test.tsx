
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from '@/context/AppContext';
import OrdersHistory from '@/pages/OrdersHistory';

// Mock the API service
jest.mock('@/services/api', () => ({
  api: {
    orders: {
      getOrders: jest.fn(() => Promise.resolve([
        {
          id: "ord_001",
          type: "one-time",
          redditUrl: "https://reddit.com/r/test/comments/123",
          upvotes: 10,
          status: "completed",
          createdAt: "2023-05-16T09:25:00Z",
          completedAt: "2023-05-16T10:15:00Z",
          cost: 9.99
        },
        {
          id: "ord_002",
          type: "one-time",
          redditUrl: "https://reddit.com/r/example/comments/456",
          upvotes: 25,
          status: "in-progress",
          createdAt: "2023-05-16T14:30:00Z",
          completedAt: null,
          cost: 19.99
        },
        {
          id: "ord_003",
          type: "recurring",
          redditUrl: "https://reddit.com/r/sample/comments/789",
          upvotes: 15,
          status: "scheduled",
          createdAt: "2023-05-15T11:45:00Z",
          completedAt: null,
          nextRunAt: "2023-05-17T12:00:00Z",
          frequency: "daily",
          cost: 12.99
        }
      ])),
    },
  }
}));

const renderWithProviders = (component: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </AppProvider>
    </QueryClientProvider>
  );
};

describe('OrdersHistory Component', () => {
  test('renders the data table with orders', async () => {
    renderWithProviders(<OrdersHistory />);
    
    // Check if the table headers are rendered
    expect(await screen.findByText('Order ID')).toBeInTheDocument();
    expect(screen.getByText('Reddit Post')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check if the table data is rendered
    expect(await screen.findByText('ord_001')).toBeInTheDocument();
    expect(screen.getByText('ord_002')).toBeInTheDocument();
    expect(screen.getByText('ord_003')).toBeInTheDocument();
    
    // Check if status badges are rendered correctly
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('in-progress')).toBeInTheDocument();
    expect(screen.getByText('scheduled')).toBeInTheDocument();
  });
  
  test('filters orders by search term', async () => {
    renderWithProviders(<OrdersHistory />);
    
    // Wait for table to load
    await screen.findByText('ord_001');
    
    // Get search input
    const searchInput = screen.getByPlaceholderText(/Search by order ID/);
    
    // Search for a specific order
    fireEvent.change(searchInput, { target: { value: 'sample' } });
    
    // Only the matching order should be visible
    expect(screen.queryByText('ord_001')).not.toBeInTheDocument();
    expect(screen.queryByText('ord_002')).not.toBeInTheDocument();
    expect(screen.getByText('ord_003')).toBeInTheDocument();
    
    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    // Should show "No orders found" message
    expect(screen.getByText(/No orders found/)).toBeInTheDocument();
  });
  
  test('filters orders by status', async () => {
    renderWithProviders(<OrdersHistory />);
    
    // Wait for table to load
    await screen.findByText('ord_001');
    
    // Click on status select
    const statusSelect = screen.getByText('All Statuses');
    fireEvent.click(statusSelect);
    
    // Select "Completed" status
    const completedOption = screen.getByText('Completed');
    fireEvent.click(completedOption);
    
    // Only completed orders should be visible
    expect(screen.getByText('ord_001')).toBeInTheDocument();
    expect(screen.queryByText('ord_002')).not.toBeInTheDocument();
    expect(screen.queryByText('ord_003')).not.toBeInTheDocument();
  });
});
