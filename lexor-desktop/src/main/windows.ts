import { BrowserWindow, screen } from 'electron';
import { join } from 'path';

export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private windowSettings = {
    transparency: 100,
  };

  createMainWindow(): BrowserWindow {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    // Calculate optimal window size (80% of screen, with minimum sizes)
    const windowWidth = Math.max(1200, Math.floor(width * 0.8));
    const windowHeight = Math.max(800, Math.floor(height * 0.8));

    this.mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      minWidth: 600,  // Reduced to allow side-by-side tiling
      minHeight: 400,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 20 } : undefined,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: join(__dirname, '../preload/index.js'),
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      show: false, // Don't show until ready
      backgroundColor: process.platform === 'darwin' ? '#00000000' : '#ffffff', // Transparent on macOS
      vibrancy: undefined, // Will be set based on user preference
      frame: true,
      transparent: true, // Enable transparency support
    });

    // Show window when ready to prevent visual flash
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (process.env.NODE_ENV === 'development') {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    // Handle window closed
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // Optimize for performance
    this.mainWindow.webContents.on('did-finish-load', () => {
      // Disable node integration for security
      this.mainWindow?.webContents.executeJavaScript(`
        delete window.require;
        delete window.exports;
        delete window.module;
      `);
    });

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    });

    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  closeAllWindows(): void {
    BrowserWindow.getAllWindows().forEach(window => {
      window.close();
    });
  }

  focusMainWindow(): void {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
    }
  }

  setTransparency(transparency: number): void {
    if (!this.mainWindow) return;
    
    this.windowSettings.transparency = Math.max(60, Math.min(100, transparency));
    const opacity = this.windowSettings.transparency / 100;
    
    this.mainWindow.setOpacity(opacity);
  }


  getWindowSettings() {
    return { ...this.windowSettings };
  }
}