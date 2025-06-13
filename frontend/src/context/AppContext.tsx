
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
    totalOrders: number;
    activeOrders: number;
    completedOrders: number;
  };
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  topUpAccount: (amount: number, paymentMethod: string, paymentDetails: any) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await api.user.getCurrentUser();
      setUser(userData);
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
        return true;
      }
      return false;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to top up account.",
        variant: "destructive"
      });
      console.error("Failed to top up account:", error);
      return false;
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
