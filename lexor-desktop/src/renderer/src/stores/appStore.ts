import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

export type ViewType = 'editor' | 'flashcards' | 'study' | 'settings';

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  isDirectory: boolean;
  extension?: string;
  depth?: number;
  children?: FileItem[];
}

export interface AppState {
  // UI State
  currentView: ViewType;
  sidebarCollapsed: boolean;
  isFocusMode: boolean;
  zoomLevel: number;
  isLivePreviewEnabled: boolean;
  
  // Document State
  currentDocument: string | null;
  documentContent: string;
  isDocumentModified: boolean;

  // Split Screen State
  isSplitScreenMode: boolean;
  rightPaneDocument: string | null;
  rightPaneContent: string;
  isRightPaneModified: boolean;
  focusedPane: 'left' | 'right';
  splitRatio: number; // 0.5 = equal split, 0.3 = left smaller, 0.7 = left larger

  // Folder State
  currentFolder: string | null;
  rootFolder: string | null;
  folderContents: FileItem[];
  isLoadingFolder: boolean;
  selectedItem: FileItem | null;

  // Lexor Library State
  libraryFolder: string | null;
  isLibraryInitialized: boolean;
  isCurrentFolderLibrary: boolean;
  
  // User Experience State
  isFirstTimeUser: boolean;
  lastOpenedDocument: string | null;
  hasLaunchedBefore: boolean;
  
  // Preferences
  theme: 'light' | 'dark' | 'system';
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  showScrollbar: boolean;
  
  // Actions
  setCurrentView: (view: ViewType) => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  setZoomLevel: (level: number) => void;
  setLivePreviewEnabled: (enabled: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  
  setCurrentDocument: (path: string | null) => void;
  setDocumentContent: (content: string) => void;
  setDocumentModified: (modified: boolean) => void;

  // Split Screen Actions
  toggleSplitScreen: () => void;
  closeSplitScreen: () => void;
  setFocusedPane: (pane: 'left' | 'right') => void;
  setSplitRatio: (ratio: number) => void;
  setRightPaneDocument: (path: string | null) => void;
  setRightPaneContent: (content: string) => void;
  setRightPaneModified: (modified: boolean) => void;
  openInRightPane: (filePath: string) => Promise<void>;
  swapPanes: () => void;
  
  setCurrentFolder: (path: string | null) => void;
  setRootFolder: (path: string | null) => void;
  setFolderContents: (contents: FileItem[]) => void;
  setLoadingFolder: (loading: boolean) => void;
  setSelectedItem: (item: FileItem | null) => void;
  loadFolderContents: (folderPath: string) => Promise<void>;
  focusEditor: () => void;

  setLibraryFolder: (path: string | null) => void;
  setLibraryInitialized: (initialized: boolean) => void;
  initializeLexorLibrary: () => Promise<string>;
  openLexorLibrary: () => Promise<void>;
  isPathInLibrary: (path: string) => boolean;
  
  setFirstTimeUser: (isFirstTime: boolean) => void;
  setLastOpenedDocument: (path: string | null) => void;
  setHasLaunchedBefore: (launched: boolean) => void;
  autoOpenAppropriateDocument: () => Promise<void>;
  openDocumentAndNavigate: (filePath: string) => Promise<void>;
  ensureWelcomeFileAndOpen: (welcomePath: string) => Promise<void>;
  createWelcomeFile: (welcomePath: string) => Promise<boolean>;
  
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setFontSize: (size: number) => void;
  setLineHeight: (height: number) => void;
  setFontFamily: (family: string) => void;
  setShowScrollbar: (show: boolean) => void;
  toggleScrollbar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'editor',
      sidebarCollapsed: false,
      isFocusMode: false,
      zoomLevel: 100,
      isLivePreviewEnabled: false,
      
      currentDocument: null,
      documentContent: '',
      isDocumentModified: false,

      isSplitScreenMode: false,
      rightPaneDocument: null,
      rightPaneContent: '',
      isRightPaneModified: false,
      focusedPane: 'left',
      splitRatio: 0.5,

      currentFolder: null,
      rootFolder: null,
      folderContents: [],
      isLoadingFolder: false,
      selectedItem: null,

      libraryFolder: null,
      isLibraryInitialized: false,
      isCurrentFolderLibrary: false,
      
      isFirstTimeUser: true,
      lastOpenedDocument: null,
      hasLaunchedBefore: false,
      
      theme: 'system',
      fontSize: 16,
      lineHeight: 1.6,
      fontFamily: 'SF Mono',
      showScrollbar: true,
      
      // Actions
      setCurrentView: (view) => set({ currentView: view }),
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      setLivePreviewEnabled: (enabled) => set({ isLivePreviewEnabled: enabled }),
      
      toggleFocusMode: () => {
        const newFocusMode = !get().isFocusMode;
        set({ isFocusMode: newFocusMode });
        
        // Communicate focus mode change to Electron main process
        if (window.electronAPI && window.electronAPI.platform?.isMac) {
          // Send focus mode state to main process for title bar handling
          try {
            window.electronAPI.window?.setFocusMode?.(newFocusMode);
          } catch (error) {
            console.warn('Failed to communicate focus mode to main process:', error);
          }
        }
      },
      
      
      setZoomLevel: (level) => {
        const clampedLevel = Math.max(50, Math.min(200, level));
        set({ zoomLevel: clampedLevel });
      },
      
      zoomIn: () => {
        const currentLevel = get().zoomLevel;
        const newLevel = Math.min(200, currentLevel + 10);
        set({ zoomLevel: newLevel });
      },
      
      zoomOut: () => {
        const currentLevel = get().zoomLevel;
        const newLevel = Math.max(50, currentLevel - 10);
        set({ zoomLevel: newLevel });
      },
      
      resetZoom: () => set({ zoomLevel: 100 }),
      
      setCurrentDocument: (path) => {
        set({ currentDocument: path });
        // Track last opened document when opening a file
        if (path) {
          get().setLastOpenedDocument(path);
        }
        // Set global variable for relative path resolution in media
        (window as any).__lexor_current_document__ = path;
      },
      
      setDocumentContent: (content) => {
        const state = get();
        set({ 
          documentContent: content,
          isDocumentModified: true
        });
        
        // If both panes show the same document, keep modification state in sync
        if (state.isSplitScreenMode && state.currentDocument === state.rightPaneDocument) {
          set({ isRightPaneModified: true });
        }
      },
      
      setDocumentModified: (modified) => set({ 
        isDocumentModified: modified 
      }),

      // Split Screen Actions
      toggleSplitScreen: () => {
        const state = get();
        if (state.isSplitScreenMode) {
          // Close split screen
          get().closeSplitScreen();
        } else {
          // Open split screen with current document in both panes
          set({ 
            isSplitScreenMode: true,
            rightPaneDocument: state.currentDocument,
            rightPaneContent: state.documentContent,
            isRightPaneModified: false,
            focusedPane: 'left',
            // Disable preview mode when entering split screen
          });
        }
      },

      closeSplitScreen: () => set({ 
        isSplitScreenMode: false,
        rightPaneDocument: null,
        rightPaneContent: '',
        isRightPaneModified: false,
        focusedPane: 'left'
      }),

      setFocusedPane: (pane) => set({ focusedPane: pane }),
      
      setSplitRatio: (ratio) => {
        const clampedRatio = Math.max(0.2, Math.min(0.8, ratio));
        set({ splitRatio: clampedRatio });
      },

      setRightPaneDocument: (path) => {
        set({ rightPaneDocument: path });
        if (path) {
          get().setLastOpenedDocument(path);
        }
      },

      setRightPaneContent: (content) => {
        const state = get();
        set({ 
          rightPaneContent: content,
          isRightPaneModified: true
        });
        
        // If both panes show the same document, keep modification state in sync
        if (state.currentDocument === state.rightPaneDocument) {
          set({ isDocumentModified: true });
        }
      },

      setRightPaneModified: (modified) => set({ 
        isRightPaneModified: modified 
      }),

      openInRightPane: async (filePath: string) => {
        try {
          // Read the file content
          const content = await window.electronAPI?.file?.readFile(filePath);
          if (content !== undefined) {
            set({
              rightPaneDocument: filePath,
              rightPaneContent: content,
              isRightPaneModified: false,
              focusedPane: 'right'
            });
            
            // Track as last opened document
            get().setLastOpenedDocument(filePath);
          }
        } catch (error) {
          console.error('Failed to open file in right pane:', filePath, error);
        }
      },

      swapPanes: () => {
        const state = get();
        if (!state.isSplitScreenMode) return;
        
        set({
          // Swap documents
          currentDocument: state.rightPaneDocument,
          documentContent: state.rightPaneContent,
          isDocumentModified: state.isRightPaneModified,
          
          rightPaneDocument: state.currentDocument,
          rightPaneContent: state.documentContent,
          isRightPaneModified: state.isDocumentModified,
          
          // Keep focus on same side but swap the content
          focusedPane: state.focusedPane
        });
      },

      setCurrentFolder: (path) => set({ currentFolder: path }),
      setRootFolder: (path) => set({ rootFolder: path }),
      setFolderContents: (contents) => set({ folderContents: contents }),
      setLoadingFolder: (loading) => set({ isLoadingFolder: loading }),
      setSelectedItem: (item) => set({ selectedItem: item }),
      
      loadFolderContents: async (folderPath: string) => {
        set({ isLoadingFolder: true });
        try {
          if (window.electronAPI?.folder?.readDirectory) {
            const contents = await window.electronAPI.folder.readDirectory(folderPath);
            const state = get();
            const isLibraryPath = state.libraryFolder && folderPath.startsWith(state.libraryFolder);
            set({ 
              folderContents: contents,
              currentFolder: folderPath,
              rootFolder: state.rootFolder || folderPath, // Set root folder on first load
              isCurrentFolderLibrary: isLibraryPath,
              isLoadingFolder: false 
            });
          }
        } catch (error) {
          console.error('Failed to load folder contents:', error);
          set({ 
            folderContents: [],
            isLoadingFolder: false 
          });
        }
      },

      setLibraryFolder: (path) => set({ libraryFolder: path }),
      setLibraryInitialized: (initialized) => set({ isLibraryInitialized: initialized }),

      initializeLexorLibrary: async () => {
        try {
          // Get default library path
          const defaultLibraryPath = await window.electronAPI?.library?.getDefaultPath();
          if (!defaultLibraryPath) {
            throw new Error('Failed to get default library path');
          }

          // Create library folder if it doesn't exist
          const libraryPath = await window.electronAPI?.library?.initialize(defaultLibraryPath);
          if (!libraryPath) {
            throw new Error('Failed to initialize library');
          }

          set({ 
            libraryFolder: libraryPath,
            isLibraryInitialized: true 
          });

          return libraryPath;
        } catch (error) {
          console.error('Failed to initialize Lexor Library:', error);
          throw error;
        }
      },

      openLexorLibrary: async () => {
        const state = get();
        if (!state.libraryFolder) {
          await get().initializeLexorLibrary();
        }
        
        if (state.libraryFolder) {
          // Set root folder to library when opening library
          set({ rootFolder: state.libraryFolder });
          await get().loadFolderContents(state.libraryFolder);
        }
      },

      isPathInLibrary: (path: string) => {
        const state = get();
        return state.libraryFolder ? path.startsWith(state.libraryFolder) : false;
      },

      setFirstTimeUser: (isFirstTime) => set({ isFirstTimeUser: isFirstTime }),
      setLastOpenedDocument: (path) => set({ lastOpenedDocument: path }),
      setHasLaunchedBefore: (launched) => set({ hasLaunchedBefore: launched }),

      autoOpenAppropriateDocument: async () => {
        const state = get();
        const { libraryFolder, isFirstTimeUser, lastOpenedDocument, hasLaunchedBefore } = state;
        
        try {
          // Mark as launched to prevent this from running again
          if (!hasLaunchedBefore) {
            get().setHasLaunchedBefore(true);
            get().setFirstTimeUser(true);
          }

          // Check if we have a library
          if (!libraryFolder) {
            console.log('No library folder available');
            return;
          }

          const welcomePath = `${libraryFolder}/Welcome.md`;

          // First-time users: Always open Welcome.md
          if (isFirstTimeUser || !hasLaunchedBefore) {
            console.log('Opening Welcome.md for first-time user');
            await get().ensureWelcomeFileAndOpen(welcomePath);
            get().setFirstTimeUser(false);
            return;
          }

          // Returning users: Try to open last document
          if (lastOpenedDocument) {
            try {
              // Check if last document still exists
              // For audio files, we just check if we can access the file, not read its content
              const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.aiff'];
              const fileExtension = lastOpenedDocument.toLowerCase().substring(lastOpenedDocument.lastIndexOf('.'));
              
              if (audioExtensions.includes(fileExtension)) {
                // For audio files, just check if file exists by attempting to read it and catching the error
                // We don't care about the content for audio files
                try {
                  await window.electronAPI?.file?.readFile(lastOpenedDocument);
                  // If we get here, the file exists, so open it
                  console.log('Opening last audio document:', lastOpenedDocument);
                  await get().openDocumentAndNavigate(lastOpenedDocument);
                  return;
                } catch (audioError) {
                  console.log('Last audio document no longer exists or cannot be accessed:', lastOpenedDocument);
                }
              } else {
                // For regular text files, read the content as before
                const content = await window.electronAPI?.file?.readFile(lastOpenedDocument);
                if (content !== undefined) {
                  console.log('Opening last document:', lastOpenedDocument);
                  await get().openDocumentAndNavigate(lastOpenedDocument);
                  return;
                }
              }
            } catch (error) {
              console.log('Last document no longer exists:', lastOpenedDocument);
            }
          }

          // Fallback: Check if library is empty, if so open Welcome.md
          await get().loadFolderContents(libraryFolder);
          const { folderContents } = get();
          
          if (folderContents.length === 0) { 
            // Completely empty library - recreate Welcome.md
            console.log('Library is empty, creating and opening Welcome.md');
            await get().ensureWelcomeFileAndOpen(welcomePath);
          } else if (folderContents.length === 1 && folderContents[0].name !== 'Welcome.md') {
            // Only one file and it's not Welcome.md - open that file
            console.log('Opening single file in library:', folderContents[0].path);
            await get().openDocumentAndNavigate(folderContents[0].path);
          } else {
            // Library has content, check if Welcome.md exists
            const welcomeExists = folderContents.some(item => item.name === 'Welcome.md');
            if (welcomeExists) {
              console.log('Opening Welcome.md from populated library');
              await get().openDocumentAndNavigate(welcomePath);
            } else {
              // No Welcome.md but library has content - open library view
              console.log('Opening library view (no Welcome.md)');
              await get().openLexorLibrary();
            }
          }
        } catch (error) {
          console.error('Error in autoOpenAppropriateDocument:', error);
        }
      },

      openDocumentAndNavigate: async (filePath: string) => {
        try {
          // Check if this is an audio file
          const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.aiff'];
          const fileExtension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
          
          // Set the current document
          get().setCurrentDocument(filePath);
          
          if (audioExtensions.includes(fileExtension)) {
            // Handle audio file - create an audio player widget without reading the file
            const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            const audioContent = `# Playing: ${fileName}

[audio: ${fileName}](${filePath})

---

*To play this audio file, switch to **Preview** mode by selecting View → Preview or pressing **Shift+⌘+P**.*`;
            
            get().setDocumentContent(audioContent);
            get().setDocumentModified(false);
            
            // Enable live preview mode to show the audio player
            get().setLivePreviewEnabled(true);
          } else {
            // Handle regular text files
            // Read the file content
            const content = await window.electronAPI?.file?.readFile(filePath);
            if (content !== undefined) {
              get().setDocumentContent(content);
              get().setDocumentModified(false);
            }
          }
          
          // Navigate to editor view
          get().setCurrentView('editor');
          
          // Also load the library folder to show in sidebar
          const state = get();
          if (state.libraryFolder && state.isPathInLibrary(filePath)) {
            await get().openLexorLibrary();
          }
        } catch (error) {
          console.error('Failed to open document:', filePath, error);
        }
      },

      ensureWelcomeFileAndOpen: async (welcomePath: string) => {
        try {
          // Try to open existing Welcome.md
          const content = await window.electronAPI?.file?.readFile(welcomePath);
          if (content !== undefined) {
            // Welcome.md exists, open it
            await get().openDocumentAndNavigate(welcomePath);
            return;
          }
        } catch (error) {
          // Welcome.md doesn't exist, create it
          console.log('Welcome.md not found, creating new one');
        }
        
        // Create Welcome.md and then open it
        const created = await get().createWelcomeFile(welcomePath);
        if (created) {
          await get().openDocumentAndNavigate(welcomePath);
        } else {
          // Failed to create Welcome.md, fall back to library view or empty editor
          const state = get();
          if (state.libraryFolder) {
            console.log('Failed to create Welcome.md, opening library view');
            await get().openLexorLibrary();
          } else {
            console.log('Failed to create Welcome.md, staying in empty editor');
          }
        }
      },

      createWelcomeFile: async (welcomePath: string) => {
        try {
          const welcomeContent = `# Welcome to Your Lexor Library

This is your personal Lexor Library - a special folder that syncs between your devices.

## Getting Started

- Create and edit markdown files here
- They will automatically sync to your mobile device
- Use subfolders to organize your content
- Generate flashcards from your notes

## Tips

- Keep your most important documents in this library
- Use meaningful folder names for organization  
- The library stays in sync across all your devices

Happy writing!
`;
          
          const result = await window.electronAPI?.file?.writeFile(welcomePath, welcomeContent);
          return result?.success || false;
        } catch (error) {
          console.error('Failed to create Welcome.md:', error);
          return false;
        }
      },
      
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setShowScrollbar: (show) => set({ showScrollbar: show }),
      toggleScrollbar: () => set((state) => ({ showScrollbar: !state.showScrollbar })),
      
      focusEditor: () => {
        // Dispatch a custom event that the editor can listen to
        window.dispatchEvent(new CustomEvent('focusEditor'));
      },
    }),
    {
      name: 'lexor-app-store',
      partialize: (state) => ({
        // Only persist preferences and library settings, not UI state
        theme: state.theme,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        fontFamily: state.fontFamily,
        sidebarCollapsed: state.sidebarCollapsed,
        libraryFolder: state.libraryFolder,
        isLibraryInitialized: state.isLibraryInitialized,
        lastOpenedDocument: state.lastOpenedDocument,
        hasLaunchedBefore: state.hasLaunchedBefore,
        isFirstTimeUser: state.isFirstTimeUser,
        splitRatio: state.splitRatio,
        showScrollbar: state.showScrollbar,
      }),
    }
  )
);