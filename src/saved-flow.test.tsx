import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { removeApiKey } from './storage/secureKey';
import { configureAi } from './store/ai';
import { useSavedStore } from './store/savedStore';
import { useSettingsStore } from './store/settingsStore';
import { useSparkStore } from './store/sparkStore';
import { strings } from './strings';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

// Milestone 4 end to end: save, show again, delete, persistence, settings, device extras.

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await removeApiKey();
  configureAi(null, '');
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  useSparkStore.setState(useSparkStore.getInitialState(), true);
  useSavedStore.setState(useSavedStore.getInitialState(), true);
});

async function renderApp(initialUrl = '/') {
  const result = await renderRouter('./app', { initialUrl });
  await waitFor(() => {
    expect(useSettingsStore.getState().hydrated).toBe(true);
    expect(useSavedStore.getState().hydrated).toBe(true);
  });
  return result;
}

/** Let fire-and-forget storage writes finish (promises only: the router test helper fakes timers). */
async function settle() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

function button(name: string) {
  return screen.getByRole('button', { name });
}

function currentText() {
  const current = useSparkStore.getState().current;
  if (!current) throw new Error('no card');
  return current.text;
}

describe('saving sparks', () => {
  it('stars a card, shows it in Saved, shows it again and deletes it', async () => {
    await renderApp();
    await fireEvent.press(button(strings.home.sparkButton));
    const text = currentText();

    await fireEvent.press(button(strings.card.save));
    expect(button(strings.card.unsave)).toBeSelected();
    expect(useSavedStore.getState().saved.map((s) => s.text)).toEqual([text]);

    await fireEvent.press(button(strings.card.close));
    await fireEvent.press(screen.getByText(strings.nav.saved));
    expect(screen).toHavePathname('/saved');
    expect(screen.getByText(text)).toBeOnTheScreen();

    // Tap: back to Home with that card showing.
    await fireEvent.press(button(text));
    expect(screen).toHavePathname('/');
    expect(screen.getByText(text)).toBeOnTheScreen();
    expect(button(strings.card.unsave)).toBeOnTheScreen();

    // Long-press in Saved, then Delete.
    await fireEvent.press(button(strings.card.close));
    await fireEvent.press(screen.getByText(strings.nav.saved));
    await fireEvent(button(text), 'longPress');
    await fireEvent.press(button(strings.saved.delete));
    expect(screen.getByText(strings.saved.empty)).toBeOnTheScreen();
    expect(useSavedStore.getState().saved).toEqual([]);
  });

  it('unstars from the card', async () => {
    await renderApp();
    await fireEvent.press(button(strings.home.sparkButton));
    await fireEvent.press(button(strings.card.save));
    await fireEvent.press(button(strings.card.unsave));
    expect(button(strings.card.save)).not.toBeSelected();
    expect(useSavedStore.getState().saved).toEqual([]);
  });

  it('keeps saved sparks across a restart', async () => {
    await renderApp();
    await fireEvent.press(button(strings.home.sparkButton));
    const text = currentText();
    await fireEvent.press(button(strings.card.save));
    await settle();
    expect(await AsyncStorage.getItem('stormbrainer.saved')).toContain(text);
    await screen.unmount();

    // "Restart": fresh in-memory state, same storage.
    useSavedStore.setState(useSavedStore.getInitialState(), true);
    await renderApp('/saved');
    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it('shows an empty state', async () => {
    await renderApp('/saved');
    expect(screen.getByText(strings.saved.empty)).toBeOnTheScreen();
  });
});

describe('settings for sparks', () => {
  it('remembers the work-safe default and applies it at startup', async () => {
    await renderApp('/settings');
    await fireEvent(
      screen.getByRole('switch', { name: strings.settings.workSafeDefault }),
      'valueChange',
      true,
    );
    expect(useSparkStore.getState().filters.workSafe).toBe(true);
    await settle();
    expect(await AsyncStorage.getItem('stormbrainer.workSafeDefault')).toBe('true');
    await screen.unmount();

    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSparkStore.setState(useSparkStore.getInitialState(), true);
    await renderApp();
    await waitFor(() => expect(useSparkStore.getState().filters.workSafe).toBe(true));
    expect(screen.getByRole('switch', { name: strings.workSafe })).toHaveProp('value', true);
  });

  it('clears the history', async () => {
    await renderApp();
    await fireEvent.press(button(strings.home.sparkButton));
    expect(useSparkStore.getState().history.seenIds).toHaveLength(1);
    await fireEvent.press(button(strings.card.close));
    await fireEvent.press(screen.getByText(strings.nav.settings));
    await fireEvent.press(button(strings.settings.clearHistory));
    expect(useSparkStore.getState().history.seenIds).toEqual([]);
    expect(screen.getByText(strings.settings.historyCleared)).toBeOnTheScreen();
  });
});

describe('device extras', () => {
  it('buzzes on Spark and keeps the screen awake only while a card shows', async () => {
    await renderApp();
    expect(useKeepAwake).not.toHaveBeenCalled();

    await fireEvent.press(button(strings.home.sparkButton));
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(useKeepAwake).toHaveBeenCalled();

    await fireEvent.press(button(strings.card.next));
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
  });
});
