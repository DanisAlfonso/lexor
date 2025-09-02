import { Extension, RangeSetBuilder } from '@codemirror/state';
import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';

// CSS class for hanging indent with better precision
const hangingIndentDecoration = (indentChars: number) => Decoration.line({
  class: 'hanging-indent',
  attributes: {
    style: `--hanging-indent-chars: ${indentChars};`
  }
});

// Plugin to handle hanging indent for markdown lists
const hangingIndentPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.buildDecorations(update.view);
      }
    }

    private buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      const doc = view.state.doc;

      for (let pos = 0; pos < doc.length;) {
        const line = doc.lineAt(pos);
        const lineText = line.text;

        // Check if this is a markdown list item
        const indentChars = this.getHangingIndentChars(lineText);
        if (indentChars > 0) {
          builder.add(line.from, line.from, hangingIndentDecoration(indentChars));
        }

        pos = line.to + 1;
      }

      this.decorations = builder.finish();
    }

    private getHangingIndentChars(lineText: string): number {
      // Match unordered list items: *, -, +
      const unorderedMatch = lineText.match(/^(\s*)([*\-+])\s+/);
      if (unorderedMatch) {
        const leadingSpace = unorderedMatch[1];
        const marker = unorderedMatch[2];
        // Return character count for indentation
        return leadingSpace.length + marker.length + 1;
      }

      // Match ordered list items: 1., 2., etc.
      const orderedMatch = lineText.match(/^(\s*)(\d+\.)\s+/);
      if (orderedMatch) {
        const leadingSpace = orderedMatch[1];
        const marker = orderedMatch[2];
        // Return character count for indentation
        return leadingSpace.length + marker.length + 1;
      }

      // Match task list items: - [ ], - [x]
      const taskMatch = lineText.match(/^(\s*)([*\-+])\s+\[[ xX]\]\s+/);
      if (taskMatch) {
        const leadingSpace = taskMatch[1];
        const marker = taskMatch[2];
        // Return character count for indentation (marker + space + [x] + space)
        return leadingSpace.length + marker.length + 5;
      }

      return 0;
    }
  },
  {
    decorations: (plugin) => plugin.decorations
  }
);

// Export the hanging indent extension
export function createHangingIndentExtension(): Extension {
  return hangingIndentPlugin;
}