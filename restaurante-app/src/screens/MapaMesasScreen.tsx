import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import TableService from '../services/TableService';
import SupabaseOrderService from '../services/supabase/SupabaseOrderService';
import { supabase } from '../config/SupabaseConfig';
import { Table, Order } from '../types';
import { useAuth } from '../context/AuthContext';
// @ts-ignore
import PedidoDetalhesModal from './PedidoDetalhesModal';
import { getTodayKey } from '../utils/dateUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
const { width } = Dimensions.get('window');

export default function MapaMesasScreen({ navigation, route }: any) {
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    const [loading, setLoading] = useState(true);
    const [environments, setEnvironments] = useState<any[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
    const [tables, setTables] = useState<Table[]>([]);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [selectedFilters, setSelectedFilters] = useState<string[]>(['Livre', 'Ocupada', 'Pagando']); // All selected by default

    // Modal State
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [selectedTableNumber, setSelectedTableNumber] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const applyActiveOrdersFilter = React.useCallback(async (orders: Order[]) => {
        if (!user?.companyId) {
            setActiveOrders([]);
            return;
        }

        const { data: canceledComandas } = await supabase
            .from('comandas')
            .select('comanda_number')
            .eq('company_id', user.companyId)
            .eq('date_key', getTodayKey())
            .eq('status', 'cancelada');

        const canceledComandaSet = new Set(
            (canceledComandas || []).map((c: any) => String(c.comanda_number || ''))
        );

        const active = orders.filter(o =>
            o.status !== 'cancelada' &&
            o.status !== 'cancelled' &&
            o.comandaStatus !== 'cancelada' &&
            !canceledComandaSet.has(String(o.comandaNumber || '')) &&
            !o.isPago
        );

        setActiveOrders(active);
    }, [user?.companyId]);

    const refreshActiveOrders = React.useCallback(async () => {
        if (!user?.companyId) {
            setActiveOrders([]);
            return;
        }

        const orders = await SupabaseOrderService.fetchActiveOrders(user.companyId, getTodayKey());
        await applyActiveOrdersFilter(orders);
    }, [applyActiveOrdersFilter, user?.companyId]);

    // Load Environments and Tables
    const loadStructure = async () => {
        if (!user?.companyId) return;
        try {
            const envs = await TableService.getEnvironments(user.companyId);
            setEnvironments(envs);
            // Priority: keep existing selected if still valid, else select first
            if (envs.length > 0) {
                const currentStillExists = envs.find(e => e.id === selectedEnvId);
                if (!currentStillExists) {
                    setSelectedEnvId(envs[0].id);
                }
            }

            const allTables = await TableService.getTables(user.companyId);
            setTables(allTables);
        } catch (error) {
            console.error('Error loading structure:', error);
            Alert.alert('Erro', 'Falha ao carregar estrutura de mesas.');
        }
    };

    // Reabrir modal se voltar do pagamento com ID de pedido
    useEffect(() => {
        // @ts-ignore
        if (route.params?.openOrderId) {
            // @ts-ignore
            const orderId = route.params.openOrderId;
            setSelectedOrderId(orderId);
            setSelectedOrderIds([orderId]);
            setSelectedTableNumber(null);
            setModalVisible(true);
            
            // Limpar parametro para não reabrir em reload
            navigation.setParams({ openOrderId: null });
        }
    }, [route.params?.openOrderId]);

    // Load once on mount or when companyId changes
    useEffect(() => {
        loadStructure();
        setLoading(false);
    }, [user?.companyId]);

    // Reload structure when screen gains focus (e.g., returning from config screen)
    useFocusEffect(
        React.useCallback(() => {
            if (user?.companyId) {
                loadStructure();
                refreshActiveOrders();
            }
        }, [refreshActiveOrders, user?.companyId])
    );

    // Real-time Orders Listener
    useEffect(() => {
        if (!user?.companyId) return;

        const unsubscribe = SupabaseOrderService.listenToActiveOrders(user.companyId, async ({ orders }) => {
            await applyActiveOrdersFilter(orders);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [applyActiveOrdersFilter, user?.companyId]);

    // Derived state: Tables with status
    const tablesWithStatus = useMemo(() => {
        const envTables = tables.filter(t => t.environment_id === selectedEnvId);

        return envTables.map(table => {
            // Find orders for this table
            // Matching by table.number (string) vs order.mesa (string)
            // Normalize numbers to avoid "01" !== "1" mismatch
// Helper for robust table matching (ignores "Mesa", leading zeros, etc)
            const isActiveOrder = (o: Order) => {
                 if (o.isPago || o.status === 'cancelled' || o.status === 'cancelada' || o.comandaStatus === 'cancelada') return false;
                 
                 const orderMesaStr = String(o.mesa || '').replace(/\D/g, ''); // "Mesa 1" -> "1"
                 const tableNumStr = String(table.number || '').replace(/\D/g, ''); // "01" -> "1"

                 // Ensure we have valid numbers to compare
                 if (!orderMesaStr || !tableNumStr) return false;
                 
                 return Number(orderMesaStr) === Number(tableNumStr);
            };

            const tableOrders = activeOrders.filter(isActiveOrder);

            let status: Table['status'] = 'Livre';
            let total = 0;
            let time = '';

            if (tableOrders.length > 0) {
                status = 'Ocupada';
                // Check if asking for bill (not implemented yet, but could be flag)

                // Sum total
                total = tableOrders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);

                // Oldest order time
                const stats = [...tableOrders].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                if (stats.length > 0) {
                    time = stats[0].horarioCriacao;
                }
            }

            return {
                ...table,
                status,
                order_total: total,
                order_time: time,
                activeOrders: tableOrders // Keep ref for click handler
            };
        });
    }, [tables, selectedEnvId, activeOrders]);

    // Filter tables by selected status
    const filteredTables = useMemo(() => {
        return tablesWithStatus.filter(table => selectedFilters.includes(table.status));
    }, [tablesWithStatus, selectedFilters]);

    // Calculate map centering offset
    const mapCenterOffset = useMemo(() => {
        // Only valid for Absolute Layout mode
        const hasAbsolutePosition = filteredTables.some(t => t.position_x !== 0 || t.position_y !== 0);
        if (!hasAbsolutePosition || filteredTables.length === 0) return 0;

        const tableWidth = 100; // Matches style width
        const minX = Math.min(...filteredTables.map(t => t.position_x));
        const maxX = Math.max(...filteredTables.map(t => t.position_x));

        const contentWidth = maxX - minX + tableWidth;
        const availableWidth = width - 40; // Screen width minus container padding (20 * 2)

        // Calculate shift needed to center the content
        const targetX = (availableWidth - contentWidth) / 2;

        // If content is wider than screen, we might want to clamp or just center it.
        // Centering is usually safer visually.

        return targetX - minX;
    }, [filteredTables]);

    // Toggle filter
    const toggleFilter = (status: string) => {
        setSelectedFilters(prev => {
            if (prev.includes(status)) {
                // Remove if already selected
                return prev.filter(s => s !== status);
            } else {
                // Add if not selected
                return [...prev, status];
            }
        });
    };

    // Handlers
    const handleTablePress = (table: any) => {
        if (table.status === 'Livre') {
            // New Order
            // @ts-ignore
            navigation.navigate('Novo Pedido', {
                mesaParam: table.number, // Pass as param to pre-fill
                tableId: table.id
            });
        } else {
            // View Tables Orders
            // Open Details Modal for the first active order
            // Ignora pedidos pagos ou cancelados
            const filteredOrders = table.activeOrders.filter((o: Order) => !o.isPago && o.status !== 'cancelled' && o.status !== 'cancelada');
            
            if (filteredOrders.length > 0) {
                const orderedIds = filteredOrders.map((order: Order) => order.id);
                setSelectedOrderId(filteredOrders.length === 1 ? filteredOrders[0].id : null);
                setSelectedOrderIds(orderedIds);
                setSelectedTableNumber(String(table.number));
                setModalVisible(true);
            } else {
                // Se não tem pedidos (ou todos pagos), abre novo pedido
                // @ts-ignore
                navigation.navigate('Novo Pedido', {
                    mesaParam: table.number,
                    tableId: table.id
                });
            }
        }
    };

    const renderEnvTabs = () => (
        <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                {environments.map(env => (
                    <TouchableOpacity
                        key={env.id}
                        style={[styles.tab, selectedEnvId === env.id && styles.tabActive]}
                        onPress={() => setSelectedEnvId(env.id)}
                    >
                        <Text style={[styles.tabText, selectedEnvId === env.id && styles.tabTextActive]}>
                            {env.name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderFilterChips = () => {
        const filterOptions = [
            { status: 'Livre', icon: 'checkmark-circle', color: colors.success },
            { status: 'Ocupada', icon: 'time', color: colors.warning },
            { status: 'Pagando', icon: 'card', color: colors.danger }
        ];

        return (
            <View style={styles.filterContainer}>
                <Ionicons name="filter" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
                {filterOptions.map(({ status, icon, color }) => (
                    <TouchableOpacity
                        key={status}
                        style={[
                            styles.filterChip,
                            selectedFilters.includes(status) && { ...styles.filterChipActive, borderColor: color, backgroundColor: color + '15' }
                        ]}
                        onPress={() => toggleFilter(status)}
                    >
                        <Ionicons
                            name={icon as any}
                            size={14}
                            color={selectedFilters.includes(status) ? color : colors.textSecondary}
                        />
                        <Text style={[
                            styles.filterChipText,
                            selectedFilters.includes(status) && { ...styles.filterChipTextActive, color }
                        ]}>
                            {status}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <View style={styles.headerLeft} />
                <View style={styles.headerCenter}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="grid-outline" size={24} color={colors.white} style={styles.headerIcon} />
                        <Text style={styles.headerTitle}>Mapa de Mesas</Text>
                    </View>
                    {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
                </View>
                <View style={styles.headerRight} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <>
                    {renderEnvTabs()}
                    {renderFilterChips()}
                    <ScrollView contentContainerStyle={styles.content}>
                        {selectedEnvId ? (
                            <View>
                                {filteredTables.length === 0 && (
                                    <View style={styles.emptyStateContainer}>
                                        <Ionicons name="alert-circle-outline" size={48} color={colors.secondary} />
                                        <Text style={styles.emptyText}>Nenhuma mesa {selectedFilters.length < 3 ? 'com esse status' : 'neste ambiente'}.</Text>
                                        <Text style={styles.emptySubText}>{selectedFilters.length < 3 ? 'Ajuste os filtros acima.' : 'Cadastre mesas na Configuração.'}</Text>
                                    </View>
                                )}

                                {/* Layout Logic: Check if any table has non-zero position */}
                                {filteredTables.some(t => t.position_x !== 0 || t.position_y !== 0) ? (
                                    <View style={{ position: 'relative', height: Math.max(600, ...filteredTables.map(t => t.position_y + 150)) }}>
                                        {filteredTables.map(table => (
                                            <TouchableOpacity
                                                key={table.id}
                                                style={{
                                                    position: 'absolute',
                                                    left: table.position_x + mapCenterOffset,
                                                    top: table.position_y,
                                                    alignItems: 'center',
                                                    width: 100,
                                                    flexDirection: 'column-reverse' // Info tag above table
                                                }}
                                                onPress={() => handleTablePress(table)}
                                            >
                                                <TableGraphic
                                                    shape={table.shape as any}
                                                    seats={table.seats}
                                                    status={table.status}
                                                    tableNumber={table.number}
                                                    size={60}
                                                />

                                                <View style={styles.infoTag}>
                                                    {table.status === 'Ocupada' ? (
                                                        <View>
                                                            <Text style={styles.infoPrice}>R$ {table.order_total?.toFixed(2)}</Text>
                                                            {!!table.order_time && <Text style={styles.infoTime}>{table.order_time}</Text>}
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.infoSeats}>{table.seats} lug.</Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={styles.grid}>
                                        {filteredTables.map(table => (
                                            <TouchableOpacity
                                                key={table.id}
                                                style={styles.tableWrapper}
                                                onPress={() => handleTablePress(table)}
                                            >
                                                <TableGraphic
                                                    shape={table.shape as any}
                                                    seats={table.seats}
                                                    status={table.status}
                                                    tableNumber={table.number}
                                                    size={70}
                                                />

                                                <View style={styles.infoTag}>
                                                    {table.status === 'Ocupada' ? (
                                                        <View>
                                                            <Text style={styles.infoPrice}>R$ {table.order_total?.toFixed(2)}</Text>
                                                            {!!table.order_time && <Text style={styles.infoTime}>{table.order_time}</Text>}
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.infoSeats}>{table.seats} lug.</Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Selecione um ambiente</Text>
                            </View>
                        )}
                    </ScrollView>
                </>
            )}

            {/* Floating Action Button to Edit Layout */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    // @ts-ignore
                    navigation.navigate('Admin', {
                        openConfigMesas: true
                    });
                }}
            >
                <Ionicons name="settings-outline" size={24} color={colors.white} />
            </TouchableOpacity>

            {/* Modal de Detalhes do Pedido */}
            {(!!selectedOrderId || selectedOrderIds.length > 0) && (
                <PedidoDetalhesModal
                    visible={modalVisible}
                    orderId={selectedOrderId || undefined}
                    orderIds={selectedOrderIds}
                    tableNumber={selectedTableNumber || undefined}
                    onClose={() => {
                        setModalVisible(false);
                        setSelectedOrderId(null);
                        setSelectedOrderIds([]);
                        setSelectedTableNumber(null);
                    }}
                />
            )}
        </View>
    );
}

import TableGraphic from '../components/TableGraphic';

// ... (keep existing imports, but remove unused if any)

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.primary, paddingBottom: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
    headerLeft: { flex: 1 },
    headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
    headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginRight: 6 },
    headerTitle: { color: colors.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    userInfo: { fontSize: 12, color: colors.userInfo, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabsContainer: { height: 60, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabsScroll: { paddingHorizontal: 15, alignItems: 'center' },
    tab: {
        paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, borderRadius: 20,
        backgroundColor: colors.primaryTint, borderWidth: 1, borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { color: colors.textSecondary, fontWeight: '600' },
    tabTextActive: { color: colors.white },

    content: { padding: 20, paddingBottom: 100 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 30 },

    tableWrapper: {
        alignItems: 'center',
        marginBottom: 10,
        // Optional: specific width if needed, or let component decide
    },
    infoTag: {
        marginBottom: 6, // Changed from marginTop since tag is now above table
        backgroundColor: colors.white,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
        minWidth: 60,
        alignItems: 'center'
    },
    infoPrice: { fontSize: 12, fontWeight: 'bold', color: colors.danger },
    infoTime: { fontSize: 10, color: colors.textSecondary },
    infoSeats: { fontSize: 12, color: colors.textSecondary },

    emptyState: { padding: 40, alignItems: 'center' },
    emptyStateContainer: { width: '100%', alignItems: 'center', padding: 40 },
    emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 10, fontWeight: 'bold' },
    emptySubText: { color: colors.textSecondary, fontSize: 14, marginTop: 5 },

    // Filter Chips
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.primaryTint,
        gap: 4,
    },
    filterChipActive: {
        borderWidth: 1.5,
    },
    filterChipText: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    filterChipTextActive: {
        fontWeight: 'bold',
    },

    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});
