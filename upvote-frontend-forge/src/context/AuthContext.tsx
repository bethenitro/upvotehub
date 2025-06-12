
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/use-toast";
import { api } from '@/services/api'; // Import the API service

// Keep User interface - ensure it matches backend response for user object
interface User {
  id: string;
  username: string;
  email: string;
  credits: number;
  profileImage?: string; // Make profileImage optional or ensure backend provides it
}

// Define types for API responses if they are specific
interface AuthResponse {
  user: User;
  token: string;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('jwtToken');
      if (token) {
        try {
          // Assuming api.user.getCurrentUser() is the method to verify token and get user
          // And it expects the token to be automatically sent by the axios instance via createHeaders
          const userData = await api.user.getCurrentUser();
          if (userData) {
            setUser(userData);
            // Optionally, re-store user data in local storage if it can change
            localStorage.setItem('upvotehub_user', JSON.stringify(userData));
          } else {
            // If getCurrentUser returns nothing or indicates failure
            logout(); // Clear token and user state
          }
        } catch (error) {
          console.error("Session validation failed:", error);
          logout(); // Clear token if validation fails
        }
      }
      setIsLoading(false);
    };
    
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response: AuthResponse = await api.user.login({ email, password });
      if (response && response.token && response.user) {
        localStorage.setItem('jwtToken', response.token);
        localStorage.setItem('upvotehub_user', JSON.stringify(response.user));
        setUser(response.user);
        toast({
          title: "Logged in successfully",
          description: `Welcome back, ${response.user.username}!`,
        });
        setIsLoading(false);
        return true;
      }
      // Fallback for unexpected response structure
      throw new Error("Invalid login response from server.");
    } catch (error: any) {
      console.error("Login failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Invalid email or password.";
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsLoading(false);
      return false;
    }
  };

  const signup = async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Assuming api.user.signup now returns a simpler success response, not necessarily AuthResponse
      // For example, it might return { success: true, message: "User created" } or just resolve on success
      await api.user.signup({ username, email, password });
      
      // On successful API call (no error thrown):
      toast({
        title: "Signup successful",
        description: "Please log in to continue.",
      });
      navigate('/login');
      setIsLoading(false);
      return true;

    } catch (error: any) {
      console.error("Signup failed:", error);
      const errorMessage = error.response?.data?.message || error.message || "Could not create account. Please try again.";
      toast({
        title: "Signup failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jwtToken');
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
