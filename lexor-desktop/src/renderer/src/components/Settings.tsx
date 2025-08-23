import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';
import { BookOpenIcon, FolderIcon } from '@heroicons/react/24/outline';

export function Settings() {
  const {
    theme,
    fontSize,
    lineHeight,
    fontFamily,
    setTheme,
    setFontSize,
    setLineHeight,
    setFontFamily,
    libraryFolder,
    setLibraryFolder,
  } = useAppStore();

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

  const handleChangeLibraryLocation = async () => {
    try {
      const result = await window.electronAPI?.library?.selectNewPath();
      if (!result?.canceled && result?.filePaths?.[0]) {
        const newLibraryPath = await window.electronAPI?.library?.initialize(result.filePaths[0]);
        if (newLibraryPath) {
          setLibraryFolder(newLibraryPath);
        }
      }
    } catch (error) {
      console.error('Failed to change library location:', error);
    }
  };

  return (
    <div className={clsx(
      'h-full p-8 overflow-auto',
      isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
    )}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={clsx(
            'text-3xl font-bold mb-2',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            Settings
          </h1>
          <p className={clsx(
            isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
          )}>
            Customize Lexor to your preferences
          </p>
        </div>

        {/* Appearance */}
        <div className={clsx(
          'p-6 mb-6 rounded-xl shadow-sm border',
          isDarkMode 
            ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
            : 'bg-white border-gray-200'
        )}>
          <h2 className={clsx(
            'text-xl font-semibold mb-4',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            Appearance
          </h2>
          
          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className={clsx(
                  'block w-full rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-kanagawa-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                )}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            {/* Font Family */}
            <div>
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Font Family (Current: {fontFamily})
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className={clsx(
                  'block w-full rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-kanagawa-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                )}
              >
                <option value="SF Mono">SF Mono</option>
                <option value="Monaco">Monaco</option>
                <option value="Consolas">Consolas</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Fira Code">Fira Code</option>
                <optgroup label="Monaspace">
                  <option value="Monaspace Neon">Monaspace Neon</option>
                  <option value="Monaspace Argon">Monaspace Argon</option>
                  <option value="Monaspace Xenon">Monaspace Xenon</option>
                  <option value="Monaspace Radon">Monaspace Radon</option>
                  <option value="Monaspace Krypton">Monaspace Krypton</option>
                </optgroup>
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className={clsx(
                  'w-full h-2 rounded-lg appearance-none cursor-pointer',
                  isDarkMode 
                    ? 'bg-kanagawa-ink5 accent-accent-blue' 
                    : 'bg-gray-200 accent-primary-600'
                )}
              />
            </div>

            {/* Line Height */}
            <div>
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Line Height: {lineHeight}
              </label>
              <input
                type="range"
                min="1.2"
                max="2.0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className={clsx(
                  'w-full h-2 rounded-lg appearance-none cursor-pointer',
                  isDarkMode 
                    ? 'bg-kanagawa-ink5 accent-accent-blue' 
                    : 'bg-gray-200 accent-primary-600'
                )}
              />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className={clsx(
          'p-6 mb-6 rounded-xl shadow-sm border',
          isDarkMode 
            ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
            : 'bg-white border-gray-200'
        )}>
          <h2 className={clsx(
            'text-xl font-semibold mb-4',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            Editor
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="wordWrap"
                className={clsx(
                  'rounded border focus:ring-2 focus:ring-accent-blue',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-accent-blue' 
                    : 'border-gray-300 text-primary-600 focus:ring-primary-500'
                )}
              />
              <label htmlFor="wordWrap" className={clsx(
                'ml-2 text-sm',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Word wrap
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showLineNumbers"
                className={clsx(
                  'rounded border focus:ring-2 focus:ring-accent-blue',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-accent-blue' 
                    : 'border-gray-300 text-primary-600 focus:ring-primary-500'
                )}
              />
              <label htmlFor="showLineNumbers" className={clsx(
                'ml-2 text-sm',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Show line numbers
              </label>
            </div>
          </div>
        </div>

        {/* Lexor Library */}
        <div className={clsx(
          'p-6 mb-6 rounded-xl shadow-sm border',
          isDarkMode 
            ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
            : 'bg-white border-gray-200'
        )}>
          <div className="flex items-center mb-4">
            <BookOpenIcon className={clsx(
              'h-5 w-5 mr-2',
              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
            )} />
            <h2 className={clsx(
              'text-xl font-semibold',
              isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
            )}>
              Lexor Library
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Library Location
              </label>
              <div className="flex items-center space-x-3">
                <div className={clsx(
                  'flex-1 px-3 py-2 rounded-md border text-sm',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-kanagawa-oldwhite' 
                    : 'border-gray-300 bg-gray-50 text-gray-700'
                )}>
                  <div className="flex items-center">
                    <FolderIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">
                      {libraryFolder || 'Not set'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleChangeLibraryLocation}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    isDarkMode
                      ? 'bg-accent-blue hover:bg-blue-600 text-white'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  )}
                >
                  Change
                </button>
              </div>
              <p className={clsx(
                'text-xs mt-2',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )}>
                Files in your Lexor Library sync between devices
              </p>
            </div>

            <div className={clsx(
              'p-4 rounded-lg',
              isDarkMode 
                ? 'bg-emerald-900/20 border border-emerald-800' 
                : 'bg-emerald-50 border border-emerald-200'
            )}>
              <div className="flex items-start">
                <div className={clsx(
                  'h-2 w-2 rounded-full mt-1.5 mr-3',
                  isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500'
                )} />
                <div>
                  <h4 className={clsx(
                    'text-sm font-medium mb-1',
                    isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                  )}>
                    Sync Status: Ready
                  </h4>
                  <p className={clsx(
                    'text-xs',
                    isDarkMode ? 'text-emerald-300' : 'text-emerald-600'
                  )}>
                    Your library is set up and ready to sync with other devices
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Study */}
        <div className={clsx(
          'p-6 rounded-xl shadow-sm border',
          isDarkMode 
            ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
            : 'bg-white border-gray-200'
        )}>
          <h2 className={clsx(
            'text-xl font-semibold mb-4',
            isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
          )}>
            Study Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Daily study goal (cards)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                defaultValue="20"
                className={clsx(
                  'block w-32 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-kanagawa-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                )}
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="studyReminder"
                className={clsx(
                  'rounded border focus:ring-2 focus:ring-accent-blue',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-accent-blue' 
                    : 'border-gray-300 text-primary-600 focus:ring-primary-500'
                )}
              />
              <label htmlFor="studyReminder" className={clsx(
                'ml-2 text-sm',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Daily study reminder
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}