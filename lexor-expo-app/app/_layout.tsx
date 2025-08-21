import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@/components/ui';
import { useEffect } from 'react';
import { initDatabase } from '@/services/database';
import '@/styles/global.css';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  return (
    <ThemeProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="reader/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="settings/index" 
          options={{ 
            title: 'Settings',
            presentation: 'modal' 
          }} 
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}