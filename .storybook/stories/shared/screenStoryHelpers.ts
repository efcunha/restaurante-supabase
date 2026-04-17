import { userEvent, within } from '@storybook/test';
import { setStorybookScenario } from '../../shims/storybookScenario';

type StorybookScenario = 'default' | 'filled' | 'empty' | 'loading' | 'error';

interface NavigationMock {
  navigate: (...args: unknown[]) => void;
  goBack: (...args: unknown[]) => void;
  replace: (...args: unknown[]) => void;
  reset: (...args: unknown[]) => void;
  push: (...args: unknown[]) => void;
  pop: (...args: unknown[]) => void;
}

export function createNavigationMock(): NavigationMock {
  return {
    navigate: () => undefined,
    goBack: () => undefined,
    replace: () => undefined,
    reset: () => undefined,
    push: () => undefined,
    pop: () => undefined,
  };
}

export function applyStorybookScenario(nextScenario: StorybookScenario): void {
  setStorybookScenario(nextScenario);
}

export async function fillInputsByIndex(
  canvasElement: HTMLElement,
  values: string[],
): Promise<void> {
  const inputs = Array.from(canvasElement.querySelectorAll('input')) as HTMLInputElement[];

  for (let index = 0; index < values.length; index += 1) {
    const target = inputs[index];
    if (!target) {
      throw new Error(`Input index ${index} not found.`);
    }

    await userEvent.clear(target);
    if (values[index]) {
      await userEvent.type(target, values[index]);
    }
  }
}

export async function clickButtonByText(canvasElement: HTMLElement, label: string): Promise<void> {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByText(label));
}
