import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { removeApiKey, saveApiKey } from './storage/secureKey';
import { configureAi } from './store/ai';
import { useSavedStore } from './store/savedStore';
import { useSettingsStore } from './store/settingsStore';
import { useSparkStore } from './store/sparkStore';
import { strings } from './strings';

// Oracle mode end to end, with fetch mocked.

const fetchMock = jest.fn();

function reply(type: string, texts: string[]) {
  const sparks = texts.map((text) => ({ type, text }));
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ sparks }) }] } }],
    }),
  };
}

beforeEach(async () => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await AsyncStorage.clear();
  await removeApiKey();
  configureAi(null, '');
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  useSparkStore.setState(useSparkStore.getInitialState(), true);
  useSavedStore.setState(useSavedStore.getInitialState(), true);
});

async function renderApp() {
  await renderRouter('./app', { initialUrl: '/' });
  await waitFor(() => expect(useSettingsStore.getState().hydrated).toBe(true));
}

const radio = (name: string) => screen.getByRole('radio', { name });
const sparkButton = () => screen.getByRole('button', { name: strings.home.sparkButton });

describe('Oracle mode', () => {
  it('has Ask and Fortune chips with a hint, and draws from its deck without a key', async () => {
    await renderApp();
    await fireEvent.press(radio(strings.modes.oracle));
    expect(radio(strings.oracle.ask)).toBeSelected();
    expect(screen.getByText(strings.oracle.askHint)).toBeOnTheScreen();
    expect(screen.queryByRole('checkbox', { name: strings.types.debate })).not.toBeOnTheScreen();
    expect(screen.queryByLabelText(strings.home.topicLabel)).not.toBeOnTheScreen();

    await fireEvent.press(sparkButton());
    expect(useSparkStore.getState().current).toMatchObject({ type: 'answer', source: 'deck' });
    expect(screen.getByText(strings.types.answer)).toBeOnTheScreen();
    expect(screen.getByText(strings.card.answerHint)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: strings.card.close }));
    await fireEvent.press(radio(strings.oracle.fortune));
    expect(screen.getByText(strings.oracle.fortuneHint)).toBeOnTheScreen();
    await fireEvent.press(sparkButton());
    expect(useSparkStore.getState().current).toMatchObject({ type: 'fortune', source: 'deck' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks Gemini for fortunes in the chosen tone with a key', async () => {
    await saveApiKey('AIza-test-key-not-real');
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const body = String(init.body);
      if (body.includes('Write 5 fortunes'))
        return reply('fortune', ['A parade of good news is coming.']);
      if (body.includes('Write 5 answers')) return reply('answer', ['Yes, with confetti.']);
      return reply('hotTake', ['Soup is a meal.']);
    });
    await renderApp();
    await fireEvent.press(radio(strings.modes.oracle));
    await fireEvent.press(radio(strings.oracle.fortune));
    await fireEvent.press(radio(strings.vibes.deep));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) => {
          const body = String((init as RequestInit).body);
          return body.includes('Write 5 fortunes') && body.includes('mystical');
        }),
      ).toBe(true),
    );
    await fireEvent.press(sparkButton());
    expect(await screen.findByText('A parade of good news is coming.')).toBeOnTheScreen();
    expect(screen.getByText(strings.card.aiBadge)).toBeOnTheScreen();
    expect(useSparkStore.getState().current).toMatchObject({ type: 'fortune', source: 'ai' });
  });
});
