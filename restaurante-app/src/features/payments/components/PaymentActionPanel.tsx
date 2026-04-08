import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../theme/colors';
import { Button } from '../../../ui';
import { ExternalPosPaymentData, PaymentActionPanelProps, PaymentMethod, PaymentMode } from '../types';
import { ExternalPosPaymentForm } from './ExternalPosPaymentForm';
import { PaymentModeSelector } from './PaymentModeSelector';

const paymentMethods: PaymentMethod[] = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'];

const getPaymentMethodColors = (method: PaymentMethod, isSelected: boolean) => {
  switch (method) {
    case 'dinheiro':
      return {
        backgroundColor: isSelected ? '#4CAF50' : '#E8F5E9',
        borderColor: isSelected ? '#4CAF50' : '#C8E6C9',
        textColor: isSelected ? '#FFF' : '#2E7D32',
      };
    case 'pix':
      return {
        backgroundColor: isSelected ? '#32BCAD' : '#E0F2F1',
        borderColor: isSelected ? '#32BCAD' : '#B2DFDB',
        textColor: isSelected ? '#FFF' : '#00695C',
      };
    case 'cartao_debito':
      return {
        backgroundColor: isSelected ? '#2196F3' : '#E3F2FD',
        borderColor: isSelected ? '#2196F3' : '#BBDEFB',
        textColor: isSelected ? '#FFF' : '#1565C0',
      };
    case 'cartao_credito':
      return {
        backgroundColor: isSelected ? '#FF9800' : '#FFF3E0',
        borderColor: isSelected ? '#FF9800' : '#FFE0B2',
        textColor: isSelected ? '#FFF' : '#EF6C00',
      };
  }
};

export const PaymentActionPanel = memo(function PaymentActionPanel({
  valor,
  onChangeValor,
  forma,
  onChangeForma,
  onConfirmPayment,
  onSplitByPeople,
  onSplitByItems,
  onExternalPosPayment,
  showExternalPosOption = false,
  initialMode = 'normal',
  useUiNext = true,
}: PaymentActionPanelProps) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(initialMode);

  useEffect(() => {
    setPaymentMode(initialMode);
  }, [initialMode]);

  const isExternalFlowLocked = initialMode === 'external_pos' && showExternalPosOption;
  const showModeSelector = showExternalPosOption && !isExternalFlowLocked;
  const modeLockLabel = isExternalFlowLocked ? 'Fluxo Maquininha Externa' : null;

  const handleExternalPosSubmit = async (data: ExternalPosPaymentData) => {
    if (onExternalPosPayment) {
      await onExternalPosPayment(data);
    }
  };

  return (
    <>
      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Pagamento</Text>

        {showModeSelector && (
          <PaymentModeSelector
            mode={paymentMode}
            onChangeMode={setPaymentMode}
            showExternal={showExternalPosOption}
            useUiNext={useUiNext}
          />
        )}

        {modeLockLabel && (
          <Text style={styles.modeLockLabel}>{modeLockLabel}</Text>
        )}

        {(isExternalFlowLocked || paymentMode === 'external_pos') ? (
          <ExternalPosPaymentForm
            defaultAmount={valor}
            onSubmit={handleExternalPosSubmit}
            isBusy={false}
            useUiNext={useUiNext}
          />
        ) : (
          <>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Valor (R$):</Text>
              <TextInput
                style={styles.paymentInput}
                value={valor}
                onChangeText={onChangeValor}
                keyboardType="numeric"
                placeholder="0,00"
              />
            </View>

            <Text style={styles.subTitle}>Forma de Pagamento:</Text>
            <View style={styles.formaBtnContainer}>
              {paymentMethods.map((method) => {
                const isSelected = forma === method;
                const methodColors = getPaymentMethodColors(method, isSelected);

                return (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.formaBtn,
                      {
                        backgroundColor: methodColors.backgroundColor,
                        borderColor: methodColors.borderColor,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => onChangeForma(method)}
                  >
                    <Text style={[styles.formaBtnText, { color: methodColors.textColor, fontWeight: isSelected ? 'bold' : 'normal' }]}>
                      {method.replace('_', ' ').toUpperCase()}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={10} color="#FFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {useUiNext ? (
              <>
                <Button label="Confirmar Pagamento" onPress={onConfirmPayment} fullWidth />
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.legacyPrimaryButton} onPress={onConfirmPayment}>
                  <Text style={styles.legacyPrimaryButtonText}>Confirmar Pagamento</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      <View style={styles.splitSection}>
        <Text style={styles.sectionTitle}>Opções de Divisão</Text>

        <View style={styles.splitButtonsRow}>
          {useUiNext ? (
            <>
              <Button label="Por Pessoas" onPress={onSplitByPeople} variant="ghost" style={styles.splitActionButton} />
              <Button label="Por Itens" onPress={onSplitByItems} variant="ghost" style={styles.splitActionButton} />
            </>
          ) : (
            <>
              <TouchableOpacity style={[styles.legacySecondaryButton, styles.splitActionButton]} onPress={onSplitByPeople}>
                <Text style={styles.legacySecondaryButtonText}>Por Pessoas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.legacySecondaryButton, styles.splitActionButton]} onPress={onSplitByItems}>
                <Text style={styles.legacySecondaryButtonText}>Por Itens</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  paymentSection: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  paymentLabel: {
    fontSize: 16,
    marginRight: 10,
    color: colors.text,
  },
  paymentInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 5,
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  modeLockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  formaBtnContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  formaBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: '45%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formaBtnText: {
    fontSize: 16,
  },
  checkBadge: {
    position: 'absolute',
    right: 5,
    top: 5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitSection: {
    marginTop: 10,
  },
  splitButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splitActionButton: {
    flex: 1,
  },
  deviceButton: {
    marginTop: 10,
  },
  legacyPrimaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legacyPrimaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  legacySecondaryButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  legacySecondaryButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});