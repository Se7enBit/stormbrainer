import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { BRAINSTORM_INSTRUCTION } from './ai/prompt';
import { removeApiKey, saveApiKey } from './storage/secureKey';
import { configureAi } from './store/ai';
import { useSavedStore } from './store/savedStore';
import { useSettingsStore } from './store/settingsStore';
import { useSparkStore } from './store/sparkStore';
import { strings } from './strings';

// Brainstorm mode end to end, with fetch mocked.

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

const ideasReply = (texts: string[]) => reply('idea', texts);
const sparksReply = (texts: string[]) => reply('hotTake', texts);

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

describe('Brainstorm mode', () => {
  it('switches with the mode chips: topic box instead of type chips', async () => {
    await renderApp();
    expect(radio(strings.modes.sparks)).toBeSelected();
    expect(screen.getByRole('checkbox', { name: strings.types.debate })).toBeOnTheScreen();
    expect(screen.queryByLabelText(strings.home.topicLabel)).not.toBeOnTheScreen();

    await fireEvent.press(radio(strings.modes.brainstorm));
    expect(radio(strings.modes.brainstorm)).toBeSelected();
    expect(screen.getByLabelText(strings.home.topicLabel)).toBeOnTheScreen();
    expect(screen.queryByRole('checkbox', { name: strings.types.debate })).not.toBeOnTheScreen();
    // Vibe and work-safe still apply.
    expect(radio(strings.vibes.spicy)).toBeOnTheScreen();
  });

  it('gives creativity prompts from the deck without a key, and says a key adds topic ideas', async () => {
    await renderApp();
    await fireEvent.press(radio(strings.modes.brainstorm));
    expect(screen.getByText(strings.home.topicNeedsKey)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: strings.home.sparkButton }));
    expect(useSparkStore.getState().current).toMatchObject({ type: 'idea', source: 'deck' });
    expect(screen.getByText(strings.types.idea)).toBeOnTheScreen();
    expect(screen.getByText(strings.card.ideaHint)).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks Gemini for ideas about the topic with a key', async () => {
    await saveApiKey('AIza-test-key-not-real');
    // Like Gemini: ideas for Brainstorm requests, conversation sparks otherwise.
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      String(init.body).includes('You help a person or a group brainstorm')
        ? ideasReply([
            'Host a "bad ideas only" warm-up.',
            'Cook lunch together.',
            'Walk-and-talk sessions.',
          ])
        : sparksReply(['Soup is a meal.']),
    );
    await renderApp();
    await fireEvent.press(radio(strings.modes.brainstorm));
    await fireEvent.changeText(
      screen.getByLabelText(strings.home.topicLabel),
      'team offsite theme',
    );

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, init]) =>
          String((init as RequestInit).body).includes('team offsite theme'),
        ),
      ).toBe(true),
    );
    const body = JSON.parse(
      String(
        (
          fetchMock.mock.calls.find(([, init]) =>
            String((init as RequestInit).body).includes('team offsite theme'),
          )?.[1] as RequestInit
        ).body,
      ),
    );
    expect(body.systemInstruction.parts[0].text).toBe(BRAINSTORM_INSTRUCTION);

    await fireEvent.press(screen.getByRole('button', { name: strings.home.sparkButton }));
    expect(await screen.findByText('Host a "bad ideas only" warm-up.')).toBeOnTheScreen();
    expect(screen.getByText(strings.card.aiBadge)).toBeOnTheScreen();
    expect(useSparkStore.getState().current).toMatchObject({ type: 'idea', source: 'ai' });
  });
});
