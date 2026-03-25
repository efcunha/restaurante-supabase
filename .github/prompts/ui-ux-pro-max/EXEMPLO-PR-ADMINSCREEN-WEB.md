## Contexto
- Tela: AdminScreen (restaurante-web)
- Objetivo de negocio: reduzir tempo para acessar acoes administrativas criticas e diminuir retrabalho operacional
- Escopo: melhorias incrementais de hierarquia de secoes, clareza de atalhos e estados de carregamento/erro
- Fora de escopo: mudanca de permissoes, regras de negocio de caixa/estoque e integracoes externas

## Referencias de design
- Master: docs/design-system/restaurante-web-admin/MASTER.md
- Override: docs/design-system/restaurante-web-admin/pages/admin-screen.md

## Mudancas visuais e de UX
1. Reorganizacao da home admin por blocos de prioridade operacional (alta frequencia primeiro).
2. Padronizacao de cards de acao com rotulo claro, descricao curta e estado visual consistente.
3. Inclusao de feedback de loading/erro/vazio por secao para evitar clique cego.
4. Melhorias de navegacao: foco visivel, ordem de tab previsivel e atalhos com semantica consistente.
5. Ajuste de responsividade para manter scaneabilidade em 1024+ e usabilidade em 768.

## Risco e regressao
- Risco funcional: medio
- Pontos sensiveis:
  - roteamento para telas administrativas
  - exibicao condicional por contexto/perfil
  - consistencia visual entre secoes com dados assincronos
- Mitigacao:
  - smoke manual de todos os atalhos principais
  - validacao de estados de erro e carregamento por secao
  - revisao de acessibilidade em navegacao por teclado

## Evidencias
- Antes/depois: anexar capturas de
  - visao inicial do admin
  - cards prioritarios
  - estados de loading/erro
  - layout desktop e tablet
- Video curto do fluxo: anexar gravacao de 30-60s (atalho para tarefas principais)

## Testes
- [ ] Teste manual desktop (1024/1366/1440)
- [ ] Teste manual tablet (768)
- [ ] Fluxo completo de atalhos criticos (ex.: caixa, pedidos, estoque)
- [ ] Validacao de estado loading/erro/vazio por secao
- [ ] Testes automatizados executados (quando aplicavel)
- [ ] Sem erros novos de lint/typecheck

## Checklist final
- [ ] Segue MASTER + override
- [ ] Acessibilidade validada
- [ ] Responsividade validada
- [ ] Sem quebra de fluxo critico
- [ ] Cards de acao com hierarquia clara
- [ ] Feedback de estado consistente em toda a tela
