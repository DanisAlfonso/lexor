import React, { useState } from 'react';
import { useAppStore, FileItem } from '../stores/appStore';
import { 
  FolderIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  HomeIcon,
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
    setCurrentFolder
  } = useAppStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Generate breadcrumb path
  const getBreadcrumbs = () => {
    if (!currentFolder || !rootFolder) return [];
    
    const rootName = rootFolder.split('/').pop() || 'Root';
    const relativePath = currentFolder.replace(rootFolder, '').replace(/^\/+/, '');
    
    if (!relativePath) {
      return [{ name: rootName, path: rootFolder }];
    }
    
    const pathSegments = relativePath.split('/');
    const breadcrumbs = [{ name: rootName, path: rootFolder }];
    
    let currentPath = rootFolder;
    for (const segment of pathSegments) {
      currentPath = `${currentPath}/${segment}`;
      breadcrumbs.push({ name: segment, path: currentPath });
    }
    
    return breadcrumbs;
  };

  const navigateToFolder = async (folderPath: string) => {
    await loadFolderContents(folderPath);
  };

  const handleFolderClick = async (folder: FileItem) => {
    // Navigate into folder (don't use expand/collapse for navigation)
    await navigateToFolder(folder.path);
  };

  const handleFileClick = async (file: FileItem) => {
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
    return (
      <div key={item.path}>
        <button
          onClick={() => handleFileClick(item)}
          className={clsx(
            'w-full flex items-center py-2 px-3 text-sm rounded-lg transition-all duration-200 text-left group',
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
      </div>
    );
  };

  if (!currentFolder) {
    return null;
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <div>
      {/* Premium Breadcrumb Navigation */}
      <div className={clsx(
        "px-3 py-3 border-b",
        isDarkMode 
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
                      isDarkMode
                        ? 'bg-accent-blue text-white font-medium'
                        : 'bg-blue-600 text-white font-medium'
                    : // Navigable parent folders
                      isDarkMode
                        ? 'text-kanagawa-oldwhite hover:bg-kanagawa-ink4 font-medium'
                        : 'text-gray-700 hover:bg-gray-200 font-medium'
                )}
                disabled={index === breadcrumbs.length - 1}
              >
                {index === 0 && (
                  <HomeIcon className={clsx(
                    "h-4 w-4 mr-1.5 flex-shrink-0",
                    index === breadcrumbs.length - 1 
                      ? "text-white" 
                      : isDarkMode 
                        ? "text-accent-blue" 
                        : "text-blue-600"
                  )} />
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
                No files or folders found
              </p>
            </div>
          ) : (
            <div className="px-2 space-y-1">
              {folderContents.map(item => renderFileItem(item))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}