import React from 'react';
import { User, LogOut } from 'lucide-react';
import Notifications from './Notifications';
import { useAuth } from '../hooks/useAuth';

export default function NavBar() {
  const { user, signOut: onLogout, isAuthenticated } = useAuth();

  return (
    <nav className="w-full border-b bg-background/80 p-4">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold">Masuki Books</h1>
        </div>
        <div className="flex items-center gap-4">
          <Notifications />
          {isAuthenticated ? (
            <>
              <button onClick={onLogout} aria-label="Logout" className="text-primary hover:opacity-80">
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button className="text-primary hover:opacity-80">
              <User className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
