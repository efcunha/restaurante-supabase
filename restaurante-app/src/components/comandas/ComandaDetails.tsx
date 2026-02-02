import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fixDecimal } from '../../utils/orderCalculator';
import { Comanda } from '../../types';

// Declare módulo para avoid error se o arquivo não tiver tipos
// @ts-expect-error
import { calcularPrecoItem } from '../../utils/orderCalculator';

interface ComandaDetailsProps {
    comanda: Comanda;
    onClose: () => void;
    onPay: (comanda: Comanda, method: string, value: number) => void;
    onPrint?: () => void;
    onCancel: () => void;
    onAddItems: () => void;
    onShare?: () => void;
}

interface ItemResumo {
    nome: string;
    quantidade: number;
    subtotal: number;
    precoUnit: number;
}

export default function ComandaDetails({ comanda, onClose, onPay, onPrint, onCancel, onAddItems, onShare }: ComandaDetailsProps) {
    // Calcular Saldo devedor
    const saldoDevedor = useMemo(() => {
        return fixDecimal(Math.max(0, comanda.totalConsumido - comanda.totalPago));
    }, [comanda.totalConsumido, comanda.totalPago]);

    // Aggregate items logic
    const resumoItens = useMemo(() => {
        if (!comanda?.pedidos?.length) return [];

        const map: Record<string, ItemResumo> = {};

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            comanda.pedidos.forEach((p: any) => {
                let items: string[] = p.items || p.itens || [];
                if (!Array.isArray(items)) items = [];

                // 🔒 USAR O PREÇO DO BANCO (totalPrice) ao invés de recalcular
                const pedidoTotal = Number(p.totalPrice) || 0;

                // Tenta usar priceMap se disponível (Preço Individuais)
                if (p.priceMap) {
                    items.forEach((itemText: string) => {
                        const itemCalc = calcularPrecoItem(itemText);
                        const nomeCompleto = itemCalc.nomeCompleto;
                        const quantidade = itemCalc.quantidade;

                        // Tentar limpar nome para buscar no map
                        const cleanName = itemText.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();

                        let precoTotalItem = 0;

                        // Tenta chaves diversas: nome original, lower, etc.
                        if (p.priceMap[itemText] !== undefined) precoTotalItem = p.priceMap[itemText];
                        else if (p.priceMap[cleanName] !== undefined) precoTotalItem = p.priceMap[cleanName];
                        else if (p.priceMap[nomeCompleto] !== undefined) precoTotalItem = p.priceMap[nomeCompleto];
                        else {
                            // Fallback: se não achar no map, usa média
                            precoTotalItem = (pedidoTotal / (items.length || 1));
                        }

                        const precoUnit = precoTotalItem / quantidade;

                        if (!map[nomeCompleto]) {
                            map[nomeCompleto] = {
                                nome: nomeCompleto,
                                quantidade: 0,
                                subtotal: 0,
                                precoUnit: precoUnit
                            };
                        }

                        map[nomeCompleto].quantidade += quantidade;
                        map[nomeCompleto].subtotal = fixDecimal(map[nomeCompleto].subtotal + precoTotalItem);
                    });
                }
                // Se o pedido tem preço total mas SEM priceMap, distribuir entre os itens (Média)
                else if (pedidoTotal > 0) {
                    const numItens = items.length || 1;
                    const precoMedioPorItem = pedidoTotal / numItens;

                    items.forEach((itemText: string) => {
                        const itemCalc = calcularPrecoItem(itemText);
                        const nomeCompleto = itemCalc.nomeCompleto;
                        const quantidade = itemCalc.quantidade;

                        // Usar preço médio do pedido para cada item
                        const precoUnit = precoMedioPorItem / quantidade;
                        const subtotal = precoMedioPorItem;

                        if (!map[nomeCompleto]) {
                            map[nomeCompleto] = {
                                nome: nomeCompleto,
                                quantidade: 0,
                                subtotal: 0,
                                precoUnit: precoUnit
                            };
                        }

                        map[nomeCompleto].quantidade += quantidade;
                        map[nomeCompleto].subtotal = fixDecimal(map[nomeCompleto].subtotal + subtotal);
                    });
                } else {
                    // Fallback: tentar calcular usando o cardápio estático
                    items.forEach((itemText: string) => {
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
                }
            });
            return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome));
        } catch (e) {
            console.error('Error grouping items:', e);
            return [];
        }
    }, [comanda.pedidos]);

    const handlePayment = (method: string) => {
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
                    {onShare && (
                        <TouchableOpacity onPress={onShare} style={[styles.printBtn, { marginRight: 10 }]}>
                            <Text style={{ fontSize: 20 }}>📤</Text>
                        </TouchableOpacity>
                    )}
                    {onPrint && (
                        <TouchableOpacity onPress={onPrint} style={styles.printBtn}>
                            <Text style={{ fontSize: 20 }}>🖨️</Text>
                        </TouchableOpacity>
                    )}
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

                    {resumoItens.length > 0 ? (
                        resumoItens.map((item, idx) => (
                            <View key={idx} style={styles.itemRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.nome}</Text>
                                    <Text style={styles.itemQty}>{item.quantidade}x R$ {item.precoUnit.toFixed(2)}</Text>
                                </View>
                                <Text style={styles.itemTotal}>R$ {item.subtotal.toFixed(2)}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.label, { textAlign: 'center', fontStyle: 'italic', color: colors.textLight }]}>
                            ⚠️ Pedido sem itens ou preços não disponíveis
                        </Text>
                    )}

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
                                (typeof valor === 'number' && valor > 0) && (
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
                            {['Dinheiro', 'Pix', 'Debito', 'Credito'].map((method) => {
                                const getButtonStyle = (m: string) => {
                                    switch (m) {
                                        case 'Dinheiro': return { backgroundColor: colors.success, borderColor: colors.success }; // Verde
                                        case 'Pix': return { backgroundColor: '#32BCAD', borderColor: '#32BCAD' }; // Verde/Azul Pix
                                        case 'Debito': return { backgroundColor: '#2196F3', borderColor: '#2196F3' }; // Azul
                                        case 'Credito': return { backgroundColor: '#3F51B5', borderColor: '#3F51B5' }; // Roxo/Indigo
                                        default: return {};
                                    }
                                };
                                
                                const btnStyle = getButtonStyle(method);
                                
                                return (
                                    <TouchableOpacity
                                        key={method}
                                        style={[styles.payBtn, btnStyle]}
                                        onPress={() => handlePayment(method.toLowerCase())}
                                    >
                                        <Text style={[styles.payBtnText, { color: '#FFF' }]}>{method}</Text>
                                    </TouchableOpacity>
                                );
                            })}
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

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: colors.primary,
        elevation: 4,
    },
    backBtn: {
        marginRight: 10,
    },
    backBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    printBtn: {
        padding: 5,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    paperReceipt: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 5,
        elevation: 3,
        marginBottom: 20,
        // Efeito de papel fiscal
        borderTopWidth: 5,
        borderTopColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    receiptTitle: {
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 10,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        color: '#666',
        fontSize: 14,
    },
    value: {
        color: '#333',
        fontWeight: 'bold',
        fontSize: 14,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f0f0f0',
    },
    itemName: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    itemQty: {
        fontSize: 12,
        color: '#888',
    },
    itemTotal: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    totalLabel: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    totalValueLarge: {
        fontWeight: 'bold',
        fontSize: 22,
        color: colors.primary,
    },
    actionsContainer: {
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        marginBottom: 10,
    },
    addBtn: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    addBtnIcon: {
        color: '#FFF',
        fontSize: 18,
        marginRight: 10,
    },
    addBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    paymentGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    payBtn: {
        width: '48%',
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    payBtnText: {
        color: '#333',
        fontWeight: 'bold',
    },
    cancelBtn: {
        marginTop: 20,
        backgroundColor: colors.danger,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});
