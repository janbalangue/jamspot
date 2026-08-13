import { Clock, MapPin, Star, User } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ReviewColors, Spacing } from '@/constants/theme';
import type { Review } from '@/lib/api';

function formatDate(isoDate: string) {
  // isoDate is a date-only string ("2026-08-07"); parsing it directly with
  // `new Date()` treats it as UTC midnight, which renders as the previous
  // day in timezones behind UTC. Building from local components avoids that.
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Matches apps/web/components/ReviewCard.tsx's design: unlike the rest of
 * the (dark) app, review cards render as a light "paper" card floating on
 * the dark page.
 */
export function ReviewCard({ review }: { review: Review }) {
  const author = review.profiles?.display_name ?? review.profiles?.username;
  const rating = Math.max(0, Math.min(5, Math.round(review.star_rating)));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.stars}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              size={16}
              color={index < rating ? '#facc15' : '#d1d5db'}
              fill={index < rating ? '#facc15' : 'none'}
            />
          ))}
          <Text style={styles.ratingLabel}>{review.star_rating}/5</Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={14} color={ReviewColors.muted} />
          <Text style={styles.metaText}>{formatDate(review.review_date)}</Text>
        </View>
      </View>

      <Text style={styles.title}>{review.short_description}</Text>
      <View style={styles.metaRow}>
        <MapPin size={14} color={ReviewColors.muted} />
        <Text style={styles.metaText}>{review.location}</Text>
      </View>

      <Text style={styles.body}>{review.description}</Text>

      {author && (
        <View style={[styles.metaRow, styles.footer]}>
          <User size={14} color={ReviewColors.muted} />
          <Text style={styles.metaText}>{author}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ReviewColors.background,
    borderColor: ReviewColors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingLabel: {
    marginLeft: Spacing.one,
    fontSize: 13,
    fontWeight: '600',
    color: ReviewColors.muted,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: ReviewColors.foreground,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    color: ReviewColors.foreground,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  metaText: {
    fontSize: 13,
    color: ReviewColors.muted,
  },
  footer: {
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ReviewColors.border,
  },
});
