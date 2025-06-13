
import { orders, autoOrders } from "@/mocks/ordersMock"; // currentUser removed
import { payments } from "@/mocks/paymentsMock"; // accountActivity related to user, but not auth for now

// Define Backend URL
const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Simulates API request delay - will be removed for signup/login, kept for others for now
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * API service with stubbed methods for fetching and posting data
 */
export const api = {
  // User related endpoints
  user: {
    /**
     * Get current user information - Commented out as per subtask
     */
    /*
    getCurrentUser: async () => {
      await delay(500);
      // This would typically fetch user data if a token is stored
      // For now, login/signup will provide user data directly to AuthContext
      return { ...currentUser };
    },
    */

    signupUser: async (userData: { username: string, email: string, password: string }) => {
      const response = await fetch(`${API_BASE_URL}/user/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Signup failed, unable to parse error response' }));
        console.error('Signup failed:', errorData);
        throw new Error(errorData.detail || 'Signup failed');
      }
      return response.json();
    },

    loginUser: async (credentials: { email: string, password: string }) => {
      const response = await fetch(`${API_BASE_URL}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed, unable to parse error response' }));
        console.error('Login failed:', errorData);
        throw new Error(errorData.detail || 'Login failed');
      }
      return response.json();
    },
    
    /**
     * Get user account activity
     */
    getAccountActivity: async () => {
      await delay(800);
      return [...accountActivity];
    },
    
    /**
     * Add credits to user account
     */
    topUpAccount: async (amount: number, paymentMethod: string, paymentDetails: any) => {
      await delay(1000);
      return {
        success: true,
        transaction: {
          id: `pay_${Math.floor(Math.random() * 1000)}`,
          amount,
          method: paymentMethod,
          status: "completed",
          createdAt: new Date().toISOString(),
          description: "Account top-up"
        }
      };
    }
  },
  
  // Orders related endpoints
  orders: {
    /**
     * Get all orders
     */
    getOrders: async () => {
      await delay(700);
      return [...orders];
    },
    
    /**
     * Get orders history (alias for getOrders for backward compatibility)
     */
    getOrdersHistory: async () => {
      return api.orders.getOrders();
    },
    
    /**
     * Get auto orders
     */
    getAutoOrders: async () => {
      await delay(600);
      return [...autoOrders];
    },
    
    /**
     * Create new one-time order
     */
    createOrder: async (orderData: {
      redditUrl: string,
      upvotes: number,
    }) => {
      await delay(1200);
      const newOrder = {
        id: `ord_${Math.floor(Math.random() * 1000)}`,
        type: "one-time",
        status: "in-progress",
        createdAt: new Date().toISOString(),
        completedAt: null,
        cost: orderData.upvotes * 0.8,
        ...orderData
      };
      
      return {
        success: true,
        order: newOrder
      };
    },
    
    /**
     * Create new auto order
     */
    createAutoOrder: async (orderData: {
      redditUrl: string,
      upvotes: number,
      frequency: "daily" | "weekly" | "monthly"
    }) => {
      await delay(1200);
      
      const costMap = {
        "daily": 0.7,
        "weekly": 0.75,
        "monthly": 0.8
      };
      
      const newAutoOrder = {
        id: `auto_${Math.floor(Math.random() * 1000)}`,
        status: "active",
        createdAt: new Date().toISOString(),
        nextRunAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        costPerRun: orderData.upvotes * costMap[orderData.frequency],
        ...orderData
      };
      
      return {
        success: true,
        order: newAutoOrder
      };
    },
    
    /**
     * Cancel an auto order
     */
    cancelAutoOrder: async (orderId: string) => {
      await delay(800);
      return {
        success: true,
        message: `Auto order ${orderId} has been cancelled.`
      };
    }
  },
  
  // Payments related endpoints
  payments: {
    /**
     * Get payment history
     */
    getPayments: async () => {
      await delay(900);
      return [...payments];
    }
  }
};
