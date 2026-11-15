import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import { DEFAULT_GEMINI_MODEL } from './ai/gemini';
import { loadApiKey, removeApiKey, saveApiKey } from './storage/secureKey';
import { configureAi } from './store/ai';
import { useSettingsStore } from './store/settingsStore';
import { useSparkStore } from './store/sparkStore';
import { strings } from './strings';

// End to end through the real routes, with fetch mocked: the real API is never called.

const KEY = 'AIza-test-key-not-real';
const fetchMock = jest.fn();

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function sparksReply(texts: string[]) {
  const sparks = texts.map((text) => ({ type: 'hotTake', text }));
  return reply(200, {
    candidates: [{ content: { parts: [{ text: JSON.stringify({ sparks }) }] } }],
  });
}

const INVALID_KEY = reply(400, {
  error: { message: 'API key not valid.', details: [{ reason: 'API_KEY_INVALID' }] },
});

function calls(): { url: string; init: RequestInit }[] {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    init: init as RequestInit,
  }));
}

async function renderApp(initialUrl = '/') {
  const result = await renderRouter('./app', { initialUrl });
  await waitFor(() => expect(useSettingsStore.getState().hydrated).toBe(true));
  return result;
}

function sparkButton() {
  return screen.getByRole('button', { name: strings.home.sparkButton });
}

beforeEach(async () => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await AsyncStorage.clear();
  await removeApiKey();
  configureAi(null, '');
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  useSparkStore.setState(useSparkStore.getInitialState(), true);
});

describe('Settings: API key', () => {
  it('saves, tests and removes a key', async () => {
    fetchMock.mockResolvedValue(sparksReply(['Toast is underrated.']));
    await renderApp('/settings');

    await fireEvent.changeText(screen.getByLabelText(strings.settings.keyInputLabel), `  ${KEY} `);
    await fireEvent.press(screen.getByRole('button', { name: strings.settings.saveKey }));

    expect(await screen.findByText(strings.settings.keyStatus.ok)).toBeOnTheScreen();
    expect(await loadApiKey()).toBe(KEY);
    const [test] = calls();
    // Test key asks for one real spark.
    expect(test?.url).toBe(
      `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`,
    );
    expect(test?.url).not.toContain(KEY);
    expect(test?.init.headers).toEqual({
      'x-goog-api-key': KEY,
      'content-type': 'application/json',
    });
    // The key is not kept in app state or shown anywhere.
    expect(JSON.stringify(useSettingsStore.getState())).not.toContain(KEY);
    expect(screen.queryByText(new RegExp(KEY))).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: strings.settings.removeKey }));
    expect(await screen.findByLabelText(strings.settings.keyInputLabel)).toBeOnTheScreen();
    expect(await loadApiKey()).toBeNull();
  });

  it('shows a clear message for a rejected key', async () => {
    fetchMock.mockResolvedValue(INVALID_KEY);
    await renderApp('/settings');
    await fireEvent.changeText(screen.getByLabelText(strings.settings.keyInputLabel), KEY);
    await fireEvent.press(screen.getByRole('button', { name: strings.settings.saveKey }));
    expect(await screen.findByText(strings.aiErrors.invalidKey)).toBeOnTheScreen();
    // Google's own words help when the cause is not obvious.
    expect(screen.getByText(`${strings.settings.details} API key not valid.`)).toBeOnTheScreen();
  });

  it('fails Test key when Gemini cannot write a spark, with the reason', async () => {
    fetchMock.mockResolvedValue(
      reply(400, {
        error: { status: 'INVALID_ARGUMENT', message: 'Unknown field thinkingConfig.' },
      }),
    );
    await renderApp('/settings');
    await fireEvent.changeText(screen.getByLabelText(strings.settings.keyInputLabel), KEY);
    await fireEvent.press(screen.getByRole('button', { name: strings.settings.saveKey }));
    expect(await screen.findByText(strings.aiErrors.badResponse)).toBeOnTheScreen();
    expect(
      screen.getByText(`${strings.settings.details} Unknown field thinkingConfig.`),
    ).toBeOnTheScreen();
  });

  it('uses the model id from Advanced', async () => {
    await saveApiKey(KEY);
    fetchMock.mockResolvedValue(sparksReply(['Toast is underrated.']));
    await renderApp('/settings');

    const input = screen.getByLabelText(strings.settings.modelLabel);
    await fireEvent.changeText(input, 'gemini-custom');
    await fireEvent(input, 'blur');
    await waitFor(() => expect(useSettingsStore.getState().model).toBe('gemini-custom'));
    expect(await AsyncStorage.getItem('stormbrainer.model')).toBe('gemini-custom');

    await fireEvent.press(screen.getByRole('button', { name: strings.settings.testKey }));
    await screen.findByText(strings.settings.keyStatus.ok);
    expect(calls().at(-1)?.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-custom:generateContent',
    );
  });
});

describe('Home with a key', () => {
  it('fetches AI sparks before the first tap, labels them Gemini and sends the context', async () => {
    await saveApiKey(KEY);
    fetchMock.mockResolvedValue(
      sparksReply(['AI one.', 'AI two.', 'AI three.', 'AI four.', 'AI five.']),
    );
    await renderApp();
    expect(screen.getByText(strings.home.sourceAi)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: strings.home.contextAdd }));
    await fireEvent.changeText(screen.getByLabelText(strings.home.contextLabel), 'team offsite');
    await fireEvent.press(screen.getByRole('button', { name: strings.home.contextDone }));

    // Home already asked Gemini (prefetch), so the first tap is an AI card right away.
    await waitFor(() =>
      expect(calls().some((c) => String(c.init.body).includes('team offsite'))).toBe(true),
    );
    const requests = calls().length;
    await fireEvent.press(sparkButton());
    expect(await screen.findByText('AI one.')).toBeOnTheScreen();
    expect(screen.getByText(strings.card.aiBadge)).toBeOnTheScreen();
    expect(screen.queryByText(strings.card.offlineBadge)).not.toBeOnTheScreen();
    expect(useSparkStore.getState().current?.source).toBe('ai');

    const [generate] = calls();
    expect(generate?.url).toContain(`${DEFAULT_GEMINI_MODEL}:generateContent`);
    expect(generate?.url).not.toContain(KEY);

    // The next taps come from the queue: no new request.
    await fireEvent.press(screen.getByRole('button', { name: strings.card.next }));
    expect(await screen.findByText('AI two.')).toBeOnTheScreen();
    expect(calls()).toHaveLength(requests);
  });

  it('says why when it falls back to the deck (quota)', async () => {
    await saveApiKey(KEY);
    fetchMock.mockResolvedValue(
      reply(429, { error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.' } }),
    );
    await renderApp();

    await fireEvent.press(sparkButton());
    expect(await screen.findByText(strings.card.offlineBadge)).toBeOnTheScreen();
    expect(useSparkStore.getState().aiProblem).toEqual({
      kind: 'quota',
      detail: 'Quota exceeded.',
    });
    expect(useSparkStore.getState().current?.source).toBe('deck');

    await fireEvent.press(screen.getByRole('button', { name: strings.card.close }));
    expect(
      screen.getByText(
        `${strings.home.sourceProblem} ${strings.aiReasons.quota} ${strings.home.sourceFix}`,
      ),
    ).toBeOnTheScreen();
    expect(useSettingsStore.getState().lastProblem).toEqual({
      kind: 'quota',
      detail: 'Quota exceeded.',
    });
  });

  it('pauses AI and points to Settings when the key is rejected', async () => {
    await saveApiKey(KEY);
    fetchMock.mockResolvedValue(INVALID_KEY);
    await renderApp();

    await fireEvent.press(sparkButton());
    expect(await screen.findByText(strings.card.offlineBadge)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: strings.card.close }));
    expect(
      screen.getByText(
        `${strings.home.sourceProblem} ${strings.aiReasons.invalidKey} ${strings.home.sourceFix}`,
      ),
    ).toBeOnTheScreen();
    expect(useSettingsStore.getState().keyStatus).toBe('invalidKey');
  });
});

describe('Home without a key', () => {
  it('uses only the deck and hides the context box', async () => {
    await renderApp();
    expect(screen.queryByRole('button', { name: strings.home.contextAdd })).not.toBeOnTheScreen();
    expect(screen.getByText(strings.home.sourceNoKey)).toBeOnTheScreen();
    await fireEvent.press(sparkButton());
    expect(await screen.findByText(strings.card.offlineBadge)).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
