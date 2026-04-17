import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@restaurante/schemas';
import { spacing } from '@restaurante/tokens';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

interface LoginFormProps {
  onSubmit: (values: LoginInput) => void;
}

export function LoginForm({ onSubmit }: LoginFormProps): React.JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  return (
    <View style={{ gap: spacing.md }}>
      <Controller
        control={control}
        name="email"
        render={({ field: { value, onChange } }) => (
          <Input
            label="E-mail"
            value={value}
            onChangeText={onChange}
            placeholder="voce@empresa.com"
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Senha"
            value={value}
            onChangeText={onChange}
            secureTextEntry
            error={errors.password?.message}
          />
        )}
      />
      <Button label="Entrar" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      {errors.root?.message ? <Text>{errors.root.message}</Text> : null}
    </View>
  );
}
