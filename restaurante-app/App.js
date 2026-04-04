import 'react-native-gesture-handler';
import React from 'react';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Platform, ActivityIndicator, LogBox, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Non-serializable values were found',
  'Non-serializable values were found',
]);

import { initSentry, Sentry } from './src/config/sentryConfig';
try {
  initSentry();
} catch (e) {
  console.warn('[Boot] Sentry init failed:', e);
}

import NovoPedidoScreen from './src/screens/NovoPedidoScreen';
import MontagemScreen from './src/screens/MontagemScreen';
import CozinhaScreen from './src/screens/CozinhaScreen';
import PedidosProntosScreen from './src/screens/PedidosProntosScreen';
import AdminScreen from './src/screens/AdminScreen';
import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ComandaGerenciamentoScreen from './src/screens/ComandaGerenciamentoScreen';
import MapaMesasScreen from './src/screens/MapaMesasScreen';
import RotasDeliveryScreen from './src/screens/RotasDeliveryScreen';
import ReservasScreen from './src/screens/ReservasScreen';
import OverflowMenuScreen from './src/screens/OverflowMenuScreen';

import RegisterCompanyScreen from './src/screens/RegisterCompanyScreen';
import AboutScreen from './src/screens/AboutScreen';
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
import logger from './src/utils/logger';

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
const GuardedMapaMesasScreen = withOperationalGate(MapaMesasScreen);
const GuardedComandaStackScreen = withOperationalGate(ComandaStackScreen);
const GuardedCozinhaScreen = withOperationalGate(CozinhaScreen);
const GuardedMontagemScreen = withOperationalGate(MontagemScreen);
const GuardedPedidosProntosScreen = withOperationalGate(PedidosProntosScreen);
const GuardedRotasDeliveryScreen = withOperationalGate(RotasDeliveryScreen);
const GuardedReservasScreen = withOperationalGate(ReservasScreen);

function ComandaStackScreen() {
  return (
    <ComandaStack.Navigator screenOptions={{ headerShown: false }}>
      <ComandaStack.Screen name="ComandaList" component={ComandaGerenciamentoScreen} />
      <ComandaStack.Screen name="Pagamento" component={PagamentoScreen} />
    </ComandaStack.Navigator>
  );
}

// Stack para a aba "Mais" — lista de destinos secundarios + cada destino
const MaisStack = createNativeStackNavigator();

function MaisStackScreen() {
  return (
    <MaisStack.Navigator screenOptions={{ headerShown: false }}>
      <MaisStack.Screen name="OverflowMenu" component={OverflowMenuScreen} />
      <MaisStack.Screen name="Montagem"     component={GuardedMontagemScreen} />
      <MaisStack.Screen name="Prontos"      component={GuardedPedidosProntosScreen} />
      <MaisStack.Screen name="RotasDelivery" component={GuardedRotasDeliveryScreen} />
      <MaisStack.Screen name="Reservas"     component={GuardedReservasScreen} />
      <MaisStack.Screen name="Admin"        component={AdminScreen} />
    </MaisStack.Navigator>
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
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if      (route.name === 'Novo Pedido')   iconName = focused ? 'add-circle'              : 'add-circle-outline';
          else if (route.name === 'Mapa')           iconName = focused ? 'map'                     : 'map-outline';
          else if (route.name === 'Comandas')       iconName = focused ? 'receipt'                 : 'receipt-outline';
          else if (route.name === 'Cozinha')        iconName = focused ? 'flame'                   : 'flame-outline';
          else if (route.name === 'Montagem')       iconName = focused ? 'layers'                  : 'layers-outline';
          else if (route.name === 'Prontos')        iconName = focused ? 'checkmark-done-circle'   : 'checkmark-done-circle-outline';
          else if (route.name === 'RotasDelivery')  iconName = focused ? 'bicycle'                 : 'bicycle-outline';
          else if (route.name === 'Mais')           iconName = focused ? 'apps'                    : 'apps-outline';
          else                                      iconName = 'ellipsis-horizontal';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colorSystem.primary,
        tabBarInactiveTintColor: colorSystem.textMuted,
        tabBarStyle: {
          backgroundColor: colorSystem.surface,
          borderTopWidth: 1,
          borderTopColor: colorSystem.border,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          paddingTop: 8,
        },
      })}
    >
      {/* Abas primarias — max 5 destinos por papel */}
      {canAccessScreen(user?.funcao, 'Novo Pedido') && (
        <Tab.Screen name="Novo Pedido" component={GuardedNovoPedidoScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Mapa') && (
        <Tab.Screen name="Mapa" component={GuardedMapaMesasScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Comandas') && (
        <Tab.Screen name="Comandas" component={GuardedComandaStackScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Cozinha') && (
        <Tab.Screen name="Cozinha" component={GuardedCozinhaScreen} />
      )}
      {/* Abas single-role: permanecem primarias para seus respectivos papeis */}
      {canAccessScreen(user?.funcao, 'Montagem') && (
        <Tab.Screen name="Montagem" component={GuardedMontagemScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Prontos') && (
        <Tab.Screen
          name="Prontos"
          component={GuardedPedidosProntosScreen}
          options={{ tabBarLabel: 'Entrega Salao' }}
        />
      )}
      {canAccessScreen(user?.funcao, 'RotasDelivery') && (
        <Tab.Screen
          name="RotasDelivery"
          component={GuardedRotasDeliveryScreen}
          options={{ tabBarLabel: 'Rotas Delivery' }}
        />
      )}
      {/* Aba "Mais" — overflow com destinos secundarios (admin/gerente/garcom) */}
      {canAccessScreen(user?.funcao, 'Mais') && (
        <Tab.Screen
          name="Mais"
          component={MaisStackScreen}
          options={{ tabBarLabel: 'Mais' }}
        />
      )}
    </Tab.Navigator>
  );
}

function MainApp() {
  return (
    <OrderProvider>
      <NavigationContainer>
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

function AppContent() {
  const { user, loading, isPasswordRecovery, initError, debugLog } = useAuth();
  const [forceAuthFallback, setForceAuthFallback] = React.useState(false);

  useEffect(() => {
    setForceAuthFallback(false);
  }, [user]);

  useEffect(() => {
    if (!loading || user) return;

    const timer = setTimeout(() => {
      setForceAuthFallback(true);
      console.warn('[Boot] Auth loading timeout fallback activated');
    }, 9000);

    return () => clearTimeout(timer);
  }, [loading, user]);

  // Tentar reconexao com impressora ao iniciar
  useEffect(() => {
    PrinterService.autoConnect();
  }, []);

  // LOADING
  if (loading && !forceAuthFallback) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colorSystem.background} translucent={false} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colorSystem.primary} />
            <Text style={styles.loadingText}>Verificando acesso...</Text>
            {!!initError && (
              <Text style={[styles.loadingText, { marginTop: 8, fontSize: 13 }]}>Erro: {initError}</Text>
            )}
            {!initError && debugLog?.length > 0 && (
              <Text style={[styles.loadingText, { marginTop: 8, fontSize: 12 }]}>Inicializando autenticacao...</Text>
            )}
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

  // SEM USUARIO = AUTH STACK (Login/Register)
  if (!user) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colorSystem.background} translucent={false} />
        <NavigationContainer key="auth-flow">
          <AuthStack />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // COM USUARIO = APP (com key unica para forcar re-render)
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

export default Sentry.wrap(function App() {
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
});