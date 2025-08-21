import React from 'react';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';

export function TitleBar() {
  const { currentDocument, isDocumentModified, theme } = useAppStore();
  
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
      'h-12 border-b flex items-center justify-center drag-region text-sm font-medium',
      isDarkMode 
        ? 'bg-kanagawa-ink3 border-kanagawa-ink4 text-kanagawa-white'
        : 'bg-white border-gray-200 text-gray-700'
    )}>
      <div className="flex items-center space-x-1">
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