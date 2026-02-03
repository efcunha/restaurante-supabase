# Guia de Configuração de Ambientes

Este guia explica como configurar o aplicativo para diferentes ambientes (desenvolvimento, staging, produção).

## Visão Geral

O aplicativo suporta três ambientes distintos:

1. **Development** - Para desenvolvimento local
2. **Staging** - Para testes antes de produção
3. **Production** - Para usuários finais

Cada ambiente usa um projeto Firebase separado e configurações de feature flags diferentes.

## Configuração Inicial

### 1. Criar Projetos Firebase

Crie três projetos no [Firebase Console](https://console.firebase.google.com/):

- `restaurant-app-dev` (Development)
- `restaurant-app-staging` (Staging)
- `restaurant-app-prod` (Production)

### 2. Obter Credenciais

Para cada projeto:

1. Acesse **Project Settings** (ícone de engrenagem)
2. Role até **Your apps**
3. Clique em **Web app** (ícone `</>`)
4. Copie as credenciais do `firebaseConfig`

### 3. Configurar Variáveis de Ambiente

#### Development

```bash
# Copie o template
cp .env.development.example .env.development

# Edite .env.development com as credenciais do projeto dev
nano .env.development
```

Preencha:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=restaurant-app-dev.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=restaurant-app-dev
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=restaurant-app-dev.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123
```

#### Staging

```bash
cp .env.staging.example .env.staging
nano .env.staging
```

#### Production

```bash
cp .env.production.example .env.production
nano .env.production
```

## Executar em Diferentes Ambientes

### Development

```bash
# Carrega .env.development
npm run start

# Ou explicitamente
EXPO_PUBLIC_ENV=development npm run start
```

### Staging

```bash
# Carrega .env.staging
EXPO_PUBLIC_ENV=staging npm run start
```

### Production

```bash
# Carrega .env.production
EXPO_PUBLIC_ENV=production npm run start
```

## Feature Flags por Ambiente

### Development
- Todas as features habilitadas para testes
- Debug mode ativo
- Logs verbosos

### Staging
- Features estáveis habilitadas
- Testa features antes de produção
- Logs informativos

### Production
- Rollout gradual de features
- Apenas features validadas
- Logs mínimos (apenas erros)

## Validação de Configuração

### Verificar Variáveis

```bash
# Listar variáveis carregadas
npm run env:check
```

### Testar Configuração

```bash
# Executar testes de configuração
npm run test -- __tests__/unit/config-errors.test.ts
npm run test -- __tests__/property/config-validation.test.ts
```

## Troubleshooting

### Erro: "ERRO DE CONFIGURAÇÃO DO FIREBASE"

**Causa**: Variáveis de ambiente obrigatórias ausentes.

**Solução**:
1. Verifique se arquivo `.env.[environment]` existe
2. Verifique se todas as variáveis estão preenchidas
3. Reinicie o servidor Expo

### Erro: "ERRO DE FORMATO DAS CREDENCIAIS"

**Causa**: Credenciais com formato inválido.

**Solução**:
1. Verifique se copiou credenciais corretamente do Firebase Console
2. Valide formatos:
   - API Key: deve começar com `AIza`
   - Auth Domain: deve terminar com `.firebaseapp.com`
   - Project ID: apenas lowercase, números e hífens
   - Sender ID: apenas números
   - App ID: deve começar com `1:`

### Erro: "Firebase não inicializado"

**Causa**: Erro ao inicializar Firebase (não de configuração).

**Solução**:
1. Verifique conexão com internet
2. Verifique se projeto Firebase existe
3. Verifique se APIs estão habilitadas no Firebase Console

## Segurança

### ⚠️ IMPORTANTE

1. **NUNCA** commite arquivos `.env` no Git
2. `.env.example` pode ser commitado (sem credenciais reais)
3. Use `.gitignore` para proteger arquivos `.env`
4. Rotacione credenciais se expostas acidentalmente

### Verificar .gitignore

```bash
# Verificar se .env está ignorado
cat .gitignore | grep .env
```

Deve conter:
```
.env
.env.local
.env.development
.env.staging
.env.production
```

## CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
env:
  EXPO_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
  # ... outras variáveis
```

### Secrets no GitHub

1. Acesse **Settings** > **Secrets and variables** > **Actions**
2. Adicione cada variável como secret
3. Use prefixo para ambiente: `DEV_FIREBASE_API_KEY`, `PROD_FIREBASE_API_KEY`

## Migração de Ambiente Único

Se você tem apenas um ambiente atualmente:

### 1. Backup

```bash
# Backup do .env atual
cp .env .env.backup
```

### 2. Criar Ambientes

```bash
# Development (usa projeto atual)
cp .env .env.development

# Staging (criar novo projeto)
cp .env.staging.example .env.staging
# Preencher com credenciais do novo projeto staging

# Production (criar novo projeto)
cp .env.production.example .env.production
# Preencher com credenciais do novo projeto production
```

### 3. Atualizar Scripts

```json
{
  "scripts": {
    "start": "EXPO_PUBLIC_ENV=development expo start",
    "start:staging": "EXPO_PUBLIC_ENV=staging expo start",
    "start:prod": "EXPO_PUBLIC_ENV=production expo start"
  }
}
```

## Monitoramento

### Verificar Ambiente Ativo

No código:
```typescript
import { getFirebaseInfo } from './config/firebaseConfig';

const info = getFirebaseInfo();
console.log('Ambiente:', info.environment);
console.log('Projeto:', info.projectId);
```

### Logs de Inicialização

Ao iniciar, você verá:
```
✅ Firebase inicializado com sucesso
📦 Projeto: restaurant-app-dev
🌍 Ambiente: Desenvolvimento
```

## Referências

- [Firebase Setup Documentation](https://firebase.google.com/docs/web/setup)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Security Best Practices](https://firebase.google.com/docs/projects/api-keys)
