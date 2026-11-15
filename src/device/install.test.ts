import { createInstallController, type InstallWindow } from './install';

function fakeWindow({
  standalone = false,
  userAgent = 'Mozilla/5.0 (Linux; Android 15) Chrome',
} = {}) {
  const handlers: Record<string, (event: Event) => void> = {};
  const win: InstallWindow = {
    addEventListener: (type, listener) => {
      handlers[type] = listener;
    },
    matchMedia: () => ({ matches: standalone }),
    navigator: { userAgent },
  };
  const fire = (type: string, event: Partial<Event> & object = {}) =>
    handlers[type]?.({ preventDefault: jest.fn(), ...event } as unknown as Event);
  return { win, fire };
}

function promptEvent(outcome: 'accepted' | 'dismissed') {
  return {
    preventDefault: jest.fn(),
    prompt: jest.fn(async () => {}),
    userChoice: Promise.resolve({ outcome }),
  };
}

describe('install controller', () => {
  it('is already installed when running standalone', () => {
    const { win } = fakeWindow({ standalone: true });
    expect(createInstallController(win).getState().installed).toBe(true);
  });

  it('keeps the browser prompt for our button and reports the outcome', async () => {
    const { win, fire } = fakeWindow();
    const controller = createInstallController(win);
    const listener = jest.fn();
    controller.subscribe(listener);
    expect(controller.getState()).toEqual({ installed: false, canPrompt: false, ios: false });
    expect(await controller.prompt()).toBe('unavailable');

    const event = promptEvent('accepted');
    fire('beforeinstallprompt', event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(controller.getState().canPrompt).toBe(true);
    expect(listener).toHaveBeenCalled();

    expect(await controller.prompt()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(controller.getState()).toMatchObject({ installed: true, canPrompt: false });
  });

  it('can be dismissed, and the used prompt is not offered again', async () => {
    const { win, fire } = fakeWindow();
    const controller = createInstallController(win);
    fire('beforeinstallprompt', promptEvent('dismissed'));
    expect(await controller.prompt()).toBe('dismissed');
    expect(controller.getState()).toMatchObject({ installed: false, canPrompt: false });
    expect(await controller.prompt()).toBe('unavailable');
  });

  it('picks up a prompt the page caught before the app loaded', async () => {
    const { win } = fakeWindow();
    const event = promptEvent('accepted');
    win.__installPrompt = event as unknown as Event;
    const controller = createInstallController(win);
    expect(controller.getState().canPrompt).toBe(true);
    expect(await controller.prompt()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalled();
  });

  it('notices an install from the browser menu', () => {
    const { win, fire } = fakeWindow();
    const controller = createInstallController(win);
    fire('appinstalled');
    expect(controller.getState().installed).toBe(true);
  });

  it('recognises iPhone Safari, which has no prompt', () => {
    const { win } = fakeWindow({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0) Safari' });
    expect(createInstallController(win).getState().ios).toBe(true);
  });
});
