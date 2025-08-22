import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
    initializeLexorLibrary
  } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);

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
            } catch (error) {
              console.warn('Failed to initialize Lexor Library:', error);
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
  }, [isLibraryInitialized, initializeLexorLibrary]);

  // Set up menu handlers
  useMenuHandlers();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Lexor...</p>
        </div>
      </div>
    );
  }

  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <Router>
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
            <Routes>
              <Route path="/" element={<MarkdownEditor />} />
              <Route path="/editor" element={<MarkdownEditor />} />
              <Route path="/flashcards" element={<FlashcardView />} />
              <Route path="/study" element={<StudySession />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;