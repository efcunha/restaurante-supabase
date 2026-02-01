# Solução: Filtrar Comandas Canceladas de Cozinha/Montagem

## Problema
Quando uma comanda era cancelada, seus pedidos/itens continuavam aparecendo nas telas de Cozinha e Montagem, mesmo após o cancelamento.

## Causa Raiz
1. O status da comanda era corretamente definido como 'cancelada' no Firestore
2. Porém, os pedidos individuais não tinham nenhuma marcação de que pertenciam a uma comanda cancelada
3. As telas de Cozinha e Montagem filtravam apenas por `status: 'montagem'`, sem verificar o status da comanda

## Tentativa Anterior (REVERTIDA)
A primeira tentativa adicionou listeners em tempo real para a coleção `comandas` nas telas de Cozinha e Montagem. Isso causou:
- **Crashes frequentes** - o app voltava para a tela de login
- **Problemas de performance** - múltiplos listeners simultâneos
- **Instabilidade geral** - o app ficava inutilizável

## Solução Implementada (SEGURA)

### 1. Marcar Pedidos ao Cancelar Comanda
**Arquivo**: `restaurante-app/src/screens/ComandaGerenciamentoScreen.js`

Quando uma comanda é cancelada, agora marcamos TODOS os pedidos associados com um campo `comandaStatus: 'cancelada'`:

```javascript
// Ao cancelar comanda, marcar todos os pedidos
if (selectedComanda.pedidos && selectedComanda.pedidos.length > 0) {
  const updatePromises = selectedComanda.pedidos.map(async (pedido) => {
    const pedidoRef = getCompanyDoc(user.companyId, 'pedidos', pedido.id);
    await updateDoc(pedidoRef, {
      comandaStatus: 'cancelada',
      canceladoEm: new Date().toISOString(),
      canceladoPor: user?.nome || 'Admin'
    });
  });
  await Promise.all(updatePromises);
}
```

### 2. Filtrar Pedidos nas Telas de Cozinha e Montagem
**Arquivos**: 
- `restaurante-app/src/screens/CozinhaScreen.js`
- `restaurante-app/src/screens/MontagemScreen.js`

Adicionamos um filtro simples que verifica o campo `comandaStatus` do pedido:

```javascript
const ordersRaw = allOrders.filter(order => {
  // Filtrar apenas pedidos em montagem
  if (order.status !== 'montagem') return false;
  
  // ✅ PROTEÇÃO: Se o pedido tem comandaStatus='cancelada', não mostrar
  if (order.comandaStatus === 'cancelada') {
    console.log('[Cozinha/Montagem] 🚫 Pedido filtrado (comanda cancelada):', order.id);
    return false;
  }
  
  return true;
});
```

### 3. Proteções Adicionais

#### A. ComandasService - Impedir Fechamento de Comanda Cancelada
**Arquivo**: `restaurante-app/src/services/ComandasService.js`

```javascript
// Não permitir fechar comanda cancelada
if (data.status === 'cancelada') {
  throw new Error('Não é possível fechar uma comanda cancelada');
}
```

#### B. ComandaGerenciamentoScreen - Impedir Pagamento em Comanda Cancelada
**Arquivo**: `restaurante-app/src/screens/ComandaGerenciamentoScreen.js`

```javascript
// Não permitir pagamento em comanda cancelada
if (comanda.status === 'cancelada') {
  Alert.alert('Operação Bloqueada', 'Esta comanda está CANCELADA e não pode receber pagamentos.');
  return;
}
```

#### C. AdminScreen - Preservar Status Cancelada na Migração
**Arquivo**: `restaurante-app/src/screens/AdminScreen.js`

```javascript
// Não sobrescrever status 'cancelada' durante migração
if (existing.status === 'cancelada') {
  delete comandaData.status;
}
```

## Vantagens da Solução

✅ **Sem novos listeners** - Não adiciona carga extra ao Firestore
✅ **Filtro local simples** - Usa dados já carregados
✅ **Sem crashes** - Não causa instabilidade no app
✅ **Performance mantida** - Não impacta velocidade
✅ **Proteções múltiplas** - Impede operações inválidas em comandas canceladas

## Como Testar

1. **Criar uma comanda** com pedidos
2. **Verificar** que os pedidos aparecem em Cozinha/Montagem
3. **Cancelar a comanda** (com motivo)
4. **Verificar** que os pedidos DESAPARECEM de Cozinha/Montagem
5. **Tentar pagar** a comanda cancelada → deve bloquear
6. **Verificar no Firestore** que os pedidos têm `comandaStatus: 'cancelada'`

## Comandas Antigas (Já Canceladas)

Para comandas que foram canceladas ANTES desta atualização:
- Os pedidos antigos NÃO terão o campo `comandaStatus`
- Eles continuarão aparecendo em Cozinha/Montagem
- **Solução**: Use a ferramenta "Admin Tools" para limpar pedidos antigos ou cancele novamente as comandas

## Próximos Passos (Opcional)

Se necessário, podemos criar uma migração para:
1. Buscar todas as comandas com `status: 'cancelada'`
2. Marcar todos os pedidos associados com `comandaStatus: 'cancelada'`
3. Limpar pedidos antigos de comandas canceladas

Mas isso só é necessário se houver muitos pedidos antigos causando problemas.
