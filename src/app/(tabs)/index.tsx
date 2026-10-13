import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, Chip, EmptyState, IconButton } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getRepositories } from '@/data';
import { RecipeRow } from '@/features/recipes/RecipeRow';
import { useTheme } from '@/hooks/use-theme';
import { useFocusQuery } from '@/lib/useFocusQuery';

export default function LibraryScreen() {
  const t = useTheme();
  const { recipes } = getRepositories();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string> | null>(null);

  useEffect(() => {
    const h = setTimeout(() => setSearch(input), 200);
    return () => clearTimeout(h);
  }, [input]);

  const list = useFocusQuery(
    () => recipes.list({ search, tags: activeTags, favoritesOnly }),
    [search, activeTags.join('|'), favoritesOnly],
  );
  const allTags = useFocusQuery(() => recipes.listTags(), []);

  const items = list.data ?? [];
  const filtering = !!search.trim() || activeTags.length > 0 || favoritesOnly;
  const selecting = selected !== null;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.background }}>
      <View style={styles.header}>
        <AppText variant="title">{selecting ? `${selected.size} selected` : 'Recipes'}</AppText>
        {selecting ? (
          <Button title="Cancel" variant="ghost" small onPress={() => setSelected(null)} />
        ) : (
          <IconButton name="add-circle" size={34} color={t.accent} label="New recipe" onPress={() => router.push('/recipe/new')} />
        )}
      </View>

      <View style={[styles.search, { backgroundColor: t.backgroundElement }]}>
        <Ionicons name="search" size={18} color={t.textSecondary} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Search recipes or ingredients"
          placeholderTextColor={t.textSecondary}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={{ flex: 1, color: t.text, fontSize: 16, paddingVertical: 10 }}
        />
      </View>

      {(allTags.data?.length ?? 0) > 0 || items.some((r) => r.isFavorite) || favoritesOnly ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="★ Favorites" selected={favoritesOnly} onPress={() => setFavoritesOnly((v) => !v)} />
            {allTags.data?.map((tag) => (
              <Chip
                key={tag.name}
                label={tag.name}
                selected={activeTags.includes(tag.name)}
                onPress={() => setActiveTags((cur) => (cur.includes(tag.name) ? cur.filter((x) => x !== tag.name) : [...cur, tag.name]))}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {list.error ? (
        <EmptyState icon="alert-circle-outline" title="Couldn’t load recipes" message={list.error.message} action={<Button title="Try again" onPress={list.reload} />} />
      ) : list.loading ? null : items.length === 0 ? (
        filtering ? (
          <EmptyState icon="search-outline" title="No matches" message="Try a different search or clear the filters." />
        ) : (
          <EmptyState
            icon="restaurant-outline"
            title="No recipes yet"
            message="Add your first recipe — type it in, add a photo, and it’s ready to cook from."
            action={<Button title="Add a recipe" onPress={() => router.push('/recipe/new')} />}
          />
        )
      ) : (
        <FlatList
          data={items}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two, paddingBottom: selecting ? 100 : Spacing.five }}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <RecipeRow
              recipe={item}
              selecting={selecting}
              selected={!!selected?.has(item.id)}
              onPress={() => (selecting ? toggle(item.id) : router.push(`/recipe/${item.id}`))}
              onLongPress={() => (selecting ? toggle(item.id) : setSelected(new Set([item.id])))}
            />
          )}
        />
      )}

      {selecting ? (
        <View style={[styles.bar, { backgroundColor: t.card, borderTopColor: t.border }]}>
          <Button
            title={`Add ${selected.size} to shopping list`}
            disabled={selected.size === 0}
            style={{ flex: 1 }}
            onPress={() => {
              const ids = [...selected].join(',');
              setSelected(null);
              router.push({ pathname: '/shopping/generate', params: { recipeIds: ids } });
            }}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  search: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginHorizontal: Spacing.three, marginTop: Spacing.two, paddingHorizontal: Spacing.three, borderRadius: Radius.md },
  chips: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.three, flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
});
