
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { 
  Home, 
  PlusCircle, 
  History, 
  CreditCard,
  Wallet,
  Settings,
  HelpCircle
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useApp();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="gradient-primary text-white font-bold text-xl p-2 rounded-md">
            UH
          </div>
          <h1 className="font-bold text-xl text-gray-900 dark:text-white">UpvoteHub</h1>
        </div>
      </div>
      
      <div className="p-4 flex flex-col items-center border-b border-gray-200 dark:border-gray-700">
        {user && (
          <>
            <div className="w-16 h-16 rounded-full overflow-hidden mb-2">
              <img src={user.profileImage} alt={user.username} className="w-full h-full object-cover" />
            </div>
            <h2 className="font-medium text-gray-900 dark:text-white">{user.username}</h2>
            <p className="text-sm text-upvote-neutral mb-2">{user.email}</p>
            <div className="bg-upvote-gray-100 dark:bg-gray-700 w-full rounded-md p-2 text-center">
              <p className="text-xs text-upvote-neutral dark:text-gray-400">Balance</p>
              <p className="font-bold text-lg text-gray-900 dark:text-white">{user.credits.toFixed(2)} credits</p>
            </div>
          </>
        )}
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Home size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/order/new" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <PlusCircle size={18} />
          <span>New Order</span>
        </NavLink>
        <NavLink to="/orders/history" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <History size={18} />
          <span>Orders History</span>
        </NavLink>
        <NavLink to="/payments/history" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <CreditCard size={18} />
          <span>Payment History</span>
        </NavLink>
        <NavLink to="/account/topup" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Wallet size={18} />
          <span>Top Up Account</span>
        </NavLink>
      </nav>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <NavLink to="/settings" className="sidebar-link">
          <Settings size={18} />
          <span>Settings</span>
        </NavLink>
        <NavLink to="/help" className="sidebar-link">
          <HelpCircle size={18} />
          <span>Help & Support</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
