// Backend API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Get auth token from localStorage
 */
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('upvotezone_token');
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
      localStorage.setItem('upvotezone_token', data.access_token);
      localStorage.setItem('upvotezone_user', JSON.stringify(data.user));
      
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
      localStorage.setItem('upvotezone_token', data.access_token);
      localStorage.setItem('upvotezone_user', JSON.stringify(data.user));
      
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
      localStorage.removeItem('upvotezone_token');
      localStorage.removeItem('upvotezone_user');
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
     * Get user statistics
     */
    getUserStats: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/stats`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user stats');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching user stats:', error);
        throw error;
      }
    },
    
    /**
     * Get user account activity
     */
    getAccountActivity: async (startDate?: string, endDate?: string) => {
      try {
        // Default to last 30 days if no dates provided
        const defaultEndDate = endDate || new Date().toISOString();
        const defaultStartDate = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const params = new URLSearchParams({
          start_date: defaultStartDate,
          end_date: defaultEndDate,
        });
        
        const response = await fetch(`${API_BASE_URL}/api/users/activity?${params}`, {
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
     * Get current system limits for order validation
     */
    getLimits: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/limits`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch order limits');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching order limits:', error);
        // Return default limits on error
        return {
          min_upvotes: 1,
          max_upvotes: 1000,
          min_upvotes_per_minute: 1,
          max_upvotes_per_minute: 60
        };
      }
    },

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

        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        console.error('Error creating order:', error);
        throw error;
      }
    },

    /**
     * Get order status and progress
     */
    getOrderStatus: async (orderId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch order status');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching order status:', error);
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
    },

    /**
     * Create crypto payment
     */
    createCryptoPayment: async (amount: number, paymentDetails: any) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments`, {
          method: 'POST',
          headers: createHeaders(),
          body: JSON.stringify({
            amount,
            method: 'crypto',
            payment_details: paymentDetails
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create crypto payment');
        }

        const payment = await response.json();
        return {
          success: true,
          payment_id: payment.id,
          checkout_link: payment.payment_details?.cryptomus_payment_url,
          payment
        };
      } catch (error) {
        console.error('Error creating crypto payment:', error);
        throw error;
      }
    },

    /**
     * Get payment status
     */
    getPaymentStatus: async (paymentId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/status`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch payment status');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching payment status:', error);
        throw error;
      }
    },

    /**
     * Get supported crypto methods
     */
    getSupportedCryptoMethods: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/crypto/supported-methods`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch supported crypto methods');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching supported crypto methods:', error);
        return { supported_methods: [] };
      }
    },

    /**
     * Cancel a payment
     */
    cancelPayment: async (paymentId: string) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/${paymentId}/cancel`, {
          method: 'POST',
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to cancel payment');
        }

        return await response.json();
      } catch (error) {
        console.error('Error canceling payment:', error);
        throw error;
      }
    }
  },

  // Admin related endpoints
  admin: {
    /**
     * Get admin statistics
     */
    getStats: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch admin stats');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        throw error;
      }
    },

    /**
     * Get user management data
     */
    getUsers: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users data');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching users data:', error);
        throw error;
      }
    },

    /**
     * Upload bot configuration file
     */
    uploadBotConfig: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('config_file', file);

        const response = await fetch(`${API_BASE_URL}/api/admin/bot-config/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to upload bot config');
        }

        return await response.json();
      } catch (error) {
        console.error('Error uploading bot config:', error);
        throw error;
      }
    },

    /**
     * Get current bot configuration
     */
    getBotConfig: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/bot-config`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bot config');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching bot config:', error);
        throw error;
      }
    },

    /**
     * Update bot configuration
     */
    updateBotConfig: async (configData: any) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/bot-config`, {
          method: 'POST',
          headers: createHeaders(),
          body: JSON.stringify(configData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to update bot config');
        }

        return await response.json();
      } catch (error) {
        console.error('Error updating bot config:', error);
        throw error;
      }
    },

    /**
     * Get proxy configurations
     */
    getProxies: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/proxies`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch proxy configurations');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching proxy configurations:', error);
        throw error;
      }
    },

    /**
     * Add a new proxy configuration
     */
    addProxy: async (proxyData: {
      server: string;
      username: string;
      password: string;
      rotation_url: string;
    }) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/proxies`, {
          method: 'POST',
          headers: createHeaders(),
          body: JSON.stringify(proxyData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to add proxy');
        }

        return await response.json();
      } catch (error) {
        console.error('Error adding proxy:', error);
        throw error;
      }
    },

    /**
     * Update all proxy configurations
     */
    updateProxies: async (proxies: Array<{
      server: string;
      username: string;
      password: string;
      rotation_url: string;
    }>) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/proxies`, {
          method: 'PUT',
          headers: createHeaders(),
          body: JSON.stringify({ proxies }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to update proxies');
        }

        return await response.json();
      } catch (error) {
        console.error('Error updating proxies:', error);
        throw error;
      }
    },

    /**
     * Delete a proxy configuration
     */
    deleteProxy: async (proxyIndex: number) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/proxies/${proxyIndex}`, {
          method: 'DELETE',
          headers: createHeaders(),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to delete proxy');
        }

        return await response.json();
      } catch (error) {
        console.error('Error deleting proxy:', error);
        throw error;
      }
    },

    /**
     * Get system settings for order limits
     */
    getSystemSettings: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
          headers: createHeaders(),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch system settings');
        }

        return await response.json();
      } catch (error) {
        console.error('Error fetching system settings:', error);
        throw error;
      }
    },

    /**
     * Update system settings for order limits
     */
    updateSystemSettings: async (settings: {
      min_upvotes: number;
      max_upvotes: number;
      min_upvotes_per_minute: number;
      max_upvotes_per_minute: number;
    }) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
          method: 'POST',
          headers: createHeaders(),
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to update system settings');
        }

        return await response.json();
      } catch (error) {
        console.error('Error updating system settings:', error);
        throw error;
      }
    }
  }
};
