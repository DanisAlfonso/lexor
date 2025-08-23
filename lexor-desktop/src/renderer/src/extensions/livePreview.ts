import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

// Widget for rendering heading elements
class HeadingWidget extends WidgetType {
  constructor(
    private level: number,
    private text: string,
    private isDark: boolean,
    private lineHeight: number
  ) {
    super();
  }

  eq(other: HeadingWidget) {
    return other.level === this.level && 
           other.text === this.text && 
           other.isDark === this.isDark &&
           other.lineHeight === this.lineHeight;
  }

  toDOM() {
    const element = document.createElement(`h${this.level}`);
    element.textContent = this.text;
    
    // Apply consistent styling that matches the editor theme
    const baseStyles = {
      margin: '0',
      padding: '0',
      fontFamily: 'inherit',
      lineHeight: this.lineHeight.toString(),
      cursor: 'text',
      border: 'none',
      outline: 'none',
      background: 'transparent',
      width: '100%',
      display: 'block'
    };

    // Size and weight based on heading level with much tighter spacing
    const levelStyles = {
      1: { fontSize: '2em', fontWeight: '700', marginTop: '0.3em', marginBottom: '0.1em' },
      2: { fontSize: '1.75em', fontWeight: '600', marginTop: '0.25em', marginBottom: '0.08em' },
      3: { fontSize: '1.5em', fontWeight: '600', marginTop: '0.2em', marginBottom: '0.06em' },
      4: { fontSize: '1.25em', fontWeight: '500', marginTop: '0.15em', marginBottom: '0.05em' },
      5: { fontSize: '1.1em', fontWeight: '500', marginTop: '0.1em', marginBottom: '0.03em' },
      6: { fontSize: '1em', fontWeight: '500', marginTop: '0.08em', marginBottom: '0.02em' }
    };

    // Color based on theme
    const color = this.isDark ? '#DCD7BA' : '#393836';
    
    Object.assign(element.style, {
      ...baseStyles,
      ...levelStyles[this.level as keyof typeof levelStyles],
      color
    });

    return element;
  }

  get estimatedHeight() {
    // Provide height estimates for better performance - much tighter spacing
    const heights = { 1: 32, 2: 28, 3: 26, 4: 24, 5: 22, 6: 20 };
    return heights[this.level as keyof typeof heights] || 20;
  }

  ignoreEvent() {
    return false; // Allow text editing
  }
}

// Widget for inline formatting (bold, italic, strikethrough, code)
class InlineFormatWidget extends WidgetType {
  constructor(
    private text: string,
    private format: 'bold' | 'italic' | 'bold-italic' | 'strikethrough' | 'code',
    private isDark: boolean
  ) {
    super();
  }

  eq(other: InlineFormatWidget) {
    return other.text === this.text && 
           other.format === this.format && 
           other.isDark === this.isDark;
  }

  toDOM() {
    let element: HTMLElement;
    const color = this.isDark ? '#DCD7BA' : '#393836';
    
    switch (this.format) {
      case 'bold':
        element = document.createElement('strong');
        break;
      case 'italic':
        element = document.createElement('em');
        break;
      case 'bold-italic':
        element = document.createElement('strong');
        const em = document.createElement('em');
        em.textContent = this.text;
        element.appendChild(em);
        Object.assign(element.style, {
          color,
          fontFamily: 'inherit',
          background: 'transparent',
          cursor: 'text'
        });
        return element;
      case 'strikethrough':
        element = document.createElement('del');
        break;
      case 'code':
        element = document.createElement('code');
        Object.assign(element.style, {
          backgroundColor: this.isDark ? '#2A2A37' : '#f1f5f9',
          color: this.isDark ? '#ff9580' : '#c53030',
          padding: '2px 4px',
          borderRadius: '3px',
          fontSize: '0.9em',
          fontFamily: 'SF Mono, Monaco, Consolas, Liberation Mono, Courier New, monospace',
          cursor: 'text'
        });
        element.textContent = this.text;
        return element;
      default:
        element = document.createElement('span');
    }
    
    if (this.format !== 'bold-italic') {
      element.textContent = this.text;
    }
    
    Object.assign(element.style, {
      color,
      fontFamily: 'inherit',
      background: 'transparent',
      cursor: 'text'
    });

    return element;
  }

  ignoreEvent() {
    return false; // Allow text editing
  }
}

// Widget for rendering list items
class ListItemWidget extends WidgetType {
  constructor(
    private text: string,
    private level: number,
    private bulletStyle: '•' | '◦' | '▪' | string, // string for numbered lists
    private isDark: boolean,
    private lineHeight: number,
    private isOrdered: boolean = false
  ) {
    super();
  }

  eq(other: ListItemWidget) {
    return other.text === this.text && 
           other.level === this.level && 
           other.bulletStyle === this.bulletStyle &&
           other.isDark === this.isDark &&
           other.lineHeight === this.lineHeight &&
           other.isOrdered === this.isOrdered;
  }

  toDOM() {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'flex-start';
    container.style.margin = '0.02em 0';
    container.style.paddingLeft = `${this.level * 20}px`;
    container.style.lineHeight = this.lineHeight.toString();
    
    // Create bullet/number element
    const bullet = document.createElement('span');
    bullet.textContent = this.bulletStyle;
    bullet.style.marginRight = '8px';
    bullet.style.color = this.isDark ? '#DCD7BA' : '#393836';
    bullet.style.fontWeight = this.isOrdered ? 'normal' : 'bold';
    bullet.style.minWidth = this.isOrdered ? '20px' : '10px';
    bullet.style.userSelect = 'none';
    bullet.style.textAlign = this.isOrdered ? 'right' : 'left';
    
    // Create text element
    const textElement = document.createElement('span');
    textElement.textContent = this.text;
    textElement.style.color = this.isDark ? '#DCD7BA' : '#393836';
    textElement.style.fontFamily = 'inherit';
    textElement.style.cursor = 'text';
    textElement.style.flex = '1';
    
    container.appendChild(bullet);
    container.appendChild(textElement);
    
    return container;
  }

  get estimatedHeight() {
    return 16; // Much tighter spacing for lists
  }

  ignoreEvent() {
    return false; // Allow text editing
  }
}

// State field for toggling live preview mode
import { StateField, StateEffect } from '@codemirror/state';

export const toggleLivePreview = StateEffect.define<boolean>();

export const livePreviewState = StateField.define<boolean>({
  create: () => false,
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(toggleLivePreview)) {
        return effect.value;
      }
    }
    return value;
  }
});

// Extension that conditionally applies live preview
export function conditionalLivePreview(isDark: boolean, lineHeight: number) {
  return [
    livePreviewState,
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;
        isPreviewEnabled: boolean;

        constructor(view: EditorView) {
          this.isPreviewEnabled = view.state.field(livePreviewState);
          this.decorations = this.isPreviewEnabled 
            ? this.buildDecorations(view, isDark, lineHeight) 
            : Decoration.none;
        }

        update(update: ViewUpdate) {
          const newPreviewState = update.state.field(livePreviewState);
          
          if (newPreviewState !== this.isPreviewEnabled || 
              (newPreviewState && (update.docChanged || update.viewportChanged))) {
            this.isPreviewEnabled = newPreviewState;
            this.decorations = this.isPreviewEnabled 
              ? this.buildDecorations(update.view, isDark, lineHeight)
              : Decoration.none;
          }
        }

        buildDecorations(view: EditorView, isDark: boolean, lineHeight: number): DecorationSet {
          const builder = new RangeSetBuilder<Decoration>();
          
          // Collect all decorations first, then sort them
          const decorations: { from: number; to: number; decoration: Decoration }[] = [];
          
          // Handle syntax tree nodes
          syntaxTree(view.state).iterate({
            enter: (node) => {
              // Check for ATX headings (# ## ### etc.)
              if (node.name === 'ATXHeading1' || 
                  node.name === 'ATXHeading2' || 
                  node.name === 'ATXHeading3' || 
                  node.name === 'ATXHeading4' || 
                  node.name === 'ATXHeading5' || 
                  node.name === 'ATXHeading6') {
                
                const level = parseInt(node.name.slice(-1));
                const line = view.state.doc.lineAt(node.from);
                const lineText = line.text;
                
                // Extract heading text (remove # symbols and trim)
                const headingText = lineText.replace(/^#+\s*/, '').trim();
                
                if (headingText) {
                  // Create a replacing decoration for the entire line
                  const widget = new HeadingWidget(level, headingText, isDark, lineHeight);
                  const decoration = Decoration.replace({
                    widget: widget
                  });
                  
                  decorations.push({ from: line.from, to: line.to, decoration });
                }
              }
              
              // Handle inline formatting using the actual node names from debug output
              else if (node.name === 'StrongEmphasis' || node.name === 'Emphasis' || 
                       node.name === 'InlineCode' || node.name === 'HorizontalRule') {
                
                const nodeText = view.state.doc.sliceString(node.from, node.to);
                let format: 'bold' | 'italic' | 'bold-italic' | 'code';
                let innerText: string;
                
                if (node.name === 'StrongEmphasis') {
                  // Handle bold text: **text** or __text__
                  if (nodeText.startsWith('**') && nodeText.endsWith('**')) {
                    format = 'bold';
                    innerText = nodeText.slice(2, -2);
                  } else if (nodeText.startsWith('__') && nodeText.endsWith('__')) {
                    format = 'bold';
                    innerText = nodeText.slice(2, -2);
                  } else {
                    return;
                  }
                } else if (node.name === 'Emphasis') {
                  // Handle italic text: *text* or _text_
                  if (nodeText.startsWith('*') && nodeText.endsWith('*') && !nodeText.startsWith('**')) {
                    format = 'italic';
                    innerText = nodeText.slice(1, -1);
                  } else if (nodeText.startsWith('_') && nodeText.endsWith('_') && !nodeText.startsWith('__')) {
                    format = 'italic';
                    innerText = nodeText.slice(1, -1);
                  } else {
                    return;
                  }
                } else if (node.name === 'HorizontalRule') {
                  // Check if it's actually bold+italic (***text***) that got misinterpreted
                  if (nodeText.startsWith('***') && nodeText.endsWith('***') && nodeText.length > 6) {
                    format = 'bold-italic';
                    innerText = nodeText.slice(3, -3);
                  } else if (nodeText.startsWith('___') && nodeText.endsWith('___') && nodeText.length > 6) {
                    format = 'bold-italic';
                    innerText = nodeText.slice(3, -3);
                  } else {
                    return; // It's actually a horizontal rule, skip it
                  }
                } else if (node.name === 'InlineCode') {
                  // Handle inline code: `text`
                  if (nodeText.startsWith('`') && nodeText.endsWith('`')) {
                    format = 'code';
                    innerText = nodeText.slice(1, -1);
                  } else {
                    return;
                  }
                } else {
                  return;
                }
                
                if (innerText.trim()) {
                  const widget = new InlineFormatWidget(innerText, format, isDark);
                  const decoration = Decoration.replace({
                    widget: widget
                  });
                  
                  decorations.push({ from: node.from, to: node.to, decoration });
                }
              }
            }
          });

          // Add regex-based detection for strikethrough and list items
          const doc = view.state.doc;
          const strikethroughRegex = /~~([^~\n]+)~~/g;
          const unorderedListRegex = /^(\s*)([-*+])\s+(.+)$/;
          const orderedListRegex = /^(\s*)(\d+)\.\s+(.+)$/;
          
          // Search for patterns in the document
          for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const lineText = line.text;
            
            // Check for strikethrough
            let match;
            while ((match = strikethroughRegex.exec(lineText)) !== null) {
              const matchStart = line.from + match.index;
              const matchEnd = matchStart + match[0].length;
              const innerText = match[1];
              
              if (innerText.trim()) {
                const widget = new InlineFormatWidget(innerText, 'strikethrough', isDark);
                const decoration = Decoration.replace({
                  widget: widget
                });
                
                decorations.push({ from: matchStart, to: matchEnd, decoration });
              }
            }
            strikethroughRegex.lastIndex = 0;
            
            // Check for unordered list items
            const unorderedMatch = lineText.match(unorderedListRegex);
            if (unorderedMatch) {
              const [, indentation, bullet, text] = unorderedMatch;
              const level = Math.floor(indentation.length / 2); // 2 spaces = 1 level
              
              // Determine bullet style based on level and marker
              let bulletStyle: '•' | '◦' | '▪';
              if (bullet === '-') {
                bulletStyle = level === 0 ? '•' : level === 1 ? '◦' : '▪';
              } else if (bullet === '*') {
                bulletStyle = level === 0 ? '•' : level === 1 ? '◦' : '▪';
              } else { // bullet === '+'
                bulletStyle = level === 0 ? '•' : level === 1 ? '◦' : '▪';
              }
              
              const widget = new ListItemWidget(text.trim(), level, bulletStyle, isDark, lineHeight, false);
              const decoration = Decoration.replace({
                widget: widget
              });
              
              decorations.push({ from: line.from, to: line.to, decoration });
            }
            
            // Check for ordered list items
            const orderedMatch = lineText.match(orderedListRegex);
            if (orderedMatch) {
              const [, indentation, number, text] = orderedMatch;
              const level = Math.floor(indentation.length / 2); // 2 spaces = 1 level
              
              // Format number with period
              const numberStyle = `${number}.`;
              
              const widget = new ListItemWidget(text.trim(), level, numberStyle, isDark, lineHeight, true);
              const decoration = Decoration.replace({
                widget: widget
              });
              
              decorations.push({ from: line.from, to: line.to, decoration });
            }
          }
          
          // Sort decorations by position and add them in order
          decorations.sort((a, b) => a.from - b.from);
          
          for (const { from, to, decoration } of decorations) {
            builder.add(from, to, decoration);
          }

          return builder.finish();
        }
      },
      {
        decorations: v => v.decorations
      }
    )
  ];
}