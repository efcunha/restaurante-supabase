import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Informe um e-mail valido'),
  password: z.string().min(8, 'A senha deve ter no minimo 8 caracteres'),
});

export const cadastroSchema = z
  .object({
    name: z.string().min(3, 'Nome obrigatorio'),
    email: z.email('Informe um e-mail valido'),
    phone: z.string().min(10, 'Telefone invalido'),
    password: z.string().min(8, 'A senha deve ter no minimo 8 caracteres'),
    confirmPassword: z.string().min(8, 'Confirme sua senha'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas devem ser iguais',
  });

export const enderecoSchema = z.object({
  zipCode: z.string().min(8, 'CEP invalido'),
  street: z.string().min(3, 'Rua obrigatoria'),
  number: z.string().min(1, 'Numero obrigatorio'),
  district: z.string().min(2, 'Bairro obrigatorio'),
  city: z.string().min(2, 'Cidade obrigatoria'),
  state: z.string().length(2, 'UF invalida'),
  complement: z.string().optional(),
});

export const checkoutSchema = z.object({
  paymentMethod: z.enum(['pix', 'credit_card', 'debit_card', 'cash']),
  customerName: z.string().min(3, 'Nome obrigatorio'),
  customerEmail: z.email('Informe um e-mail valido'),
  acceptTerms: z.literal(true, {
    error: 'Voce precisa aceitar os termos para concluir',
  }),
  notes: z.string().max(300, 'Observacoes com no maximo 300 caracteres').optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CadastroInput = z.infer<typeof cadastroSchema>;
export type EnderecoInput = z.infer<typeof enderecoSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
