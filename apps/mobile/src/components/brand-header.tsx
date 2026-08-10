import { Music2 } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Mirrors the brand mark in apps/web/app/page.tsx's sticky header
 * (violet rounded square + Music2 icon + "JAMSPOT" wordmark).
 */
export function BrandHeader() {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.mark, { backgroundColor: theme.primary }]}>
        <Music2 size={14} color={theme.primaryForeground} />
      </View>
      <ThemedText style={styles.wordmark}>JAMSPOT</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
