import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MAX_CONTEXT_LENGTH } from '../ai/prompt';
import { strings } from '../strings';
import { colors, spacing } from './theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** One optional line about the group, for AI sparks. Collapsed until tapped. */
export function ContextBox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          value ? `${strings.home.contextLabel}: ${value}` : strings.home.contextAdd
        }
        hitSlop={8}
      >
        <Text style={styles.collapsed} numberOfLines={1}>
          {value ? `${strings.home.contextLabel}: ${value}` : `+ ${strings.home.contextAdd}`}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={(text) => onChange(text.replace(/\s*\n\s*/g, ' '))}
        onSubmitEditing={() => setOpen(false)}
        placeholder={strings.home.contextPlaceholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={strings.home.contextLabel}
        maxLength={MAX_CONTEXT_LENGTH}
        autoFocus
        returnKeyType="done"
        style={styles.input}
      />
      <Pressable
        onPress={() => setOpen(false)}
        accessibilityRole="button"
        accessibilityLabel={strings.home.contextDone}
        hitSlop={8}
      >
        <Text style={styles.done}>{strings.home.contextDone}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsed: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  done: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
