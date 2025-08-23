import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';

// Create custom Kanagawa theme for CodeMirror
const createKanagawaTheme = (isDark: boolean, isFocusMode: boolean, fontSize: number, lineHeight: number, fontFamily: string) => {
  return EditorView.theme({
    '&': {
      color: isDark ? '#ff0000' : '#393836', // BRIGHT RED to test if dark mode works
      backgroundColor: isDark ? '#000000' : '#f9fafb', // PURE BLACK to test if dark mode works
      fontSize: `${fontSize}px`,
      fontFamily: fontFamily,
      height: '100%'
    },
    '.cm-content': {
      padding: isFocusMode ? '80px 160px' : '40px 40px',
      caretColor: isDark ? '#c4b28a' : '#393836', // cursor-color from palette
      lineHeight: lineHeight.toString(),
      minHeight: '100%'
    },
    '.cm-focused .cm-cursor': {
      borderLeftColor: isDark ? '#c4b28a' : '#393836'
    },
    '.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: isDark ? '#363646' : '#c7d7e0', // selection-background, lotusBlue1 for light
      color: isDark ? '#9e9b93' : '#393836' // selection-foreground
    },
    '.cm-editor.cm-focused': {
      outline: 'none'
    },
    '.cm-scroller': {
      overflow: 'auto',
      lineHeight: lineHeight.toString()
    },
    '.cm-line': {
      lineHeight: lineHeight.toString()
    }
  }, { dark: isDark });
};

// Markdown syntax highlighting theme with muted kanagawa-paper colors
const createMarkdownHighlighting = (isDark: boolean) => {
  return EditorView.theme({
    '.cm-meta': { color: isDark ? '#727169' : '#717C7C' }, // fujiGray - subtle
    '.cm-keyword': { color: isDark ? '#8ea49e' : '#8ea49e', fontWeight: 'bold' }, // palette 6 - muted teal
    '.cm-atom': { color: isDark ? '#c4b28a' : '#c4b28a' }, // palette 3 - soft yellow
    '.cm-number': { color: isDark ? '#c4b28a' : '#c4b28a' }, // palette 3 - soft yellow
    '.cm-def': { color: isDark ? '#a292a3' : '#a292a3' }, // palette 5 - muted purple
    '.cm-variable': { color: isDark ? '#DCD7BA' : '#393836' }, // fujiWhite/dark
    '.cm-variable-2': { color: isDark ? '#8ea49e' : '#8ea49e' }, // palette 6 - muted teal
    '.cm-variable-3': { color: isDark ? '#a292a3' : '#a292a3' }, // palette 5 - muted purple
    '.cm-type': { color: isDark ? '#a292a3' : '#a292a3' }, // palette 5 - muted purple
    '.cm-property': { color: isDark ? '#c4b28a' : '#c4b28a' }, // palette 3 - soft yellow
    '.cm-operator': { color: isDark ? '#aca9a4' : '#717C7C' }, // palette 8 - neutral gray
    '.cm-string': { color: isDark ? '#d4c196' : '#d4c196' }, // palette 11 - warm beige
    '.cm-string-2': { color: isDark ? '#d4c196' : '#d4c196' }, // palette 11 - warm beige
    '.cm-comment': { color: isDark ? '#727169' : '#717C7C', fontStyle: 'italic' }, // fujiGray - subtle
    '.cm-link': { color: isDark ? '#a292a3' : '#a292a3', textDecoration: 'underline' }, // palette 5 - muted purple
    '.cm-tag': { color: isDark ? '#8ea49e' : '#8ea49e' }, // palette 6 - muted teal
    '.cm-attribute': { color: isDark ? '#cc928e' : '#cc928e' }, // palette 9 - soft coral
    '.cm-header': { color: isDark ? '#8ea49e' : '#8ea49e', fontWeight: 'bold' }, // palette 6 - muted teal
    '.cm-quote': { color: isDark ? '#727169' : '#717C7C', fontStyle: 'italic' }, // fujiGray - subtle
    '.cm-strong': { fontWeight: 'bold' },
    '.cm-em': { fontStyle: 'italic' }
  });
};

export function MarkdownEditor() {
  const {
    documentContent,
    setDocumentContent,
    isFocusMode,
    isPreviewMode,
    zoomLevel,
    fontSize,
    lineHeight,
    fontFamily,
    theme,
    // Split screen state
    isSplitScreenMode,
    rightPaneContent,
    setRightPaneContent,
    focusedPane,
    setFocusedPane,
    splitRatio,
    setSplitRatio,
    currentDocument,
    rightPaneDocument,
    // Scrollbar preference
    showScrollbar
  } = useAppStore();

  const editorRef = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);
  const location = useLocation();
  const [isDragging, setIsDragging] = useState(false);

  // State for system theme detection
  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Auto-focus the editor when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editorRef.current?.view) {
        editorRef.current.view.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Auto-focus the editor when navigating to editor route
  useEffect(() => {
    if (location.pathname === '/editor' || location.pathname === '/') {
      const timer = setTimeout(() => {
        if (editorRef.current?.view) {
          editorRef.current.view.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  // Listen for focus editor events from the app store
  useEffect(() => {
    const handleFocusEditor = () => {
      if (isSplitScreenMode) {
        // In split screen mode, focus the active pane
        if (focusedPane === 'right' && rightEditorRef.current?.view) {
          rightEditorRef.current.view.focus();
        } else if (editorRef.current?.view) {
          editorRef.current.view.focus();
        }
      } else {
        // In single pane mode, focus the main editor
        if (editorRef.current?.view) {
          editorRef.current.view.focus();
        }
      }
    };

    window.addEventListener('focusEditor', handleFocusEditor);
    return () => window.removeEventListener('focusEditor', handleFocusEditor);
  }, [isSplitScreenMode, focusedPane]);

  // Handle content change for left pane
  const handleLeftEditorChange = (value: string) => {
    setDocumentContent(value);
    
    // If both panes show the same document, sync the content
    if (isSplitScreenMode && currentDocument === rightPaneDocument) {
      setRightPaneContent(value);
    }
  };

  // Handle content change for right pane
  const handleRightEditorChange = (value: string) => {
    setRightPaneContent(value);
    
    // If both panes show the same document, sync the content
    if (isSplitScreenMode && currentDocument === rightPaneDocument) {
      setDocumentContent(value);
    }
  };

  // Handle focus events
  const handleLeftEditorFocus = () => {
    setFocusedPane('left');
  };

  const handleRightEditorFocus = () => {
    setFocusedPane('right');
  };

  // Focus the editor when pane focus changes via keyboard shortcuts
  useEffect(() => {
    if (!isSplitScreenMode) return;
    
    const timer = setTimeout(() => {
      if (focusedPane === 'left' && editorRef.current?.view) {
        editorRef.current.view.focus();
      } else if (focusedPane === 'right' && rightEditorRef.current?.view) {
        rightEditorRef.current.view.focus();
      }
    }, 50); // Small delay to ensure the focus change has been processed

    return () => clearTimeout(timer);
  }, [focusedPane, isSplitScreenMode]);

  // Split pane resize logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSplitScreenMode) return;
    
    setIsDragging(true);
    e.preventDefault();
    
    const container = e.currentTarget.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX - containerRect.left;
      const newRatio = x / containerRect.width;
      setSplitRatio(newRatio);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  
  

  // Create extensions array
  const extensions: Extension[] = [
    markdown(),
    EditorView.lineWrapping, // This is the key for proper responsive wrapping!
    createMarkdownHighlighting(isDarkMode),
    // Combine all theme styles into one extension to prevent conflicts
    EditorView.theme({
      '&': { 
        height: '100%',
        color: isDarkMode ? '#DCD7BA' : '#393836', // fujiWhite for dark, palette 0 for light
        backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb', // kanagawa dark bg, gray-50 for light
        fontSize: `${Math.round((fontSize * zoomLevel) / 100)}px`,
        fontFamily: fontFamily
      },
      '.cm-content': {
        padding: isFocusMode ? '80px 160px' : '40px 40px',
        caretColor: isDarkMode ? '#c4b28a' : '#393836',
        lineHeight: lineHeight.toString(),
        minHeight: '100%',
        backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb', // kanagawa background
        border: isDarkMode ? undefined : 'none !important',
        outline: isDarkMode ? undefined : 'none !important' 
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: isDarkMode ? '#c4b28a' : '#393836',
        backgroundColor: 'transparent',
        borderLeftWidth: '1px',
        borderLeftStyle: 'solid'
      },
      '.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: isDarkMode ? '#363646' : '#c7d7e0',
        color: isDarkMode ? '#9e9b93' : '#393836'
      },
      '.cm-focused': {
        backgroundColor: 'transparent'
      },
      '.cm-activeLine': {
        backgroundColor: 'transparent'
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent'
      },
      '.cm-editor.cm-focused': {
        outline: 'none'
      },
      '.cm-scroller': { 
        height: '100%',
        overflow: 'auto',
        lineHeight: lineHeight.toString(),
        backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb', // kanagawa background
        // Hide scrollbars if setting is disabled
        ...(showScrollbar ? {} : {
          scrollbarWidth: 'none', // Firefox
          '-ms-overflow-style': 'none', // IE/Edge
          '&::-webkit-scrollbar': {
            display: 'none' // Chrome/Safari/WebKit
          }
        })
      },
      '.cm-editor': { 
        height: '100%',
        backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb' // kanagawa background
      },
      '.cm-line': {
        lineHeight: lineHeight.toString()
      },
      '.cm-placeholder': {
        display: 'none' // Remove placeholder completely
      },
      '.cm-ruler': {
        display: 'none' // Remove rulers/print margins
      },
      '.cm-gutter-ruler': {
        display: 'none' // Remove gutter rulers
      },
      // Target any element that might show dotted lines in light mode
      '&.cm-editor, .cm-editor': {
        border: isDarkMode ? undefined : 'none !important',
        outline: isDarkMode ? undefined : 'none !important'
      }
    }, { dark: isDarkMode })
  ];

  // Helper function to get document title for pane header
  const getDocumentTitle = (docPath: string | null) => {
    if (!docPath) return 'Untitled';
    return docPath.split('/').pop() || 'Untitled';
  };

  // Helper function to create editor component
  const createEditor = (
    value: string,
    onChange: (value: string) => void,
    onFocus: () => void,
    ref: React.MutableRefObject<any>,
    isActive: boolean
  ) => (
    <CodeMirror
      ref={ref}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      extensions={extensions}
      basicSetup={{
        lineNumbers: false,
        foldGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        highlightSelectionMatches: false,
        searchKeymap: true,
        rectangularSelection: false,
        crosshairCursor: false
      }}
      style={{
        height: '100%',
        fontSize: `${Math.round((fontSize * zoomLevel) / 100)}px`,
        fontFamily: fontFamily,
        opacity: isActive ? 1 : 0.8
      }}
    />
  );

  if (isSplitScreenMode) {
    return (
      <div className="h-full flex">
        {/* Left Pane */}
        <div 
          className="relative flex flex-col"
          style={{ 
            width: `${splitRatio * 100}%`,
            minWidth: '200px'
          }}
        >
          {/* Left Pane Header */}
          <div className={clsx(
            'flex items-center justify-between px-4 py-2 border-b text-sm font-medium',
            focusedPane === 'left' 
              ? isDarkMode ? 'bg-kanagawa-ink4 text-kanagawa-white border-accent-blue' : 'bg-blue-50 text-blue-900 border-blue-200'
              : isDarkMode ? 'bg-kanagawa-ink2 text-kanagawa-gray border-kanagawa-ink4' : 'bg-gray-50 text-gray-600 border-gray-200'
          )}>
            <span className="truncate">{getDocumentTitle(currentDocument)}</span>
            <div className="flex items-center space-x-2">
              {focusedPane === 'left' && (
                <div className={clsx(
                  'h-2 w-2 rounded-full',
                  isDarkMode ? 'bg-accent-blue' : 'bg-blue-500'
                )} />
              )}
            </div>
          </div>
          
          {/* Left Editor */}
          <div 
            className="flex-1 editor-container flex justify-center"
            style={{
              backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb'
            }}
          >
            <div 
              className="h-full w-full max-w-4xl"
              style={{ 
                overflow: 'visible',
                position: 'relative'
              }}
            >
              {createEditor(
                documentContent,
                handleLeftEditorChange,
                handleLeftEditorFocus,
                editorRef,
                focusedPane === 'left'
              )}
            </div>
          </div>
        </div>

        {/* Split Divider - Very subtle */}
        <div
          className={clsx(
            'w-px cursor-col-resize flex items-center justify-center group hover:bg-accent-blue/10 transition-all duration-200',
            isDragging && 'bg-accent-blue/20 w-0.5',
            isDarkMode ? 'bg-kanagawa-ink4/30' : 'bg-gray-300/40'
          )}
          onMouseDown={handleMouseDown}
        >
          <div className={clsx(
            'w-px h-4 rounded-full transition-all opacity-0 group-hover:opacity-100 group-hover:h-12',
            isDarkMode ? 'bg-accent-blue/60' : 'bg-blue-400/60'
          )} />
        </div>

        {/* Right Pane */}
        <div 
          className="relative flex flex-col"
          style={{ 
            width: `${(1 - splitRatio) * 100}%`,
            minWidth: '200px'
          }}
        >
          {/* Right Pane Header */}
          <div className={clsx(
            'flex items-center justify-between px-4 py-2 border-b text-sm font-medium',
            focusedPane === 'right' 
              ? isDarkMode ? 'bg-kanagawa-ink4 text-kanagawa-white border-accent-blue' : 'bg-blue-50 text-blue-900 border-blue-200'
              : isDarkMode ? 'bg-kanagawa-ink2 text-kanagawa-gray border-kanagawa-ink4' : 'bg-gray-50 text-gray-600 border-gray-200'
          )}>
            <span className="truncate">{getDocumentTitle(rightPaneDocument)}</span>
            <div className="flex items-center space-x-2">
              {focusedPane === 'right' && (
                <div className={clsx(
                  'h-2 w-2 rounded-full',
                  isDarkMode ? 'bg-accent-blue' : 'bg-blue-500'
                )} />
              )}
            </div>
          </div>
          
          {/* Right Editor */}
          <div 
            className="flex-1 editor-container flex justify-center"
            style={{
              backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb'
            }}
          >
            <div 
              className="h-full w-full max-w-4xl"
              style={{ 
                overflow: 'visible',
                position: 'relative'
              }}
            >
              {createEditor(
                rightPaneContent,
                handleRightEditorChange,
                handleRightEditorFocus,
                rightEditorRef,
                focusedPane === 'right'
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Single pane mode (existing behavior)
  return (
    <div className="h-full flex">
      {/* Editor pane */}
      <div className={clsx(
        'flex-1 relative',
        isPreviewMode ? 'w-1/2' : 'w-full',
        isFocusMode && 'focus-mode'
      )}>
        <div 
          className="h-full editor-container flex justify-center"
          style={{
            backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb'
          }}
        >
          <div 
            className="h-full w-full max-w-4xl"
            style={{ 
              overflow: 'visible',
              position: 'relative'
            }}
          >
            <CodeMirror
              ref={editorRef}
              value={documentContent}
              onChange={handleLeftEditorChange}
              extensions={extensions}
              basicSetup={{
                lineNumbers: false,
                foldGutter: false,
                dropCursor: false,
                allowMultipleSelections: false,
                indentOnInput: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                highlightSelectionMatches: false,
                searchKeymap: true,
                rectangularSelection: false,
                crosshairCursor: false
              }}
              style={{
                height: '100%',
                fontSize: `${Math.round((fontSize * zoomLevel) / 100)}px`,
                fontFamily: fontFamily
              }}
            />
          </div>
        </div>
      </div>

      {/* Preview pane */}
      {isPreviewMode && (
        <div 
          className="w-1/2 border-l"
          style={{
            borderColor: isDarkMode ? '#363646' : '#c7d7e0'
          }}
        >
          <div 
            className="h-full p-8 overflow-auto custom-scrollbar"
            style={{
              backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb'
            }}
          >
            <div className="prose dark:prose-dark max-w-none">
              {/* TODO: Render markdown preview */}
              <div className={clsx(
                "italic",
                isDarkMode ? "text-kanagawa-gray" : "text-gray-500"
              )}>
                Markdown preview will be implemented here
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}