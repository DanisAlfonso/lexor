import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';

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
                Font Family
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