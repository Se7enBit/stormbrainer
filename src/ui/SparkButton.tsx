import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';

import { strings } from '../strings';
import { colors } from './theme';

interface Props {
  onPress: () => void;
  /** Waiting for AI: show a spinner and ignore taps. */
  loading?: boolean;
}

/** The one huge button that dominates the home screen. */
export function SparkButton({ onPress, loading = false }: Props) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.7, height * 0.42, 340);

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={strings.home.sparkButton}
      accessibilityHint={strings.home.sparkHint}
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        (pressed || loading) && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="large" color={colors.onAccent} />
      ) : (
        <Text style={styles.label}>{strings.home.sparkButton}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  label: {
    color: colors.onAccent,
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
