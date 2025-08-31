import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { Extension } from '@codemirror/state';
import { useAppStore } from '../stores/appStore';
import { useEditorTheme } from '../hooks/useEditorTheme';
import { clsx } from 'clsx';

interface SplitScreenEditorProps {
  extensions: Extension[];
  basicSetup: any;
}

export interface SplitScreenEditorRef {
  focusLeft: () => void;
  focusRight: () => void;
  focus: (pane: 'left' | 'right') => void;
}

export const SplitScreenEditor = forwardRef<SplitScreenEditorRef, SplitScreenEditorProps>(({
  extensions,
  basicSetup
}, ref) => {
  // Get data from store and theme hook
  const {
    documentContent,
    setDocumentContent,
    rightPaneContent,
    setRightPaneContent,
    focusedPane,
    setFocusedPane,
    splitRatio,
    setSplitRatio,
    currentDocument,
    rightPaneDocument,
    isFocusMode
  } = useAppStore();
  
  const { isDarkMode, formattedFontFamily, finalFontSize } = useEditorTheme();
  
  const leftEditorRef = useRef<any>(null);
  const rightEditorRef = useRef<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle content changes
  const handleLeftEditorChange = (value: string) => {
    setDocumentContent(value);
    
    // If both panes show the same document, sync the content
    if (currentDocument === rightPaneDocument) {
      setRightPaneContent(value);
    }
  };

  const handleRightEditorChange = (value: string) => {
    setRightPaneContent(value);
    
    // If both panes show the same document, sync the content
    if (currentDocument === rightPaneDocument) {
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

  // Expose focus methods to parent component
  useImperativeHandle(ref, () => ({
    focusLeft: () => {
      if (leftEditorRef.current?.view) {
        leftEditorRef.current.view.focus();
      }
    },
    focusRight: () => {
      if (rightEditorRef.current?.view) {
        rightEditorRef.current.view.focus();
      }
    },
    focus: (pane: 'left' | 'right') => {
      if (pane === 'left' && leftEditorRef.current?.view) {
        leftEditorRef.current.view.focus();
      } else if (pane === 'right' && rightEditorRef.current?.view) {
        rightEditorRef.current.view.focus();
      }
    }
  }), []);

  // Focus the editor when pane focus changes via keyboard shortcuts
  useEffect(() => {
    const timer = setTimeout(() => {
      if (focusedPane === 'left' && leftEditorRef.current?.view) {
        leftEditorRef.current.view.focus();
      } else if (focusedPane === 'right' && rightEditorRef.current?.view) {
        rightEditorRef.current.view.focus();
      }
    }, 50); // Small delay to ensure the focus change has been processed

    return () => clearTimeout(timer);
  }, [focusedPane]);

  // Split pane resize logic
  const handleMouseDown = (e: React.MouseEvent) => {
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
      basicSetup={basicSetup}
      style={{
        height: '100%',
        fontSize: finalFontSize,
        fontFamily: formattedFontFamily,
        opacity: isActive ? 1 : 0.8
      }}
    />
  );

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
          'flex items-center justify-between px-4 py-2 text-sm font-medium',
          focusedPane === 'left' 
            ? isDarkMode ? 'bg-kanagawa-ink4 text-kanagawa-white' : 'bg-blue-50 text-blue-900'
            : isDarkMode ? 'bg-kanagawa-ink2 text-kanagawa-gray' : 'bg-gray-50 text-gray-600'
        )}
        style={{
          borderBottom: 'none',
          outline: 'none'
        }}>
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
              leftEditorRef,
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
          'flex items-center justify-between px-4 py-2 text-sm font-medium',
          focusedPane === 'right' 
            ? isDarkMode ? 'bg-kanagawa-ink4 text-kanagawa-white' : 'bg-blue-50 text-blue-900'
            : isDarkMode ? 'bg-kanagawa-ink2 text-kanagawa-gray' : 'bg-gray-50 text-gray-600'
        )}
        style={{
          borderBottom: 'none',
          outline: 'none'
        }}>
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
});