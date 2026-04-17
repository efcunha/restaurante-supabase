import type { Meta, StoryObj } from '@storybook/react';
import EditarEmpresaScreen from '../../../restaurante-web/src/screens/EditarEmpresaScreen';
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

const companyValues = [
  'Restaurante Aurora Premium',
  '12.345.678/0001-90',
  'Ana Responsavel',
  '(11) 98888-7777',
  '01310-100',
  'Alameda Santos, 1200',
  'Sao Paulo',
  'SP',
];

const meta: Meta<typeof EditarEmpresaScreen> = {
  title: 'Projects/Restaurante Web/Screens/EditarEmpresaScreen',
  component: EditarEmpresaScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof EditarEmpresaScreen>;

function renderEditarEmpresaScreen(
  scenario: 'default' | 'loading' | 'error' | 'empty' = 'default',
): JSX.Element {
  applyStorybookScenario(scenario);
  return <EditarEmpresaScreen onBack={() => undefined} />;
}

export const Default: Story = {
  render: () => renderEditarEmpresaScreen('empty'),
};

export const Error: Story = {
  render: () => renderEditarEmpresaScreen('error'),
};

export const Loading: Story = {
  render: () => renderEditarEmpresaScreen('loading'),
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => <EditarEmpresaScreen onBack={() => undefined} />);
  },
};

export const Filled: Story = {
  render: () => renderEditarEmpresaScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, companyValues);
    await clickButtonByText(canvasElement, 'SALVAR ALTERAÇÕES');
  },
};
