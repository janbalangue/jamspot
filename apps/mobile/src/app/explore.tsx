import { MapPin, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { openBrowserAsync } from 'expo-web-browser';

import { BrandHeader } from '@/components/brand-header';
import { ConcertCard } from '@/components/concert-card';
import { ConcertDetailsModal } from '@/components/concert-details-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api';
import {
  buildConcertSearchParams,
  filterCardEvents,
  searchConcerts,
  toCardEvent,
  type CardEvent,
} from '@/lib/concerts';

function describeError(err: unknown) {
  return err instanceof ApiError ? err.message : 'Failed to load concerts.';
}

export default function ExploreScreen() {
  const [keywordInput, setKeywordInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [activeGenre, setActiveGenre] = useState('All');

  const [events, setEvents] = useState<CardEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CardEvent | null>(null);

  const theme = useTheme();

  // Fetches whenever a search is submitted. Only ever sets state inside
  // .then()/.catch() (never synchronously in the effect body) to satisfy
  // this project's react-hooks/set-state-in-effect rule — same shape as
  // the Home tab's reviews fetch in app/index.tsx.
  useEffect(() => {
    if (!hasSearched) return;
    if (!keyword && !location) return;

    let cancelled = false;
    searchConcerts(buildConcertSearchParams(keyword, location))
      .then((concerts) => {
        if (!cancelled) {
          setEvents(concerts.map(toCardEvent));
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(describeError(err));
          setEvents([]);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hasSearched, keyword, location]);

  const handleSearch = useCallback(() => {
    setKeyword(keywordInput.trim());
    setLocation(locationInput.trim());
    setHasSearched(true);
    setActiveGenre('All');
    setIsLoading(true);
    setFetchError(null);
  }, [keywordInput, locationInput]);

  const onRefresh = useCallback(async () => {
    if (!keyword && !location) return;
    setRefreshing(true);
    try {
      const concerts = await searchConcerts(buildConcertSearchParams(keyword, location));
      setEvents(concerts.map(toCardEvent));
      setFetchError(null);
    } catch (err) {
      setFetchError(describeError(err));
    }
    setRefreshing(false);
  }, [keyword, location]);

  const handleTicketPress = useCallback((event: CardEvent) => {
    if (!event.ticketUrl) return;
    openBrowserAsync(event.ticketUrl);
  }, []);

  const genres = useMemo(
    () => ['All', ...new Set(events.map((e) => e.genre).filter(Boolean))],
    [events],
  );

  const filtered = useMemo(
    () => filterCardEvents(events, keyword, location, activeGenre),
    [events, keyword, location, activeGenre],
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={hasSearched && !isLoading ? filtered : []}
          keyExtractor={(event) => event.id}
          renderItem={({ item }) => (
            <ConcertCard event={item} onPress={setSelectedEvent} onTicketPress={handleTicketPress} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <BrandHeader />

              <ThemedText type="title" style={styles.title}>
                Explore
              </ThemedText>

              <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Search size={16} color={theme.textSecondary} />
                <TextInput
                  value={keywordInput}
                  onChangeText={setKeywordInput}
                  onSubmitEditing={handleSearch}
                  placeholder="Artist, venue, event, or genre..."
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="search"
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
              <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <MapPin size={16} color={theme.textSecondary} />
                <TextInput
                  value={locationInput}
                  onChangeText={setLocationInput}
                  onSubmitEditing={handleSearch}
                  placeholder="City or state"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="search"
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
              <Pressable
                onPress={handleSearch}
                style={[styles.searchButton, { backgroundColor: theme.primary }]}>
                <ThemedText style={[styles.searchButtonText, { color: theme.primaryForeground }]}>
                  Search
                </ThemedText>
              </Pressable>

              {hasSearched && !isLoading && !fetchError && events.length > 0 && (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreRow}>
                    {genres.map((genre) => {
                      const active = activeGenre === genre;
                      return (
                        <Pressable
                          key={genre}
                          onPress={() => setActiveGenre(genre)}
                          style={[
                            styles.genreChip,
                            {
                              backgroundColor: active ? theme.primary : theme.backgroundElement,
                              borderColor: theme.border,
                            },
                          ]}>
                          <ThemedText
                            type="small"
                            style={active ? { color: theme.primaryForeground } : undefined}
                            themeColor={active ? undefined : 'textSecondary'}>
                            {genre}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <ThemedText type="small" themeColor="textSecondary">
                    {filtered.length} event{filtered.length !== 1 ? 's' : ''}
                  </ThemedText>
                </>
              )}

              {isLoading && <ActivityIndicator style={styles.loading} />}

              {fetchError && (
                <ThemedView type="backgroundElement" style={styles.errorBox}>
                  <ThemedText type="small">{fetchError}</ThemedText>
                </ThemedView>
              )}
            </View>
          }
          ListEmptyComponent={
            !isLoading && !fetchError ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                {hasSearched ? 'No shows found. Try a different search.' : 'Search for a concert to get started.'}
              </ThemedText>
            ) : null
          }
        />

        {selectedEvent && (
          <ConcertDetailsModal
            key={selectedEvent.id}
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  header: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    marginBottom: Spacing.two,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  searchButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  searchButtonText: {
    fontWeight: '600',
  },
  genreRow: {
    marginTop: Spacing.two,
  },
  genreChip: {
    borderRadius: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    marginRight: Spacing.two,
  },
  loading: {
    marginTop: Spacing.four,
  },
  errorBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.six,
  },
});
