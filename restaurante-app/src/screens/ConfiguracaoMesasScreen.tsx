import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import TableService from '../services/TableService';
import TableGraphic from '../components/TableGraphic';
import DraggableTable from '../components/DraggableTable'; // Added
import { Environment, Table } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
const { width } = Dimensions.get('window');


interface Props {
    onClose?: () => void;
}

export default function ConfiguracaoMesasScreen({ onClose }: Props) {
    const navigation = useNavigation();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();

    // Editor State
    const [isEditingLayout, setIsEditingLayout] = useState(false);
    const [layoutTables, setLayoutTables] = useState<Table[]>([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const [loading, setLoading] = useState(true);
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
    const [tables, setTables] = useState<Table[]>([]);

    // Modals state
    const [showEnvModal, setShowEnvModal] = useState(false);
    const [showTableModal, setShowTableModal] = useState(false);

    // Form state
    const [envName, setEnvName] = useState('');
    const [editingEnv, setEditingEnv] = useState<Environment | null>(null);

    const [tableForm, setTableForm] = useState<{
        id?: string;
        number: string;
        seats: string;
        shape: 'square' | 'round' | 'rect';
    }>({ number: '', seats: '4', shape: 'square' });

    // Load data
    const loadData = useCallback(async () => {
        if (!user?.companyId) return;
        try {
            setLoading(true);
            const envs = await TableService.getEnvironments(user.companyId);
            setEnvironments(envs);

            setEnvironments(envs);

            // If we have environments and none selected, or selected one was deleted
            const currentStillExists = envs.find(e => e.id === selectedEnvId);
            if (envs.length > 0 && (!selectedEnvId || !currentStillExists)) {
                setSelectedEnvId(envs[0].id);
            }
        } catch (error) {
            console.error('Error loading environments:', error);
            Alert.alert('Erro', 'Falha ao carregar ambientes.');
        } finally {
            setLoading(false);
        }
    }, [user?.companyId, selectedEnvId]);

    // Load tables when environment changes - Local filtering
    useEffect(() => {
        if (!user?.companyId || !selectedEnvId) return;

        // We could optimize this by fetching ALL tables once in loadData and filtering locally.
        // But for now, let's just keep it simple but ensure it doesn't loop.
        // The real issue might be that this effect runs on every render if dependencies change.
        // selectedEnvId changes only on user tap.

        const companyId = user.companyId;

        const fetchTables = async () => {
            try {
                // If we want to optimize further, we should fetch all tables ONCE and filter locally.
                // For now, let's stick to the pattern but ensure we don't block UI.
                const allTables = await TableService.getTables(companyId);
                const envTables = allTables.filter(t => t.environment_id === selectedEnvId);
                setTables(envTables);
            } catch (error) {
                console.error('Error loading tables:', error);
            }
        };

        fetchTables();
    }, [selectedEnvId, user?.companyId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Environment Handlers
    const handleSaveEnv = async () => {
        if (!user?.companyId || !envName.trim()) return;

        try {
            if (editingEnv) {
                await TableService.updateEnvironment(editingEnv.id, { name: envName });
            } else {
                await TableService.createEnvironment(user.companyId, envName);
            }
            setShowEnvModal(false);
            setEnvName('');
            setEditingEnv(null);
            loadData();
        } catch {
            Alert.alert('Erro', 'Falha ao salvar ambiente.');
        }
    };

    const handleDeleteEnv = async (env: Environment) => {
        Alert.alert(
            'Excluir Ambiente',
            `Deseja mesmo excluir "${env.name}"?\n\n⚠️ TODAS AS MESAS deste ambiente também serão excluídas. Esta ação não pode ser desfeita.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir Ambiente e Mesas',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            // 1. Delete/Deactivate all tables in this environment
                            await TableService.deleteTablesByEnvironment(env.id);
                            // 2. Delete the environment
                            await TableService.deleteEnvironment(env.id);

                            if (selectedEnvId === env.id) setSelectedEnvId(null);
                            loadData();
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Erro', 'Falha ao excluir ambiente e mesas.');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Table Handlers
    const handleSaveTable = async () => {
        if (!user?.companyId || !selectedEnvId || !tableForm.number.trim()) return;

        try {
            const payload = {
                number: tableForm.number,
                seats: parseInt(tableForm.seats) || 4,
                shape: tableForm.shape,
                environment_id: selectedEnvId, // Ensure it's linked to current env
                // Default position for simple list view (or future grid)
                position_x: 0,
                position_y: 0
            };

            if (tableForm.id) {
                await TableService.updateTable(tableForm.id, payload);
            } else {
                await TableService.createTable(user.companyId, payload);
            }

            setShowTableModal(false);
            setTableForm({ number: '', seats: '4', shape: 'square' });

            // Reload tables
            const allTables = await TableService.getTables(user.companyId);
            setTables(allTables.filter(t => t.environment_id === selectedEnvId));

        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao salvar mesa. Verifique se o número já existe.');
        }
    };

    const handleDeleteTable = async (tableId: string) => {
        Alert.alert(
            'Excluir Mesa',
            'Tem certeza?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user?.companyId) return;
                        try {
                            await TableService.deleteTable(tableId);
                            // Reload
                            const allTables = await TableService.getTables(user.companyId);
                            setTables(allTables.filter(t => t.environment_id === selectedEnvId));
                            setShowTableModal(false); // Close modal if open
                        } catch {
                            Alert.alert('Erro', 'Falha ao excluir mesa.');
                        }
                    }
                }
            ]
        );
    };

    const openTableModal = (table?: Table) => {
        if (table) {
            setTableForm({
                id: table.id,
                number: table.number,
                seats: String(table.seats),
                shape: table.shape
            });
        } else {
            setTableForm({ number: '', seats: '4', shape: 'square' });
        }
        setShowTableModal(true);
    };

    // Layout Editor Handlers
    const openLayoutEditor = () => {
        if (tables.length === 0) {
            Alert.alert('Aviso', 'Adicione mesas antes de editar o layout.');
            return;
        }

        // Heuristic: Auto-distribute tables that are at (0,0)
        let initialTables = JSON.parse(JSON.stringify(tables)); // Deep clone

        const cols = 3;
        const spacing = 140;

        initialTables = initialTables.map((t: Table, i: number) => {
            if (t.position_x === 0 && t.position_y === 0) {
                return {
                    ...t,
                    position_x: 20 + (i % cols) * spacing,
                    position_y: 20 + Math.floor(i / cols) * spacing
                };
            }
            return t;
        });

        setLayoutTables(initialTables);
        setHasUnsavedChanges(false);
        setIsEditingLayout(true);
    };

    const handleDragEnd = (id: string, x: number, y: number) => {
        setLayoutTables(prev => {
            const updated = prev.map(t =>
                t.id === id ? { ...t, position_x: x, position_y: y } : t
            );
            return updated;
        });
        setHasUnsavedChanges(true);
    };

    const saveLayout = async () => {
        try {
            setLoading(true);
            // Save all positions
            // Optimization: Only save changed tables if we tracked them, but for < 50 items Promise.all is fast enough
            const updates = layoutTables.map(t =>
                TableService.updateTable(t.id, {
                    position_x: Math.round(t.position_x),
                    position_y: Math.round(t.position_y)
                })
            );

            await Promise.all(updates);

            // Reload
            if (user?.companyId) { // Check again to satisfy TS
                const allTables = await TableService.getTables(user.companyId);
                setTables(allTables.filter(t => t.environment_id === selectedEnvId));
            }

            setIsEditingLayout(false);
            setHasUnsavedChanges(false);
            Alert.alert('Sucesso', 'Layout salvo com sucesso!');
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Falha ao salvar o layout.');
        } finally {
            setLoading(false);
        }
    };

    // Renderers
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
                <TouchableOpacity
                    style={[styles.tab, styles.addTab]}
                    onPress={() => {
                        setEditingEnv(null);
                        setEnvName('');
                        setShowEnvModal(true);
                    }}
                >
                    <Ionicons name="add" size={20} color={colors.primary} />
                    <Text style={styles.addTabText}>Novo</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
                <View style={styles.headerLeft} />
                <View style={styles.headerCenter}>
                    <View style={styles.headerTitleRow}>
                        <Ionicons name="grid-outline" size={24} color={colors.white} style={styles.headerIcon} />
                        <Text style={styles.headerTitle}>Configuração de Mesas</Text>
                    </View>
                    {!!user && <Text style={styles.userInfo}>Operador: {user.nome || user.email}</Text>}
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={() => { if (onClose) { onClose(); } else { navigation.goBack(); } }}>
                        <Ionicons name="arrow-back-outline" size={24} color={colors.white} />
                    </TouchableOpacity>
                </View>
            </View>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <>
                    {renderEnvTabs()}

                    <ScrollView contentContainerStyle={styles.content}>
                        {selectedEnvId ? (
                            <>
                                {/* Environment Header */}
                                <View style={styles.envHeader}>
                                    <Text style={styles.sectionTitle}>{environments.find(e => e.id === selectedEnvId)?.name}</Text>
                                    <TouchableOpacity
                                        style={styles.editEnvButton}
                                        onPress={() => {
                                            const env = environments.find(e => e.id === selectedEnvId);
                                            if (env) {
                                                setEditingEnv(env);
                                                setEnvName(env.name);
                                                setShowEnvModal(true);
                                            }
                                        }}
                                    >
                                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                                        <Text style={styles.editEnvButtonText}>Editar</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.actionsBar}>
                                    <Text style={styles.subtitle}>Mesas ({tables.length})</Text>

                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity
                                            style={styles.addTableButton}
                                            onPress={() => openTableModal()}
                                        >
                                            <Ionicons name="add" size={20} color={colors.white} />
                                            <Text style={styles.addTableText}>Mesa</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.addTableButton, { backgroundColor: colors.secondary }]}
                                            onPress={openLayoutEditor}
                                        >
                                            <Ionicons name="move" size={20} color={colors.white} />
                                            <Text style={styles.addTableText}>Layout</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.grid}>
                                    {tables.map(table => (
                                        <TouchableOpacity
                                            key={table.id}
                                            style={styles.tableCard}
                                            onPress={() => openTableModal(table)}
                                            onLongPress={() => handleDeleteTable(table.id)}
                                        >
                                            <View pointerEvents="none" style={{ marginBottom: 5 }}>
                                                <TableGraphic
                                                    shape={table.shape}
                                                    seats={table.seats}
                                                    status="Livre"
                                                    size={60}
                                                    tableNumber={table.number}
                                                />
                                            </View>
                                            {/* <Text style={styles.seatsText}>{table.seats} lugares</Text> */}
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {tables.length === 0 && (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>Nenhuma mesa neste ambiente.</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Crie ou selecione um ambiente.</Text>
                            </View>
                        )}
                    </ScrollView>
                </>
            )}

            {/* Modal Environment */}
            <Modal visible={showEnvModal} transparent animationType="fade" onRequestClose={() => setShowEnvModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingEnv ? 'Editar Ambiente' : 'Novo Ambiente'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Nome do ambiente (ex: Salão, Varanda)"
                            value={envName}
                            onChangeText={setEnvName}
                        />
                        <View style={styles.modalButtons}>
                            {editingEnv && (
                                <TouchableOpacity
                                    onPress={() => handleDeleteEnv(editingEnv)}
                                    style={[styles.modalBtn, styles.deleteBtn]}
                                >
                                    <Ionicons name="trash-outline" size={20} color={colors.white} />
                                    <Text style={styles.deleteText}>Excluir Ambiente</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setShowEnvModal(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveEnv} style={[styles.modalBtn, styles.saveBtn]}>
                                <Text style={styles.saveText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal Table */}
            <Modal visible={showTableModal} transparent animationType="fade" onRequestClose={() => setShowTableModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{tableForm.id ? 'Editar Mesa' : 'Nova Mesa'}</Text>

                        <Text style={styles.label}>Número / Identificação</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 10, M1, VIP"
                            value={tableForm.number}
                            onChangeText={(t) => setTableForm(prev => ({ ...prev, number: t }))}
                        />

                        <Text style={styles.label}>Lugares</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex: 4"
                            value={tableForm.seats}
                            keyboardType="numeric"
                            onChangeText={(t) => setTableForm(prev => ({ ...prev, seats: t }))}
                        />

                        <Text style={styles.label}>Formato</Text>
                        <View style={styles.shapeSelector}>
                            {(['square', 'round', 'rect'] as const).map(s => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.shapeOption, tableForm.shape === s && styles.shapeOptionActive]}
                                    onPress={() => setTableForm(prev => ({ ...prev, shape: s }))}
                                >
                                    <View pointerEvents="none" style={{ transform: [{ scale: 0.6 }] }}>
                                        <TableGraphic
                                            shape={s}
                                            seats={parseInt(tableForm.seats) || 4}
                                            status="Livre"
                                            size={50}
                                            tableNumber=""
                                        />
                                    </View>
                                    <Text style={[styles.shapeText, tableForm.shape === s && styles.shapeTextActive]}>
                                        {s === 'square' ? 'Quadrada' : s === 'round' ? 'Redonda' : 'Retangular'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            {tableForm.id && (
                                <TouchableOpacity
                                    onPress={() => handleDeleteTable(tableForm.id!)}
                                    style={[styles.modalBtn, styles.deleteBtn]}
                                >
                                    <Ionicons name="trash-outline" size={20} color={colors.white} />
                                    <Text style={styles.deleteText}>Excluir</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setShowTableModal(false)} style={[styles.modalBtn, styles.cancelBtn]}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveTable} style={[styles.modalBtn, styles.saveBtn]}>
                                <Text style={styles.saveText}>Salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Layout Editor Modal */}
            <Modal visible={isEditingLayout} animationType="slide" onRequestClose={() => setIsEditingLayout(false)}>
                <View style={styles.editorContainer}>
                    <View style={styles.editorHeader}>
                        <TouchableOpacity
                            onPress={() => {
                                if (hasUnsavedChanges) {
                                    Alert.alert(
                                        'Alterações não salvas',
                                        'Deseja descartar as alterações?',
                                        [
                                            { text: 'Cancelar', style: 'cancel' },
                                            {
                                                text: 'Descartar',
                                                style: 'destructive',
                                                onPress: () => {
                                                    setIsEditingLayout(false);
                                                    setHasUnsavedChanges(false);
                                                }
                                            }
                                        ]
                                    );
                                } else {
                                    setIsEditingLayout(false);
                                }
                            }}
                            style={styles.editorCloseBtn}
                        >
                            <Ionicons name="close" size={28} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.editorTitle}>Editar Layout - {environments.find(e => e.id === selectedEnvId)?.name}</Text>
                        <TouchableOpacity
                            onPress={saveLayout}
                            style={[styles.editorSaveBtn, !hasUnsavedChanges && styles.editorSaveBtnDisabled]}
                            disabled={!hasUnsavedChanges}
                        >
                            <Ionicons name="checkmark" size={28} color={colors.white} />
                            <Text style={styles.editorSaveBtnText}>Salvar</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.editorInstructions}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                        <Text style={styles.editorInstructionsText}>
                            Arraste as mesas para posicioná-las como no salão físico
                        </Text>
                    </View>

                    <ScrollView
                        style={styles.editorCanvas}
                        contentContainerStyle={{ minHeight: 800, minWidth: width }}
                    >
                        <View style={{ position: 'relative', height: 800, width: '100%' }}>
                            {layoutTables.map(table => (
                                <DraggableTable
                                    key={table.id}
                                    table={table}
                                    onDragEnd={handleDragEnd}
                                />
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.primary, minHeight: 92, paddingBottom: 15, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, zIndex: 10, elevation: 8, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
    headerLeft: { flex: 1 },
    headerCenter: { flex: 2, alignItems: 'center', justifyContent: 'center' },
    headerRight: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    headerIcon: { marginRight: 8 },
    headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    userInfo: { fontSize: 12, color: colors.userInfo, fontWeight: '600', marginTop: 4, textAlign: 'center' },
    logoutBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.logoutBg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabsContainer: {
        height: 60,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tabsScroll: {
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 10,
        borderRadius: 20,
        backgroundColor: colors.surfaceMuted,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    addTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        marginTop: 0,
        borderColor: colors.primary,
        backgroundColor: colors.white,
        borderStyle: 'dashed',
    },
    tabText: { color: colors.textSecondary, fontWeight: '600' },
    tabTextActive: { color: colors.white },
    addTabText: { color: colors.primary, fontWeight: 'bold', marginLeft: 4 },

    content: { padding: 20 },

    envHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 10,
    },

    actionsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },

    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    addTableButton: {
        flexDirection: 'row',
        backgroundColor: colors.success,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    addTableText: { color: colors.white, fontWeight: 'bold', marginLeft: 4, fontSize: 13 },

    editEnvButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceMuted,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginLeft: 12,
    },
    editEnvButtonText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
    tableCard: {
        width: (width - 60) / 3,
        backgroundColor: colors.white,
        borderRadius: 8,
        padding: 10,
        alignItems: 'center',
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    // Removed unused shape styles

    tableNumber: { fontWeight: 'bold', fontSize: 16, color: colors.text },
    seatsText: { fontSize: 12, color: colors.textSecondary },

    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: colors.textSecondary, fontSize: 16 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.white, borderRadius: 12, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    label: { fontSize: 14, color: colors.textSecondary, marginBottom: 6, fontWeight: '600' },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
    modalBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
    cancelBtn: { backgroundColor: colors.surfaceMuted },
    saveBtn: { backgroundColor: colors.primary },
    deleteBtn: { backgroundColor: colors.danger, marginRight: 'auto' },
    cancelText: { color: colors.text, fontWeight: '600' },
    saveText: { color: colors.white, fontWeight: '600' },
    deleteText: { color: colors.white, fontWeight: '600', marginLeft: 4 },

    shapeSelector: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    shapeOption: { flex: 1, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 8, alignItems: 'center' },
    shapeOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
    shapeText: { fontSize: 12, color: colors.textSecondary },
    shapeTextActive: { color: colors.primary, fontWeight: 'bold' },

    // Layout Editor Styles
    editorContainer: {
        flex: 1,
        backgroundColor: colors.surfaceMuted,
    },
    editorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: SAFE_AREA_TOP,
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: colors.primary,
        elevation: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    editorTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.white,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    editorCloseBtn: {
        padding: 5,
    },
    editorSaveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 5,
    },
    editorSaveBtnDisabled: {
        backgroundColor: colors.textSecondary,
        opacity: 0.5,
    },
    editorSaveBtnText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    editorInstructions: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primaryTint,
        padding: 12,
        gap: 10,
    },
    editorInstructionsText: {
        flex: 1,
        fontSize: 14,
        color: colors.secondary,
    },
    editorCanvas: {
        flex: 1,
        backgroundColor: colors.white,
    },
});
