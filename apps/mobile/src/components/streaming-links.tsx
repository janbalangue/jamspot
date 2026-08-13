import { Pressable, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProviderLinkState = {
  url: string | null;
  isLoading: boolean;
};

/**
 * Text-button equivalents of web's branded Apple Music / Spotify badges
 * (apps/web/components/StreamingServiceLinks.tsx). Lucide has no brand
 * logos, so replicating those badges pixel-for-pixel isn't possible with
 * the icon set already added for the rest of this screen.
 */
export function StreamingLinks({
  spotify,
  appleMusic,
}: {
  spotify: ProviderLinkState;
  appleMusic: ProviderLinkState;
}) {
  return (
    <View style={styles.row}>
      <ProviderPill label="Apple Music" {...appleMusic} />
      <ProviderPill label="Spotify" {...spotify} />
    </View>
  );
}

function ProviderPill({ label, url, isLoading }: ProviderLinkState & { label: string }) {
  const theme = useTheme();
  const pillStyle = [styles.pill, { backgroundColor: theme.backgroundElement, borderColor: theme.border }];

  if (isLoading) {
    return (
      <View style={[...pillStyle, styles.skeleton]}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
    );
  }

  if (!url) {
    return (
      <View style={[...pillStyle, styles.disabled]}>
        <ThemedText type="small" themeColor="textSecondary">
          {label} unavailable
        </ThemedText>
      </View>
    );
  }

  return (
    // Cast: ExternalLink's href type requires a literal-looking external
    // URL shape (`${string}:${string}`), which a runtime string variable
    // can't satisfy structurally even though it's always a real https:// URL.
    <ExternalLink href={url as `${string}:${string}`} asChild>
      <Pressable>
        {({ pressed }) => (
          <View style={[...pillStyle, pressed && styles.pressed]}>
            <ThemedText type="small" style={{ color: theme.primary }}>
              Listen on {label}
            </ThemedText>
          </View>
        )}
      </Pressable>
    </ExternalLink>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  pill: {
    borderRadius: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  skeleton: {
    opacity: 0.5,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
