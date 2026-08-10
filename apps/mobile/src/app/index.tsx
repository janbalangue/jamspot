import { Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/brand-header';
import { ReviewCard } from '@/components/review-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError, getReviews, type Review } from '@/lib/api';

function describeError(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong loading reviews.';
}

function filterReviews(reviews: Review[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return reviews;
  return reviews.filter((review) =>
    [review.short_description, review.description, review.location]
      .join(' ')
      .toLowerCase()
      .includes(normalized),
  );
}

export default function HomeScreen() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const theme = useTheme();

  useEffect(() => {
    let cancelled = false;
    getReviews()
      .then((data) => {
        if (!cancelled) {
          setReviews(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setReviews(await getReviews());
      setError(null);
    } catch (err) {
      setError(describeError(err));
    }
    setRefreshing(false);
  }, []);

  const filtered = useMemo(() => (reviews ? filterReviews(reviews, query) : []), [reviews, query]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <BrandHeader />

        <ThemedText type="title" style={styles.title}>
          Reviews
        </ThemedText>

        {reviews && (
          <View style={[styles.inputRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Search size={16} color={theme.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by artist, venue, or location..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.text }]}
            />
          </View>
        )}

        {error && (
          <ThemedView type="backgroundElement" style={styles.errorBox}>
            <ThemedText type="small">{error}</ThemedText>
          </ThemedView>
        )}

        {!reviews && !error && <ActivityIndicator style={styles.loading} />}

        {reviews && (
          <FlatList
            data={filtered}
            keyExtractor={(review) => review.id}
            renderItem={({ item }) => <ReviewCard review={item} />}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary">
                {query ? 'No reviews match your search.' : 'No reviews yet.'}
              </ThemedText>
            }
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
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
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
  title: {
    fontSize: 32,
    lineHeight: 38,
  },
  loading: {
    marginTop: Spacing.six,
  },
  errorBox: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
});
