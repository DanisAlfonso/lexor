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
  }
}

// Initialize app
new LexorApp();