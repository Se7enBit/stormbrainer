import { StyleSheet, View } from 'react-native';

import { MODES, type Mode } from '../sparks/types';
import { strings } from '../strings';
import { Chip } from './Chip';
import { colors, spacing } from './theme';

interface Props {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

/** The mode chips above the Spark button (SPEC §9). */
export function ModeChips({ mode, onChange }: Props) {
  return (
    <View
      style={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel={strings.home.modesLabel}
    >
      {MODES.map((m) => (
        <Chip
          key={m}
          label={strings.modes[m]}
          selected={mode === m}
          color={colors.accent}
          single
          onPress={() => onChange(m)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
