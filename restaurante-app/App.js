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
import * as Sentry from '@sentry/react-native';

initSentry();

import NovoPedidoScreen from './src/screens/NovoPedidoScreen';
import MontagemScreen from './src/screens/MontagemScreen';
import CozinhaScreen from './src/screens/CozinhaScreen';
import PedidosProntosScreen from './src/screens/PedidosProntosScreen';
import AdminScreen from './src/screens/AdminScreen';
import LoginScreen from './src/screens/LoginScreen';
import ComandaGerenciamentoScreen from './src/screens/ComandaGerenciamentoScreen';

import RegisterCompanyScreen from './src/screens/RegisterCompanyScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrderProvider } from './src/context/OrderContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import { canAccessScreen } from './src/auth/roles';
import OfflineNotice from './src/components/OfflineNotice';
import OfflineQueueManager from './src/components/OfflineQueueManager';
import PrinterService from './src/services/PrinterService';
import { useEffect } from 'react'; // Ensure useEffect is imported if not already

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Novo Pedido') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Montagem') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Cozinha') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Prontos') iconName = focused ? 'checkmark-done-circle' : 'checkmark-done-circle-outline';
          else if (route.name === 'Comandas') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'Admin') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#8B2F2F',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E0D8C8',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 8,
          paddingTop: 8,
        },
      })}
    >
      {canAccessScreen(user?.funcao, 'Novo Pedido') && <Tab.Screen name="Novo Pedido" component={NovoPedidoScreen} />}
      {canAccessScreen(user?.funcao, 'Comandas') && <Tab.Screen name="Comandas" component={ComandaGerenciamentoScreen} />}
      {canAccessScreen(user?.funcao, 'Cozinha') && <Tab.Screen name="Cozinha" component={CozinhaScreen} />}
      {canAccessScreen(user?.funcao, 'Montagem') && <Tab.Screen name="Montagem" component={MontagemScreen} />}
      {canAccessScreen(user?.funcao, 'Prontos') && <Tab.Screen name="Prontos" component={PedidosProntosScreen} options={{ tabBarLabel: 'Entrega' }} />}
      {canAccessScreen(user?.funcao, 'Admin') && <Tab.Screen name="Admin" component={AdminScreen} />}
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
    </Stack.Navigator>
  );
}

function AppContent() {
  const { user, loading, sessionKey } = useAuth();

  // Tentar reconexão com impressora ao iniciar
  useEffect(() => {
    PrinterService.autoConnect();
  }, []);

  // LOADING
  if (loading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" translucent={false} />
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B2F2F" />
            <Text style={styles.loadingText}>Verificando acesso...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // SEM USUÁRIO = AUTH STACK (Login/Register)
  if (!user) {
    return (
      <SafeAreaProvider key={`auth-${sessionKey}-${Date.now()}`}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" translucent={false} />
        <NavigationContainer>
          <AuthStack />
        </NavigationContainer>
      </SafeAreaProvider>
    );
  }



  // COM USUÁRIO = APP (com key única para forçar re-render)
  return (
    <SafeAreaProvider key={`app-${sessionKey}-${Date.now()}`}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" translucent={false} />
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
    backgroundColor: '#F5F1E8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },
  loadingText: {
    marginTop: 10,
    color: '#8B2F2F',
    fontSize: 16,
  },
});

export default Sentry.wrap(function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
});
