import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, Platform, ActivityIndicator, LogBox, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Non-serializable values were found',
  'Non-serializable values were found',
  'shadow*',
]);

import { initSentry } from './src/config/sentryConfig';
initSentry();

import NovoPedidoScreen from './src/screens/NovoPedidoScreen';
import MontagemScreen from './src/screens/MontagemScreen';
import CozinhaScreen from './src/screens/CozinhaScreen';
import PedidosProntosScreen from './src/screens/PedidosProntosScreen';
import AdminScreen from './src/screens/AdminScreen';
import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import DeliveryScreen from './src/screens/DeliveryScreen';
import RotasDeliveryScreen from './src/screens/RotasDeliveryScreen';
import ComandaGerenciamentoScreen from './src/screens/ComandaGerenciamentoScreen';
import MapaMesasScreen from './src/screens/MapaMesasScreen';
import ReservasScreen from './src/screens/ReservasScreen';

import RegisterCompanyScreen from './src/screens/RegisterCompanyScreen';
import AboutScreen from './src/screens/AboutScreen';
import PublicMenuScreen from './src/screens/PublicMenuScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrderProvider } from './src/context/OrderContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BillingProvider } from './src/context/BillingContext';
import { ToastProvider } from './src/context/ToastContext';
import { canAccessScreen } from './src/auth/roles';
import OfflineNotice from './src/components/OfflineNotice';
import OfflineQueueManager from './src/components/OfflineQueueManager';
import { LicenseGate } from './src/components/LicenseGate';
import './src/services/MontagemSyncService';
import PrinterService from './src/services/PrinterService';
import { colorSystem } from './src/design-system';
import { useEffect } from 'react';
import { WebSidebarTabBar, SIDEBAR_WIDTH } from './src/components/WebSidebarTabBar';
import logger from './src/utils/logger';
import {
  installGlobalErrorHandler,
  logAppStartup,
  logPageView,
} from './src/services/ObservabilityService';

// @ts-ignore
import PagamentoScreen from './src/screens/PagamentoScreen';

// Stack para Comandas (lista -> pagamento)
const ComandaStack = createNativeStackNavigator();

const withOperationalGate = (Component) => (props) => (
  <LicenseGate>
    <Component {...props} />
  </LicenseGate>
);

const GuardedNovoPedidoScreen = withOperationalGate(NovoPedidoScreen);
const GuardedDeliveryScreen = withOperationalGate(DeliveryScreen);
const GuardedRotasDeliveryScreen = withOperationalGate(RotasDeliveryScreen);
const GuardedReservasScreen = withOperationalGate(ReservasScreen);
const GuardedMapaMesasScreen = withOperationalGate(MapaMesasScreen);
const GuardedCozinhaScreen = withOperationalGate(CozinhaScreen);
const GuardedMontagemScreen = withOperationalGate(MontagemScreen);
const GuardedPedidosProntosScreen = withOperationalGate(PedidosProntosScreen);
const GuardedComandaStackScreen = withOperationalGate(ComandaStackScreen);

function getActiveRouteName(state) {
  if (!state?.routes?.length) return null;
  const route = state.routes[state.index ?? 0];
  if (route?.state) {
    return getActiveRouteName(route.state);
  }
  return route?.name ?? null;
}

function ComandaStackScreen() {
  return (
    <ComandaStack.Navigator screenOptions={{ headerShown: false }}>
      <ComandaStack.Screen name="ComandaList" component={ComandaGerenciamentoScreen} />
      <ComandaStack.Screen name="Pagamento" component={PagamentoScreen} />
    </ComandaStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { user } = useAuth();
  logger.debug('[TabNavigator] Rendering for user', {
    hasUser: Boolean(user),
    role: user?.funcao,
  });

  return (
    <Tab.Navigator
      // Sidebar lateral substitui a barra de tabs inferior no web
      tabBar={(props) => <WebSidebarTabBar {...props} />}
      // Empurra o conteudo de cada tela para a direita do sidebar
      sceneContainerStyle={{ marginLeft: SIDEBAR_WIDTH }}
      screenOptions={{
        headerShown: false,
      }}
    >
      {canAccessScreen(user?.funcao, 'Novo Pedido') && (
        <Tab.Screen name="Novo Pedido" component={GuardedNovoPedidoScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Novo Pedido') && (
        <Tab.Screen
          name="Delivery"
          component={GuardedDeliveryScreen}
          options={{ tabBarLabel: 'Pedido Delivery' }}
        />
      )}
      {canAccessScreen(user?.funcao, 'Entregas') && (
        <Tab.Screen name="Entregas" component={GuardedRotasDeliveryScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Reservas') && (
        <Tab.Screen name="Reservas" component={GuardedReservasScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Novo Pedido') && (
        <Tab.Screen name="Mapa" component={GuardedMapaMesasScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Comandas') && (
        <Tab.Screen name="Comandas" component={GuardedComandaStackScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Cozinha') && (
        <Tab.Screen name="Cozinha" component={GuardedCozinhaScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Montagem') && (
        <Tab.Screen name="Montagem" component={GuardedMontagemScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Prontos') && (
        <Tab.Screen
          name="Prontos"
          component={GuardedPedidosProntosScreen}
          options={{ tabBarLabel: 'Despacho' }}
        />
      )}
      {canAccessScreen(user?.funcao, 'Admin') && (
        <Tab.Screen name="Admin" component={AdminScreen} />
      )}
    </Tab.Navigator>
  );
}

function MainApp() {
  const navigationRef = React.useRef(null);
  const lastRouteNameRef = React.useRef(null);
  const e2eRedirectDoneRef = React.useRef(false);
  const e2eRedirectAttemptsRef = React.useRef(0);
  const { user } = useAuth();

  const handleE2EPagamentoNavigation = React.useCallback((currentRoute) => {
    if (Platform.OS !== 'web' || e2eRedirectDoneRef.current) return;
    if (!navigationRef.current) return;

    try {
      const params = new URLSearchParams(window.location.search);
      const comandaFromQuery = (params.get('e2ePagamentoComanda') || '').trim();
      if (!comandaFromQuery) return;

      if (currentRoute === 'Pagamento') {
        e2eRedirectDoneRef.current = true;
        return;
      }

      if (e2eRedirectAttemptsRef.current >= 5) {
        return;
      }

      e2eRedirectAttemptsRef.current += 1;
      setTimeout(() => {
        navigationRef.current?.navigate('Comandas', {
          screen: 'Pagamento',
          params: {
            comandaNumber: comandaFromQuery,
            returnScreen: 'ComandaGerenciamento',
          },
        });
      }, 60);
    } catch {
      // Ignore invalid query parsing or navigation errors in non-test contexts.
    }
  }, []);

  const exposeE2ENavigationHook = React.useCallback(() => {
    if (Platform.OS !== 'web' || !navigationRef.current) return;

    try {
      window.__E2E_NAVIGATE_TO_PAYMENT__ = (comandaNumber) => {
        if (!comandaNumber) return;
        navigationRef.current?.navigate('Comandas', {
          screen: 'Pagamento',
          params: {
            comandaNumber: String(comandaNumber),
            returnScreen: 'ComandaGerenciamento',
          },
        });
      };
    } catch {
      // ignore e2e hook exposure failures
    }
  }, []);

  return (
    <OrderProvider>
      <NavigationContainer
        ref={navigationRef}
        documentTitle={{ formatter: () => 'Restaurante Web' }}
        onReady={() => {
          const currentRoute = navigationRef.current?.getCurrentRoute?.()?.name ?? null;
          lastRouteNameRef.current = currentRoute;
          if (currentRoute) {
            logPageView(currentRoute, user?.id);
          }
          exposeE2ENavigationHook();
          handleE2EPagamentoNavigation(currentRoute);
        }}
        onStateChange={() => {
          const currentRoute = navigationRef.current?.getCurrentRoute?.()?.name ?? null;
          if (!currentRoute || lastRouteNameRef.current === currentRoute) return;
          lastRouteNameRef.current = currentRoute;
          logPageView(currentRoute, user?.id);
          exposeE2ENavigationHook();
          handleE2EPagamentoNavigation(currentRoute);
        }}
      >
        <TabNavigator />
      </NavigationContainer>
    </OrderProvider>
  );
}

// Auth Stack
const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="Register" component={RegisterCompanyScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}

// Stack raiz que inclui a rota publica /menu/:slug (sem autenticacao)
const RootStack = createNativeStackNavigator();

function RootNavigator({ children }) {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="App" children={children} />
      <RootStack.Screen
        name="PublicMenu"
        component={PublicMenuScreen}
        options={{ title: 'Cardápio', headerShown: false }}
      />
    </RootStack.Navigator>
  );
}

function AppContent() {
  const { user, loading, isPasswordRecovery } = useAuth();

  useEffect(() => {
    installGlobalErrorHandler();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    logAppStartup(user.id, user.email);
  }, [user?.id, user?.email]);

  // Tentar reconexao com impressora ao iniciar
  useEffect(() => {
    PrinterService.autoConnect();
  }, []);

  // LOADING
  if (loading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colorSystem.background} translucent={false} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorSystem.primary} />
            <Text style={styles.loadingText}>Verificando acesso...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (isPasswordRecovery) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colorSystem.background} translucent={false} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <ResetPasswordScreen />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // SEM USUARIO = AUTH STACK (Login/Register) + rota publica de cardapio
  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colorSystem.background} translucent={false} />
        <NavigationContainer
          onReady={() => {
            logPageView('Login');
          }}
          onStateChange={(state) => {
            const routeName = getActiveRouteName(state);
            if (routeName) {
              logPageView(routeName);
            }
          }}
          documentTitle={{ formatter: (opts) => opts?.route?.name === 'PublicMenu' ? 'Cardápio' : 'Restaurante Web' }}
          linking={{
            prefixes: ['/'],
            config: {
              screens: {
                App: {
                  screens: {
                    Login: 'login',
                    Register: 'register',
                    ResetPassword: 'reset-password',
                    About: 'sobre',
                  },
                },
                PublicMenu: 'menu/:slug',
              },
            },
          }}
        >
          <RootNavigator>
            {() => <AuthStack />}
          </RootNavigator>
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // COM USUARIO = APP
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.background} translucent={false} />
      <OfflineNotice />
      <OfflineQueueManager />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <MainApp />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorSystem.background,
  },
  loadingText: {
    marginTop: 10,
    color: colorSystem.primary,
    fontSize: 16,
  },
});

import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  // Don't block rendering while fonts load — icons appear slightly later
  // but the login screen is immediately visible, reducing perceived load time.
  if (!fontsLoaded) {
    // Still render the app; vector icons will fall back to text glyphs briefly
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BillingProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </BillingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}