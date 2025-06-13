
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-upvote-primary"></div>
      </div>
    );
  }

  // Redirect authenticated users away from login/signup pages to dashboard
  if (isAuthenticated && (location.pathname === '/login' || location.pathname === '/signup')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
