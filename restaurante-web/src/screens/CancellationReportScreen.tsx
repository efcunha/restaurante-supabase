import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../config/SupabaseConfig';
import { useAuth } from '../context/AuthContext';
import { getDateKeyRange, Period } from '../utils/dateUtils';
import { colors } from '../theme/colors';
import { auditService } from '../services/AuditService';

type OperatorSummary = {
  operatorName: string;
  comandasCanceladas: number;
  valorComandasCanceladas: number;
  itensCancelados: number;
  valorItensCancelados: number;
};

type CancelledComandaRow = {
  comanda_number: number;
  total_consumed: number;
  canceled_by_name: string | null;
  canceled_at: string | null;
  motivo_cancelamento: string | null;
};

type ItemCancellationLog = {
  created_at: string;
  user_email: string | null;
  metadata: {
    itemName?: string;
    quantity?: number;
    estimatedValue?: number;
    comandaNumber?: string | number;
    source?: string;
  } | null;
};

interface Props {
  onClose: () => void;
}

const PERIOD_OPTIONS: Array<{ key: Period; label: string }> = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Últimos 7 dias' },
  { key: 'mes', label: 'Mês atual' },
];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toIsoStart(dateKey: string): string {
  return `${dateKey}T00:00:00.000Z`;
}

function toIsoEnd(dateKey: string): string {
  return `${dateKey}T23:59:59.999Z`;
}

export default function CancellationReportScreen({ onClose }: Props) {
  const { user } = useAuth();
  const [periodo, setPeriodo] = useState<Period>('semana');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comandas, setComandas] = useState<CancelledComandaRow[]>([]);
  const [itemLogs, setItemLogs] = useState<ItemCancellationLog[]>([]);

  const range = useMemo(() => getDateKeyRange(periodo), [periodo]);

  const totalComandasCanceladas = comandas.length;
  const totalValorComandas = useMemo(
    () => comandas.reduce((acc, row) => acc + Number(row.total_consumed || 0), 0),
    [comandas]
  );
  const totalItensCancelados = useMemo(
    () => itemLogs.reduce((acc, row) => acc + Number(row.metadata?.quantity || 1), 0),
    [itemLogs]
  );
  const totalValorItensCancelados = useMemo(
    () => itemLogs.reduce((acc, row) => acc + Number(row.metadata?.estimatedValue || 0), 0),
    [itemLogs]
  );

  const byOperator = useMemo(() => {
    const summaryMap = new Map<string, OperatorSummary>();

    comandas.forEach((row) => {
      const key = row.canceled_by_name || 'Não identificado';
      const current = summaryMap.get(key) || {
        operatorName: key,
        comandasCanceladas: 0,
        valorComandasCanceladas: 0,
        itensCancelados: 0,
        valorItensCancelados: 0,
      };

      current.comandasCanceladas += 1;
      current.valorComandasCanceladas += Number(row.total_consumed || 0);
      summaryMap.set(key, current);
    });

    itemLogs.forEach((row) => {
      const key = row.user_email || 'Não identificado';
      const current = summaryMap.get(key) || {
        operatorName: key,
        comandasCanceladas: 0,
        valorComandasCanceladas: 0,
        itensCancelados: 0,
        valorItensCancelados: 0,
      };

      current.itensCancelados += Number(row.metadata?.quantity || 1);
      current.valorItensCancelados += Number(row.metadata?.estimatedValue || 0);
      summaryMap.set(key, current);
    });

    return Array.from(summaryMap.values()).sort((a, b) => {
      const valueA = a.valorComandasCanceladas + a.valorItensCancelados;
      const valueB = b.valorComandasCanceladas + b.valorItensCancelados;
      return valueB - valueA;
    });
  }, [comandas, itemLogs]);

  const loadReport = async () => {
    try {
      if (!user?.companyId) {
        setError('Empresa não identificada.');
        return;
      }

      setLoading(true);
      setError(null);

      const startDate = range.startKey;
      const endDate = range.endKey;
      const startIso = toIsoStart(startDate);
      const endIso = toIsoEnd(endDate);

      const [comandasResult, logsResult] = await Promise.all([
        supabase
          .from('comandas')
          .select('comanda_number,total_consumed,canceled_by_name,canceled_at,motivo_cancelamento')
          .eq('company_id', user.companyId)
          .eq('status', 'cancelada')
          .gte('date_key', startDate)
          .lte('date_key', endDate)
          .order('canceled_at', { ascending: false }),
        supabase
          .from('audit_logs')
          .select('created_at,user_email,metadata')
          .eq('company_id', user.companyId)
          .eq('event_type', 'order.item_cancelled')
          .gte('created_at', startIso)
          .lte('created_at', endIso)
          .order('created_at', { ascending: false })
      ]);

      if (comandasResult.error) throw comandasResult.error;
      if (logsResult.error) throw logsResult.error;

      setComandas((comandasResult.data || []) as CancelledComandaRow[]);
      setItemLogs((logsResult.data || []) as ItemCancellationLog[]);

      // Telemetria não bloqueante: apenas rastreabilidade de consulta do relatório.
      auditService.log({
        eventType: 'report.cancellation_generated',
        resourceType: 'report',
        resourceId: 'cancellation-report',
        companyId: user.companyId,
        metadata: {
          period: periodo,
          startDate,
          endDate,
          cancelledComandasCount: (comandasResult.data || []).length,
          cancelledItemsCount: (logsResult.data || []).length,
        },
      }).catch(() => undefined);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar relatório de cancelamentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [periodo, user?.companyId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relatório de Cancelamentos</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.periodRow}>
        {PERIOD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[styles.periodButton, periodo === option.key && styles.periodButtonActive]}
            onPress={() => setPeriodo(option.key)}
          >
            <Text style={[styles.periodButtonText, periodo === option.key && styles.periodButtonTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {loading && (
          <View style={styles.centeredState}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.centeredText}>Carregando relatório...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.centeredState}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!loading && !error && (
          <>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Comandas canceladas</Text>
                <Text style={styles.kpiValue}>{totalComandasCanceladas}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Valor em comandas</Text>
                <Text style={styles.kpiValue}>{formatCurrency(totalValorComandas)}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Itens cancelados</Text>
                <Text style={styles.kpiValue}>{totalItensCancelados}</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Valor em itens</Text>
                <Text style={styles.kpiValue}>{formatCurrency(totalValorItensCancelados)}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Por operador</Text>
              {byOperator.length === 0 && <Text style={styles.emptyText}>Sem cancelamentos no período.</Text>}
              {byOperator.map((op) => (
                <View key={op.operatorName} style={styles.operatorRow}>
                  <View style={styles.operatorHeader}>
                    <Text style={styles.operatorName}>{op.operatorName}</Text>
                    <Text style={styles.operatorTotal}>
                      {formatCurrency(op.valorComandasCanceladas + op.valorItensCancelados)}
                    </Text>
                  </View>
                  <Text style={styles.operatorDetail}>
                    Comandas: {op.comandasCanceladas} ({formatCurrency(op.valorComandasCanceladas)})
                  </Text>
                  <Text style={styles.operatorDetail}>
                    Itens: {op.itensCancelados} ({formatCurrency(op.valorItensCancelados)})
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Últimas comandas canceladas</Text>
              {comandas.slice(0, 20).map((row, idx) => (
                <View key={`${row.comanda_number}-${idx}`} style={styles.listRow}>
                  <Text style={styles.listTitle}>Comanda #{row.comanda_number}</Text>
                  <Text style={styles.listMeta}>
                    {row.canceled_by_name || 'Não identificado'} • {row.canceled_at ? new Date(row.canceled_at).toLocaleString('pt-BR') : 'Sem data'}
                  </Text>
                  <Text style={styles.listValue}>{formatCurrency(Number(row.total_consumed || 0))}</Text>
                </View>
              ))}
              {comandas.length === 0 && <Text style={styles.emptyText}>Nenhuma comanda cancelada no período.</Text>}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  periodButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: colors.white,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centeredState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  centeredText: {
    marginTop: 8,
    color: colors.textSecondary,
  },
  errorText: {
    color: colors.danger,
    fontWeight: '600',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    width: '48%',
  },
  kpiLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  kpiValue: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  section: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  operatorRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  operatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  operatorName: {
    color: colors.text,
    fontWeight: '700',
  },
  operatorTotal: {
    color: colors.primary,
    fontWeight: '700',
  },
  operatorDetail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  listRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 8,
  },
  listTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  listMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  listValue: {
    color: colors.warning,
    fontWeight: '700',
    marginTop: 4,
  },
});
