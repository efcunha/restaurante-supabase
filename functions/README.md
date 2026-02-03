# Cloud Functions - Restaurant App Modernization

Este diretório contém as Cloud Functions do Firebase para o aplicativo de restaurante.

## Funções Disponíveis

### 1. refreshUserClaims (Callable)

Atualiza custom claims do usuário quando membership ou role mudar.

**Uso:**
```typescript
const functions = getFunctions();
const refreshClaims = httpsCallable(functions, 'refreshUserClaims');

await refreshClaims({
  userId: 'user-uid',
  companyId: 'company-id',  // opcional
  role: 'manager'            // opcional
});
```

**Custom Claims incluem:**
- `companyId`: ID da empresa do usuário
- `role`: Papel normalizado (admin, manager, waiter, kitchen)
- `mfaEnabled`: Se MFA está habilitado
- `mfaVerified`: Se MFA foi verificado nesta sessão
- `updatedAt`: Timestamp da última atualização

### 2. onUserMembershipChange (Trigger)

Trigger automático que atualiza custom claims quando documento de membership mudar.

**Trigger:** `companies/{companyId}/users/{userId}` onWrite

**Comportamento:**
- Quando usuário é adicionado: atualiza claims com companyId e role
- Quando role muda: atualiza claims com novo role
- Quando usuário é removido: limpa claims

## Setup

### 1. Instalar dependências

```bash
cd functions
npm install
```

### 2. Compilar TypeScript

```bash
npm run build
```

### 3. Deploy

```bash
# Deploy todas as functions
npm run deploy

# Deploy function específica
firebase deploy --only functions:refreshUserClaims
```

### 4. Testar localmente

```bash
# Iniciar emuladores
npm run serve

# Em outro terminal, testar function
firebase functions:shell
```

## Desenvolvimento

### Estrutura de arquivos

```
functions/
├── src/
│   └── index.ts          # Todas as Cloud Functions
├── package.json
├── tsconfig.json
└── README.md
```

### Adicionar nova function

1. Editar `src/index.ts`
2. Adicionar export da nova function
3. Compilar: `npm run build`
4. Deploy: `npm run deploy`

### Logs

```bash
# Ver logs em tempo real
npm run logs

# Ver logs de function específica
firebase functions:log --only refreshUserClaims
```

## Segurança

### Validações implementadas

1. **Autenticação**: Todas as callable functions validam `context.auth`
2. **Autorização**: Valida que usuário pertence à empresa antes de atualizar claims
3. **Input validation**: Valida tipos e presença de parâmetros obrigatórios
4. **Error handling**: Erros são logados e retornados como HttpsError

### Permissões necessárias

As functions precisam das seguintes permissões:
- `firebase-admin`: Acesso total ao Firestore e Auth
- `functions`: Permissão para executar Cloud Functions

## Monitoramento

### Métricas importantes

- **Invocações**: Número de vezes que function foi chamada
- **Duração**: Tempo de execução
- **Erros**: Taxa de erro
- **Memória**: Uso de memória

### Alertas

Configure alertas no Firebase Console para:
- Taxa de erro > 5%
- Duração P95 > 5s
- Invocações > 10k/dia (ajustar conforme necessário)

## Custos

### Estimativa de custos

- **refreshUserClaims**: ~0.0001 USD por invocação
- **onUserMembershipChange**: ~0.0001 USD por trigger

**Estimativa mensal** (baseado em 1000 usuários, 10 mudanças/dia):
- refreshUserClaims: ~$3/mês
- onUserMembershipChange: ~$0.30/mês
- **Total**: ~$3.30/mês

### Otimizações de custo

1. **Caching**: Custom claims são cacheados no token por 1 hora
2. **Batching**: Triggers processam mudanças em batch quando possível
3. **Conditional execution**: Apenas atualiza claims se realmente mudaram

## Troubleshooting

### Function não está sendo chamada

1. Verificar que function foi deployed: `firebase functions:list`
2. Verificar logs: `npm run logs`
3. Verificar permissões no Firebase Console

### Erro "permission-denied"

1. Verificar que usuário está autenticado
2. Verificar que usuário pertence à empresa
3. Verificar Security Rules do Firestore

### Claims não estão sendo atualizados

1. Forçar reload do token: `await user.getIdToken(true)`
2. Verificar que function foi executada com sucesso nos logs
3. Verificar que feature flag `useCustomClaims` está habilitado

## Referências

- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Custom Claims Documentation](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
