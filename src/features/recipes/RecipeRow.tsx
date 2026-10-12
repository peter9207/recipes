import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeSummary } from '@/domain';
import { formatMinutes } from '@/lib/format';

export function RecipeRow({
  recipe, selecting, selected, onPress, onLongPress,
}: {
  recipe: RecipeSummary; selecting: boolean; selected: boolean; onPress: () => void; onLongPress: () => void;
}) {
  const t = useTheme();
  const meta = [formatMinutes(recipe.totalMinutes), recipe.tags.slice(0, 3).join(', ')].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={recipe.title}
      style={({ pressed }) => [styles.row, { backgroundColor: selected ? t.backgroundSelected : t.card, opacity: pressed ? 0.8 : 1 }]}>
      {recipe.coverThumbUri ? (
        <Image source={{ uri: recipe.coverThumbUri }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.placeholder, { backgroundColor: t.backgroundElement }]}>
          <Ionicons name="restaurant-outline" size={26} color={t.textSecondary} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading" numberOfLines={2}>{recipe.title}</AppText>
        {meta ? <AppText variant="caption" muted numberOfLines={1}>{meta}</AppText> : null}
      </View>
      {selecting ? (
        <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={selected ? t.accent : t.textSecondary} />
      ) : recipe.isFavorite ? (
        <Ionicons name="star" size={18} color={t.accent} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.two, borderRadius: Radius.md },
  thumb: { width: 64, height: 64, borderRadius: Radius.sm },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
