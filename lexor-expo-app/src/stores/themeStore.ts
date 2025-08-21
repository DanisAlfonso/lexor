import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorScheme, Theme } from '@/types/theme';
import { lightTheme, darkTheme } from '@/constants/themes';

interface ThemeState {
  colorScheme: ColorScheme;
  theme: Theme;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
};

const getThemeByScheme = (scheme: ColorScheme): Theme => {
  if (scheme === 'system') {
    return getSystemTheme() === 'dark' ? darkTheme : lightTheme;
  }
  return scheme === 'dark' ? darkTheme : lightTheme;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorScheme: 'system',
      theme: getThemeByScheme('system'),
      
      setColorScheme: (scheme: ColorScheme) => {
        set({
          colorScheme: scheme,
          theme: getThemeByScheme(scheme),
        });
      },
      
      toggleTheme: () => {
        const { colorScheme } = get();
        const newScheme = colorScheme === 'light' ? 'dark' : 'light';
        set({
          colorScheme: newScheme,
          theme: getThemeByScheme(newScheme),
        });
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state && state.colorScheme === 'system') {
          state.theme = getThemeByScheme('system');
        }
      },
    }
  )
);

// Listen for system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const { colorScheme: currentScheme, setColorScheme } = useThemeStore.getState();
  if (currentScheme === 'system') {
    setColorScheme('system'); // This will trigger theme update
  }
});