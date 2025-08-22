import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';
import { createMenu } from './menu';
import { WindowManager } from './windows';

class LexorApp {
  private windowManager: WindowManager;
  private isDevelopment = process.env.NODE_ENV === 'development';

  constructor() {
    this.windowManager = new WindowManager();
    this.initializeApp();
  }

  private initializeApp(): void {
    // Handle app ready
    app.whenReady().then(() => {
      this.createMainWindow();
      this.setupMenu();
      this.setupAutoUpdater();
      this.setupIpcHandlers();
      
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // Handle all windows closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
    });

    // Handle certificate errors
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      if (this.isDevelopment) {
        // In development, ignore certificate errors
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  private createMainWindow(): void {
    const mainWindow = this.windowManager.createMainWindow();
    
    if (this.isDevelopment) {
      mainWindow.loadURL('http://localhost:5173');
      mainWindow.webContents.openDevTools();
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
    }

    // Handle window ready
    mainWindow.webContents.once('dom-ready', () => {
      if (!this.isDevelopment) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    });
  }

  private setupMenu(): void {
    const menu = createMenu();
    Menu.setApplicationMenu(menu);
  }

  private setupAutoUpdater(): void {
    if (this.isDevelopment) return;

    autoUpdater.checkForUpdatesAndNotify();
    
    autoUpdater.on('update-available', () => {
      console.log('Update available');
    });

    autoUpdater.on('update-downloaded', () => {
      console.log('Update downloaded');
      autoUpdater.quitAndInstall();
    });
  }

  private setupIpcHandlers(): void {
    // App info
    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:getName', () => app.getName());
    
    // Window management
    ipcMain.handle('window:minimize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.minimize();
    });

    ipcMain.handle('window:maximize', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window?.isMaximized()) {
        window.unmaximize();
      } else {
        window?.maximize();
      }
    });

    ipcMain.handle('window:close', (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      window?.close();
    });

    // Focus mode handling (macOS only)
    ipcMain.on('window:set-focus-mode', (event, focusMode: boolean) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window || process.platform !== 'darwin') return;
      
      if (focusMode) {
        // Hide traffic lights and title bar for true focus mode
        window.setWindowButtonVisibility(false);
      } else {
        // Show traffic lights and title bar
        window.setWindowButtonVisibility(true);
      }
    });

    // File operations
    ipcMain.handle('file:showOpenDialog', async () => {
      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Markdown Files', extensions: ['md', 'markdown'] },
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      return result;
    });

    ipcMain.handle('file:showSaveDialog', async () => {
      const { dialog } = await import('electron');
      const result = await dialog.showSaveDialog({
        filters: [
          { name: 'Markdown Files', extensions: ['md'] },
          { name: 'Text Files', extensions: ['txt'] }
        ]
      });
      return result;
    });

    ipcMain.handle('file:readFile', async (_, filePath: string) => {
      const { readFile } = await import('fs/promises');
      return await readFile(filePath, 'utf-8');
    });

    ipcMain.handle('file:writeFile', async (_, filePath: string, content: string) => {
      const { writeFile } = await import('fs/promises');
      await writeFile(filePath, content, 'utf-8');
    });

    // Folder operations
    ipcMain.handle('folder:showOpenDialog', async () => {
      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
      });
      return result;
    });

    ipcMain.handle('folder:readDirectory', async (_, folderPath: string) => {
      const { readdir, stat } = await import('fs/promises');
      const { join, extname } = await import('path');
      
      try {
        const items = await readdir(folderPath);
        const fileList = [];
        
        for (const item of items) {
          const fullPath = join(folderPath, item);
          const stats = await stat(fullPath);
          
          // Skip hidden files and folders
          if (item.startsWith('.')) continue;
          
          if (stats.isDirectory()) {
            fileList.push({
              name: item,
              path: fullPath,
              type: 'directory',
              isDirectory: true
            });
          } else if (stats.isFile()) {
            const ext = extname(item).toLowerCase();
            // Only include markdown, text files, and some other common formats
            const supportedExtensions = ['.md', '.markdown', '.txt', '.text'];
            if (supportedExtensions.includes(ext)) {
              fileList.push({
                name: item,
                path: fullPath,
                type: 'file',
                isDirectory: false,
                extension: ext
              });
            }
          }
        }
        
        // Sort: directories first, then files, both alphabetically
        fileList.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        
        return fileList;
      } catch (error) {
        console.error('Error reading directory:', error);
        return [];
      }
    });
  }
}

// Initialize app
new LexorApp();