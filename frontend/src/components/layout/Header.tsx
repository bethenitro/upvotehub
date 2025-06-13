
import React from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from '../ThemeToggle';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user } = useApp();
  const { logout } = useAuth();

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between px-4">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
        <Menu size={20} />
      </Button>
      
      <div className="flex-1 ml-4">
        <h1 className="text-lg font-medium md:hidden text-gray-900 dark:text-white">UpvoteHub</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <ThemeToggle />
        
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.credits.toFixed(2)} credits</p>
          </div>
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img src={user?.profileImage} alt={user?.username || 'User'} className="w-full h-full object-cover" />
          </div>
        </div>
        
        <Button variant="ghost" size="icon" onClick={logout} title="Logout">
          <LogOut size={18} />
        </Button>
      </div>
    </header>
  );
};

export default Header;
