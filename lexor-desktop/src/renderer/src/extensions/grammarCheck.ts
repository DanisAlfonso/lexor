import { Extension, StateField, StateEffect, Range } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet, ViewUpdate, ViewPlugin, showTooltip, Tooltip, hoverTooltip } from '@codemirror/view';
import { GrammarService, GrammarMatch } from '../services/grammarService';

// Define the grammar error decoration
const grammarErrorDecoration = Decoration.mark({
  class: 'cm-grammar-error',
  attributes: {
    style: 'text-decoration: underline; text-decoration-color: #d73a49; text-decoration-style: wavy;'
  }
});

// State effects for managing grammar errors
export const setGrammarErrors = StateEffect.define<Range<Decoration>[]>();
export const setGrammarMatches = StateEffect.define<GrammarMatch[]>();
export const clearGrammarErrors = StateEffect.define<void>();

// State field to store grammar errors
const grammarErrorsField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(errors, transaction) {
    errors = errors.map(transaction.changes);
    
    for (const effect of transaction.effects) {
      if (effect.is(setGrammarErrors)) {
        errors = Decoration.set(effect.value);
      } else if (effect.is(clearGrammarErrors)) {
        errors = Decoration.none;
      }
    }
    
    return errors;
  },
  provide: f => EditorView.decorations.from(f)
});

// State field to store grammar matches (for tooltips)
const grammarMatchesField = StateField.define<GrammarMatch[]>({
  create() {
    return [];
  },
  update(matches, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setGrammarMatches)) {
        return effect.value;
      } else if (effect.is(clearGrammarErrors)) {
        return [];
      }
    }
    return matches;
  }
});

// Grammar checking plugin
const grammarCheckPlugin = ViewPlugin.fromClass(
  class {
    private timeout: NodeJS.Timeout | null = null;
    private lastText = '';
    private isChecking = false;
    private grammarService: GrammarService;

    constructor(private view: EditorView) {
      this.grammarService = GrammarService.getInstance();
    }

    update(update: ViewUpdate) {
      if (!update.docChanged && !update.viewportChanged) return;
      
      const text = this.view.state.doc.toString();
      if (text === this.lastText || this.isChecking) return;
      
      // Clear existing timeout
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      
      // Debounce grammar checking to avoid excessive API calls
      this.timeout = setTimeout(() => {
        this.checkGrammar(text);
      }, 2000); // Wait 2 seconds after typing stops
    }

    async checkGrammar(text: string) {
      if (text.trim().length < 10) {
        // Don't check very short texts
        this.view.dispatch({
          effects: [clearGrammarErrors.of()]
        });
        return;
      }

      this.isChecking = true;
      this.lastText = text;

      try {
        const status = await this.grammarService.getStatus();
        if (!status.initialized || !status.serverRunning) {
          console.log('Grammar service not ready');
          this.isChecking = false;
          return;
        }

        // Get the current language from store
        const language = (window as any).useAppStore?.getState?.()?.grammarCheckLanguage || 'auto';
        
        const result = await this.grammarService.checkText(text, language);
        const decorations: Range<Decoration>[] = [];
        const validMatches: GrammarMatch[] = [];

        for (const match of result.matches) {
          // Skip very short matches or matches that might be false positives
          if (match.length < 1) continue;
          
          const from = match.offset;
          const to = match.offset + match.length;
          
          // Validate range
          if (from >= 0 && to <= text.length && from < to) {
            decorations.push(grammarErrorDecoration.range(from, to));
            validMatches.push(match);
          }
        }

        this.view.dispatch({
          effects: [
            setGrammarErrors.of(decorations),
            setGrammarMatches.of(validMatches)
          ]
        });

      } catch (error) {
        console.error('Grammar check failed:', error);
      } finally {
        this.isChecking = false;
      }
    }

    destroy() {
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
    }
  }
);

// Create tooltip content for grammar errors
const createGrammarTooltip = (match: GrammarMatch, view?: EditorView): HTMLElement => {
  const tooltip = document.createElement('div');
  tooltip.className = 'grammar-tooltip';
  tooltip.style.cssText = `
    background: #2d3748;
    color: white;
    padding: 12px;
    border-radius: 8px;
    font-size: 13px;
    line-height: 1.4;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    border: 1px solid #4a5568;
    overflow: hidden;
  `;

  // Error message
  const message = document.createElement('div');
  message.style.cssText = 'font-weight: 600; color: #fed7d7; margin-bottom: 8px;';
  message.textContent = match.shortMessage || match.message;
  tooltip.appendChild(message);

  // Context
  if (match.context?.text) {
    const context = document.createElement('div');
    context.style.cssText = 'margin-bottom: 8px; font-family: monospace; background: #1a202c; padding: 6px; border-radius: 4px;';
    
    const beforeText = match.context.text.substring(0, match.context.offset);
    const errorText = match.context.text.substring(match.context.offset, match.context.offset + match.context.length);
    const afterText = match.context.text.substring(match.context.offset + match.context.length);
    
    context.innerHTML = `${beforeText}<span style="background: #e53e3e; color: white; padding: 2px;">${errorText}</span>${afterText}`;
    tooltip.appendChild(context);
  }

  // Suggestions
  if (match.replacements && match.replacements.length > 0) {
    const suggestionsTitle = document.createElement('div');
    suggestionsTitle.style.cssText = 'font-weight: 600; color: #c6f6d5; margin-bottom: 4px;';
    suggestionsTitle.textContent = 'Suggestions:';
    tooltip.appendChild(suggestionsTitle);

    const suggestions = document.createElement('div');
    suggestions.style.cssText = 'max-height: 120px; overflow-y: auto;';
    
    match.replacements.slice(0, 3).forEach((replacement, index) => {
      const suggestion = document.createElement('div');
      suggestion.style.cssText = `
        background: #38a169;
        color: white;
        padding: 4px 8px;
        margin: 2px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s;
        word-break: break-word;
        overflow: hidden;
      `;
      suggestion.textContent = replacement.value;
      
      suggestion.addEventListener('mouseenter', () => {
        suggestion.style.background = '#48bb78';
      });
      
      suggestion.addEventListener('mouseleave', () => {
        suggestion.style.background = '#38a169';
      });
      
      // Add click handler to replace the text
      suggestion.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!view) return;
        
        // Apply the replacement to the editor
        const from = match.offset;
        const to = match.offset + match.length;
        
        view.dispatch({
          changes: { from, to, insert: replacement.value },
          selection: { anchor: from + replacement.value.length }
        });
        
        // Close the tooltip by clearing grammar errors and re-checking
        view.dispatch({
          effects: [clearGrammarErrors.of()]
        });
      });
      
      suggestions.appendChild(suggestion);
    });
    tooltip.appendChild(suggestions);
  }

  // Rule info
  if (match.rule) {
    const rule = document.createElement('div');
    rule.style.cssText = 'margin-top: 8px; font-size: 11px; color: #a0aec0; border-top: 1px solid #4a5568; padding-top: 6px;';
    rule.textContent = `Rule: ${match.rule.category.name} (${match.rule.id})`;
    tooltip.appendChild(rule);
  }

  return tooltip;
};

// Grammar hover tooltip extension
const grammarHoverTooltip = hoverTooltip((view, pos, side) => {
  const matches = view.state.field(grammarMatchesField);
  const decorations = view.state.field(grammarErrorsField);
  
  // Check if cursor is on a grammar error
  let hasError = false;
  decorations.between(pos, pos, () => { hasError = true; });
  
  if (!hasError) return null;
  
  // Find the matching grammar error
  const matchingError = matches.find(match => {
    const from = match.offset;
    const to = match.offset + match.length;
    return pos >= from && pos <= to;
  });
  
  if (!matchingError) return null;

  return {
    pos,
    above: true,
    create: (view: EditorView) => {
      return { dom: createGrammarTooltip(matchingError, view) };
    }
  };
});

// Create the complete grammar checking extension
export function createGrammarCheckExtension(enabled: boolean = false): Extension {
  if (!enabled) {
    return [];
  }

  return [
    grammarErrorsField,
    grammarMatchesField,
    grammarCheckPlugin,
    grammarHoverTooltip,
    // CSS styles for grammar errors
    EditorView.baseTheme({
      '.cm-grammar-error': {
        textDecoration: 'underline',
        textDecorationColor: '#d73a49',
        textDecorationStyle: 'wavy',
        cursor: 'help'
      },
      '.grammar-tooltip': {
        zIndex: '10000 !important'
      }
    })
  ];
}

// Export utility functions
export function getGrammarErrorsAtPosition(view: EditorView, pos: number): GrammarMatch[] {
  // This would need to be implemented to store and retrieve actual match data
  // For now, return empty array
  return [];
}

export function clearAllGrammarErrors(view: EditorView): void {
  view.dispatch({
    effects: [clearGrammarErrors.of()]
  });
}