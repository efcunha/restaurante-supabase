---
name: react-native-best-practices
description: Local minimal skill for RN performance, rendering, memory, and bundle optimization in restaurante-supabase. Based on operational learnings and critical path patterns.
---

# Skill: React Native Best Practices (Local Minimal)

## Objetivo
Guiar otimizacoes de performance em React Native/Expo com foco em:
- Reducao de renders desnecessarios
- Otimizacao de listas grandes
- Eficiencia de memoria e bundle
- Estabilidade de telas criticas (NovoPedido, ComandaGerenciamento, RotasDelivery, Cozinha, Montagem)

## Princípios Operacionais (baseados em incidents)
1. **Medir antes de otimizar** — use profiling (DevTools, Hermes) antes de aplicar memoization.
2. **Menor mudança segura** — avoid behavioral changes; focus on rendering efficiency.
3. **Parity app/web** — changes in restaurante-app often need mirroring to restaurante-web.
4. **Feature flag rollout** — wrap performance changes under feature flags when possible.

## Padrões de Otimização

### Listas e FlatList
- Para listas com 100+ items, considere `FlashList` ou virtualizacao customizada.
- Use `keyExtractor` consistente; evite index-based keys.
- Aplique `removeClippedSubViews={true}` em listas longas.
- Memoize item renderers com `React.memo` quando necessario.

**Exemplo (CozinhaScreen)**:
```typescript
const KitchenItem = React.memo(({ item, onPress }) => (
  <TouchableOpacity onPress={() => onPress(item.id)}>
    <Text>{item.name}</Text>
  </TouchableOpacity>
));

<FlatList
  data={items}
  renderItem={({ item }) => <KitchenItem item={item} onPress={handlePress} />}
  keyExtractor={(item) => item.id}
  removeClippedSubViews={true}
/>
```

### useMemo para Derivados Pesados
- Use `useMemo` apenas para operacoes custosas (sort, filter, map complexas).
- Nao memorizar objetos literais ou spread operators leves.

**Padrão (CozinhaScreen, MontagemScreen)**:
```typescript
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.priority - b.priority);
}, [items]);

const groupedByCategory = useMemo(() => {
  const groups = {};
  items.forEach(item => {
    groups[item.category] ??= [];
    groups[item.category].push(item);
  });
  return groups;
}, [items]);
```

### Queries Paralelas com Promise.all
- Quando telas dependem de multiplas queries independentes, paralelizar.
- Mantem latencia baixa sem aumentar complexity.

**Padrão (NovoPedidoScreen)**:
```typescript
useEffect(() => {
  const loadData = async () => {
    const [cardapio, adicionais, mesa] = await Promise.all([
      fetchCardapio(company_id),
      fetchAdicionais(company_id),
      fetchMesaInfo(company_id, mesa_number)
    ]);
    setCardapio(cardapio);
    setAdicionais(adicionais);
    setMesa(mesa);
  };
  loadData();
}, [company_id, mesa_number]);
```

### Categoria Chips (NovoPedidoScreen)
- Use offset medido por secao em vez de scroll absoluto.
- Fallback robusto em `onScrollToIndexFailed`.
- Evite re-renders de FlatList vazia.

**Padrão**:
```typescript
const scrollToCategory = (index: number) => {
  flatListRef.current?.scrollToIndex({
    index,
    viewPosition: 0.5,
    animated: true
  });
};

const onScrollToIndexFailed = (info) => {
  flatListRef.current?.scrollToEnd();
};
```

## Performance Critica (Fluxos)

### NovoPedidoScreen
- Renderiza cardapio com chips de categoria.
- Padroes: paralelizar queries, memoize derivados, scroll com offset.
- Meta: <200ms TTI (time-to-interactive).

### CozinhaScreen
- FlatList de pedidos em preparo, agrupados por prioridade.
- Padroes: useMemo para ordenacao, React.memo para items, removeClippedSubViews.
- Meta: 60fps ao scrollar; <100ms update quando pedido passa para "pronto".

### MontagemScreen
- Similar a CozinhaScreen; itens de montagem/separacao.
- Padroes: idênticas ao Cozinha; validar com profiler.

### RotasDeliveryScreen
- Mapa + lista de rotas; low-latency location updates.
- Padroes: Realtime listeners em background thread; cuidado com re-renders de mapa.

### ComandaGerenciamentoScreen
- Grid/table de comandas abertas; busca e filtro.
- Padroes: debounce busca, memoize filtrados, virtualizacao.

## Anti-Padrões
- ❌ Usar `useCallback` para toda funcao (overhead sem beneficio).
- ❌ Renomear componentes a cada render (quebra memoization).
- ❌ Query inline em render; use `useEffect` + estado.
- ❌ Ignorar console warnings de React (oft-sign of leak).

## Validacao
```bash
# Profiling local (Hermes)
npm run android -- --dev
# No device: Menu > Profiler > Record JS performance

# Bundle size check
npx react-native-bunlder-analyzer
# or light check: npm run analyze:bundle

# E2E validacao critica
cd restaurante-app
maestro test .maestro/balcao.yaml --udid emulator-5554 \
  -e PLAYWRIGHT_TEST_EMAIL=<email> -e PLAYWRIGHT_TEST_PASSWORD=<senha>
```

## Status no Projeto (Mar/2026)
- `CozinhaScreen` + `MontagemScreen`: `useMemo` para derivados aplicado; validar com profiler.
- `NovoPedidoScreen`: categoria chips estable com offset + fallback.
- `useComandaManagement`: paralelizar queries com `Promise.all` aplicado.
- Busca de cardapio: remove diacriticos (`normalize('NFD')`) habilitado.

## Checklist Antes de Merge
1. Rodou profiler localmente e viu reducao de renders?
2. TTI / FPS targets atingidos?
3. Comportamento do app/web inalterado?
4. Feature flag em lugar (se rollout gradual necessario)?
5. E2E critico passou?
