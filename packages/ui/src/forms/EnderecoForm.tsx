import { zodResolver } from '@hookform/resolvers/zod';
import { enderecoSchema, type EnderecoInput } from '@restaurante/schemas';
import { spacing } from '@restaurante/tokens';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface EnderecoFormProps {
  onSubmit: (values: EnderecoInput) => void;
}

export function EnderecoForm({ onSubmit }: EnderecoFormProps): React.JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EnderecoInput>({
    resolver: zodResolver(enderecoSchema),
    mode: 'onBlur',
    defaultValues: {
      zipCode: '',
      street: '',
      number: '',
      district: '',
      city: '',
      state: '',
      complement: '',
    },
  });

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={control}
        name="zipCode"
        render={({ field }) => (
          <Input
            label="CEP"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.zipCode?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="street"
        render={({ field }) => (
          <Input
            label="Rua"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.street?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="number"
        render={({ field }) => (
          <Input
            label="Numero"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.number?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="district"
        render={({ field }) => (
          <Input
            label="Bairro"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.district?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="city"
        render={({ field }) => (
          <Input
            label="Cidade"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.city?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="state"
        render={({ field }) => (
          <Input
            label="UF"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.state?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="complement"
        render={({ field }) => (
          <Input
            label="Complemento"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            error={errors.complement?.message}
          />
        )}
      />
      <Button label="Salvar endereco" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </View>
  );
}
