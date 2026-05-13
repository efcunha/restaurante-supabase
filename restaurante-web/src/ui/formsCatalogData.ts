export type FormScreenEntry = {
  name: string;
  path: string;
  group: 'auth' | 'admin' | 'operations' | 'delivery' | 'menu';
};

export const webFormScreens: FormScreenEntry[] = [
  { name: 'LoginScreen', path: 'src/screens/LoginScreen.tsx', group: 'auth' },
  { name: 'RegisterCompanyScreen', path: 'src/screens/RegisterCompanyScreen.tsx', group: 'auth' },
  { name: 'ResetPasswordScreen', path: 'src/screens/ResetPasswordScreen.tsx', group: 'auth' },
  { name: 'ConfiguracoesScreen', path: 'src/screens/ConfiguracoesScreen.tsx', group: 'admin' },
  { name: 'BillingScreen', path: 'src/screens/BillingScreen.tsx', group: 'admin' },
  { name: 'EditarEmpresaScreen', path: 'src/screens/EditarEmpresaScreen.tsx', group: 'admin' },
  { name: 'FuncionariosScreen', path: 'src/screens/FuncionariosScreen.tsx', group: 'admin' },
  { name: 'OperationalSettingsScreen', path: 'src/screens/OperationalSettingsScreen.tsx', group: 'admin' },
  { name: 'ConfiguracaoEstoqueScreen', path: 'src/screens/ConfiguracaoEstoqueScreen.tsx', group: 'operations' },
  { name: 'ConfiguracaoMesasScreen', path: 'src/screens/ConfiguracaoMesasScreen.tsx', group: 'operations' },
  { name: 'CadastroProdutoScreen', path: 'src/screens/CadastroProdutoScreen.tsx', group: 'operations' },
  { name: 'CaixaAberturaScreen', path: 'src/screens/CaixaAberturaScreen.tsx', group: 'operations' },
  { name: 'CaixaFechamentoScreen', path: 'src/screens/CaixaFechamentoScreen.tsx', group: 'operations' },
  { name: 'CaixaOperacoesScreen', path: 'src/screens/CaixaOperacoesScreen.tsx', group: 'operations' },
  { name: 'EstoqueScreen', path: 'src/screens/EstoqueScreen.tsx', group: 'operations' },
  { name: 'ExtrasConfigScreen', path: 'src/screens/ExtrasConfigScreen.tsx', group: 'operations' },
  { name: 'GerenciarCardapioScreen', path: 'src/screens/GerenciarCardapioScreen.tsx', group: 'menu' },
  { name: 'GerenciarFornecedoresScreen', path: 'src/screens/GerenciarFornecedoresScreen.tsx', group: 'menu' },
  { name: 'PedidoDetalhesModal', path: 'src/screens/PedidoDetalhesModal.tsx', group: 'menu' },
  { name: 'NovoPedidoScreen', path: 'src/screens/NovoPedidoScreen.tsx', group: 'menu' },
  { name: 'PublicMenuScreen', path: 'src/screens/PublicMenuScreen.tsx', group: 'menu' },
  { name: 'ReservasScreen', path: 'src/screens/ReservasScreen.tsx', group: 'operations' },
  { name: 'DeliveryScreen', path: 'src/screens/DeliveryScreen.tsx', group: 'delivery' },
  { name: 'DeliveryOcorrenciasScreen', path: 'src/screens/DeliveryOcorrenciasScreen.tsx', group: 'delivery' },
  { name: 'AdicionaisConfigModal', path: 'src/screens/admin/menu/AdicionaisConfigModal.tsx', group: 'menu' },
  { name: 'MenuSettings', path: 'src/screens/admin/menu/MenuSettings.tsx', group: 'menu' },
  { name: 'ProductForm', path: 'src/screens/admin/menu/ProductForm.tsx', group: 'menu' },
  { name: 'StockManager', path: 'src/screens/admin/menu/StockManager.tsx', group: 'menu' },
  { name: 'VariationManager', path: 'src/screens/admin/menu/VariationManager.tsx', group: 'menu' },
];

export const webFormScreensTotal = webFormScreens.length;
