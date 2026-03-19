import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../config/SupabaseConfig';
import { getLocalDateKey } from '../utils/dateUtils';
import { ScreenScaffold } from '../layouts/ScreenScaffold';
import { colors } from '../theme/colors';

type DeliveryFailureStatus = 'failed_delivery' | 'returned' | 'refused';

interface DeliveryOccurrence {
  id: string;
  comandaNumber: number | null;
  customerName: string;
  dateKey: string;
  status: DeliveryFailureStatus;
  observations: string;
  deliveryAddress: string;
  updatedAt: string;
  operatorName: string;
  reasonText: string;
}

interface DeliveryOcorrenciasScreenProps {
  onClose: () => void;
}

const STATUS_LABEL: Record<DeliveryFailureStatus, string> = {
  failed_delivery: 'Nao encontrado',
  returned: 'Devolvido',
  refused: 'Recusado'
};

const STATUS_COLOR: Record<DeliveryFailureStatus, string> = {
  failed_delivery: colors.warning,
  returned: colors.secondary,
  refused: colors.danger
};

const OCCURRENCE_OPERATOR_REGEX = /Entrega nao concluida por\s+([^:]+):/i;
const OCCURRENCE_REASON_REGEX = /Entrega nao concluida(?:\s+por\s+[^:]+)?:\s*(.+)$/i;

const getStartDateKey = (daysBack: number): string => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysBack);
  return date.toISOString().slice(0, 10);
};

const formatDateKey = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-');
  if (!year || !month || !day) return dateKey;
  return `${day}/${month}/${year}`;
};

const formatDateTime = (isoDate: string): string => {
  if (!isoDate) return '-';
  return new Date(isoDate).toLocaleString('pt-BR');
};

const extractOperatorAndReason = (observations?: string | null): { operatorName: string; reasonText: string } => {
  const text = String(observations || '').trim();
  if (!text) {
    return {
      operatorName: 'Operador nao identificado',
      reasonText: 'Sem motivo registrado'
    };
  }

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const lastLine = lines.length > 0 ? lines[lines.length - 1] : text;

  const operatorMatch = lastLine.match(OCCURRENCE_OPERATOR_REGEX);
  const reasonMatch = lastLine.match(OCCURRENCE_REASON_REGEX);

  return {
    operatorName: (operatorMatch?.[1] || 'Operador nao identificado').trim(),
    reasonText: (reasonMatch?.[1] || lastLine).trim()
  };
};

export default function DeliveryOcorrenciasScreen({ onClose }: DeliveryOcorrenciasScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>(getLocalDateKey());
  const [operatorFilter, setOperatorFilter] = useState('');
  const [occurrences, setOccurrences] = useState<DeliveryOccurrence[]>([]);

  const fetchOccurrences = useCallback(async () => {
    try {
      if (!user?.companyId) return;
      setLoading(true);

      let query = supabase
        .from('orders')
        .select('id, comanda_number, client_name, date_key, status, observations, delivery_address, updated_at')
        .eq('company_id', user.companyId)
        .eq('order_type', 'delivery')
        .in('status', ['failed_delivery', 'returned', 'refused'])
        .gte('date_key', getStartDateKey(30))
        .order('updated_at', { ascending: false });

      if (selectedDay !== 'all') {
        query = query.eq('date_key', selectedDay);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: DeliveryOccurrence[] = (data || []).map((row: any) => {
        const { operatorName, reasonText } = extractOperatorAndReason(row.observations);
        return {
          id: String(row.id),
          comandaNumber: row.comanda_number ?? null,
          customerName: row.client_name || 'Cliente sem nome',
          dateKey: row.date_key,
          status: row.status,
          observations: row.observations || '',
          deliveryAddress: row.delivery_address || 'Endereco nao informado',
          updatedAt: row.updated_at || '',
          operatorName,
          reasonText
        };
      });

      setOccurrences(mapped);
    } catch (err) {
      console.error('[DeliveryOcorrencias] erro ao buscar ocorrencias:', err);
      setOccurrences([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDay, user]);

  useEffect(() => {
    fetchOccurrences();
  }, [fetchOccurrences]);

  useEffect(() => {
    if (!user?.companyId) return;

    const channel = supabase
      .channel(`delivery-occurrences-${user.companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `company_id=eq.${user.companyId}`
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          const oldStatus = (payload.old as any)?.status;
          const isFailureStatus = ['failed_delivery', 'returned', 'refused'].includes(newStatus) ||
            ['failed_delivery', 'returned', 'refused'].includes(oldStatus);

          if (isFailureStatus) {
            fetchOccurrences();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchOccurrences, user]);

  const dayOptions = useMemo(() => {
    const uniqueDays = Array.from(new Set(occurrences.map(item => item.dateKey))).sort((a, b) => b.localeCompare(a));
    const withCurrent = selectedDay !== 'all' && !uniqueDays.includes(selectedDay)
      ? [selectedDay, ...uniqueDays]
      : uniqueDays;
    return ['all', ...withCurrent];
  }, [occurrences, selectedDay]);

  const groupedByDayAndOperator = useMemo(() => {
    const normalizedFilter = operatorFilter.trim().toLowerCase();

    const result: Record<string, Record<string, DeliveryOccurrence[]>> = {};

    for (const item of occurrences) {
      if (normalizedFilter && !item.operatorName.toLowerCase().includes(normalizedFilter)) continue;

      if (!result[item.dateKey]) result[item.dateKey] = {};
      if (!result[item.dateKey][item.operatorName]) result[item.dateKey][item.operatorName] = [];

      result[item.dateKey][item.operatorName].push(item);
    }

    return result;
  }, [occurrences, operatorFilter]);

  const orderedDays = useMemo(
    () => Object.keys(groupedByDayAndOperator).sort((a, b) => b.localeCompare(a)),
    [groupedByDayAndOperator]
  );

  return (
    <ScreenScaffold
      title="Ocorrencias de Entrega"
      leftAction={{ label: 'Voltar', onPress: onClose }}
    >
      <View style={styles.container}>
        <View style={styles.filtersContainer}>
          <View style={styles.filtersHeaderRow}>
            <Text style={styles.filtersTitle}>Filtro por dia</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={fetchOccurrences}>
              <Ionicons name="refresh" size={14} color={colors.white} />
              <Text style={styles.refreshButtonText}>Atualizar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayFiltersRow}>
            {dayOptions.map((day) => {
              const isSelected = selectedDay === day;
              const label = day === 'all' ? 'Todos' : formatDateKey(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayChip, isSelected && styles.dayChipActive]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TextInput
            value={operatorFilter}
            onChangeText={setOperatorFilter}
            placeholder="Filtrar por entregador"
            style={styles.operatorInput}
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando ocorrencias...</Text>
          </View>
        ) : orderedDays.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛵</Text>
            <Text style={styles.emptyTitle}>Nenhuma ocorrencia encontrada</Text>
            <Text style={styles.emptySubtitle}>Ajuste os filtros ou aguarde novas atualizacoes.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {orderedDays.map((day) => {
              const operatorsMap = groupedByDayAndOperator[day] || {};
              const operatorNames = Object.keys(operatorsMap).sort((a, b) => a.localeCompare(b));

              return (
                <View key={day} style={styles.daySection}>
                  <Text style={styles.dayTitle}>Dia {formatDateKey(day)}</Text>

                  {operatorNames.map((operatorName) => {
                    const list = operatorsMap[operatorName] || [];
                    return (
                      <View key={`${day}-${operatorName}`} style={styles.operatorSection}>
                        <View style={styles.operatorHeader}>
                          <Ionicons name="person-outline" size={16} color={colors.primary} />
                          <Text style={styles.operatorTitle}>{operatorName}</Text>
                          <Text style={styles.operatorCount}>{list.length}</Text>
                        </View>

                        {list.map((occurrence) => (
                          <View key={occurrence.id} style={styles.occurrenceCard}>
                            <View style={styles.occurrenceTopRow}>
                              <Text style={styles.comandaText}>Pedido #{occurrence.comandaNumber ?? '?'}</Text>
                              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[occurrence.status] }]}>
                                <Text style={styles.statusBadgeText}>{STATUS_LABEL[occurrence.status]}</Text>
                              </View>
                            </View>

                            <Text style={styles.customerText}>{occurrence.customerName}</Text>
                            <Text style={styles.metaText}>Motivo: {occurrence.reasonText}</Text>
                            <Text style={styles.metaText}>Endereco: {occurrence.deliveryAddress}</Text>
                            <Text style={styles.metaDate}>Atualizado em {formatDateTime(occurrence.updatedAt)}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
      <StatusBar style="light" />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filtersTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filtersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  refreshButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  dayFiltersRow: {
    gap: 8,
    paddingBottom: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: colors.white,
  },
  operatorInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.white,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  daySection: {
    marginBottom: 18,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 10,
  },
  operatorSection: {
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  operatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  operatorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  operatorCount: {
    minWidth: 22,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  occurrenceCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
  },
  occurrenceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  comandaText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  customerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 3,
  },
  metaDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
