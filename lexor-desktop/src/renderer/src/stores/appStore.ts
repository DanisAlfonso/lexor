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
  loadFolderContents: (folderPath: string) => Promise<void>;
  
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
      
      loadFolderContents: async (folderPath: string) => {
        set({ isLoadingFolder: true });
        try {
          if (window.electronAPI?.folder?.readDirectory) {
            const contents = await window.electronAPI.folder.readDirectory(folderPath);
            const state = get();
            set({ 
              folderContents: contents,
              currentFolder: folderPath,
              rootFolder: state.rootFolder || folderPath, // Set root folder on first load
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
      
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
    }),
    {
      name: 'lexor-app-store',
      partialize: (state) => ({
        // Only persist preferences, not UI state
        theme: state.theme,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        fontFamily: state.fontFamily,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);