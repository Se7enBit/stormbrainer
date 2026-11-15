import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { InstallOutcome } from '../device/install';
import { strings } from '../strings';
import { Button } from './Button';
import { colors, spacing } from './theme';

interface Props {
  canPrompt: boolean;
  ios: boolean;
  onInstall: () => Promise<InstallOutcome>;
  /** × : hide for this visit only. */
  onClose: () => void;
  /** Not now: stop asking (remembered). */
  onNotNow: () => void;
}

/**
 * "Install Stormbrainer" as a popup over everything, so it never moves the screen behind it.
 * Opens the browser's own prompt where it offers one, else shows the steps.
 */
export function InstallPrompt({ canPrompt, ios, onInstall, onClose, onNotNow }: Props) {
  const [showSteps, setShowSteps] = useState(false);

  const install = async () => {
    const outcome = canPrompt ? await onInstall() : 'unavailable';
    if (outcome === 'unavailable') setShowSteps(true);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={styles.card}
          accessibilityViewIsModal
          accessibilityLabel={strings.install.title}
        >
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {strings.install.title}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={strings.install.close}
              hitSlop={12}
            >
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.text}>
            {showSteps
              ? ios
                ? strings.install.stepsIos
                : strings.install.stepsOther
              : strings.install.body}
          </Text>
          <View style={styles.row}>
            <Button label={strings.install.dismiss} onPress={onNotNow} grow />
            {!showSteps && (
              <Button label={strings.install.button} onPress={() => void install()} primary grow />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  close: {
    color: colors.textMuted,
    fontSize: 30,
    lineHeight: 30,
  },
  text: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
