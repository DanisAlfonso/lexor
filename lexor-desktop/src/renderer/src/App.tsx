import React, { useEffect, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TitleBar } from './components/TitleBar';
import { MarkdownEditor } from './components/MarkdownEditor';
import { FlashcardView } from './components/FlashcardView';
import { StudySession } from './components/StudySession';
import { Settings } from './components/Settings';
import { useAppStore } from './stores/appStore';
import { useMenuHandlers } from './hooks/useMenuHandlers';
import { clsx } from 'clsx';

function App() {
  const { 
    currentView, 
    isFocusMode, 
    sidebarCollapsed, 
    theme,
    isLibraryInitialized,
    initializeLexorLibrary,
    autoOpenAppropriateDocument
  } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [systemIsDark, setSystemIsDark] = useState(() => {
    // Only check system theme if we're in browser environment
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Initialize the app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get app info if available
        if (window.electronAPI) {
          try {
            const version = await window.electronAPI.app.getVersion();
            const name = await window.electronAPI.app.getName();
            console.log(`${name} v${version} initialized`);
          } catch (error) {
            console.warn('Failed to get app info:', error);
          }

          // Initialize Lexor Library if not already initialized
          if (!isLibraryInitialized) {
            try {
              await initializeLexorLibrary();
              console.log('Lexor Library initialized');
              
              // Auto-open appropriate document after library initialization
              await autoOpenAppropriateDocument();
            } catch (error) {
              console.warn('Failed to initialize Lexor Library:', error);
            }
          } else {
            // Library already initialized, auto-open appropriate document
            try {
              await autoOpenAppropriateDocument();
            } catch (error) {
              console.warn('Failed to auto-open document:', error);
            }
          }
        } else {
          console.warn('electronAPI not available - running in browser mode');
        }
        
        // Always set loading to false after a short delay
        setTimeout(() => setIsLoading(false), 200);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [isLibraryInitialized, initializeLexorLibrary, autoOpenAppropriateDocument]);

  // Listen for OS theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Set up menu handlers
  useMenuHandlers();

  // Calculate dark mode for loading screen too
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemIsDark);

  if (isLoading) {
    return (
      <div className={clsx(
        "h-screen w-screen flex items-center justify-center",
        isDarkMode ? "bg-kanagawa-ink3 text-kanagawa-white" : "bg-gray-50 text-gray-900"
      )}>
        <div className="text-center">
          <div className={clsx(
            "animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4",
            isDarkMode ? "border-kanagawa-oldwhite" : "border-primary-600"
          )}></div>
          <p className={clsx(
            isDarkMode ? "text-kanagawa-oldwhite" : "text-gray-600"
          )}>Loading Lexor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx(
      "h-screen w-screen flex flex-col overflow-hidden",
      isDarkMode ? "bg-kanagawa-ink3 text-kanagawa-white" : "bg-gray-50 text-gray-900"
    )}>
      {/* Custom title bar for macOS - hidden in focus mode */}
      {!isFocusMode && <TitleBar />}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden in focus mode */}
        {!isFocusMode && <Sidebar />}
        
        {/* Main content area */}
        <div className={clsx(
          'flex-1 flex flex-col transition-all duration-300',
          !isFocusMode && (sidebarCollapsed ? 'ml-0' : 'ml-64'),
          isFocusMode && 'ml-0' // Full width in focus mode
        )}>
          {currentView === 'editor' && <MarkdownEditor />}
          {currentView === 'flashcards' && <FlashcardView />}
          {currentView === 'study' && <StudySession />}
          {currentView === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
}

export default App;