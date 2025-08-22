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
    theme
  } = useAppStore();

  const editorRef = useRef<any>(null);
  const location = useLocation();

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

  // Handle content change
  const handleEditorChange = (value: string) => {
    setDocumentContent(value);
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
        backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb' // kanagawa background
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
            backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb' // kanagawa background
          }}
        >
          <div 
            className="h-full w-full max-w-4xl"
            style={{ 
              overflow: 'visible', // Allow CodeMirror to handle its own overflow
              position: 'relative'
            }}
          >
            <CodeMirror
              ref={editorRef}
              value={documentContent}
              onChange={handleEditorChange}
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