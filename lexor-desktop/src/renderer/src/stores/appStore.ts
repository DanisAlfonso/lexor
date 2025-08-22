import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

export type ViewType = 'editor' | 'flashcards' | 'study' | 'settings';

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  isDirectory: boolean;
  extension?: string;
}

export interface AppState {
  // UI State
  currentView: ViewType;
  sidebarCollapsed: boolean;
  isFocusMode: boolean;
  isPreviewMode: boolean;
  zoomLevel: number;
  
  // Document State
  currentDocument: string | null;
  documentContent: string;
  isDocumentModified: boolean;

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
  
  // Actions
  setCurrentView: (view: ViewType) => void;
  toggleSidebar: () => void;
  toggleFocusMode: () => void;
  togglePreviewMode: () => void;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  
  setCurrentDocument: (path: string | null) => void;
  setDocumentContent: (content: string) => void;
  setDocumentModified: (modified: boolean) => void;
  
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
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'editor',
      sidebarCollapsed: false,
      isFocusMode: false,
      isPreviewMode: false,
      zoomLevel: 100,
      
      currentDocument: null,
      documentContent: '',
      isDocumentModified: false,

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
      
      // Actions
      setCurrentView: (view) => set({ currentView: view }),
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
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
      
      togglePreviewMode: () => set((state) => ({ 
        isPreviewMode: !state.isPreviewMode 
      })),
      
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
      },
      
      setDocumentContent: (content) => set({ 
        documentContent: content,
        isDocumentModified: true
      }),
      
      setDocumentModified: (modified) => set({ 
        isDocumentModified: modified 
      }),

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
              const content = await window.electronAPI?.file?.readFile(lastOpenedDocument);
              if (content !== undefined) {
                console.log('Opening last document:', lastOpenedDocument);
                await get().openDocumentAndNavigate(lastOpenedDocument);
                return;
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
          // Set the current document
          get().setCurrentDocument(filePath);
          
          // Read the file content
          const content = await window.electronAPI?.file?.readFile(filePath);
          if (content !== undefined) {
            get().setDocumentContent(content);
            get().setDocumentModified(false);
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
      }),
    }
  )
);