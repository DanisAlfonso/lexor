import { StyleSheet } from 'react-native';
import { ThemedView, ThemedText } from '@/components/ui';

export default function ProgressScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText size="xl" weight="bold" style={styles.title}>
        Progress
      </ThemedText>
      <ThemedText variant="secondary" style={styles.subtitle}>
        Track your learning journey
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