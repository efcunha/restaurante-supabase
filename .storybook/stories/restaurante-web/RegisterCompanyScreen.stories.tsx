import type { Meta, StoryObj } from '@storybook/react';
import RegisterCompanyScreen from '../../../restaurante-web/src/screens/RegisterCompanyScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import {
  applyStorybookScenario,
  clickButtonByText,
  createNavigationMock,
  fillInputsByIndex,
} from '../shared/screenStoryHelpers';

const registerValues = [
  '12.345.678/0001-90',
  'Restaurante Aurora',
  'Ana Gestora',
  '(11) 99999-8888',
  '01310-100',
  'Avenida Paulista, 1000',
  'Sao Paulo',
  'SP',
  'ana@aurora.com',
  'SenhaForte123',
  'SenhaForte123',
];

const meta: Meta<typeof RegisterCompanyScreen> = {
  title: 'Projects/Restaurante Web/Screens/RegisterCompanyScreen',
  component: RegisterCompanyScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;

type Story = StoryObj<typeof RegisterCompanyScreen>;

function renderRegisterScreen(scenario: 'default' | 'loading' | 'error' = 'default'): JSX.Element {
  applyStorybookScenario(scenario);
  return <RegisterCompanyScreen navigation={createNavigationMock() as never} />;
}

export const Default: Story = {
  render: () => renderRegisterScreen('default'),
};

export const Error: Story = {
  render: () => renderRegisterScreen('error'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, registerValues);
    await clickButtonByText(canvasElement, 'CRIAR CONTA GRATIS');
  },
};

export const Loading: Story = {
  render: () => renderRegisterScreen('loading'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, registerValues);
    await clickButtonByText(canvasElement, 'CRIAR CONTA GRATIS');
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => (
      <RegisterCompanyScreen navigation={createNavigationMock() as never} />
    ));
  },
};

export const Filled: Story = {
  render: () => renderRegisterScreen('default'),
  play: async ({ canvasElement }) => {
    await fillInputsByIndex(canvasElement, registerValues);
  },
};
