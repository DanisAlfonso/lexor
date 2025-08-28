import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore, ViewType } from '../stores/appStore';
import { 
  DocumentTextIcon, 
  AcademicCapIcon, 
  ChartBarIcon, 
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { FolderBrowser } from './FolderBrowser';

const navigationItems = [
  { id: 'editor' as ViewType, label: 'Editor', icon: DocumentTextIcon, path: '/editor' },
  { id: 'flashcards' as ViewType, label: 'Flashcards', icon: AcademicCapIcon, path: '/flashcards' },
  { id: 'study' as ViewType, label: 'Analytics', icon: ChartBarIcon, path: '/study' },
  { id: 'settings' as ViewType, label: 'Settings', icon: Cog6ToothIcon, path: '/settings' },
];

export function Sidebar() {
  const { 
    sidebarCollapsed, 
    setCurrentView, 
    toggleSidebar, 
    theme,
    setCurrentDocument,
    setDocumentContent,
    setDocumentModified,
    currentFolder,
    setLivePreviewEnabled
  } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleNavigation = (item: typeof navigationItems[0]) => {
    setCurrentView(item.id);
    navigate(item.path);
  };

  const handleFileSelect = async (filePath: string) => {
    try {
      // Check if this is an audio file
      const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.aiff'];
      const fileExtension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
      
      if (audioExtensions.includes(fileExtension)) {
        // Handle audio file - create an audio player widget without reading the file
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const audioContent = `# Playing: ${fileName}

[audio: ${fileName}](${filePath})

---

*To play this audio file, switch to **Preview** mode by selecting View → Preview or pressing **Shift+⌘+P**.*`;
        
        setCurrentDocument(filePath);
        setDocumentContent(audioContent);
        setDocumentModified(false);
        
        // Enable live preview mode to show the audio player
        setLivePreviewEnabled(true);
        
        // Navigate to editor view to show the audio player
        setCurrentView('editor');
        navigate('/editor');
      } else {
        // Handle regular text files
        // Set the current document
        setCurrentDocument(filePath);
        
        // Read the file content
        const content = await window.electronAPI?.file?.readFile(filePath);
        if (content !== undefined) {
          setDocumentContent(content);
          setDocumentModified(false);
        }
        
        // Navigate to editor view
        setCurrentView('editor');
        navigate('/editor');
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };
  
  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className={clsx(
      'fixed left-0 top-0 h-full transition-all duration-300 z-10 w-64',
      sidebarCollapsed ? '-translate-x-full' : 'translate-x-0',
      // Account for macOS title bar
      window.electronAPI?.platform.isMac ? 'pt-12' : 'pt-0',
      // Theme colors
      isDarkMode 
        ? 'bg-kanagawa-ink1 border-kanagawa-ink4 text-kanagawa-white' 
        : 'bg-white border-gray-200 text-gray-900',
      'border-r'
    )}>

      {/* Navigation */}
      <nav className="mt-4 px-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item)}
                  className={clsx(
                    'w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors',
                    isDarkMode ? 'hover:bg-kanagawa-ink4' : 'hover:bg-gray-100',
                    isActive 
                      ? isDarkMode 
                        ? 'bg-kanagawa-ink5 text-accent-blue' 
                        : 'bg-primary-100 text-primary-700'
                      : isDarkMode
                        ? 'text-kanagawa-oldwhite'
                        : 'text-gray-700'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="ml-3">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Folder Browser */}
      {currentFolder && (
        <div className="mt-8">
          <h3 className={clsx(
            "text-xs font-semibold uppercase tracking-wide mb-3 px-4",
            isDarkMode ? "text-kanagawa-gray" : "text-gray-500"
          )}>
            Folder Browser
          </h3>
          <FolderBrowser onFileSelect={handleFileSelect} />
        </div>
      )}

    </div>
  );
}