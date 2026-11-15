import { fireEvent, render, screen } from '@testing-library/react-native';

import { strings } from '../strings';
import { InstallBanner } from './InstallBanner';

describe('InstallBanner', () => {
  it('opens the browser prompt when there is one', async () => {
    const onInstall = jest.fn(async () => 'accepted' as const);
    await render(
      <InstallBanner canPrompt ios={false} onInstall={onInstall} onDismiss={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: strings.install.button }));
    expect(onInstall).toHaveBeenCalled();
    expect(screen.queryByText(strings.install.stepsOther)).not.toBeOnTheScreen();
  });

  it('shows the steps where the browser has no prompt', async () => {
    await render(
      <InstallBanner canPrompt={false} ios={false} onInstall={jest.fn()} onDismiss={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: strings.install.button }));
    expect(screen.getByText(strings.install.stepsOther)).toBeOnTheScreen();
  });

  it('shows the iPhone steps on iOS', async () => {
    await render(
      <InstallBanner canPrompt={false} ios onInstall={jest.fn()} onDismiss={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: strings.install.button }));
    expect(screen.getByText(strings.install.stepsIos)).toBeOnTheScreen();
  });

  it('can be dismissed', async () => {
    const onDismiss = jest.fn();
    await render(
      <InstallBanner canPrompt ios={false} onInstall={jest.fn()} onDismiss={onDismiss} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: strings.install.dismiss }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
