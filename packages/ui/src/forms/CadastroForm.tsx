import { zodResolver } from '@hookform/resolvers/zod';
import { cadastroSchema, type CadastroInput } from '@restaurante/schemas';
import { spacing } from '@restaurante/tokens';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface CadastroFormProps {
  onSubmit: (values: CadastroInput) => void;
}

export function CadastroForm({ onSubmit }: CadastroFormProps): React.JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CadastroInput>({
    resolver: zodResolver(cadastroSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  });

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <Input
            label="Nome"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.name?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <Input
            label="E-mail"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <Input
            label="Telefone"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.phone?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <Input
            label="Senha"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
            error={errors.password?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field }) => (
          <Input
            label="Confirmar senha"
            value={field.value}
            onChangeText={field.onChange}
            secureTextEntry
            error={errors.confirmPassword?.message}
          />
        )}
      />
      <Button label="Criar conta" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
    </View>
  );
}
