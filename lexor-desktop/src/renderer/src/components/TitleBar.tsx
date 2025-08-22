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
    <div 
      className={clsx(
        'h-12 border-b drag-region text-sm font-medium grid items-center',
        isDarkMode 
          ? 'bg-kanagawa-ink3 border-kanagawa-ink4 text-kanagawa-white'
          : 'bg-white border-gray-200 text-gray-700'
      )}
      style={{
        gridTemplateColumns: sidebarCollapsed 
          ? '120px 1fr 120px'  // traffic lights space | center | right space
          : '312px 1fr 120px'  // sidebar + hamburger space | center | right space
      }}
    >
      {/* Left column - Hamburger button */}
      <div className="flex items-center justify-end pr-4">
        <button
          onClick={toggleSidebar}
          className={clsx(
            "p-1.5 rounded-md transition-colors duration-200",
            isDarkMode 
              ? "hover:bg-kanagawa-ink4 text-kanagawa-oldwhite" 
              : "hover:bg-gray-100 text-gray-600"
          )}
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <Bars3Icon className="h-5 w-5" />
        </button>
      </div>

      {/* Center column - Document title (truly centered) */}
      <div className="flex items-center justify-center pointer-events-none min-w-0">
        <div className="flex items-center space-x-1 min-w-0">
          <span className="truncate text-center">
            {documentName}
          </span>
          {isDocumentModified && (
            <span className={clsx(
              'flex-shrink-0',
              isDarkMode ? "text-accent-yellow" : "text-gray-400"
            )}>•</span>
          )}
        </div>
      </div>

      {/* Right column - Empty (for balance) */}
      <div></div>
    </div>
  );
}