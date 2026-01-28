
import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { colors } from '../../theme/colors';
import { calcularPrecoItem, fixDecimal } from '../../utils/orderCalculator';

export default function ComandaDetails({ comanda, onClose, onPay, onPrint, onCancel, onAddItems, onShare }) {
    // Calcular Saldo devedor
    const saldoDevedor = useMemo(() => {
        return fixDecimal(Math.max(0, comanda.totalConsumido - comanda.totalPago));
    }, [comanda.totalConsumido, comanda.totalPago]);

    // Aggregate items logic
    const resumoItens = useMemo(() => {
        if (!comanda?.pedidos?.length) return [];

        const map = {};

        try {
            comanda.pedidos.forEach(p => {
                let items = p.items || p.itens || [];
                if (!Array.isArray(items)) items = [];

                items.forEach(itemText => {
                    const itemCalc = calcularPrecoItem(itemText);
                    const nomeCompleto = itemCalc.nomeCompleto;

                    if (!map[nomeCompleto]) {
                        map[nomeCompleto] = {
                            nome: nomeCompleto,
                            quantidade: 0,
                            subtotal: 0,
                            precoUnit: itemCalc.precoUnitario
                        };
                    }

                    map[nomeCompleto].quantidade += itemCalc.quantidade;
                    map[nomeCompleto].subtotal = fixDecimal(map[nomeCompleto].subtotal + itemCalc.subtotal);
                });
            });
            return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome));
        } catch (e) {
            console.error('Error grouping items:', e);
            return [];
        }
    }, [comanda.pedidos]);

    const handlePayment = (method) => {
        if (onPay) {
            onPay(comanda, method, saldoDevedor);
        }
    };

    const shouldShowActions = () => {
        // STRICT ALLOWLIST: Só mostra ações se estiver explicitamente 'aberta'
        // Isso garante que comandas pagas ou canceladas não permitam edições
        return comanda.status === 'aberta';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>← Voltar</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Comanda {comanda.comandaNumber}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={onShare} style={[styles.printBtn, { marginRight: 10 }]}>
                        <Text style={{ fontSize: 20 }}>📤</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onPrint} style={styles.printBtn}>
                        <Text style={{ fontSize: 20 }}>🖨️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.paperReceipt}>
                    <Text style={styles.receiptTitle}>RESUMO DO PEDIDO</Text>
                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Cliente:</Text>
                        <Text style={styles.value}>{comanda.cliente}</Text>
                    </View>
                    {comanda.mesa ? (
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Mesa:</Text>
                            <Text style={styles.value}>{comanda.mesa}</Text>
                        </View>
                    ) : null}
                    {(comanda.abertaPorNome || comanda.criadoPorNome) ? (
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Garçom:</Text>
                            <Text style={styles.value}>{comanda.abertaPorNome || comanda.criadoPorNome}</Text>
                        </View>
                    ) : null}
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Status:</Text>
                        <Text style={[styles.value, { color: comanda.status === 'paga' ? colors.success : colors.warning }]}>
                            {comanda.status.toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {resumoItens.map((item, idx) => (
                        <View key={idx} style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName}>{item.nome}</Text>
                                <Text style={styles.itemQty}>{item.quantidade}x R$ {item.precoUnit.toFixed(2)}</Text>
                            </View>
                            <Text style={styles.itemTotal}>R$ {item.subtotal.toFixed(2)}</Text>
                        </View>
                    ))}

                    <View style={styles.divider} />

                    {/* Totais */}
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Total Consumido:</Text>
                        <Text style={styles.value}>R$ {comanda.totalConsumido.toFixed(2)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Total Pago:</Text>
                        <Text style={[styles.value, { color: colors.success }]}>R$ {comanda.totalPago.toFixed(2)}</Text>
                    </View>

                    {/* DETALHES DO CANCELAMENTO */}
                    {comanda.status === 'cancelada' && (
                        <>
                            <View style={styles.divider} />
                            <Text style={[styles.receiptTitle, { fontSize: 14, marginVertical: 5, color: colors.danger }]}>CANCELAMENTO</Text>

                            <View style={styles.infoRow}>
                                <Text style={styles.label}>Cancelado por:</Text>
                                <Text style={styles.value}>{comanda.canceladaPorNome || 'Desconhecido'}</Text>
                            </View>

                            {comanda.motivoCancelamento ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Motivo:</Text>
                                    <Text style={[styles.value, { flex: 1, textAlign: 'right' }]}>{comanda.motivoCancelamento}</Text>
                                </View>
                            ) : null}

                            {comanda.canceladaEm ? (
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Data:</Text>
                                    <Text style={styles.value}>{new Date(comanda.canceladaEm).toLocaleString('pt-BR')}</Text>
                                </View>
                            ) : null}
                        </>
                    )}

                    {/* DETALHES DO PAGAMENTO (Exibir se houver pagamentos) */}
                    {comanda.totalPago > 0 && (
                        <>
                            <View style={styles.divider} />
                            <Text style={[styles.receiptTitle, { fontSize: 14, marginVertical: 5 }]}>DETALHES DO PAGAMENTO</Text>

                            {/* Quem recebeu */}
                            {comanda.ultimoPagamentoPor && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>Recebido por:</Text>
                                    <Text style={styles.value}>{comanda.ultimoPagamentoPor}</Text>
                                </View>
                            )}

                            {/* Formas de Pagamento (Resumo) */}
                            {comanda.pagamentosResumo && Object.entries(comanda.pagamentosResumo).map(([forma, valor]) => (
                                valor > 0 && (
                                    <View key={forma} style={styles.infoRow}>
                                        <Text style={styles.label}>{forma.toUpperCase()}:</Text>
                                        <Text style={styles.value}>R$ {valor.toFixed(2)}</Text>
                                    </View>
                                )
                            ))}
                        </>
                    )}

                    <View style={[styles.totalRow, { marginTop: 15, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 10 }]}>
                        <Text style={styles.totalLabel}>SALDO A PAGAR</Text>
                        <Text style={styles.totalValueLarge}>R$ {saldoDevedor.toFixed(2)}</Text>
                    </View>
                </View>

                {/* AREA DE AÇÕES */}
                {shouldShowActions() && (
                    <View style={styles.actionsContainer}>
                        {/* Adicionar Itens */}
                        <TouchableOpacity style={styles.addBtn} onPress={onAddItems}>
                            <Text style={styles.addBtnIcon}>➕</Text>
                            <Text style={styles.addBtnText}>ADICIONAR MAIS ITENS</Text>
                        </TouchableOpacity>

                        <Text style={styles.sectionTitle}>Pagamento Rápido</Text>
                        <View style={styles.paymentGrid}>
                            {['Dinheiro', 'Pix', 'Debito', 'Credito'].map((method) => (
                                <TouchableOpacity
                                    key={method}
                                    style={styles.payBtn}
                                    onPress={() => handlePayment(method.toLowerCase())}
                                >
                                    <Text style={styles.payBtnText}>{method}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Cancelar */}
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onCancel}
                        >
                            <Text style={styles.cancelBtnText}>✗ CANCELAR COMANDA</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: colors.primary,
    },
    backBtn: { padding: 8, marginRight: 10 },
    backBtnText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
    headerTitle: { color: colors.white, fontSize: 20, fontWeight: 'bold' },
    printBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 8
    },
    content: { flex: 1, padding: 20 },
    paperReceipt: {
        backgroundColor: colors.white,
        padding: 20,
        borderRadius: 8,
        elevation: 2,
        marginBottom: 20,
        ...Platform.select({
            web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }
        })
    },
    receiptTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: colors.text,
    },
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 10,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 1
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    label: { color: colors.textSecondary, fontSize: 14 },
    value: { fontWeight: 'bold', color: colors.text, fontSize: 15 },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    itemName: { fontSize: 14, color: colors.text, fontWeight: '500' },
    itemQty: { fontSize: 12, color: colors.textLight },
    itemTotal: { fontSize: 14, fontWeight: 'bold', color: colors.text },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    totalValueLarge: { fontSize: 24, fontWeight: 'bold', color: colors.primary },

    actionsContainer: {
        backgroundColor: colors.white,
        padding: 20,
        borderRadius: 8,
        marginBottom: 40, // Space for scrolling
        elevation: 2,
        ...Platform.select({
            web: { boxShadow: '0px 2px 4px rgba(0,0,0,0.1)' }
        })
    },
    addBtn: {
        backgroundColor: colors.success, // using success green
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
        marginBottom: 20
    },
    addBtnIcon: { color: 'white', fontSize: 24, marginRight: 10 },
    addBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 10
    },
    paymentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20
    },
    payBtn: {
        flexBasis: '48%',
        backgroundColor: colors.primary,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 8
    },
    payBtnText: {
        color: 'white',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    },
    cancelBtn: {
        backgroundColor: colors.danger,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center'
    },
    cancelBtnText: {
        color: 'white',
        fontWeight: 'bold'
    }
});
