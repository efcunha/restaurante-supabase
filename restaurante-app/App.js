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

import { initSentry } from './src/config/sentryConfig';
// import * as Sentry from '@sentry/react-native';
initSentry();

import NovoPedidoScreen from './src/screens/NovoPedidoScreen';
import MontagemScreen from './src/screens/MontagemScreen';
import CozinhaScreen from './src/screens/CozinhaScreen';
import PedidosProntosScreen from './src/screens/PedidosProntosScreen';
import AdminScreen from './src/screens/AdminScreen';
import LoginScreen from './src/screens/LoginScreen';
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
import { ToastProvider } from './src/context/ToastContext';
import { canAccessScreen } from './src/auth/roles';
import OfflineNotice from './src/components/OfflineNotice';
import OfflineQueueManager from './src/components/OfflineQueueManager';
import PrinterService from './src/services/PrinterService';
import { colorSystem } from './src/design-system';
import { useEffect } from 'react';

// @ts-ignore
import PagamentoScreen from './src/screens/PagamentoScreen';

// Stack para Comandas (lista -> pagamento)
const ComandaStack = createNativeStackNavigator();

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
      <MaisStack.Screen name="Montagem"     component={MontagemScreen} />
      <MaisStack.Screen name="Prontos"      component={PedidosProntosScreen} />
      <MaisStack.Screen name="RotasDelivery" component={RotasDeliveryScreen} />
      <MaisStack.Screen name="Reservas"     component={ReservasScreen} />
      <MaisStack.Screen name="Admin"        component={AdminScreen} />
    </MaisStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { user } = useAuth();
  console.log('[TabNavigator] Rendering for user:', user?.email, 'Role:', user?.funcao);

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
        <Tab.Screen name="Novo Pedido" component={NovoPedidoScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Mapa') && (
        <Tab.Screen name="Mapa" component={MapaMesasScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Comandas') && (
        <Tab.Screen name="Comandas" component={ComandaStackScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Cozinha') && (
        <Tab.Screen name="Cozinha" component={CozinhaScreen} />
      )}
      {/* Abas single-role: permanecem primarias para seus respectivos papeis */}
      {canAccessScreen(user?.funcao, 'Montagem') && (
        <Tab.Screen name="Montagem" component={MontagemScreen} />
      )}
      {canAccessScreen(user?.funcao, 'Prontos') && (
        <Tab.Screen
          name="Prontos"
          component={PedidosProntosScreen}
          options={{ tabBarLabel: 'Entrega Salao' }}
        />
      )}
      {canAccessScreen(user?.funcao, 'RotasDelivery') && (
        <Tab.Screen
          name="RotasDelivery"
          component={RotasDeliveryScreen}
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

function MainApp({ sessionKey }) {
  return (
    <OrderProvider key={`order-${sessionKey}`}>
      <NavigationContainer key={`nav-${sessionKey}`}>
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
      <Stack.Screen name="Register" component={RegisterCompanyScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { user, loading, sessionKey } = useAuth();

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

  // SEM USUARIO = AUTH STACK (Login/Register)
  if (!user) {
    return (
      <SafeAreaProvider key={`auth-${sessionKey}-${Date.now()}`}>
        <StatusBar barStyle="dark-content" backgroundColor={colorSystem.background} translucent={false} />
        <NavigationContainer>
          <AuthStack />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }

  // COM USUARIO = APP (com key unica para forcar re-render)
  return (
    <SafeAreaProvider key={`app-${sessionKey}-${Date.now()}`}>
      <StatusBar barStyle="dark-content" backgroundColor={colorSystem.background} translucent={false} />
      <OfflineNotice />
      <OfflineQueueManager />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <MainApp sessionKey={sessionKey} />
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
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}