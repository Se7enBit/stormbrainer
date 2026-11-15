import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, spacing } from './theme';

interface Props {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function Toggle({ label, value, onValueChange }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.surfaceRaised, true: colors.accent }}
        thumbColor={colors.text}
        // react-native-web colours the thumb with its own prop.
        {...{ activeThumbColor: colors.text }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});
