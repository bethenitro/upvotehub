
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { api } from "@/services/api";

interface User {
  id: string;
  username: string;
  email: string;
  credits: number;
  profileImage: string;
  my_referral_code?: string;
  referral_earnings?: number;
  total_referrals?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string, referralCode?: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in from localStorage
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem('upvotezone_user');
      const storedToken = localStorage.getItem('upvotezone_token');
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Call the real API
      const response = await api.auth.login(email, password);
      
      setUser(response.user);
      toast({
        title: "Logged in successfully",
        description: `Welcome back, ${response.user.username}!`,
      });
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string, referralCode?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Call the real API
      const response = await api.auth.signup(username, email, password, referralCode);
      
      setUser(response.user);
      toast({
        title: "Account created",
        description: "Welcome to UpvoteZone!",
      });
      return true;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Signup failed";
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Call API logout (handles token cleanup)
    api.auth.logout();
    
    setUser(null);
    navigate('/login');
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      signup, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
