import type { Meta, StoryObj } from '@storybook/react';
import CadastroProdutoScreen from '../../../restaurante-app/src/screens/CadastroProdutoScreen';
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

const meta: Meta<typeof CadastroProdutoScreen> = {
  title: 'Projects/Restaurante App/Screens/CadastroProdutoScreen',
  component: CadastroProdutoScreen,
  decorators: [projectFormDecorator('restaurante-app')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof CadastroProdutoScreen>;

function renderCadastroProdutoScreen(
  scenario: 'default' | 'loading' | 'error' = 'default',
): JSX.Element {
  applyStorybookScenario(scenario);
  return <CadastroProdutoScreen />;
}

export const Default: Story = {
  render: () => renderCadastroProdutoScreen('default'),
};

export const Error: Story = {
  render: () => renderCadastroProdutoScreen('error'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['Picanha Premium', '39.90']);
    await clickButtonByText(canvasElement, 'CADASTRAR PRODUTO');
  },
};

export const Loading: Story = {
  render: () => renderCadastroProdutoScreen('loading'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['Picanha Premium', '39.90']);
    await clickButtonByText(canvasElement, 'CADASTRAR PRODUTO');
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <CadastroProdutoScreen />);
  },
};

export const Filled: Story = {
  render: () => renderCadastroProdutoScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['Picanha Premium', '39.90']);
  },
};
