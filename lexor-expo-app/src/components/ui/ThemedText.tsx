import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ThemedTextProps extends TextProps {
  variant?: 'default' | 'secondary' | 'primary';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

export const ThemedText: React.FC<ThemedTextProps> = ({ 
  style, 
  variant = 'default',
  size = 'md',
  weight = 'normal',
  ...props 
}) => {
  const { theme } = useTheme();

  const getTextColor = () => {
    switch (variant) {
      case 'secondary':
        return theme.colors.textSecondary;
      case 'primary':
        return theme.colors.primary;
      default:
        return theme.colors.text;
    }
  };

  const themedStyle = StyleSheet.create({
    text: {
      color: getTextColor(),
      fontSize: theme.typography.fontSize[size],
      fontWeight: theme.typography.fontWeight[weight],
    },
  });

  return (
    <Text style={[themedStyle.text, style]} {...props} />
  );
};