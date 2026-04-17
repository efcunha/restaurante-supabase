import type { Meta, StoryObj } from '@storybook/react';
import PrinterConfigScreen from '../../../restaurante-web/src/screens/PrinterConfigScreen';
import {
  projectFormDecorator,
  projectFormParameters,
  withDisabledFieldset,
} from '../shared/projectDecorators';
import { applyStorybookScenario, createNavigationMock } from '../shared/screenStoryHelpers';

const meta: Meta<typeof PrinterConfigScreen> = {
  title: 'Projects/Restaurante Web/Screens/PrinterConfigScreen',
  component: PrinterConfigScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof PrinterConfigScreen>;

function renderScreen(scenario: 'default' | 'loading' | 'error' = 'default'): JSX.Element {
  applyStorybookScenario(scenario);
  return <PrinterConfigScreen navigation={createNavigationMock() as never} />;
}

export const Default: Story = {
  render: () => renderScreen('default'),
};

export const Error: Story = {
  render: () => renderScreen('error'),
};

export const Loading: Story = {
  render: () => renderScreen('loading'),
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return withDisabledFieldset(() => (
      <PrinterConfigScreen navigation={createNavigationMock() as never} />
    ));
  },
};

export const Filled: Story = {
  render: () => renderScreen('default'),
};
