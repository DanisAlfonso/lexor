import React, { useState, useEffect } from 'react';
import { PlusIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';

export function FlashcardView() {
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
            Flashcards
          </h1>
          <p className={clsx(
            isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
          )}>
            Create and manage your flashcard decks for effective learning
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4 mb-8">
          <button className={clsx(
            'flex items-center space-x-2 font-medium py-2 px-4 rounded-lg transition-colors duration-200',
            isDarkMode 
              ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3' 
              : 'bg-primary-600 hover:bg-primary-700 text-white'
          )}>
            <PlusIcon className="h-4 w-4" />
            <span>New Deck</span>
          </button>
          <button className={clsx(
            'flex items-center space-x-2 font-medium py-2 px-4 rounded-lg transition-colors duration-200',
            isDarkMode 
              ? 'bg-kanagawa-ink5 hover:bg-kanagawa-ink4 text-kanagawa-oldwhite' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
          )}>
            <PlusIcon className="h-4 w-4" />
            <span>New Card</span>
          </button>
        </div>

        {/* Deck list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Empty state */}
          <div className="col-span-full">
            <div className="text-center py-12">
              <FolderIcon className={clsx(
                'mx-auto h-12 w-12 mb-4',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
              )} />
              <h3 className={clsx(
                'text-lg font-medium mb-2',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                No flashcard decks yet
              </h3>
              <p className={clsx(
                'mb-6',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'
              )}>
                Create your first deck to start learning with flashcards
              </p>
              <button className={clsx(
                'font-medium py-2 px-4 rounded-lg transition-colors duration-200',
                isDarkMode 
                  ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3' 
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              )}>
                Create First Deck
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}