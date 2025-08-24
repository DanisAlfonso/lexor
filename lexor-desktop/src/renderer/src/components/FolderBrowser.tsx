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
  PlusIcon,
  FolderPlusIcon,
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
  const [treeData, setTreeData] = useState<FileItem[]>([]);
  const [isTreeView, setIsTreeView] = useState(true); // Enable tree view by default
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileItem | null;
    isVisible: boolean;
  }>({ x: 0, y: 0, item: null, isVisible: false });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // New Folder dialog state
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentPath, setNewFolderParentPath] = useState<string>('');
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Drag & Drop state
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
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
    if (isTreeView) {
      // In tree view, just set the current folder and reload tree data
      setCurrentFolder(folderPath);
      await loadTreeData(folderPath);
    } else {
      await loadFolderContents(folderPath);
    }
  };

  const loadTreeData = async (folderPath: string) => {
    try {
      const data = await window.electronAPI?.folder?.readDirectory(folderPath, false);
      if (data) {
        setTreeData(data);
        setCurrentFolder(folderPath);
      }
    } catch (error) {
      console.error('Failed to load tree data:', error);
    }
  };

  const toggleFolderExpanded = async (folderPath: string) => {
    const newExpandedFolders = new Set(expandedFolders);
    
    if (expandedFolders.has(folderPath)) {
      // Collapse
      newExpandedFolders.delete(folderPath);
    } else {
      // Expand - load children if not already loaded
      newExpandedFolders.add(folderPath);
      
      // Find the folder in tree data and load its children
      const loadChildrenRecursive = async (items: FileItem[]): Promise<FileItem[]> => {
        const result: FileItem[] = [];
        for (const item of items) {
          if (item.path === folderPath && item.isDirectory) {
            // Load children for this folder
            const children = await window.electronAPI?.folder?.readDirectory(folderPath, false);
            result.push({ ...item, children: children || [] });
          } else if (item.children) {
            result.push({ ...item, children: await loadChildrenRecursive(item.children) });
          } else {
            result.push(item);
          }
        }
        return result;
      };
      
      const newTreeData = await loadChildrenRecursive(treeData);
      setTreeData(newTreeData);
    }
    
    setExpandedFolders(newExpandedFolders);
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
        // Use the unified refresh system
        if (isTreeView) {
          await loadTreeData(currentFolder);
        } else {
          await loadFolderContents(currentFolder);
        }
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
          if (isTreeView) {
            await loadTreeData(currentFolder);
          } else {
            await loadFolderContents(currentFolder);
          }
        }
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCreateFolder = (parentPath?: string) => {
    closeContextMenu();
    
    const targetPath = parentPath || currentFolder;
    if (!targetPath) return;
    
    // Show the dialog
    setNewFolderParentPath(targetPath);
    setNewFolderName('');
    setShowNewFolderDialog(true);
    
    // Focus the input after dialog opens
    setTimeout(() => newFolderInputRef.current?.focus(), 100);
  };

  const handleCreateFolderConfirm = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      const result = await window.electronAPI?.file?.createFolder(newFolderParentPath, newFolderName.trim());
      if (result?.success) {
        // Close dialog
        setShowNewFolderDialog(false);
        setNewFolderName('');
        
        // Refresh folder contents using unified system
        if (isTreeView) {
          await loadTreeData(currentFolder!);
        } else {
          await loadFolderContents(currentFolder!);
        }
        
        // If we created in a subfolder, expand it to show the new folder
        if (newFolderParentPath && newFolderParentPath !== currentFolder) {
          setExpandedFolders(prev => new Set(prev).add(newFolderParentPath));
        }
      } else {
        alert(`Failed to create folder: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
      alert('Failed to create folder');
    }
  };

  const handleCreateFolderCancel = () => {
    setShowNewFolderDialog(false);
    setNewFolderName('');
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    setDraggedItem(item);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.path);
    
    // Create custom drag image with better positioning
    const dragElement = e.currentTarget as HTMLElement;
    const clone = dragElement.cloneNode(true) as HTMLElement;
    
    // Style the clone
    clone.style.transform = 'rotate(-3deg)';
    clone.style.opacity = '0.9';
    clone.style.pointerEvents = 'none';
    clone.style.position = 'absolute';
    clone.style.top = '-1000px';
    clone.style.left = '0px';
    clone.style.zIndex = '9999';
    clone.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
    clone.style.border = isDarkMode ? '1px solid #444' : '1px solid #ddd';
    clone.style.borderRadius = '8px';
    clone.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    
    document.body.appendChild(clone);
    
    // Set drag image with better offset positioning
    const rect = dragElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    e.dataTransfer.setDragImage(clone, offsetX, offsetY);
    
    // Clean up the clone after drag starts
    setTimeout(() => {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
    }, 1);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent, targetItem?: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedItem) return;
    
    let dropEffect: DataTransfer['dropEffect'] = 'none';
    let targetPath: string | null = null;
    
    // Determine if this is a valid drop target
    if (targetItem?.isDirectory) {
      const targetFolderPath = targetItem.path;
      
      // Check for invalid drops
      if (draggedItem.path === targetFolderPath) {
        // Can't drop on itself
        dropEffect = 'none';
      } else if (draggedItem.path.split('/').slice(0, -1).join('/') === targetFolderPath) {
        // Can't drop into same parent directory
        dropEffect = 'none';
      } else if (draggedItem.isDirectory && targetFolderPath.startsWith(draggedItem.path + '/')) {
        // Can't drop folder into its own child
        dropEffect = 'none';
      } else {
        // Valid drop target
        dropEffect = 'move';
        targetPath = targetFolderPath;
      }
    } else if (!targetItem && currentFolder) {
      // Dropping in empty space (current folder)
      const currentFolderPath = currentFolder;
      
      if (draggedItem.path.split('/').slice(0, -1).join('/') !== currentFolderPath) {
        // Valid drop target if not the same parent directory
        dropEffect = 'move';
        targetPath = currentFolderPath;
      } else {
        dropEffect = 'none';
      }
    }
    
    e.dataTransfer.dropEffect = dropEffect;
    setDropTarget(targetPath);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear drop target if we're actually leaving the element
    // Check if the related target is a child element
    const relatedTarget = e.relatedTarget as Element;
    const currentTarget = e.currentTarget as Element;
    
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetItem?: FileItem) => {
    e.preventDefault();
    
    if (!draggedItem) return;
    
    const targetPath = targetItem?.isDirectory ? targetItem.path : currentFolder;
    if (!targetPath) return;
    
    // Don't drop on itself
    if (draggedItem.path === targetPath) {
      handleDragEnd();
      return;
    }
    
    // Don't drop into its own parent (same directory)
    const draggedParent = draggedItem.path.split('/').slice(0, -1).join('/');
    if (draggedParent === targetPath) {
      handleDragEnd();
      return;
    }
    
    // Don't drop a folder into its own child (would create infinite loop)
    if (draggedItem.isDirectory && targetPath.startsWith(draggedItem.path + '/')) {
      alert(`Cannot move folder "${draggedItem.name}" into its own subfolder`);
      handleDragEnd();
      return;
    }
    
    // Don't drop on files (only on folders or empty space)
    if (targetItem && !targetItem.isDirectory) {
      handleDragEnd();
      return;
    }
    
    try {
      const newPath = `${targetPath}/${draggedItem.name}`;
      const result = await window.electronAPI?.file?.move(draggedItem.path, newPath);
      
      if (result?.success) {
        // Update current document path if the moved file was open
        if (currentDocument === draggedItem.path) {
          setCurrentDocument(result.newPath);
        }
        
        // Clear selected item if it was moved
        if (selectedItem?.path === draggedItem.path) {
          setSelectedItem(null);
        }
        
        // Refresh folder contents
        if (currentFolder) {
          if (isTreeView) {
            await loadTreeData(currentFolder);
          } else {
            await loadFolderContents(currentFolder);
          }
        }
      } else {
        alert(`Failed to move ${draggedItem.name}: ${result?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to move item:', error);
      alert(`Failed to move ${draggedItem.name}`);
    } finally {
      handleDragEnd();
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

  // Listen for folder creation requests from menu
  React.useEffect(() => {
    const handleCreateFolderInLibrary = () => {
      if (libraryFolder) {
        handleCreateFolder(libraryFolder);
      }
    };

    window.addEventListener('createFolderInLibrary', handleCreateFolderInLibrary);
    return () => window.removeEventListener('createFolderInLibrary', handleCreateFolderInLibrary);
  }, [libraryFolder]);

  // Load tree data when current folder changes
  React.useEffect(() => {
    if (isTreeView && currentFolder) {
      loadTreeData(currentFolder);
    }
  }, [currentFolder, isTreeView]);

  // Listen for refresh events (e.g., from menu actions)
  React.useEffect(() => {
    const handleRefreshFolderView = () => {
      if (currentFolder) {
        if (isTreeView) {
          loadTreeData(currentFolder);
        } else {
          loadFolderContents(currentFolder);
        }
      }
    };

    window.addEventListener('refreshFolderView', handleRefreshFolderView);
    return () => window.removeEventListener('refreshFolderView', handleRefreshFolderView);
  }, [currentFolder, isTreeView]);

  const handleFolderClick = async (folder: FileItem, isExpandClick = false) => {
    if (isTreeView && isExpandClick) {
      // In tree view, expand/collapse on expand icon click
      await toggleFolderExpanded(folder.path);
    } else {
      // Navigate into folder
      await navigateToFolder(folder.path);
    }
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
        // Use the unified refresh system
        if (isTreeView) {
          await loadTreeData(result.filePaths[0]);
        } else {
          await loadFolderContents(result.filePaths[0]);
        }
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  // Flatten tree for rendering with proper indentation
  const flattenTreeItems = (items: FileItem[], depth = 0): (FileItem & { renderDepth: number })[] => {
    const result: (FileItem & { renderDepth: number })[] = [];
    
    for (const item of items) {
      result.push({ ...item, renderDepth: depth });
      
      if (item.isDirectory && item.children && expandedFolders.has(item.path)) {
        result.push(...flattenTreeItems(item.children, depth + 1));
      }
    }
    
    return result;
  };

  const renderFileItem = (item: FileItem & { renderDepth?: number }) => {
    const isEditing = editingItem === item.path;
    const isSelected = selectedItem?.path === item.path;
    const renderDepth = item.renderDepth || 0;
    
    return (
      <div key={item.path}>
        {isEditing ? (
          <div className="px-3 py-2" style={{ paddingLeft: `${12 + renderDepth * 20}px` }}>
            <div className="flex items-center">
              {/* Expand/collapse button space for consistency */}
              {item.isDirectory && (
                <div className="w-4 h-4 mr-1" />
              )}
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
          <div 
            className={clsx(
              'w-full flex items-center py-2 text-sm transition-all duration-200 group',
              // Base styling with proper rounded corners
              'rounded-lg overflow-hidden',
              // Drag states
              draggedItem?.path === item.path && 'opacity-50 cursor-grabbing transform scale-95',
              dropTarget === item.path && item.isDirectory && 'ring-2 ring-blue-500 bg-blue-500/20 transform scale-105',
              isDragging && draggedItem && item.isDirectory && dropTarget !== item.path && 'opacity-60',
              isDragging && !draggedItem && 'cursor-grab',
              // Normal state only - no selection styling on container
              isDarkMode 
                ? 'text-kanagawa-oldwhite' 
                : 'text-gray-700'
            )}
            style={{ paddingLeft: `${12 + renderDepth * 20}px`, paddingRight: '12px' }}
            draggable={!editingItem}
            onDragStart={(e) => handleDragStart(e, item)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, item)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            {/* Expand/collapse button for directories */}
            {item.isDirectory && isTreeView && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFolderClick(item, true);
                }}
                className={clsx(
                  'w-4 h-4 mr-1 flex items-center justify-center rounded transition-all duration-200',
                  isDarkMode
                    ? 'hover:bg-kanagawa-ink5/50 text-kanagawa-gray hover:text-kanagawa-oldwhite'
                    : 'hover:bg-gray-100/60 text-gray-400 hover:text-gray-600',
                  expandedFolders.has(item.path) ? 'rotate-90' : 'rotate-0'
                )}
              >
                <ChevronRightIcon className="w-3 h-3" />
              </button>
            )}
            
            {/* Main content button */}
            <button
              onClick={() => handleFileClick(item)}
              className={clsx(
                "flex items-center flex-1 min-w-0 text-left rounded-lg px-2 py-1 transition-colors",
                // Selection and hover states
                isSelected
                  ? // Selected state with proper rounded background
                    isDarkMode 
                      ? 'bg-accent-blue/15 text-accent-blue' 
                      : 'bg-blue-50/80 text-blue-700'
                  : // Normal hover state
                    isDarkMode 
                      ? 'hover:bg-kanagawa-ink4 text-kanagawa-oldwhite' 
                      : 'hover:bg-gray-50 text-gray-700'
              )}
            >
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
            </button>
          </div>
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
        <div 
          className={clsx(
            "py-2 max-h-80 overflow-y-auto transition-all duration-200",
            dropTarget === currentFolder && "bg-blue-500/10 ring-2 ring-blue-500 ring-inset rounded-lg"
          )}
          onDragOver={(e) => handleDragOver(e)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e)}
        >
          {(isTreeView ? treeData : folderContents).length === 0 ? (
            <div className="px-4 py-6 text-center empty-folder-area">
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
              {isTreeView 
                ? flattenTreeItems(treeData).map(item => renderFileItem(item))
                : folderContents.map(item => renderFileItem(item))
              }
            </div>
          )}
        </div>
      )}


      {/* Context Menu - shows only for actual items */}
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
          {/* New Folder - show only for folders */}
          {contextMenu.item.isDirectory && (
            <>
              <button
                onClick={() => handleCreateFolder(contextMenu.item!.path)}
                className={clsx(
                  'w-full flex items-center px-3 py-2 text-sm transition-colors text-left',
                  isDarkMode
                    ? 'text-kanagawa-oldwhite hover:bg-kanagawa-ink5'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <FolderPlusIcon className="h-4 w-4 mr-3" />
                New Folder
              </button>
              
              <div className={clsx(
                'my-1 h-px',
                isDarkMode ? 'bg-kanagawa-ink5' : 'bg-gray-200'
              )} />
            </>
          )}

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
          
          {/* Rename and Delete - always show for actual items */}
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

      {/* New Folder Dialog */}
      {showNewFolderDialog && (
        <div className={clsx(
          "fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm",
          isDarkMode ? "bg-black/50" : "bg-black/30"
        )}>
          <div className={clsx(
            'rounded-xl shadow-2xl p-6 w-96 max-w-[90vw] mx-4 border',
            isDarkMode 
              ? 'bg-kanagawa-ink3 text-kanagawa-oldwhite border-kanagawa-ink5' 
              : 'bg-white text-gray-900 border-gray-200'
          )}>
            <h3 className={clsx(
              'text-lg font-semibold mb-4',
              isDarkMode ? 'text-kanagawa-oldwhite' : 'text-gray-900'
            )}>
              New Folder
            </h3>
            
            <div className="mb-6">
              <label className={clsx(
                'block text-sm font-medium mb-2',
                isDarkMode ? 'text-kanagawa-gray' : 'text-gray-700'
              )}>
                Folder name:
              </label>
              <input
                ref={newFolderInputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateFolderConfirm();
                  } else if (e.key === 'Escape') {
                    handleCreateFolderCancel();
                  }
                }}
                className={clsx(
                  'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all duration-200',
                  isDarkMode 
                    ? 'bg-kanagawa-ink4 border-kanagawa-ink5 text-kanagawa-oldwhite placeholder-kanagawa-gray focus:ring-accent-blue focus:border-accent-blue' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
                )}
                placeholder="Enter folder name"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCreateFolderCancel}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors border',
                  isDarkMode
                    ? 'text-kanagawa-gray hover:text-kanagawa-oldwhite hover:bg-kanagawa-ink4 border-kanagawa-ink5'
                    : 'text-gray-700 hover:bg-gray-50 border-gray-300 hover:border-gray-400'
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolderConfirm}
                disabled={!newFolderName.trim()}
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  !newFolderName.trim()
                    ? isDarkMode
                      ? 'bg-kanagawa-ink5 text-kanagawa-gray cursor-not-allowed'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : isDarkMode
                      ? 'bg-accent-blue hover:bg-blue-600 text-white shadow-lg'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                )}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}