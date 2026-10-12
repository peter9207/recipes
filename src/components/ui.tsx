import { Ionicons } from '@expo/vector-icons';
import { forwardRef, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'title' | 'heading' | 'body' | 'caption' | 'label';

const TEXT: Record<Variant, TextStyle> = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
};

export function AppText({
  variant = 'body', muted, danger, style, ...rest
}: TextProps & { variant?: Variant; muted?: boolean; danger?: boolean }) {
  const t = useTheme();
  const color = danger ? t.danger : muted || variant === 'label' ? t.textSecondary : t.text;
  return <Text style={[{ color }, TEXT[variant], style]} {...rest} />;
}

export function Button({
  title, onPress, variant = 'primary', disabled, loading, small, style,
}: {
  title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean; loading?: boolean; small?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent : variant === 'secondary' ? t.backgroundElement : 'transparent';
  const fg = variant === 'primary' ? t.onAccent : variant === 'danger' ? t.danger : variant === 'ghost' ? t.accent : t.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button, small && styles.buttonSmall, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }, style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontSize: small ? 14 : 16, fontWeight: '600' }}>{title}</Text>}
    </Pressable>
  );
}

export function IconButton({
  name, onPress, label, color, size = 24,
}: { name: ComponentProps<typeof Ionicons>['name']; onPress: () => void; label: string; color?: string; size?: number }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={10}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}>
      <Ionicons name={name} size={size} color={color ?? t.text} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? t.accent : t.backgroundElement }]}>
      <Text style={{ color: selected ? t.onAccent : t.text, fontSize: 14, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export const TextField = forwardRef<TextInput, TextInputProps & { label?: string }>(function TextField(
  { label, style, ...rest }, ref,
) {
  const t = useTheme();
  return (
    <View style={{ gap: Spacing.one }}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={t.textSecondary}
        style={[styles.input, { color: t.text, backgroundColor: t.card, borderColor: t.border }, style]}
        {...rest}
      />
    </View>
  );
});

export function Stepper({
  value, onChange, min = 1, max = 99, step = 1, format,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; format?: (v: number) => string }) {
  const t = useTheme();
  const btn = (name: 'remove' | 'add', next: number, off: boolean) => (
    <Pressable
      accessibilityRole="button" accessibilityLabel={name === 'add' ? 'Increase' : 'Decrease'} disabled={off}
      onPress={() => onChange(next)} hitSlop={6}
      style={[styles.stepBtn, { backgroundColor: t.backgroundElement, opacity: off ? 0.3 : 1 }]}>
      <Ionicons name={name} size={18} color={t.text} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('remove', Math.max(min, value - step), value <= min)}
      <AppText style={{ minWidth: 28, textAlign: 'center', fontWeight: '600' }}>{format ? format(value) : String(value)}</AppText>
      {btn('add', Math.min(max, value + step), value >= max)}
    </View>
  );
}

export function EmptyState({ icon, title, message, action }: {
  icon: ComponentProps<typeof Ionicons>['name']; title: string; message?: string; action?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={48} color={t.textSecondary} />
      <AppText variant="heading">{title}</AppText>
      {message ? <AppText muted style={{ textAlign: 'center' }}>{message}</AppText> : null}
      {action}
    </View>
  );
}

export function Separator() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border }} />;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  buttonSmall: { minHeight: 36, paddingHorizontal: Spacing.three, borderRadius: Radius.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 44 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.five, flex: 1 },
});
