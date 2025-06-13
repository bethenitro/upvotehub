
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '@/lib/utils';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* Sidebar for mobile - shown when toggled */}
      <div 
        className={cn(
          "fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={toggleSidebar}
      />
      
      <div 
        className={cn(
          "fixed top-0 bottom-0 left-0 w-64 z-30 md:relative md:z-auto transition-transform transform",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <Sidebar />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
