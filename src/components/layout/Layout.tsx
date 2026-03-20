'use client';

import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-emerald-50/30 to-white">
      <Navbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 w-full overflow-x-hidden">
          <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
