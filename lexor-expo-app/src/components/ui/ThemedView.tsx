import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ThemedViewProps extends ViewProps {
  variant?: 'default' | 'surface' | 'card';
}

export const ThemedView: React.FC<ThemedViewProps> = ({ 
  style, 
  variant = 'default',
  ...props 
}) => {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'surface':
        return theme.colors.surface;
      case 'card':
        return theme.colors.card;
      default:
        return theme.colors.background;
    }
  };

  const themedStyle = StyleSheet.create({
    container: {
      backgroundColor: getBackgroundColor(),
    },
  });

  return (
    <View style={[themedStyle.container, style]} {...props} />
  );
};