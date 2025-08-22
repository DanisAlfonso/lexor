import React from 'react';
import { useAppStore, ViewType } from '../stores/appStore';
import { 
  DocumentTextIcon, 
  AcademicCapIcon, 
  ChartBarIcon, 
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

const navigationItems = [
  { id: 'editor' as ViewType, label: 'Editor', icon: DocumentTextIcon },
  { id: 'flashcards' as ViewType, label: 'Flashcards', icon: AcademicCapIcon },
  { id: 'study' as ViewType, label: 'Study', icon: ChartBarIcon },
  { id: 'settings' as ViewType, label: 'Settings', icon: Cog6ToothIcon },
];

export function Sidebar() {
  const { currentView, sidebarCollapsed, setCurrentView, toggleSidebar, theme } = useAppStore();
  
  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className={clsx(
      'fixed left-0 top-0 h-full transition-all duration-300 z-10 w-64',
      sidebarCollapsed ? '-translate-x-full' : 'translate-x-0',
      // Account for macOS title bar
      window.electronAPI?.platform.isMac ? 'pt-12' : 'pt-0',
      // Theme colors
      isDarkMode 
        ? 'bg-kanagawa-ink1 border-kanagawa-ink4 text-kanagawa-white' 
        : 'bg-white border-gray-200 text-gray-900',
      'border-r'
    )}>

      {/* Navigation */}
      <nav className="mt-4 px-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentView(item.id)}
                  className={clsx(
                    'w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    isDarkMode ? 'hover:bg-kanagawa-ink4' : 'hover:bg-gray-100',
                    isActive 
                      ? isDarkMode 
                        ? 'bg-kanagawa-ink5 text-accent-blue' 
                        : 'bg-primary-100 text-primary-700'
                      : isDarkMode
                        ? 'text-kanagawa-oldwhite'
                        : 'text-gray-700'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="ml-3">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Recent documents */}
      <div className="mt-8 px-4">
        <h3 className={clsx(
          "text-xs font-semibold uppercase tracking-wide mb-3",
          isDarkMode ? "text-kanagawa-gray" : "text-gray-500"
        )}>
          Recent Documents
        </h3>
        <div className="space-y-1">
          {/* TODO: Add recent documents list */}
          <p className={clsx(
            "text-sm italic",
            isDarkMode ? "text-kanagawa-gray" : "text-gray-500"
          )}>
            No recent documents
          </p>
        </div>
      </div>
    </div>
  );
}