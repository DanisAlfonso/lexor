import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { Extension } from '@codemirror/state';
import { clsx } from 'clsx';

interface SinglePaneEditorProps {
  // Editor content and handlers
  value: string;
  onChange: (value: string) => void;
  
  // Editor configuration
  extensions: Extension[];
  basicSetup: any;
  
  // Theme and styling
  isDarkMode: boolean;
  isFocusMode: boolean;
  finalFontSize: string;
  formattedFontFamily: string;
}

export interface SinglePaneEditorRef {
  focus: () => void;
}

export const SinglePaneEditor = forwardRef<SinglePaneEditorRef, SinglePaneEditorProps>(({
  value,
  onChange,
  extensions,
  basicSetup,
  isDarkMode,
  isFocusMode,
  finalFontSize,
  formattedFontFamily
}, ref) => {
  const editorRef = useRef<any>(null);

  // Expose focus method to parent component
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (editorRef.current?.view) {
        editorRef.current.view.focus();
      }
    }
  }), []);

  return (
    <div className="h-full flex">
      {/* Editor pane */}
      <div className={clsx(
        'flex-1 relative',
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
              value={value}
              onChange={onChange}
              extensions={extensions}
              basicSetup={basicSetup}
              style={{
                height: '100%',
                fontSize: finalFontSize,
                fontFamily: formattedFontFamily
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});