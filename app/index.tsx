import { Link, Stack } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettingsStore } from '../src/store/settingsStore';
import { useSparkStore } from '../src/store/sparkStore';
import { strings } from '../src/strings';
import { ChipsStrip } from '../src/ui/ChipsStrip';
import { ContextBox } from '../src/ui/ContextBox';
import { SparkButton } from '../src/ui/SparkButton';
import { SparkCard } from '../src/ui/SparkCard';
import { colors, spacing } from '../src/ui/theme';

export default function Home() {
  const current = useSparkStore((s) => s.current);
  const filters = useSparkStore((s) => s.filters);
  const next = useSparkStore((s) => s.next);
  const reroll = useSparkStore((s) => s.reroll);
  const close = useSparkStore((s) => s.close);
  const toggleType = useSparkStore((s) => s.toggleType);
  const setVibe = useSparkStore((s) => s.setVibe);
  const setWorkSafe = useSparkStore((s) => s.setWorkSafe);
  const context = useSparkStore((s) => s.context);
  const setContext = useSparkStore((s) => s.setContext);
  const loading = useSparkStore((s) => s.loading);
  const hasKey = useSettingsStore((s) => s.hasKey);
  const keyStatus = useSettingsStore((s) => s.keyStatus);
  const needsAttention = hasKey && (keyStatus === 'invalidKey' || keyStatus === 'modelNotFound');

  // Android back closes the card instead of leaving the app.
  useEffect(() => {
    if (!current) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [current, close]);

  if (current) {
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <SparkCard
          spark={current}
          onNext={() => void next()}
          onReroll={() => void reroll()}
          onClose={close}
          loading={loading}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: true }} />
      <View style={styles.center}>
        <SparkButton onPress={() => void next()} loading={loading} />
      </View>
      <View style={styles.controls}>
        <ChipsStrip
          filters={filters}
          onToggleType={toggleType}
          onVibe={setVibe}
          onWorkSafe={setWorkSafe}
        />
        {hasKey && <ContextBox value={context} onChange={setContext} />}
        {needsAttention && (
          <Link href="/settings" style={styles.notice}>
            {strings.home.aiNeedsAttention}
          </Link>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
  },
  notice: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
