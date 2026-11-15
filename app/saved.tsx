import { StyleSheet, Text, View } from 'react-native';

import { strings } from '../src/strings';
import { colors, spacing } from '../src/ui/theme';

export default function Saved() {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>{strings.saved.comingSoon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  text: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 24,
  },
});
