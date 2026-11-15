import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Spark } from '../sparks/types';
import { strings } from '../strings';
import { SparkCard } from './SparkCard';

async function renderCard(spark: Spark) {
  const handlers = { onNext: jest.fn(), onReroll: jest.fn(), onClose: jest.fn() };
  await render(<SparkCard spark={spark} {...handlers} />);
  return handlers;
}

const base = { id: 't1', source: 'deck', vibe: 'light', workSafe: true } as const;

describe('SparkCard', () => {
  it('shows a debate with two labelled sides', async () => {
    await renderCard({ ...base, type: 'debate', text: 'Cats or dogs?', options: ['Cats', 'Dogs'] });
    expect(screen.getByText('Debate')).toBeOnTheScreen();
    expect(screen.getByText('Cats or dogs?')).toBeOnTheScreen();
    expect(screen.getByText('A')).toBeOnTheScreen();
    expect(screen.getByText('Cats')).toBeOnTheScreen();
    expect(screen.getByText(strings.card.versus)).toBeOnTheScreen();
    expect(screen.getByText('B')).toBeOnTheScreen();
    expect(screen.getByText('Dogs')).toBeOnTheScreen();
  });

  it('shows a hot take with the agree/disagree hint', async () => {
    await renderCard({ ...base, type: 'hotTake', text: 'Cereal is a soup.' });
    expect(screen.getByText('Hot take')).toBeOnTheScreen();
    expect(screen.getByText(strings.card.hotTakeHint)).toBeOnTheScreen();
  });

  it('shows a memory-lane question inviting stories', async () => {
    await renderCard({ ...base, type: 'memoryLane', text: 'Worst haircut anyone here had?' });
    expect(screen.getByText('Worst haircut anyone here had?')).toBeOnTheScreen();
    expect(screen.getByText(strings.card.memoryLaneHint)).toBeOnTheScreen();
  });

  it('shows a would-you-rather with two unlabelled options', async () => {
    await renderCard({
      ...base,
      type: 'whatIf',
      text: 'Ocean or space?',
      options: ['Ocean', 'Space'],
    });
    expect(screen.getByText('Ocean')).toBeOnTheScreen();
    expect(screen.getByText(strings.card.or)).toBeOnTheScreen();
    expect(screen.queryByText('A')).not.toBeOnTheScreen();
  });

  it('shows a plain hypothetical without options', async () => {
    await renderCard({ ...base, type: 'whatIf', text: 'What if you lived in a movie?' });
    expect(screen.getByText('What if you lived in a movie?')).toBeOnTheScreen();
    expect(screen.queryByText(strings.card.or)).not.toBeOnTheScreen();
  });

  it('shows the offline deck badge only for deck sparks', async () => {
    await renderCard({ ...base, type: 'hotTake', text: 'From the deck.' });
    expect(screen.getByText(strings.card.offlineBadge)).toBeOnTheScreen();
    await screen.unmount();
    await renderCard({ ...base, source: 'ai', type: 'hotTake', text: 'From the AI.' });
    expect(screen.queryByText(strings.card.offlineBadge)).not.toBeOnTheScreen();
  });

  it('wires the card actions', async () => {
    const handlers = await renderCard({ ...base, type: 'hotTake', text: 'Board games win.' });
    await fireEvent.press(screen.getByRole('button', { name: strings.card.next }));
    await fireEvent.press(screen.getByRole('button', { name: strings.card.reroll }));
    await fireEvent.press(screen.getByRole('button', { name: strings.card.close }));
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
    expect(handlers.onReroll).toHaveBeenCalledTimes(1);
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });
});
