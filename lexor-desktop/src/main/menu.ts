import { Menu, MenuItemConstructorOptions, MenuItem, app, BrowserWindow, dialog } from 'electron';

let currentMenu: Menu | null = null;

export function createMenu(): Menu {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS app menu
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { label: 'About Lexor', role: 'about' as const },
        { type: 'separator' as const },
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => openPreferences() },
        { type: 'separator' as const },
        { label: 'Services', role: 'services' as const, submenu: [] },
        { type: 'separator' as const },
        { label: 'Hide Lexor', role: 'hide' as const },
        { label: 'Hide Others', role: 'hideOthers' as const },
        { label: 'Show All', role: 'unhide' as const },
        { type: 'separator' as const },
        { label: 'Quit Lexor', role: 'quit' as const }
      ]
    }] : []),

    // File menu
    {
      label: 'File',
      submenu: [
        { 
          label: 'New Document', 
          accelerator: 'CmdOrCtrl+N',
          click: () => createNewDocument()
        },
        { 
          label: 'New Window', 
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => createNewWindow()
        },
        { 
          label: 'Open Document...', 
          accelerator: 'CmdOrCtrl+O',
          click: () => openDocument()
        },
        { 
          label: 'Open Folder...', 
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => openFolder()
        },
        { 
          label: 'Open Lexor Library', 
          accelerator: 'CmdOrCtrl+L',
          click: () => openLexorLibrary()
        },
        { type: 'separator' },
        { 
          label: 'Import to Library...', 
          click: () => importToLibrary()
        },
        { 
          label: 'Add Folder to Library', 
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => addFolderToLibrary()
        },
        { type: 'separator' },
        { 
          label: 'Save', 
          accelerator: 'CmdOrCtrl+S',
          click: () => saveDocument()
        },
        { 
          label: 'Save As...', 
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => saveDocumentAs()
        },
        { type: 'separator' },
        { 
          label: 'Export as HTML...', 
          click: () => exportAsHTML()
        },
        { 
          label: 'Export as PDF...', 
          click: () => exportAsPDF()
        },
        { type: 'separator' },
        ...(isMac ? [] : [
          { 
            label: 'Preferences...', 
            accelerator: 'Ctrl+,',
            click: () => openPreferences()
          },
          { type: 'separator' as const }
        ]),
        ...(isMac ? [] : [{ label: 'Exit', role: 'quit' as const }])
      ]
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', role: 'undo' },
        { label: 'Redo', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', role: 'cut' },
        { label: 'Copy', role: 'copy' },
        { label: 'Paste', role: 'paste' },
        { label: 'Select All', role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Highlight Text',
          accelerator: 'CmdOrCtrl+Shift+H',
          click: () => highlightText()
        },
        {
          label: 'Strikethrough Text',
          accelerator: 'CmdOrCtrl+Shift+U',
          click: () => strikethroughText()
        },
        { type: 'separator' },
        {
          label: 'Rename',
          accelerator: 'F2',
          enabled: false, // Will be updated dynamically
          click: () => renameSelectedItem()
        },
        { 
          label: 'Delete', 
          accelerator: isMac ? 'Cmd+Backspace' : 'Delete',
          enabled: false, // Will be updated dynamically
          click: () => deleteSelectedItem()
        },
        { type: 'separator' },
        { 
          label: 'Find', 
          accelerator: 'CmdOrCtrl+F',
          click: () => showFind()
        },
        {
          label: 'Find and Replace',
          accelerator: 'CmdOrCtrl+H',
          click: () => showFindReplace()
        },
        { type: 'separator' },
        {
          label: 'Vim Mode',
          accelerator: 'CmdOrCtrl+Shift+V',
          type: 'checkbox',
          click: () => toggleVimMode()
        }
      ]
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { 
          label: 'Toggle Sidebar', 
          accelerator: 'Option+Cmd+S',
          click: () => toggleSidebar()
        },
        { type: 'separator' },
        { 
          label: 'Focus Mode', 
          accelerator: 'CmdOrCtrl+Shift+F',
          type: 'checkbox',
          click: () => toggleFocusMode()
        },
        { 
          label: 'Preview', 
          accelerator: 'CmdOrCtrl+Shift+P',
          type: 'checkbox',
          click: () => togglePreview()
        },
        { 
          label: 'Split Screen', 
          accelerator: 'CmdOrCtrl+\\',
          type: 'checkbox',
          click: () => toggleSplitScreen()
        },
        { 
          label: 'Close Split', 
          accelerator: 'CmdOrCtrl+W',
          click: () => closeSplitScreen()
        },
        { 
          label: 'Focus Left Pane', 
          accelerator: 'CmdOrCtrl+1',
          click: () => focusLeftPane()
        },
        { 
          label: 'Focus Right Pane', 
          accelerator: 'CmdOrCtrl+2',
          click: () => focusRightPane()
        },
        { 
          label: 'Swap Panes', 
          accelerator: 'CmdOrCtrl+Shift+X',
          click: () => swapPanes()
        },
        { type: 'separator' },
        { 
          label: 'Toggle Scrollbar', 
          accelerator: 'CmdOrCtrl+Shift+B',
          type: 'checkbox',
          click: () => toggleScrollbar()
        },
        { 
          label: 'Toggle Document Stats', 
          accelerator: 'CmdOrCtrl+Shift+I',
          type: 'checkbox',
          checked: true, // Default to true since showDocumentStats defaults to true
          click: (menuItem: MenuItem) => toggleDocumentStats(menuItem)
        },
        { type: 'separator' },
        { 
          label: 'Flashcard Classic View', 
          accelerator: 'CmdOrCtrl+3',
          click: () => switchFlashcardView('classic')
        },
        { 
          label: 'Flashcard Grid View', 
          accelerator: 'CmdOrCtrl+4',
          click: () => switchFlashcardView('grid')
        },
        { type: 'separator' },
        { 
          label: 'Zoom In', 
          accelerator: 'CmdOrCtrl+Plus',
          click: () => zoomIn()
        },
        { 
          label: 'Zoom Out', 
          accelerator: 'CmdOrCtrl+-',
          click: () => zoomOut()
        },
        { 
          label: 'Reset Zoom', 
          accelerator: 'CmdOrCtrl+0',
          click: () => resetZoom()
        },
        { type: 'separator' },
        { label: 'Reload', role: 'reload' },
        { label: 'Force Reload', role: 'forceReload' },
        { label: 'Toggle Developer Tools', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', role: 'resetZoom' },
        { label: 'Zoom In', role: 'zoomIn' },
        { label: 'Zoom Out', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', role: 'togglefullscreen' }
      ]
    },

    // Study menu (for flashcards)
    {
      label: 'Study',
      submenu: [
        { 
          label: 'New Flashcard', 
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => createNewFlashcard()
        },
        { 
          label: 'Study Session', 
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => startStudySession()
        },
        { type: 'separator' },
        { 
          label: 'Discover Library', 
          accelerator: 'CmdOrCtrl+D',
          click: () => discoverLibrary()
        },
        { type: 'separator' },
        { 
          label: 'Import Deck...', 
          click: () => importDeck()
        },
        { 
          label: 'Export Deck...', 
          click: () => exportDeck()
        },
        { type: 'separator' },
        { 
          label: 'Show Answer',
          accelerator: 'Space',
          id: 'show-answer',
          enabled: false
        },
        { 
          label: 'Rate Again',
          accelerator: '1',
          id: 'rate-again',
          enabled: false
        },
        { 
          label: 'Rate Hard',
          accelerator: '2',
          id: 'rate-hard',
          enabled: false
        },
        { 
          label: 'Rate Good',
          accelerator: '3',
          id: 'rate-good',
          enabled: false
        },
        { 
          label: 'Rate Easy',
          accelerator: '4',
          id: 'rate-easy',
          enabled: false
        },
        { 
          label: 'Play/Pause Audio',
          accelerator: 'P',
          id: 'play-audio',
          enabled: false
        },
        { 
          label: 'Exit Study',
          accelerator: 'Esc',
          id: 'exit-study',
          enabled: false
        },
        { type: 'separator' },
        { 
          label: 'Study Statistics', 
          click: () => showStudyStats()
        }
      ]
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', role: 'minimize' },
        { label: 'Zoom', role: 'zoom' },
        { type: 'separator' },
        { 
          label: 'Fill', 
          accelerator: 'Option+Cmd+F',
          click: () => fillWindow()
        },
        { 
          label: 'Center', 
          accelerator: 'Option+Cmd+C',
          click: () => centerWindow()
        },
        { label: 'Move & Resize', submenu: [
          { 
            label: 'Left', 
            accelerator: 'Option+Cmd+Left',
            click: () => tileLeft()
          },
          { 
            label: 'Right', 
            accelerator: 'Option+Cmd+Right',
            click: () => tileRight()
          },
          { 
            label: 'Top', 
            accelerator: 'Option+Cmd+Up',
            click: () => tileTop()
          },
          { 
            label: 'Bottom', 
            accelerator: 'Option+Cmd+Down',
            click: () => tileBottom()
          }
        ] },
        { label: 'Quarters', submenu: [
          { 
            label: 'Top Left', 
            accelerator: 'Option+Cmd+U',
            click: () => quarterTopLeft()
          },
          { 
            label: 'Top Right', 
            accelerator: 'Option+Cmd+I',
            click: () => quarterTopRight()
          },
          { 
            label: 'Bottom Left', 
            accelerator: 'Option+Cmd+J',
            click: () => quarterBottomLeft()
          },
          { 
            label: 'Bottom Right', 
            accelerator: 'Option+Cmd+K',
            click: () => quarterBottomRight()
          }
        ] },
        { type: 'separator' },
        { label: 'Arrange', submenu: [
          { 
            label: 'Left & Right', 
            accelerator: 'Ctrl+Alt+Shift+H',
            click: () => arrangeLeftRight()
          },
          { 
            label: 'Right & Left', 
            accelerator: 'Ctrl+Alt+Shift+G',
            click: () => arrangeRightLeft()
          },
          { 
            label: 'Top & Bottom', 
            accelerator: 'Ctrl+Alt+Shift+T',
            click: () => arrangeTopBottom()
          },
          { 
            label: 'Bottom & Top', 
            accelerator: 'Ctrl+Alt+Shift+B',
            click: () => arrangeBottomTop()
          },
          { 
            label: 'Quarters', 
            click: () => arrangeQuarters()
          }
        ] },
        { type: 'separator' },
        { 
          label: 'Return to Previous Size', 
          accelerator: 'Ctrl+Alt+R',
          click: () => returnToPreviousSize()
        },
        { type: 'separator' },
        { label: 'Close', role: 'close' },
        ...(isMac ? [
          { type: 'separator' as const },
          { label: 'Bring All to Front', role: 'front' as const }
        ] : [])
      ]
    },

    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Lexor Help',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://lexor.app/help');
          }
        },
        {
          label: 'Keyboard Shortcuts',
          accelerator: 'CmdOrCtrl+?',
          click: () => showKeyboardShortcuts()
        },
        { type: 'separator' },
        ...(isMac ? [] : [
          {
            label: 'About Lexor',
            click: () => showAbout()
          }
        ])
      ]
    }
  ];

  currentMenu = Menu.buildFromTemplate(template as MenuItemConstructorOptions[]);
  return currentMenu;
}

// Update menu item states based on current context
export function updateMenuState(hasSelectedFile: boolean, currentView: string, isStudying: boolean = false, menuStates?: { isVimModeEnabled?: boolean }): void {
  if (!currentMenu) return;

  // Only enable rename/delete when in editor view with a selected file
  const shouldEnable = currentView === 'editor' && hasSelectedFile;

  // Find and update the Edit menu items
  const editMenu = currentMenu.items.find(item => item.label === 'Edit');
  if (editMenu && editMenu.submenu) {
    const renameItem = editMenu.submenu.items.find(item => item.label === 'Rename');
    const deleteItem = editMenu.submenu.items.find(item => item.label === 'Delete');
    const vimModeItem = editMenu.submenu.items.find(item => item.label === 'Vim Mode');
    
    if (renameItem) renameItem.enabled = shouldEnable;
    if (deleteItem) deleteItem.enabled = shouldEnable;
    
    // Update vim mode checkbox state
    if (vimModeItem && menuStates?.isVimModeEnabled !== undefined) {
      vimModeItem.checked = menuStates.isVimModeEnabled;
    }
  }

  // Find and update the Study menu items
  const studyMenu = currentMenu.items.find(item => item.label === 'Study');
  if (studyMenu && studyMenu.submenu) {
    const studyItems = [
      'show-answer',
      'rate-again', 
      'rate-hard',
      'rate-good',
      'rate-easy',
      'play-audio',
      'exit-study'
    ];

    studyItems.forEach(itemId => {
      const menuItem = studyMenu.submenu!.items.find(item => (item as any).id === itemId);
      if (menuItem) {
        menuItem.enabled = isStudying;
      }
    });
  }
}

// Menu action handlers
function createNewDocument(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:new-document');
}

function createNewWindow(): void {
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // Calculate optimal window size (70% of screen, with minimum sizes)
  const windowWidth = Math.max(600, Math.floor(width * 0.7));
  const windowHeight = Math.max(400, Math.floor(height * 0.7));
  
  const newWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 600,
    minHeight: 400,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 20 } : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: require('path').join(__dirname, '../preload/index.js'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    show: false,
    backgroundColor: '#ffffff',
    vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
    frame: true,
    transparent: false
  });
  
  // Show window when ready to prevent visual flash
  newWindow.once('ready-to-show', () => {
    newWindow.show();
  });
  
  // Load the same content as main window
  if (process.env.NODE_ENV === 'development') {
    newWindow.loadURL('http://localhost:5173');
  } else {
    newWindow.loadFile(require('path').join(__dirname, '../renderer/index.html'));
  }
  
  // Handle external links
  newWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

function openDocument(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:open-document');
}

function openFolder(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:open-folder');
}

function openLexorLibrary(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:open-lexor-library');
}

function importToLibrary(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:import-to-library');
}

function addFolderToLibrary(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:add-folder-to-library');
}

function saveDocument(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:save-document');
}

function saveDocumentAs(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:save-document-as');
}

function exportAsHTML(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:export-html');
}

function exportAsPDF(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:export-pdf');
}

function openPreferences(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:preferences');
}

function showFind(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:find');
}

function showFindReplace(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:find-replace');
}

function toggleVimMode(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:toggle-vim-mode');
}

function highlightText(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:highlight-text');
}

function strikethroughText(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:strikethrough-text');
}

function renameSelectedItem(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:rename-selected');
}

function deleteSelectedItem(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:delete-selected');
}

function toggleFocusMode(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:toggle-focus-mode');
}

function toggleSidebar(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:toggle-sidebar');
}

function togglePreview(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:toggle-preview');
}

function toggleSplitScreen(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:toggle-split-screen');
}

function closeSplitScreen(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:close-split-screen');
}

function focusLeftPane(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:focus-left-pane');
}

function focusRightPane(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:focus-right-pane');
}

function swapPanes(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:swap-panes');
}

function toggleScrollbar(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:toggle-scrollbar');
}

function toggleDocumentStats(menuItem: MenuItem): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:toggle-document-stats');
  // Note: menuItem.checked is automatically toggled by Electron, 
  // so it reflects the new state after the click
}

function switchFlashcardView(viewMode: string): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:switch-flashcard-view', viewMode);
}

function zoomIn(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:zoom-in');
}

function zoomOut(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:zoom-out');
}

function resetZoom(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:reset-zoom');
}

function createNewFlashcard(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:new-flashcard');
}

function startStudySession(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:study-session');
}

function discoverLibrary(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:discover-library');
}

function importDeck(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:import-deck');
}

function exportDeck(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:export-deck');
}

function showStudyStats(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:study-stats');
}

function showKeyboardShortcuts(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  focusedWindow?.webContents.send('menu:keyboard-shortcuts');
}

function showAbout(): void {
  dialog.showMessageBox({
    type: 'info',
    title: 'About Lexor',
    message: 'Lexor',
    detail: `Version: ${app.getVersion()}\nA premium markdown editor and flashcard application.`,
    buttons: ['OK']
  });
}

// Window management functions
let previousWindowBounds: { x: number; y: number; width: number; height: number } | null = null;
let userPreferredSize: { width: number; height: number } | null = null;
let isWindowAutoSized = false; // Track if current size was set by fill/tile functions

// Track user window resize events
export function setupWindowResizeTracking(): void {
  // Set up tracking for all current windows
  BrowserWindow.getAllWindows().forEach(window => {
    window.removeAllListeners('resize'); // Remove any existing listeners
    window.on('resize', () => {
      // Only track resize as user action if not currently auto-sizing
      if (!isWindowAutoSized) {
        const bounds = window.getBounds();
        userPreferredSize = {
          width: bounds.width,
          height: bounds.height
        };
      }
    });
  });
}

function saveCurrentBounds(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  previousWindowBounds = focusedWindow.getBounds();
}

function centerWindow(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  saveCurrentBounds();
  
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  
  // Determine which size to use for centering
  let targetWidth: number;
  let targetHeight: number;
  
  if (userPreferredSize) {
    // Always use user-preferred size if we have it
    targetWidth = userPreferredSize.width;
    targetHeight = userPreferredSize.height;
  } else {
    // No user-preferred size saved, use current dimensions or default
    const currentBounds = focusedWindow.getBounds();
    if (isWindowAutoSized) {
      // Current size is auto-sized, use a reasonable default
      targetWidth = Math.floor(width * 0.7);
      targetHeight = Math.floor(height * 0.7);
    } else {
      // Use current user-set size
      targetWidth = currentBounds.width;
      targetHeight = currentBounds.height;
      // Save this as user preferred size for future use
      userPreferredSize = { width: targetWidth, height: targetHeight };
    }
  }
  
  // Calculate center position
  const centerX = x + Math.floor((width - targetWidth) / 2);
  const centerY = y + Math.floor((height - targetHeight) / 2);
  
  // Use setBounds with animate: true for smooth transition
  focusedWindow.setBounds({
    x: centerX,
    y: centerY,
    width: targetWidth,
    height: targetHeight
  }, true);
  
  // Mark as not auto-sized since user explicitly centered
  isWindowAutoSized = false;
}

function fillWindow(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  // Save user preferred size before auto-sizing (only if not already auto-sized)
  if (!isWindowAutoSized) {
    const currentBounds = focusedWindow.getBounds();
    userPreferredSize = { 
      width: currentBounds.width, 
      height: currentBounds.height 
    };
  }
  
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  
  // Add margins for better visual appearance
  const gap = 8;
  
  // Mark as auto-sized BEFORE setBounds to prevent resize events from overwriting userPreferredSize
  isWindowAutoSized = true;
  
  // Use setBounds with animate: true for smooth transition
  focusedWindow.setBounds({
    x: x + gap,
    y: y + gap,
    width: width - gap * 2,
    height: height - gap * 2
  }, true);
}

function tileLeft(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  // Save user preferred size before auto-sizing (only if not already auto-sized)
  if (!isWindowAutoSized && !userPreferredSize) {
    const currentBounds = focusedWindow.getBounds();
    userPreferredSize = { 
      width: currentBounds.width, 
      height: currentBounds.height 
    };
  }
  
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  
  // Add proper gaps for visual spacing
  const gap = 8;
  const windowWidth = Math.floor((width - gap * 3) / 2); // 3 gaps: left, middle, right
  
  // Mark as auto-sized BEFORE setBounds to prevent resize events from overwriting userPreferredSize
  isWindowAutoSized = true;
  
  focusedWindow.setBounds({
    x: x + gap,
    y: y + gap,
    width: windowWidth,
    height: height - gap * 2
  }, true);
}

function tileRight(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  
  // Add proper gaps for visual spacing
  const gap = 8;
  const windowWidth = Math.floor((width - gap * 3) / 2); // 3 gaps: left, middle, right
  const rightX = x + gap * 2 + windowWidth; // left gap + left window width + middle gap
  
  
  focusedWindow.setBounds({
    x: rightX,
    y: y + gap,
    width: windowWidth,
    height: height - gap * 2
  }, true);
}

function tileTop(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  
  // Add proper gaps for visual spacing
  const gap = 8;
  const windowHeight = Math.floor((height - gap * 3) / 2); // 3 gaps: top, middle, bottom
  
  focusedWindow.setBounds({
    x: x + gap,
    y: y + gap,
    width: width - gap * 2,
    height: windowHeight
  }, true);
}

function tileBottom(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  
  // Add proper gaps for visual spacing
  const gap = 8;
  const windowHeight = Math.floor((height - gap * 3) / 2); // 3 gaps: top, middle, bottom
  
  focusedWindow.setBounds({
    x: x + gap,
    y: y + gap * 2 + windowHeight, // top gap + top window height + middle gap
    width: width - gap * 2,
    height: windowHeight
  }, true);
}


// Quarter functions
function quarterTopLeft(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  focusedWindow.setBounds({
    x: x,
    y: y,
    width: Math.floor(width / 2),
    height: Math.floor(height / 2)
  });
}

function quarterTopRight(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  focusedWindow.setBounds({
    x: x + Math.floor(width / 2),
    y: y,
    width: Math.floor(width / 2),
    height: Math.floor(height / 2)
  });
}

function quarterBottomLeft(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  focusedWindow.setBounds({
    x: x,
    y: y + Math.floor(height / 2),
    width: Math.floor(width / 2),
    height: Math.floor(height / 2)
  });
}

function quarterBottomRight(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  saveCurrentBounds();
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;
  focusedWindow.setBounds({
    x: x + Math.floor(width / 2),
    y: y + Math.floor(height / 2),
    width: Math.floor(width / 2),
    height: Math.floor(height / 2)
  });
}

// Arrange functions (these would typically handle multiple windows, but for single window app we'll show a message)
function arrangeLeftRight(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  dialog.showMessageBox(focusedWindow, {
    type: 'info',
    title: 'Arrange Windows',
    message: 'Left & Right arrangement requires multiple windows.',
    detail: 'This feature arranges multiple windows side by side.',
    buttons: ['OK']
  });
}

function arrangeRightLeft(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  dialog.showMessageBox(focusedWindow, {
    type: 'info',
    title: 'Arrange Windows',
    message: 'Right & Left arrangement requires multiple windows.',
    detail: 'This feature arranges multiple windows side by side.',
    buttons: ['OK']
  });
}

function arrangeTopBottom(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  dialog.showMessageBox(focusedWindow, {
    type: 'info',
    title: 'Arrange Windows',
    message: 'Top & Bottom arrangement requires multiple windows.',
    detail: 'This feature arranges multiple windows vertically.',
    buttons: ['OK']
  });
}

function arrangeBottomTop(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  dialog.showMessageBox(focusedWindow, {
    type: 'info',
    title: 'Arrange Windows',
    message: 'Bottom & Top arrangement requires multiple windows.',
    detail: 'This feature arranges multiple windows vertically.',
    buttons: ['OK']
  });
}

function arrangeQuarters(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;
  
  dialog.showMessageBox(focusedWindow, {
    type: 'info',
    title: 'Arrange Windows',
    message: 'Quarters arrangement requires multiple windows.',
    detail: 'This feature arranges multiple windows in a grid.',
    buttons: ['OK']
  });
}

function returnToPreviousSize(): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow || !previousWindowBounds) return;
  
  focusedWindow.setBounds(previousWindowBounds);
}

// Create native context menu for file/folder items
export function createContextMenu(item: any, window: BrowserWindow): Menu {
  const template: MenuItemConstructorOptions[] = [];

  // New Folder and New Document - only for directories
  if (item.isDirectory) {
    template.push(
      {
        label: 'New Folder',
        click: () => {
          window.webContents.send('context-menu:new-folder', item.path);
        }
      },
      {
        label: 'New Document',
        click: () => {
          window.webContents.send('context-menu:new-document', item.path);
        }
      },
      { type: 'separator' }
    );
  }

  // Open in Right Pane - only for files in split screen mode
  if (!item.isDirectory) {
    template.push({
      label: 'Open in Right Pane',
      click: () => {
        window.webContents.send('context-menu:open-in-right-pane', item.path);
      }
    });
  }

  // Rename and Delete - always available
  template.push(
    {
      label: 'Rename',
      accelerator: 'F2',
      click: () => {
        window.webContents.send('context-menu:rename', item);
      }
    },
    {
      label: 'Delete',
      accelerator: process.platform === 'darwin' ? 'Cmd+Backspace' : 'Delete',
      click: () => {
        window.webContents.send('context-menu:delete', item);
      }
    }
  );

  return Menu.buildFromTemplate(template);
}

