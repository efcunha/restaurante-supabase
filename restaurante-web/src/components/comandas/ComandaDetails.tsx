import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { fixDecimal, MenuItem } from '../../utils/orderCalculator';
import { Comanda } from '../../types';

// Declare módulo para avoid error se o arquivo não tiver tipos
import { calcularPrecoItem } from '../../utils/orderCalculator';
import { colors } from '../../theme/colors';
import { isFeatureEnabled } from '../../config/featureFlags';
interface ComandaDetailsProps {
    comanda: Comanda;
    cardapioDin?: MenuItem[];
    onClose: () => void;
    onPay: (comanda: Comanda, method: string, value: number) => void;
    onPrint?: () => void;
    onCancel: () => void;
    onAddItems: () => void;
    onShare?: () => void;
    onFullPayment?: () => void;
    onOpenPdvMode?: (mode: 'tef' | 'external_pos') => void;
    onCancelItem?: (pedido: any, itemId: string, itemName: string) => void;
}

interface ItemResumo {
    nome: string;
    quantidade: number;
    quantidadePaga: number;
    subtotal: number;
    precoUnit: number;
}

const isInvalidHistoricoClient = (value: any) => {
    const normalized = String(value || '').trim();
    if (!normalized) return true;

    return normalized === 'Não informado'
        || normalized === 'Cliente Balcão'
        || normalized === 'Cliente'
        || normalized === 'Reservando...';
};

const isItemCancellable = (item: any) => {
    const itemStatus = String(item?.status || '').trim().toLowerCase();
    const isCancelled = itemStatus === 'cancelled' || itemStatus === 'cancelado' || itemStatus === 'cancelada';
    const isDelivered = item?.delivered === true || itemStatus === 'delivered' || itemStatus === 'entregue';
    return !isCancelled && !isDelivered;
};

export default function ComandaDetails({ comanda, cardapioDin, onClose, onPay, onPrint, onCancel, onAddItems, onShare, onFullPayment, onOpenPdvMode, onCancelItem }: ComandaDetailsProps) {
    const externalPosEnabled = isFeatureEnabled('pdv_enabled') && isFeatureEnabled('pdv_externalPos_enabled');
    const tefEnabled = isFeatureEnabled('pdv_enabled') && isFeatureEnabled('pdv_devicePayment_enabled');

    const clienteDisplay = useMemo(() => {
        const raw = String(comanda?.cliente || '').trim();
        const isPlaceholder = isInvalidHistoricoClient(raw);
        if (!isPlaceholder) return raw;

        const pedidos = Array.isArray(comanda?.pedidos) ? comanda.pedidos : [];
        const sorted = [...pedidos].sort((a: any, b: any) => {
            const aTs = new Date(a?.updated_at || a?.created_at || 0).getTime();
            const bTs = new Date(b?.updated_at || b?.created_at || 0).getTime();
            return bTs - aTs;
        });
        const fromOrder = sorted.find((p: any) => {
            const name = String(p?.client_name || p?.customer_name || p?.client || '').trim();
            return !isInvalidHistoricoClient(name);
        });

        return String(fromOrder?.client_name || fromOrder?.customer_name || fromOrder?.client || raw || 'Não informado').trim();
    }, [comanda?.cliente, comanda?.pedidos]);

    // Calcular Saldo devedor (with safe defaults)
    const saldoDevedor = useMemo(() => {
        const totalConsumido = Number(comanda.totalConsumido) || 0;
        const totalPago = Number(comanda.totalPago) || 0;
        return fixDecimal(Math.max(0, totalConsumido - totalPago));
    }, [comanda.totalConsumido, comanda.totalPago]);

    // Aggregate items logic
    const resumoItens = useMemo(() => {
        if (!comanda?.pedidos?.length) return [];

        const map: Record<string, ItemResumo> = {};

        try {
             
            comanda.pedidos.forEach((p: any) => {
                // PRIORIDADE: Usar itemsWithStatus se disponível (Dados ricos de pagamento)
                if (p.itemsWithStatus && p.itemsWithStatus.length > 0) {
                     p.itemsWithStatus.forEach((item: any) => {
                         // Limpar nome para agrupamento (remover "1x " legado se houver)
                         const nomeLimpo = item.name.replace(/^\d+x?\s*/, '').trim();
                         const qty = item.quantity || 1;
                         const paidQty = item.paid_quantity || (item.paid ? qty : 0);
                         
                         let precoUnit = 0;
                         let found = false;

                         if (item.unitPrice !== undefined) {
                             precoUnit = item.unitPrice;
                             found = true;
                         } else if (p.priceMap && Object.keys(p.priceMap).length > 0) {
                             if (p.priceMap[item.name] !== undefined) {
                                 precoUnit = p.priceMap[item.name] / qty;
                                 found = true;
                             } else if (p.priceMap[nomeLimpo] !== undefined) {
                                 precoUnit = p.priceMap[nomeLimpo];
                                 found = true;
                             }
                         }

                         if (!found) {
                             const calc = calcularPrecoItem(item.name, cardapioDin);
                             precoUnit = calc.precoUnitario;
                         }

                         const subtotal = fixDecimal(qty * precoUnit);
                         const key = nomeLimpo;

                         if (!map[key]) {
                             map[key] = {
                                 nome: nomeLimpo,
                                 quantidade: 0,
                                 quantidadePaga: 0,
                                 subtotal: 0,
                                 precoUnit: precoUnit
                             };
                         }

                         map[key].quantidade += qty;
                         map[key].quantidadePaga += paidQty;
                         map[key].subtotal = fixDecimal(map[key].subtotal + subtotal);
                      });
                      return; // Skip legacy logic for this order
                }

                // Lógica Legada (Fallback para pedidos antigos sem itemsWithStatus)
                let items: string[] = p.items || p.itens || [];
                if (!Array.isArray(items)) items = [];

                // 🔒 USAR O PREÇO DO BANCO (totalPrice) ao invés de recalcular
                const pedidoTotal = Number(p.totalPrice) || 0;

                // Tenta usar priceMap se disponível (Preço Individuais)
                if (p.priceMap) {
                    items.forEach((itemText: string) => {
                        const itemCalc = calcularPrecoItem(itemText, cardapioDin);
                        const nomeCompleto = itemCalc.nomeCompleto;
                        const quantidade = itemCalc.quantidade;

                        // Tentar limpar nome para buscar no map
                        const cleanName = itemText.replace(/^\d+x?\s*/, '').replace(/\s*\(.*\)$/, '').trim().toLowerCase();

                        let precoTotalItem = 0;
                        let foundInMap = false;

                        // Tenta chaves diversas: nome original, lower, etc.
                        if (p.priceMap[itemText] !== undefined) {
                            precoTotalItem = p.priceMap[itemText];
                            foundInMap = true;
                        } else if (p.priceMap[cleanName] !== undefined) {
                            precoTotalItem = p.priceMap[cleanName];
                            foundInMap = true;
                        } else if (p.priceMap[nomeCompleto] !== undefined) {
                            precoTotalItem = p.priceMap[nomeCompleto];
                            foundInMap = true;
                        }

                        if (!foundInMap) {
                            // Tenta calcular via calculadora antes da média
                            if (itemCalc.precoUnitario > 0) {
                                precoTotalItem = itemCalc.subtotal;
                            } else {
                                // Fallback final: média
                                precoTotalItem = fixDecimal(pedidoTotal / (items.length || 1));
                            }
                        }

                        const precoUnit = fixDecimal(precoTotalItem / (quantidade || 1));

                        if (!map[nomeCompleto]) {
                            map[nomeCompleto] = {
                                nome: nomeCompleto,
                                quantidade: 0,
                                quantidadePaga: 0,
                                subtotal: 0,
                                precoUnit: precoUnit
                            };
                        }

                        map[nomeCompleto].quantidade += quantidade;
                        map[nomeCompleto].subtotal = fixDecimal(map[nomeCompleto].subtotal + precoTotalItem);
                    });
                }
                // Se o pedido tem preço total mas SEM priceMap, tentar resolver via calculadora
                else if (pedidoTotal > 0) {
                    const numItens = items.length || 1;
                    const precoMedioPorItem = fixDecimal(pedidoTotal / numItens);

                    items.forEach((itemText: string) => {
                        const itemCalc = calcularPrecoItem(itemText, cardapioDin);
                        const nomeCompleto = itemCalc.nomeCompleto;
                        const quantidade = itemCalc.quantidade;

                        // Se a calculadora resolveu o preço, usa ele. Se não, usa a média.
                        let subtotalItem = precoMedioPorItem;
                        let precoUnit = fixDecimal(precoMedioPorItem / (quantidade || 1));

                        if (itemCalc.precoUnitario > 0) {
                            subtotalItem = itemCalc.subtotal;
                            precoUnit = itemCalc.precoUnitario;
                        }

                        if (!map[nomeCompleto]) {
                            map[nomeCompleto] = {
                                nome: nomeCompleto,
                                quantidade: 0,
                                quantidadePaga: 0,
                                subtotal: 0,
                                precoUnit: precoUnit
                            };
                        }

                        map[nomeCompleto].quantidade += quantidade;
                        map[nomeCompleto].subtotal = fixDecimal(map[nomeCompleto].subtotal + subtotalItem);
                    });
                }
 else {
                    // Fallback: tentar calcular usando o cardápio estático
                    items.forEach((itemText: string) => {
                        const itemCalc = calcularPrecoItem(itemText, cardapioDin);
                        const nomeCompleto = itemCalc.nomeCompleto;

                        if (!map[nomeCompleto]) {
                            map[nomeCompleto] = {
                                nome: nomeCompleto,
                                quantidade: 0,
                                quantidadePaga: 0,
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

    const confirmCancelItem = (pedido: any, item: any) => {
        if (!onCancelItem) return;

        const itemLabel = `${item.quantity}x ${item.name}`;

        if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
            const confirmed = window.confirm(`Deseja cancelar ${itemLabel}?`);
            if (confirmed) {
                onCancelItem(pedido, item.id, item.name);
            }
            return;
        }

        Alert.alert(
            'Cancelar Item',
            `Deseja cancelar ${itemLabel}?`,
            [
                { text: 'Não', style: 'cancel' },
                {
                    text: 'Sim, cancelar',
                    style: 'destructive',
                    onPress: () => onCancelItem(pedido, item.id, item.name)
                }
            ]
        );
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
                        <Text style={styles.value}>{clienteDisplay}</Text>
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
                    {(comanda.tipoComanda === 'delivery' || comanda.entregadorNome || comanda.closed_by_name) ? (
                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Entregador:</Text>
                            <Text style={styles.value}>{comanda.entregadorNome || comanda.closed_by_name || 'Não informado'}</Text>
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
                                    <Text style={styles.itemQty}>
                                        {item.quantidade}x R$ {(Number(item.precoUnit) || 0).toFixed(2)}
                                        {item.quantidadePaga > 0 && (
                                            <Text style={{color: colors.success, fontWeight: 'bold'}}>
                                                {'  '}• {item.quantidadePaga} Pago(s)
                                            </Text>
                                        )}
                                    </Text>
                                </View>
                                <Text style={styles.itemTotal}>R$ {(Number(item.subtotal) || 0).toFixed(2)}</Text>
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
                        <Text style={styles.value}>R$ {(Number(comanda.totalConsumido) || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.label}>Total Pago:</Text>
                        <Text style={[styles.value, { color: colors.success }]}>R$ {(Number(comanda.totalPago) || 0).toFixed(2)}</Text>
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
                                        <Text style={styles.value}>R$ {(Number(valor) || 0).toFixed(2)}</Text>
                                    </View>
                                )
                            ))}
                        </>
                    )}

                    <View style={[styles.totalRow, { marginTop: 15, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }]}>
                        <Text style={styles.totalLabel}>SALDO A PAGAR</Text>
                        <Text style={styles.totalValueLarge}>R$ {(Number(saldoDevedor) || 0).toFixed(2)}</Text>
                    </View>
                </View>

                {/* 🔒 SEÇÃO DE CANCELAMENTO DE ITENS - Apenas se comanda está aberta */}
                {shouldShowActions() && comanda.pedidos?.some((p: any) => 
                    p.itemsWithStatus?.some((item: any) => isItemCancellable(item))
                ) && (
                    <View style={[styles.paperReceipt, { marginTop: 20, borderTopColor: colors.danger }]}>
                        <Text style={[styles.receiptTitle, { color: colors.danger }]}>CANCELAR ITENS</Text>
                        <View style={styles.divider} />
                        
                        {comanda.pedidos?.map((pedido: any, pedidoIdx: number) => {
                            const itemsNaoEntregues = pedido.itemsWithStatus?.filter((item: any) => isItemCancellable(item)) || [];
                            
                            if (itemsNaoEntregues.length === 0) return null;
                            
                            return (
                                <View key={pedidoIdx} style={{ marginBottom: 15 }}>
                                    {itemsNaoEntregues.map((item: any, itemIdx: number) => (
                                        <View key={itemIdx} style={[styles.itemRow, { alignItems: 'center' }]}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itemName}>{item.name}</Text>
                                                <Text style={styles.itemQty}>
                                                    {item.quantity}x R$ {(item.unitPrice || 0).toFixed(2)}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={{
                                                    backgroundColor: colors.danger,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 4,
                                                    marginLeft: 10
                                                }}
                                                onPress={() => confirmCancelItem(pedido, item)}
                                            >
                                                <Text style={{ color: colors.white, fontWeight: 'bold', fontSize: 12 }}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* AREA DE AÇÕES */}
                {shouldShowActions() && (
                    <View style={styles.actionsContainer}>
                        {/* Adicionar Itens */}
                        <TouchableOpacity style={styles.addBtn} onPress={onAddItems}>
                            <Text style={styles.addBtnIcon}>➕</Text>
                            <Text style={styles.addBtnText}>ADICIONAR MAIS ITENS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.addBtn, { backgroundColor: colors.success, marginBottom: 20 }]} 
                            onPress={onFullPayment}
                        >
                            <Text style={styles.addBtnIcon}>💰</Text>
                            <Text style={styles.addBtnText}>RATEIO (DIVISÃO)</Text>
                        </TouchableOpacity>

                        {externalPosEnabled && onOpenPdvMode && (
                            <TouchableOpacity
                                style={[styles.payBtn, styles.externalPosBtn]}
                                onPress={() => onOpenPdvMode('external_pos')}
                            >
                                <Text style={[styles.payBtnText, { color: colors.white }]}>Maquininha Externa</Text>
                            </TouchableOpacity>
                        )}

                        {tefEnabled && onOpenPdvMode && (
                            <TouchableOpacity
                                style={[styles.addBtn, styles.pdvBtn]}
                                onPress={() => onOpenPdvMode('tef')}
                            >
                                <Text style={styles.addBtnIcon}>🏧</Text>
                                <Text style={styles.addBtnText}>TEF INTEGRADO</Text>
                            </TouchableOpacity>
                        )}

                        {(externalPosEnabled || tefEnabled) && (
                            <Text style={styles.pdvHint}>
                                Dinheiro e PIX continuam no pagamento rápido. Cartão externo e TEF ficam em fluxos guiados.
                            </Text>
                        )}

                        <Text style={styles.sectionTitle}>Pagamento Rápido</Text>
                        <View style={styles.paymentGrid}>
                            {['Dinheiro', 'Pix'].map((method) => {
                                const getButtonStyle = (m: string) => {
                                    switch (m) {
                                        case 'Dinheiro': return { backgroundColor: colors.success, borderColor: colors.success }; // Verde
                                        case 'Pix': return { backgroundColor: colors.secondary, borderColor: colors.secondary }; // Verde/Azul Pix
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
                                        <Text style={[styles.payBtnText, { color: colors.white }]}>{method}</Text>
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
        backgroundColor: colors.surfaceMuted,
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
        color: colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    pdvBtn: {
        backgroundColor: '#0F766E',
        marginBottom: 10,
    },
    externalPosBtn: {
        backgroundColor: '#7C3AED',
        borderColor: '#7C3AED',
    },
    pdvHint: {
        fontSize: 12,
        lineHeight: 18,
        color: colors.textSecondary,
        marginTop: -2,
        marginBottom: 16,
    },
    headerTitle: {
        color: colors.white,
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
        backgroundColor: colors.white,
        padding: 20,
        borderRadius: 5,
        elevation: 3,
        marginBottom: 20,
        // Efeito de papel fiscal
        borderTopWidth: 5,
        borderTopColor: colors.primary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    receiptTitle: {
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 16,
        color: colors.text,
        marginBottom: 10,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 10,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 1,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    value: {
        color: colors.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.surfaceMuted,
    },
    itemName: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
    },
    itemQty: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    itemTotal: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
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
        color: colors.text,
    },
    totalValueLarge: {
        fontWeight: 'bold',
        fontSize: 22,
        color: colors.primary,
    },
    actionsContainer: {
        backgroundColor: colors.white,
        padding: 20,
        borderRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
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
        color: colors.white,
        fontSize: 18,
        marginRight: 10,
    },
    addBtnText: {
        color: colors.white,
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
        backgroundColor: colors.surfaceMuted,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    payBtnText: {
        color: colors.text,
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
        color: colors.white,
        fontWeight: 'bold',
    },
});
