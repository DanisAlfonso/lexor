import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { formatFontFamily } from '../utils/editorUtils';

export function useEditorTheme() {
  const { zoomLevel, fontSize, fontFamily, theme } = useAppStore();
  
  // State for system theme detection
  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  // Calculate computed values
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  const formattedFontFamily = formatFontFamily(fontFamily);
  const finalFontSize = `${Math.round((fontSize * zoomLevel) / 100)}px`;

  return {
    isDarkMode,
    formattedFontFamily,
    finalFontSize
  };
}