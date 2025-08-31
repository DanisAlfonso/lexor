import React, { useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useAppStore } from '../stores/appStore';
import { conditionalLivePreview, toggleLivePreview } from '../extensions/livePreview';
import { SplitScreenEditor, SplitScreenEditorRef } from './SplitScreenEditor';
import { SinglePaneEditor, SinglePaneEditorRef } from './SinglePaneEditor';
import { formatFontFamily } from '../utils/editorUtils';
import { clsx } from 'clsx';


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
    selectedItem,
    // Scrollbar preference
    showScrollbar,
    // Live preview state
    isLivePreviewEnabled,
    setLivePreviewEnabled
  } = useAppStore();

  // Handle menu-triggered live preview toggle
  useEffect(() => {
    const handleToggleLivePreview = () => {
      const newState = !isLivePreviewEnabled;
      setLivePreviewEnabled(newState);
      
      // Update the CodeMirror view if it exists
      if (editorRef.current?.view) {
        editorRef.current.view.dispatch({
          effects: toggleLivePreview.of(newState)
        });
      }
      if (rightEditorRef.current?.view) {
        rightEditorRef.current.view.dispatch({
          effects: toggleLivePreview.of(newState)
        });
      }
    };

    // Override the existing preview menu handler with our live preview
    if (window.electronAPI?.menu?.onTogglePreview) {
      const unsubscribe = window.electronAPI.menu.onTogglePreview(handleToggleLivePreview);
      return unsubscribe;
    }
  }, [isLivePreviewEnabled]);


  const singleEditorRef = useRef<SinglePaneEditorRef>(null);
  const splitEditorRef = useRef<SplitScreenEditorRef>(null);

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
      if (isSplitScreenMode) {
        splitEditorRef.current?.focus(focusedPane);
      } else {
        singleEditorRef.current?.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isSplitScreenMode, focusedPane]);

  // Auto-focus when a new document is selected from sidebar
  useEffect(() => {
    if (!currentDocument) return;
    
    const timer = setTimeout(() => {
      if (isSplitScreenMode) {
        splitEditorRef.current?.focus(focusedPane);
      } else {
        singleEditorRef.current?.focus();
      }
    }, 150); // Slightly longer delay for document loading

    return () => clearTimeout(timer);
  }, [currentDocument, isSplitScreenMode, focusedPane]);

  // Auto-focus when the same file is selected again from sidebar
  useEffect(() => {
    if (!selectedItem || selectedItem.type !== 'file') return;
    
    const timer = setTimeout(() => {
      if (isSplitScreenMode) {
        splitEditorRef.current?.focus(focusedPane);
      } else {
        singleEditorRef.current?.focus();
      }
    }, 100); // Slightly faster since file is already loaded

    return () => clearTimeout(timer);
  }, [selectedItem, isSplitScreenMode, focusedPane]);

  // Listen for focus editor events from the app store
  useEffect(() => {
    const handleFocusEditor = () => {
      if (isSplitScreenMode) {
        splitEditorRef.current?.focus(focusedPane);
      } else {
        singleEditorRef.current?.focus();
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
      splitEditorRef.current?.focus(focusedPane);
    }, 50); // Small delay to ensure the focus change has been processed

    return () => clearTimeout(timer);
  }, [focusedPane, isSplitScreenMode]);


  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  
  // Update CSS custom properties for selection styling
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--editor-selection-bg', '#363646');
      root.style.setProperty('--editor-selection-text', '#9e9b93');
    } else {
      root.style.setProperty('--editor-selection-bg', '#c7d7e0'); // Light blue-gray for light mode
      root.style.setProperty('--editor-selection-text', '#393836'); // Dark gray text
    }
  }, [isDarkMode]);

  // Create extensions array
  const formattedFontFamily = formatFontFamily(fontFamily);
  const finalFontSize = `${Math.round((fontSize * zoomLevel) / 100)}px`;
  
  // Keyboard shortcut handler for live preview (using the existing Cmd+Shift+P shortcut)
  const livePreviewKeymap = keymap.of([{
    key: 'Mod-Shift-p',
    run: (view) => {
      const newState = !isLivePreviewEnabled;
      setLivePreviewEnabled(newState);
      view.dispatch({
        effects: toggleLivePreview.of(newState)
      });
      return true;
    }
  }]);

  const extensions: Extension[] = [
    markdown(),
    EditorView.lineWrapping, // This is the key for proper responsive wrapping!
    createMarkdownHighlighting(isDarkMode),
    conditionalLivePreview(isDarkMode, lineHeight),
    livePreviewKeymap,
    // Combine all theme styles into one extension to prevent conflicts
    EditorView.theme({
      '&': { 
        height: '100%',
        color: isDarkMode ? '#DCD7BA' : '#393836', // fujiWhite for dark, palette 0 for light
        backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb', // kanagawa dark bg, gray-50 for light
        fontSize: finalFontSize,
        fontFamily: formattedFontFamily
      },
      '.cm-content': {
        padding: isFocusMode 
          ? (isSplitScreenMode ? '80px 60px' : '80px 120px') 
          : '40px 40px',
        caretColor: isDarkMode ? '#c4b28a' : '#393836',
        lineHeight: lineHeight.toString(),
        minHeight: '100%',
        backgroundColor: isDarkMode ? '#1F1F28' : '#f9fafb', // kanagawa background
        border: isDarkMode ? undefined : 'none !important',
        outline: isDarkMode ? undefined : 'none !important',
        fontFamily: `${formattedFontFamily} !important`, // Force font family
        fontSize: `${finalFontSize} !important` // Force font size
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: isDarkMode ? '#c4b28a' : '#393836',
        backgroundColor: 'transparent',
        borderLeftWidth: '1px',
        borderLeftStyle: 'solid'
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
        fontFamily: `${formattedFontFamily} !important`,
        fontSize: `${finalFontSize} !important`,
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
        lineHeight: lineHeight.toString(),
        fontFamily: `${formattedFontFamily} !important`,
        fontSize: `${finalFontSize} !important`
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
      },
      // Comprehensive font override for all text elements
      '& *, &.cm-editor *, .cm-editor *': {
        fontFamily: `${formattedFontFamily} !important`
      }
    }, { dark: isDarkMode })
  ];



  if (isSplitScreenMode) {
    return (
      <SplitScreenEditor
        ref={splitEditorRef}
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
      />
    );
  }

  // Single pane mode (existing behavior)
  return (
    <SinglePaneEditor
      ref={singleEditorRef}
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
    />
  );
}