import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, EmptyState, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { getRepositories } from '@/data';
import { useTheme } from '@/hooks/use-theme';
import { useFocusQuery } from '@/lib/useFocusQuery';

export default function ShoppingListsScreen() {
  const t = useTheme();
  const { shopping } = getRepositories();
  const lists = useFocusQuery(() => shopping.listLists(), []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  async function create() {
    const list = await shopping.createList(name);
    setName('');
    setCreating(false);
    router.push(`/shopping/${list.id}`);
  }

  const data = lists.data ?? [];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.background }}>
      <View style={styles.header}>
        <AppText variant="title">Shopping</AppText>
        <View style={{ flexDirection: 'row', gap: Spacing.two }}>
          <Button title="From recipes" variant="secondary" small onPress={() => router.push('/shopping/generate')} />
          <Button title="New list" small onPress={() => setCreating(true)} />
        </View>
      </View>

      {creating ? (
        <View style={styles.create}>
          <View style={{ flex: 1 }}>
            <TextField value={name} onChangeText={setName} placeholder="List name" autoFocus onSubmitEditing={create} returnKeyType="done" />
          </View>
          <Button title="Create" small onPress={create} />
          <Button title="Cancel" variant="ghost" small onPress={() => { setCreating(false); setName(''); }} />
        </View>
      ) : null}

      {lists.loading ? null : data.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="No shopping lists"
          message="Pick some recipes and we’ll combine their ingredients into one list."
          action={<Button title="Build from recipes" onPress={() => router.push('/shopping/generate')} />}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/shopping/${item.id}`)}
              style={({ pressed }) => [styles.row, { backgroundColor: t.card, opacity: pressed ? 0.8 : 1 }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="heading">{item.name}</AppText>
                <AppText variant="caption" muted>
                  {item.itemCount === 0 ? 'Empty' : `${item.checkedCount} of ${item.itemCount} done`}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.textSecondary} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  create: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two, padding: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: Radius.md },
});
