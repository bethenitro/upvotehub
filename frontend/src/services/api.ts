
// Backend API base URL
const API_BASE_URL = "http://localhost:8000";

/**
 * Get auth token from localStorage
 */
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('upvotehub_token');
  return token;
};

/**
 * Create headers with auth token
 */
const createHeaders = (): HeadersInit => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * API service with real backend integration
 */
export const api = {
  // Authentication endpoints
  auth: {
    /**
     * Login user
     */
    login: async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store token
      localStorage.setItem('upvotehub_token', data.access_token);
      localStorage.setItem('upvotehub_user', JSON.stringify(data.user));
      
      return data;
    },

    /**
     * Register new user
     */
    signup: async (username: string, email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Signup failed');
      }

      const data = await response.json();
      
      // Store token
      localStorage.setItem('upvotehub_token', data.access_token);
      localStorage.setItem('upvotehub_user', JSON.stringify(data.user));
      
      return data;
    },

    /**
     * Logout user
     */
    logout: async () => {
      const token = getAuthToken();
      if (token) {
        try {
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            headers: createHeaders(),
          });
        } catch (error) {
          console.error('Logout request failed:', error);
        }
      }
      
      // Clear local storage
      localStorage.removeItem('upvotehub_token');
      localStorage.removeItem('upvotehub_user');
    }
  },

  // User related endpoints
  user: {
    /**
     * Get current user information
     */
    getCurrentUser: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
      }
    },
    
    /**
     * Get user account activity
     */
    getAccountActivity: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/activity`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch activity data');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching activity:', error);
        throw error;
      }
    },
    
    /**
     * Add credits to user account
     */
    topUpAccount: async (amount: number, paymentMethod: string, paymentDetails: any) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/user/topup`, {
          method: 'POST',
          headers: createHeaders(),
          body: JSON.stringify({
            amount,
            payment_method: paymentMethod,
            payment_details: paymentDetails
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to process payment');
        }

        return await response.json();
      } catch (error) {
        console.error('Error processing payment:', error);
        throw error;
      }
    }
  },
  
  // Orders related endpoints
  orders: {
    /**
     * Get all orders
     */
    getOrders: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
    },
    
    /**
     * Get orders history (alias for getOrders for backward compatibility)
     */
    getOrdersHistory: async () => {
      return api.orders.getOrders();
    },
    
    /**
     * Create new one-time order
     */
    createOrder: async (orderData: {
      redditUrl: string,
      upvotes: number,
      upvotesPerMinute?: number,
    }) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
          method: 'POST',
          headers: createHeaders(),
          body: JSON.stringify({
            reddit_url: orderData.redditUrl,
            upvotes: orderData.upvotes,
            upvotes_per_minute: orderData.upvotesPerMinute || 1,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to create order');
        }

        return await response.json();
      } catch (error) {
        console.error('Error creating order:', error);
        throw error;
      }
    }
  },
  
  // Payments related endpoints
  payments: {
    /**
     * Get payment history
     */
    getPayments: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch payments');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }
    }
  }
};
