import { userEvent, within } from '@storybook/test';

function getInputs(canvasElement: HTMLElement): HTMLInputElement[] {
  return Array.from(canvasElement.querySelectorAll('input')) as HTMLInputElement[];
}

async function typeIntoInputs(inputs: HTMLInputElement[], values: string[]): Promise<void> {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const target = inputs[index];
    if (!target) {
      throw new Error(`Input index ${index} not found while typing form values.`);
    }
    await userEvent.type(target, value);
  }
}

export async function triggerValidationError(
  canvasElement: HTMLElement,
  submitLabel: string,
): Promise<void> {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByText(submitLabel));
}

export async function fillLogin(canvasElement: HTMLElement): Promise<void> {
  await typeIntoInputs(getInputs(canvasElement), ['usuario@empresa.com', 'senhaSegura123']);
}

export async function fillCadastro(canvasElement: HTMLElement): Promise<void> {
  await typeIntoInputs(getInputs(canvasElement), [
    'Maria Silva',
    'maria@empresa.com',
    '11999887766',
    'senhaSegura123',
    'senhaSegura123',
  ]);
}

export async function fillEndereco(canvasElement: HTMLElement): Promise<void> {
  await typeIntoInputs(getInputs(canvasElement), [
    '01310100',
    'Av Paulista',
    '1000',
    'Bela Vista',
    'Sao Paulo',
    'SP',
    'Sala 101',
  ]);
}

export async function fillCheckout(canvasElement: HTMLElement): Promise<void> {
  await typeIntoInputs(getInputs(canvasElement), [
    'Joao Santos',
    'joao@email.com',
    'Sem cebola, por favor',
  ]);
}

export async function triggerLoading(
  canvasElement: HTMLElement,
  submitLabel: string,
  fillForm: (root: HTMLElement) => Promise<void>,
): Promise<void> {
  const canvas = within(canvasElement);
  await fillForm(canvasElement);
  await userEvent.click(canvas.getByText(submitLabel));
}
