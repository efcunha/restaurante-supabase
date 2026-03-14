import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { colorSystem, typography, spacing } from '../design-system';
import { getRoleOverflowScreens } from '../auth/roles';

// Metadados visuais de cada destino secundário
const OVERFLOW_ITEMS: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  Montagem: {
    label: 'Montagem',
    icon: 'layers',
    color: colorSystem.primary,
  },
  Prontos: {
    label: 'Entrega Salão',
    icon: 'checkmark-done-circle',
    color: colorSystem.success,
  },
  RotasDelivery: {
    label: 'Rotas Delivery',
    icon: 'bicycle',
    color: colorSystem.accent,
  },
  Reservas: {
    label: 'Reservas',
    icon: 'calendar',
    color: '#7C3AED',
  },
  Admin: {
    label: 'Administração',
    icon: 'stats-chart',
    color: colorSystem.secondary,
  },
};

export default function OverflowMenuScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const role = (user?.funcao as string) ?? '';
  const overflowKeys = getRoleOverflowScreens(role);

  const items = overflowKeys
    .map((key: string) => ({ key, ...(OVERFLOW_ITEMS[key] ?? null) }))
    .filter((item: { label?: string | null }) => item.label != null);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionTitle}>Mais opções</Text>

      {items.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="apps-outline" size={40} color={colorSystem.textMuted} />
          <Text style={styles.emptyText}>Nenhuma opção adicional disponível.</Text>
        </View>
      )}

      {items.map((item: { key: string; label: string; description?: string; icon: string; color: string }) => (
        <TouchableOpacity
          key={item.key}
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(item.key)}
          accessibilityRole="button"
          accessibilityLabel={item.label}
        >
          <View style={[styles.iconWrapper, { backgroundColor: `${item.color}18` }]}>
            <Ionicons name={item.icon as any} size={24} color={item.color} />
          </View>

          <Text style={styles.rowLabel}>{item.label}</Text>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colorSystem.textMuted}
          />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorSystem.background,
  },
  content: {
    paddingHorizontal: spacing.s16,
    paddingTop: spacing.s24,
    paddingBottom: spacing.s48,
  },
  sectionTitle: {
    ...typography.headingM,
    color: colorSystem.text,
    marginBottom: spacing.s16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.surface,
    borderRadius: 12,
    paddingVertical: spacing.s16,
    paddingHorizontal: spacing.s16,
    marginBottom: spacing.s8,
    borderWidth: 1,
    borderColor: colorSystem.border,
    minHeight: 56,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s16,
  },
  rowLabel: {
    flex: 1,
    ...typography.body,
    fontWeight: '600' as const,
    color: colorSystem.text,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.s48,
    gap: 12,
  },
  emptyText: {
    ...typography.small,
    color: colorSystem.textMuted,
    textAlign: 'center',
  },
});
