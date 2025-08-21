# Lexor Desktop

A premium markdown editor and flashcard application built with Electron, React, and TypeScript.

## Features

### Markdown Editor
- **iA Writer-inspired interface**: Clean, distraction-free writing experience
- **Focus Mode**: Highlight current sentence/paragraph while dimming the rest
- **Live Preview**: Side-by-side markdown preview
- **Premium Typography**: Carefully selected fonts and spacing
- **Syntax Highlighting**: Enhanced markdown syntax highlighting
- **Export Options**: HTML, PDF, and more

### Flashcard System
- **Spaced Repetition**: Smart review scheduling using proven algorithms
- **Multiple Card Types**: Basic, cloze deletion, and more
- **Study Analytics**: Track your learning progress
- **Deck Management**: Organize cards into decks and categories
- **Import/Export**: Compatible with popular flashcard formats

### Premium Design
- **Native Feel**: Platform-appropriate UI for macOS, Windows, and Linux
- **Dark/Light Themes**: Automatic theme switching based on system preference
- **Smooth Animations**: 60fps transitions and micro-interactions
- **Customizable**: Adjust fonts, colors, and layout to your preference

## Development

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

### Project Structure
```
lexor-desktop/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React UI
│   ├── preload/        # Secure IPC bridge
│   └── shared/         # Shared types and utilities
├── assets/             # Icons and resources
└── dist/              # Built application
```

### Scripts
- `npm run dev` - Start development with hot reload
- `npm run build` - Build for production
- `npm run package` - Create distributable packages
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Architecture

### Security
- **Context Isolation**: Secure communication between processes
- **Sandboxing**: Renderer process runs in sandbox mode
- **CSP Headers**: Content Security Policy protection
- **No Node Integration**: Renderer cannot access Node.js directly

### Performance
- **Code Splitting**: Lazy loading of features
- **Tree Shaking**: Remove unused code
- **Efficient Rendering**: Optimized React components
- **Memory Management**: Proper cleanup and garbage collection

### Cross-Platform
- **Native Installers**: Platform-specific installation packages
- **Auto-Updates**: Seamless application updates
- **System Integration**: Native menus, file associations, etc.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, please visit [lexor.app/support](https://lexor.app/support) or create an issue on GitHub.