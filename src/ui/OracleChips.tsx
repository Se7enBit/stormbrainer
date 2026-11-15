import { StyleSheet, Text, View } from 'react-native';

import type { OracleType } from '../sparks/types';
import { strings } from '../strings';
import { Chip } from './Chip';
import { colors, spacing, typeColors } from './theme';

interface Props {
  value: OracleType;
  onChange: (value: OracleType) => void;
}

const CHOICES: { type: OracleType; label: string; hint: string }[] = [
  { type: 'answer', label: strings.oracle.ask, hint: strings.oracle.askHint },
  { type: 'fortune', label: strings.oracle.fortune, hint: strings.oracle.fortuneHint },
];

/** Oracle's two chips (SPEC §9): Ask gives an answer, Fortune a fortune. */
export function OracleChips({ value, onChange }: Props) {
  const hint = CHOICES.find((c) => c.type === value)?.hint;
  return (
    <View style={styles.wrap}>
      <View
        style={styles.row}
        accessibilityRole="radiogroup"
        accessibilityLabel={strings.oracle.label}
      >
        {CHOICES.map(({ type, label }) => (
          <Chip
            key={type}
            label={label}
            selected={value === type}
            color={typeColors[type]}
            single
            onPress={() => onChange(type)}
          />
        ))}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
