import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText, Button, Chip, EmptyState, IconButton, Stepper } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getRepositories } from '@/data';
import { scaleIngredients } from '@/domain';
import { useTheme } from '@/hooks/use-theme';
import { formatLine, formatMinutes } from '@/lib/format';
import { useFocusQuery } from '@/lib/useFocusQuery';

export default function RecipeDetailScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes } = getRepositories();
  const query = useFocusQuery(() => recipes.get(id), [id]);
  const recipe = query.data;
  const [servingsOverride, setServingsOverride] = useState<number | null>(null);

  if (!recipe) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        {query.loading ? null : <EmptyState icon="alert-circle-outline" title="Recipe not found" action={<Button title="Back" onPress={() => router.back()} />} />}
      </>
    );
  }

  const servings = servingsOverride ?? recipe.servings;
  const scaled = scaleIngredients(recipe.ingredients, recipe.servings, servings);
  const coverPhotos = recipe.photos.filter((p) => p.stepId === null);
  const time = [
    recipe.prepMinutes !== null ? `Prep ${formatMinutes(recipe.prepMinutes)}` : null,
    recipe.cookMinutes !== null ? `Cook ${formatMinutes(recipe.cookMinutes)}` : null,
  ].filter(Boolean).join(' · ');

  const confirmDelete = () =>
    Alert.alert('Delete recipe?', `“${recipe.title}” will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await recipes.softDelete(recipe.id); router.back(); } },
    ]);

  let lastGroup: string | null | undefined;

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <IconButton
                name={recipe.isFavorite ? 'star' : 'star-outline'} color={t.accent} label="Favorite"
                onPress={async () => { await recipes.setFavorite(recipe.id, !recipe.isFavorite); query.reload(); }}
              />
              <IconButton name="create-outline" label="Edit" onPress={() => router.push(`/recipe/${recipe.id}/edit`)} />
              <IconButton name="trash-outline" color={t.danger} label="Delete" onPress={confirmDelete} />
            </View>
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {coverPhotos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {coverPhotos.map((p, i) => (
              <Pressable key={p.id} onPress={() => router.push({ pathname: '/recipe/[id]/photos', params: { id: recipe.id, index: String(i) } })}>
                <Image source={{ uri: p.uri }} style={{ width, height: width * 0.75 }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.body}>
          <View style={{ gap: Spacing.one }}>
            <AppText variant="title">{recipe.title}</AppText>
            {recipe.description ? <AppText muted>{recipe.description}</AppText> : null}
            {time ? <AppText variant="caption" muted>{time}{recipe.totalMinutes !== null && recipe.prepMinutes !== null && recipe.cookMinutes !== null ? ` · ${formatMinutes(recipe.totalMinutes)} total` : ''}</AppText> : null}
            {recipe.source ? <AppText variant="caption" muted>Source: {recipe.source}</AppText> : null}
          </View>

          {recipe.tags.length > 0 ? (
            <View style={styles.tags}>{recipe.tags.map((tag) => <Chip key={tag} label={tag} />)}</View>
          ) : null}

          <View style={{ gap: Spacing.two }}>
            <View style={styles.sectionHead}>
              <AppText variant="heading">Ingredients</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                <AppText variant="caption" muted>Servings</AppText>
                <Stepper value={servings} onChange={setServingsOverride} />
              </View>
            </View>
            {scaled.length === 0 ? <AppText muted>No ingredients yet.</AppText> : null}
            {scaled.map((ing) => {
              const header = ing.groupName !== lastGroup && ing.groupName ? ing.groupName : null;
              lastGroup = ing.groupName;
              return (
                <View key={ing.id}>
                  {header ? <AppText variant="label" style={{ marginTop: Spacing.two }}>{header}</AppText> : null}
                  <AppText style={{ paddingVertical: 3 }}>
                    {formatLine(ing.name, ing.quantity)}
                    {ing.note ? <AppText muted>{`, ${ing.note}`}</AppText> : null}
                  </AppText>
                </View>
              );
            })}
          </View>

          {recipe.steps.length > 0 ? (
            <View style={{ gap: Spacing.three }}>
              <AppText variant="heading">Steps</AppText>
              {recipe.steps.map((s, i) => (
                <View key={s.id} style={{ flexDirection: 'row', gap: Spacing.three }}>
                  <View style={[styles.stepNum, { backgroundColor: t.accent }]}>
                    <AppText variant="caption" style={{ color: t.onAccent, fontWeight: '700' }}>{i + 1}</AppText>
                  </View>
                  <AppText style={{ flex: 1 }}>{s.text}</AppText>
                </View>
              ))}
            </View>
          ) : null}

          {recipe.notes ? (
            <View style={[styles.notes, { backgroundColor: t.backgroundElement }]}>
              <AppText variant="label">Notes</AppText>
              <AppText>{recipe.notes}</AppText>
            </View>
          ) : null}

          <Button
            title="Add to shopping list"
            variant="secondary"
            onPress={() => router.push({ pathname: '/shopping/generate', params: { recipeIds: recipe.id } })}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: Spacing.three, gap: Spacing.four },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  notes: { padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.one },
});
