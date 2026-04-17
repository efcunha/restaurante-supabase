import type { Meta, StoryObj } from '@storybook/react';
import GerenciarFornecedoresScreen from '../../../restaurante-web/src/screens/GerenciarFornecedoresScreen';
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

const supplierValues = [
  'Distribuidora Sol',
  '12.345.678/0001-90',
  '(11) 98888-7777',
  'contato@sol.com',
];

const meta: Meta<typeof GerenciarFornecedoresScreen> = {
  title: 'Projects/Restaurante Web/Screens/GerenciarFornecedoresScreen',
  component: GerenciarFornecedoresScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof GerenciarFornecedoresScreen>;

function renderGerenciarFornecedoresScreen(
  scenario: 'default' | 'loading' | 'error' | 'empty' = 'default',
): JSX.Element {
  applyStorybookScenario(scenario);
  return <GerenciarFornecedoresScreen onClose={() => undefined} />;
}

export const Default: Story = {
  render: () => renderGerenciarFornecedoresScreen('empty'),
};

export const Error: Story = {
  render: () => renderGerenciarFornecedoresScreen('error'),
};

export const Loading: Story = {
  render: () => renderGerenciarFornecedoresScreen('loading'),
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <GerenciarFornecedoresScreen onClose={() => undefined} />);
  },
};

export const Filled: Story = {
  render: () => renderGerenciarFornecedoresScreen('default'),
  play: async ({ canvasElement }) => {
    await clickButtonByText(canvasElement, '+ Novo Fornecedor');
    await fillInputsByIndex(canvasElement, supplierValues);
  },
};
