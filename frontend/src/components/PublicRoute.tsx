
import React from 'react';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  // Removed authentication check - allow access to all routes
  return <>{children}</>;
};

export default PublicRoute;
