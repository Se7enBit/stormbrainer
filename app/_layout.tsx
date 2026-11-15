import { DarkTheme, Link, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { useSavedStore } from '../src/store/savedStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useSparkStore } from '../src/store/sparkStore';
import { strings } from '../src/strings';
import { colors, spacing } from '../src/ui/theme';

const theme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

// A deep link to /saved or /settings (e.g. a refreshed web preview) still gets Home underneath,
// so the back button works.
export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  // Read stored settings and saved sparks once at startup.
  useEffect(() => {
    void useSettingsStore
      .getState()
      .load()
      .then(() =>
        useSparkStore.getState().setWorkSafe(useSettingsStore.getState().workSafeDefault),
      );
    void useSavedStore.getState().load();
  }, []);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: strings.appName, headerRight: () => <HeaderLinks /> }}
        />
        <Stack.Screen name="saved" options={{ title: strings.saved.title }} />
        <Stack.Screen name="settings" options={{ title: strings.settings.title }} />
      </Stack>
    </ThemeProvider>
  );
}

function HeaderLinks() {
  return (
    <View style={styles.links}>
      <Link href="/saved" style={styles.link}>
        {strings.nav.saved}
      </Link>
      <Link href="/settings" style={styles.link}>
        {strings.nav.settings}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  link: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
});
