
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";

interface User {
  id: string;
  username: string;
  email: string;
  credits: number;
  profileImage: string;
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

// Mock auth data
const MOCK_USER = {
  id: "user_123",
  username: "redditpro",
  email: "user@example.com",
  credits: 125.50,
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=redditpro"
};

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
    try {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simple validation - in a real app this would be a backend call
      if (email.trim() && password.trim()) {
        // Simulating successful login with mock user
        setUser(MOCK_USER);
        localStorage.setItem('upvotehub_user', JSON.stringify(MOCK_USER));
        toast({
          title: "Logged in successfully",
          description: `Welcome back, ${MOCK_USER.username}!`,
        });
        return true;
      }
      
      toast({
        title: "Login failed",
        description: "Invalid email or password",
        variant: "destructive"
      });
      return false;
    } catch (error) {
      toast({
        title: "Login error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Simple validation - in a real app this would be a backend call
      if (username.trim() && email.trim() && password.trim()) {
        // Create a new user based on the mock but with the provided info
        const newUser = {
          ...MOCK_USER,
          username,
          email,
          // Generate random avatar based on username
          profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        };
        
        setUser(newUser);
        localStorage.setItem('upvotehub_user', JSON.stringify(newUser));
        toast({
          title: "Account created",
          description: "Welcome to UpvoteHub!",
        });
        return true;
      }
      
      toast({
        title: "Signup failed",
        description: "Please fill out all fields",
        variant: "destructive"
      });
      return false;
    } catch (error) {
      toast({
        title: "Signup error",
        description: "Something went wrong. Please try again.",
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
