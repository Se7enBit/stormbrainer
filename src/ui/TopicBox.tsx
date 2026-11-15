import { StyleSheet, TextInput } from 'react-native';

import { MAX_CONTEXT_LENGTH } from '../ai/prompt';
import { strings } from '../strings';
import { colors, spacing } from './theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** Brainstorm's topic: always visible in that mode, one line. */
export function TopicBox({ value, onChange }: Props) {
  return (
    <TextInput
      value={value}
      onChangeText={(text) => onChange(text.replace(/\s*\n\s*/g, ' '))}
      placeholder={strings.home.topicPlaceholder}
      placeholderTextColor={colors.textMuted}
      accessibilityLabel={strings.home.topicLabel}
      maxLength={MAX_CONTEXT_LENGTH}
      returnKeyType="done"
      style={styles.input}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.md,
    color: colors.text,
    fontSize: 17,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
