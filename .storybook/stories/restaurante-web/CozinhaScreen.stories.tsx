import type { Meta, StoryObj } from '@storybook/react';
import CozinhaScreen from '../../../restaurante-web/src/screens/CozinhaScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof CozinhaScreen> = {
  title: 'Projects/Restaurante Web/Screens/CozinhaScreen',
  component: CozinhaScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof CozinhaScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CozinhaScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <CozinhaScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <CozinhaScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CozinhaScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <CozinhaScreen />;
  },
};
