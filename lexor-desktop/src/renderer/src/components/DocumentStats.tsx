import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { formatWordCount, formatReadingTime, formatCharacterCount } from '../utils/wordCount';
import { clsx } from 'clsx';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  ChatBubbleLeftRightIcon,
  ChevronUpIcon 
} from '@heroicons/react/24/outline';

export function DocumentStats() {
  const { 
    currentDocument, 
    documentStats,
    isAutoSaving,
    lastAutoSave,
    isDocumentModified,
    theme,
    showDocumentStats
  } = useAppStore();
  
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show if no document is open or if stats are toggled off
  if (!currentDocument || !showDocumentStats) return null;

  const isDarkMode = theme === 'dark' || (theme === 'system' && 
    window.matchMedia('(prefers-color-scheme: dark)').matches);

  const getAutoSaveStatus = () => {
    if (isAutoSaving) {
      return { text: 'Auto-saving...', color: 'text-blue-500' };
    }
    
    if (isDocumentModified) {
      return { text: 'Unsaved', color: 'text-yellow-500' };
    }
    
    if (lastAutoSave) {
      const timeDiff = Date.now() - lastAutoSave;
      const seconds = Math.floor(timeDiff / 1000);
      const minutes = Math.floor(seconds / 60);
      
      if (minutes > 0) {
        return { text: `Saved ${minutes}m ago`, color: 'text-green-500' };
      } else if (seconds > 5) {
        return { text: `Saved ${seconds}s ago`, color: 'text-green-500' };
      } else {
        return { text: 'Saved', color: 'text-green-500' };
      }
    }
    
    return { text: 'Ready', color: 'text-green-500' };
  };

  const autoSaveStatus = getAutoSaveStatus();

  return (
    <div className={clsx(
      'fixed bottom-4 right-4 select-none',
      'transition-all duration-200 ease-in-out',
      'z-10'
    )}>
      {/* Compact Status Bar */}
      <div
        className={clsx(
          'flex items-center space-x-3 px-4 py-2 rounded-full shadow-lg border backdrop-blur-md',
          'cursor-pointer transition-all duration-200',
          isDarkMode 
            ? 'bg-kanagawa-ink3/90 border-kanagawa-ink5/50 hover:bg-kanagawa-ink3/95' 
            : 'bg-white/90 border-gray-200/50 hover:bg-white/95',
          isExpanded && 'rounded-2xl pb-3'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Main Stats - Always Visible */}
        <div className="flex items-center space-x-3">
          {/* Auto-save Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className={clsx(
              'w-2 h-2 rounded-full transition-colors',
              isAutoSaving ? 'bg-blue-500 animate-pulse' : 
              isDocumentModified ? 'bg-yellow-500' : 'bg-green-500'
            )} />
            <span className={clsx(
              'text-xs font-medium transition-colors',
              autoSaveStatus.color
            )}>
              {autoSaveStatus.text}
            </span>
          </div>

          {/* Word Count */}
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className={clsx(
              'w-4 h-4',
              isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
            )} />
            <span className={clsx(
              'text-xs font-medium',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
            )}>
              {formatWordCount(documentStats.words)}
            </span>
          </div>

          {/* Reading Time */}
          {documentStats.readingTimeMinutes > 0 && (
            <div className="flex items-center space-x-2">
              <ClockIcon className={clsx(
                'w-4 h-4',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )} />
              <span className={clsx(
                'text-xs font-medium',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                {formatReadingTime(documentStats.readingTimeMinutes)}
              </span>
            </div>
          )}

          {/* Expand/Collapse Arrow */}
          <ChevronUpIcon className={clsx(
            'w-4 h-4 transition-transform duration-200',
            isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400',
            isExpanded ? 'rotate-180' : 'rotate-0'
          )} />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className={clsx(
          'mt-3 px-4 pb-4 space-y-3',
          'animate-in fade-in slide-in-from-bottom-2 duration-200'
        )}>
          {/* Detailed Statistics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Characters */}
            <div className="flex flex-col">
              <span className={clsx(
                'text-xs font-medium',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )}>
                Characters
              </span>
              <span className={clsx(
                'text-sm font-semibold',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-900'
              )}>
                {formatCharacterCount(documentStats.characters)}
              </span>
            </div>

            {/* Characters (no spaces) */}
            <div className="flex flex-col">
              <span className={clsx(
                'text-xs font-medium',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )}>
                No Spaces
              </span>
              <span className={clsx(
                'text-sm font-semibold',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-900'
              )}>
                {formatCharacterCount(documentStats.charactersNoSpaces)}
              </span>
            </div>

            {/* Paragraphs */}
            <div className="flex flex-col">
              <span className={clsx(
                'text-xs font-medium',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )}>
                Paragraphs
              </span>
              <span className={clsx(
                'text-sm font-semibold',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-900'
              )}>
                {documentStats.paragraphs}
              </span>
            </div>

            {/* Lines */}
            <div className="flex flex-col">
              <span className={clsx(
                'text-xs font-medium',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )}>
                Lines
              </span>
              <span className={clsx(
                'text-sm font-semibold',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-900'
              )}>
                {documentStats.lines}
              </span>
            </div>
          </div>

          {/* Document Name */}
          <div className={clsx(
            'pt-2 border-t',
            isDarkMode ? 'border-kanagawa-ink5' : 'border-gray-200'
          )}>
            <span className={clsx(
              'text-xs font-medium',
              isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
            )}>
              Document
            </span>
            <p className={clsx(
              'text-xs font-medium truncate mt-1',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
            )}>
              {currentDocument.split('/').pop()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}