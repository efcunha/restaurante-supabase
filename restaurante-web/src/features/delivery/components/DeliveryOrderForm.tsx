import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { DeliveryOrderFormProps } from '../types';

const paymentMethods = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito'];

export const DeliveryOrderForm = memo(function DeliveryOrderForm({
  clientName,
  onChangeClientName,
  customerPhone,
  onChangeCustomerPhone,
  deliveryCep,
  onChangeDeliveryCep,
  isSearchingCep,
  deliveryAddress,
  onChangeDeliveryAddress,
  deliveryFee,
  onChangeDeliveryFee,
  paymentMethod,
  onChangePaymentMethod,
  changeFor,
  onChangeChangeFor,
}: DeliveryOrderFormProps) {
  return (
    <View style={styles.headerForm}>
      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Cliente *:</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do Cliente"
            value={clientName}
            onChangeText={onChangeClientName}
            placeholderTextColor="#999"
          />
        </View>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>Telefone (só números):</Text>
          <TextInput
            style={styles.input}
            placeholder="(11) 99999-9999"
            value={customerPhone}
            onChangeText={onChangeCustomerPhone}
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.fieldHalf}>
          <Text style={styles.label}>CEP:</Text>
          <View style={styles.cepRow}>
            <TextInput
              style={[styles.input, styles.cepInput]}
              placeholder="00000-000"
              value={deliveryCep}
              onChangeText={onChangeDeliveryCep}
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            {isSearchingCep && <ActivityIndicator style={styles.cepLoader} size="small" color={colors.primary} />}
          </View>
        </View>
        <View style={styles.fieldAddress}>
          <Text style={styles.label}>Endereço Completo *:</Text>
          <TextInput
            style={styles.input}
            placeholder="Rua, Número, Bairro, Referência..."
            value={deliveryAddress}
            onChangeText={onChangeDeliveryAddress}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.feeRow}>
        <Text style={styles.feeLabel}>Taxa de Entrega (R$):</Text>
        <TextInput
          style={styles.feeInput}
          placeholder="0,00"
          value={deliveryFee}
          onChangeText={onChangeDeliveryFee}
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.label}>Forma de Pagamento (Entrega):</Text>
        <View style={styles.paymentMethodRow}>
          {paymentMethods.map((method) => {
            const isSelected = paymentMethod === method;
            return (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentMethodButton,
                  {
                    borderColor: isSelected ? colors.primary : '#DDD',
                    backgroundColor: isSelected ? '#FDF5F5' : '#FFF',
                  },
                ]}
                onPress={() => onChangePaymentMethod(method)}
              >
                <Text style={[styles.paymentMethodText, isSelected && styles.paymentMethodTextSelected]}>
                  {method.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {paymentMethod === 'dinheiro' && (
        <View style={styles.changeRow}>
          <Text style={styles.changeLabel}>Troco para (R$):</Text>
          <TextInput
            style={[styles.input, styles.changeInput]}
            placeholder="Ex: 100,00"
            value={changeFor}
            onChangeText={onChangeChangeFor}
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  headerForm: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldAddress: {
    flex: 2,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    outlineStyle: 'none' as any,
  },
  cepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cepInput: {
    flex: 1,
  },
  cepLoader: {
    marginLeft: 10,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  feeLabel: {
    flex: 1,
    marginBottom: 0,
    fontSize: 14,
    color: colors.text,
    fontWeight: 'bold',
  },
  feeInput: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    width: 80,
    textAlign: 'right',
    outlineStyle: 'none' as any,
  },
  paymentSection: {
    marginBottom: 10,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 5,
  },
  paymentMethodButton: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentMethodText: {
    color: '#666',
  },
  paymentMethodTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
  },
  changeLabel: {
    marginRight: 10,
    marginBottom: 0,
    fontSize: 14,
    color: colors.text,
    fontWeight: 'bold',
  },
  changeInput: {
    width: 100,
  },
});