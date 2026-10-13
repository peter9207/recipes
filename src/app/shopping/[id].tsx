import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Share, StyleSheet, TextInput, View } from 'react-native';
import { AppText, EmptyState, IconButton, Separator } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { getRepositories } from '@/data';
import { parseIngredientLine, type ShoppingItem } from '@/domain';
import { useTheme } from '@/hooks/use-theme';
import { formatLine } from '@/lib/format';
import { useFocusQuery } from '@/lib/useFocusQuery';

export default function ShoppingListScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { shopping } = getRepositories();
  const query = useFocusQuery(() => shopping.get(id), [id]);
  const list = query.data;
  const [newText, setNewText] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

  if (!list) return <Stack.Screen options={{ title: '' }} />;

  // Unchecked first, in list order; checked sink to the bottom.
  const items = [...list.items.filter((i) => !i.isChecked), ...list.items.filter((i) => i.isChecked)];
  const checkedCount = list.items.length - items.filter((i) => !i.isChecked).length;

  async function addItem() {
    const text = newText.trim();
    if (!text) return;
    const p = parseIngredientLine(text);
    setNewText('');
    await shopping.addManualItem(id, { name: p.name, quantity: p.quantity });
    query.reload();
  }

  async function saveEdit() {
    if (!editing) return;
    const text = editing.text.trim();
    const itemId = editing.id;
    setEditing(null);
    if (!text) return;
    const p = parseIngredientLine(text);
    await shopping.updateItem(itemId, { name: p.name, quantity: p.quantity });
    query.reload();
  }

  const shareText = () =>
    Share.share({ message: [list!.name, ...list!.items.filter((i) => !i.isChecked).map((i) => `• ${formatLine(i.name, i.quantity)}`)].join('\n') });

  const menu = () =>
    Alert.alert(list.name, undefined, [
      { text: 'Share list', onPress: shareText },
      { text: 'Clear checked items', onPress: async () => { await shopping.clearChecked(id); query.reload(); } },
      {
        text: 'Delete list', style: 'destructive',
        onPress: () => Alert.alert('Delete list?', undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => { await shopping.softDelete(id); router.back(); } },
        ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const toggle = async (item: ShoppingItem) => {
    await shopping.updateItem(item.id, { isChecked: !item.isChecked });
    query.reload();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen options={{ title: list.name, headerRight: () => <IconButton name="ellipsis-horizontal-circle-outline" label="List options" onPress={menu} /> }} />
      {items.length === 0 ? (
        <EmptyState icon="cart-outline" title="Nothing here yet" message="Add an item below, or add recipes from the Recipes tab." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={Separator}
          contentContainerStyle={{ paddingVertical: Spacing.two }}
          ListFooterComponent={
            checkedCount > 0 ? (
              <Pressable onPress={async () => { await shopping.clearChecked(id); query.reload(); }} style={{ padding: Spacing.three }}>
                <AppText variant="caption" muted style={{ textAlign: 'center' }}>Clear {checkedCount} checked item{checkedCount === 1 ? '' : 's'}</AppText>
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.isChecked }} accessibilityLabel={`Check ${item.name}`} onPress={() => toggle(item)} hitSlop={8}>
                <Ionicons name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={item.isChecked ? t.accent : t.textSecondary} />
              </Pressable>
              {editing?.id === item.id ? (
                <TextInput
                  autoFocus
                  value={editing.text}
                  onChangeText={(v) => setEditing({ id: item.id, text: v })}
                  onSubmitEditing={saveEdit}
                  onBlur={saveEdit}
                  returnKeyType="done"
                  autoCapitalize="none"
                  style={{ flex: 1, color: t.text, fontSize: 16, paddingVertical: 4 }}
                />
              ) : (
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => setEditing({ id: item.id, text: formatLine(item.name, item.quantity) })}
                  onLongPress={() => Alert.alert(item.name, undefined, [
                    { text: 'Delete', style: 'destructive', onPress: async () => { await shopping.deleteItem(item.id); query.reload(); } },
                    { text: 'Cancel', style: 'cancel' },
                  ])}>
                  <AppText style={item.isChecked ? { textDecorationLine: 'line-through', color: t.textSecondary } : undefined}>
                    {formatLine(item.name, item.quantity)}
                  </AppText>
                  {item.sources.length > 0 && !item.isChecked ? (
                    <AppText variant="caption" muted numberOfLines={1}>{[...new Set(item.sources.map((s) => s.recipeTitle))].join(', ')}</AppText>
                  ) : null}
                </Pressable>
              )}
            </View>
          )}
        />
      )}
      <View style={[styles.add, { borderTopColor: t.border, backgroundColor: t.background }]}>
        <TextInput
          value={newText}
          onChangeText={setNewText}
          onSubmitEditing={addItem}
          placeholder="Add item, e.g. 2 apples"
          placeholderTextColor={t.textSecondary}
          returnKeyType="done"
          blurOnSubmit={false}
          autoCapitalize="none"
          style={{ flex: 1, color: t.text, fontSize: 16, paddingVertical: 12 }}
        />
        <IconButton name="add-circle" size={32} color={t.accent} label="Add item" onPress={addItem} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, minHeight: 52 },
  add: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
});
