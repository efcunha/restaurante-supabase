import { FormInput, FieldRow } from './index';

const meta = {
  title: 'UI/FieldRow',
  component: FieldRow,
  tags: ['autodocs'],
  args: {
    label: 'Email',
    required: true,
    helper: 'Use um email corporativo.',
  },
};

export default meta;

export const Default = {
  render: (args: { label: string; required: boolean; helper?: string; error?: string }) => (
    <FieldRow {...args}>
      <FormInput label="" value="" placeholder="contato@empresa.com" onChangeText={() => {}} />
    </FieldRow>
  ),
};

export const Error = {
  render: () => (
    <FieldRow label="Email" required error="Email invalido.">
      <FormInput label="" value="invalido" placeholder="contato@empresa.com" onChangeText={() => {}} />
    </FieldRow>
  ),
};
