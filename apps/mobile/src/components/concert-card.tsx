import { Image } from 'expo-image';
import { MapPin, Ticket } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CardEvent } from '@/lib/concerts';

export function ConcertCard({
  event,
  onPress,
  onTicketPress,
}: {
  event: CardEvent;
  onPress: (event: CardEvent) => void;
  onTicketPress: (event: CardEvent) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable onPress={() => onPress(event)}>
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: event.image }} style={styles.image} contentFit="cover" />
            <View style={styles.genreBadge}>
              <ThemedText type="small" style={styles.genreBadgeText}>
                {event.genre}
              </ThemedText>
            </View>
            <View style={styles.dateOverlay}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {event.date}
              </ThemedText>
              <ThemedText type="small" style={styles.timeOverlayText}>
                {event.time}
              </ThemedText>
            </View>
          </View>

          <View style={styles.body}>
            <ThemedText type="smallBold">{event.artist}</ThemedText>
            <View style={styles.venueRow}>
              <MapPin size={12} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                {event.venue} · {event.city}, {event.state}
              </ThemedText>
            </View>

            <View style={styles.footer}>
              <ThemedText type="small">{event.priceRange ?? ''}</ThemedText>
              <Pressable
                onPress={() => onTicketPress(event)}
                disabled={!event.ticketUrl}
                style={({ pressed: ticketPressed }) => [
                  styles.ticketButton,
                  { borderColor: theme.border },
                  !event.ticketUrl && styles.ticketButtonDisabled,
                  ticketPressed && styles.pressed,
                ]}>
                <Ticket size={12} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary }}>
                  {event.ticketUrl ? 'Get Tickets' : 'Unavailable'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
  imageWrapper: {
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  genreBadge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  genreBadgeText: {
    color: '#ffffff',
  },
  dateOverlay: {
    position: 'absolute',
    bottom: Spacing.two,
    left: Spacing.two,
  },
  timeOverlayText: {
    color: '#ffffff',
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.half,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  footer: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  ticketButtonDisabled: {
    opacity: 0.4,
  },
});
