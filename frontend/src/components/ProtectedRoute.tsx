
import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Removed authentication check - allow access to all routes
  return <>{children}</>;
};

export default ProtectedRoute;
