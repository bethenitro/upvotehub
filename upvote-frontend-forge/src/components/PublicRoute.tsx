
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Adjusted path
// Optional: Import a loading spinner component if you have one
// import LoadingSpinner from './LoadingSpinner';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // Optional: Render a loading spinner or a simple loading message
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    // Redirect to dashboard or a default authenticated route
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default PublicRoute;
