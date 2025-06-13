
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider } from '@/context/AppContext';
import NewOrder from '@/pages/NewOrder';

// Mock the API service
jest.mock('@/services/api', () => ({
  api: {
    orders: {
      createOrder: jest.fn(() => Promise.resolve({ success: true })),
    },
    user: {
      getCurrentUser: jest.fn(() => Promise.resolve({
        id: "user_123",
        username: "testuser",
        email: "test@example.com",
        credits: 100,
        joinedDate: "2023-01-01T00:00:00Z",
        profileImage: "https://example.com/avatar.png",
        stats: {
          totalOrders: 10,
          activeOrders: 2,
          completedOrders: 8,
        }
      })),
    }
  }
}));

// Mock the toast function
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
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

describe('NewOrder Component', () => {
  test('renders the order form', async () => {
    renderWithProviders(<NewOrder />);
    
    // Check if the form renders
    expect(await screen.findByText('Place a One-Time Order')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/https:\/\/reddit.com/)).toBeInTheDocument();
    
    // Check if cost calculation works
    const costDisplay = screen.getByText('16.00 credits');
    expect(costDisplay).toBeInTheDocument();
  });
  
  test('validates Reddit URL', async () => {
    const { api } = require('@/services/api');
    const { toast } = require('@/components/ui/use-toast');
    
    renderWithProviders(<NewOrder />);
    
    // Get form elements
    const urlInput = await screen.findByPlaceholderText(/https:\/\/reddit.com/);
    const submitButton = screen.getByText('Place Order');
    
    // Try to submit with empty URL
    fireEvent.change(urlInput, { target: { value: '' } });
    fireEvent.click(submitButton);
    
    // Check if validation toast was shown
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Invalid URL',
        variant: 'destructive'
      })
    );
    
    // API should not be called
    expect(api.orders.createOrder).not.toHaveBeenCalled();
    
    // Now enter a valid URL
    fireEvent.change(urlInput, { target: { value: 'https://reddit.com/r/test/comments/123' } });
    fireEvent.click(submitButton);
    
    // API should be called
    expect(api.orders.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        redditUrl: 'https://reddit.com/r/test/comments/123',
      })
    );
  });
});
