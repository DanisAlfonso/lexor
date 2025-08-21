import React from 'react';
import { useAppStore } from '../stores/appStore';

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

  return (
    <div className="h-full p-8 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize Lexor to your preferences
          </p>
        </div>

        {/* Appearance */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Appearance
          </h2>
          
          <div className="space-y-4">
            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Family
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-primary-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Line Height */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Line Height: {lineHeight}
              </label>
              <input
                type="range"
                min="1.2"
                max="2.0"
                step="0.1"
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="card p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Editor
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="wordWrap"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="wordWrap" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Word wrap
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="showLineNumbers"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="showLineNumbers" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Show line numbers
              </label>
            </div>
          </div>
        </div>

        {/* Study */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Study Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Daily study goal (cards)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                defaultValue="20"
                className="block w-32 rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="studyReminder"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="studyReminder" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Daily study reminder
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}