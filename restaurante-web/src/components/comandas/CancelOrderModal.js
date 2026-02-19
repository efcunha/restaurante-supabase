
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors } from '../../theme/colors';

export default function CancelOrderModal({ visible, onClose, onConfirm }) {
    const [reason, setReason] = useState('');

    const handleConfirm = () => {
        onConfirm(reason);
        setReason(''); // Reset after confirm
    };

    const handleClose = () => {
        onClose();
        setReason(''); // Reset on close
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Cancelar Comanda</Text>
                    <Text style={styles.modalSubtitle}>Informe o motivo do cancelamento:</Text>

                    <TextInput
                        style={styles.inputReason}
                        placeholder="Ex: Cliente desistiu"
                        value={reason}
                        onChangeText={setReason}
                        autoFocus={true}
                    />

                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
                            <Text style={styles.btnCancelText}>Voltar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm}>
                            <Text style={styles.btnConfirmText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: 20
    },
    modalContent: {
        backgroundColor: colors.white, borderRadius: 12, padding: 20,
        width: '100%', maxWidth: 400,
        elevation: 10
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.danger, marginBottom: 10, textAlign: 'center' },
    modalSubtitle: { fontSize: 16, color: colors.textSecondary, marginBottom: 10 },
    inputReason: {
        borderWidth: 1, borderColor: colors.border, borderRadius: 8,
        padding: 12, fontSize: 16, marginBottom: 20, backgroundColor: '#f9f9f9'
    },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    btnCancel: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#ddd' },
    btnCancelText: { fontWeight: 'bold', color: '#555' },
    btnConfirm: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: colors.danger },
    btnConfirmText: { fontWeight: 'bold', color: 'white' }
});
