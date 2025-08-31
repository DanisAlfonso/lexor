import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { Extension } from '@codemirror/state';
import { useAppStore } from '../stores/appStore';
import { useEditorTheme } from '../hooks/useEditorTheme';
import { clsx } from 'clsx';

interface SinglePaneEditorProps {
  extensions: Extension[];
  basicSetup: any;
}

export interface SinglePaneEditorRef {
  focus: () => void;
}

export const SinglePaneEditor = forwardRef<SinglePaneEditorRef, SinglePaneEditorProps>(({
  extensions,
  basicSetup
}, ref) => {
  // Get data from store and theme hook
  const { documentContent, setDocumentContent, isFocusMode } = useAppStore();
  const { isDarkMode, formattedFontFamily, finalFontSize } = useEditorTheme();
  
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
              value={documentContent}
              onChange={setDocumentContent}
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