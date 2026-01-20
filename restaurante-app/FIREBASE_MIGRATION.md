# Migração Firebase - restaurante-6f221

## ✅ Arquivos Atualizados

Todos os arquivos com configuração do Firebase foram atualizados para o novo projeto `restaurante-6f221`:

1. **src/config/firebaseConfig.js** - Configuração principal
2. **scripts/delete-caixa.js** - Script de limpeza de caixa
3. **scripts/limpar-firebase.js** - Script de limpeza geral
4. **TODO.md** - Documentação
5. **CONTEXT.md** - Documentação
6. **src/services/FirebaseOptimizations.js** - URL do console

## 🔐 Credenciais Configuradas

### ✅ Service Account (Backend/Scripts)
- Arquivo: `serviceAccountKey.json` (já configurado)
- Uso: Firebase Admin SDK, scripts Node.js
- **⚠️ NUNCA commite este arquivo no Git!**

### ⚠️ Credenciais Web (App React Native) - PENDENTE

As credenciais Web ainda precisam ser obtidas do Firebase Console.

## 📋 Como Obter Credenciais Web

Execute o script de ajuda:
```bash
node scripts/get-firebase-config.js
```

Ou siga manualmente:

1. Acesse: https://console.firebase.google.com/project/restaurante-6f221/settings/general
2. Role até **"Seus apps"** > **"SDK setup and configuration"**
3. Selecione **"Config"** (não npm)
4. Copie o objeto `firebaseConfig`

Você verá algo como:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "restaurante-6f221.firebaseapp.com",
  projectId: "restaurante-6f221",
  storageBucket: "restaurante-6f221.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. **Opção A - Usar .env (Recomendado):**
   - Copie `.env.example` para `.env`
   - Preencha com os valores obtidos

6. **Opção B - Hardcode (Desenvolvimento):**
   - Atualize diretamente em `src/config/firebaseConfig.js`

## 🚀 Próximos Passos

### 1. Configure as Credenciais Web
- [ ] Obter credenciais do Firebase Console
- [ ] Configurar em `.env` ou `firebaseConfig.js`

### 2. Configure o Firebase Console
- [ ] Ativar Authentication (Email/Password)
- [ ] Configurar Firestore Database
- [ ] Configurar regras de segurança
- [ ] Criar índices necessários

### 3. Teste a Conexão
```bash
npm start
```

### 4. Inicialize Dados (Opcional)
```bash
# Limpar dados antigos (se necessário)
node scripts/limpar-firebase.js
```

## 📝 Diferença entre Credenciais

| Tipo | Uso | Arquivo | Segurança |
|------|-----|---------|-----------|
| **Service Account** | Backend, scripts Node.js | `serviceAccountKey.json` | 🔴 CRÍTICO - Nunca expor |
| **Web Config** | App React Native, frontend | `firebaseConfig.js` ou `.env` | 🟡 Público - OK expor |

## ⚠️ Segurança

- ✅ `serviceAccountKey.json` está no `.gitignore`
- ✅ `.env` está no `.gitignore`
- ⚠️ Credenciais Web podem ser públicas (são protegidas por regras do Firestore)
- 🔴 **NUNCA** commite `serviceAccountKey.json` no Git

## 🆘 Problemas Comuns

### "Firebase not initialized"
- Verifique se as credenciais Web estão corretas
- Confirme que o projeto existe no Firebase Console

### "Permission denied"
- Configure as regras de segurança no Firestore
- Ative Authentication no Firebase Console

### Scripts não funcionam
- Verifique se `serviceAccountKey.json` existe
- Confirme que o Service Account tem permissões adequadas

