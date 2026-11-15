import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { strings } from '../src/strings';
import { colors, spacing } from '../src/ui/theme';

/** Set by CI, so the web preview shows which commit it was built from. */
const commit = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? 'local';

export default function Settings() {
  const version = Constants.expoConfig?.version ?? '?';

  return (
    <View style={styles.screen}>
      <Text style={styles.text}>{strings.settings.comingSoon}</Text>
      <Text style={styles.version}>
        {strings.settings.version} {version} · {commit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 24,
  },
  version: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
