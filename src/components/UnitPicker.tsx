import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { UNITS, unitLabel, type UnitDimension } from '@/domain';
import { useTheme } from '@/hooks/use-theme';

const SECTIONS: { title: string; dimension: UnitDimension | 'none' }[] = [
  { title: '', dimension: 'none' },
  { title: 'Volume', dimension: 'volume' },
  { title: 'Weight', dimension: 'mass' },
  { title: 'Count', dimension: 'count' },
];

const data = SECTIONS.map((s) => ({
  title: s.title,
  data: s.dimension === 'none' ? [null] : UNITS.filter((u) => u.dimension === s.dimension).map((u) => u.key),
}));

/** Dropdown for choosing an ingredient unit (or none for plain counts like "3 eggs"). */
export function UnitPicker({ value, onChange }: { value: string | null; onChange: (unit: string | null) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Unit: ${value ? unitLabel(value) : 'none'}`}
        onPress={() => setOpen(true)}
        style={[styles.button, { backgroundColor: t.card, borderColor: t.border }]}>
        <AppText numberOfLines={1} style={{ flex: 1, color: value ? t.text : t.textSecondary }}>
          {value ? unitLabel(value) : 'unit'}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={t.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: t.background }]}>
          <View style={styles.sheetHeader}>
            <AppText variant="heading">Unit</AppText>
            <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={t.text} />
            </Pressable>
          </View>
          <SectionList
            sections={data}
            keyExtractor={(k) => k ?? 'none'}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) =>
              section.title ? <AppText variant="label" style={styles.sectionTitle}>{section.title}</AppText> : null}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onChange(item); setOpen(false); }}
                style={({ pressed }) => [styles.option, { backgroundColor: pressed ? t.backgroundElement : 'transparent' }]}>
                <AppText style={{ flex: 1 }}>{item ? unitLabel(item) : 'None (e.g. “3 eggs”)'}</AppText>
                {item === value ? <Ionicons name="checkmark" size={20} color={t.accent} /> : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.sm,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '60%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.three },
  sectionTitle: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.one },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: 14 },
});
