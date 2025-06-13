
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { api } from '@/services/api'; // Import API service

interface User {
  id: string;
  username: string;
  email: string;
  credits: number;
  profileImage: string;
  joined_date?: string; // Added from backend
  last_login?: string;  // Added from backend
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// MOCK_USER constant removed

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in from localStorage
    const checkAuthStatus = () => {
      const storedUser = localStorage.getItem('upvotehub_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const backendUser = await api.user.loginUser({ email, password });
      
      // Transform backendUser to frontend User interface
      const frontendUser: User = {
        id: backendUser.id,
        username: backendUser.username,
        email: backendUser.email,
        credits: backendUser.credits,
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.username}`, // Keep dicebear logic
        joined_date: backendUser.joined_date,
        last_login: backendUser.last_login,
      };

      setUser(frontendUser);
      localStorage.setItem('upvotehub_user', JSON.stringify(frontendUser));
      toast({
        title: "Logged in successfully",
        description: `Welcome back, ${frontendUser.username}!`,
      });
      return true;
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const backendUser = await api.user.signupUser({ username, email, password });

      // Transform backendUser to frontend User interface
      const frontendUser: User = {
        id: backendUser.id,
        username: backendUser.username,
        email: backendUser.email,
        credits: backendUser.credits,
        profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${backendUser.username}`, // Keep dicebear logic
        joined_date: backendUser.joined_date,
        last_login: backendUser.last_login,
      };
        
      setUser(frontendUser);
      localStorage.setItem('upvotehub_user', JSON.stringify(frontendUser));
      toast({
        title: "Account created",
        description: "Welcome to UpvoteHub!",
      });
      return true;
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('upvotehub_user');
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
