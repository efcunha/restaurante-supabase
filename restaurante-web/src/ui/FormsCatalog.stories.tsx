import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { FormsCatalog } from './FormsCatalog';

const meta: Meta<typeof FormsCatalog> = {
  title: 'Forms/RestauranteWebCatalog',
  component: FormsCatalog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof FormsCatalog>;

export const Default: Story = {};
