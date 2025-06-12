
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Placeholder for JWT token retrieval
const getToken = (): string | null => {
  // In a real application, this would fetch the token from localStorage, Vuex store, Pinia store, etc.
  return localStorage.getItem('jwtToken');
};

const createHeaders = (isProtected: boolean = false) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isProtected) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Handle cases where token is expected but not found
      console.warn('JWT token not found for protected route.');
    }
  }
  return headers;
};

/**
 * API service with methods for fetching and posting data
 */
export const api = {
  // User related endpoints
  user: {
    /**
     * Get current user information
     */
    getCurrentUser: async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users/me`, { headers: createHeaders(true) }); // Changed path
        return response.data;
      } catch (error) {
        console.error('Error fetching current user:', error);
        throw error; // Re-throw to allow components to handle it
      }
    },
    
    /**
     * Get user account activity
     */
    getAccountActivity: async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users/activity`, { headers: createHeaders(true) }); // Changed path
        return response.data;
      } catch (error) {
        console.error('Error fetching account activity:', error);
        throw error;
      }
    },
    
    /**
     * Add credits to user account
     */
    topUpAccount: async (amount: number, paymentMethod: string, paymentDetails: any) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/payments/top-up`, { // Changed URL
          amount,
          paymentMethod,
          paymentDetails,
        }, { headers: createHeaders(true) });
        return response.data;
      } catch (error) {
        console.error('Error topping up account:', error);
        throw error;
      }
    },

    /**
     * Log in a user
     */
    login: async (credentials: { email: string; password: string }) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/users/login`, credentials, { headers: createHeaders(false) });
        return response.data;
      } catch (error) {
        console.error('Error logging in:', error);
        throw error;
      }
    },

    /**
     * Sign up a new user
     */
    signup: async (userData: { username: string; email: string; password: string }) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/users/signup`, userData, { headers: createHeaders(false) });
        return response.data;
      } catch (error) {
        console.error('Error signing up:', error);
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
        const response = await axios.get(`${API_BASE_URL}/orders`, { headers: createHeaders(true) });
        return response.data;
      } catch (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
    },
    
    /**
     * Get orders history (alias for getOrders for backward compatibility)
     */
    getOrdersHistory: async () => {
      // This can reuse getOrders or have a dedicated endpoint if backend semantics differ
      return api.orders.getOrders();
    },
    
    /**
     * Get auto orders
     */
    getAutoOrders: async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/orders/auto`, { headers: createHeaders(true) });
        return response.data;
      } catch (error) {
        console.error('Error fetching auto orders:', error);
        throw error;
      }
    },
    
    /**
     * Create new one-time order
     */
    createOrder: async (orderData: {
      redditUrl: string,
      upvotes: number,
    }) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/orders`, orderData, { headers: createHeaders(true) }); // Changed path
        return response.data;
      } catch (error) {
        console.error('Error creating order:', error);
        throw error;
      }
    },
    
    /**
     * Create new auto order
     */
    createAutoOrder: async (orderData: {
      redditUrl: string,
      upvotes: number,
      frequency: "daily" | "weekly" | "monthly"
    }) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/orders/auto`, orderData, { headers: createHeaders(true) }); // Changed path
        return response.data;
      } catch (error) {
        console.error('Error creating auto order:', error);
        throw error;
      }
    },
    
    /**
     * Cancel an auto order
     */
    cancelAutoOrder: async (orderId: string) => {
      try {
        // Changed URL to include orderId in path, and sending empty object as body for POST
        const response = await axios.post(`${API_BASE_URL}/orders/auto/${orderId}/cancel`, {}, { headers: createHeaders(true) });
        return response.data;
      } catch (error) {
        console.error('Error cancelling auto order:', error);
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
        const response = await axios.get(`${API_BASE_URL}/payments`, { headers: createHeaders(true) });
        return response.data;
      } catch (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }
    }
  }
};
