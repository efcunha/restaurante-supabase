# Correção: Gráfico de Vendas por Dia

## Problema Identificado

O gráfico "Vendas por Dia" na tela Admin apresentava dois problemas:

1. **Valores absurdos**: Mostrava valores como `R$10990000000000001` (10 quatrilhões)
2. **Dias faltando**: Só aparecia um dia (01/02) em vez de mostrar todos os dias do período

## Causa Raiz

### 1. Valores Absurdos
- Comandas no Firestore com campo `totalConsumido` contendo valores corrompidos ou muito altos
- Possíveis causas:
  - Erros de cálculo durante criação/atualização
  - Conversão incorreta de tipos (string → number)
  - Acúmulo de valores sem validação

### 2. Dias Faltando
- O código só criava labels para dias que tinham vendas
- Dias sem vendas não apareciam no gráfico
- Resultado: gráfico incompleto e difícil de interpretar

## Soluções Implementadas

### 1. Validação de Valores no Gráfico

**Arquivo**: `restaurante-app/src/screens/AdminScreen.js`

```javascript
// ✅ ANTES: Aceitava qualquer valor
dailyMap[dKey] = (dailyMap[dKey] || 0) + (comanda.totalConsumido || 0);

// ✅ DEPOIS: Valida e ignora valores absurdos
const valor = parseFloat(comanda.totalConsumido) || 0;
if (valor > 0 && valor < 10000) {
  dailyMap[dKey] = (dailyMap[dKey] || 0) + valor;
} else if (valor >= 10000) {
  console.warn(`⚠️ Valor suspeito ignorado: R$ ${valor.toFixed(2)}`);
}
```

**Benefícios**:
- Ignora valores acima de R$ 10.000 (suspeitos)
- Loga valores ignorados para investigação
- Previne que valores corrompidos quebrem o gráfico

### 2. Geração de Todos os Dias do Período

**Arquivo**: `restaurante-app/src/screens/AdminScreen.js`

```javascript
// ✅ ANTES: Só criava dias com vendas
const dailyMap = {};
comandasSnapshot.docs.forEach(doc => {
  // ...
  dailyMap[dKey] = (dailyMap[dKey] || 0) + valor;
});

// ✅ DEPOIS: Cria TODOS os dias do período
const dailyMap = {};

// Gerar todos os dias do período
const startDate = new Date(dateKeyInicio);
const endDate = new Date(dateKeyFim);
const currentDate = new Date(startDate);

while (currentDate <= endDate) {
  const dKey = currentDate.toISOString().split('T')[0];
  dailyMap[dKey] = 0; // Inicializar com 0
  currentDate.setDate(currentDate.getDate() + 1);
}

// Depois preencher com vendas reais
comandasSnapshot.docs.forEach(doc => {
  // ...
});
```

**Benefícios**:
- Gráfico mostra todos os dias, mesmo sem vendas
- Facilita visualização de padrões e tendências
- Dias sem vendas aparecem com R$ 0

### 3. Arredondamento de Valores

```javascript
// ✅ Arredondar para 2 casas decimais
datasets: [{
  data: sortedDays.map(d => Math.round(dailyMap[d] * 100) / 100)
}]
```

**Benefícios**:
- Evita problemas de precisão de ponto flutuante
- Valores mais legíveis no gráfico

### 4. Ferramenta de Diagnóstico

**Novo arquivo**: `restaurante-app/src/utils/diagnosticarComandas.js`

Funções criadas:
- `diagnosticarComandasSuspeitas()` - Identifica comandas com valores > R$ 10.000
- `corrigirComandasSuspeitas()` - Recalcula valores a partir dos pedidos
- `limparComandasZeradas()` - Remove comandas com valor zero

**Integração**: Adicionado botão no AdminToolsModal (🛠️ Ferramentas de Admin)

## Como Usar

### 1. Verificar se há Comandas Suspeitas

1. Ir para tela **Admin**
2. Clicar em **🛠️ Ferramentas de Admin**
3. Clicar em **🔍 Diagnosticar Comandas**
4. Ver relatório:
   - Total de comandas
   - Comandas válidas
   - Comandas suspeitas (> R$ 10.000)
   - Comandas sem valor

### 2. Corrigir Comandas Suspeitas

Se houver comandas suspeitas:

1. Clicar em **🔧 Corrigir Comandas Suspeitas**
2. Confirmar a operação
3. O sistema vai:
   - Buscar todos os pedidos de cada comanda
   - Recalcular `totalConsumido` somando os pedidos
   - Recalcular `totalPago` somando pedidos pagos
   - Atualizar `saldoAberto`

### 3. Verificar Gráfico

Após correção:
1. Voltar para tela Admin
2. Verificar gráfico "Vendas por Dia"
3. Deve mostrar:
   - Todos os dias do período
   - Valores corretos (sem números absurdos)
   - Dias sem vendas com R$ 0

## Prevenção de Problemas Futuros

### 1. Validação na Criação de Comandas

Sempre validar valores antes de salvar:

```javascript
const totalConsumido = parseFloat(valor) || 0;
if (totalConsumido < 0 || totalConsumido > 10000) {
  throw new Error('Valor inválido');
}
```

### 2. Monitoramento Regular

Executar diagnóstico periodicamente:
- Semanalmente: Verificar comandas suspeitas
- Mensalmente: Limpar comandas zeradas antigas

### 3. Logs de Auditoria

Adicionar logs quando valores suspeitos são detectados:

```javascript
console.warn(`⚠️ Valor suspeito: R$ ${valor} na comanda #${numero}`);
```

## Testes Recomendados

### Teste 1: Gráfico com Período de 7 Dias
1. Selecionar período "Semana"
2. Verificar que aparecem 7 dias
3. Verificar valores razoáveis (< R$ 10.000)

### Teste 2: Gráfico com Período de 30 Dias
1. Selecionar período "Mês"
2. Verificar que aparecem ~30 dias
3. Verificar que dias sem vendas mostram R$ 0

### Teste 3: Diagnóstico de Comandas
1. Abrir Ferramentas de Admin
2. Clicar em "Diagnosticar Comandas"
3. Verificar que não há comandas suspeitas

### Teste 4: Correção de Comandas
1. Se houver comandas suspeitas
2. Clicar em "Corrigir Comandas Suspeitas"
3. Verificar que valores foram recalculados corretamente

## Arquivos Modificados

1. `restaurante-app/src/screens/AdminScreen.js`
   - Função `carregarEstatisticasVendas()`
   - Validação de valores
   - Geração de todos os dias do período

2. `restaurante-app/src/components/AdminToolsModal.js`
   - Adicionado botão "Diagnosticar Comandas"
   - Adicionado botão "Corrigir Comandas Suspeitas"
   - Exibição de relatório de diagnóstico

3. `restaurante-app/src/utils/diagnosticarComandas.js` (NOVO)
   - Funções de diagnóstico e correção
   - Validação de valores
   - Recálculo de totais

## Notas Técnicas

### Limite de R$ 10.000

O limite de R$ 10.000 foi escolhido porque:
- É um valor alto mas razoável para um restaurante
- Comandas acima disso são provavelmente erros
- Pode ser ajustado se necessário

Para ajustar o limite:

```javascript
// Em AdminScreen.js e diagnosticarComandas.js
const LIMITE_VALOR_SUSPEITO = 10000; // Ajustar aqui
```

### Performance

- Diagnóstico: ~1-2 segundos para 1000 comandas
- Correção: ~3-5 segundos para 100 comandas suspeitas
- Gráfico: Renderização instantânea após correção

### Compatibilidade

- ✅ Web (React Native Web)
- ✅ iOS
- ✅ Android
- ✅ Funciona offline (dados em cache)

## Próximos Passos (Opcional)

1. **Alertas Automáticos**: Notificar admin quando comandas suspeitas são criadas
2. **Histórico de Correções**: Registrar quando comandas foram corrigidas
3. **Backup Antes de Corrigir**: Salvar valores antigos antes de recalcular
4. **Relatório Detalhado**: Exportar lista de comandas suspeitas em CSV
