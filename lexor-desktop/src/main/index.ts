import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';
import { createMenu, updateMenuState } from './menu';
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

    // Library operations
    ipcMain.handle('library:getDefaultPath', async () => {
      const { homedir } = await import('os');
      const { join } = await import('path');
      return join(homedir(), 'Documents', 'Lexor Library');
    });

    ipcMain.handle('library:initialize', async (_, libraryPath: string) => {
      const { mkdir, access, writeFile } = await import('fs/promises');
      const { join } = await import('path');
      
      try {
        // Check if directory already exists
        try {
          await access(libraryPath);
        } catch {
          // Directory doesn't exist, create it
          await mkdir(libraryPath, { recursive: true });
          
          // Create welcome file
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
          
          await writeFile(join(libraryPath, 'Welcome.md'), welcomeContent, 'utf-8');
        }
        
        return libraryPath;
      } catch (error) {
        console.error('Error initializing library:', error);
        return null;
      }
    });

    ipcMain.handle('library:selectNewPath', async () => {
      const { dialog } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Lexor Library Location'
      });
      return result;
    });

    ipcMain.handle('library:importFiles', async (_, libraryPath: string) => {
      const { dialog } = await import('electron');
      const { copyFile, cp, stat } = await import('fs/promises');
      const { join, extname, basename } = await import('path');
      
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile', 'openDirectory', 'multiSelections'],
          filters: [
            { name: 'Markdown Files', extensions: ['md', 'markdown'] },
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          title: 'Select Files or Folders to Import to Library'
        });

        if (result.canceled || !result.filePaths.length) {
          return { success: false, count: 0, errors: [] };
        }

        const errors = [];
        let imported = 0;

        for (const sourcePath of result.filePaths) {
          try {
            const sourceStats = await stat(sourcePath);
            const sourceName = basename(sourcePath);
            const destinationPath = join(libraryPath, sourceName);
            
            if (sourceStats.isDirectory()) {
              // Import entire folder recursively
              await cp(sourcePath, destinationPath, { recursive: true });
              imported++;
            } else {
              // Import single file
              await copyFile(sourcePath, destinationPath);
              imported++;
            }
          } catch (error: any) {
            errors.push(`Failed to import ${basename(sourcePath)}: ${error.message}`);
          }
        }

        return {
          success: errors.length === 0,
          count: imported,
          errors
        };
      } catch (error: any) {
        return {
          success: false,
          count: 0,
          errors: [`Import failed: ${error.message}`]
        };
      }
    });

    // File management operations
    ipcMain.handle('file:rename', async (_, oldPath: string, newName: string) => {
      const { rename } = await import('fs/promises');
      const { join, dirname } = await import('path');
      
      try {
        const newPath = join(dirname(oldPath), newName);
        await rename(oldPath, newPath);
        return { success: true, newPath };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('file:delete', async (_, filePath: string) => {
      const { unlink, rmdir, stat } = await import('fs/promises');
      
      try {
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
          await rmdir(filePath, { recursive: true });
        } else {
          await unlink(filePath);
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('file:createFolder', async (_, parentPath: string, folderName: string) => {
      const { mkdir } = await import('fs/promises');
      const { join } = await import('path');
      
      try {
        const folderPath = join(parentPath, folderName);
        await mkdir(folderPath);
        return { success: true, folderPath };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('file:createFile', async (_, parentPath: string, fileName: string, content = '') => {
      const { writeFile } = await import('fs/promises');
      const { join } = await import('path');
      
      try {
        const filePath = join(parentPath, fileName);
        await writeFile(filePath, content, 'utf-8');
        return { success: true, filePath };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Menu state management
    ipcMain.on('menu:updateState', (_, hasSelectedFile: boolean, currentView: string) => {
      updateMenuState(hasSelectedFile, currentView);
    });
  }
}

// Initialize app
new LexorApp();