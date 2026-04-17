import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/test';
import { Contact } from '../../../restaurante-site/src/components/Contact';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';

const meta: Meta<typeof Contact> = {
  title: 'Projects/Restaurante Site/Forms/Contact',
  component: Contact,
  decorators: [projectFormDecorator('restaurante-site')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof Contact>;

async function fillContactForm(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByLabelText('Nome *'), 'Joao Restaurante');
  await userEvent.type(canvas.getByLabelText('E-mail *'), 'joao@restaurante.com');
  await userEvent.type(canvas.getByLabelText('Telefone'), '11999887766');
  await userEvent.type(canvas.getByLabelText('Estabelecimento *'), 'Restaurante Exemplo');
  await userEvent.type(
    canvas.getByLabelText('Mensagem *'),
    'Gostaria de agendar uma demonstracao.',
  );
}

export const Default: Story = {};

export const Error: Story = {
  play: async ({ canvasElement }) => {
    const originalFetch = window.fetch;
    window.fetch = (async () =>
      ({
        ok: false,
        json: async () => ({ error: 'Falha simulada' }),
      }) as Response) as typeof window.fetch;

    try {
      const canvas = within(canvasElement);
      await fillContactForm(canvasElement);
      await userEvent.click(canvas.getByText('Enviar mensagem'));
    } finally {
      window.fetch = originalFetch;
    }
  },
};

export const Loading: Story = {
  play: async ({ canvasElement }) => {
    const originalFetch = window.fetch;
    window.fetch = (async () => new Promise<Response>(() => {})) as typeof window.fetch;

    const canvas = within(canvasElement);
    await fillContactForm(canvasElement);
    await userEvent.click(canvas.getByText('Enviar mensagem'));

    window.fetch = originalFetch;
  },
};

export const Disabled: Story = {
  render: () => withDisabledFieldset(() => <Contact />),
};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    await fillContactForm(canvasElement);
  },
};
