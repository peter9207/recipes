import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, EmptyState, Stepper, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getRepositories } from '@/data';
import type { ShoppingSelection } from '@/domain';
import { useTheme } from '@/hooks/use-theme';
import { useFocusQuery } from '@/lib/useFocusQuery';

export default function GenerateShoppingListScreen() {
  const t = useTheme();
  const { recipeIds } = useLocalSearchParams<{ recipeIds?: string }>();
  const { recipes, shopping } = getRepositories();
  const all = useFocusQuery(() => recipes.list(), []);
  const lists = useFocusQuery(() => shopping.listLists(), []);

  const [servings, setServings] = useState<Map<string, number>>(new Map());
  const [target, setTarget] = useState<'new' | string>('new');
  const [name, setName] = useState('Shopping list');
  const [busy, setBusy] = useState(false);

  // Preselect recipes passed in from the library/detail screens.
  useEffect(() => {
    if (!all.data || !recipeIds) return;
    const wanted = new Set(recipeIds.split(','));
    setServings((cur) => {
      if (cur.size > 0) return cur;
      return new Map(all.data!.filter((r) => wanted.has(r.id)).map((r) => [r.id, r.servings]));
    });
  }, [all.data, recipeIds]);

  const toggle = (id: string, defaultServings: number) =>
    setServings((cur) => {
      const next = new Map(cur);
      if (next.has(id)) next.delete(id);
      else next.set(id, defaultServings);
      return next;
    });

  async function create() {
    setBusy(true);
    try {
      const selections: ShoppingSelection[] = [];
      for (const [id, targetServings] of servings) {
        const recipe = await recipes.get(id);
        if (recipe) selections.push({ recipe, targetServings });
      }
      const list = target === 'new' ? await shopping.createFromSelections(name, selections) : await shopping.addToList(target, selections);
      router.replace(`/shopping/${list.id}`);
    } catch (e) {
      Alert.alert('Couldn’t build the list', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const items = all.data ?? [];
  if (!all.loading && items.length === 0) {
    return <EmptyState icon="restaurant-outline" title="No recipes yet" message="Add a recipe first, then build a shopping list from it." />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.three, gap: Spacing.four }}>
        <View style={{ gap: Spacing.two }}>
          <AppText variant="label">Recipes</AppText>
          {items.map((r) => {
            const on = servings.has(r.id);
            return (
              <View key={r.id} style={[styles.card, { backgroundColor: t.card }]}>
                <Pressable onPress={() => toggle(r.id, r.servings)} style={styles.cardMain} accessibilityLabel={r.title}>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={26} color={on ? t.accent : t.textSecondary} />
                  <AppText style={{ flex: 1 }} numberOfLines={2}>{r.title}</AppText>
                </Pressable>
                {on ? (
                  <View style={styles.servings}>
                    <AppText variant="caption" muted>Servings</AppText>
                    <Stepper value={servings.get(r.id)!} onChange={(v) => setServings((cur) => new Map(cur).set(r.id, v))} />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={{ gap: Spacing.two }}>
          <AppText variant="label">Add to</AppText>
          <Option label="New list" selected={target === 'new'} onPress={() => setTarget('new')} />
          {target === 'new' ? <TextField value={name} onChangeText={setName} placeholder="List name" /> : null}
          {lists.data?.map((l) => (
            <Option key={l.id} label={l.name} detail={`${l.itemCount} items`} selected={target === l.id} onPress={() => setTarget(l.id)} />
          ))}
        </View>
      </ScrollView>
      <View style={[styles.bar, { borderTopColor: t.border, backgroundColor: t.background }]}>
        <Button
          title={servings.size === 0 ? 'Select recipes' : `Add ${servings.size} recipe${servings.size === 1 ? '' : 's'}`}
          disabled={servings.size === 0}
          loading={busy}
          onPress={create}
        />
      </View>
    </View>
  );
}

function Option({ label, detail, selected, onPress }: { label: string; detail?: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.card, styles.cardMain, { backgroundColor: t.card }]}>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={24} color={selected ? t.accent : t.textSecondary} />
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {detail ? <AppText variant="caption" muted>{detail}</AppText> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.md },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  servings: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingBottom: Spacing.three, paddingLeft: 58 },
  bar: { padding: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
});
