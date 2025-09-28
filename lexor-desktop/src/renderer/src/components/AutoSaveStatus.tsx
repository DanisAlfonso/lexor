import React from 'react';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';

export function AutoSaveStatus() {
  const {
    isAutoSaveEnabled,
    isAutoSaving,
    lastAutoSave,
    isDocumentModified,
    currentDocument,
    isSplitScreenMode,
    isRightPaneModified,
    rightPaneDocument,
    focusedPane
  } = useAppStore();

  // Don't show status if no document is open
  const activeDocument = isSplitScreenMode && focusedPane === 'right' ? rightPaneDocument : currentDocument;
  if (!activeDocument) return null;

  const getStatusText = () => {
    if (isAutoSaving) {
      return 'Auto-saving...';
    }

    // Check if the focused pane is modified
    const isModified = isSplitScreenMode && focusedPane === 'right' ? isRightPaneModified : isDocumentModified;

    if (!isAutoSaveEnabled) {
      return isModified ? 'Unsaved changes' : 'Saved';
    }

    if (isModified) {
      return 'Unsaved changes';
    }

    if (lastAutoSave) {
      const timeDiff = Date.now() - lastAutoSave;
      const seconds = Math.floor(timeDiff / 1000);
      const minutes = Math.floor(seconds / 60);

      if (minutes > 0) {
        return `Auto-saved ${minutes}m ago`;
      } else if (seconds > 5) {
        return `Auto-saved ${seconds}s ago`;
      } else {
        return 'Auto-saved';
      }
    }

    return 'Ready';
  };

  const getStatusColor = () => {
    if (isAutoSaving) {
      return 'text-blue-500';
    }

    // Check if the focused pane is modified
    const isModified = isSplitScreenMode && focusedPane === 'right' ? isRightPaneModified : isDocumentModified;

    if (isModified) {
      return 'text-yellow-500';
    }

    return 'text-green-500';
  };

  const isDarkMode = useAppStore(state => 
    state.theme === 'dark' || (state.theme === 'system' && 
    window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  return (
    <div className={clsx(
      'flex items-center text-xs font-medium px-3 py-1',
      isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
    )}>
      <div className={clsx(
        'w-2 h-2 rounded-full mr-2 transition-colors',
        isAutoSaving ? 'bg-blue-500 animate-pulse' :
        (isSplitScreenMode && focusedPane === 'right' ? isRightPaneModified : isDocumentModified) ? 'bg-yellow-500' : 'bg-green-500'
      )} />
      <span className={clsx('transition-colors', getStatusColor())}>
        {getStatusText()}
      </span>
    </div>
  );
}