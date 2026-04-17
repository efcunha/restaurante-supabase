import type { Meta, StoryObj } from '@storybook/react';
import GerenciarCardapioScreen from '../../../restaurante-web/src/screens/GerenciarCardapioScreen';
import { projectFormDecorator, projectFormParameters } from '../shared/projectDecorators';
import { applyStorybookScenario } from '../shared/screenStoryHelpers';

const meta: Meta<typeof GerenciarCardapioScreen> = {
  title: 'Projects/Restaurante Web/Screens/GerenciarCardapioScreen',
  component: GerenciarCardapioScreen,
  decorators: [projectFormDecorator('restaurante-web')],
  parameters: projectFormParameters,
};

export default meta;
type Story = StoryObj<typeof GerenciarCardapioScreen>;

export const Default: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <GerenciarCardapioScreen />;
  },
};

export const Error: Story = {
  render: () => {
    applyStorybookScenario('error');
    return <GerenciarCardapioScreen />;
  },
};

export const Loading: Story = {
  render: () => {
    applyStorybookScenario('loading');
    return <GerenciarCardapioScreen />;
  },
};

export const Disabled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <GerenciarCardapioScreen />;
  },
};

export const Filled: Story = {
  render: () => {
    applyStorybookScenario('default');
    return <GerenciarCardapioScreen />;
  },
};
