import React, { useState, useEffect } from 'react';
import { ChartBarIcon, PlayIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';

export function StudySession() {
  const { theme } = useAppStore();
  
  // State for system theme detection
  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  
  return (
    <div className={clsx(
      'h-full p-8',
      isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
    )}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={clsx(
            'text-3xl font-bold mb-2',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            Study Session
          </h1>
          <p className={clsx(
            isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
          )}>
            Review your flashcards and track your learning progress
          </p>
        </div>

        {/* Study options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className={clsx(
            'p-6 rounded-xl shadow-sm border',
            isDarkMode 
              ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
              : 'bg-white border-gray-200'
          )}>
            <h3 className={clsx(
              'text-lg font-semibold mb-2',
              isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
            )}>
              Quick Review
            </h3>
            <p className={clsx(
              'mb-4',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
            )}>
              Review cards that are due for today
            </p>
            <button className={clsx(
              'flex items-center space-x-2 font-medium py-2 px-4 rounded-lg transition-colors duration-200',
              isDarkMode 
                ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3' 
                : 'bg-primary-600 hover:bg-primary-700 text-white'
            )}>
              <PlayIcon className="h-4 w-4" />
              <span>Start Review</span>
            </button>
          </div>

          <div className={clsx(
            'p-6 rounded-xl shadow-sm border',
            isDarkMode 
              ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
              : 'bg-white border-gray-200'
          )}>
            <h3 className={clsx(
              'text-lg font-semibold mb-2',
              isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
            )}>
              Study Statistics
            </h3>
            <p className={clsx(
              'mb-4',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
            )}>
              View your learning progress and statistics
            </p>
            <button className={clsx(
              'flex items-center space-x-2 font-medium py-2 px-4 rounded-lg transition-colors duration-200',
              isDarkMode 
                ? 'bg-kanagawa-ink5 hover:bg-kanagawa-ink4 text-kanagawa-oldwhite' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
            )}>
              <ChartBarIcon className="h-4 w-4" />
              <span>View Stats</span>
            </button>
          </div>
        </div>

        {/* Empty state */}
        <div className="text-center py-12">
          <ChartBarIcon className={clsx(
            'mx-auto h-12 w-12 mb-4',
            isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
          )} />
          <h3 className={clsx(
            'text-lg font-medium mb-2',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            No study session active
          </h3>
          <p className={clsx(
            isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'
          )}>
            Create some flashcards first, then come back to study
          </p>
        </div>
      </div>
    </div>
  );
}