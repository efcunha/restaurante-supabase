
import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback
} from 'react-native';

interface TransferModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (tableNumber: string) => void;
    currentTable?: string;
}

export default function TransferModal({ visible, onClose, onConfirm, currentTable }: TransferModalProps) {
    const [tableNumber, setTableNumber] = useState('');

    const handleConfirm = () => {
        if (!tableNumber.trim()) return;
        onConfirm(tableNumber);
        setTableNumber('');
    };

    const handleClose = () => {
        setTableNumber('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={handleClose}
        >
            <TouchableWithoutFeedback onPress={handleClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.container}
                        >
                            <View style={styles.header}>
                                <Text style={styles.title}>Transferir Pedido</Text>
                                <TouchableOpacity onPress={handleClose}>
                                    <Text style={styles.closeBtn}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.content}>
                                {currentTable && (
                                    <Text style={styles.currentTableText}>
                                        Mesa atual: <Text style={styles.bold}>{currentTable}</Text>
                                    </Text>
                                )}

                                <Text style={styles.label}>Nova Mesa:</Text>
                                <TextInput
                                    style={styles.input}
                                    value={tableNumber}
                                    onChangeText={setTableNumber}
                                    placeholder="Número da mesa"
                                    keyboardType="numeric"
                                    autoFocus={true}
                                    onSubmitEditing={handleConfirm}
                                />

                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={[styles.btn, styles.cancelBtn]}
                                        onPress={handleClose}
                                    >
                                        <Text style={styles.btnTextCancel}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.btn, styles.confirmBtn, !tableNumber.trim() && styles.disabledBtn]}
                                        onPress={handleConfirm}
                                        disabled={!tableNumber.trim()}
                                    >
                                        <Text style={styles.btnTextConfirm}>Confirmar</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </KeyboardAvoidingView>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    container: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#FFF',
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            },
            web: {
                // @ts-ignore
                boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
            }
        }),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        backgroundColor: '#F8F9FA'
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333'
    },
    closeBtn: {
        fontSize: 20,
        color: '#999',
        padding: 4
    },
    content: {
        padding: 20
    },
    currentTableText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16
    },
    bold: {
        fontWeight: '700',
        color: '#333'
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8
    },
    input: {
        backgroundColor: '#F9F9F9',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        marginBottom: 24,
        minHeight: 48,
    },
    actions: {
        flexDirection: 'row',
        gap: 12
    },
    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    cancelBtn: {
        backgroundColor: '#F5F5F5',
    },
    confirmBtn: {
        backgroundColor: '#8B2F2F',
    },
    disabledBtn: {
        opacity: 0.5
    },
    btnTextCancel: {
        color: '#666',
        fontWeight: '600',
        fontSize: 16
    },
    btnTextConfirm: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16
    }
});
