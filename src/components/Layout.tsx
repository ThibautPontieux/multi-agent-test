import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  GitBranch, 
  FileText, 
  Settings, 
  Menu, 
  X,
  Activity,
  AlertCircle,
  Bell
} from 'lucide-react';

const navigation = [
  { name: 'Accueil', href: '/', icon: Home },
  { name: 'Agents', href: '/agents', icon: Users },
  { name: 'Workflows', href: '/workflows', icon: GitBranch },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Alertes', href: '/alerts', icon: AlertCircle },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentPage = navigation.find(nav => nav.href === location.pathname)?.name || 'Dashboard';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar pour mobile */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="fixed top-0 left-0 bottom-0 flex flex-col w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Activity className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gradient">MCP Monitor</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
          
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 text-sm text-gray-500">
              <div className="status-dot status-online"></div>
              <span>Système en ligne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar pour desktop */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-white lg:border-r lg:border-gray-200">
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Activity className="w-8 h-8 text-primary-600" />
            <span className="text-xl font-bold text-gradient">MCP Monitor</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            <div className="status-dot status-online"></div>
            <span>Système en ligne</span>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-gray-500"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="lg:hidden ml-2">
                <h1 className="text-xl font-semibold text-gray-900">{currentPage}</h1>
              </div>
              <div className="hidden lg:block">
                <h1 className="text-2xl font-semibold text-gray-900">{currentPage}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-500">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 block w-2 h-2 bg-danger-500 rounded-full"></span>
              </button>
              
              {/* Status global */}
              <div className="hidden sm:flex items-center space-x-2">
                <div className="status-dot status-online"></div>
                <span className="text-sm text-gray-600">Tous systèmes opérationnels</span>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu de la page */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
