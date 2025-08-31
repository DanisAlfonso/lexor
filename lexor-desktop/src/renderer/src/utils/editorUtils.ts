// Helper function to format font family with proper quotes and fallbacks
export const formatFontFamily = (fontFamily: string) => {
  const fontMap: { [key: string]: string } = {
    'SF Mono': '"SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
    'Monaco': '"Monaco", "SF Mono", "Consolas", "Liberation Mono", "Courier New", monospace',
    'Consolas': '"Consolas", "SF Mono", "Monaco", "Liberation Mono", "Courier New", monospace',
    'JetBrains Mono': '"JetBrains Mono", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
    'Fira Code': '"Fira Code", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
    'Monaspace Neon': '"Monaspace Neon", "JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
    'Monaspace Argon': '"Monaspace Argon", "JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
    'Monaspace Xenon': '"Monaspace Xenon", "JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
    'Monaspace Radon': '"Monaspace Radon", "JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace',
    'Monaspace Krypton': '"Monaspace Krypton", "JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace'
  };
  
  return fontMap[fontFamily] || `"${fontFamily}", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", monospace`;
};