import type { Meta, StoryObj } from '@storybook/react';
import ConfiguracaoEstoqueScreen from '../../../restaurante-web/src/screens/ConfiguracaoEstoqueScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import { applyStorybookScenario, fillInputsByIndex } from '../shared/screenStoryHelpers';

const meta: Meta<typeof ConfiguracaoEstoqueScreen> = {
  title: 'Projects/Restaurante Web/Screens/ConfiguracaoEstoqueScreen',
  component: ConfiguracaoEstoqueScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof ConfiguracaoEstoqueScreen>;

function renderConfiguracaoEstoqueScreen(
  scenario: 'default' | 'loading' | 'error' | 'empty' = 'default',
): JSX.Element {
  applyStorybookScenario(scenario);
  return <ConfiguracaoEstoqueScreen onClose={() => undefined} />;
}

export const Default: Story = {
  render: () => renderConfiguracaoEstoqueScreen('default'),
};

export const Error: Story = {
  render: () => renderConfiguracaoEstoqueScreen('error'),
};

export const Loading: Story = {
  render: () => renderConfiguracaoEstoqueScreen('loading'),
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <ConfiguracaoEstoqueScreen onClose={() => undefined} />);
  },
};

export const Filled: Story = {
  render: () => renderConfiguracaoEstoqueScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, ['Limpeza Premium']);
  },
};
