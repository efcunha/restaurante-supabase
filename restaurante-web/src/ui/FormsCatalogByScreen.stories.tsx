import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { FormsCatalog } from './FormsCatalog';

const meta: Meta<typeof FormsCatalog> = {
  title: 'Forms/RestauranteWebByScreen',
  component: FormsCatalog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof FormsCatalog>;

export const LoginScreen: Story = { args: { onlyScreenName: 'LoginScreen' } };
export const RegisterCompanyScreen: Story = { args: { onlyScreenName: 'RegisterCompanyScreen' } };
export const ResetPasswordScreen: Story = { args: { onlyScreenName: 'ResetPasswordScreen' } };
export const ConfiguracoesScreen: Story = { args: { onlyScreenName: 'ConfiguracoesScreen' } };
export const BillingScreen: Story = { args: { onlyScreenName: 'BillingScreen' } };
export const EditarEmpresaScreen: Story = { args: { onlyScreenName: 'EditarEmpresaScreen' } };
export const FuncionariosScreen: Story = { args: { onlyScreenName: 'FuncionariosScreen' } };
export const OperationalSettingsScreen: Story = { args: { onlyScreenName: 'OperationalSettingsScreen' } };
export const ConfiguracaoEstoqueScreen: Story = { args: { onlyScreenName: 'ConfiguracaoEstoqueScreen' } };
export const ConfiguracaoMesasScreen: Story = { args: { onlyScreenName: 'ConfiguracaoMesasScreen' } };
export const CadastroProdutoScreen: Story = { args: { onlyScreenName: 'CadastroProdutoScreen' } };
export const CaixaAberturaScreen: Story = { args: { onlyScreenName: 'CaixaAberturaScreen' } };
export const CaixaFechamentoScreen: Story = { args: { onlyScreenName: 'CaixaFechamentoScreen' } };
export const CaixaOperacoesScreen: Story = { args: { onlyScreenName: 'CaixaOperacoesScreen' } };
export const EstoqueScreen: Story = { args: { onlyScreenName: 'EstoqueScreen' } };
export const ExtrasConfigScreen: Story = { args: { onlyScreenName: 'ExtrasConfigScreen' } };
export const GerenciarCardapioScreen: Story = { args: { onlyScreenName: 'GerenciarCardapioScreen' } };
export const GerenciarFornecedoresScreen: Story = { args: { onlyScreenName: 'GerenciarFornecedoresScreen' } };
export const PedidoDetalhesModal: Story = { args: { onlyScreenName: 'PedidoDetalhesModal' } };
export const NovoPedidoScreen: Story = { args: { onlyScreenName: 'NovoPedidoScreen' } };
export const PublicMenuScreen: Story = { args: { onlyScreenName: 'PublicMenuScreen' } };
export const ReservasScreen: Story = { args: { onlyScreenName: 'ReservasScreen' } };
export const DeliveryScreen: Story = { args: { onlyScreenName: 'DeliveryScreen' } };
export const DeliveryOcorrenciasScreen: Story = { args: { onlyScreenName: 'DeliveryOcorrenciasScreen' } };
export const AdicionaisConfigModal: Story = { args: { onlyScreenName: 'AdicionaisConfigModal' } };
export const MenuSettings: Story = { args: { onlyScreenName: 'MenuSettings' } };
export const ProductForm: Story = { args: { onlyScreenName: 'ProductForm' } };
export const StockManager: Story = { args: { onlyScreenName: 'StockManager' } };
export const VariationManager: Story = { args: { onlyScreenName: 'VariationManager' } };
