import React, { useEffect, useRef, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import { useAppStore } from '../stores/appStore';
import { clsx } from 'clsx';

// Configure Monaco loader to work with Electron
if (window.location.protocol === 'file:') {
  // In Electron, use the CDN version
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs'
    }
  });
}

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
  const [editorLoading, setEditorLoading] = useState(true);
  const [monacoFailed, setMonacoFailed] = useState(false);

  // Handle editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    setEditorLoading(false);
    setMonacoFailed(false);
    
    // Configure Monaco editor
    monaco.editor.defineTheme('lexor-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: '059669', fontStyle: 'bold' },
        { token: 'string', foreground: 'dc2626' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#374151',
        'editor.lineHighlightBackground': '#f9fafb',
        'editor.selectionBackground': '#dbeafe',
      }
    });

    // Kanagawa Paper Dark Theme for Monaco
    monaco.editor.defineTheme('lexor-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '727169', fontStyle: 'italic' }, // fujiGray
        { token: 'keyword', foreground: '98BB6C', fontStyle: 'bold' }, // springGreen
        { token: 'string', foreground: 'E6C384' }, // carpYellow
        { token: 'number', foreground: 'FFA066' }, // surimiOrange
        { token: 'type', foreground: '7FB4CA' }, // springBlue
        { token: 'function', foreground: '7E9CD8' }, // crystalBlue
        { token: 'variable', foreground: 'DCD7BA' }, // fujiWhite
        { token: 'constant', foreground: 'D27E99' }, // sakuraPink
        { token: 'operator', foreground: 'C0A36E' }, // boatYellow2
      ],
      colors: {
        'editor.background': '#1F1F28', // sumiInk3
        'editor.foreground': '#DCD7BA', // fujiWhite
        'editor.lineHighlightBackground': '#2A2A37', // sumiInk4
        'editor.selectionBackground': '#363646', // sumiInk5
        'editor.inactiveSelectionBackground': '#2A2A37', // sumiInk4
        'editor.findMatchBackground': '#7E9CD8', // crystalBlue
        'editor.findMatchHighlightBackground': '#363646', // sumiInk5
        'editorCursor.foreground': '#DCD7BA', // fujiWhite
        'editorLineNumber.foreground': '#54546D', // sumiInk6
        'editorLineNumber.activeForeground': '#727169', // fujiGray
        'scrollbarSlider.background': '#54546D33', // sumiInk6 with opacity
        'scrollbarSlider.hoverBackground': '#54546D66', // sumiInk6 with opacity
      }
    });

    // Set theme
    const editorTheme = theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'lexor-dark' : 'lexor-light')
      : theme === 'dark' ? 'lexor-dark' : 'lexor-light';
    
    monaco.editor.setTheme(editorTheme);

    // Configure editor options
    editor.updateOptions({
      fontSize: fontSize,
      lineHeight: lineHeight,
      fontFamily: fontFamily,
      wordWrap: 'bounded',
      wordWrapColumn: 80,
      lineNumbers: 'off',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      padding: { top: 40, bottom: 40 },
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Save command will be handled by menu
    });
  };

  // Handle content change
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setDocumentContent(value);
    }
  };

  // Handle textarea change (fallback)
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDocumentContent(e.target.value);
  };

  // Handle Monaco loading errors
  const handleMonacoError = (error: any) => {
    console.error('Monaco Editor failed to load:', error);
    setMonacoFailed(true);
    setEditorLoading(false);
  };

  // Set timeout to fallback if Monaco doesn't load
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (editorLoading) {
        setMonacoFailed(true);
        setEditorLoading(false);
      }
    }, 8000); // 8 second timeout (increased for CDN loading)
    
    return () => clearTimeout(timeout);
  }, [editorLoading]);

  // Update editor zoom when zoom level changes
  useEffect(() => {
    if (editorRef.current) {
      const scaledFontSize = Math.round((fontSize * zoomLevel) / 100);
      editorRef.current.updateOptions({
        fontSize: scaledFontSize,
      });
    }
  }, [zoomLevel, fontSize]);

  // Determine if we should use dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="h-full flex">
      {/* Editor pane */}
      <div className={clsx(
        'flex-1 relative',
        isPreviewMode ? 'w-1/2' : 'w-full',
        isFocusMode && 'focus-mode'
      )}>
        <div className={clsx(
          "h-full editor-container",
          isDarkMode ? "bg-kanagawa-ink3" : "bg-white"
        )}>
          {editorLoading && !monacoFailed && (
            <div className={clsx(
              "absolute inset-0 flex items-center justify-center z-10",
              isDarkMode ? "bg-kanagawa-ink3 text-kanagawa-white" : "bg-white text-gray-900"
            )}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-sm">Loading Editor...</p>
              </div>
            </div>
          )}
          
          {monacoFailed ? (
            // Fallback textarea editor
            <textarea
              value={documentContent}
              onChange={handleTextareaChange}
              className={clsx(
                "w-full h-full p-4 font-mono text-sm resize-none border-0 outline-none",
                isDarkMode 
                  ? "bg-kanagawa-ink3 text-kanagawa-white placeholder-kanagawa-gray"
                  : "bg-white text-gray-900 placeholder-gray-500"
              )}
              placeholder="Start writing your markdown here..."
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
                fontFamily: fontFamily
              }}
            />
          ) : (
            <Editor
              height="100%"
              language="markdown"
              value={documentContent}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              beforeMount={(monaco) => {
                // Monaco is loading
                console.log('Monaco Editor is loading...');
              }}
              onValidate={(markers) => {
                // Handle validation errors if needed
                if (markers.length > 0) {
                  console.log('Monaco validation:', markers);
                }
              }}
              loading={<div></div>} // Hide Monaco's default loading
              options={{
                automaticLayout: true,
                theme: isDarkMode ? 'lexor-dark' : 'lexor-light',
              }}
            />
          )}
        </div>
        
        {/* Focus mode overlay (if needed) */}
        {isFocusMode && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Focus mode implementation will go here */}
          </div>
        )}
      </div>

      {/* Preview pane */}
      {isPreviewMode && (
        <div className={clsx(
          "w-1/2 border-l",
          isDarkMode ? "border-kanagawa-ink4" : "border-gray-200"
        )}>
          <div className={clsx(
            "h-full p-8 overflow-auto custom-scrollbar",
            isDarkMode ? "bg-kanagawa-ink3" : "bg-white"
          )}>
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