import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, LogOut, User, PlusCircle, LayoutDashboard } from 'lucide-react';
import CreditsManager from './CreditsManager';
import AccountLinker from './AccountLinker';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-blue-600 p-1.5 rounded-lg group-hover:bg-blue-700 transition-colors">
              <Compass className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              WallMind
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {user && (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium text-sm flex items-center transition-colors">
                  <LayoutDashboard className="w-4 h-4 mr-1.5" />
                  Dashboard
                </Link>
                <Link to="/upload" className="text-gray-600 hover:text-blue-600 font-medium text-sm flex items-center transition-colors">
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  New Analysis
                </Link>
              </>
            )}
          </div>

          {/* Auth Actions */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-6">

                <AccountLinker />
                <CreditsManager />

                <div className="flex items-center space-x-4 border-l pl-6 border-gray-200">
                  <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-sm font-semibold text-gray-900 leading-none">{user.username}</span>
                    <span className="text-xs text-gray-500 mt-1">{user.email}</span>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md border-2 border-white">
                    <User className="h-5 w-5" />
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-blue-600 font-medium text-sm px-4 py-2 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-full text-white bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
