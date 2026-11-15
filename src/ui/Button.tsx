import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing } from './theme';

interface Props {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  /** Stretch to share a row with other buttons. */
  grow?: boolean;
}

export function Button({ label, onPress, primary = false, disabled = false, grow = false }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        grow && styles.grow,
        primary && styles.primary,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.text, primary && styles.textPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
  },
  grow: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  dimmed: {
    opacity: 0.6,
  },
  text: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  textPrimary: {
    color: colors.onAccent,
  },
});
