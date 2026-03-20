'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';
import {
  DashboardIcon,
  MonitoringIcon,
  UsersIcon,
  DevicesIcon,
  AnalyticsIcon,
  SettingsIcon,
  MenuIcon,
  CloseIcon,
} from '@/components/icons';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; className?: string }>;
  section?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon, section: 'main' },
  { name: 'Monitoring', href: '/monitoring', icon: MonitoringIcon, section: 'main' },
  { name: 'Users', href: '/users', icon: UsersIcon, section: 'management' },
  { name: 'Devices', href: '/devices', icon: DevicesIcon, section: 'management' },
  { name: 'Analytics', href: '/analytics', icon: AnalyticsIcon, section: 'insights' },
  { name: 'Settings', href: '/settings', icon: SettingsIcon, section: 'settings' },
];

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sections = {
    main: { label: 'Main', items: navItems.filter(item => item.section === 'main') },
    management: { label: 'Management', items: navItems.filter(item => item.section === 'management') },
    insights: { label: 'Analytics', items: navItems.filter(item => item.section === 'insights') },
    settings: { label: 'Settings', items: navItems.filter(item => item.section === 'settings') },
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="fixed left-4 top-5 md:hidden z-50 bg-white border border-gray-300 p-2.5 rounded-xl hover:bg-gray-50 shadow-lg transition-all duration-200 group"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <CloseIcon size={24} color="#10b981" />
        ) : (
          <MenuIcon size={24} color="#10b981" />
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 md:hidden z-30 transition-opacity duration-200"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-72 bg-white border-r border-gray-200 shadow-sm p-6 overflow-y-auto transition-transform duration-300 z-40 md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="space-y-8">
          {Object.entries(sections).map(([key, section]) => {
            if (section.items.length === 0) return null;
            return (
              <div key={key}>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 px-4 mb-3">
                  {section.label}
                </p>
                <div className="space-y-1.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    const IconComponent = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium group ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <IconComponent
                          size={20}
                          color={isActive ? '#10b981' : '#6b7280'}
                          className="group-hover:scale-110 transition-transform duration-200"
                        />
                        <span className="flex-1 text-sm md:text-base">{item.name}</span>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-emerald-600 shadow-sm"></div>
                        )}
                      </Link>
                    );
                  })}
                </div>
                {key !== 'settings' && (
                  <div className="mt-6 border-b border-gray-200"></div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Desktop Spacer */}
      <div className="hidden md:block w-72"></div>
    </>
  );
};

export default Sidebar;
