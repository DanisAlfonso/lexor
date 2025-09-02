import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useStudySettingsStore } from '../stores/studySettingsStore';
import { GrammarService } from '../services/grammarService';
import { clsx } from 'clsx';
import { BookOpenIcon, FolderIcon, AcademicCapIcon, ClockIcon } from '@heroicons/react/24/outline';

export function Settings() {
  const {
    theme,
    fontSize,
    lineHeight,
    fontFamily,
    transparency,
    isSpellcheckEnabled,
    isGrammarCheckEnabled,
    grammarCheckLanguage,
    setTheme,
    setFontSize,
    setLineHeight,
    setFontFamily,
    setTransparency,
    setSpellcheckEnabled,
    setGrammarCheckEnabled,
    setGrammarCheckLanguage,
    libraryFolder,
    setLibraryFolder,
  } = useAppStore();

  const {
    newCardsPerDay,
    maxReviewsPerDay,
    learnAheadTimeMinutes,
    desiredRetention,
    learningSteps,
    relearningSteps,
    showProgress,
    updateSettings,
    resetToDefaults
  } = useStudySettingsStore();

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

            {/* Window Transparency */}
            <div>
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Window Transparency: {transparency}%
              </label>
              <input
                type="range"
                min="60"
                max="100"
                value={transparency}
                onChange={(e) => setTransparency(Number(e.target.value))}
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

        {/* Study Settings */}
        <div className={clsx(
          'p-6 mb-6 rounded-xl shadow-sm border',
          isDarkMode 
            ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
            : 'bg-white border-gray-200'
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <AcademicCapIcon className={clsx(
                'h-5 w-5 mr-2',
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              )} />
              <h2 className={clsx(
                'text-xl font-semibold',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                Study Settings
              </h2>
            </div>
            <button
              onClick={resetToDefaults}
              className={clsx(
                'text-xs px-3 py-1 rounded-md font-medium transition-colors',
                isDarkMode
                  ? 'bg-kanagawa-ink5 hover:bg-kanagawa-gray text-kanagawa-oldwhite'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              )}
            >
              Reset to Defaults
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Daily Limits */}
            <div>
              <h3 className={clsx(
                'text-sm font-medium mb-3 flex items-center',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                <ClockIcon className="h-4 w-4 mr-2" />
                Daily Study Limits
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Cards Per Day */}
                <div>
                  <label className={clsx(
                    'block text-sm font-medium mb-2',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                  )}>
                    New Cards Per Day: {newCardsPerDay}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={newCardsPerDay}
                    onChange={(e) => updateSettings({ newCardsPerDay: Number(e.target.value) })}
                    className={clsx(
                      'w-full h-2 rounded-lg appearance-none cursor-pointer',
                      isDarkMode 
                        ? 'bg-kanagawa-ink5 accent-accent-blue' 
                        : 'bg-gray-200 accent-primary-600'
                    )}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>1</span>
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>100</span>
                  </div>
                  <p className={clsx(
                    'text-xs mt-1',
                    isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                  )}>
                    How many new cards you want to learn each day
                  </p>
                </div>

                {/* Max Reviews Per Day */}
                <div>
                  <label className={clsx(
                    'block text-sm font-medium mb-2',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                  )}>
                    Max Reviews Per Day: {maxReviewsPerDay === 999 ? 'Unlimited' : maxReviewsPerDay}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="999"
                    value={maxReviewsPerDay}
                    onChange={(e) => updateSettings({ maxReviewsPerDay: Number(e.target.value) })}
                    className={clsx(
                      'w-full h-2 rounded-lg appearance-none cursor-pointer',
                      isDarkMode 
                        ? 'bg-kanagawa-ink5 accent-accent-blue' 
                        : 'bg-gray-200 accent-primary-600'
                    )}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>10</span>
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>Unlimited</span>
                  </div>
                  <p className={clsx(
                    'text-xs mt-1',
                    isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                  )}>
                    Maximum number of review cards per day
                  </p>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div>
              <h3 className={clsx(
                'text-sm font-medium mb-3',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                Advanced Settings
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Learn Ahead Time */}
                <div>
                  <label className={clsx(
                    'block text-sm font-medium mb-2',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                  )}>
                    Learn Ahead Time: {learnAheadTimeMinutes} min
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={learnAheadTimeMinutes}
                    onChange={(e) => updateSettings({ learnAheadTimeMinutes: Number(e.target.value) })}
                    className={clsx(
                      'w-full h-2 rounded-lg appearance-none cursor-pointer',
                      isDarkMode 
                        ? 'bg-kanagawa-ink5 accent-accent-blue' 
                        : 'bg-gray-200 accent-primary-600'
                    )}
                  />
                  <p className={clsx(
                    'text-xs mt-1',
                    isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                  )}>
                    How far ahead to show learning cards
                  </p>
                </div>

                {/* Desired Retention */}
                <div>
                  <label className={clsx(
                    'block text-sm font-medium mb-2',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                  )}>
                    Target Retention: {Math.round(desiredRetention * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.75"
                    max="0.98"
                    step="0.01"
                    value={desiredRetention}
                    onChange={(e) => updateSettings({ desiredRetention: Number(e.target.value) })}
                    className={clsx(
                      'w-full h-2 rounded-lg appearance-none cursor-pointer',
                      isDarkMode 
                        ? 'bg-kanagawa-ink5 accent-accent-blue' 
                        : 'bg-gray-200 accent-primary-600'
                    )}
                  />
                  <p className={clsx(
                    'text-xs mt-1',
                    isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                  )}>
                    Higher retention = more frequent reviews
                  </p>
                </div>
              </div>
            </div>

            {/* Learning Steps */}
            <div>
              <h3 className={clsx(
                'text-sm font-medium mb-3',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                Learning Steps (Failed Cards)
              </h3>
              
              <div className="space-y-4">
                {/* First Learning Step */}
                <div>
                  <label className={clsx(
                    'block text-sm font-medium mb-2',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                  )}>
                    First Step (Again): {learningSteps[0]} minutes
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={learningSteps[0] || 10}
                    onChange={(e) => {
                      const newSteps = [...learningSteps];
                      newSteps[0] = Number(e.target.value);
                      updateSettings({ learningSteps: newSteps });
                    }}
                    className={clsx(
                      'w-full h-2 rounded-lg appearance-none cursor-pointer',
                      isDarkMode 
                        ? 'bg-kanagawa-ink5 accent-accent-blue' 
                        : 'bg-gray-200 accent-primary-600'
                    )}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>1min</span>
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>60min</span>
                  </div>
                  <p className={clsx(
                    'text-xs mt-1',
                    isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                  )}>
                    How long to wait before showing failed cards again
                  </p>
                </div>

                {/* Second Learning Step */}
                <div>
                  <label className={clsx(
                    'block text-sm font-medium mb-2',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                  )}>
                    Second Step (Good): {learningSteps[1] || 0} minutes
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="180"
                    step="5"
                    value={learningSteps[1] || 30}
                    onChange={(e) => {
                      const newSteps = [...learningSteps];
                      newSteps[1] = Number(e.target.value);
                      updateSettings({ learningSteps: newSteps });
                    }}
                    className={clsx(
                      'w-full h-2 rounded-lg appearance-none cursor-pointer',
                      isDarkMode 
                        ? 'bg-kanagawa-ink5 accent-accent-blue' 
                        : 'bg-gray-200 accent-primary-600'
                    )}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>5min</span>
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>3hrs</span>
                  </div>
                  <p className={clsx(
                    'text-xs mt-1',
                    isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                  )}>
                    Final step before card becomes a review card
                  </p>
                </div>

                {/* Relearning Step */}
                <div>
                  <label className={clsx(
                    'block text-sm font-medium mb-2',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                  )}>
                    Relearning Step: {relearningSteps[0] || 15} minutes
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    step="5"
                    value={relearningSteps[0] || 15}
                    onChange={(e) => {
                      const newSteps = [Number(e.target.value)];
                      updateSettings({ relearningSteps: newSteps });
                    }}
                    className={clsx(
                      'w-full h-2 rounded-lg appearance-none cursor-pointer',
                      isDarkMode 
                        ? 'bg-kanagawa-ink5 accent-accent-blue' 
                        : 'bg-gray-200 accent-primary-600'
                    )}
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>5min</span>
                    <span className={isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'}>2hrs</span>
                  </div>
                  <p className={clsx(
                    'text-xs mt-1',
                    isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                  )}>
                    For cards you forgot after they became review cards
                  </p>
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div>
              <h3 className={clsx(
                'text-sm font-medium mb-3',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                Display Options
              </h3>
              
              <div className="space-y-3">
                {/* Show Progress */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showProgress}
                    onChange={(e) => updateSettings({ showProgress: e.target.checked })}
                    className={clsx(
                      'h-4 w-4 rounded border focus:ring-2 focus:ring-offset-2',
                      isDarkMode
                        ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-accent-blue focus:ring-accent-blue focus:ring-offset-kanagawa-ink4'
                        : 'border-gray-300 bg-white text-primary-600 focus:ring-primary-600 focus:ring-offset-white'
                    )}
                  />
                  <span className={clsx(
                    'ml-3 text-sm',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                  )}>
                    Show progress indicator during study sessions
                  </span>
                </label>
              </div>
            </div>

            {/* Info Panel */}
            <div className={clsx(
              'p-4 rounded-lg',
              isDarkMode 
                ? 'bg-blue-900/20 border border-blue-800' 
                : 'bg-blue-50 border border-blue-200'
            )}>
              <h4 className={clsx(
                'text-sm font-medium mb-2',
                isDarkMode ? 'text-blue-400' : 'text-blue-700'
              )}>
                About These Settings
              </h4>
              <ul className={clsx(
                'text-xs space-y-1',
                isDarkMode ? 'text-blue-300' : 'text-blue-600'
              )}>
                <li>• <strong>New cards:</strong> Brand new cards you haven't studied yet</li>
                <li>• <strong>Reviews:</strong> Cards you've seen before that are due for review</li>
                <li>• <strong>Learning steps:</strong> When you press "Again", card reappears after first step. Press "Good" to move to second step</li>
                <li>• <strong>Relearning:</strong> For review cards you forgot - they go through relearning steps</li>
                <li>• <strong>Learn ahead:</strong> Failed cards will reappear within this time window</li>
                <li>• <strong>Retention:</strong> Uses FSRS algorithm to optimize your study schedule</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Language Tools */}
        <LanguageToolsSection />

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

      </div>
    </div>
  );
}

function LanguageToolsSection() {
  const {
    theme,
    isSpellcheckEnabled,
    isGrammarCheckEnabled,
    grammarCheckLanguage,
    setSpellcheckEnabled,
    setGrammarCheckEnabled,
    setGrammarCheckLanguage,
  } = useAppStore();
  
  const [grammarServiceStatus, setGrammarServiceStatus] = useState<any>(null);
  const [supportedLanguages, setSupportedLanguages] = useState<any[]>([]);
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  useEffect(() => {
    const checkGrammarService = async () => {
      try {
        const grammarService = GrammarService.getInstance();
        const status = await grammarService.getStatus();
        setGrammarServiceStatus(status);
        
        if (status.initialized && status.serverRunning) {
          try {
            const languages = await grammarService.getSupportedLanguages();
            setSupportedLanguages(languages);
          } catch (error) {
            console.error('Failed to get supported languages:', error);
          }
        }
      } catch (error) {
        console.error('Failed to check grammar service:', error);
      }
    };
    
    checkGrammarService();
  }, [isGrammarCheckEnabled]);

  return (
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
        Language Tools
      </h2>
      
      <div className="space-y-6">
        {/* Spell Check */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={clsx(
                'text-sm font-medium',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Spell Check
              </h3>
              <p className={clsx(
                'text-xs mt-1',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )}>
                Uses your system's built-in spell checker
              </p>
            </div>
            <button
              onClick={() => setSpellcheckEnabled(!isSpellcheckEnabled)}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                isSpellcheckEnabled
                  ? 'bg-accent-blue focus:ring-accent-blue'
                  : isDarkMode 
                    ? 'bg-kanagawa-ink5 focus:ring-kanagawa-ink6' 
                    : 'bg-gray-200 focus:ring-gray-300'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition',
                  isSpellcheckEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>

        {/* Grammar Check */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={clsx(
                'text-sm font-medium',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Grammar Check
              </h3>
              <p className={clsx(
                'text-xs mt-1',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
              )}>
                {grammarServiceStatus?.serverRunning 
                  ? 'Advanced grammar checking with LanguageTool' 
                  : 'Requires Java and LanguageTool setup'
                }
              </p>
            </div>
            <button
              onClick={() => setGrammarCheckEnabled(!isGrammarCheckEnabled)}
              disabled={!grammarServiceStatus?.initialized || !grammarServiceStatus?.serverRunning}
              className={clsx(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                isGrammarCheckEnabled && grammarServiceStatus?.serverRunning
                  ? 'bg-accent-blue focus:ring-accent-blue'
                  : isDarkMode 
                    ? 'bg-kanagawa-ink5 focus:ring-kanagawa-ink6' 
                    : 'bg-gray-200 focus:ring-gray-300',
                (!grammarServiceStatus?.initialized || !grammarServiceStatus?.serverRunning) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={clsx(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition',
                  isGrammarCheckEnabled && grammarServiceStatus?.serverRunning ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {/* Language Selection */}
          {isGrammarCheckEnabled && supportedLanguages.length > 0 && (
            <div className="mt-4">
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
              )}>
                Grammar Check Language
              </label>
              <select
                value={grammarCheckLanguage}
                onChange={(e) => setGrammarCheckLanguage(e.target.value)}
                className={clsx(
                  'block w-full rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-kanagawa-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                )}
              >
                <option value="auto">Auto-detect</option>
                {supportedLanguages.map((lang, index) => (
                  <option key={`${lang.code}-${index}`} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Status Information */}
        {grammarServiceStatus && (
          <div className={clsx(
            'p-4 rounded-lg border',
            grammarServiceStatus.serverRunning
              ? isDarkMode 
                ? 'bg-emerald-900/20 border-emerald-800' 
                : 'bg-emerald-50 border-emerald-200'
              : isDarkMode
                ? 'bg-yellow-900/20 border-yellow-800'
                : 'bg-yellow-50 border-yellow-200'
          )}>
            <div className="flex items-start">
              <div className={clsx(
                'h-2 w-2 rounded-full mt-1.5 mr-3',
                grammarServiceStatus.serverRunning
                  ? isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500'
                  : isDarkMode ? 'bg-yellow-400' : 'bg-yellow-500'
              )} />
              <div>
                <h4 className={clsx(
                  'text-sm font-medium mb-1',
                  grammarServiceStatus.serverRunning
                    ? isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                    : isDarkMode ? 'text-yellow-400' : 'text-yellow-700'
                )}>
                  {grammarServiceStatus.serverRunning ? 'Grammar Service: Running' : 'Grammar Service: Not Available'}
                </h4>
                <p className={clsx(
                  'text-xs',
                  grammarServiceStatus.serverRunning
                    ? isDarkMode ? 'text-emerald-300' : 'text-emerald-600'
                    : isDarkMode ? 'text-yellow-300' : 'text-yellow-600'
                )}>
                  {grammarServiceStatus.serverRunning 
                    ? 'LanguageTool server is running and ready to check your text'
                    : grammarServiceStatus.error || 'Java is required to enable grammar checking'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts */}
        <div className={clsx(
          'p-3 rounded-lg',
          isDarkMode ? 'bg-kanagawa-ink5' : 'bg-gray-50'
        )}>
          <h4 className={clsx(
            'text-sm font-medium mb-2',
            isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
          )}>
            Keyboard Shortcuts
          </h4>
          <div className="space-y-1 text-xs">
            <div className={clsx(
              'flex justify-between',
              isDarkMode ? 'text-kanagawa-gray' : 'text-gray-600'
            )}>
              <span>Toggle Spell Check</span>
              <code className={clsx(
                'px-2 py-1 rounded',
                isDarkMode ? 'bg-kanagawa-ink4 text-kanagawa-oldwhite' : 'bg-gray-200 text-gray-800'
              )}>
                ⌘+Shift+;
              </code>
            </div>
            <div className={clsx(
              'flex justify-between',
              isDarkMode ? 'text-kanagawa-gray' : 'text-gray-600'
            )}>
              <span>Toggle Grammar Check</span>
              <code className={clsx(
                'px-2 py-1 rounded',
                isDarkMode ? 'bg-kanagawa-ink4 text-kanagawa-oldwhite' : 'bg-gray-200 text-gray-800'
              )}>
                ⌘+Shift+G
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}