/**
 * Lazy-loaded screen components for improved app startup performance
 * 
 * This file exports lazy-loaded versions of screen components.
 * Screens are loaded on-demand when navigated to, reducing initial bundle size.
 * 
 * Usage in navigation:
 * import { LazyOrdersScreen, LazyStatisticsScreen } from './navigation/LazyScreens';
 * 
 * <Stack.Screen name="Orders" component={LazyOrdersScreen} />
 */

import { createLazyScreen } from '../components/LazyLoadWrapper';

// Admin Screens
export const LazyAdminScreen = createLazyScreen(
  () => import('../screens/AdminScreen'),
  'Carregando painel admin...'
);

export const LazyFuncionariosScreen = createLazyScreen(
  () => import('../screens/FuncionariosScreen'),
  'Carregando funcionários...'
);

export const LazyGerenciarCardapioScreen = createLazyScreen(
  () => import('../screens/GerenciarCardapioScreen'),
  'Carregando cardápio...'
);

export const LazyUpdateCardapioScreen = createLazyScreen(
  () => import('../screens/UpdateCardapioScreen'),
  'Carregando atualização...'
);

// Financial Screens
export const LazyFinancialDashboardScreen = createLazyScreen(
  () => import('../screens/FinancialDashboardScreen'),
  'Carregando dashboard financeiro...'
);

export const LazyFinancialConfigScreen = createLazyScreen(
  () => import('../screens/FinancialConfigScreen'),
  'Carregando configurações...'
);

export const LazyCashFlowScreen = createLazyScreen(
  () => import('../screens/CashFlowScreen'),
  'Carregando fluxo de caixa...'
);

// Caixa Screens
export const LazyCaixaAberturaScreen = createLazyScreen(
  () => import('../screens/CaixaAberturaScreen'),
  'Carregando abertura de caixa...'
);

export const LazyCaixaFechamentoScreen = createLazyScreen(
  () => import('../screens/CaixaFechamentoScreen'),
  'Carregando fechamento...'
);

export const LazyCaixaHistoricoScreen = createLazyScreen(
  () => import('../screens/CaixaHistoricoScreen'),
  'Carregando histórico...'
);

export const LazyCaixaOperacoesScreen = createLazyScreen(
  () => import('../screens/CaixaOperacoesScreen'),
  'Carregando operações...'
);

// Comanda Screens
export const LazyComandaAbertaScreen = createLazyScreen(
  () => import('../screens/ComandaAbertaScreen'),
  'Carregando comandas...'
);

export const LazyComandaGerenciamentoScreen = createLazyScreen(
  () => import('../screens/ComandaGerenciamentoScreen'),
  'Carregando gerenciamento...'
);

export const LazyComandaVisualizacaoAdminScreen = createLazyScreen(
  () => import('../screens/ComandaVisualizacaoAdminScreen'),
  'Carregando visualização...'
);

// Estoque Screens
export const LazyEstoqueScreen = createLazyScreen(
  () => import('../screens/EstoqueScreen'),
  'Carregando estoque...'
);

export const LazyConfiguracaoEstoqueScreen = createLazyScreen(
  () => import('../screens/ConfiguracaoEstoqueScreen'),
  'Carregando configuração...'
);

export const LazyGerenciarFornecedoresScreen = createLazyScreen(
  () => import('../screens/GerenciarFornecedoresScreen'),
  'Carregando fornecedores...'
);

// Settings Screens
export const LazyEditarEmpresaScreen = createLazyScreen(
  () => import('../screens/EditarEmpresaScreen'),
  'Carregando configurações...'
);

export const LazyPrinterConfigScreen = createLazyScreen(
  () => import('../screens/PrinterConfigScreen'),
  'Carregando impressoras...'
);

// Payment Screen
export const LazyPagamentoScreen = createLazyScreen(
  () => import('../screens/PagamentoScreen'),
  'Carregando pagamento...'
);

/**
 * Preload commonly accessed screens
 * Call this function after the app has loaded to preload screens
 * that users are likely to navigate to
 */
export function preloadCommonScreens() {
  // Preload screens that are frequently accessed
  // This improves perceived performance by loading them in the background
  
  // Example: Preload admin screens if user is admin
  // if (user?.role === 'admin') {
  //   preloadLazyComponent(() => import('../screens/AdminScreen'));
  //   preloadLazyComponent(() => import('../screens/FinancialDashboardScreen'));
  // }
}

/**
 * Screen loading priorities
 * 
 * HIGH PRIORITY (load immediately):
 * - Login/Auth screens
 * - Main dashboard/home
 * - Order creation screens
 * 
 * MEDIUM PRIORITY (lazy load, preload on idle):
 * - Kitchen/Montagem screens
 * - Comanda management
 * - Payment screens
 * 
 * LOW PRIORITY (lazy load only when needed):
 * - Admin screens
 * - Settings screens
 * - Reports/Statistics
 * - Inventory management
 */
