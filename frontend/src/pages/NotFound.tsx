
import React from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <h1 className="text-9xl font-bold text-upvote-primary mb-4">404</h1>
        <p className="text-2xl font-semibold mb-4">Page Not Found</p>
        <p className="text-gray-500 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate("/")} className="gradient-primary">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
