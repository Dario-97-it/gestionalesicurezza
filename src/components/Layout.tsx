import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  UserPlusIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Aziende', href: '/companies', icon: BuildingOfficeIcon },
  { name: 'Studenti', href: '/students', icon: UserGroupIcon },
  { name: 'Servizi Offerti', href: '/services', icon: AcademicCapIcon },
  { name: 'Docenti', href: '/instructors', icon: UserIcon },
  { name: 'Agenti', href: '/agents', icon: UserPlusIcon },
  { name: 'Edizioni Corsi', href: '/editions', icon: CalendarDaysIcon },
  { name: 'Calendario', href: '/calendar', icon: CalendarDaysIcon },
  { name: 'Report', href: '/reports', icon: ChartBarIcon },
  { name: 'Scadenzario', href: '/scadenzario', icon: ClockIcon },
  { name: 'Impostazioni', href: '/settings', icon: Cog6ToothIcon },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, client, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-gray-900/80 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar panel */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-white px-6 pb-4 transition-transform duration-300 lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 shrink-0 items-center justify-between">
          <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center">
            <img src="/logo.png" alt="GestionaleSicurezza" className="h-10 w-auto" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="p-2.5 text-gray-700">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-5 flex flex-1 flex-col">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    location.pathname === item.href
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                  )}
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <Link to="/" className="flex items-center">
              <img src="/logo.png" alt="GestionaleSicurezza" className="h-12 w-auto" />
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      location.pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <item.icon className="h-6 w-6 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto py-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-400">{client?.name}</div>
              <div className="text-xs text-gray-500">Piano: {client?.plan?.toUpperCase()}</div>
            </div>
          </nav>
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="p-2.5 text-gray-700 lg:hidden">
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex flex-1 items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {navigation.find((item) => item.href === location.pathname)?.name || 'Dashboard'}
            </h2>
            <div className="relative">
              <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-x-2 p-1.5"
              >
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:flex lg:items-center">
                  <span className="text-sm font-semibold text-gray-900">{user?.name}</span>
                  <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
                </span>
              </button>
              
              {profileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
                    <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setProfileMenuOpen(false)}>
                      Impostazioni
                    </Link>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      Esci
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
