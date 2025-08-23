import React, { useState, useRef } from 'react';
import { useAppStore, FileItem } from '../stores/appStore';
import { 
  FolderIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  HomeIcon,
  BookOpenIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface FolderBrowserProps {
  onFileSelect?: (filePath: string) => void;
}

export function FolderBrowser({ onFileSelect }: FolderBrowserProps) {
  const { 
    currentFolder, 
    folderContents, 
    isLoadingFolder,
    loadFolderContents,
    theme,
    rootFolder,
    setCurrentFolder,
    libraryFolder,
    isCurrentFolderLibrary,
    isPathInLibrary,
    selectedItem,
    setSelectedItem,
    currentDocument,
    setCurrentDocument,
    setDocumentContent,
    setDocumentModified,
    focusEditor,
    // Split screen functionality
    isSplitScreenMode,
    openInRightPane,
    focusedPane
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem | null;
    isVisible: boolean;
  }>({ x: 0, y: 0, item: null, isVisible: false });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Generate breadcrumb path
  const getBreadcrumbs = () => {
    if (!currentFolder || !rootFolder) return [];
    
    // Check if this is the library root
    const isLibraryRoot = libraryFolder && rootFolder === libraryFolder;
    const rootName = isLibraryRoot ? 'Lexor Library' : (rootFolder.split('/').pop() || 'Root');
    const relativePath = currentFolder.replace(rootFolder, '').replace(/^\/+/, '');
    
    if (!relativePath) {
      return [{ name: rootName, path: rootFolder, isLibrary: isLibraryRoot }];
    }
    
    const pathSegments = relativePath.split('/');
    const breadcrumbs = [{ name: rootName, path: rootFolder, isLibrary: isLibraryRoot }];
    
    let currentPath = rootFolder;
    for (const segment of pathSegments) {
      currentPath = `${currentPath}/${segment}`;
      breadcrumbs.push({ 
        name: segment, 
        path: currentPath, 
        isLibrary: isPathInLibrary(currentPath) 
      });
    }
    
    return breadcrumbs;
  };

  const navigateToFolder = async (folderPath: string) => {
    await loadFolderContents(folderPath);
  };

  // File management functions
  const handleContextMenu = (e: React.MouseEvent, item: FileItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      isVisible: true
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isVisible: false }));
  };

  const handleRename = async (item: FileItem) => {
    closeContextMenu();
    setEditingItem(item.path);
    setNewItemName(item.name);
    // Focus input after a short delay to ensure it's rendered
    setTimeout(() => editInputRef.current?.focus(), 100);
  };

  const confirmRename = async (oldPath: string) => {
    if (!newItemName.trim() || !window.electronAPI?.file?.rename) return;
    
    try {
      const result = await window.electronAPI.file.rename(oldPath, newItemName);
      if (result.success && currentFolder) {
        await loadFolderContents(currentFolder);
      }
    } catch (error) {
      console.error('Failed to rename:', error);
    } finally {
      setEditingItem(null);
      setNewItemName('');
    }
  };

  const handleDelete = async (item: FileItem) => {
    closeContextMenu();
    
    const confirmMessage = item.isDirectory 
      ? `Delete folder "${item.name}" and all its contents?`
      : `Delete file "${item.name}"?`;
      
    if (!confirm(confirmMessage)) return;
    
    try {
      const result = await window.electronAPI?.file?.delete(item.path);
      if (result?.success) {
        // Check if the deleted item affects the currently open document
        if (currentDocument && (
          currentDocument === item.path || // Direct file match
          (item.isDirectory && currentDocument.startsWith(item.path + '/')) // File is inside deleted folder
        )) {
          // Clear the editor since the file no longer exists
          setCurrentDocument(null);
          setDocumentContent('');
          setDocumentModified(false);
          // Focus the editor so user can continue typing
          setTimeout(() => focusEditor(), 100);
        }
        
        // Refresh folder contents
        if (currentFolder) {
          await loadFolderContents(currentFolder);
        }
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };


  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu.isVisible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.isVisible]);

  // Listen for rename events from menu/keyboard shortcuts
  React.useEffect(() => {
    const handleRenameSelected = () => {
      if (selectedItem) {
        setEditingItem(selectedItem.path);
        setNewItemName(selectedItem.name);
        // Focus input after a short delay to ensure it's rendered
        setTimeout(() => editInputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('renameSelectedFile', handleRenameSelected);
    return () => window.removeEventListener('renameSelectedFile', handleRenameSelected);
  }, [selectedItem]);

  const handleFolderClick = async (folder: FileItem) => {
    // Navigate into folder (don't use expand/collapse for navigation)
    await navigateToFolder(folder.path);
  };

  const handleFileClick = async (file: FileItem) => {
    // Set this item as selected
    setSelectedItem(file);
    
    if (file.isDirectory) {
      await handleFolderClick(file);
    } else if (onFileSelect) {
      onFileSelect(file.path);
    }
  };

  const openFolder = async () => {
    try {
      const result = await window.electronAPI?.folder?.showOpenDialog();
      if (result && !result.canceled && result.filePaths[0]) {
        await loadFolderContents(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const renderFileItem = (item: FileItem) => {
    const isEditing = editingItem === item.path;
    const isSelected = selectedItem?.path === item.path;
    
    return (
      <div key={item.path}>
        {isEditing ? (
          <div className="px-3 py-2">
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-3">
                {item.isDirectory ? (
                  <FolderIcon className={clsx(
                    "h-5 w-5",
                    isDarkMode ? "text-accent-blue" : "text-blue-600"
                  )} />
                ) : (
                  <DocumentTextIcon className={clsx(
                    "h-5 w-5",
                    isDarkMode ? "text-kanagawa-gray" : "text-gray-500"
                  )} />
                )}
              </div>
              <input
                ref={editInputRef}
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    confirmRename(item.path);
                  } else if (e.key === 'Escape') {
                    setEditingItem(null);
                    setNewItemName('');
                  }
                }}
                onBlur={() => confirmRename(item.path)}
                className={clsx(
                  'flex-1 px-2 py-1 text-sm rounded border focus:outline-none focus:ring-2 focus:ring-accent-blue',
                  isDarkMode 
                    ? 'border-kanagawa-ink5 bg-kanagawa-ink5 text-kanagawa-white' 
                    : 'border-gray-300 bg-white text-gray-900'
                )}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => handleFileClick(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
            className={clsx(
              'w-full flex items-center py-2 px-3 text-sm rounded-lg transition-all duration-200 text-left group',
              isSelected
                ? // Selected state - subtle background with clean border
                  isDarkMode 
                    ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/15' 
                    : 'bg-blue-50/50 text-blue-700 border border-blue-100/60'
                : // Normal state
                  isDarkMode 
                    ? 'hover:bg-kanagawa-ink4 text-kanagawa-oldwhite' 
                    : 'hover:bg-gray-50 text-gray-700'
            )}
          >
            <div className="flex items-center flex-1 min-w-0">
              {item.isDirectory ? (
                <>
                  <div className="flex-shrink-0 mr-3">
                    <FolderIcon className={clsx(
                      "h-5 w-5 transition-colors",
                      isDarkMode 
                        ? "text-accent-blue group-hover:text-blue-400" 
                        : "text-blue-600 group-hover:text-blue-700"
                    )} />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-shrink-0 mr-3">
                    <DocumentTextIcon className={clsx(
                      "h-5 w-5 transition-colors",
                      isDarkMode 
                        ? "text-kanagawa-gray group-hover:text-kanagawa-oldwhite" 
                        : "text-gray-500 group-hover:text-gray-700"
                    )} />
                  </div>
                </>
              )}
              <span className="truncate font-medium">{item.name}</span>
              {item.isDirectory && (
                <ChevronRightIcon className={clsx(
                  "h-4 w-4 ml-auto flex-shrink-0 transition-all duration-200 group-hover:translate-x-0.5",
                  isDarkMode ? "text-kanagawa-gray" : "text-gray-400"
                )} />
              )}
            </div>
          </button>
        )}
      </div>
    );
  };

  if (!currentFolder) {
    return null;
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <div>
      {/* Library Header - Special styling when in library */}
      {isCurrentFolderLibrary && (
        <div className={clsx(
          "px-3 py-2 border-b",
          isDarkMode 
            ? "border-emerald-800 bg-emerald-900/20" 
            : "border-emerald-200 bg-emerald-50"
        )}>
          <div className="flex items-center">
            <BookOpenIcon className={clsx(
              "h-4 w-4 mr-2",
              isDarkMode ? "text-emerald-400" : "text-emerald-600"
            )} />
            <span className={clsx(
              "text-xs font-medium uppercase tracking-wide",
              isDarkMode ? "text-emerald-400" : "text-emerald-700"
            )}>
              Sync Enabled
            </span>
            <div className={clsx(
              "ml-2 h-2 w-2 rounded-full",
              isDarkMode ? "bg-emerald-400" : "bg-emerald-500"
            )} />
          </div>
        </div>
      )}

      {/* Premium Breadcrumb Navigation */}
      <div className={clsx(
        "px-3 py-3 border-b",
        isCurrentFolderLibrary
          ? isDarkMode 
            ? "border-emerald-800 bg-emerald-900/10" 
            : "border-emerald-200 bg-emerald-25"
          : isDarkMode 
            ? "border-kanagawa-ink4 bg-kanagawa-ink2" 
            : "border-gray-200 bg-gray-50"
      )}>
        <div className="flex items-center space-x-1 min-w-0">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center min-w-0">
              {index > 0 && (
                <ChevronRightIcon className={clsx(
                  "h-3 w-3 mx-1 flex-shrink-0",
                  isDarkMode ? "text-kanagawa-gray" : "text-gray-400"
                )} />
              )}
              <button
                onClick={() => navigateToFolder(crumb.path)}
                className={clsx(
                  'flex items-center px-2 py-1 text-sm rounded-md transition-all duration-200 min-w-0',
                  index === breadcrumbs.length - 1 
                    ? // Current folder - highlighted
                      crumb.isLibrary
                        ? isDarkMode
                          ? 'bg-emerald-600 text-white font-medium'
                          : 'bg-emerald-600 text-white font-medium'
                        : isDarkMode
                          ? 'bg-accent-blue text-white font-medium'
                          : 'bg-blue-600 text-white font-medium'
                    : // Navigable parent folders
                      crumb.isLibrary
                        ? isDarkMode
                          ? 'text-emerald-400 hover:bg-kanagawa-ink4 font-medium'
                          : 'text-emerald-600 hover:bg-emerald-50 font-medium'
                        : isDarkMode
                          ? 'text-kanagawa-oldwhite hover:bg-kanagawa-ink4 font-medium'
                          : 'text-gray-700 hover:bg-gray-200 font-medium'
                )}
                disabled={index === breadcrumbs.length - 1}
              >
                {index === 0 && (
                  crumb.isLibrary ? (
                    <BookOpenIcon className={clsx(
                      "h-4 w-4 mr-1.5 flex-shrink-0",
                      index === breadcrumbs.length - 1 
                        ? "text-white" 
                        : isDarkMode 
                          ? "text-emerald-400" 
                          : "text-emerald-600"
                    )} />
                  ) : (
                    <HomeIcon className={clsx(
                      "h-4 w-4 mr-1.5 flex-shrink-0",
                      index === breadcrumbs.length - 1 
                        ? "text-white" 
                        : isDarkMode 
                          ? "text-accent-blue" 
                          : "text-blue-600"
                    )} />
                  )
                )}
                <span className="truncate max-w-32">{crumb.name}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Back button for quick navigation */}
        {breadcrumbs.length > 1 && (
          <div className="mt-2">
            <button
              onClick={() => {
                const parentPath = breadcrumbs[breadcrumbs.length - 2].path;
                navigateToFolder(parentPath);
              }}
              className={clsx(
                'flex items-center px-2 py-1 text-xs rounded-md transition-all duration-200 group',
                isDarkMode 
                  ? 'text-kanagawa-gray hover:text-kanagawa-oldwhite hover:bg-kanagawa-ink4' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              )}
            >
              <ChevronLeftIcon className="h-3 w-3 mr-1 transition-transform group-hover:-translate-x-0.5" />
              Back to {breadcrumbs[breadcrumbs.length - 2].name}
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoadingFolder && (
        <div className="px-4 py-6 text-center">
          <div className={clsx(
            "text-sm",
            isDarkMode ? "text-kanagawa-gray" : "text-gray-500"
          )}>
            Loading folder contents...
          </div>
        </div>
      )}

      {/* File list */}
      {!isLoadingFolder && (
        <div className="py-2 max-h-80 overflow-y-auto">
          {folderContents.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <FolderIcon className={clsx(
                "h-8 w-8 mx-auto mb-2",
                isDarkMode ? "text-kanagawa-gray" : "text-gray-400"
              )} />
              <p className={clsx(
                "text-sm",
                isDarkMode ? "text-kanagawa-gray" : "text-gray-500"
              )}>
                This folder is empty
              </p>
            </div>
          ) : (
            <div className="px-2 space-y-1">
              {folderContents.map(item => renderFileItem(item))}
            </div>
          )}
        </div>
      )}


      {/* Context Menu - Only shows for actual items */}
      {contextMenu.isVisible && contextMenu.item && (
        <div
          className={clsx(
            'fixed z-50 min-w-48 py-1 rounded-lg shadow-lg border',
            isDarkMode 
              ? 'bg-kanagawa-ink4 border-kanagawa-ink5' 
              : 'bg-white border-gray-200'
          )}
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Open in Right Pane - only for files in split screen mode */}
          {isSplitScreenMode && !contextMenu.item.isDirectory && (
            <button
              onClick={async () => {
                await openInRightPane(contextMenu.item!.path);
                closeContextMenu();
              }}
              className={clsx(
                'w-full flex items-center px-3 py-2 text-sm transition-colors text-left',
                isDarkMode
                  ? 'text-accent-blue hover:bg-kanagawa-ink5'
                  : 'text-blue-600 hover:bg-blue-50'
              )}
            >
              <DocumentTextIcon className="h-4 w-4 mr-3" />
              Open in Right Pane
            </button>
          )}
          
          <button
            onClick={() => handleRename(contextMenu.item!)}
            className={clsx(
              'w-full flex items-center px-3 py-2 text-sm transition-colors text-left',
              isDarkMode
                ? 'text-kanagawa-oldwhite hover:bg-kanagawa-ink5'
                : 'text-gray-700 hover:bg-gray-50'
            )}
          >
            <PencilIcon className="h-4 w-4 mr-3" />
            Rename
          </button>
          
          <button
            onClick={() => handleDelete(contextMenu.item!)}
            className={clsx(
              'w-full flex items-center px-3 py-2 text-sm transition-colors text-left',
              isDarkMode
                ? 'text-red-400 hover:bg-red-900/20'
                : 'text-red-600 hover:bg-red-50'
            )}
          >
            <TrashIcon className="h-4 w-4 mr-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}