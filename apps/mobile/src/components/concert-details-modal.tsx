import { Image } from 'expo-image';
import { Calendar, Clock, MapPin, Ticket, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { StreamingLinks } from '@/components/streaming-links';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getAppleMusicArtist,
  getArtistBio,
  getSpotifyArtist,
  type CardEvent,
} from '@/lib/concerts';
import type {
  NormalizedAppleMusicArtist,
  NormalizedArtistBio,
  NormalizedSpotifyArtist,
} from '@jamspot/shared';

type FetchState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

const initialFetchState = <T,>(): FetchState<T> => ({ data: null, isLoading: true, error: null });

export function ConcertDetailsModal({ event, onClose }: { event: CardEvent; onClose: () => void }) {
  const theme = useTheme();
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [bio, setBio] = useState<FetchState<NormalizedArtistBio>>(initialFetchState);
  const [spotify, setSpotify] = useState<FetchState<NormalizedSpotifyArtist>>(initialFetchState);
  const [appleMusic, setAppleMusic] =
    useState<FetchState<NormalizedAppleMusicArtist>>(initialFetchState);

  const artistName = event.artist;

  // Three independent requests, each with its own state, so one provider
  // being slow or down never blocks the others from rendering — same
  // approach as apps/web/app/page.tsx's EventDetailsModal.
  useEffect(() => {
    let cancelled = false;

    getArtistBio(artistName)
      .then((data) => {
        if (!cancelled) setBio({ data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setBio({ data: null, isLoading: false, error: describeError(err, 'Failed to load artist bio') });
        }
      });

    getSpotifyArtist(artistName)
      .then((data) => {
        if (!cancelled) setSpotify({ data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setSpotify({
            data: null,
            isLoading: false,
            error: describeError(err, 'Failed to load Spotify artist'),
          });
        }
      });

    getAppleMusicArtist(artistName)
      .then((data) => {
        if (!cancelled) setAppleMusic({ data, isLoading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setAppleMusic({
            data: null,
            isLoading: false,
            error: describeError(err, 'Failed to load Apple Music artist'),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artistName]);

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      onRequestClose={onClose}>
      <ScrollView style={{ backgroundColor: theme.card }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.imageWrapper}>
          <Image source={{ uri: event.image }} style={styles.image} contentFit="cover" />
          <Pressable onPress={onClose} style={styles.closeButton} accessibilityLabel="Close concert details">
            <X size={18} color="#ffffff" />
          </Pressable>
          <View style={styles.imageOverlay}>
            <ThemedText type="small" style={styles.genreOverlayText}>
              {event.genre}
            </ThemedText>
            <ThemedText type="title" style={styles.titleOverlayText}>
              {event.artist}
            </ThemedText>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.metaRow}>
            <Calendar size={16} color={theme.primary} />
            <ThemedText>{event.date}</ThemedText>
          </View>
          <View style={styles.metaRow}>
            <Clock size={16} color={theme.primary} />
            <ThemedText>{event.time}</ThemedText>
          </View>
          <View style={styles.metaRow}>
            <MapPin size={16} color={theme.primary} />
            <ThemedText themeColor="textSecondary">
              {event.venue}
              {'\n'}
              {event.city}, {event.state}
            </ThemedText>
          </View>

          {event.priceRange && (
            <Section title="Price">
              <ThemedText>{event.priceRange}</ThemedText>
            </Section>
          )}

          <Section title={`About ${event.artist}`}>
            {bio.isLoading ? (
              <ThemedText type="small" themeColor="textSecondary">
                Loading bio…
              </ThemedText>
            ) : bio.data?.summary ? (
              <View>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={isBioExpanded ? undefined : 5}>
                  {bio.data.summary}
                </ThemedText>
                <Pressable onPress={() => setIsBioExpanded((prev) => !prev)}>
                  <ThemedText type="link" style={styles.readMore}>
                    {isBioExpanded ? 'Show less' : 'Read more'}
                  </ThemedText>
                </Pressable>
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {bio.error ? 'Bio unavailable right now.' : 'No biography found for this artist.'}
              </ThemedText>
            )}
          </Section>

          <Section title="Listen">
            <StreamingLinks
              spotify={{ url: spotify.data?.url ?? null, isLoading: spotify.isLoading }}
              appleMusic={{ url: appleMusic.data?.url ?? null, isLoading: appleMusic.isLoading }}
            />
          </Section>

          {event.ticketUrl && (
            <ExternalLink href={event.ticketUrl as `${string}:${string}`} asChild>
              <Pressable>
                <View style={[styles.ticketButton, { backgroundColor: theme.primary }]}>
                  <Ticket size={16} color={theme.primaryForeground} />
                  <ThemedText style={[styles.ticketButtonText, { color: theme.primaryForeground }]}>
                    Get Tickets
                  </ThemedText>
                </View>
              </Pressable>
            </ExternalLink>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

function describeError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

const styles = StyleSheet.create({
  imageWrapper: {
    height: 240,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: Spacing.three,
    left: Spacing.three,
    right: Spacing.three,
  },
  genreOverlayText: {
    color: '#ffffff',
    opacity: 0.8,
  },
  titleOverlayText: {
    color: '#ffffff',
    fontSize: 28,
    lineHeight: 32,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  section: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  readMore: {
    marginTop: Spacing.one,
  },
  ticketButton: {
    marginTop: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketButtonText: {
    fontWeight: '600',
  },
});
