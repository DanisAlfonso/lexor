import React, { useState, useEffect } from 'react';
import { PlusIcon, DocumentTextIcon, PlayIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../stores/appStore';
import { useFlashcardStore } from '../stores/flashcardStore';
import { clsx } from 'clsx';
import { DeckHierarchy } from './flashcards/DeckHierarchy';
import { StudyInterface } from './flashcards/StudyInterface';
import { Deck } from '../../../shared/types/flashcards';

type FlashcardViewMode = 'browse' | 'study';

export function FlashcardView() {
  const { theme, currentDocument, documentContent } = useAppStore();
  const { 
    currentSession, 
    startStudySession, 
    importFromMarkdown,
    clearError,
    error,
    isLoading
  } = useFlashcardStore();
  
  const [viewMode, setViewMode] = useState<FlashcardViewMode>('browse');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  
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

  // Switch to study mode when session starts
  useEffect(() => {
    if (currentSession) {
      setViewMode('study');
    }
  }, [currentSession]);

  // Clear errors after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  const handleImportFromCurrentFile = async () => {
    if (!currentDocument || !documentContent) {
      // Show error notification
      return;
    }

    const success = await importFromMarkdown(currentDocument, documentContent);
    if (success) {
      // Show success notification
      console.log('Successfully imported flashcards from current file');
    }
  };

  const handleSelectDeck = (deck: Deck) => {
    setSelectedDeck(deck);
  };

  const handleStartStudy = async (deck: Deck, includeChildren: boolean) => {
    setSelectedDeck(deck);
    await startStudySession(deck.id, 'all', includeChildren);
  };

  const handleStudyComplete = () => {
    setViewMode('browse');
    setSelectedDeck(null);
  };

  const handleStudyExit = () => {
    setViewMode('browse');
    setSelectedDeck(null);
  };

  // Show study interface when in study mode
  if (viewMode === 'study') {
    return (
      <StudyInterface
        onComplete={handleStudyComplete}
        onExit={handleStudyExit}
      />
    );
  }
  
  return (
    <div className={clsx(
      'h-full flex',
      isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
    )}>
      {/* Sidebar with deck hierarchy */}
      <div className={clsx(
        'w-80 border-r',
        isDarkMode ? 'border-kanagawa-ink5' : 'border-gray-200'
      )}>
        <DeckHierarchy
          onSelectDeck={handleSelectDeck}
          onStartStudy={handleStartStudy}
          showActions={true}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={clsx(
          'flex items-center justify-between p-6 border-b',
          isDarkMode ? 'border-kanagawa-ink5' : 'border-gray-200'
        )}>
          <div>
            <h1 className={clsx(
              'text-2xl font-bold',
              isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
            )}>
              {selectedDeck ? selectedDeck.name : 'Flashcards'}
            </h1>
            <p className={clsx(
              'text-sm mt-1',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
            )}>
              {selectedDeck 
                ? `Collection: ${selectedDeck.collection_path || selectedDeck.name}`
                : 'Manage your flashcard collections and study sessions'
              }
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {currentDocument && (
              <button
                onClick={handleImportFromCurrentFile}
                disabled={isLoading}
                className={clsx(
                  'flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                  isLoading
                    ? isDarkMode
                      ? 'bg-kanagawa-ink5 text-kanagawa-gray cursor-not-allowed'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-kanagawa-ink5 hover:bg-kanagawa-ink4 text-kanagawa-oldwhite'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                )}
              >
                <DocumentTextIcon className="h-4 w-4" />
                <span>{isLoading ? 'Importing...' : 'Import from Current File'}</span>
              </button>
            )}

            <button
              onClick={() => {
                // TODO: Implement create new collection
              }}
              className={clsx(
                'flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                isDarkMode 
                  ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3' 
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              )}
            >
              <PlusIcon className="h-4 w-4" />
              <span>New Collection</span>
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className={clsx(
            'mx-6 mt-4 p-4 rounded-lg border-l-4 border-red-400',
            isDarkMode 
              ? 'bg-red-900 bg-opacity-20 text-red-300' 
              : 'bg-red-50 text-red-700'
          )}>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 p-6">
          {selectedDeck ? (
            // Deck details view
            <div className="max-w-4xl mx-auto">
              <div className={clsx(
                'rounded-xl p-6 mb-6',
                isDarkMode ? 'bg-kanagawa-ink4' : 'bg-white'
              )}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div
                      className="p-3 rounded-lg mr-4"
                      style={{ backgroundColor: `${selectedDeck.color || '#6B7280'}20` }}
                    >
                      {selectedDeck.is_collection ? (
                        <PlusIcon 
                          className="h-6 w-6" 
                          style={{ color: selectedDeck.color || '#6B7280' }}
                        />
                      ) : (
                        <DocumentTextIcon 
                          className="h-6 w-6" 
                          style={{ color: selectedDeck.color || '#6B7280' }}
                        />
                      )}
                    </div>
                    <div>
                      <h2 className={clsx(
                        'text-xl font-semibold',
                        isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                      )}>
                        {selectedDeck.name}
                      </h2>
                      {selectedDeck.description && (
                        <p className={clsx(
                          'text-sm mt-1',
                          isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                        )}>
                          {selectedDeck.description}
                        </p>
                      )}
                      <div className={clsx(
                        'flex items-center space-x-4 mt-2 text-sm',
                        isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-500'
                      )}>
                        <span>{selectedDeck.card_count || 0} cards</span>
                        {selectedDeck.file_path && (
                          <span>• Linked to file</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStartStudy(selectedDeck, false)}
                    className={clsx(
                      'flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200',
                      'hover:scale-105 active:scale-95',
                      isDarkMode 
                        ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3' 
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    )}
                  >
                    <PlayIcon className="h-5 w-5" />
                    <span>Study Now</span>
                  </button>
                </div>
              </div>

              {/* Study options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={clsx(
                  'p-6 rounded-xl border',
                  isDarkMode 
                    ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
                    : 'bg-white border-gray-200'
                )}>
                  <h3 className={clsx(
                    'text-lg font-semibold mb-2',
                    isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                  )}>
                    Quick Study
                  </h3>
                  <p className={clsx(
                    'mb-4 text-sm',
                    isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                  )}>
                    Review cards that are due for today
                  </p>
                  <button 
                    onClick={() => handleStartStudy(selectedDeck, false)}
                    className={clsx(
                      'w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-colors duration-200',
                      isDarkMode 
                        ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3' 
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    )}
                  >
                    <PlayIcon className="h-4 w-4" />
                    <span>Study This Deck</span>
                  </button>
                </div>

                {selectedDeck.children && selectedDeck.children.length > 0 && (
                  <div className={clsx(
                    'p-6 rounded-xl border',
                    isDarkMode 
                      ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
                      : 'bg-white border-gray-200'
                  )}>
                    <h3 className={clsx(
                      'text-lg font-semibold mb-2',
                      isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                    )}>
                      Collection Study
                    </h3>
                    <p className={clsx(
                      'mb-4 text-sm',
                      isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
                    )}>
                      Study all cards in this collection and its subcollections
                    </p>
                    <button 
                      onClick={() => handleStartStudy(selectedDeck, true)}
                      className={clsx(
                        'w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-colors duration-200',
                        isDarkMode 
                          ? 'bg-kanagawa-ink5 hover:bg-kanagawa-ink4 text-kanagawa-oldwhite' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                      )}
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Study Collection</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Welcome view
            <div className="max-w-2xl mx-auto text-center py-12">
              <DocumentTextIcon className={clsx(
                'mx-auto h-16 w-16 mb-6',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-400'
              )} />
              <h2 className={clsx(
                'text-2xl font-semibold mb-4',
                isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
              )}>
                Welcome to Flashcards
              </h2>
              <p className={clsx(
                'mb-8',
                isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-600'
              )}>
                Create flashcards directly in your markdown files using the Flash notation, 
                or select a collection from the sidebar to start studying.
              </p>
              
              <div className={clsx(
                'text-left p-4 rounded-lg mb-8',
                isDarkMode ? 'bg-kanagawa-ink4' : 'bg-gray-100'
              )}>
                <h4 className={clsx(
                  'font-semibold mb-2',
                  isDarkMode ? 'text-kanagawa-white' : 'text-gray-900'
                )}>
                  Flashcard Syntax:
                </h4>
                <pre className={clsx(
                  'text-sm',
                  isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-700'
                )}>
{`## Flash: What is the capital of France?
### Answer: Paris

## Flash: Explain photosynthesis
### Answer: The process where plants convert sunlight into energy`}
                </pre>
              </div>

              {currentDocument && (
                <button
                  onClick={handleImportFromCurrentFile}
                  disabled={isLoading}
                  className={clsx(
                    'px-6 py-3 rounded-lg font-medium transition-colors duration-200',
                    isLoading
                      ? isDarkMode
                        ? 'bg-kanagawa-ink5 text-kanagawa-gray cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : isDarkMode
                        ? 'bg-accent-blue hover:bg-primary-700 text-kanagawa-ink3'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                  )}
                >
                  {isLoading ? 'Importing...' : 'Import from Current File'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}