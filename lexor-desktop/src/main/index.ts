import { app, BrowserWindow, Menu, ipcMain, shell, protocol } from 'electron';
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
      this.setupProtocolHandler();
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
    ipcMain.handle('app:getHomeDirectory', async () => {
      const { homedir } = await import('os');
      return homedir();
    });
    
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

    ipcMain.handle('folder:readDirectory', async (_, folderPath: string, recursive = false) => {
      const { readdir, stat } = await import('fs/promises');
      const { join, extname } = await import('path');
      
      const readDirectoryRecursive = async (dirPath: string, depth = 0): Promise<any[]> => {
        try {
          const items = await readdir(dirPath);
          const fileList = [];
          
          for (const item of items) {
            const fullPath = join(dirPath, item);
            const stats = await stat(fullPath);
            
            // Skip hidden files and folders
            if (item.startsWith('.')) continue;
            
            if (stats.isDirectory()) {
              const folderItem = {
                name: item,
                path: fullPath,
                type: 'directory',
                isDirectory: true,
                depth,
                children: recursive ? await readDirectoryRecursive(fullPath, depth + 1) : []
              };
              fileList.push(folderItem);
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
                  extension: ext,
                  depth
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
      };
      
      return await readDirectoryRecursive(folderPath);
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

## Media Support

Lexor supports rich media in your markdown files! Try these examples:

### Audio Files
You can reference audio files from anywhere on your computer:
- **Absolute paths**: \`/Users/yourname/Downloads/audio.mp3\`
- **Tilde paths**: \`~/Downloads/audio.mp3\` 
- **Relative paths**: \`audio.mp3\` (files in same folder)

### Images
Include images using standard markdown syntax:
- **Absolute paths**: \`![Image](/Users/yourname/Pictures/photo.jpg)\`
- **Tilde paths**: \`![Image](~/Pictures/photo.jpg)\`
- **Relative paths**: \`![Image](photo.jpg)\`

### Audio Player Options
- **Inline**: \`[inline: pronunciation](audio.mp3)\` - Small button in text
- **Block**: \`[audio: Full Player](audio.mp3)\` - Full controls

## Tips

- Keep your most important documents in this library
- Use meaningful folder names for organization  
- The library stays in sync across all your devices
- Reference your media files using absolute paths or tilde notation

Happy writing!
`;

          // Create example markdown file with media examples
          const examplesContent = `# Media Examples

This file demonstrates how to use audio and images in your markdown files.

## Audio Examples

### Inline Audio Players
The word "hello" [inline: pronunciation](~/Downloads/your-audio-file.mp3) can include inline audio.

You can also use: [inline: sample](~/Music/song.mp3) for inline players in your text.

### Block Audio Player
For full controls, use the block format:

[audio: Full Audio Player](~/Downloads/your-audio-file.mp3)

## Image Examples

### Regular Images
![Sample Image](~/Pictures/your-image.jpg "Your image title")

### Images with Absolute Paths
![Another Image](/Users/yourname/Desktop/screenshot.png)

## Getting Your Own Media

1. **For Audio**: Place audio files (.mp3, .wav, .m4a) anywhere on your computer
2. **For Images**: Use any image files (.jpg, .png, .gif) from your computer
3. **Reference them**: Use absolute paths like \`/Users/yourname/...\` or tilde paths like \`~/...\`

## Supported Formats

- **Audio**: MP3, WAV, M4A, OGG
- **Images**: JPG, PNG, GIF, WebP
- **Paths**: Absolute (/Users/...), Tilde (~/...), or Relative (filename.ext)

Happy creating!
`;
          
          await writeFile(join(libraryPath, 'Welcome.md'), welcomeContent, 'utf-8');
          await writeFile(join(libraryPath, 'Media Examples.md'), examplesContent, 'utf-8');
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

    ipcMain.handle('file:move', async (_, sourcePath: string, destinationPath: string) => {
      const { rename, stat } = await import('fs/promises');
      const { join, basename, dirname } = await import('path');
      
      try {
        // Validate source exists
        const sourceStats = await stat(sourcePath);
        
        // Validate destination directory exists
        const destDir = await stat(dirname(destinationPath));
        if (!destDir.isDirectory()) {
          return { success: false, error: 'Destination directory does not exist' };
        }
        
        // Check if we're moving into the same directory
        if (dirname(sourcePath) === dirname(destinationPath)) {
          return { success: false, error: 'Cannot move item to the same directory' };
        }
        
        // Check if destination already exists
        try {
          await stat(destinationPath);
          return { success: false, error: 'An item with this name already exists at the destination' };
        } catch {
          // Destination doesn't exist - good!
        }
        
        // Perform the move
        await rename(sourcePath, destinationPath);
        return { success: true, newPath: destinationPath };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    });

    // Menu state management
    ipcMain.on('menu:updateState', (_, hasSelectedFile: boolean, currentView: string) => {
      updateMenuState(hasSelectedFile, currentView);
    });
  }

  private setupProtocolHandler(): void {
    // Register custom protocol for local file access
    protocol.registerFileProtocol('lexor-file', (request, callback) => {
      const url = request.url.substring('lexor-file://'.length);
      const decodedPath = decodeURIComponent(url);
      callback({ path: decodedPath });
    });
  }
}

// Initialize app
new LexorApp();