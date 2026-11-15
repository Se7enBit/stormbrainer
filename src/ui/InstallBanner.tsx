import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { InstallOutcome } from '../device/install';
import { strings } from '../strings';
import { Button } from './Button';
import { colors, spacing } from './theme';

interface Props {
  canPrompt: boolean;
  ios: boolean;
  onInstall: () => Promise<InstallOutcome>;
  onDismiss: () => void;
}

/** "Install Stormbrainer" on the web: the browser's prompt where it offers one, else the steps. */
export function InstallBanner({ canPrompt, ios, onInstall, onDismiss }: Props) {
  const [showSteps, setShowSteps] = useState(false);

  const install = async () => {
    const outcome = canPrompt ? await onInstall() : 'unavailable';
    if (outcome === 'unavailable') setShowSteps(true);
  };

  return (
    <View style={styles.banner} accessibilityLabel={strings.install.title}>
      <Text style={styles.title}>{strings.install.title}</Text>
      <Text style={styles.text}>
        {showSteps
          ? ios
            ? strings.install.stepsIos
            : strings.install.stepsOther
          : strings.install.body}
      </Text>
      <View style={styles.row}>
        <Button label={strings.install.dismiss} onPress={onDismiss} grow />
        {!showSteps && (
          <Button label={strings.install.button} onPress={() => void install()} primary grow />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.sm,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  text: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
