// Type definitions for the Electron API exposed through preload script

export interface ElectronAPI {
  app: {
    getVersion: () => Promise<string>;
    getName: () => Promise<string>;
  };

  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    setTransparency: (transparency: number) => Promise<void>;
  };

  file: {
    showOpenDialog: () => Promise<Electron.OpenDialogReturnValue>;
    showSaveDialog: () => Promise<Electron.SaveDialogReturnValue>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;
  };

  menu: {
    onNewDocument: (callback: () => void) => () => void;
    onOpenDocument: (callback: () => void) => () => void;
    onSaveDocument: (callback: () => void) => () => void;
    onSaveDocumentAs: (callback: () => void) => () => void;
    onExportHTML: (callback: () => void) => () => void;
    onExportPDF: (callback: () => void) => () => void;
    onPreferences: (callback: () => void) => () => void;
    onFind: (callback: () => void) => () => void;
    onFindReplace: (callback: () => void) => () => void;
    onToggleFocusMode: (callback: () => void) => () => void;
    onTogglePreview: (callback: () => void) => () => void;
    onZoomIn: (callback: () => void) => () => void;
    onZoomOut: (callback: () => void) => () => void;
    onResetZoom: (callback: () => void) => () => void;
    onNewFlashcard: (callback: () => void) => () => void;
    onStudySession: (callback: () => void) => () => void;
    onImportDeck: (callback: () => void) => () => void;
    onExportDeck: (callback: () => void) => () => void;
    onStudyStats: (callback: () => void) => () => void;
    onKeyboardShortcuts: (callback: () => void) => () => void;
  };

  database: {
    query: (sql: string, params?: any[]) => Promise<any[]>;
    execute: (sql: string, params?: any[]) => Promise<void>;
    transaction: (queries: Array<{ sql: string; params?: any[] }>) => Promise<void>;
  };

  platform: {
    isMac: boolean;
    isWindows: boolean;
    isLinux: boolean;
  };
}

// Global window interface extension
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    isElectron: boolean;
  }
}