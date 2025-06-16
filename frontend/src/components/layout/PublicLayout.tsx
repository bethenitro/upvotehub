import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';

const PublicLayout: React.FC = () => {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Toaster />
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="gradient-primary text-white font-bold rounded-md p-2">
              UZ
            </div>
            <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
              UpvoteZone
            </Link>
          </div>
          
          {/* Navigation menu removed */}
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link to="/signup" className="hidden sm:block">
              <Button>Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicLayout;
