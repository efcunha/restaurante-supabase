import React, { memo, useCallback, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../../theme/colors';
import { Button } from '../../../ui';
import { ExternalPosCardType, ExternalPosPaymentData } from '../types';

interface ExternalPosPaymentFormProps {
  /** Valor padrão pré-preenchido (saldo em aberto) */
  defaultAmount: string;
  onSubmit: (data: ExternalPosPaymentData) => Promise<void>;
  isBusy?: boolean;
  useUiNext?: boolean;
}

const cardTypeLabels: Record<ExternalPosCardType, string> = {
  cartao_credito: 'Crédito',
  cartao_debito: 'Débito',
  pix: 'PIX',
  dinheiro: 'Dinheiro',
};

const cardTypes: ExternalPosCardType[] = ['cartao_credito', 'cartao_debito', 'pix', 'dinheiro'];

/** Gera uma chave de idempotência simples baseada em timestamp. */
function genIdempotencyKey(): string {
  return `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const ExternalPosPaymentForm = memo(function ExternalPosPaymentForm({
  defaultAmount,
  onSubmit,
  isBusy = false,
  useUiNext = true,
}: ExternalPosPaymentFormProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [cardType, setCardType] = useState<ExternalPosCardType>('cartao_credito');
  const [nsu, setNsu] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Proteção contra duplo envio: cada montagem tem uma chave única.
  const idempotencyKey = useRef<string>(genIdempotencyKey());

  const handleSubmit = useCallback(async () => {
    const parsedAmount = parseFloat((amount || '0').replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }

    if (submitting || isBusy) return;
    setSubmitting(true);

    try {
      await onSubmit({
        amount: parsedAmount,
        cardType,
        nsu: nsu.trim() || undefined,
        cardLast4: cardLast4.trim() || undefined,
        note: note.trim() || undefined,
        idempotencyKey: idempotencyKey.current,
      });
      // Rotacionar a chave após envio bem-sucedido para evitar reenvio no reuso do form
      idempotencyKey.current = genIdempotencyKey();
      setNsu('');
      setCardLast4('');
      setNote('');
    } finally {
      setSubmitting(false);
    }
  }, [amount, cardType, nsu, cardLast4, note, onSubmit, submitting, isBusy]);

  const busy = submitting || isBusy;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrar Maquininha Externa</Text>
      <Text style={styles.subtitle}>
        O recebimento já aconteceu na maquininha própria. Registre aqui para atualizar o saldo da comanda.
      </Text>

      {/* Valor */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Valor Recebido (R$):</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0,00"
          editable={!busy}
          accessibilityLabel="Valor recebido"
        />
      </View>

      {/* Tipo de cartão */}
      <Text style={styles.fieldLabel}>Tipo de Recebimento:</Text>
      <View style={styles.cardTypeRow}>
        {cardTypes.map((ct) => {
          const isSelected = cardType === ct;
          return (
            <TouchableOpacity
              key={ct}
              style={[styles.cardTypeBtn, isSelected && styles.cardTypeBtnActive]}
              onPress={() => setCardType(ct)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.cardTypeBtnText, isSelected && styles.cardTypeBtnTextActive]}>
                {cardTypeLabels[ct]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* NSU — opcional */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>NSU (opcional):</Text>
        <TextInput
          style={styles.input}
          value={nsu}
          onChangeText={setNsu}
          placeholder="Ex: 123456789"
          keyboardType="number-pad"
          maxLength={20}
          editable={!busy}
          accessibilityLabel="NSU da transação"
        />
      </View>

      {/* Últimos 4 dígitos — opcional */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Últimos 4 dígitos (opcional):</Text>
        <TextInput
          style={[styles.input, styles.inputShort]}
          value={cardLast4}
          onChangeText={(v) => setCardLast4(v.replace(/\D/g, '').slice(0, 4))}
          placeholder="••••"
          keyboardType="number-pad"
          maxLength={4}
          editable={!busy}
          accessibilityLabel="Últimos 4 dígitos do cartão"
        />
      </View>

      {/* Observação — opcional */}
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Observação (opcional):</Text>
        <TextInput
          style={[styles.input, styles.inputNote]}
          value={note}
          onChangeText={setNote}
          placeholder="Ex: cliente pagou com cartão da empresa"
          maxLength={200}
          multiline
          editable={!busy}
          accessibilityLabel="Observação sobre o pagamento"
        />
      </View>

      {/* Botão de confirmação */}
      {useUiNext ? (
        <Button
          label={busy ? 'Registrando...' : 'Confirmar Recebimento Externo'}
          onPress={handleSubmit}
          fullWidth
          disabled={busy}
          style={styles.submitButton}
        />
      ) : (
        <TouchableOpacity
          style={[styles.legacyButton, busy && styles.legacyButtonDisabled]}
          onPress={handleSubmit}
          disabled={busy}
        >
          <Text style={styles.legacyButtonText}>
            {busy ? 'Registrando...' : 'Confirmar Recebimento Externo'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    backgroundColor: '#F5F7FF',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  fieldRow: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputShort: {
    width: 80,
  },
  inputNote: {
    minHeight: 48,
    textAlignVertical: 'top',
  },
  cardTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  cardTypeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cardTypeBtnActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  cardTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  cardTypeBtnTextActive: {
    color: '#FFF',
  },
  submitButton: {
    marginTop: 4,
  },
  legacyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  legacyButtonDisabled: {
    opacity: 0.5,
  },
  legacyButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
