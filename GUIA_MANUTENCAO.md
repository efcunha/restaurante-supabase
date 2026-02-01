# 🔧 Guia de Manutenção e Evolução - Restaurante App

## 📋 Índice
1. [Tarefas Comuns](#tarefas-comuns)
2. [Troubleshooting](#troubleshooting)
3. [Adicionando Funcionalidades](#adicionando-funcionalidades)
4. [Migrações de Dados](#migrações-de-dados)
5. [Deploy e Releases](#deploy-e-releases)

---

## 1. Tarefas Comuns

### Adicionar Novo Item ao Cardápio

#### Via Firebase Console
1. Acesse Firestore Console
2. Navegue até `companies/{companyId}/cardapio`
3. Adicione novo documento:
```json
{
  "name": "Nome do Produto",
  "price": 25.00,
  "category": "comidas",
  "active": true,
  "description": "Descrição opcional",
  "createdAt": "timestamp"
}
```

#### Via Admin Screen
1. Login como Admin/Gerente
2. Acesse "Admin" → "Gerenciar Cardápio"
3. Clique em "Adicionar Item"
4. Preencha formulário e salve

### Adicionar Novo Funcionário

```javascript
// Via código (RegisterCompanyScreen ou Admin)
const novoFuncionario = {
  nome: "João Silva",
  email: "joao@restaurante.com",
  funcao: "garcom", // admin, gerente, garcom, cozinheiro, montagem
  companyId: user.companyId,
  ativo: true,
  criadoEm: new Date().toISOString()
};

await addDoc(
  getCompanyCollection(companyId, 'funcionarios'),
  novoFuncionario
);

// Criar usuário no Firebase Auth
const userCredential = await createUserWithEmailAndPassword(
  auth,
  email,
  senhaTemporaria
);
```

### Atualizar Preços em Massa

```javascript
// Script de migração
const atualizarPrecos = async (companyId, aumentoPercentual) => {
  const cardapioRef = getCompanyCollection(companyId, 'cardapio');
  const snapshot = await getDocs(cardapioRef);
  
  const batch = writeBatch(db);
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const novoPreco = data.price * (1 + aumentoPercentual / 100);
    batch.update(doc.ref, { price: novoPreco });
  });
  
  await batch.commit();
};

// Uso: aumentar 10%
await atualizarPrecos('company-id', 10);
```

---

## 2. Troubleshooting

### Problema: Pedidos não aparecem em tempo real

**Sintomas:**
- Pedidos criados não aparecem na Cozinha
- Atualizações de status não sincronizam

**Diagnóstico:**
```javascript
// Verificar listener ativo
console.log('Listener ativo:', !!unsubscribe);

// Verificar conexão Firestore
console.log('Online:', isOnline);

// Verificar índices
// Firebase Console → Firestore → Indexes
```

**Soluções:**
1. Verificar se índices estão criados
2. Verificar regras de segurança
3. Verificar conexão de rede
4. Limpar cache: `AsyncStorage.clear()`

### Problema: Caixa não abre

**Sintomas:**
- Erro "Já existe um caixa aberto"
- Erro "Company ID required"

**Diagnóstico:**
```javascript
// Verificar caixa do dia
const caixa = await CaixaService.getCaixaAberto(companyId);
console.log('Caixa atual:', caixa);

// Verificar documento
const caixaRef = doc(db, 'caixas', `caixa-${dateKey()}`);
const snap = await getDoc(caixaRef);
console.log('Status:', snap.data()?.status);
```

**Soluções:**
1. Fechar caixa anterior manualmente
2. Verificar data do sistema
3. Limpar cache de caixa: `CaixaService.invalidateCache()`

### Problema: Comanda não fecha

**Sintomas:**
- Erro "Saldo em aberto"
- totalPago < totalConsumido

**Diagnóstico:**
```javascript
// Verificar totais
const comanda = await getDoc(comandaRef);
const data = comanda.data();
console.log('Total consumido:', data.totalConsumido);
console.log('Total pago:', data.totalPago);
console.log('Saldo:', data.saldoAberto);

// Verificar pedidos
const pedidos = await findOrdersByComanda(comandaNumber);
const totalPedidos = pedidos.reduce((sum, p) => sum + p.totalPrice, 0);
console.log('Total pedidos:', totalPedidos);
```

**Soluções:**
1. Sincronizar total da comanda:
```javascript
await ComandasService.sincronizarTotalComanda(
  companyId,
  comandaNumber,
  totalReal
);
```

2. Registrar pagamento faltante
3. Verificar se há pedidos duplicados

### Problema: Impressora não conecta

**Sintomas:**
- Erro "Nenhuma impressora encontrada"
- Impressão não sai

**Diagnóstico:**
```javascript
// Verificar Bluetooth
const devices = await PrinterService.scanDevices();
console.log('Dispositivos:', devices);

// Verificar conexão
const connected = await PrinterService.isConnected();
console.log('Conectado:', connected);
```

**Soluções:**
1. Verificar se Bluetooth está ativado
2. Parear impressora manualmente
3. Tentar reconectar: `PrinterService.autoConnect()`
4. Usar fallback PDF: `PrinterService.generatePDF()`

---

## 3. Adicionando Funcionalidades

### Adicionar Nova Tela

#### 1. Criar Screen
```javascript
// src/screens/MinhaNovaScreen.js
import React from 'react';
import { View, Text } from 'react-native';

export default function MinhaNovaScreen() {
  return (
    <View>
      <Text>Minha Nova Tela</Text>
    </View>
  );
}
```

#### 2. Adicionar à Navegação
```javascript
// App.js
import MinhaNovaScreen from './src/screens/MinhaNovaScreen';

function TabNavigator() {
  return (
    <Tab.Navigator>
      {/* ... outras telas */}
      <Tab.Screen name="MinhaNovaScreen" component={MinhaNovaScreen} />
    </Tab.Navigator>
  );
}
```

#### 3. Adicionar Permissões
```javascript
// src/auth/roles.js
export const RoleScreens = {
  [Roles.ADMIN]: [..., 'MinhaNovaScreen'],
  [Roles.GERENTE]: [..., 'MinhaNovaScreen'],
  // ...
};
```

### Adicionar Novo Service

#### 1. Criar Service
```javascript
// src/services/MeuNovoService.js
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

class MeuNovoService {
  async minhaFuncao(companyId, dados) {
    // Lógica aqui
    const ref = collection(db, `companies/${companyId}/minhaCollection`);
    return await addDoc(ref, dados);
  }
}

export default new MeuNovoService();
```

#### 2. Usar no Componente
```javascript
import MeuNovoService from '../services/MeuNovoService';

const handleAction = async () => {
  try {
    await MeuNovoService.minhaFuncao(companyId, dados);
    Alert.alert('Sucesso!');
  } catch (error) {
    Alert.alert('Erro', error.message);
  }
};
```

### Adicionar Nova Collection

#### 1. Criar Índices
```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "minhaCollection",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "dateKey", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

#### 2. Deploy Índices
```bash
firebase deploy --only firestore:indexes
```

#### 3. Atualizar Security Rules
```javascript
// firestore.rules
match /companies/{companyId}/minhaCollection/{docId} {
  allow read, write: if request.auth != null 
    && request.auth.token.companyId == companyId;
}
```

---

## 4. Migrações de Dados

### Template de Migração

```javascript
// scripts/migrations/001_adicionar_campo_mesa.js
const migrarPedidos = async (companyId) => {
  console.log('Iniciando migração...');
  
  const pedidosRef = collection(db, `companies/${companyId}/pedidos`);
  const snapshot = await getDocs(pedidosRef);
  
  const batch = writeBatch(db);
  let count = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    
    // Adicionar campo se não existir
    if (!data.mesa) {
      batch.update(doc.ref, { mesa: '' });
      count++;
    }
  });
  
  await batch.commit();
  console.log(`Migração concluída: ${count} documentos atualizados`);
};

// Executar
migrarPedidos('company-id-aqui');
```

### Migrações Comuns

#### Normalizar Comandas
```javascript
const normalizarComandas = async (companyId) => {
  const comandasRef = collection(db, `companies/${companyId}/comandas`);
  const snapshot = await getDocs(comandasRef);
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Normalizar numeroComanda
    if (data.comandaNumber && !data.numeroComanda) {
      await updateDoc(doc.ref, {
        numeroComanda: String(data.comandaNumber)
      });
    }
  }
};
```

#### Recalcular Totais
```javascript
const recalcularTotaisComandas = async (companyId, dateKey) => {
  const comandas = await getDocs(
    query(
      collection(db, `companies/${companyId}/comandas`),
      where('dateKey', '==', dateKey)
    )
  );
  
  for (const comandaDoc of comandas.docs) {
    const comandaNumber = comandaDoc.data().numeroComanda;
    
    // Buscar pedidos
    const pedidos = await findOrdersByComanda(companyId, comandaNumber);
    const totalReal = pedidos.reduce((sum, p) => sum + p.totalPrice, 0);
    
    // Atualizar
    await ComandasService.sincronizarTotalComanda(
      companyId,
      comandaNumber,
      totalReal
    );
  }
};
```

---

## 5. Deploy e Releases

### Checklist Pré-Deploy

- [ ] Testes passando
- [ ] Lint sem erros: `npm run lint`
- [ ] Build local funciona: `npm run android`
- [ ] Versão atualizada em `package.json` e `app.json`
- [ ] Changelog atualizado
- [ ] Índices Firestore deployados
- [ ] Security Rules atualizadas
- [ ] Backup do banco de dados

### Build Android

#### 1. Atualizar Versão
```json
// app.json
{
  "expo": {
    "version": "1.0.1",
    "android": {
      "versionCode": 2
    }
  }
}
```

#### 2. Build
```bash
# Local
./build-android.sh

# EAS (Cloud)
eas build -p android --profile production
```

#### 3. Testar APK
```bash
adb install app-release.apk
```

### Deploy Firebase

#### 1. Deploy Rules
```bash
firebase deploy --only firestore:rules
```

#### 2. Deploy Índices
```bash
firebase deploy --only firestore:indexes
```

#### 3. Verificar
```bash
firebase firestore:indexes
```

### Rollback

#### Reverter Rules
```bash
# Restaurar versão anterior
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules
```

#### Reverter Índices
```bash
# Remover índice problemático via Console
# Firebase Console → Firestore → Indexes → Delete
```

---

## 6. Manutenção Preventiva

### Limpeza de Dados

#### Remover Pedidos Antigos
```javascript
const limparPedidosAntigos = async (companyId, diasAtras = 30) => {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasAtras);
  const dateKeyLimite = formatDateKey(dataLimite);
  
  const pedidosRef = collection(db, `companies/${companyId}/pedidos`);
  const snapshot = await getDocs(
    query(pedidosRef, where('dateKey', '<', dateKeyLimite))
  );
  
  const batch = writeBatch(db);
  snapshot.forEach(doc => batch.delete(doc.ref));
  
  await batch.commit();
};
```

#### Arquivar Comandas Antigas
```javascript
const arquivarComandas = async (companyId, mesesAtras = 3) => {
  // Mover para collection de arquivo
  const comandasRef = collection(db, `companies/${companyId}/comandas`);
  const arquivoRef = collection(db, `companies/${companyId}/comandas_arquivo`);
  
  // ... lógica de arquivamento
};
```

### Monitoramento

#### Verificar Saúde do Sistema
```javascript
const verificarSaude = async (companyId) => {
  const checks = {
    caixaAberto: false,
    comandasAbertas: 0,
    pedidosPendentes: 0,
    errosRecentes: 0
  };
  
  // Verificar caixa
  const caixa = await CaixaService.getCaixaAberto(companyId);
  checks.caixaAberto = !!caixa;
  
  // Verificar comandas
  const comandas = await ComandasService.listarComandasAbertas(companyId);
  checks.comandasAbertas = comandas.length;
  
  // Verificar pedidos
  const pedidos = await getDocs(
    query(
      collection(db, `companies/${companyId}/pedidos`),
      where('dateKey', '==', getTodayKey()),
      where('status', '!=', 'delivered')
    )
  );
  checks.pedidosPendentes = pedidos.size;
  
  return checks;
};
```

---

## 7. Boas Práticas

### Commits
```bash
# Formato: tipo(escopo): mensagem

# Tipos:
feat: Nova funcionalidade
fix: Correção de bug
docs: Documentação
style: Formatação
refactor: Refatoração
test: Testes
chore: Manutenção

# Exemplos:
git commit -m "feat(pedidos): adicionar campo mesa"
git commit -m "fix(pagamentos): corrigir cálculo de troco"
git commit -m "docs: atualizar README"
```

### Code Review
- Verificar separação de responsabilidades
- Validar tratamento de erros
- Verificar performance (queries, renders)
- Validar segurança (validações, permissões)
- Verificar documentação inline

### Testes Manuais
- [ ] Criar pedido
- [ ] Atualizar status
- [ ] Registrar pagamento
- [ ] Fechar comanda
- [ ] Abrir/fechar caixa
- [ ] Imprimir comanda
- [ ] Testar offline

---

**Guia elaborado por:** Kiro AI  
**Última atualização:** 31/01/2026
