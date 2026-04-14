import type { Meta, StoryObj } from '@storybook/react-webpack5';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PublicMenuScreen from './PublicMenuScreen';

const meta: Meta<typeof PublicMenuScreen> = {
  title: 'Screens/PublicMenuScreen',
  component: PublicMenuScreen,
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <Story />
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof PublicMenuScreen>;

export const EmptySlug: Story = {
  args: {
    slug: '',
  },
};
