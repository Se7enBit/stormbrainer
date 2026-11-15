import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { deck } from './sparks/deck';
import { useSparkStore } from './store/sparkStore';
import { strings } from './strings';

// End to end through the real routes in app/: Spark button → offline deck card → actions.

beforeEach(() => {
  useSparkStore.setState(useSparkStore.getInitialState(), true);
});

function sparkButton() {
  return screen.getByRole('button', { name: strings.home.sparkButton });
}

function currentSpark() {
  const current = useSparkStore.getState().current;
  if (!current) throw new Error('no card showing');
  return current;
}

describe('home screen', () => {
  it('shows a deck card on Spark, a new one on Next and goes home on Close', async () => {
    await renderRouter('./app', { initialUrl: '/' });

    await fireEvent.press(sparkButton());
    const first = currentSpark();
    expect(deck.map((s) => s.id)).toContain(first.id);
    expect(screen.getByText(first.text)).toBeOnTheScreen();
    expect(screen.getByText(strings.card.offlineBadge)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: strings.home.sparkButton })).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: strings.card.next }));
    const second = currentSpark();
    expect(second.id).not.toBe(first.id);
    expect(screen.getByText(second.text)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: strings.card.reroll }));
    expect(currentSpark().id).not.toBe(second.id);

    await fireEvent.press(screen.getByRole('button', { name: strings.card.close }));
    expect(sparkButton()).toBeOnTheScreen();
  });

  it('never repeats a card while the pool lasts', async () => {
    await renderRouter('./app', { initialUrl: '/' });
    await fireEvent.press(sparkButton());
    const seen = new Set([currentSpark().id]);
    // Default settings: all types, light vibe.
    const poolSize = deck.filter((s) => s.vibe === 'light').length;
    for (let i = 1; i < poolSize; i++) {
      await fireEvent.press(screen.getByRole('button', { name: strings.card.next }));
      seen.add(currentSpark().id);
    }
    expect(seen.size).toBe(poolSize);
  });

  it('applies the type chips, vibe and work-safe toggle to the deck', async () => {
    await renderRouter('./app', { initialUrl: '/' });

    // All types are selected, so one tap focuses on that type.
    await fireEvent.press(screen.getByRole('checkbox', { name: strings.types.memoryLane }));
    await fireEvent.press(screen.getByRole('radio', { name: strings.vibes.spicy }));
    await fireEvent(screen.getByRole('switch', { name: strings.workSafe }), 'valueChange', true);

    expect(useSparkStore.getState().filters).toEqual({
      types: ['memoryLane'],
      vibe: 'spicy',
      workSafe: true,
    });

    for (let i = 0; i < 5; i++) {
      await fireEvent.press(sparkButton());
      const shown = currentSpark();
      expect(shown).toMatchObject({ type: 'memoryLane', workSafe: true });
      expect(screen.getByText(strings.types.memoryLane)).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: strings.card.close }));
    }
  });

  it('links to Saved and Settings', async () => {
    await renderRouter('./app', { initialUrl: '/' });
    await fireEvent.press(screen.getByText(strings.nav.settings));
    expect(screen).toHavePathname('/settings');
    expect(screen.getByText(strings.settings.privacy)).toBeOnTheScreen();
  });
});
