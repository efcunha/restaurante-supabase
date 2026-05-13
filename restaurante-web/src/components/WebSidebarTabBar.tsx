import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colorSystem } from '../design-system';
import { useAuth } from '../context/AuthContext';

/** Largura fixa da sidebar */
export const SIDEBAR_WIDTH = 260;

const ROUTE_ICONS: Record<string, string> = {
  'Novo Pedido':  'add-circle',
  'Delivery':     'fast-food',
  'Entregas':     'bicycle',
  'Reservas':     'calendar',
  'Mapa':         'map',
  'Comandas':     'receipt',
  'Cozinha':      'flame',
  'Montagem':     'layers',
  'Prontos':      'checkmark-done-circle',
  'Admin':        'stats-chart',
};

const ROUTE_LABELS: Record<string, string> = {
  'Novo Pedido':  'Novo Pedido',
  'Delivery':     'Pedido Delivery',
  'Entregas':     'Rotas Delivery',
  'Reservas':     'Reservas',
  'Mapa':         'Mapa de Mesas',
  'Comandas':     'Comandas',
  'Cozinha':      'Cozinha (KDS)',
  'Montagem':     'Montagem',
  'Prontos':      'Despacho',
  'Admin':        'Administração',
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function WebSidebarTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { user, logout } = useAuth();
  const displayName = user?.nome || user?.email || '';
  const initials = getInitials(displayName.includes('@') ? displayName.split('@')[0] : displayName);

  const handleLogout = () => {
    // Este componente é exclusivo web — usa window.confirm diretamente
    if (window.confirm('Deseja encerrar a sessão?')) {
      logout();
    }
  };

  return (
    <View style={styles.sidebar}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Ionicons name="restaurant" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.brandName} numberOfLines={1}>Restaurante</Text>
        </View>
        {user && (
          <View style={styles.userRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Itens de navegação */}
      <ScrollView
        style={styles.navList}
        contentContainerStyle={styles.navListContent}
        showsVerticalScrollIndicator={false}
      >
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
          const isNewOrder = route.name === 'Novo Pedido';
          const { options } = descriptors[route.key];
          const label =
            ROUTE_LABELS[route.name] ??
            (options.tabBarLabel as string | undefined) ??
            route.name;
          const iconName = ROUTE_ICONS[route.name] ?? 'apps-outline';
          const resolvedIcon = isActive ? iconName : `${iconName}-outline`;

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={({ pressed }) => [
                styles.navItem,
                isNewOrder && !isActive && styles.navItemNewOrderInactive,
                isActive && styles.navItemActive,
                pressed && !isActive && styles.navItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={resolvedIcon as any}
                size={20}
                color={isActive ? '#1A2B35' : isNewOrder ? '#F1B24B' : 'rgba(255,255,255,0.5)'}
                style={styles.navIcon}
              />
              <Text
                style={[
                  styles.navLabel,
                  isActive && styles.navLabelActive,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Rodapé */}
      <View style={styles.footer}>
        <View style={styles.footerBadge}>
          <Text style={styles.footerText}>PDV Web</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#F87171" />
          <Text style={styles.logoutBtnText}>Sair</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#0D1B2A',
    zIndex: 100,
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 18,
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colorSystem.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userName: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  navList: {
    flex: 1,
  },
  navListContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  navItemActive: {
    backgroundColor: '#F1B24B',
    // @ts-ignore
    boxShadow: '0px 4px 14px rgba(241, 178, 75, 0.35)',
  },
  navItemNewOrderInactive: {
    borderWidth: 1,
    borderColor: 'rgba(241, 178, 75, 0.35)',
  },
  navItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  navIcon: {
    marginRight: 12,
    width: 22,
    textAlign: 'center',
  },
  navLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    letterSpacing: 0.1,
  },
  navLabelActive: {
    color: '#1A2B35',
    fontWeight: '800',
  },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.20)',
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
});
