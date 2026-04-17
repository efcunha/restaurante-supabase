import type { Meta, StoryObj } from '@storybook/react';
import CaixaAberturaScreen from '../../../restaurante-app/src/screens/CaixaAberturaScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import {
  applyStorybookScenario,
  clickButtonByText,
  fillInputsByIndex,
} from '../shared/screenStoryHelpers';

const meta: Meta<typeof CaixaAberturaScreen> = {
  title: 'Projects/Restaurante App/Screens/CaixaAberturaScreen',
  component: CaixaAberturaScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof CaixaAberturaScreen>;

function renderCaixaAberturaScreen(
  scenario: 'default' | 'loading' | 'error' = 'default',
): JSX.Element {
  applyStorybookScenario(scenario);
  return <CaixaAberturaScreen onSuccess={() => undefined} />;
}

export const Default: Story = {
  render: () => renderCaixaAberturaScreen('default'),
};

export const Error: Story = {
  render: () => renderCaixaAberturaScreen('error'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['150.00']);
    await clickButtonByText(canvasElement, 'ABRIR CAIXA');
  },
};

export const Loading: Story = {
  render: () => renderCaixaAberturaScreen('loading'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['150.00']);
    await clickButtonByText(canvasElement, 'ABRIR CAIXA');
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <CaixaAberturaScreen onSuccess={() => undefined} />);
  },
};

export const Filled: Story = {
  render: () => renderCaixaAberturaScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['150.00']);
  },
};
