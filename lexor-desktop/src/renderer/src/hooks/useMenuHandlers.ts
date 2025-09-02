import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { useFlashcardStore } from '../stores/flashcardStore';

export function useMenuHandlers() {
  const {
    toggleSidebar,
    toggleFocusMode,
    zoomIn,
    zoomOut,
    resetZoom,
    setCurrentView,
    setDocumentContent,
    setCurrentDocument,
    setDocumentModified,
    loadFolderContents,
    setRootFolder,
    openLexorLibrary,
    libraryFolder,
    selectedItem,
    setSelectedItem,
    currentFolder,
    currentDocument,
    focusEditor,
    currentView,
    // Split screen actions
    toggleSplitScreen,
    closeSplitScreen,
    setFocusedPane,
    swapPanes,
    isSplitScreenMode,
    // Scrollbar toggle
    toggleScrollbar,
    // Document stats toggle
    toggleDocumentStats,
    // Vim mode toggle
    toggleVimMode,
    isVimModeEnabled,
  } = useAppStore();

  const { currentSession, discoverAndSyncLibrary } = useFlashcardStore();

  // Update menu state when selection or view changes
  useEffect(() => {
    if (window.electronAPI?.menu?.updateState) {
      const hasSelectedFile = selectedItem !== null;
      const isStudying = currentSession !== null;
      window.electronAPI.menu.updateState(hasSelectedFile, currentView, isStudying, { isVimModeEnabled });
    }
  }, [selectedItem, currentView, currentSession, isVimModeEnabled]);

  useEffect(() => {
    if (!window.electronAPI) return;

    // Document operations
    const handleNewDocument = async () => {
      try {
        if (libraryFolder) {
          // Create a new document in the Lexor Library
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const fileName = `Document-${timestamp}.md`;
          const initialContent = '# New Document\n\n';
          
          const result = await window.electronAPI.file.createFile(libraryFolder, fileName, initialContent);
          if (result?.success) {
            // Open the newly created file
            setDocumentContent(initialContent);
            setCurrentDocument(result.filePath);
            setDocumentModified(false);
            setCurrentView('editor');
            
            // Navigate to library and refresh contents to show the new file
            await loadFolderContents(libraryFolder);
            
            // Also trigger a custom event to refresh tree view if active
            window.dispatchEvent(new CustomEvent('refreshFolderView'));
            
            return;
          }
        }
        
        // Fallback to traditional new document if library not available
        setDocumentContent('');
        setCurrentDocument(null);
        setDocumentModified(false);
        setCurrentView('editor');
      } catch (error) {
        console.error('Failed to create new document in library:', error);
        // Fallback to traditional new document
        setDocumentContent('');
        setCurrentDocument(null);
        setDocumentModified(false);
        setCurrentView('editor');
      }
    };

    const handleOpenDocument = async () => {
      try {
        const result = await window.electronAPI.file.showOpenDialog();
        if (!result.canceled && result.filePaths.length > 0) {
          const filePath = result.filePaths[0];
          const content = await window.electronAPI.file.readFile(filePath);
          setDocumentContent(content);
          setCurrentDocument(filePath);
          setDocumentModified(false);
          setCurrentView('editor');
        }
      } catch (error) {
        console.error('Failed to open document:', error);
      }
    };

    const handleOpenFolder = async () => {
      try {
        const result = await window.electronAPI.folder.showOpenDialog();
        if (!result.canceled && result.filePaths.length > 0) {
          const folderPath = result.filePaths[0];
          // Reset root folder when opening a new folder via menu
          setRootFolder(folderPath);
          await loadFolderContents(folderPath);
        }
      } catch (error) {
        console.error('Failed to open folder:', error);
      }
    };

    const handleOpenLexorLibrary = async () => {
      try {
        await openLexorLibrary();
      } catch (error) {
        console.error('Failed to open Lexor Library:', error);
      }
    };

    const handleImportToLibrary = async () => {
      try {
        if (!libraryFolder) {
          console.warn('Library folder not set');
          return;
        }

        const result = await window.electronAPI.library.importFiles(libraryFolder);
        
        if (result.success) {
          console.log(`Successfully imported ${result.count} files to library`);
          // Refresh library contents if currently viewing library
          await loadFolderContents(libraryFolder);
          // Also trigger tree view refresh
          window.dispatchEvent(new CustomEvent('refreshFolderView'));
        } else if (result.errors.length > 0) {
          console.error('Import errors:', result.errors);
        }
      } catch (error) {
        console.error('Failed to import to library:', error);
      }
    };

    const handleAddFolderToLibrary = async () => {
      try {
        if (!libraryFolder) {
          console.warn('Library folder not set');
          return;
        }

        // Navigate to library first if not already there
        if (currentFolder !== libraryFolder) {
          await loadFolderContents(libraryFolder);
          // Trigger tree view refresh if needed
          window.dispatchEvent(new CustomEvent('refreshFolderView'));
        }

        // Dispatch custom event to trigger the folder creation dialog in FolderBrowser
        window.dispatchEvent(new CustomEvent('createFolderInLibrary'));
      } catch (error) {
        console.error('Failed to initiate folder creation in library:', error);
      }
    };

    const handleSaveDocument = async () => {
      const { currentDocument, documentContent } = useAppStore.getState();
      
      try {
        if (currentDocument) {
          await window.electronAPI.file.writeFile(currentDocument, documentContent);
          setDocumentModified(false);
        } else {
          handleSaveDocumentAs();
        }
      } catch (error) {
        console.error('Failed to save document:', error);
      }
    };

    const handleSaveDocumentAs = async () => {
      const { documentContent } = useAppStore.getState();
      
      try {
        const result = await window.electronAPI.file.showSaveDialog();
        if (!result.canceled && result.filePath) {
          await window.electronAPI.file.writeFile(result.filePath, documentContent);
          setCurrentDocument(result.filePath);
          setDocumentModified(false);
        }
      } catch (error) {
        console.error('Failed to save document:', error);
      }
    };

    const handleExportHTML = () => {
      // TODO: Implement HTML export
      console.log('Export HTML not implemented yet');
    };

    const handleExportPDF = () => {
      // TODO: Implement PDF export
      console.log('Export PDF not implemented yet');
    };

    const handlePreferences = () => {
      setCurrentView('settings');
    };

    // Editor operations
    const handleFind = () => {
      // TODO: Implement find functionality
      console.log('Find not implemented yet');
    };

    const handleFindReplace = () => {
      // TODO: Implement find and replace
      console.log('Find and replace not implemented yet');
    };

    // Flashcard operations
    const handleNewFlashcard = () => {
      setCurrentView('flashcards');
      // TODO: Create new flashcard
    };

    const handleStudySession = () => {
      setCurrentView('study');
    };

    const handleDiscoverLibrary = async () => {
      try {
        // Switch to flashcards view to show the results
        setCurrentView('flashcards');
        
        // Run the discovery process
        await discoverAndSyncLibrary();
      } catch (error) {
        console.error('Failed to discover library:', error);
      }
    };

    const handleImportDeck = () => {
      // TODO: Implement deck import
      console.log('Import deck not implemented yet');
    };

    const handleExportDeck = () => {
      // TODO: Implement deck export
      console.log('Export deck not implemented yet');
    };

    const handleStudyStats = () => {
      setCurrentView('study');
      // TODO: Show statistics view
    };

    const handleKeyboardShortcuts = () => {
      // No longer needed - shortcuts shown directly in menu
      console.log('Keyboard shortcuts displayed in Study menu');
    };

    // Split screen operations
    const handleToggleSplitScreen = () => {
      toggleSplitScreen();
    };

    const handleCloseSplitScreen = () => {
      closeSplitScreen();
    };

    const handleFocusLeftPane = () => {
      if (isSplitScreenMode) {
        setFocusedPane('left');
      }
    };

    const handleFocusRightPane = () => {
      if (isSplitScreenMode) {
        setFocusedPane('right');
      }
    };

    const handleSwapPanes = () => {
      if (isSplitScreenMode) {
        swapPanes();
      }
    };

    const handleToggleScrollbar = () => {
      toggleScrollbar();
    };

    const handleSwitchFlashcardView = (viewMode: string) => {
      // Always dispatch the event - let the FlashcardView component decide if it should handle it
      // This is more robust than checking currentView which might not be reliable with routing
      window.dispatchEvent(new CustomEvent('switchFlashcardView', { detail: { viewMode } }));
    };

    const handleToggleDocumentStats = () => {
      toggleDocumentStats();
    };

    const handleToggleVimMode = () => {
      toggleVimMode();
    };

    const handleRenameSelected = () => {
      if (!selectedItem) {
        console.warn('No item selected for rename');
        return;
      }

      // Dispatch custom event to trigger inline editing in FolderBrowser
      window.dispatchEvent(new CustomEvent('renameSelectedFile'));
    };

    const handleDeleteSelected = async () => {
      if (!selectedItem) {
        console.warn('No item selected for delete');
        return;
      }

      const confirmMessage = selectedItem.isDirectory 
        ? `Delete folder "${selectedItem.name}" and all its contents?`
        : `Delete file "${selectedItem.name}"?`;
        
      if (!confirm(confirmMessage)) return;

      try {
        const result = await window.electronAPI.file.delete(selectedItem.path);
        if (result?.success) {
          // Check if the deleted item affects the currently open document
          if (currentDocument && (
            currentDocument === selectedItem.path || // Direct file match
            (selectedItem.isDirectory && currentDocument.startsWith(selectedItem.path + '/')) // File is inside deleted folder
          )) {
            // Clear the editor since the file no longer exists
            setCurrentDocument(null);
            setDocumentContent('');
            setDocumentModified(false);
            // Focus the editor so user can continue typing
            setTimeout(() => focusEditor(), 100);
          }
          
          // Refresh folder contents and clear selection
          if (currentFolder) {
            await loadFolderContents(currentFolder);
            // Trigger tree view refresh
            window.dispatchEvent(new CustomEvent('refreshFolderView'));
          }
          setSelectedItem(null);
        }
      } catch (error) {
        console.error('Failed to delete item:', error);
      }
    };

    // Register menu handlers
    const unsubscribers = [
      window.electronAPI.menu.onNewDocument(handleNewDocument),
      window.electronAPI.menu.onOpenDocument(handleOpenDocument),
      window.electronAPI.menu.onOpenFolder(handleOpenFolder),
      window.electronAPI.menu.onOpenLexorLibrary(handleOpenLexorLibrary),
      window.electronAPI.menu.onImportToLibrary(handleImportToLibrary),
      window.electronAPI.menu.onAddFolderToLibrary(handleAddFolderToLibrary),
      window.electronAPI.menu.onSaveDocument(handleSaveDocument),
      window.electronAPI.menu.onSaveDocumentAs(handleSaveDocumentAs),
      window.electronAPI.menu.onExportHTML(handleExportHTML),
      window.electronAPI.menu.onExportPDF(handleExportPDF),
      window.electronAPI.menu.onPreferences(handlePreferences),
      window.electronAPI.menu.onFind(handleFind),
      window.electronAPI.menu.onFindReplace(handleFindReplace),
      window.electronAPI.menu.onRenameSelected(handleRenameSelected),
      window.electronAPI.menu.onDeleteSelected(handleDeleteSelected),
      window.electronAPI.menu.onToggleSidebar(toggleSidebar),
      window.electronAPI.menu.onToggleFocusMode(toggleFocusMode),
      window.electronAPI.menu.onZoomIn(zoomIn),
      window.electronAPI.menu.onZoomOut(zoomOut),
      window.electronAPI.menu.onResetZoom(resetZoom),
      window.electronAPI.menu.onNewFlashcard(handleNewFlashcard),
      window.electronAPI.menu.onStudySession(handleStudySession),
      window.electronAPI.menu.onDiscoverLibrary(handleDiscoverLibrary),
      window.electronAPI.menu.onImportDeck(handleImportDeck),
      window.electronAPI.menu.onExportDeck(handleExportDeck),
      window.electronAPI.menu.onStudyStats(handleStudyStats),
      window.electronAPI.menu.onKeyboardShortcuts(handleKeyboardShortcuts),
      // Split screen handlers
      window.electronAPI.menu.onToggleSplitScreen(handleToggleSplitScreen),
      window.electronAPI.menu.onCloseSplitScreen(handleCloseSplitScreen),
      window.electronAPI.menu.onFocusLeftPane(handleFocusLeftPane),
      window.electronAPI.menu.onFocusRightPane(handleFocusRightPane),
      window.electronAPI.menu.onSwapPanes(handleSwapPanes),
      window.electronAPI.menu.onToggleScrollbar(handleToggleScrollbar),
      window.electronAPI.menu.onSwitchFlashcardView(handleSwitchFlashcardView),
      window.electronAPI.menu.onToggleDocumentStats(handleToggleDocumentStats),
      window.electronAPI.menu.onToggleVimMode(handleToggleVimMode),
    ];

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [
    toggleSidebar,
    toggleFocusMode,
    zoomIn,
    zoomOut,
    resetZoom,
    setCurrentView,
    setDocumentContent,
    setCurrentDocument,
    setDocumentModified,
    loadFolderContents,
    setRootFolder,
    openLexorLibrary,
    libraryFolder,
    selectedItem,
    setSelectedItem,
    currentFolder,
    currentDocument,
    focusEditor,
    currentView,
    toggleSplitScreen,
    closeSplitScreen,
    setFocusedPane,
    swapPanes,
    isSplitScreenMode,
    toggleScrollbar,
    toggleDocumentStats,
    toggleVimMode,
    isVimModeEnabled,
    discoverAndSyncLibrary,
  ]);
}