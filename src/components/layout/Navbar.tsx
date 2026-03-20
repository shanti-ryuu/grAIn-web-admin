'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useRef, useEffect } from 'react';
import { LogoutIcon, ChevronDownIcon } from '@/components/icons';
import Logo from '@/components/ui/Logo';

const Navbar: React.FC = () => {
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/auth/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 px-4 md:px-8 z-40 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between h-full">
        <Link href="/dashboard" className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
          <Logo size="sm" showText={false} />
          <span className="hidden sm:block text-lg font-bold text-gray-900 tracking-tight">grAIn Admin</span>
        </Link>

        <div className="flex items-center space-x-4">
          {/* User Menu */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2.5 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                J
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-semibold text-gray-900">Joshua</span>
                <span className="text-xs text-gray-500">Admin</span>
              </div>
              <ChevronDownIcon
                size={18}
                color="#6b7280"
                className={`transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-3 w-72 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-white">
                  <p className="text-sm font-bold text-gray-900">Joshua Santelices</p>
                  <p className="text-xs text-gray-600 mt-1.5">joshua.santelices@example.com</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-5 py-3 text-sm text-gray-700 hover:bg-red-50 transition-colors duration-200 flex items-center space-x-3 font-medium group"
                >
                  <LogoutIcon size={18} color="#ef4444" className="group-hover:scale-110 transition-transform" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
