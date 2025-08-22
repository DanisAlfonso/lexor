import { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';

export function useMenuHandlers() {
  const {
    toggleSidebar,
    toggleFocusMode,
    togglePreviewMode,
    zoomIn,
    zoomOut,
    resetZoom,
    setCurrentView,
    setDocumentContent,
    setCurrentDocument,
    setDocumentModified,
  } = useAppStore();

  useEffect(() => {
    if (!window.electronAPI) return;

    // Document operations
    const handleNewDocument = () => {
      setDocumentContent('');
      setCurrentDocument(null);
      setDocumentModified(false);
      setCurrentView('editor');
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
      // TODO: Show keyboard shortcuts dialog
      console.log('Keyboard shortcuts not implemented yet');
    };

    // Register menu handlers
    const unsubscribers = [
      window.electronAPI.menu.onNewDocument(handleNewDocument),
      window.electronAPI.menu.onOpenDocument(handleOpenDocument),
      window.electronAPI.menu.onSaveDocument(handleSaveDocument),
      window.electronAPI.menu.onSaveDocumentAs(handleSaveDocumentAs),
      window.electronAPI.menu.onExportHTML(handleExportHTML),
      window.electronAPI.menu.onExportPDF(handleExportPDF),
      window.electronAPI.menu.onPreferences(handlePreferences),
      window.electronAPI.menu.onFind(handleFind),
      window.electronAPI.menu.onFindReplace(handleFindReplace),
      window.electronAPI.menu.onToggleSidebar(toggleSidebar),
      window.electronAPI.menu.onToggleFocusMode(toggleFocusMode),
      window.electronAPI.menu.onTogglePreview(togglePreviewMode),
      window.electronAPI.menu.onZoomIn(zoomIn),
      window.electronAPI.menu.onZoomOut(zoomOut),
      window.electronAPI.menu.onResetZoom(resetZoom),
      window.electronAPI.menu.onNewFlashcard(handleNewFlashcard),
      window.electronAPI.menu.onStudySession(handleStudySession),
      window.electronAPI.menu.onImportDeck(handleImportDeck),
      window.electronAPI.menu.onExportDeck(handleExportDeck),
      window.electronAPI.menu.onStudyStats(handleStudyStats),
      window.electronAPI.menu.onKeyboardShortcuts(handleKeyboardShortcuts),
    ];

    // Cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [
    toggleSidebar,
    toggleFocusMode,
    togglePreviewMode,
    zoomIn,
    zoomOut,
    resetZoom,
    setCurrentView,
    setDocumentContent,
    setCurrentDocument,
    setDocumentModified,
  ]);
}