import React from 'react';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';
import { Bars3Icon } from '@heroicons/react/24/outline';

export function TitleBar() {
  const { currentDocument, isDocumentModified, theme, sidebarCollapsed, toggleSidebar } = useAppStore();
  
  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Don't render custom title bar on Windows/Linux (use native)
  if (!window.electronAPI?.platform.isMac) {
    return null;
  }

  const documentName = currentDocument 
    ? currentDocument.split('/').pop() || 'Untitled'
    : 'Untitled';

  return (
    <div className={clsx(
      'h-12 border-b flex items-center drag-region text-sm font-medium relative',
      isDarkMode 
        ? 'bg-kanagawa-ink3 border-kanagawa-ink4 text-kanagawa-white'
        : 'bg-white border-gray-200 text-gray-700'
    )}>
      {/* Sidebar toggle button - positioned appropriately based on sidebar state */}
      <button
        onClick={toggleSidebar}
        className={clsx(
          "absolute p-1.5 rounded-md transition-all duration-300 z-20", // Higher z-index to stay above sidebar
          sidebarCollapsed ? "left-20" : "left-[272px]", // When sidebar is shown, position just right of it (264px + 8px gap)
          isDarkMode 
            ? "hover:bg-kanagawa-ink4 text-kanagawa-oldwhite" 
            : "hover:bg-gray-100 text-gray-600"
        )}
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <Bars3Icon className="h-5 w-5" />
      </button>
      
      {/* Document title - centered */}
      <div className="flex items-center space-x-1 mx-auto">
        <span>{documentName}</span>
        {isDocumentModified && (
          <span className={clsx(
            isDarkMode ? "text-accent-yellow" : "text-gray-400"
          )}>•</span>
        )}
      </div>
    </div>
  );
}