
import React, { memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { colors } from '../../theme/colors';

const getTipoComandaMeta = (tipoComanda) => {
    if (tipoComanda === 'delivery') {
        return { label: 'Delivery', icon: '🛵', backgroundColor: colors.primaryTint, textColor: colors.primary };
    }
    if (tipoComanda === 'mesa') {
        return { label: 'Mesa', icon: '🪑', backgroundColor: colors.warningSurface, textColor: colors.warning };
    }
    return { label: 'Balcão', icon: '🏪', backgroundColor: colors.primaryTint, textColor: colors.secondary };
};

const hasMesaValida = (mesa) => {
    const mesaNumero = Number(String(mesa || '').replace(/\D/g, ''));
    return Number.isFinite(mesaNumero) && mesaNumero > 0;
};

const ComandaCard = memo(({ comanda, onPress }) => {
    const tipoMeta = getTipoComandaMeta(comanda.tipoComanda);

    return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(comanda)}>
        <View style={styles.cardHeader}>
            <Text style={styles.comandaNumber}>Comanda {comanda.comandaNumber}</Text>
            <View style={styles.badgesRow}>
                <Text
                    style={[
                        styles.typeBadge,
                        {
                            backgroundColor: tipoMeta.backgroundColor,
                            color: tipoMeta.textColor,
                        },
                    ]}
                >
                    {tipoMeta.icon} {tipoMeta.label}
                </Text>
                <Text style={[
                    styles.statusBadge,
                    comanda.status === 'paga' ? styles.statusPaga :
                        comanda.status === 'cancelada' ? styles.statusCancelada : styles.statusAberta
                ]}>
                    {comanda.status.toUpperCase()}
                </Text>
            </View>
        </View>

        <View style={styles.cardBody}>
            <Text style={styles.clienteInfo}>
                👤 {comanda.cliente !== 'Não informado' ? comanda.cliente : 'Cliente Balcão'}
            </Text>
            {hasMesaValida(comanda.mesa) ? (
                <Text style={styles.mesaInfo}>🪑 Mesa: {comanda.mesa}</Text>
            ) : null}
            {(comanda.abertaPorNome || comanda.criadoPorNome) ? (
                <Text style={styles.garcomInfo}>🤵 Garçom: {comanda.abertaPorNome || comanda.criadoPorNome}</Text>
            ) : null}
            <Text style={styles.timeInfo}>🕒 {comanda.horarioCriacao || '---'}</Text>
        </View>

        <View style={styles.cardFooter}>
            <Text style={styles.totalLabel}>Saldo:</Text>
            <Text style={[styles.totalValue, comanda.saldoAberto > 0 ? { color: colors.danger } : { color: colors.success }]}>
                R$ {(comanda.saldoAberto || 0).toFixed(2)}
            </Text>
        </View>
    </TouchableOpacity>
    );
});
ComandaCard.displayName = 'ComandaCard';

export default function ComandaList({ comandas, onSelectComanda, refreshing, onRefresh, onLoadMore, loadingMore }) {
    if (comandas.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>Nenhuma comanda encontrada.</Text>
                <Text style={styles.emptySubtext}>Crie uma nova ou aguarde pedidos.</Text>
            </View>
        );
    }

    return (
        <FlatList
            data={comandas}
            keyExtractor={(item) => item.comandaNumber}
            renderItem={({ item }) => (
                <ComandaCard comanda={item} onPress={onSelectComanda} />
            )}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            // Add footer loader if needed
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        />
    );
}

const styles = StyleSheet.create({
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    card: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                // @ts-ignore
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            }
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    comandaNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    typeBadge: {
        fontSize: 12,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    statusBadge: {
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        overflow: 'hidden',
    },
    statusAberta: {
        backgroundColor: colors.primaryTint,
        color: colors.secondary,
    },
    statusPaga: {
        backgroundColor: colors.successSurface,
        color: colors.success,
    },
    statusCancelada: {
        backgroundColor: colors.dangerSurface,
        color: colors.danger,
    },
    cardBody: {
        marginBottom: 12,
    },
    clienteInfo: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    timeInfo: {
        fontSize: 14,
        color: colors.textLight,
    },
    mesaInfo: {
        fontSize: 15,
        color: colors.text,
        fontWeight: '600',
        marginBottom: 4,
    },
    garcomInfo: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
    },
});
