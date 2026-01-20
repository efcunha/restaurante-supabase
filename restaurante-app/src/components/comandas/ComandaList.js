
import React, { memo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors } from '../../theme/colors';

const ComandaCard = memo(({ comanda, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={() => onPress(comanda)}>
        <View style={styles.cardHeader}>
            <Text style={styles.comandaNumber}>Comanda {comanda.comandaNumber}</Text>
            <Text style={[
                styles.statusBadge,
                comanda.status === 'paga' ? styles.statusPaga :
                    comanda.status === 'cancelada' ? styles.statusCancelada : styles.statusAberta
            ]}>
                {comanda.status.toUpperCase()}
            </Text>
        </View>

        <View style={styles.cardBody}>
            <Text style={styles.clienteInfo}>
                👤 {comanda.cliente !== 'Não informado' ? comanda.cliente : 'Cliente Balcão'}
            </Text>
            <Text style={styles.timeInfo}>🕒 {comanda.horarioCriacao || '---'}</Text>
        </View>

        <View style={styles.cardFooter}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>R$ {comanda.totalConsumido.toFixed(2)}</Text>
        </View>
    </TouchableOpacity>
));

export default function ComandaList({ comandas, onSelectComanda, refreshing, onRefresh }) {
    if (comandas.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Nenhuma comanda encontrada.</Text>
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
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textLight,
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
        alignItems: 'center',
        marginBottom: 12,
    },
    comandaNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
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
        backgroundColor: '#E3F2FD',
        color: '#1976D2',
    },
    statusPaga: {
        backgroundColor: '#E8F5E9',
        color: '#388E3C',
    },
    statusCancelada: {
        backgroundColor: '#FFEBEE',
        color: '#D32F2F',
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
