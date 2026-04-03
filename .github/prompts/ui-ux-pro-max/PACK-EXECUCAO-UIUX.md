# Pack de Execucao UI/UX - Time Restaurante

Este pack padroniza como Produto, Design e Dev usam o workflow UI/UX Pro Max no dia a dia.

## 1) Prompts por papel

### Produto

Objetivo: validar impacto de negocio, risco e criterio de sucesso.

```text
#file:D:\restaurante-supabase\.github\agent-skills\skills\restaurante-supabase\SKILL.md
#file:.github/skills/ui-ux-pro-max/PROMPT.md
#file:<arquivo-da-tela>

/ui-ux-pro-max proponha melhoria incremental nesta tela para aumentar <metrica>, mantendo comportamento atual. Entregue: problema atual, proposta, impacto esperado, risco e criterio de aceite.
```

### Design

Objetivo: direcao visual e interacao com consistencia do design system.

```text
#file:D:\restaurante-supabase\.github\agent-skills\skills\restaurante-supabase\SKILL.md
#file:.github/skills/ui-ux-pro-max/PROMPT.md
#file:docs/design-system/<pacote>/MASTER.md
#file:docs/design-system/<pacote>/pages/<tela>.md
#file:<arquivo-da-tela>

/ui-ux-pro-max aplique os tokens e regras do master/override nesta tela. Entregue: estrutura visual, hierarquia, estados (default/hover/focus/error/loading) e notas de acessibilidade.
```

### Dev

Objetivo: plano tecnico executavel sem regressao funcional.

```text
#file:D:\restaurante-supabase\.github\agent-skills\skills\restaurante-supabase\SKILL.md
#file:.github/skills/ui-ux-pro-max/PROMPT.md
#file:docs/design-system/<pacote>/MASTER.md
#file:docs/design-system/<pacote>/pages/<tela>.md
#file:<arquivo-da-tela>

/ui-ux-pro-max gere plano de implementacao incremental para esta tela com: diff por componente, risco de regressao, estrategia de testes e criterios objetivos para pronto.
```

## 2) Checklist de aprovacao por tela

Use este checklist em review tecnico e review de produto.

- [ ] Fluxo principal pode ser concluido sem passos desnecessarios.
- [ ] CTA principal visivel e consistente em todos os estados.
- [ ] Estados obrigatorios cobertos: loading, vazio, erro, sucesso, indisponivel.
- [ ] Contraste minimo AA em textos e controles.
- [ ] Focus visivel e navegacao por teclado no web.
- [ ] Alvos de toque >= 44px em app/mobile.
- [ ] Sem regressao de regras de negocio (pedido, pagamento, totais, validacoes).
- [ ] Sem quebrar layout em 375, 768, 1024 e 1440.
- [ ] Sem emoji como icone; usar SVG consistente.
- [ ] Testes da area atualizados (unitarios/e2e quando aplicavel).

## 3) Template de PR (UI/UX)

Copie e use no corpo do PR.

Exemplo preenchido (DeliveryScreen): `.github/skills/ui-ux-pro-max/EXEMPLO-PR-DELIVERYSCREEN.md`
Exemplo preenchido (NovoPedidoScreen): `.github/skills/ui-ux-pro-max/EXEMPLO-PR-NOVOPEDIDO.md`
Exemplo preenchido (AdminScreen Web): `.github/skills/ui-ux-pro-max/EXEMPLO-PR-ADMINSCREEN-WEB.md`

```md
## Contexto
- Tela: <nome-da-tela>
- Objetivo de negocio: <metrica ou problema>
- Escopo: <o que muda / o que nao muda>

## Referencias de design
- Master: docs/design-system/<pacote>/MASTER.md
- Override: docs/design-system/<pacote>/pages/<tela>.md

## Mudancas visuais e de UX
1. <mudanca 1>
2. <mudanca 2>
3. <mudanca 3>

## Risco e regressao
- Risco funcional: <baixo/medio/alto>
- Pontos sensiveis: <pedido, pagamento, estoque, etc>
- Mitigacao: <testes + validacoes>

## Evidencias
- Antes/depois: <links ou imagens>
- Video curto do fluxo: <link>

## Testes
- [ ] Teste manual desktop
- [ ] Teste manual mobile
- [ ] Testes automatizados executados
- [ ] Sem erros novos de lint/typecheck

## Checklist final
- [ ] Segue MASTER + override
- [ ] Acessibilidade validada
- [ ] Responsividade validada
- [ ] Sem quebra de fluxo critico
```

## 4) Comandos uteis

Gerar recomendacao rapida:

```bash
python .github/skills/ui-ux-pro-max/scripts/search.py "<contexto-da-tela>" --design-system -p "<nome-do-pacote>" --format markdown
```

Gerar master + override:

```bash
python .github/skills/ui-ux-pro-max/scripts/search.py "<contexto-da-tela>" --design-system --persist --page "<slug-da-tela>" -p "<nome-do-pacote>"
```
