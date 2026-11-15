import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing } from './theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Fill colour when selected. */
  color?: string;
  /** Radio-style (single choice) instead of checkbox-style. */
  single?: boolean;
}

export function Chip({ label, selected, onPress, color = colors.accent, single = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={single ? 'radio' : 'checkbox'}
      accessibilityState={single ? { selected } : { checked: selected }}
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.onAccent,
  },
});
