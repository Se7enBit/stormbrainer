import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '../strings';
import { InstallPrompt } from './InstallPrompt';

function props(overrides: Partial<Parameters<typeof InstallPrompt>[0]> = {}) {
  return {
    canPrompt: true,
    ios: false,
    onInstall: jest.fn(async () => 'accepted' as const),
    onClose: jest.fn(),
    onNotNow: jest.fn(),
    ...overrides,
  };
}

describe('InstallPrompt', () => {
  it('opens the browser prompt when there is one', async () => {
    const p = props();
    await render(<InstallPrompt {...p} />);
    expect(screen.getByText(strings.install.title)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: strings.install.button }));
    expect(p.onInstall).toHaveBeenCalled();
    expect(screen.queryByText(strings.install.stepsOther)).not.toBeOnTheScreen();
  });

  it('shows the steps where the browser has no prompt', async () => {
    await render(<InstallPrompt {...props({ canPrompt: false })} />);
    await fireEvent.press(screen.getByRole('button', { name: strings.install.button }));
    expect(screen.getByText(strings.install.stepsOther)).toBeOnTheScreen();
  });

  it('shows the iPhone steps on iOS', async () => {
    await render(<InstallPrompt {...props({ canPrompt: false, ios: true })} />);
    await fireEvent.press(screen.getByRole('button', { name: strings.install.button }));
    expect(screen.getByText(strings.install.stepsIos)).toBeOnTheScreen();
  });

  it('has a close button (this visit) and Not now (remembered), which do different things', async () => {
    const p = props();
    await render(<InstallPrompt {...p} />);
    await fireEvent.press(screen.getByRole('button', { name: strings.install.close }));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    expect(p.onNotNow).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: strings.install.dismiss }));
    expect(p.onNotNow).toHaveBeenCalledTimes(1);
  });
});
