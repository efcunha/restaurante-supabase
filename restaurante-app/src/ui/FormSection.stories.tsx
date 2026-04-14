import { FormInput, FormSection } from './index';

const meta = {
  title: 'UI/FormSection',
  component: FormSection,
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
    <FormSection title="Dados do cliente" description="Preencha os campos obrigatorios.">
      <FormInput label="Nome" value="" placeholder="Nome completo" onChangeText={() => {}} />
      <FormInput label="Telefone" value="" placeholder="(11) 99999-9999" onChangeText={() => {}} />
    </FormSection>
  ),
};
