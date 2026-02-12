# Performance Baseline - NovoPedidoScreen

## Data da Medição
${new Date().toISOString()}

## Configuração Atual do SectionList

```typescript
{
  initialNumToRender: 12,
  windowSize: 5,
  maxToRenderPerBatch: 10,
  updateCellsBatchingPeriod: 50,
  removeClippedSubviews: Platform.OS === 'android'
}
```

## Problemas Identificados

### 1. Configurações de Virtualização Não Otimizadas
- `initialNumToRender: 12` - Muito alto, renderiza muitos itens inicialmente
- `windowSize: 5` - Mantém muitos itens fora da viewport
- `maxToRenderPerBatch: 10` - Renderiza muitos itens por lote
- `updateCellsBatchingPeriod: 50ms` - Muito rápido, causa muitas atualizações

### 2. LayoutAnimation em Todas as Atualizações
- `LayoutAnimation.configureNext()` é chamado em TODA atualização de produto
- Causa overhead significativo durante scroll
- Não há detecção de scroll para desabilitar animações

### 3. Falta de getItemLayout
- SectionList não implementa `getItemLayout`
- React Native precisa medir cada item dinamicamente
- Causa cálculos pesados durante scroll

### 4. Componentes Sem Memoização Adequada
- Callbacks inline em vários lugares
- Re-renderizações desnecessárias de componentes filhos
- `keyExtractor` pode não ser estável

## Métricas Esperadas (Baseline)

Com base na análise do código, esperamos:

- **Renderização Inicial**: ~500ms
- **FPS Durante Scroll**: ~45 FPS
- **Frame Drops ao Final da Lista**: ~10 frames
- **Travamentos**: Perceptíveis ao chegar no final da lista

## Como Medir

1. Abra o aplicativo no dispositivo
2. Navegue para a tela de Novo Pedido
3. Faça scroll pela lista de itens
4. Observe os logs no console com tag `[Performance]`
5. Preste atenção especial ao scroll até o final da lista

## Próximos Passos

1. ✅ Instrumentação implementada
2. ⏳ Coletar métricas reais em dispositivo
3. ⏳ Aplicar otimizações
4. ⏳ Comparar métricas pós-otimização

## Notas

- A instrumentação foi adicionada usando `usePerformanceMonitor` hook
- Métricas são logadas automaticamente durante scroll
- Use um dispositivo real para medições precisas (emulador pode não refletir performance real)
