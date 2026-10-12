import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Button, IconButton, TextField } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { DraftValidationError, getRepositories } from '@/data';
import { formatQuantity, parseIngredientLine, type PhotoDraft, type Recipe, type RecipeDraft } from '@/domain';
import { useTheme } from '@/hooks/use-theme';
import { newId } from '@/lib/id';

interface IngredientRow { id: string; text: string; groupName: string | null }
interface StepRow { id: string; text: string; timerSeconds: number | null }
interface PhotoItem { id: string; uri: string; stepId: string | null; sourceUri?: string }

interface FormState {
  title: string; description: string; servings: string; prep: string; cook: string;
  source: string; notes: string; tags: string; isFavorite: boolean;
  ingredients: IngredientRow[]; steps: StepRow[]; photos: PhotoItem[];
}

const EMPTY: FormState = {
  title: '', description: '', servings: '4', prep: '', cook: '', source: '', notes: '', tags: '', isFavorite: false,
  ingredients: [], steps: [], photos: [],
};

function lineFor(i: Recipe['ingredients'][number]): string {
  if (i.rawText) return i.rawText;
  const amount = formatQuantity(i.quantity);
  return [amount, i.name].filter(Boolean).join(' ') + (i.note ? `, ${i.note}` : '');
}

function toForm(r: Recipe): FormState {
  return {
    title: r.title, description: r.description ?? '', servings: String(r.servings),
    prep: r.prepMinutes?.toString() ?? '', cook: r.cookMinutes?.toString() ?? '',
    source: r.source ?? '', notes: r.notes ?? '', tags: r.tags.join(', '), isFavorite: r.isFavorite,
    ingredients: r.ingredients.map((i) => ({ id: i.id, text: lineFor(i), groupName: i.groupName })),
    steps: r.steps.map((s) => ({ id: s.id, text: s.text, timerSeconds: s.timerSeconds })),
    photos: r.photos.map((p) => ({ id: p.id, uri: p.thumbUri, stepId: p.stepId })),
  };
}

const toMinutes = (s: string): number | null => {
  const n = Number(s.trim());
  return s.trim() && Number.isFinite(n) ? Math.round(n) : null;
};

function toDraft(id: string, f: FormState): RecipeDraft {
  return {
    id,
    title: f.title,
    description: f.description.trim() || null,
    servings: Number(f.servings),
    prepMinutes: toMinutes(f.prep),
    cookMinutes: toMinutes(f.cook),
    source: f.source.trim() || null,
    sourceUrl: null,
    notes: f.notes.trim() || null,
    isFavorite: f.isFavorite,
    tags: f.tags.split(',').map((x) => x.trim()).filter(Boolean),
    ingredients: f.ingredients.filter((r) => r.text.trim()).map((r) => {
      const p = parseIngredientLine(r.text);
      return { id: r.id, groupName: r.groupName, quantity: p.quantity, name: p.name, note: p.note, rawText: r.text.trim() };
    }),
    steps: f.steps.filter((s) => s.text.trim()).map((s) => ({ id: s.id, text: s.text.trim(), timerSeconds: s.timerSeconds })),
    photos: f.photos.map((p): PhotoDraft => ({ id: p.id, stepId: p.stepId, ...(p.sourceUri ? { sourceUri: p.sourceUri } : {}) })),
  };
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

export function RecipeEditor({ recipeId }: { recipeId?: string }) {
  const t = useTheme();
  const nav = useNavigation();
  const { recipes } = getRepositories();
  const [id] = useState(() => recipeId ?? newId());
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(!recipeId);
  const [saving, setSaving] = useState(false);
  const initial = useRef(JSON.stringify(EMPTY));
  const saved = useRef(false);
  const dirty = JSON.stringify(form) !== initial.current;

  useEffect(() => {
    if (!recipeId) return;
    recipes.get(recipeId).then((r) => {
      if (!r) return router.back();
      const f = toForm(r);
      initial.current = JSON.stringify(f);
      setForm(f);
      setLoaded(true);
    });
  }, [recipeId]);

  useEffect(
    () =>
      nav.addListener('beforeRemove', (e) => {
        if (saved.current || !dirty) return;
        e.preventDefault();
        Alert.alert('Discard changes?', 'Your edits to this recipe haven’t been saved.', [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => nav.dispatch(e.data.action) },
        ]);
      }),
    [nav, dirty],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setSaving(true);
    try {
      await recipes.save(toDraft(id, form));
      saved.current = true;
      if (recipeId) router.back();
      else router.replace(`/recipe/${id}`);
    } catch (e) {
      Alert.alert(
        'Can’t save yet',
        e instanceof DraftValidationError ? e.problems.join('\n') : e instanceof Error ? e.message : 'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function addPhoto(source: 'camera' | 'library') {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : null;
    if (perm && !perm.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take photos.');
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsMultipleSelection: source === 'library' };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    setForm((f) => ({
      ...f,
      photos: [...f.photos, ...result.assets.map((a) => ({ id: newId(), uri: a.uri, sourceUri: a.uri, stepId: null }))],
    }));
  }

  const choosePhotoSource = () =>
    Alert.alert('Add photo', undefined, [
      { text: 'Take photo', onPress: () => addPhoto('camera') },
      { text: 'Choose from library', onPress: () => addPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  if (!loaded) return null;

  const recipePhotos = form.photos.filter((p) => p.stepId === null);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          title: recipeId ? 'Edit recipe' : 'New recipe',
          headerRight: () => <Button title="Save" small onPress={save} loading={saving} disabled={!dirty} />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <TextField label="Title" value={form.title} onChangeText={(v) => set('title', v)} placeholder="Tomato soup" returnKeyType="next" />

        <Section title="Photos">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
            {recipePhotos.map((p, i) => (
              <View key={p.id}>
                <Image source={{ uri: p.uri }} style={styles.photo} contentFit="cover" />
                {i === 0 ? <View style={[styles.cover, { backgroundColor: t.accent }]}><AppText variant="caption" style={{ color: t.onAccent, fontWeight: '600' }}>Cover</AppText></View> : null}
                <Pressable
                  accessibilityLabel="Remove photo"
                  onPress={() => set('photos', form.photos.filter((x) => x.id !== p.id))}
                  style={[styles.remove, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                  <Ionicons name="close" size={16} color="#fff" />
                </Pressable>
                {i > 0 ? (
                  <Pressable
                    accessibilityLabel="Make cover photo"
                    onPress={() => set('photos', [p, ...form.photos.filter((x) => x.id !== p.id)])}
                    style={[styles.makeCover, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <Ionicons name="star" size={14} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
            ))}
            <Pressable
              accessibilityLabel="Add photo" onPress={choosePhotoSource}
              style={[styles.photo, styles.addPhoto, { borderColor: t.border, backgroundColor: t.backgroundElement }]}>
              <Ionicons name="camera-outline" size={28} color={t.textSecondary} />
              <AppText variant="caption" muted>Add photo</AppText>
            </Pressable>
          </ScrollView>
        </Section>

        <View style={styles.row}>
          <View style={{ flex: 1 }}><TextField label="Servings" value={form.servings} onChangeText={(v) => set('servings', v)} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><TextField label="Prep (min)" value={form.prep} onChangeText={(v) => set('prep', v)} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><TextField label="Cook (min)" value={form.cook} onChangeText={(v) => set('cook', v)} keyboardType="number-pad" /></View>
        </View>

        <TextField label="Description" value={form.description} onChangeText={(v) => set('description', v)} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />

        <Section title="Ingredients" hint="One per line, e.g. “2 cups flour, sifted”">
          {form.ingredients.map((row, i) => (
            <View key={row.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <TextField
                  value={row.text}
                  onChangeText={(v) => set('ingredients', form.ingredients.map((r) => (r.id === row.id ? { ...r, text: v } : r)))}
                  placeholder="2 cups flour"
                  autoCapitalize="none"
                />
              </View>
              <Reorder
                canUp={i > 0} canDown={i < form.ingredients.length - 1}
                onUp={() => set('ingredients', move(form.ingredients, i, i - 1))}
                onDown={() => set('ingredients', move(form.ingredients, i, i + 1))}
                onRemove={() => set('ingredients', form.ingredients.filter((r) => r.id !== row.id))}
              />
            </View>
          ))}
          <Button title="Add ingredient" variant="secondary" small onPress={() => set('ingredients', [...form.ingredients, { id: newId(), text: '', groupName: null }])} />
        </Section>

        <Section title="Steps">
          {form.steps.map((row, i) => (
            <View key={row.id} style={styles.listRow}>
              <AppText variant="heading" muted style={{ width: 22, paddingTop: 10 }}>{i + 1}</AppText>
              <View style={{ flex: 1 }}>
                <TextField
                  value={row.text}
                  onChangeText={(v) => set('steps', form.steps.map((r) => (r.id === row.id ? { ...r, text: v } : r)))}
                  placeholder="Describe this step"
                  multiline
                  style={{ minHeight: 70, textAlignVertical: 'top' }}
                />
              </View>
              <Reorder
                canUp={i > 0} canDown={i < form.steps.length - 1}
                onUp={() => set('steps', move(form.steps, i, i - 1))}
                onDown={() => set('steps', move(form.steps, i, i + 1))}
                onRemove={() => set('steps', form.steps.filter((r) => r.id !== row.id))}
              />
            </View>
          ))}
          <Button title="Add step" variant="secondary" small onPress={() => set('steps', [...form.steps, { id: newId(), text: '', timerSeconds: null }])} />
        </Section>

        <TextField label="Tags" value={form.tags} onChangeText={(v) => set('tags', v)} placeholder="dinner, vegetarian, quick" autoCapitalize="none" />
        <TextField label="Source" value={form.source} onChangeText={(v) => set('source', v)} placeholder="Grandma, nytimes.com…" autoCapitalize="none" />
        <TextField label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.two }}>
      <View>
        <AppText variant="label">{title}</AppText>
        {hint ? <AppText variant="caption" muted>{hint}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

function Reorder({ canUp, canDown, onUp, onDown, onRemove }: {
  canUp: boolean; canDown: boolean; onUp: () => void; onDown: () => void; onRemove: () => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 8 }}>
      <View style={{ opacity: canUp ? 1 : 0.25 }}><IconButton name="chevron-up" size={20} label="Move up" onPress={() => canUp && onUp()} /></View>
      <View style={{ opacity: canDown ? 1 : 0.25 }}><IconButton name="chevron-down" size={20} label="Move down" onPress={() => canDown && onDown()} /></View>
      <IconButton name="trash-outline" size={20} color={t.danger} label="Remove" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: 80 },
  row: { flexDirection: 'row', gap: Spacing.two },
  listRow: { flexDirection: 'row', gap: Spacing.one, alignItems: 'flex-start' },
  photo: { width: 120, height: 120, borderRadius: Radius.md },
  addPhoto: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderStyle: 'dashed', gap: 4 },
  cover: { position: 'absolute', left: 6, bottom: 6, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  remove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  makeCover: { position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
