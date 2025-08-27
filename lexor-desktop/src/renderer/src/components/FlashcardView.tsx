import React, { useState, useEffect } from 'react';
import { PlusIcon, DocumentTextIcon, PlayIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '../stores/appStore';
import { useFlashcardStore } from '../stores/flashcardStore';
import { clsx } from 'clsx';
import { DeckHierarchy } from './flashcards/DeckHierarchy';
import { CollectionGrid } from './flashcards/CollectionGrid';
import { StudyInterface } from './flashcards/StudyInterface';
import { Deck } from '../../../shared/types/flashcards';

type FlashcardViewMode = 'browse' | 'study';
type FlashcardLayoutMode = 'classic' | 'grid';

export function FlashcardView() {
  const { theme, currentDocument, documentContent } = useAppStore();
  const { 
    currentSession, 
    startStudySession, 
    importFromMarkdown,
    clearError,
    clearCompletionMessage,
    error,
    completionMessage,
    isLoading,
    resetFlashcardDatabase,
    discoverAndSyncLibrary,
    removeOrphanedDecks
  } = useFlashcardStore();
  
  const [viewMode, setViewMode] = useState<FlashcardViewMode>('browse');
  const [layoutMode, setLayoutMode] = useState<FlashcardLayoutMode>(() => {
    // Load from localStorage or default to 'classic'
    const saved = localStorage.getItem('flashcard-layout-mode');
    return (saved as FlashcardLayoutMode) || 'classic';
  });

  // Transition state for smooth switching
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextLayoutMode, setNextLayoutMode] = useState<FlashcardLayoutMode | null>(null);

  // Smooth layout mode switching with animation
  const switchLayoutMode = (newMode: FlashcardLayoutMode) => {
    if (newMode === layoutMode || isTransitioning) return;
    
    setIsTransitioning(true);
    setNextLayoutMode(newMode);
    
    // Wait for CSS fade out to complete, then switch content
    setTimeout(() => {
      setLayoutMode(newMode);
      localStorage.setItem('flashcard-layout-mode', newMode);
      
      // Immediately end transition so CSS can fade in
      setTimeout(() => {
        setIsTransitioning(false);
        setNextLayoutMode(null);
      }, 10); // Just a tiny delay to ensure state update
    }, 400); // Wait for CSS fade out (400ms)
  };

  // Listen for menu-triggered view changes
  useEffect(() => {
    const handleSwitchFlashcardView = (event: CustomEvent) => {
      const { viewMode } = event.detail;
      if (viewMode === 'classic' || viewMode === 'grid') {
        switchLayoutMode(viewMode);
      }
    };

    window.addEventListener('switchFlashcardView', handleSwitchFlashcardView as EventListener);
    return () => {
      window.removeEventListener('switchFlashcardView', handleSwitchFlashcardView as EventListener);
    };
  }, [layoutMode, isTransitioning]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isWatchingFile, setIsWatchingFile] = useState(false);
  
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

  // Switch to study mode when session starts, back to browse when it ends
  useEffect(() => {
    if (currentSession) {
      setViewMode('study');
    } else {
      // When session ends, return to browse mode
      setViewMode('browse');
    }
  }, [currentSession]);

  // Clear errors after some time
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // Clear completion messages after some time
  useEffect(() => {
    if (completionMessage) {
      const timer = setTimeout(() => clearCompletionMessage(), 8000); // Longer for positive messages
      return () => clearTimeout(timer);
    }
  }, [completionMessage, clearCompletionMessage]);

  // Clear success messages after some time
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

  const handleSelectDeck = (deck: Deck) => {
    setSelectedDeck(deck);
  };

  const handleStartStudy = async (deck: Deck, includeChildren?: boolean) => {
    setSelectedDeck(deck);
    // For collections (no file_path), always include children
    // For file-based decks, use the provided includeChildren parameter
    const shouldIncludeChildren = !deck.file_path || includeChildren || false;
    await startStudySession(deck.id, 'all', shouldIncludeChildren);
  };

  const handleStartStudyFromGrid = async (deck: Deck) => {
    // For collections (no file_path), always include children
    const shouldIncludeChildren = !deck.file_path;
    await startStudySession(deck.id, 'all', shouldIncludeChildren);
  };


  const handleStudyComplete = () => {
    setViewMode('browse');
    setSelectedDeck(null);
  };

  const handleStudyExit = () => {
    setViewMode('browse');
    setSelectedDeck(null);
  };

  const handleResetDatabase = async () => {
    if (window.confirm('This will delete ALL flashcards and reset the database. Are you sure?')) {
      await resetFlashcardDatabase();
    }
  };

  const handleDiscoverLibrary = async () => {
    const result = await discoverAndSyncLibrary();
    if (result.success) {
      let message = `Discovery complete! Processed ${result.filesProcessed} files, ` +
        `created ${result.decksCreated} decks, imported ${result.cardsImported} cards`;
      
      // Handle orphaned decks
      if (result.orphanedDecks.length > 0) {
        const shouldRemove = window.confirm(
          `Found ${result.orphanedDecks.length} deck(s) with missing source files:\n\n` +
          result.orphanedDecks.map(deck => `• ${deck.name} (${deck.filePath})`).join('\n') +
          `\n\nWould you like to remove these orphaned decks?\n\n` +
          `• YES = Clean sync (remove decks, lose study progress)\n` +
          `• NO = Keep decks (preserve study progress)`
        );
        
        if (shouldRemove) {
          const removeResult = await removeOrphanedDecks(result.orphanedDecks.map(d => d.id));
          if (removeResult.success) {
            message += `, removed ${removeResult.removed} orphaned decks`;
          } else {
            message += `, failed to remove orphaned decks: ${removeResult.errors.join(', ')}`;
          }
        } else {
          message += `, ${result.orphanedDecks.length} orphaned decks kept`;
        }
      }
      
      setSuccessMessage(message + ' ✓');
    } else {
      setSuccessMessage(`Discovery failed: ${result.errors.join(', ')}`);
    }
  };



  // Auto-sync on component mount
  useEffect(() => {
    const performAutoSync = async () => {
      try {
        await discoverAndSyncLibrary();
      } catch (error) {
        console.error('Auto-discovery failed:', error);
      }
    };

    // Delay the auto-sync slightly to let the UI load first
    const timer = setTimeout(performAutoSync, 1000);
    return () => clearTimeout(timer);
  }, []); // Run only on mount

  // Auto-sync on file save - watch current document for changes
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setupFileWatching = async () => {
      if (currentDocument && !isWatchingFile) {
        try {
          // Get the directory of the current file to watch
          const fileDir = currentDocument.substring(0, currentDocument.lastIndexOf('/'));
          
          // Start watching the directory
          await window.electronAPI.folder.watchDirectory(fileDir);
          setIsWatchingFile(true);

          // Set up the file change listener
          cleanup = window.electronAPI.folder.onFileChanged(async (changedFilePath) => {
            // Only sync if the changed file is the current document
            if (changedFilePath === currentDocument && documentContent) {
              try {
                console.log('File changed, auto-syncing:', changedFilePath);
                const success = await importFromMarkdown(currentDocument, documentContent);
                if (success) {
                  setSuccessMessage('Flashcards auto-synced ✓');
                }
              } catch (error) {
                console.error('Auto-sync failed:', error);
              }
            }
          });
        } catch (error) {
          console.error('Failed to setup file watching:', error);
        }
      }
    };

    setupFileWatching();

    // Cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
      if (isWatchingFile && currentDocument) {
        const fileDir = currentDocument.substring(0, currentDocument.lastIndexOf('/'));
        window.electronAPI.folder.unwatchDirectory(fileDir).catch(console.error);
        setIsWatchingFile(false);
      }
    };
  }, [currentDocument, documentContent, importFromMarkdown, isWatchingFile]);

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
      'h-full flex flex-col',
      isDarkMode ? 'bg-kanagawa-ink3' : 'bg-gray-50'
    )}>
      {/* Main content area with smooth transitions */}
      <div className="flex-1 flex relative overflow-hidden">
        <div 
          className={clsx(
            'absolute inset-0 flex transition-all duration-400 ease-in-out',
            isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
          )}
          style={{ 
            transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
            transitionProperty: 'opacity, transform',
          }}
        >
          {layoutMode === 'classic' ? (
            <>
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

              {/* Classic view content */}
              <div className="flex-1 flex flex-col">
              {/* Error notification */}
              {error && (
                <div className={clsx(
                  'mx-6 mt-6 p-4 rounded-lg border-l-4 border-red-400',
                  isDarkMode 
                    ? 'bg-red-900 bg-opacity-20 text-red-300' 
                    : 'bg-red-50 text-red-700'
                )}>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Completion message notification - positive styling */}
              {completionMessage && (
                <div className={clsx(
                  'mx-6 mt-6 p-4 rounded-lg border-l-4 border-green-400',
                  isDarkMode 
                    ? 'bg-green-900 bg-opacity-20 text-green-300' 
                    : 'bg-green-50 text-green-700'
                )}>
                  <p className="text-sm">{completionMessage}</p>
                </div>
              )}

              {/* Success notification */}
              {successMessage && (
                <div className={clsx(
                  'mx-6 mt-6 p-4 rounded-lg border-l-4 border-green-400',
                  isDarkMode 
                    ? 'bg-green-900 bg-opacity-20 text-green-300' 
                    : 'bg-green-50 text-green-700'
                )}>
                  <p className="text-sm">{successMessage}</p>
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
                            {selectedDeck.collection_path && (
                              <p className={clsx(
                                'text-xs mt-1',
                                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-500'
                              )}>
                                Collection: {selectedDeck.collection_path}
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

                        <div className="flex items-center space-x-3">
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
                            <span>{selectedDeck.file_path ? 'Study This Deck' : 'Study Collection'}</span>
                          </button>
                        </div>
                      </div>
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
                  </div>
                )}
              </div>
            </div>
            </>
          ) : (
            /* Grid view */
            <div className="flex-1 flex flex-col">
              {/* Error notification */}
              {error && (
                <div className={clsx(
                  'mx-6 mt-6 p-4 rounded-lg border-l-4 border-red-400',
                  isDarkMode 
                    ? 'bg-red-900 bg-opacity-20 text-red-300' 
                    : 'bg-red-50 text-red-700'
                )}>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Completion message notification - positive styling */}
              {completionMessage && (
                <div className={clsx(
                  'mx-6 mt-6 p-4 rounded-lg border-l-4 border-green-400',
                  isDarkMode 
                    ? 'bg-green-900 bg-opacity-20 text-green-300' 
                    : 'bg-green-50 text-green-700'
                )}>
                  <p className="text-sm">{completionMessage}</p>
                </div>
              )}

              {/* Success notification */}
              {successMessage && (
                <div className={clsx(
                  'mx-6 mt-6 p-4 rounded-lg border-l-4 border-green-400',
                  isDarkMode 
                    ? 'bg-green-900 bg-opacity-20 text-green-300' 
                    : 'bg-green-50 text-green-700'
                )}>
                  <p className="text-sm">{successMessage}</p>
                </div>
              )}

              {/* Collection Grid */}
              <CollectionGrid onStartStudy={handleStartStudyFromGrid} />
            </div>
        )}
        </div>
      </div>
    </div>
  );
}