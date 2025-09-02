import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
  // App methods
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getName: () => ipcRenderer.invoke('app:getName'),
    getHomeDirectory: () => ipcRenderer.invoke('app:getHomeDirectory'),
  },

  // Window management
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    setFocusMode: (focusMode: boolean) => ipcRenderer.send('window:set-focus-mode', focusMode),
    setTransparency: (transparency: number) => ipcRenderer.invoke('window:set-transparency', transparency),
  },

  // File operations
  file: {
    showOpenDialog: () => ipcRenderer.invoke('file:showOpenDialog'),
    showSaveDialog: () => ipcRenderer.invoke('file:showSaveDialog'),
    readFile: (filePath: string) => ipcRenderer.invoke('file:readFile', filePath),
    readFileAsBuffer: (filePath: string) => ipcRenderer.invoke('file:readFileAsBuffer', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('file:writeFile', filePath, content),
    rename: (oldPath: string, newName: string) => ipcRenderer.invoke('file:rename', oldPath, newName),
    delete: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
    createFolder: (parentPath: string, folderName: string) => ipcRenderer.invoke('file:createFolder', parentPath, folderName),
    createFile: (parentPath: string, fileName: string, content?: string) => ipcRenderer.invoke('file:createFile', parentPath, fileName, content),
    move: (sourcePath: string, destinationPath: string) => ipcRenderer.invoke('file:move', sourcePath, destinationPath),
    scanDirectory: (directoryPath: string, extensions: string[]) => ipcRenderer.invoke('file:scanDirectory', directoryPath, extensions),
  },

  // Folder operations
  folder: {
    showOpenDialog: () => ipcRenderer.invoke('folder:showOpenDialog'),
    readDirectory: (folderPath: string, recursive?: boolean) => ipcRenderer.invoke('folder:readDirectory', folderPath, recursive),
    watchDirectory: (folderPath: string) => ipcRenderer.invoke('folder:watchDirectory', folderPath),
    unwatchDirectory: (folderPath: string) => ipcRenderer.invoke('folder:unwatchDirectory', folderPath),
    unwatchAll: () => ipcRenderer.invoke('folder:unwatchAll'),
    onFileAdded: (callback: (filePath: string) => void) => {
      ipcRenderer.on('folder:fileAdded', (_, filePath) => callback(filePath));
      return () => ipcRenderer.removeAllListeners('folder:fileAdded');
    },
    onFolderAdded: (callback: (dirPath: string) => void) => {
      ipcRenderer.on('folder:folderAdded', (_, dirPath) => callback(dirPath));
      return () => ipcRenderer.removeAllListeners('folder:folderAdded');
    },
    onFileRemoved: (callback: (filePath: string) => void) => {
      ipcRenderer.on('folder:fileRemoved', (_, filePath) => callback(filePath));
      return () => ipcRenderer.removeAllListeners('folder:fileRemoved');
    },
    onFolderRemoved: (callback: (dirPath: string) => void) => {
      ipcRenderer.on('folder:folderRemoved', (_, dirPath) => callback(dirPath));
      return () => ipcRenderer.removeAllListeners('folder:folderRemoved');
    },
    onFileChanged: (callback: (filePath: string) => void) => {
      ipcRenderer.on('folder:fileChanged', (_, filePath) => callback(filePath));
      return () => ipcRenderer.removeAllListeners('folder:fileChanged');
    },
  },

  // Library operations
  library: {
    getDefaultPath: () => ipcRenderer.invoke('library:getDefaultPath'),
    initialize: (libraryPath: string) => ipcRenderer.invoke('library:initialize', libraryPath),
    selectNewPath: () => ipcRenderer.invoke('library:selectNewPath'),
    importFiles: (libraryPath: string) => ipcRenderer.invoke('library:importFiles', libraryPath),
  },

  // Menu management
  menu: {
    updateState: (hasSelectedFile: boolean, currentView: string, isStudying?: boolean, menuStates?: { isVimModeEnabled?: boolean }) => 
      ipcRenderer.send('menu:updateState', hasSelectedFile, currentView, isStudying, menuStates),
    onNewDocument: (callback: () => void) => {
      ipcRenderer.on('menu:new-document', callback);
      return () => ipcRenderer.removeListener('menu:new-document', callback);
    },
    onOpenDocument: (callback: () => void) => {
      ipcRenderer.on('menu:open-document', callback);
      return () => ipcRenderer.removeListener('menu:open-document', callback);
    },
    onOpenFolder: (callback: () => void) => {
      ipcRenderer.on('menu:open-folder', callback);
      return () => ipcRenderer.removeListener('menu:open-folder', callback);
    },
    onOpenLexorLibrary: (callback: () => void) => {
      ipcRenderer.on('menu:open-lexor-library', callback);
      return () => ipcRenderer.removeListener('menu:open-lexor-library', callback);
    },
    onImportToLibrary: (callback: () => void) => {
      ipcRenderer.on('menu:import-to-library', callback);
      return () => ipcRenderer.removeListener('menu:import-to-library', callback);
    },
    onAddFolderToLibrary: (callback: () => void) => {
      ipcRenderer.on('menu:add-folder-to-library', callback);
      return () => ipcRenderer.removeListener('menu:add-folder-to-library', callback);
    },
    onSaveDocument: (callback: () => void) => {
      ipcRenderer.on('menu:save-document', callback);
      return () => ipcRenderer.removeListener('menu:save-document', callback);
    },
    onSaveDocumentAs: (callback: () => void) => {
      ipcRenderer.on('menu:save-document-as', callback);
      return () => ipcRenderer.removeListener('menu:save-document-as', callback);
    },
    onExportHTML: (callback: () => void) => {
      ipcRenderer.on('menu:export-html', callback);
      return () => ipcRenderer.removeListener('menu:export-html', callback);
    },
    onExportPDF: (callback: () => void) => {
      ipcRenderer.on('menu:export-pdf', callback);
      return () => ipcRenderer.removeListener('menu:export-pdf', callback);
    },
    onPreferences: (callback: () => void) => {
      ipcRenderer.on('menu:preferences', callback);
      return () => ipcRenderer.removeListener('menu:preferences', callback);
    },
    onFind: (callback: () => void) => {
      ipcRenderer.on('menu:find', callback);
      return () => ipcRenderer.removeListener('menu:find', callback);
    },
    onFindReplace: (callback: () => void) => {
      ipcRenderer.on('menu:find-replace', callback);
      return () => ipcRenderer.removeListener('menu:find-replace', callback);
    },
    onRenameSelected: (callback: () => void) => {
      ipcRenderer.on('menu:rename-selected', callback);
      return () => ipcRenderer.removeListener('menu:rename-selected', callback);
    },
    onDeleteSelected: (callback: () => void) => {
      ipcRenderer.on('menu:delete-selected', callback);
      return () => ipcRenderer.removeListener('menu:delete-selected', callback);
    },
    onToggleSidebar: (callback: () => void) => {
      ipcRenderer.on('menu:toggle-sidebar', callback);
      return () => ipcRenderer.removeListener('menu:toggle-sidebar', callback);
    },
    onToggleFocusMode: (callback: () => void) => {
      ipcRenderer.on('menu:toggle-focus-mode', callback);
      return () => ipcRenderer.removeListener('menu:toggle-focus-mode', callback);
    },
    onTogglePreview: (callback: () => void) => {
      ipcRenderer.on('menu:toggle-preview', callback);
      return () => ipcRenderer.removeListener('menu:toggle-preview', callback);
    },
    onZoomIn: (callback: () => void) => {
      ipcRenderer.on('menu:zoom-in', callback);
      return () => ipcRenderer.removeListener('menu:zoom-in', callback);
    },
    onZoomOut: (callback: () => void) => {
      ipcRenderer.on('menu:zoom-out', callback);
      return () => ipcRenderer.removeListener('menu:zoom-out', callback);
    },
    onResetZoom: (callback: () => void) => {
      ipcRenderer.on('menu:reset-zoom', callback);
      return () => ipcRenderer.removeListener('menu:reset-zoom', callback);
    },
    onNewFlashcard: (callback: () => void) => {
      ipcRenderer.on('menu:new-flashcard', callback);
      return () => ipcRenderer.removeListener('menu:new-flashcard', callback);
    },
    onStudySession: (callback: () => void) => {
      ipcRenderer.on('menu:study-session', callback);
      return () => ipcRenderer.removeListener('menu:study-session', callback);
    },
    onDiscoverLibrary: (callback: () => void) => {
      ipcRenderer.on('menu:discover-library', callback);
      return () => ipcRenderer.removeListener('menu:discover-library', callback);
    },
    onImportDeck: (callback: () => void) => {
      ipcRenderer.on('menu:import-deck', callback);
      return () => ipcRenderer.removeListener('menu:import-deck', callback);
    },
    onExportDeck: (callback: () => void) => {
      ipcRenderer.on('menu:export-deck', callback);
      return () => ipcRenderer.removeListener('menu:export-deck', callback);
    },
    onStudyStats: (callback: () => void) => {
      ipcRenderer.on('menu:study-stats', callback);
      return () => ipcRenderer.removeListener('menu:study-stats', callback);
    },
    onKeyboardShortcuts: (callback: () => void) => {
      ipcRenderer.on('menu:keyboard-shortcuts', callback);
      return () => ipcRenderer.removeListener('menu:keyboard-shortcuts', callback);
    },
    // Split screen handlers
    onToggleSplitScreen: (callback: () => void) => {
      ipcRenderer.on('menu:toggle-split-screen', callback);
      return () => ipcRenderer.removeListener('menu:toggle-split-screen', callback);
    },
    onCloseSplitScreen: (callback: () => void) => {
      ipcRenderer.on('menu:close-split-screen', callback);
      return () => ipcRenderer.removeListener('menu:close-split-screen', callback);
    },
    onFocusLeftPane: (callback: () => void) => {
      ipcRenderer.on('menu:focus-left-pane', callback);
      return () => ipcRenderer.removeListener('menu:focus-left-pane', callback);
    },
    onFocusRightPane: (callback: () => void) => {
      ipcRenderer.on('menu:focus-right-pane', callback);
      return () => ipcRenderer.removeListener('menu:focus-right-pane', callback);
    },
    onSwapPanes: (callback: () => void) => {
      ipcRenderer.on('menu:swap-panes', callback);
      return () => ipcRenderer.removeListener('menu:swap-panes', callback);
    },
    onToggleScrollbar: (callback: () => void) => {
      ipcRenderer.on('menu:toggle-scrollbar', callback);
      return () => ipcRenderer.removeListener('menu:toggle-scrollbar', callback);
    },
    onSwitchFlashcardView: (callback: (viewMode: string) => void) => {
      const handler = (_: any, viewMode: string) => callback(viewMode);
      ipcRenderer.on('menu:switch-flashcard-view', handler);
      return () => ipcRenderer.removeListener('menu:switch-flashcard-view', handler);
    },
    onToggleDocumentStats: (callback: () => void) => {
      ipcRenderer.on('menu:toggle-document-stats', callback);
      return () => ipcRenderer.removeListener('menu:toggle-document-stats', callback);
    },
    onToggleVimMode: (callback: () => void) => {
      ipcRenderer.on('menu:toggle-vim-mode', callback);
      return () => ipcRenderer.removeListener('menu:toggle-vim-mode', callback);
    },
  },

  // Database operations (for local SQLite database)
  database: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('database:query', sql, params),
    execute: (sql: string, params?: any[]) => ipcRenderer.invoke('database:execute', sql, params),
    transaction: (queries: Array<{ sql: string; params?: any[] }>) => 
      ipcRenderer.invoke('database:transaction', queries),
    createDeckFromFilePath: (filePath: string, libraryPath: string) => 
      ipcRenderer.invoke('database:createDeckFromFilePath', filePath, libraryPath),
  },

  // LanguageTool operations
  languageTool: {
    checkJava: () => ipcRenderer.invoke('languagetool:checkJava'),
    initialize: () => ipcRenderer.invoke('languagetool:initialize'),
    start: () => ipcRenderer.invoke('languagetool:start'),
    stop: () => ipcRenderer.invoke('languagetool:stop'),
    check: (text: string, language?: string) => ipcRenderer.invoke('languagetool:check', text, language),
    getSupportedLanguages: () => ipcRenderer.invoke('languagetool:languages'),
    getStatus: () => ipcRenderer.invoke('languagetool:status'),
  },

  // Platform information
  platform: {
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',
  },

  // Context menu
  contextMenu: {
    show: (x: number, y: number, item: any) => ipcRenderer.invoke('context-menu:show', x, y, item),
    onNewFolder: (callback: (parentPath: string) => void) => {
      ipcRenderer.on('context-menu:new-folder', (_, parentPath) => callback(parentPath));
      return () => ipcRenderer.removeAllListeners('context-menu:new-folder');
    },
    onNewDocument: (callback: (parentPath: string) => void) => {
      ipcRenderer.on('context-menu:new-document', (_, parentPath) => callback(parentPath));
      return () => ipcRenderer.removeAllListeners('context-menu:new-document');
    },
    onOpenInRightPane: (callback: (filePath: string) => void) => {
      ipcRenderer.on('context-menu:open-in-right-pane', (_, filePath) => callback(filePath));
      return () => ipcRenderer.removeAllListeners('context-menu:open-in-right-pane');
    },
    onRename: (callback: (item: any) => void) => {
      ipcRenderer.on('context-menu:rename', (_, item) => callback(item));
      return () => ipcRenderer.removeAllListeners('context-menu:rename');
    },
    onDelete: (callback: (item: any) => void) => {
      ipcRenderer.on('context-menu:delete', (_, item) => callback(item));
      return () => ipcRenderer.removeAllListeners('context-menu:delete');
    }
  },

  // Native dialogs
  dialog: {
    createFolder: (parentPath: string) => ipcRenderer.invoke('dialog:createFolder', parentPath),
    createDocument: (parentPath: string) => ipcRenderer.invoke('dialog:createDocument', parentPath)
  },
};

// Export type definitions for TypeScript
export type ElectronAPI = typeof electronAPI;

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose a simple API check
contextBridge.exposeInMainWorld('isElectron', true);