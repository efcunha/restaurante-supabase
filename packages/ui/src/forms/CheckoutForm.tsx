import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema, type CheckoutInput } from '@restaurante/schemas';
import { spacing } from '@restaurante/tokens';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface CheckoutFormProps {
  onSubmit: (values: CheckoutInput) => void;
}

export function CheckoutForm({ onSubmit }: CheckoutFormProps): React.JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onBlur',
    defaultValues: {
      paymentMethod: 'pix',
      customerName: '',
      customerEmail: '',
      acceptTerms: true,
      notes: '',
    },
  });

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={control}
        name="customerName"
        render={({ field }) => (
          <Input
            label="Nome"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.customerName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="customerEmail"
        render={({ field }) => (
          <Input
            label="E-mail"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.customerEmail?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <Input
            label="Observacoes"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            error={errors.notes?.message}
          />
        )}
      />
      <Button label="Finalizar pedido" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </View>
  );
}
