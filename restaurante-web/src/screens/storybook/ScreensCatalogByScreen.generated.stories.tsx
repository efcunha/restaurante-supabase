import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { ScreensCatalog } from './ScreensCatalog';

const meta: Meta<typeof ScreensCatalog> = {
  title: 'Screens/RestauranteWeb/ByScreen',
  component: ScreensCatalog,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof ScreensCatalog>;

export const AboutScreen: Story = { args: { onlyScreenName: 'AboutScreen' } };
export const AdicionaisConfigModal: Story = { args: { onlyScreenName: 'AdicionaisConfigModal' } };
export const MenuSettings: Story = { args: { onlyScreenName: 'MenuSettings' } };
export const ProductForm: Story = { args: { onlyScreenName: 'ProductForm' } };
export const ProductList: Story = { args: { onlyScreenName: 'ProductList' } };
export const StockManager: Story = { args: { onlyScreenName: 'StockManager' } };
export const VariationManager: Story = { args: { onlyScreenName: 'VariationManager' } };
export const AdminScreen: Story = { args: { onlyScreenName: 'AdminScreen' } };
export const BillingScreen: Story = { args: { onlyScreenName: 'BillingScreen' } };
export const CadastroProdutoScreen: Story = { args: { onlyScreenName: 'CadastroProdutoScreen' } };
export const CaixaAberturaScreen: Story = { args: { onlyScreenName: 'CaixaAberturaScreen' } };
export const CaixaFechamentoScreen: Story = { args: { onlyScreenName: 'CaixaFechamentoScreen' } };
export const CaixaHistoricoScreen: Story = { args: { onlyScreenName: 'CaixaHistoricoScreen' } };
export const CaixaOperacoesScreen: Story = { args: { onlyScreenName: 'CaixaOperacoesScreen' } };
export const CancellationReportScreen: Story = { args: { onlyScreenName: 'CancellationReportScreen' } };
export const CashFlowScreen: Story = { args: { onlyScreenName: 'CashFlowScreen' } };
export const ComandaAbertaScreen: Story = { args: { onlyScreenName: 'ComandaAbertaScreen' } };
export const ComandaGerenciamentoScreen: Story = { args: { onlyScreenName: 'ComandaGerenciamentoScreen' } };
export const ComandaVisualizacaoAdminScreen: Story = { args: { onlyScreenName: 'ComandaVisualizacaoAdminScreen' } };
export const ConfiguracaoEstoqueScreen: Story = { args: { onlyScreenName: 'ConfiguracaoEstoqueScreen' } };
export const ConfiguracaoMesasScreen: Story = { args: { onlyScreenName: 'ConfiguracaoMesasScreen' } };
export const ConfiguracoesScreen: Story = { args: { onlyScreenName: 'ConfiguracoesScreen' } };
export const ConfiguracoesWhatsApp: Story = { args: { onlyScreenName: 'ConfiguracoesWhatsApp' } };
export const CozinhaScreen: Story = { args: { onlyScreenName: 'CozinhaScreen' } };
export const DeliveryOcorrenciasScreen: Story = { args: { onlyScreenName: 'DeliveryOcorrenciasScreen' } };
export const DeliveryScreen: Story = { args: { onlyScreenName: 'DeliveryScreen' } };
export const EditarEmpresaScreen: Story = { args: { onlyScreenName: 'EditarEmpresaScreen' } };
export const EstoqueScreen: Story = { args: { onlyScreenName: 'EstoqueScreen' } };
export const ExtrasConfigScreen: Story = { args: { onlyScreenName: 'ExtrasConfigScreen' } };
export const FinancialConfigScreen: Story = { args: { onlyScreenName: 'FinancialConfigScreen' } };
export const FinancialDashboardScreen: Story = { args: { onlyScreenName: 'FinancialDashboardScreen' } };
export const FuncionariosScreen: Story = { args: { onlyScreenName: 'FuncionariosScreen' } };
export const GerenciarCardapioScreen: Story = { args: { onlyScreenName: 'GerenciarCardapioScreen' } };
export const GerenciarFornecedoresScreen: Story = { args: { onlyScreenName: 'GerenciarFornecedoresScreen' } };
export const LoginScreen: Story = { args: { onlyScreenName: 'LoginScreen' } };
export const MapaMesasScreen: Story = { args: { onlyScreenName: 'MapaMesasScreen' } };
export const MontagemScreen: Story = { args: { onlyScreenName: 'MontagemScreen' } };
export const NovoPedidoScreen: Story = { args: { onlyScreenName: 'NovoPedidoScreen' } };
export const OperationalSettingsScreen: Story = { args: { onlyScreenName: 'OperationalSettingsScreen' } };
export const PagamentoScreen: Story = { args: { onlyScreenName: 'PagamentoScreen' } };
export const PedidoDetalhesModal: Story = { args: { onlyScreenName: 'PedidoDetalhesModal' } };
export const PedidosProntosScreen: Story = { args: { onlyScreenName: 'PedidosProntosScreen' } };
export const PerformanceDashboardScreen: Story = { args: { onlyScreenName: 'PerformanceDashboardScreen' } };
export const PrinterConfigScreen: Story = { args: { onlyScreenName: 'PrinterConfigScreen' } };
export const PublicMenuScreen: Story = { args: { onlyScreenName: 'PublicMenuScreen' } };
export const RegisterCompanyScreen: Story = { args: { onlyScreenName: 'RegisterCompanyScreen' } };
export const ReservasScreen: Story = { args: { onlyScreenName: 'ReservasScreen' } };
export const ResetPasswordScreen: Story = { args: { onlyScreenName: 'ResetPasswordScreen' } };
export const RotasDeliveryScreen: Story = { args: { onlyScreenName: 'RotasDeliveryScreen' } };
export const UpdateCardapioScreen: Story = { args: { onlyScreenName: 'UpdateCardapioScreen' } };
