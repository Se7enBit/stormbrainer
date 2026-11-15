import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sparkHaptic } from '../src/device/haptics';
import { useInstall } from '../src/device/install';
import { KeepAwake } from '../src/device/KeepAwake';
import { isSaved } from '../src/sparks/saved';
import { useSavedStore } from '../src/store/savedStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useSparkStore } from '../src/store/sparkStore';
import { ChipsStrip } from '../src/ui/ChipsStrip';
import { ContextBox } from '../src/ui/ContextBox';
import { ModeChips } from '../src/ui/ModeChips';
import { OracleChips } from '../src/ui/OracleChips';
import { TopicBox } from '../src/ui/TopicBox';
import { InstallBanner } from '../src/ui/InstallBanner';
import { SourceStatus } from '../src/ui/SourceStatus';
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
  const mode = useSparkStore((s) => s.mode);
  const setMode = useSparkStore((s) => s.setMode);
  const topic = useSparkStore((s) => s.topic);
  const setTopic = useSparkStore((s) => s.setTopic);
  const oracleType = useSparkStore((s) => s.oracleType);
  const setOracleType = useSparkStore((s) => s.setOracleType);
  const hasKey = useSettingsStore((s) => s.hasKey);
  const lastProblem = useSettingsStore((s) => s.lastProblem);
  const keyStatus = useSettingsStore((s) => s.keyStatus);
  const prefetch = useSparkStore((s) => s.prefetch);
  const saved = useSavedStore((s) => s.saved);
  const toggleSave = useSavedStore((s) => s.toggle);
  // A rejected key or model shows even before the first tap.
  const problem =
    keyStatus === 'invalidKey' || keyStatus === 'modelNotFound'
      ? { kind: keyStatus, detail: undefined }
      : lastProblem;

  // With a key, fetch AI sparks as soon as Home shows (and when settings change), so the
  // first tap is already an AI card instead of a deck card while Gemini thinks.
  const install = useInstall();
  const installDismissed = useSettingsStore((s) => s.installDismissed);
  const settingsLoaded = useSettingsStore((s) => s.hydrated);
  const dismissInstall = useSettingsStore((s) => s.dismissInstall);

  const showingHome = current === null;
  useEffect(() => {
    if (hasKey && showingHome) prefetch();
  }, [hasKey, showingHome, mode, filters, oracleType, context, topic, prefetch]);

  // Android back closes the card instead of leaving the app.
  useEffect(() => {
    if (!current) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [current, close]);

  const spark = () => {
    sparkHaptic();
    void next();
  };

  if (current) {
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeepAwake />
        <SparkCard
          spark={current}
          onNext={spark}
          onReroll={() => void reroll()}
          onClose={close}
          loading={loading}
          saved={isSaved(saved, current)}
          onToggleSave={() => toggleSave(current)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: true }} />
      {settingsLoaded && !install.installed && !installDismissed && (
        <InstallBanner
          canPrompt={install.canPrompt}
          ios={install.ios}
          onInstall={install.prompt}
          onDismiss={dismissInstall}
        />
      )}
      <ModeChips mode={mode} onChange={setMode} />
      <View style={styles.center}>
        <SparkButton onPress={spark} loading={loading} />
      </View>
      <View style={styles.controls}>
        {mode === 'brainstorm' && <TopicBox value={topic} onChange={setTopic} />}
        {mode === 'oracle' && <OracleChips value={oracleType} onChange={setOracleType} />}
        <ChipsStrip
          filters={filters}
          onToggleType={toggleType}
          onVibe={setVibe}
          onWorkSafe={setWorkSafe}
          showTypes={mode === 'sparks'}
        />
        {hasKey && mode === 'sparks' && <ContextBox value={context} onChange={setContext} />}
        <SourceStatus hasKey={hasKey} problem={problem} mode={mode} />
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
});
