import { StyleSheet, View } from 'react-native';

import { SPARK_TYPES, VIBES, type SparkFilters, type SparkType, type Vibe } from '../sparks/types';
import { strings } from '../strings';
import { Chip } from './Chip';
import { colors, spacing, typeColors } from './theme';
import { Toggle } from './Toggle';

interface Props {
  filters: SparkFilters;
  onToggleType: (type: SparkType) => void;
  onVibe: (vibe: Vibe) => void;
  onWorkSafe: (workSafe: boolean) => void;
}

/** The compact, all-optional settings under the Spark button. */
export function ChipsStrip({ filters, onToggleType, onVibe, onWorkSafe }: Props) {
  return (
    <View style={styles.strip} accessibilityLabel={strings.home.controlsLabel}>
      <View style={styles.row} accessibilityLabel={strings.home.typesLabel}>
        {SPARK_TYPES.map((type) => (
          <Chip
            key={type}
            label={strings.types[type]}
            selected={filters.types.includes(type)}
            color={typeColors[type]}
            onPress={() => onToggleType(type)}
          />
        ))}
      </View>
      <View style={styles.row}>
        <View
          style={styles.row}
          accessibilityRole="radiogroup"
          accessibilityLabel={strings.home.vibeLabel}
        >
          {VIBES.map((vibe) => (
            <Chip
              key={vibe}
              label={strings.vibes[vibe]}
              selected={filters.vibe === vibe}
              color={colors.text}
              single
              onPress={() => onVibe(vibe)}
            />
          ))}
        </View>
        <Toggle label={strings.workSafe} value={filters.workSafe} onValueChange={onWorkSafe} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: spacing.md,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
