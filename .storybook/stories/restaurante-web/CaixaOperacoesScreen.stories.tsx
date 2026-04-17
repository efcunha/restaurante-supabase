import type { Meta, StoryObj } from '@storybook/react';
import CaixaOperacoesScreen from '../../../restaurante-web/src/screens/CaixaOperacoesScreen';
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

const operationValues = ['120.00', 'Troco do turno', '45.00', 'Retirada do caixa'];

const meta: Meta<typeof CaixaOperacoesScreen> = {
  title: 'Projects/Restaurante Web/Screens/CaixaOperacoesScreen',
  component: CaixaOperacoesScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof CaixaOperacoesScreen>;

function renderCaixaOperacoesScreen(
  scenario: 'default' | 'loading' | 'error' = 'default',
): JSX.Element {
  applyStorybookScenario(scenario);
  return <CaixaOperacoesScreen />;
}

export const Default: Story = {
  render: () => renderCaixaOperacoesScreen('default'),
};

export const Error: Story = {
  render: () => renderCaixaOperacoesScreen('error'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, operationValues);
    await clickButtonByText(canvasElement, 'REGISTRAR REFORÇO');
  },
};

export const Loading: Story = {
  render: () => renderCaixaOperacoesScreen('loading'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, operationValues);
    await clickButtonByText(canvasElement, 'REGISTRAR REFORÇO');
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <CaixaOperacoesScreen />);
  },
};

export const Filled: Story = {
  render: () => renderCaixaOperacoesScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, operationValues);
  },
};
