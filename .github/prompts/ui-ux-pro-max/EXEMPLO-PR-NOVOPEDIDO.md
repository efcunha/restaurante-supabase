## Contexto
- Tela: NovoPedidoScreen (restaurante-app)
- Objetivo de negocio: reduzir tempo de montagem de pedido e erro operacional no balcao
- Escopo: melhorias incrementais de UX no fluxo de selecao de itens, edicao de quantidade e avancar para pagamento
- Fora de escopo: alteracoes de regras de preco/fiscal e integracoes externas

## Referencias de design
- Master: docs/design-system/restaurante-app-novo-pedido/MASTER.md
- Override: docs/design-system/restaurante-app-novo-pedido/pages/novo-pedido-screen.md

## Mudancas visuais e de UX
1. Reorganizacao mobile-first para manter contexto do pedido e reduzir trocas de foco.
2. Barra inferior do carrinho sempre visivel com quantidade, total e CTA de continuidade.
3. Ajuste de cards/lista de produto para acao primaria explicita (adicionar) e alvo de toque >= 44px.
4. Feedback imediato para adicionar/remover item e editar quantidade.
5. Melhorias de legibilidade: preco/quantidade em destaque e observacoes sem competir com acoes principais.

## Risco e regressao
- Risco funcional: medio
- Pontos sensiveis:
  - calculo de total por item e total geral
  - consistencia de quantidade apos edicao rapida
  - transicao para pagamento sem perda de estado
- Mitigacao:
  - smoke manual completo do fluxo de novo pedido
  - validacao de total com combinacoes de itens/extras
  - teste em dispositivos com diferentes resolucoes

## Evidencias
- Antes/depois: anexar capturas de
  - lista de produtos
  - itens selecionados
  - barra inferior do carrinho
  - estado de erro/indisponibilidade
- Video curto do fluxo: anexar gravacao de 30-60s no app (pedido rapido)

## Testes
- [ ] Teste manual em 360x800 e 390x844
- [ ] Teste manual em tablet (quando aplicavel)
- [ ] Fluxo completo: identificar pedido > adicionar itens > editar quantidade > avancar para pagamento
- [ ] Validacao de total/quantidade apos edicoes sequenciais
- [ ] Testes automatizados executados (quando aplicavel)
- [ ] Sem erros novos de lint/typecheck

## Checklist final
- [ ] Segue MASTER + override
- [ ] Acessibilidade validada
- [ ] Responsividade validada
- [ ] Sem quebra de fluxo critico
- [ ] CTA de continuidade sempre acessivel
- [ ] Feedback de acao imediato (add/remove/update)
