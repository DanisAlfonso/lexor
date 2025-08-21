import { StyleSheet } from 'react-native';
import { ThemedView, ThemedText } from '@/components/ui';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText size="xxl" weight="bold" style={styles.title}>
        Welcome to Lexor
      </ThemedText>
      <ThemedText variant="secondary" style={styles.subtitle}>
        Your Language Learning Companion
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
});