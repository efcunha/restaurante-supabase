## Contexto
- Tela: DeliveryScreen (restaurante-web)
- Objetivo de negocio: reduzir abandono no checkout delivery e diminuir tempo ate confirmacao
- Escopo: melhorias incrementais de UX/UI no fluxo de endereco, pagamento e resumo final
- Fora de escopo: alteracoes de regra fiscal, logica de precificacao e integracoes externas

## Referencias de design
- Master: docs/design-system/restaurante-web-delivery/MASTER.md
- Override: docs/design-system/restaurante-web-delivery/pages/delivery-screen.md

## Mudancas visuais e de UX
1. Estruturacao do checkout em 2 colunas no desktop (formulario + resumo persistente) e 1 coluna no mobile com resumo colapsavel no rodape.
2. Reforco de hierarquia visual em campos criticos (endereco e pagamento), com mensagens de erro proximas ao campo.
3. Resumo com recalculo em tempo real (subtotal, taxa, desconto, total) e CTA principal sempre acessivel.
4. Padronizacao dos estados operacionais: endereco invalido, taxa calculada, pagamento pendente e entrega estimada.
5. Ajustes de toque/foco para acessibilidade e navegacao por teclado no web.

## Risco e regressao
- Risco funcional: medio
- Pontos sensiveis:
  - validacao de endereco
  - recalculo de taxa/desconto/total
  - selecao de forma de pagamento
  - consistencia do CTA final em mobile/desktop
- Mitigacao:
  - smoke manual completo do fluxo de delivery
  - validacao de totais com cenarios de cupom e taxa
  - revisao de acessibilidade (focus/contraste)
  - execucao dos testes E2E da area

## Evidencias
- Antes/depois: anexar capturas de
  - formulario de endereco
  - bloco de pagamento
  - resumo com total
  - estado de erro e estado de sucesso
- Video curto do fluxo: anexar gravacao de 30-60s (desktop e mobile)

## Testes
- [ ] Teste manual desktop
- [ ] Teste manual mobile
- [ ] Fluxo completo: cliente > endereco > pagamento > confirmacao
- [ ] Validacao de cupom/taxa/total
- [ ] Testes automatizados executados
- [ ] Sem erros novos de lint/typecheck

## Checklist final
- [ ] Segue MASTER + override
- [ ] Acessibilidade validada
- [ ] Responsividade validada
- [ ] Sem quebra de fluxo critico
- [ ] CTA principal sempre visivel
- [ ] Mensagens de erro acionaveis e contextualizadas
