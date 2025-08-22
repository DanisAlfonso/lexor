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
      
      setCurrentDocument: (path) => set({ currentDocument: path }),
      
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
      }),
    }
  )
);