import React from 'react';
import { useAppStore } from '../stores/appStore';
import { useFlashcardStore } from '../stores/flashcardStore';
import { clsx } from 'clsx';
import { ArrowLongLeftIcon, ArrowLongRightIcon } from '@heroicons/react/24/outline';

export function TitleBar() {
  const { currentDocument, isDocumentModified, theme, sidebarCollapsed, toggleSidebar, currentView } = useAppStore();
  const { currentSession } = useFlashcardStore();
  
  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Don't render custom title bar on Windows/Linux (use native)
  if (!window.electronAPI?.platform.isMac) {
    return null;
  }

  // Determine the title based on current view and study state
  const getTitle = () => {
    // If there's an active study session, show study progress regardless of currentView
    if (currentSession) {
      const reviewedCount = currentSession.current_index;
      return `Study Session (${reviewedCount} reviewed)`;
    }
    
    switch (currentView) {
      case 'flashcards':
        return 'Flashcards';
      case 'study':
        return 'Study';
      case 'settings':
        return 'Settings';
      case 'editor':
      default:
        return currentDocument 
          ? currentDocument.split('/').pop() || 'Untitled'
          : 'Untitled';
    }
  };

  const title = getTitle();

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
          ? '140px 1fr 120px'  // increased traffic lights space | center | right space
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
          {sidebarCollapsed ? (
            <ArrowLongRightIcon className="h-5 w-5" />
          ) : (
            <ArrowLongLeftIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Center column - Document title (truly centered) */}
      <div className="flex items-center justify-center pointer-events-none min-w-0">
        <div className="flex items-center space-x-1 min-w-0">
          <span className="truncate text-center">
            {title}
          </span>
          {currentView === 'editor' && !currentSession && isDocumentModified && (
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