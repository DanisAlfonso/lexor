import React, { useEffect, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { useAppStore } from '../stores/appStore';
import { conditionalLivePreview, toggleLivePreview } from '../extensions/livePreview';
import { createGrammarCheckExtension } from '../extensions/grammarCheck';
import { createHangingIndentExtension } from '../extensions/hangingIndent';
import { vim, Vim, getCM } from '@replit/codemirror-vim';
import { SplitScreenEditor, SplitScreenEditorRef } from './SplitScreenEditor';
import { SinglePaneEditor, SinglePaneEditorRef } from './SinglePaneEditor';
import { formatFontFamily } from '../utils/editorUtils';
import { useAutoSave } from '../hooks/useAutoSave';
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
    setDocumentModified,
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
    setLivePreviewEnabled,
    // Spellcheck state
    isSpellcheckEnabled,
    toggleSpellcheck,
    // Grammar check state
    isGrammarCheckEnabled,
    toggleGrammarCheck,
    grammarCheckLanguage,
    // Vim mode state
    isVimModeEnabled,
    toggleVimMode
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

  // Auto-save functionality
  const { isAutoSaveEnabled, isAutoSaving } = useAutoSave();

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

  // Handle highlight text command from menu
  useEffect(() => {
    const handleHighlightText = () => {
      // Simulate the keyboard shortcut by creating and dispatching a keyboard event
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = !isMac;
      const metaKey = isMac;

      // Create a keyboard event for Cmd+Shift+H (Mac) or Ctrl+Shift+H (Windows/Linux)
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'h',
        code: 'KeyH',
        ctrlKey: ctrlKey,
        metaKey: metaKey,
        shiftKey: true,
        altKey: false,
        bubbles: true,
        cancelable: true
      });

      // Dispatch the event to the currently focused element
      const activeElement = document.activeElement;
      if (activeElement && activeElement instanceof HTMLElement) {
        activeElement.dispatchEvent(keyboardEvent);
      }
    };

    window.addEventListener('highlightText', handleHighlightText);
    return () => {
      window.removeEventListener('highlightText', handleHighlightText);
    };
  }, []);

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

  // Configure vim commands when vim mode is enabled
  useEffect(() => {
    if (isVimModeEnabled && window.electronAPI?.file?.writeFile) {
      // Configure the :w (write) command
      Vim.defineEx('write', 'w', async () => {
        try {
          if (currentDocument && documentContent !== undefined) {
            await window.electronAPI.file.writeFile(currentDocument, documentContent);
            setDocumentModified(false);
            console.log('Document saved via vim :w command');
          } else {
            console.warn('No document to save or document content is undefined');
          }
        } catch (error) {
          console.error('Failed to save document via vim :w:', error);
        }
      });

      // Configure the :wq (write and quit) command - same as :w in this context
      Vim.defineEx('wq', 'wq', async () => {
        try {
          if (currentDocument && documentContent !== undefined) {
            await window.electronAPI.file.writeFile(currentDocument, documentContent);
            setDocumentModified(false);
            console.log('Document saved via vim :wq command');
          } else {
            console.warn('No document to save or document content is undefined');
          }
        } catch (error) {
          console.error('Failed to save document via vim :wq:', error);
        }
      });
    }
  }, [isVimModeEnabled, currentDocument, documentContent, setDocumentModified]);

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
  
  // Keyboard shortcut handlers
  const keyboardShortcuts = keymap.of([
    // Live preview toggle (Cmd+Shift+P)
    {
      key: 'Mod-Shift-p',
      run: (view) => {
        const newState = !isLivePreviewEnabled;
        setLivePreviewEnabled(newState);
        view.dispatch({
          effects: toggleLivePreview.of(newState)
        });
        return true;
      }
    },
    // Spellcheck toggle (Cmd+Shift+;)
    {
      key: 'Mod-Shift-;',
      run: () => {
        toggleSpellcheck();
        return true;
      }
    },
    // Grammar check toggle (Cmd+Shift+G)
    {
      key: 'Mod-Shift-g',
      run: () => {
        toggleGrammarCheck();
        return true;
      }
    },
    // Vim mode toggle (Cmd+Shift+V)
    {
      key: 'Mod-Shift-v',
      run: () => {
        toggleVimMode();
        return true;
      }
    },
    // Highlight text (Cmd+Shift+H) - Toggle highlighting
    {
      key: 'Mod-Shift-h',
      run: (view) => {
        const selection = view.state.selection.main;

        if (selection.empty) {
          // No selection, just insert ==== and position cursor between them
          view.dispatch({
            changes: {
              from: selection.from,
              to: selection.to,
              insert: '===='
            },
            selection: {
              anchor: selection.from + 2,
              head: selection.from + 2
            }
          });
        } else {
          const selectedText = view.state.sliceDoc(selection.from, selection.to);

          // Check if the selected text is already highlighted (starts and ends with ==)
          if (selectedText.startsWith('==') && selectedText.endsWith('==') && selectedText.length > 4) {
            // Remove highlighting - unwrap the text
            const innerText = selectedText.slice(2, -2);
            view.dispatch({
              changes: {
                from: selection.from,
                to: selection.to,
                insert: innerText
              },
              selection: {
                anchor: selection.from,
                head: selection.from + innerText.length
              }
            });
          } else {
            // Check if selection is inside existing highlight markers
            const doc = view.state.doc;
            const textBeforeSelection = doc.sliceString(Math.max(0, selection.from - 2), selection.from);
            const textAfterSelection = doc.sliceString(selection.to, Math.min(doc.length, selection.to + 2));

            if (textBeforeSelection.endsWith('==') && textAfterSelection.startsWith('==')) {
              // Selection is inside ==text==, remove the surrounding markers
              const highlightStart = selection.from - 2;
              const highlightEnd = selection.to + 2;

              view.dispatch({
                changes: {
                  from: highlightStart,
                  to: highlightEnd,
                  insert: selectedText
                },
                selection: {
                  anchor: highlightStart,
                  head: highlightStart + selectedText.length
                }
              });
            } else {
              // Add highlighting - wrap the text
              view.dispatch({
                changes: {
                  from: selection.from,
                  to: selection.to,
                  insert: `==${selectedText}==`
                },
                selection: {
                  anchor: selection.from,
                  head: selection.from + selectedText.length + 4
                }
              });
            }
          }
        }
        return true;
      }
    }
  ]);

  const extensions: Extension[] = [
    // Vim extension must come first if enabled
    ...(isVimModeEnabled ? [vim()] : []),
    markdown(),
    EditorView.lineWrapping, // This is the key for proper responsive wrapping!
    createMarkdownHighlighting(isDarkMode),
    conditionalLivePreview(isDarkMode, lineHeight),
    createHangingIndentExtension(), // Add hanging indent for markdown lists
    keyboardShortcuts,
    // Enable native browser spellcheck when enabled
    ...(isSpellcheckEnabled ? [EditorView.contentAttributes.of({ spellcheck: "true" })] : []),
    // Enable grammar checking when enabled
    createGrammarCheckExtension(isGrammarCheckEnabled),
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
      },
      // Override any CodeMirror default syntax highlighting colors
      '& .ͼc': {
        color: `${isDarkMode ? '#a292a3' : '#a292a3'} !important` // Use your theme's purple color instead of default blue
      },
      // VS Code style vim status bar - fixed at bottom of editor
      '& .cm-vim-panel, & .cm-panel, & [class*="vim-panel"], & [class*="vim-command"]': {
        position: 'fixed !important',
        bottom: '0 !important',
        left: '0 !important',
        right: '0 !important',
        zIndex: '1000 !important',
        backgroundColor: `${isDarkMode ? '#2A2D3A' : '#f3f3f3'} !important`,
        border: 'none !important',
        borderTop: `1px solid ${isDarkMode ? '#3E4451' : '#e0e0e0'} !important`,
        borderRadius: '0 !important',
        padding: '4px 12px !important',
        fontSize: '12px !important',
        fontFamily: `${formattedFontFamily} !important`,
        color: `${isDarkMode ? '#ABB2BF' : '#666666'} !important`,
        boxShadow: 'none !important',
        minHeight: '22px !important',
        maxHeight: '22px !important',
        overflow: 'hidden !important',
        display: 'flex !important',
        alignItems: 'center !important',
        textAlign: 'left !important'
      },
      '& .cm-vim-panel input, & .cm-panel input, & [class*="vim-panel"] input, & [class*="vim-command"] input': {
        backgroundColor: 'transparent !important',
        border: 'none !important',
        outline: 'none !important',
        color: `${isDarkMode ? '#ABB2BF' : '#666666'} !important`,
        fontSize: '12px !important',
        fontFamily: `${formattedFontFamily} !important`,
        padding: '0 !important',
        margin: '0 !important',
        width: 'auto !important',
        boxShadow: 'none !important',
        textAlign: 'left !important',
        flex: 'none !important'
      },
      // Vim search highlighting
      '& .cm-vim-search, & .cm-searchMatch': {
        backgroundColor: `${isDarkMode ? '#c4b28a' : '#fbbf24'} !important`,
        color: `${isDarkMode ? '#1F1F28' : '#000000'} !important`
      },
      // Hide cursor when vim command panel is active
      '&:has(.cm-vim-panel) .cm-cursor, &:has(.cm-panel) .cm-cursor': {
        display: 'none !important'
      },
      '&:has(.cm-vim-panel) .cm-cursor-primary, &:has(.cm-panel) .cm-cursor-primary': {
        display: 'none !important'
      },
      // Vim cursor styling for normal states
      '& .cm-vim-cursor': {
        backgroundColor: `${isDarkMode ? '#c4b28a' : '#393836'} !important`,
        color: `${isDarkMode ? '#1F1F28' : '#ffffff'} !important`,
        borderRadius: '2px !important',
        opacity: '0.8 !important'
      },
      '& .cm-cursor-primary': {
        borderLeftColor: `${isDarkMode ? '#c4b28a' : '#393836'} !important`,
        borderLeftWidth: '2px !important'
      },
      // Vim visual selection
      '& .cm-vim-visual': {
        backgroundColor: `${isDarkMode ? 'rgba(196, 178, 138, 0.3)' : 'rgba(57, 56, 54, 0.2)'} !important`
      },
      // General panel styling for search/replace dialogs - VS Code style
      '& .cm-dialog, & .cm-textfield': {
        position: 'fixed !important',
        bottom: '0 !important',
        left: '0 !important',
        right: '0 !important',
        zIndex: '1000 !important',
        backgroundColor: `${isDarkMode ? '#2A2D3A' : '#f3f3f3'} !important`,
        border: 'none !important',
        borderTop: `1px solid ${isDarkMode ? '#3E4451' : '#e0e0e0'} !important`,
        borderRadius: '0 !important',
        padding: '4px 12px !important',
        fontSize: '12px !important',
        fontFamily: `${formattedFontFamily} !important`,
        color: `${isDarkMode ? '#ABB2BF' : '#666666'} !important`,
        boxShadow: 'none !important',
        minHeight: '22px !important',
        display: 'flex !important',
        alignItems: 'center !important'
      },
      // Hanging indent styles for markdown lists
      '.hanging-indent': {
        textIndent: 'calc(-1ch * var(--hanging-indent-chars))',
        paddingLeft: 'calc(1ch * var(--hanging-indent-chars))',
        // Ensure wrapped lines maintain the indent
        '&.cm-line': {
          textIndent: 'calc(-1ch * var(--hanging-indent-chars))',
          paddingLeft: 'calc(1ch * var(--hanging-indent-chars))'
        }
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