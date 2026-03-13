import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colorSystem, typography, spacing } from '../design-system';
import { useAuth } from '../context/AuthContext';

/** Largura fixa da sidebar */
export const SIDEBAR_WIDTH = 270;

/** Mapeamento de ícone Ionicons por nome de rota */
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

/** Rótulos de exibição por nome de rota */
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

/**
 * Sidebar de navegação para a versão web.
 * Substitui a barra de tabs inferior por um painel lateral fixo.
 */
export function WebSidebarTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { user } = useAuth();

  return (
    <View style={styles.sidebar}>
      {/* Cabeçalho: nome do app + usuário */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Ionicons name="restaurant" size={22} color={colorSystem.primary} />
          <Text style={styles.brandName} numberOfLines={1}>Restaurante</Text>
        </View>
        {user && (
          <View style={styles.userChip}>
            <Ionicons name="person-circle-outline" size={14} color={colorSystem.textMuted} />
            <Text style={styles.userName} numberOfLines={1}>
              {user.nome || user.email}
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
          const { options } = descriptors[route.key];
          const label =
            ROUTE_LABELS[route.name] ??
            (options.tabBarLabel as string | undefined) ??
            route.name;
          const iconName = ROUTE_ICONS[route.name] ?? 'apps-outline';

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={({ pressed }) => [
                styles.navItem,
                isActive && styles.navItemActive,
                pressed && !isActive && styles.navItemPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={(isActive ? iconName : `${iconName}-outline`) as any}
                size={20}
                color={isActive ? colorSystem.primary : colorSystem.textMuted}
                style={styles.navIcon}
              />
              <Text
                style={[styles.navLabel, isActive && styles.navLabelActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Rodapé com versão / crédito */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>PDV Web</Text>
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
    backgroundColor: colorSystem.surface,
    borderRightWidth: 1,
    borderRightColor: colorSystem.border,
    zIndex: 100,
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: spacing.s16,
    paddingTop: spacing.s24,
    paddingBottom: spacing.s16,
    gap: spacing.s8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s8,
  },
  brandName: {
    ...typography.headingM,
    color: colorSystem.secondary,
    flex: 1,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    ...typography.small,
    color: colorSystem.textMuted,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colorSystem.border,
    marginHorizontal: spacing.s16,
    marginBottom: spacing.s8,
  },
  navList: {
    flex: 1,
  },
  navListContent: {
    paddingHorizontal: spacing.s12,
    paddingVertical: spacing.s8,
    gap: spacing.s4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: spacing.s12,
    paddingHorizontal: spacing.s12,
    minHeight: 44,
  },
  navItemActive: {
    backgroundColor: `${colorSystem.primary}18`,
  },
  navItemPressed: {
    backgroundColor: colorSystem.background,
  },
  navIcon: {
    marginRight: spacing.s12,
    width: 22,
    textAlign: 'center',
  },
  navLabel: {
    ...typography.body,
    color: colorSystem.textMuted,
    fontWeight: '500',
    flex: 1,
  },
  navLabelActive: {
    color: colorSystem.primary,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s12,
    borderTopWidth: 1,
    borderTopColor: colorSystem.border,
  },
  footerText: {
    ...typography.small,
    color: colorSystem.textMuted,
  },
});
