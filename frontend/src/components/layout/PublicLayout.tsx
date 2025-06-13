
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import { Button } from '@/components/ui/button';

const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="gradient-primary text-white font-bold rounded-md p-2">
              UH
            </div>
            <Link to="/" className="text-xl font-bold text-gray-900 dark:text-white">
              UpvoteHub
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-upvote-primary dark:hover:text-upvote-primary">
              Home
            </Link>
            <Link to="#features" className="text-gray-600 dark:text-gray-300 hover:text-upvote-primary dark:hover:text-upvote-primary">
              Features
            </Link>
            <Link to="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-upvote-primary dark:hover:text-upvote-primary">
              Pricing
            </Link>
            <Link to="#faq" className="text-gray-600 dark:text-gray-300 hover:text-upvote-primary dark:hover:text-upvote-primary">
              FAQ
            </Link>
          </nav>
          
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
      
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="gradient-primary text-white font-bold rounded-md p-2">
                  UH
                </div>
                <span className="text-lg font-bold">UpvoteHub</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Boost your Reddit presence with our upvote service. Increase visibility and enhance your social proof.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="#about" className="text-gray-600 dark:text-gray-400 hover:text-upvote-primary dark:hover:text-upvote-primary">About</Link></li>
                <li><Link to="#careers" className="text-gray-600 dark:text-gray-400 hover:text-upvote-primary dark:hover:text-upvote-primary">Careers</Link></li>
                <li><Link to="#blog" className="text-gray-600 dark:text-gray-400 hover:text-upvote-primary dark:hover:text-upvote-primary">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="#contact" className="text-gray-600 dark:text-gray-400 hover:text-upvote-primary dark:hover:text-upvote-primary">Contact</Link></li>
                <li><Link to="#help" className="text-gray-600 dark:text-gray-400 hover:text-upvote-primary dark:hover:text-upvote-primary">Help Center</Link></li>
                <li><Link to="#terms" className="text-gray-600 dark:text-gray-400 hover:text-upvote-primary dark:hover:text-upvote-primary">Terms of Service</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="#privacy" className="text-gray-600 dark:text-gray-400 hover:text-upvote-primary dark:hover:text-upvote-primary">Privacy Policy</Link></li>
                <li><Link to="#cookies" className="text-gray-600 dark:text-gray-400 hover:text-upvote-primary dark:hover:text-upvote-primary">Cookies Policy</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} UpvoteHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
