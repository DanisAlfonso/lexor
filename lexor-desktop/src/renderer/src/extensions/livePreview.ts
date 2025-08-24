import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { LanguageSupport } from '@codemirror/language';
import { LanguageDescription } from '@codemirror/language-data';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Cache for home directory path
let cachedHomeDir: string | null = null;

// Initialize home directory cache
async function initializeHomeDir() {
  if (cachedHomeDir === null) {
    try {
      // Try to get from main process first (most reliable)
      if (window.electronAPI?.app?.getHomeDirectory) {
        cachedHomeDir = await window.electronAPI.app.getHomeDirectory();
        if (process.env.NODE_ENV === 'development') {
          console.log('Got home directory from main process:', cachedHomeDir);
        }
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('electronAPI not available, using fallback');
        }
        // Fallback to hardcoded path for macOS
        cachedHomeDir = '/Users/' + (process.env.USER || 'user');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to get home directory from main process, using fallback:', error);
      }
      cachedHomeDir = '/Users/' + (process.env.USER || 'user');
    }
  }
  return cachedHomeDir;
}

// Helper function to convert file paths to custom protocol for media access
function getMediaUrl(src: string): string {
  if (process.env.NODE_ENV === 'development') {
    console.log(`getMediaUrl called with: "${src}"`);
  }
  
  // If it's already a URL or relative path, return as-is
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }
  
  let absolutePath = src;
  
  // Handle tilde expansion for home directory
  if (src.startsWith('~/')) {
    // If cache is not initialized yet, try to refresh it
    if (cachedHomeDir === null) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Home directory cache not initialized, trying to refresh...');
      }
      initializeHomeDir().then(() => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Home directory cache refreshed:', cachedHomeDir);
        }
      });
    }
    
    // Use cached home directory or fallback
    const homeDir = cachedHomeDir || '/Users/' + (process.env.USER || 'user');
    absolutePath = src.replace('~', homeDir);
    if (process.env.NODE_ENV === 'development') {
      console.log(`Tilde expansion: ${src} → ${absolutePath} (homeDir: ${homeDir})`);
    }
  }
  
  // If it's not an absolute path after tilde expansion, return as-is (relative path)
  if (!absolutePath.startsWith('/')) {
    return src;
  }
  
  // Convert absolute file paths to custom protocol
  const result = `lexor-file://${encodeURIComponent(absolutePath)}`;
  if (process.env.NODE_ENV === 'development') {
    console.log(`Final conversion: ${absolutePath} → ${result}`);
  }
  return result;
}

// Initialize home directory cache when the module loads
initializeHomeDir();

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

    // Size and weight based on heading level with minimal spacing
    const levelStyles = {
      1: { fontSize: '2em', fontWeight: '700', marginTop: '0.1em', marginBottom: '0.05em' },
      2: { fontSize: '1.75em', fontWeight: '600', marginTop: '0.08em', marginBottom: '0.04em' },
      3: { fontSize: '1.5em', fontWeight: '600', marginTop: '0.06em', marginBottom: '0.03em' },
      4: { fontSize: '1.25em', fontWeight: '500', marginTop: '0.05em', marginBottom: '0.02em' },
      5: { fontSize: '1.1em', fontWeight: '500', marginTop: '0.03em', marginBottom: '0.01em' },
      6: { fontSize: '1em', fontWeight: '500', marginTop: '0.02em', marginBottom: '0.01em' }
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
    const heights = { 1: 24, 2: 22, 3: 20, 4: 18, 5: 16, 6: 16 };
    return heights[this.level as keyof typeof heights] || 16;
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
    container.style.display = 'block';
    container.style.position = 'relative';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.paddingLeft = `${this.level * 20}px`;
    container.style.lineHeight = this.lineHeight.toString();
    container.style.height = 'auto';
    container.style.minHeight = '0';
    container.style.marginTop = '0';
    container.style.marginBottom = '0';
    
    // Debug styling removed
    
    // Create bullet/number element
    const bullet = document.createElement('span');
    bullet.textContent = this.bulletStyle;
    bullet.style.position = 'absolute';
    bullet.style.left = `${this.level * 20 - 15}px`;
    bullet.style.color = this.isDark ? '#DCD7BA' : '#393836';
    bullet.style.fontWeight = this.isOrdered ? 'normal' : 'bold';
    bullet.style.userSelect = 'none';
    bullet.style.width = '15px';
    bullet.style.textAlign = this.isOrdered ? 'right' : 'center';
    
    // Create text element
    const textElement = document.createElement('span');
    textElement.textContent = this.text;
    textElement.style.color = this.isDark ? '#DCD7BA' : '#393836';
    textElement.style.fontFamily = 'inherit';
    textElement.style.cursor = 'text';
    textElement.style.display = 'inline';
    
    container.appendChild(bullet);
    container.appendChild(textElement);
    
    return container;
  }

  get estimatedHeight() {
    // Use a much smaller estimated height to reduce spacing
    const compactHeight = Math.ceil(this.lineHeight * 12); // Smaller base to reduce spacing
    return Math.max(compactHeight, 10); // Minimum 10px height
  }

  ignoreEvent() {
    return false; // Allow text editing
  }
}

// Widget for rendering a group of consecutive list items
class ListGroupWidget extends WidgetType {
  constructor(
    private items: any[],
    private isDark: boolean,
    private lineHeight: number
  ) {
    super();
  }

  eq(other: ListGroupWidget) {
    return other.items.length === this.items.length && 
           other.items.every((item, i) => 
             item.text === this.items[i].text &&
             item.level === this.items[i].level &&
             item.isOrdered === this.items[i].isOrdered &&
             item.isTask === this.items[i].isTask &&
             item.taskChecked === this.items[i].taskChecked
           ) &&
           other.isDark === this.isDark &&
           other.lineHeight === this.lineHeight;
  }

  toDOM() {
    const container = document.createElement('div');
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.lineHeight = this.lineHeight.toString();
    
    // Debug styling removed - clean production appearance

    // Render each list item with minimal spacing
    this.items.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.style.display = 'flex';
      itemDiv.style.alignItems = 'flex-start';
      itemDiv.style.margin = '0';
      itemDiv.style.padding = '0';
      itemDiv.style.paddingLeft = `${item.level * 20}px`;
      itemDiv.style.lineHeight = this.lineHeight.toString();

      // Create bullet/number/checkbox
      const bullet = document.createElement('span');
      bullet.style.marginRight = '8px';
      bullet.style.userSelect = 'none';
      bullet.style.display = 'inline-flex';
      bullet.style.alignItems = 'center';
      bullet.style.minWidth = item.isOrdered ? '20px' : '18px';
      
      if (item.isTask) {
        // Create checkbox for task items
        const checkbox = document.createElement('span');
        checkbox.style.width = '14px';
        checkbox.style.height = '14px';
        checkbox.style.border = this.isDark ? '1px solid #727169' : '1px solid #9ca3af';
        checkbox.style.borderRadius = '2px';
        checkbox.style.display = 'inline-flex';
        checkbox.style.alignItems = 'center';
        checkbox.style.justifyContent = 'center';
        checkbox.style.fontSize = '10px';
        checkbox.style.lineHeight = '1';
        
        if (item.taskChecked) {
          checkbox.textContent = '✓';
          checkbox.style.backgroundColor = this.isDark ? '#8ea49e' : '#10b981';
          checkbox.style.borderColor = this.isDark ? '#8ea49e' : '#10b981';
          checkbox.style.color = 'white';
        } else {
          checkbox.style.backgroundColor = 'transparent';
        }
        
        bullet.appendChild(checkbox);
      } else if (item.isOrdered) {
        bullet.textContent = `${item.marker}.`;
        bullet.style.color = this.isDark ? '#DCD7BA' : '#393836';
        bullet.style.fontWeight = 'normal';
        bullet.style.textAlign = 'right';
      } else {
        const level = item.level;
        bullet.textContent = level === 0 ? '•' : level === 1 ? '◦' : '▪';
        bullet.style.color = this.isDark ? '#DCD7BA' : '#393836';
        bullet.style.fontWeight = 'bold';
        bullet.style.textAlign = 'left';
      }

      const text = document.createElement('span');
      text.textContent = item.text;
      text.style.fontFamily = 'inherit';
      text.style.cursor = 'text';
      text.style.flex = '1';
      
      // Special styling for task items
      if (item.isTask && item.taskChecked) {
        text.style.textDecoration = 'line-through';
        text.style.opacity = '0.6';
        text.style.color = this.isDark ? '#727169' : '#6b7280'; // More muted color
      } else {
        text.style.color = this.isDark ? '#DCD7BA' : '#393836';
      }

      itemDiv.appendChild(bullet);
      itemDiv.appendChild(text);
      container.appendChild(itemDiv);
    });

    return container;
  }

  get estimatedHeight() {
    // Estimate height for all items combined with minimal spacing
    const itemHeight = Math.ceil(this.lineHeight * 12);
    return this.items.length * itemHeight;
  }

  ignoreEvent() {
    return false;
  }
}

// Widget for rendering markdown tables
class TableWidget extends WidgetType {
  constructor(
    private tableData: {
      headers: string[];
      alignments: ('left' | 'center' | 'right')[];
      rows: string[][];
    },
    private isDark: boolean,
    private lineHeight: number
  ) {
    super();
  }

  eq(other: TableWidget) {
    return JSON.stringify(this.tableData) === JSON.stringify(other.tableData) &&
           other.isDark === this.isDark &&
           other.lineHeight === this.lineHeight;
  }

  toDOM() {
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.margin = '0.5em 0';
    table.style.fontSize = 'inherit';
    table.style.fontFamily = 'inherit';
    table.style.lineHeight = this.lineHeight.toString();
    table.style.border = this.isDark ? '1px solid #363646' : '1px solid #e2e8f0';
    table.style.backgroundColor = this.isDark ? '#1F1F28' : '#ffffff';
    
    // Create table header
    if (this.tableData.headers.length > 0) {
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.style.backgroundColor = this.isDark ? '#2A2A37' : '#f8f9fa';
      
      this.tableData.headers.forEach((header, index) => {
        const th = document.createElement('th');
        th.innerHTML = this.parseInlineMarkdown(header.trim());
        th.style.padding = '8px 12px';
        th.style.border = this.isDark ? '1px solid #363646' : '1px solid #e2e8f0';
        th.style.fontWeight = '600';
        th.style.color = this.isDark ? '#DCD7BA' : '#393836';
        th.style.textAlign = this.tableData.alignments[index] || 'left';
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
    }
    
    // Create table body
    if (this.tableData.rows.length > 0) {
      const tbody = document.createElement('tbody');
      
      this.tableData.rows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        tr.style.backgroundColor = this.isDark 
          ? (rowIndex % 2 === 0 ? '#1F1F28' : '#252535')
          : (rowIndex % 2 === 0 ? '#ffffff' : '#f8f9fa');
        
        row.forEach((cell, cellIndex) => {
          const td = document.createElement('td');
          td.innerHTML = this.parseInlineMarkdown(cell.trim());
          td.style.padding = '8px 12px';
          td.style.border = this.isDark ? '1px solid #363646' : '1px solid #e2e8f0';
          td.style.color = this.isDark ? '#DCD7BA' : '#393836';
          td.style.textAlign = this.tableData.alignments[cellIndex] || 'left';
          tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
      });
      
      table.appendChild(tbody);
    }
    
    return table;
  }

  private parseInlineMarkdown(text: string): string {
    // Simple inline markdown parsing for table cells
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
      .replace(/`(.*?)`/g, `<code style="background-color: ${this.isDark ? '#2A2A37' : '#f1f5f9'}; color: ${this.isDark ? '#ff9580' : '#c53030'}; padding: 2px 4px; border-radius: 3px; font-size: 0.9em;">$1</code>`) // Inline code
      .replace(/~~(.*?)~~/g, '<del>$1</del>')            // Strikethrough
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" style="color: ${this.isDark ? '#a292a3' : '#a292a3'}; text-decoration: underline;">$1</a>`); // Links
  }

  get estimatedHeight() {
    // Estimate height based on number of rows
    const headerHeight = this.tableData.headers.length > 0 ? 32 : 0;
    const rowHeight = 28;
    const totalRows = this.tableData.rows.length;
    return headerHeight + (totalRows * rowHeight) + 16; // +16 for margins
  }

  ignoreEvent() {
    return false;
  }
}

// Widget for rendering horizontal rules
class HorizontalRuleWidget extends WidgetType {
  constructor(
    private isDark: boolean,
    private lineHeight: number
  ) {
    super();
  }

  eq(other: HorizontalRuleWidget) {
    return other.isDark === this.isDark && other.lineHeight === this.lineHeight;
  }

  toDOM() {
    const container = document.createElement('div');
    container.style.margin = '2em 0';
    container.style.padding = '0';
    container.style.textAlign = 'center';
    container.style.lineHeight = this.lineHeight.toString();
    container.style.position = 'relative';
    
    const hr = document.createElement('div');
    hr.style.height = '1px';
    hr.style.width = '100%';
    hr.style.margin = '0';
    hr.style.position = 'relative';
    
    // Create the main line with gradient
    hr.style.background = this.isDark 
      ? 'linear-gradient(to right, transparent 0%, #363646 20%, #545464 50%, #363646 80%, transparent 100%)'
      : 'linear-gradient(to right, transparent 0%, #e2e8f0 20%, #cbd5e1 50%, #e2e8f0 80%, transparent 100%)';
    
    // Add a subtle shadow/glow effect
    hr.style.boxShadow = this.isDark 
      ? '0 0 4px rgba(84, 84, 100, 0.3)'
      : '0 0 2px rgba(203, 213, 225, 0.5)';
    
    container.appendChild(hr);
    return container;
  }

  get estimatedHeight() {
    return Math.ceil(this.lineHeight * 16) + 32; // Line height + margins
  }

  ignoreEvent() {
    return false;
  }
}

// Widget for rendering fenced code blocks
class CodeBlockWidget extends WidgetType {
  constructor(
    private code: string,
    private language: string,
    private isDark: boolean,
    private lineHeight: number
  ) {
    super();
  }

  eq(other: CodeBlockWidget) {
    return other.code === this.code && 
           other.language === this.language && 
           other.isDark === this.isDark &&
           other.lineHeight === this.lineHeight;
  }

  toDOM() {
    const container = document.createElement('div');
    container.style.margin = '0'; // NO margin at all
    container.style.padding = '0'; // NO padding at all
    container.style.borderRadius = '8px';
    container.style.overflow = 'hidden';
    container.style.backgroundColor = this.isDark ? '#2A2A37' : '#f8f9fa';
    container.style.border = this.isDark ? '1px solid #363646' : '1px solid #e2e8f0';
    container.style.display = 'block';
    container.style.width = '100%';
    container.style.lineHeight = '1'; // Force minimal line height
    
    // Language label (optional, only if language is specified)
    if (this.language) {
      const languageLabel = document.createElement('div');
      languageLabel.textContent = this.language;
      languageLabel.style.padding = '4px 8px'; // Very compact padding
      languageLabel.style.fontSize = '0.7rem'; // Smaller font
      languageLabel.style.fontWeight = '600';
      languageLabel.style.color = this.isDark ? '#9e9b93' : '#64748b';
      languageLabel.style.backgroundColor = this.isDark ? '#1F1F28' : '#f1f5f9';
      languageLabel.style.borderBottom = this.isDark ? '1px solid #363646' : '1px solid #e2e8f0';
      languageLabel.style.textTransform = 'uppercase';
      languageLabel.style.letterSpacing = '0.05em';
      container.appendChild(languageLabel);
    }
    
    // Code content
    const codeElement = document.createElement('pre');
    codeElement.style.margin = '0';
    codeElement.style.padding = '8px'; // Much smaller padding
    codeElement.style.fontFamily = 'SF Mono, Monaco, Consolas, Liberation Mono, Courier New, monospace';
    codeElement.style.fontSize = '0.9em';
    codeElement.style.lineHeight = this.lineHeight.toString();
    codeElement.style.color = this.isDark ? '#DCD7BA' : '#393836';
    codeElement.style.backgroundColor = 'transparent';
    codeElement.style.overflow = 'auto';
    codeElement.style.whiteSpace = 'pre';
    codeElement.style.cursor = 'text';
    
    const codeContent = document.createElement('code');
    codeContent.style.fontFamily = 'inherit';
    codeContent.style.fontSize = 'inherit';
    codeContent.style.backgroundColor = 'transparent';
    
    // Apply basic syntax highlighting based on language
    this.applySyntaxHighlighting(codeContent, this.code, this.language);
    
    codeElement.appendChild(codeContent);
    container.appendChild(codeElement);
    
    return container;
  }

  private applySyntaxHighlighting(element: HTMLElement, code: string, language: string) {
    // Simply set the text content and apply basic styling
    element.textContent = code;
    
    // Apply language-specific styles to the entire code block
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        element.style.color = this.isDark ? '#DCD7BA' : '#393836';
        break;
      case 'python':
      case 'py':
        element.style.color = this.isDark ? '#DCD7BA' : '#393836';
        break;
      case 'html':
        element.style.color = this.isDark ? '#DCD7BA' : '#393836';
        break;
      case 'css':
        element.style.color = this.isDark ? '#DCD7BA' : '#393836';
        break;
      default:
        element.style.color = this.isDark ? '#DCD7BA' : '#393836';
    }
  }

  private getSyntaxPatterns(language: string) {
    const basePatterns = [
      { pattern: /"[^"]*"/g, className: 'string' },
      { pattern: /'[^']*'/g, className: 'string' },
      { pattern: /`[^`]*`/g, className: 'string' },
      { pattern: /\/\/.*$/gm, className: 'comment' },
      { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
    ];

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
      case 'typescript':
      case 'ts':
        return [
          ...basePatterns,
          { pattern: /\b(function|const|let|var|if|else|for|while|return|class|extends|import|export|from|async|await|try|catch|finally|throw|new)\b/g, className: 'keyword' },
          { pattern: /\b(true|false|null|undefined)\b/g, className: 'literal' },
          { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
        ];
      
      case 'python':
      case 'py':
        return [
          ...basePatterns,
          { pattern: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|lambda|async|await|yield)\b/g, className: 'keyword' },
          { pattern: /\b(True|False|None)\b/g, className: 'literal' },
          { pattern: /\b\d+\.?\d*\b/g, className: 'number' },
          { pattern: /#.*$/gm, className: 'comment' },
        ];
      
      case 'html':
        return [
          { pattern: /&lt;[^&]*&gt;/g, className: 'tag' },
          { pattern: /&lt;\/[^&]*&gt;/g, className: 'tag' },
          { pattern: /"[^"]*"/g, className: 'string' },
          { pattern: /&lt;!--[\s\S]*?--&gt;/g, className: 'comment' },
        ];
      
      case 'css':
        return [
          { pattern: /\{[^}]*\}/g, className: 'block' },
          { pattern: /[.#]?[\w-]+(?=\s*\{)/g, className: 'selector' },
          { pattern: /[\w-]+(?=\s*:)/g, className: 'property' },
          { pattern: /"[^"]*"|'[^']*'/g, className: 'string' },
          { pattern: /\/\*[\s\S]*?\*\//g, className: 'comment' },
        ];
      
      default:
        return basePatterns;
    }
  }

  private getColorForClass(className: string): string {
    const darkColors = {
      keyword: '#8ea49e',      // muted teal
      string: '#d4c196',       // warm beige
      comment: '#727169',      // fujiGray
      literal: '#c4b28a',      // soft yellow
      number: '#c4b28a',       // soft yellow
      tag: '#cc928e',          // soft coral
      selector: '#a292a3',     // muted purple
      property: '#8ea49e',     // muted teal
      block: '#DCD7BA',        // fujiWhite
    };

    const lightColors = {
      keyword: '#8ea49e',      // muted teal
      string: '#d4c196',       // warm beige
      comment: '#717C7C',      // gray
      literal: '#c4b28a',      // soft yellow
      number: '#c4b28a',       // soft yellow
      tag: '#cc928e',          // soft coral
      selector: '#a292a3',     // muted purple
      property: '#8ea49e',     // muted teal
      block: '#393836',        // dark
    };

    const colors = this.isDark ? darkColors : lightColors;
    return colors[className as keyof typeof colors] || (this.isDark ? '#DCD7BA' : '#393836');
  }

  get estimatedHeight() {
    // Estimate height based on number of lines with very compact spacing
    const lines = this.code.split('\n').length;
    const headerHeight = this.language ? 14 : 0; // Very small language label height
    const padding = 12; // Minimal padding
    const lineHeight = 12; // Very compact line height
    return headerHeight + padding + (lines * lineHeight);
  }

  ignoreEvent() {
    return false; // Allow text editing
  }
}

// Widget for rendering mathematical equations using KaTeX
class EquationWidget extends WidgetType {
  constructor(
    private latex: string,
    private isBlock: boolean,
    private isDark: boolean,
    private lineHeight: number
  ) {
    super();
  }

  eq(other: EquationWidget) {
    return other.latex === this.latex && 
           other.isBlock === this.isBlock && 
           other.isDark === this.isDark &&
           other.lineHeight === this.lineHeight;
  }

  toDOM() {
    const container = document.createElement(this.isBlock ? 'div' : 'span');
    
    // Base styling
    container.style.fontFamily = 'inherit';
    container.style.cursor = 'text';
    container.style.color = this.isDark ? '#DCD7BA' : '#393836';
    
    if (this.isBlock) {
      container.style.display = 'block';
      container.style.textAlign = 'center';
      container.style.margin = '1em 0';
      container.style.padding = '0.5em 0';
      container.style.lineHeight = this.lineHeight.toString();
    } else {
      container.style.display = 'inline';
      container.style.verticalAlign = 'baseline';
      container.style.margin = '0 2px';
    }

    try {
      // Render LaTeX using KaTeX
      const html = katex.renderToString(this.latex, {
        throwOnError: false,
        displayMode: this.isBlock,
        output: 'html',
        trust: false, // Security: don't trust arbitrary LaTeX commands
        strict: false, // Allow more LaTeX constructs
      });
      
      container.innerHTML = html;
      
      // Apply theme-specific styling to KaTeX elements
      this.applyThemeStyles(container);
      
    } catch (error) {
      // Fallback for invalid LaTeX - show the original text
      const errorSpan = document.createElement('span');
      errorSpan.textContent = this.isBlock ? `$$${this.latex}$$` : `$${this.latex}$`;
      errorSpan.style.backgroundColor = this.isDark ? '#2A2A37' : '#fee2e2';
      errorSpan.style.color = this.isDark ? '#e85d75' : '#dc2626';
      errorSpan.style.padding = '2px 4px';
      errorSpan.style.borderRadius = '3px';
      errorSpan.style.fontSize = '0.9em';
      errorSpan.style.fontFamily = 'SF Mono, Monaco, Consolas, Liberation Mono, Courier New, monospace';
      errorSpan.title = `LaTeX Error: ${error instanceof Error ? error.message : 'Invalid equation'}`;
      container.appendChild(errorSpan);
    }

    return container;
  }

  private applyThemeStyles(container: HTMLElement) {
    // Apply dark/light theme colors to KaTeX rendered elements
    const katexElements = container.querySelectorAll('.katex, .katex *');
    
    katexElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      
      // Set text color for the theme
      if (!htmlElement.style.color || htmlElement.style.color === 'inherit') {
        htmlElement.style.color = this.isDark ? '#DCD7BA' : '#393836';
      }
      
      // Handle specific KaTeX classes that might need theme adjustments
      if (htmlElement.classList.contains('katex-html')) {
        htmlElement.style.color = this.isDark ? '#DCD7BA' : '#393836';
      }
      
      // Ensure mathematical symbols are visible
      if (htmlElement.tagName === 'SPAN' && !htmlElement.style.color) {
        htmlElement.style.color = this.isDark ? '#DCD7BA' : '#393836';
      }
    });
  }

  get estimatedHeight() {
    if (this.isBlock) {
      // Block equations need more vertical space
      const lines = this.latex.split('\n').length;
      return Math.max(40, lines * 20 + 32); // Base height + margins
    } else {
      // Inline equations should match line height
      return Math.ceil(this.lineHeight * 16);
    }
  }

  ignoreEvent() {
    return false; // Allow text editing
  }
}

// Widget for rendering images with professional features
class ImageWidget extends WidgetType {
  constructor(
    private src: string,
    private alt: string,
    private title: string,
    private isDark: boolean,
    private lineHeight: number
  ) {
    super();
  }

  eq(other: ImageWidget) {
    return other.src === this.src && 
           other.alt === this.alt && 
           other.title === this.title &&
           other.isDark === this.isDark &&
           other.lineHeight === this.lineHeight;
  }

  toDOM() {
    const container = document.createElement('div');
    container.style.display = 'block';
    container.style.margin = '1.5em 0';
    container.style.textAlign = 'center';
    container.style.position = 'relative';
    container.style.borderRadius = '12px';
    container.style.overflow = 'hidden';
    container.style.backgroundColor = this.isDark ? '#2A2A37' : '#f8f9fa';
    container.style.border = this.isDark ? '1px solid #363646' : '1px solid #e2e8f0';
    container.style.transition = 'all 0.3s ease';
    container.style.cursor = 'pointer';

    // Add hover effects for premium feel
    container.addEventListener('mouseenter', () => {
      container.style.transform = 'translateY(-2px)';
      container.style.boxShadow = this.isDark 
        ? '0 8px 32px rgba(0, 0, 0, 0.3)'
        : '0 8px 32px rgba(0, 0, 0, 0.1)';
    });

    container.addEventListener('mouseleave', () => {
      container.style.transform = 'translateY(0)';
      container.style.boxShadow = 'none';
    });

    // Loading placeholder
    const loadingDiv = document.createElement('div');
    loadingDiv.style.display = 'flex';
    loadingDiv.style.alignItems = 'center';
    loadingDiv.style.justifyContent = 'center';
    loadingDiv.style.padding = '3rem';
    loadingDiv.style.color = this.isDark ? '#727169' : '#6b7280';
    loadingDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
        <div style="width: 24px; height: 24px; border: 2px solid currentColor; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <span style="font-size: 0.875rem;">Loading image...</span>
      </div>
    `;

    // Add CSS animation for loading spinner
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    container.appendChild(loadingDiv);

    // Create the actual image
    const img = document.createElement('img');
    img.src = getMediaUrl(this.src);
    img.alt = this.alt;
    img.title = this.title;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'none';
    img.style.borderRadius = '12px';
    img.style.transition = 'opacity 0.3s ease';

    // Professional image loading with error handling
    img.onload = () => {
      loadingDiv.remove();
      img.style.display = 'block';
      img.style.opacity = '0';
      container.appendChild(img);
      
      // Smooth fade-in animation
      requestAnimationFrame(() => {
        img.style.opacity = '1';
      });

      // Add image metadata overlay for premium experience
      if (this.title || this.alt) {
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.bottom = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.background = this.isDark 
          ? 'linear-gradient(transparent, rgba(31, 31, 40, 0.9))'
          : 'linear-gradient(transparent, rgba(248, 249, 250, 0.9))';
        overlay.style.color = this.isDark ? '#DCD7BA' : '#393836';
        overlay.style.padding = '1rem';
        overlay.style.fontSize = '0.875rem';
        overlay.style.lineHeight = '1.4';
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';

        if (this.title) {
          const titleElement = document.createElement('div');
          titleElement.textContent = this.title;
          titleElement.style.fontWeight = '600';
          titleElement.style.marginBottom = '0.25rem';
          overlay.appendChild(titleElement);
        }

        if (this.alt && this.alt !== this.title) {
          const altElement = document.createElement('div');
          altElement.textContent = this.alt;
          altElement.style.opacity = '0.8';
          overlay.appendChild(altElement);
        }

        container.appendChild(overlay);

        // Show overlay on hover
        container.addEventListener('mouseenter', () => {
          overlay.style.opacity = '1';
        });

        container.addEventListener('mouseleave', () => {
          overlay.style.opacity = '0';
        });
      }
    };

    // Professional error handling
    img.onerror = () => {
      loadingDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: ${this.isDark ? '#2A2A37' : '#f3f4f6'}; display: flex; align-items: center; justify-content: center;">
            <svg width="24" height="24" fill="none" stroke="${this.isDark ? '#e85d75' : '#dc2626'}" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div style="text-align: center;">
            <div style="font-weight: 600; color: ${this.isDark ? '#e85d75' : '#dc2626'}; margin-bottom: 0.5rem;">
              Failed to load image
            </div>
            <div style="font-size: 0.875rem; color: ${this.isDark ? '#727169' : '#6b7280'}; margin-bottom: 1rem;">
              ${this.src}
            </div>
            <button style="
              padding: 0.5rem 1rem;
              background: ${this.isDark ? '#363646' : '#e5e7eb'};
              border: none;
              border-radius: 6px;
              color: ${this.isDark ? '#DCD7BA' : '#393836'};
              cursor: pointer;
              font-size: 0.875rem;
              transition: all 0.2s ease;
            " onclick="this.parentElement.parentElement.parentElement.querySelector('img').src = this.parentElement.parentElement.parentElement.querySelector('img').src">
              Retry
            </button>
          </div>
        </div>
      `;
    };

    // Enhanced accessibility
    container.setAttribute('role', 'img');
    container.setAttribute('aria-label', this.alt || 'Image');
    container.setAttribute('tabindex', '0');

    // Keyboard navigation
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openImageModal(img, this.title, this.alt);
      }
    });

    // Click to open full-size modal
    container.addEventListener('click', () => {
      this.openImageModal(img, this.title, this.alt);
    });

    return container;
  }

  private openImageModal(img: HTMLImageElement, title: string, alt: string) {
    // Create premium modal overlay
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    modal.style.zIndex = '10000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '2rem';
    modal.style.cursor = 'pointer';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';

    const modalImg = document.createElement('img');
    modalImg.src = img.src;
    modalImg.style.maxWidth = '90%';
    modalImg.style.maxHeight = '90%';
    modalImg.style.borderRadius = '12px';
    modalImg.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.5)';
    modalImg.style.cursor = 'default';
    modalImg.style.transform = 'scale(0.8)';
    modalImg.style.transition = 'transform 0.3s ease';

    // Prevent modal from closing when clicking the image
    modalImg.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    modal.appendChild(modalImg);

    // Close modal on click, escape key, or outside click
    modal.addEventListener('click', () => {
      modal.style.opacity = '0';
      modalImg.style.transform = 'scale(0.8)';
      setTimeout(() => modal.remove(), 300);
    });

    document.addEventListener('keydown', function escapeHandler(e) {
      if (e.key === 'Escape') {
        modal.click();
        document.removeEventListener('keydown', escapeHandler);
      }
    });

    document.body.appendChild(modal);

    // Smooth animation
    requestAnimationFrame(() => {
      modal.style.opacity = '1';
      modalImg.style.transform = 'scale(1)';
    });
  }

  get estimatedHeight() {
    // Provide a reasonable default height estimate
    return 200;
  }

  ignoreEvent() {
    return false;
  }
}

// Widget for rendering inline audio players (text-height size)
class InlineAudioWidget extends WidgetType {
  constructor(
    private src: string,
    private title: string,
    private isDark: boolean
  ) {
    super();
  }

  eq(other: InlineAudioWidget) {
    return other.src === this.src && 
           other.title === this.title &&
           other.isDark === this.isDark;
  }

  toDOM() {
    const container = document.createElement('span');
    container.style.display = 'inline-flex';
    container.style.alignItems = 'center';
    container.style.gap = '0.25rem';
    container.style.margin = '0 0.125rem';
    container.style.verticalAlign = 'baseline';
    container.style.position = 'relative';

    // Audio element (hidden)
    const audio = document.createElement('audio');
    audio.src = getMediaUrl(this.src);
    audio.preload = 'metadata';
    audio.style.display = 'none';

    // Compact play button (rounded square, text height)
    const playButton = document.createElement('button');
    playButton.style.width = '1.6em';
    playButton.style.height = '1.2em';
    playButton.style.borderRadius = '0.25em'; // Slightly larger rounded corners
    playButton.style.border = 'none';
    playButton.style.background = this.isDark 
      ? 'linear-gradient(135deg, #8ea49e 0%, #7a9188 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    playButton.style.color = 'white';
    playButton.style.cursor = 'pointer';
    playButton.style.display = 'inline-flex';
    playButton.style.alignItems = 'center';
    playButton.style.justifyContent = 'center';
    playButton.style.transition = 'all 0.2s ease';
    playButton.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
    playButton.style.fontSize = '0.75em'; // Slightly larger icons
    playButton.style.verticalAlign = 'baseline';

    // Tiny play/pause icons
    const playIcon = `<svg width="0.7em" height="0.7em" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    const pauseIcon = `<svg width="0.7em" height="0.7em" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>`;
    
    playButton.innerHTML = playIcon;

    // Minimal hover effect
    playButton.addEventListener('mouseenter', () => {
      playButton.style.transform = 'scale(1.1)';
      playButton.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.3)';
    });

    playButton.addEventListener('mouseleave', () => {
      playButton.style.transform = 'scale(1)';
      playButton.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
    });

    // Optional: tiny progress indicator (visual feedback)
    const progressDot = document.createElement('span');
    progressDot.style.width = '3px';
    progressDot.style.height = '3px';
    progressDot.style.borderRadius = '50%';
    progressDot.style.backgroundColor = this.isDark ? '#8ea49e' : '#3b82f6';
    progressDot.style.opacity = '0';
    progressDot.style.transition = 'opacity 0.3s ease';
    progressDot.style.marginLeft = '2px';

    container.appendChild(audio);
    container.appendChild(playButton);
    container.appendChild(progressDot);

    // Audio event handlers
    let isPlaying = false;

    playButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (isPlaying) {
        audio.pause();
      } else {
        // Pause any other playing audio
        document.querySelectorAll('audio').forEach(otherAudio => {
          if (otherAudio !== audio && !otherAudio.paused) {
            otherAudio.pause();
          }
        });
        
        audio.play().catch((error) => {
          console.error('Error playing audio:', error);
          this.showError(playButton);
        });
      }
    });

    audio.addEventListener('play', () => {
      isPlaying = true;
      playButton.innerHTML = pauseIcon;
      progressDot.style.opacity = '1';
      
      // Update all other play buttons to show play state
      document.querySelectorAll('audio').forEach(otherAudio => {
        if (otherAudio !== audio && !otherAudio.paused) {
          otherAudio.pause();
        }
      });
    });

    audio.addEventListener('pause', () => {
      isPlaying = false;
      playButton.innerHTML = playIcon;
      progressDot.style.opacity = '0';
    });

    audio.addEventListener('ended', () => {
      isPlaying = false;
      playButton.innerHTML = playIcon;
      progressDot.style.opacity = '0';
    });

    audio.addEventListener('error', () => {
      this.showError(playButton);
    });

    // Enhanced accessibility
    playButton.setAttribute('aria-label', `Play audio: ${this.title || 'audio clip'}`);
    playButton.setAttribute('title', this.title || 'Play audio');
    container.setAttribute('role', 'button');

    return container;
  }

  private showError(button: HTMLElement) {
    const originalBg = button.style.background;
    button.style.background = this.isDark ? '#e85d75' : '#dc2626';
    button.innerHTML = `<svg width="0.7em" height="0.7em" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
    
    setTimeout(() => {
      button.style.background = originalBg;
      button.innerHTML = `<svg width="0.7em" height="0.7em" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }, 2000);
  }

  ignoreEvent() {
    return false;
  }
}

// Widget for rendering block audio players (full controls)
class BlockAudioWidget extends WidgetType {
  constructor(
    private src: string,
    private title: string,
    private isDark: boolean,
    private lineHeight: number
  ) {
    super();
  }

  eq(other: BlockAudioWidget) {
    return other.src === this.src && 
           other.title === this.title &&
           other.isDark === this.isDark &&
           other.lineHeight === this.lineHeight;
  }

  toDOM() {
    const container = document.createElement('div');
    container.style.display = 'block';
    container.style.margin = '0.75em 0';
    container.style.padding = '0.75rem';
    container.style.backgroundColor = this.isDark ? '#2A2A37' : '#f8f9fa';
    container.style.border = this.isDark ? '1px solid #363646' : '1px solid #e2e8f0';
    container.style.borderRadius = '12px';
    container.style.transition = 'all 0.3s ease';
    container.style.position = 'relative';

    // Premium gradient background
    container.style.background = this.isDark 
      ? 'linear-gradient(135deg, #2A2A37 0%, #252535 100%)'
      : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)';

    // Audio element (hidden)
    const audio = document.createElement('audio');
    audio.src = getMediaUrl(this.src);
    audio.preload = 'metadata';
    audio.style.display = 'none';

    // Custom audio controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.style.display = 'flex';
    controlsContainer.style.alignItems = 'center';
    controlsContainer.style.gap = '0.75rem';

    // Play/Pause button with premium styling (smaller)
    const playButton = document.createElement('button');
    playButton.style.width = '36px';
    playButton.style.height = '36px';
    playButton.style.borderRadius = '50%';
    playButton.style.border = 'none';
    playButton.style.background = this.isDark 
      ? 'linear-gradient(135deg, #8ea49e 0%, #7a9188 100%)'
      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    playButton.style.color = 'white';
    playButton.style.cursor = 'pointer';
    playButton.style.display = 'flex';
    playButton.style.alignItems = 'center';
    playButton.style.justifyContent = 'center';
    playButton.style.transition = 'all 0.2s ease';
    playButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';

    // Play icon SVG (smaller)
    const playIcon = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;

    // Pause icon SVG (smaller)
    const pauseIcon = `
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
      </svg>
    `;

    playButton.innerHTML = playIcon;

    // Button hover effects
    playButton.addEventListener('mouseenter', () => {
      playButton.style.transform = 'scale(1.05)';
      playButton.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
    });

    playButton.addEventListener('mouseleave', () => {
      playButton.style.transform = 'scale(1)';
      playButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    // Progress container (more compact)
    const progressContainer = document.createElement('div');
    progressContainer.style.flex = '1';
    progressContainer.style.display = 'flex';
    progressContainer.style.flexDirection = 'column';
    progressContainer.style.gap = '0.375rem';

    // Title and duration info (smaller font)
    const infoContainer = document.createElement('div');
    infoContainer.style.display = 'flex';
    infoContainer.style.justifyContent = 'space-between';
    infoContainer.style.alignItems = 'center';
    infoContainer.style.fontSize = '0.8125rem';

    const titleSpan = document.createElement('span');
    titleSpan.textContent = this.title || 'Audio File';
    titleSpan.style.fontWeight = '600';
    titleSpan.style.color = this.isDark ? '#DCD7BA' : '#393836';

    const durationSpan = document.createElement('span');
    durationSpan.textContent = '0:00 / 0:00';
    durationSpan.style.color = this.isDark ? '#727169' : '#6b7280';
    durationSpan.style.fontFamily = 'SF Mono, Monaco, Consolas, Liberation Mono, Courier New, monospace';

    infoContainer.appendChild(titleSpan);
    infoContainer.appendChild(durationSpan);

    // Progress bar (slightly smaller)
    const progressBar = document.createElement('div');
    progressBar.style.width = '100%';
    progressBar.style.height = '4px';
    progressBar.style.backgroundColor = this.isDark ? '#363646' : '#e5e7eb';
    progressBar.style.borderRadius = '2px';
    progressBar.style.cursor = 'pointer';
    progressBar.style.position = 'relative';
    progressBar.style.overflow = 'hidden';

    const progressFill = document.createElement('div');
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.background = this.isDark 
      ? 'linear-gradient(90deg, #8ea49e 0%, #7a9188 100%)'
      : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)';
    progressFill.style.borderRadius = '2px';
    progressFill.style.transition = 'width 0.1s ease';

    progressBar.appendChild(progressFill);

    progressContainer.appendChild(infoContainer);
    progressContainer.appendChild(progressBar);

    controlsContainer.appendChild(playButton);
    controlsContainer.appendChild(progressContainer);

    container.appendChild(audio);
    container.appendChild(controlsContainer);

    // Audio event handlers
    let isPlaying = false;

    playButton.addEventListener('click', () => {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch((error) => {
          console.error('Error playing audio:', error);
          this.showErrorState(container, 'Unable to play audio file');
        });
      }
    });

    audio.addEventListener('play', () => {
      isPlaying = true;
      playButton.innerHTML = pauseIcon;
    });

    audio.addEventListener('pause', () => {
      isPlaying = false;
      playButton.innerHTML = playIcon;
    });

    audio.addEventListener('loadedmetadata', () => {
      this.updateDuration(durationSpan, 0, audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressFill.style.width = `${progress}%`;
      this.updateDuration(durationSpan, audio.currentTime, audio.duration);
    });

    audio.addEventListener('error', () => {
      this.showErrorState(container, 'Error loading audio file');
    });

    // Progress bar click handler
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      audio.currentTime = percentage * audio.duration;
    });

    // Set default volume (users can use system volume)
    audio.volume = 0.8;

    // Enhanced accessibility
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', `Audio player: ${this.title || 'Audio file'}`);
    playButton.setAttribute('aria-label', 'Play/Pause');
    progressBar.setAttribute('aria-label', 'Seek audio position');

    return container;
  }

  private updateDuration(element: HTMLElement, current: number, total: number) {
    const formatTime = (seconds: number) => {
      if (isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    element.textContent = `${formatTime(current)} / ${formatTime(total)}`;
  }

  private showErrorState(container: HTMLElement, message: string) {
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; color: ${this.isDark ? '#e85d75' : '#dc2626'};">
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div>
          <div style="font-weight: 600; margin-bottom: 0.25rem;">${message}</div>
          <div style="font-size: 0.875rem; opacity: 0.8;">${this.src}</div>
        </div>
      </div>
    `;
  }

  get estimatedHeight() {
    return 80;
  }

  ignoreEvent() {
    return false;
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

          // Add regex-based detection for strikethrough, equations, media, list items, and fenced code blocks
          const doc = view.state.doc;
          const strikethroughRegex = /~~([^~\n]+)~~/g;
          const inlineMathRegex = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;  // Single $ for inline math
          const blockMathRegex = /^\s*\$\$\s*\n?([\s\S]*?)\n?\s*\$\$\s*$/gm; // Block math $$...$$
          const imageRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g; // ![alt](src "title")
          const blockAudioRegex = /\[audio:\s*([^\]]*)\]\(([^)]+)\)/gi; // [audio: title](src) - Block player
          const inlineAudioRegex = /\[inline:\s*([^\]]*)\]\(([^)]+)\)/gi; // [inline: title](src) - Inline player
          const audioLinkRegex = /\[([^\]]*)\]\(([^)]+\.(?:mp3|wav|ogg|m4a|aac|flac|wma))\)/gi; // Links to audio files
          const unorderedListRegex = /^(\s*)([-*+])\s+(.+)$/;
          const orderedListRegex = /^(\s*)(\d+)\.\s+(.+)$/;
          const taskListRegex = /^(\s*)([-*+])\s+\[([ x])\]\s+(.+)$/;
          const horizontalRuleRegex = /^\s*(?:[-*_]\s*){3,}$/;
          
          // Process fenced code blocks and block math using a simpler approach
          const processedCodeBlocks = new Set<number>();
          const processedTables = new Set<number>();
          const processedBlockMath = new Set<number>();
          
          // Track processed ranges to avoid conflicts
          const processedRanges: { from: number; to: number }[] = [];
          
          const isRangeProcessed = (from: number, to: number): boolean => {
            return processedRanges.some(range => 
              (from >= range.from && from < range.to) || 
              (to > range.from && to <= range.to) ||
              (from <= range.from && to >= range.to)
            );
          };
          
          const markRangeProcessed = (from: number, to: number) => {
            processedRanges.push({ from, to });
          };
          
          // Search for patterns in the document
          for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const lineText = line.text;
            
            // Skip if this line is part of an already processed code block, table, or block math
            if (processedCodeBlocks.has(i) || processedTables.has(i) || processedBlockMath.has(i)) {
              continue;
            }
            
            // Check for markdown tables
            if (lineText.includes('|')) {
              const tableResult = this.tryParseTable(doc, i);
              if (tableResult) {
                const { tableData, startLine, endLine } = tableResult;
                
                // Mark all table lines as processed
                for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
                  processedTables.add(lineNum);
                }
                
                // Create table widget to replace the first line
                const widget = new TableWidget(tableData, isDark, lineHeight);
                const widgetDecoration = Decoration.replace({
                  widget: widget
                });
                
                const firstLine = doc.line(startLine);
                decorations.push({ 
                  from: firstLine.from, 
                  to: firstLine.from + firstLine.text.length, 
                  decoration: widgetDecoration 
                });
                
                // Hide remaining table lines
                for (let lineNum = startLine + 1; lineNum <= endLine; lineNum++) {
                  const tableLine = doc.line(lineNum);
                  
                  // Collapse line height
                  decorations.push({ 
                    from: tableLine.from, 
                    to: tableLine.from,
                    decoration: Decoration.line({
                      attributes: {
                        style: 'height: 0; overflow: hidden; line-height: 0; font-size: 0; margin: 0; padding: 0; display: none;'
                      }
                    })
                  });
                  
                  // Replace text content
                  if (tableLine.text.length > 0) {
                    decorations.push({ 
                      from: tableLine.from, 
                      to: tableLine.from + tableLine.text.length,
                      decoration: Decoration.replace({})
                    });
                  }
                }
                
                continue;
              }
            }
            
            // Check for block math ($$...$$)
            const blockMathStartMatch = lineText.match(/^\s*\$\$\s*$/);
            if (blockMathStartMatch) {
              const mathLines: string[] = [];
              let endLine = i + 1;
              
              // Find the closing $$
              while (endLine <= doc.lines) {
                const nextLine = doc.line(endLine);
                const nextText = nextLine.text;
                
                if (nextText.match(/^\s*\$\$\s*$/)) {
                  // Found closing $$
                  break;
                }
                mathLines.push(nextText);
                endLine++;
              }
              
              // Only create block math if we found a closing $$ and have content
              if (endLine <= doc.lines) {
                const latex = mathLines.join('\n').trim();
                
                // Mark all lines as processed
                for (let lineNum = i; lineNum <= endLine; lineNum++) {
                  processedBlockMath.add(lineNum);
                }
                
                // Create widget decoration to replace the opening line
                const widget = new EquationWidget(latex, true, isDark, lineHeight);
                const widgetDecoration = Decoration.replace({
                  widget: widget
                });
                
                // Replace just the opening $$ line with the widget
                decorations.push({ 
                  from: line.from, 
                  to: line.from + lineText.length, 
                  decoration: widgetDecoration 
                });
                
                // Hide content lines and closing $$ with zero height
                for (let lineNum = i + 1; lineNum <= endLine; lineNum++) {
                  const hiddenLine = doc.line(lineNum);
                  // Use line decoration to make these lines invisible with zero height
                  decorations.push({ 
                    from: hiddenLine.from, 
                    to: hiddenLine.from,
                    decoration: Decoration.line({
                      attributes: {
                        style: 'height: 0; overflow: hidden; line-height: 0; font-size: 0; margin: 0; padding: 0; border: none;'
                      }
                    })
                  });
                  
                  // Also hide the text content
                  if (hiddenLine.text.length > 0) {
                    decorations.push({ 
                      from: hiddenLine.from, 
                      to: hiddenLine.from + hiddenLine.text.length,
                      decoration: Decoration.replace({})
                    });
                  }
                }
              }
              continue;
            }
            
            // Also handle single-line block math: $$equation$$
            const singleLineBlockMathMatch = lineText.match(/^\s*\$\$(.+?)\$\$\s*$/);
            if (singleLineBlockMathMatch) {
              const latex = singleLineBlockMathMatch[1].trim();
              
              if (latex) {
                processedBlockMath.add(i);
                
                const widget = new EquationWidget(latex, true, isDark, lineHeight);
                const decoration = Decoration.replace({
                  widget: widget
                });
                
                decorations.push({ from: line.from, to: line.to, decoration });
              }
              continue;
            }
            
            // Check for fenced code block start
            const openFenceMatch = lineText.match(/^```(\w*)/);
            if (openFenceMatch) {
              const language = openFenceMatch[1] || '';
              const codeLines: string[] = [];
              let endLine = i + 1;
              
              // Find the closing fence
              while (endLine <= doc.lines) {
                const nextLine = doc.line(endLine);
                const nextText = nextLine.text;
                
                if (nextText.match(/^```\s*$/)) {
                  // Found closing fence
                  break;
                }
                codeLines.push(nextText);
                endLine++;
              }
              
              // Only create code block if we found a closing fence and have content
              if (endLine <= doc.lines && codeLines.length > 0) {
                const codeContent = codeLines.join('\n');
                
                // Mark all lines as processed
                for (let lineNum = i; lineNum <= endLine; lineNum++) {
                  processedCodeBlocks.add(lineNum);
                }
                
                // Create widget decoration to replace the opening line only
                const widget = new CodeBlockWidget(codeContent, language, isDark, lineHeight);
                const widgetDecoration = Decoration.replace({
                  widget: widget
                });
                
                // Replace just the opening fence line with the widget
                decorations.push({ 
                  from: line.from, 
                  to: line.from + lineText.length, 
                  decoration: widgetDecoration 
                });
                
                // Hide content lines and closing fence with zero height
                for (let lineNum = i + 1; lineNum <= endLine; lineNum++) {
                  const hiddenLine = doc.line(lineNum);
                  // Use line decoration to make these lines invisible with zero height
                  decorations.push({ 
                    from: hiddenLine.from, 
                    to: hiddenLine.from,
                    decoration: Decoration.line({
                      attributes: {
                        style: 'height: 0; overflow: hidden; line-height: 0; font-size: 0; margin: 0; padding: 0; border: none;'
                      }
                    })
                  });
                  
                  // Also hide the text content
                  if (hiddenLine.text.length > 0) {
                    decorations.push({ 
                      from: hiddenLine.from, 
                      to: hiddenLine.from + hiddenLine.text.length,
                      decoration: Decoration.replace({})
                    });
                  }
                }
              }
              continue;
            }
            
            // Collapse empty lines to reduce spacing
            if (lineText.trim() === '') {
              decorations.push({ 
                from: line.from, 
                to: line.from,
                decoration: Decoration.line({
                  attributes: {
                    style: 'height: 0; overflow: hidden; line-height: 0; font-size: 0; margin: 0; padding: 0;'
                  }
                })
              });
              continue;
            }
            
            // Check for horizontal rules (---, ***, ___)
            const hrMatch = lineText.match(horizontalRuleRegex);
            if (hrMatch) {
              const widget = new HorizontalRuleWidget(isDark, lineHeight);
              const decoration = Decoration.replace({
                widget: widget
              });
              
              decorations.push({ from: line.from, to: line.to, decoration });
              continue;
            }
            
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
            
            // Check for inline math equations ($...$)
            let mathMatch;
            while ((mathMatch = inlineMathRegex.exec(lineText)) !== null) {
              const matchStart = line.from + mathMatch.index;
              const matchEnd = matchStart + mathMatch[0].length;
              const latex = mathMatch[1].trim();
              
              if (latex) {
                const widget = new EquationWidget(latex, false, isDark, lineHeight);
                const decoration = Decoration.replace({
                  widget: widget
                });
                
                decorations.push({ from: matchStart, to: matchEnd, decoration });
              }
            }
            inlineMathRegex.lastIndex = 0;
            
            // Check for images ![alt](src "title")
            let imageMatch;
            while ((imageMatch = imageRegex.exec(lineText)) !== null) {
              const matchStart = line.from + imageMatch.index;
              const matchEnd = matchStart + imageMatch[0].length;
              const alt = imageMatch[1] || '';
              const src = imageMatch[2];
              const title = imageMatch[3] || '';
              
              if (src) {
                const widget = new ImageWidget(src, alt, title, isDark, lineHeight);
                const decoration = Decoration.replace({
                  widget: widget
                });
                
                decorations.push({ from: matchStart, to: matchEnd, decoration });
              }
            }
            imageRegex.lastIndex = 0;
            
            // Check for block audio syntax [audio: title](src) - BLOCK (process FIRST)
            let blockAudioMatch;
            while ((blockAudioMatch = blockAudioRegex.exec(lineText)) !== null) {
              const matchStart = line.from + blockAudioMatch.index;
              const matchEnd = matchStart + blockAudioMatch[0].length;
              const title = blockAudioMatch[1] || '';
              const src = blockAudioMatch[2];
              
              if (src && !isRangeProcessed(matchStart, matchEnd)) {
                const widget = new BlockAudioWidget(src, title, isDark, lineHeight);
                const decoration = Decoration.replace({
                  widget: widget
                });
                
                decorations.push({ from: matchStart, to: matchEnd, decoration });
                markRangeProcessed(matchStart, matchEnd);
              }
            }
            blockAudioRegex.lastIndex = 0;
            
            // Check for inline audio syntax - INLINE
            let inlineAudioMatch;
            while ((inlineAudioMatch = inlineAudioRegex.exec(lineText)) !== null) {
              const matchStart = line.from + inlineAudioMatch.index;
              const matchEnd = matchStart + inlineAudioMatch[0].length;
              const title = inlineAudioMatch[1] || '';
              const src = inlineAudioMatch[2];
              
              if (src && !isRangeProcessed(matchStart, matchEnd)) {
                const widget = new InlineAudioWidget(src, title, isDark);
                const decoration = Decoration.replace({
                  widget: widget
                });
                
                decorations.push({ from: matchStart, to: matchEnd, decoration });
                markRangeProcessed(matchStart, matchEnd);
              }
            }
            inlineAudioRegex.lastIndex = 0;
            
            // Check for audio file links [title](file.mp3) - BLOCK
            let audioLinkMatch;
            while ((audioLinkMatch = audioLinkRegex.exec(lineText)) !== null) {
              const matchStart = line.from + audioLinkMatch.index;
              const matchEnd = matchStart + audioLinkMatch[0].length;
              const title = audioLinkMatch[1] || '';
              const src = audioLinkMatch[2];
              
              if (src && !isRangeProcessed(matchStart, matchEnd)) {
                const widget = new BlockAudioWidget(src, title, isDark, lineHeight);
                const decoration = Decoration.replace({
                  widget: widget
                });
                
                decorations.push({ from: matchStart, to: matchEnd, decoration });
                markRangeProcessed(matchStart, matchEnd);
              }
            }
            audioLinkRegex.lastIndex = 0;
            
            // Skip individual list item processing - we'll group them later
            const unorderedMatch = lineText.match(unorderedListRegex);
            if (unorderedMatch) {
              // Don't process individual list items here - we'll group them
              continue;
            }
            
            // Skip individual ordered list item processing - we'll group them later
            const orderedMatch = lineText.match(orderedListRegex);
            if (orderedMatch) {
              // Don't process individual list items here - we'll group them
              continue;
            }
          }
          
          // Now process list items by grouping consecutive ones
          this.processListGroups(doc, decorations, isDark, lineHeight, unorderedListRegex, orderedListRegex, taskListRegex);
          
          // Sort decorations by position and add them in order
          decorations.sort((a, b) => {
            if (a.from !== b.from) return a.from - b.from;
            if (a.to !== b.to) return a.to - b.to;
            // If same position and range, prioritize line decorations first
            const aIsLine = !a.decoration.spec.widget;
            const bIsLine = !b.decoration.spec.widget;
            if (aIsLine !== bIsLine) return aIsLine ? -1 : 1;
            return 0;
          });
          
          for (const { from, to, decoration } of decorations) {
            builder.add(from, to, decoration);
          }

          return builder.finish();
        }

        processListGroups(doc: any, decorations: any[], isDark: boolean, lineHeight: number, unorderedListRegex: RegExp, orderedListRegex: RegExp, taskListRegex: RegExp) {
          const listGroups: any[] = [];
          let currentGroup: any = null;
          
          // Find consecutive list items and group them
          for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const lineText = line.text;
            
            const unorderedMatch = lineText.match(unorderedListRegex);
            const orderedMatch = lineText.match(orderedListRegex);
            const taskMatch = lineText.match(taskListRegex);
            
            if (unorderedMatch || orderedMatch || taskMatch) {
              let match, isOrdered = false, isTask = false, taskChecked = false;
              let indentation, marker, text;
              
              if (taskMatch) {
                [, indentation, marker, taskChecked, text] = taskMatch;
                taskChecked = taskChecked === 'x';
                isTask = true;
                match = taskMatch;
              } else if (orderedMatch) {
                [, indentation, marker, text] = orderedMatch;
                isOrdered = true;
                match = orderedMatch;
              } else {
                [, indentation, marker, text] = unorderedMatch;
                match = unorderedMatch;
              }
              
              const level = Math.floor(indentation.length / 2);
              
              const listItem = {
                line: i,
                from: line.from,
                to: line.to,
                text: text.trim(),
                level,
                marker,
                isOrdered,
                isTask,
                taskChecked,
                lineText
              };
              
              // Start new group or add to existing group
              if (!currentGroup || (currentGroup.lastLine !== i - 1)) {
                // Start new group
                if (currentGroup) {
                  listGroups.push(currentGroup);
                }
                currentGroup = {
                  items: [listItem],
                  from: line.from,
                  to: line.to,
                  lastLine: i
                };
              } else {
                // Add to current group
                currentGroup.items.push(listItem);
                currentGroup.to = line.to;
                currentGroup.lastLine = i;
              }
            } else if (currentGroup && lineText.trim() === '') {
              // Empty line - might be part of list, extend the group
              currentGroup.to = line.to;
              currentGroup.lastLine = i;
            } else if (currentGroup) {
              // Non-list line - end current group
              listGroups.push(currentGroup);
              currentGroup = null;
            }
          }
          
          // Don't forget the last group
          if (currentGroup) {
            listGroups.push(currentGroup);
          }
          
          // Create decorations for each group
          for (const group of listGroups) {
            if (group.items.length > 0) {
              // Replace only the first line with the group widget
              const firstItem = group.items[0];
              const widget = new ListGroupWidget(group.items, isDark, lineHeight);
              const decoration = Decoration.replace({
                widget: widget
              });
              
              // Replace only the text content of the first line, not line breaks
              const firstLine = doc.line(firstItem.line);
              decorations.push({ 
                from: firstLine.from, 
                to: firstLine.from + firstLine.text.length, 
                decoration 
              });
              
              // Hide the remaining lines with collapsed height
              for (let i = 1; i < group.items.length; i++) {
                const item = group.items[i];
                const line = doc.line(item.line);
                
                // Only add line decoration to collapse the height
                decorations.push({ 
                  from: line.from, 
                  to: line.from,
                  decoration: Decoration.line({
                    attributes: {
                      style: 'height: 0; overflow: hidden; line-height: 0; font-size: 0; margin: 0; padding: 0; display: none;'
                    }
                  })
                });
                
                // Replace text content only if there is text
                if (line.text.length > 0) {
                  decorations.push({ 
                    from: line.from, 
                    to: line.from + line.text.length,
                    decoration: Decoration.replace({})
                  });
                }
              }
            }
          }
        }

        tryParseTable(doc: any, startLineNum: number): { tableData: any, startLine: number, endLine: number } | null {
          const startLine = doc.line(startLineNum);
          const headerLine = startLine.text.trim();
          
          // Must contain pipes to be a table
          if (!headerLine.includes('|')) return null;
          
          // Look for alignment line (next line)
          if (startLineNum >= doc.lines) return null;
          const alignmentLine = doc.line(startLineNum + 1);
          const alignmentText = alignmentLine.text.trim();
          
          // Alignment line should contain pipes and dashes
          if (!alignmentText.includes('|') || !alignmentText.includes('-')) return null;
          
          // Parse headers
          const headers = headerLine
            .split('|')
            .map(h => h.trim())
            .filter(h => h.length > 0);
          
          // Parse alignments
          const alignments = alignmentText
            .split('|')
            .map(a => a.trim())
            .filter(a => a.length > 0)
            .map(a => {
              if (a.startsWith(':') && a.endsWith(':')) return 'center';
              if (a.endsWith(':')) return 'right';
              return 'left';
            }) as ('left' | 'center' | 'right')[];
          
          // Headers and alignments should have same count
          if (headers.length !== alignments.length) return null;
          
          // Parse table rows
          const rows: string[][] = [];
          let endLine = startLineNum + 1; // Start after alignment line
          
          for (let i = startLineNum + 2; i <= doc.lines; i++) {
            const rowLine = doc.line(i);
            const rowText = rowLine.text.trim();
            
            // Stop if line doesn't contain pipes or is empty
            if (!rowText.includes('|')) break;
            
            const cells = rowText
              .split('|')
              .map(c => c.trim())
              .filter(c => c.length > 0);
            
            // Skip if wrong number of cells
            if (cells.length !== headers.length) break;
            
            rows.push(cells);
            endLine = i;
          }
          
          return {
            tableData: { headers, alignments, rows },
            startLine: startLineNum,
            endLine: endLine
          };
        }
      },
      {
        decorations: v => v.decorations
      }
    )
  ];
}