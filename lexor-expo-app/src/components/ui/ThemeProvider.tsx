import React, { createContext, useContext, ReactNode } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import { Theme } from '@/types/theme';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setColorScheme: (scheme: 'light' | 'dark' | 'system') => void;
  colorScheme: 'light' | 'dark' | 'system';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { theme, toggleTheme, setColorScheme, colorScheme } = useThemeStore();

  const contextValue: ThemeContextType = {
    theme,
    toggleTheme,
    setColorScheme,
    colorScheme,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};