
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/services/api';
import { toast } from "@/components/ui/use-toast";

interface User {
  id: string;
  username: string;
  email: string;
  credits: number;
  joinedDate: string;
  profileImage: string;
  stats: {
    total_orders: number;
    active_orders: number;
    completed_orders: number;
  };
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  topUpAccount: (amount: number, paymentMethod: string, paymentDetails: any) => Promise<{
    success: boolean;
    checkout_link?: string;
    payment_id?: string;
  }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      setLoading(true);
      
      // Fetch user data and stats in parallel
      const [userData, statsData] = await Promise.all([
        api.user.getCurrentUser(),
        api.user.getUserStats()
      ]);
      
      // Combine user data with stats
      const userWithStats = {
        ...userData,
        stats: statsData.stats
      };
      
      setUser(userWithStats);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load user data.",
        variant: "destructive"
      });
      console.error("Failed to load user:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const topUpAccount = async (amount: number, paymentMethod: string, paymentDetails: any) => {
    try {
      setLoading(true);
      
      // For crypto payments, use the new payment API
      if (paymentMethod === 'crypto') {
        const result = await api.payments.createCryptoPayment(amount, paymentDetails);
        
        if (result.success) {
          toast({
            title: "Payment Created",
            description: "Crypto payment created successfully. Complete payment to add credits.",
          });
          return {
            success: true,
            checkout_link: result.checkout_link,
            payment_id: result.payment_id
          };
        }
        return { success: false };
      }
      
      // Fallback for other payment methods (though we only support crypto now)
      const result = await api.user.topUpAccount(amount, paymentMethod, paymentDetails);
      
      if (result.success && user) {
        setUser({
          ...user,
          credits: user.credits + amount
        });
        toast({
          title: "Success",
          description: `Added ${amount} credits to your account.`
        });
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create payment.",
        variant: "destructive"
      });
      console.error("Failed to create payment:", error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AppContext.Provider value={{ user, loading, refreshUser, topUpAccount }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
