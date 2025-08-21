import { useThemeStore } from '@/stores/themeStore';

export const useTheme = () => {
  const { theme, colorScheme, setColorScheme, toggleTheme } = useThemeStore();

  return {
    theme,
    colorScheme,
    setColorScheme,
    toggleTheme,
    isDark: theme === useThemeStore.getState().theme && 
            (colorScheme === 'dark' || 
             (colorScheme === 'system' && theme.colors.background === '#0f172a')),
  };
};