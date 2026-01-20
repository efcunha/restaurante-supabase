# TODO.md - Sistema de Comandas para Restaurante

**Última atualização:** 19/01/2026 13:05  
**Status do Projeto:** ✅ Operacional + Sistema Completo v2.1

---

## ✅ CONCLUÍDO

### Sistema de Cancelamento (v2.1) - 19/01/2026
- [x] Adicionar status 'cancelada' para comandas no Firestore
- [x] Criar função `cancelarComanda()` com Alert.prompt para motivo
- [x] Registrar quem cancelou (ID e nome do usuário)
- [x] Registrar horário do cancelamento (ISO timestamp)
- [x] Registrar motivo do cancelamento (texto livre)
- [x] Adicionar state `comandasCanceladas` (linha 98)
- [x] Adicionar aba "CANCELADAS" na tela de comandas (linhas 1786-1806)
- [x] Criar visualização de comandas canceladas (linhas 1930-1975)
- [x] Adicionar botão "✗ CANCELAR COMANDA" vermelho (linhas 1500-1510)
- [x] Atualizar contador de comandas no header (incluir canceladas)
- [x] Tratar status 'cancelada' no carregamento (linhas 473-479)
- [x] Filtrar e separar comandas canceladas (linhas 697-709)
- [x] Criar script `ver-canceladas.js` para visualização
- [x] Criar script `testar-cancelamento.js` para testes
- [x] Criar documentação completa em CANCELAMENTO.md
- [x] Atualizar CONTEXT.md com fluxo de cancelamento
- [x] Atualizar TODO.md com todas as tarefas

### Cálculo Dinâmico de Preços (v2.0.6) - 19/01/2026
- [x] Criar função `calculateTotalFromFirestore()` (OrderContext.firestore.js, linhas 10-47)
- [x] Buscar todos os itens do cardápio do Firestore uma vez por pedido
- [x] Reconhecer sufixos de tamanho: "300ml" → R$ 15,00, "180ml" → R$ 10,00
- [x] Remover sufixo de tempero antes de buscar preço: `item.replace(/\s*\(.*\)$/, '')`
- [x] Integrar na criação de pedidos (linha 200)
- [x] Testar com caldos, risotos e bebidas
- [x] Validar cálculo correto com múltiplas quantidades

### Seleção de Tamanho para Caldos (v2.0.5) - 19/01/2026
- [x] Modificar seção de caldos em NovoPedidoScreen.js
- [x] Adicionar header "📏 300ml - R$ 15,00" (linha 327)
- [x] Criar 3 botões de tempero para 300ml (linhas 329-439)
- [x] Adicionar header "📏 180ml - R$ 10,00" (linha 444)
- [x] Criar 3 botões de tempero para 180ml (linhas 446-552)
- [x] Formato de item: "Caldinho de Macaxeira 300ml (Cebolinha)"
- [x] Criar script `adicionar-caldos-tamanhos.js`
- [x] Popular Firestore com 6 caldos (3 tipos × 2 tamanhos)
- [x] Desativar caldos antigos sem tamanho

### Temperos para Risotos (v2.0.5) - 19/01/2026
- [x] Adicionar seleção de tempero na seção comidas (linhas 557-677)
- [x] 3 opções: Cebolinha e Coentro, Cebolinha, Sem Nada
- [x] Botões coloridos: Laranja (#FF9800), Verde (#4CAF50), Cinza (#999)
- [x] Formato de item: "Risoto de Camarão (Cebolinha e Coentro)"
- [x] Contadores independentes por tempero

### Display de Forma de Pagamento (v2.0.5) - 19/01/2026
- [x] Adicionar state `pagamentosComanda` (ComandaGerenciamentoScreen.js, linha 103)
- [x] Criar função `loadPagamentosComanda()` (linhas 73-91)
- [x] Integrar carregamento em `selecionarComanda()` (linhas 750-769)
- [x] Adicionar seção de pagamentos na UI (linhas 1262-1270)
- [x] Criar estilos `pagamentosContainer` e `pagamentoItem` (linhas 2074-2080)
- [x] Formato: "💳 PIX - R$ 30.00" + "Recebido por: Administrador"
- [x] Verificar campo `forma` salvo no PagamentosService.js (linha 158)

### UI de Bebidas Otimizada (v2.0.5) - 19/01/2026
- [x] Reorganizar layout para horizontal: Nome → Valor → Quantidade
- [x] Remover layout vertical antigo
- [x] Usar flexDirection: 'row' com justifyContent: 'space-between'
- [x] Botões: 36x36px (reduzidos de 40x40)
- [x] Fonte dos botões: 18 (reduzida de 20)
- [x] Espaçamento: marginBottom: 12
- [x] Background branco com padding e borderRadius

### Visibilidade de Produtos (v2.0.5) - 19/01/2026
- [x] Criar estilo `produtoName`: fontSize 16, fontWeight 700, color #2C2C2C
- [x] Criar estilo `produtoPrice`: fontSize 15, fontWeight 600, color #8B2F2F
- [x] Aplicar em caldos (linhas 327-328)
- [x] Aplicar em comidas (seção risotos)
- [x] Aplicar em bebidas (layout horizontal)
- [x] Testar visibilidade em diferentes dispositivos

### Scripts Utilitários (v2.0.5) - 19/01/2026
- [x] Criar `limpar-hoje.js` - Limpa comandas, pedidos, pagamentos do dia
- [x] Criar `ver-tudo.js` - Mostra todas as comandas e pedidos
- [x] Criar `ver-pagamentos-detalhado.js` - Lista pagamentos por comanda
- [x] Criar `ver-canceladas.js` - Lista comandas canceladas
- [x] Criar `testar-cancelamento.js` - Verifica comandas para teste
- [x] Criar `adicionar-caldos-tamanhos.js` - Popula caldos com tamanhos
- [x] Testar todos os scripts
- [x] Documentar uso no CONTEXT.md

### Build Android (v2.0.1)
- [x] Criar script build-android.sh automatizado
- [x] Configurar assinatura de APKs
- [x] Aumentar memória do Gradle (4GB + 1GB Metaspace)
- [x] Gerar APKs ARM64 e ARMv7
- [x] Copiar APKs para pasta build/
- [x] Criar documentação de instalação (INSTALACAO_APK.md)
- [x] Atualizar CONTEXT.md e TODO.md

### Migração para Caldos (v2.0)
- [x] Remover sistema de espetinhos
- [x] Remover pontos de cocção (mal/ao/bem passado)
- [x] Remover variações de preparo (Simples/Completo/Arroz/Macaxeira)
- [x] Criar categoria "caldos"
- [x] Criar categoria "comidas" (risotos + batata frita)
- [x] Simplificar modelo de preços (preço único)
- [x] Renomear ChurrasqueiraScreen → CozinhaScreen
- [x] Atualizar roles: churrasqueiro → cozinheiro
- [x] Atualizar status: churrasqueira → cozinha
- [x] Reescrever NovoPedidoScreen (sem variações)
- [x] Simplificar ComandaGerenciamentoScreen
- [x] Atualizar GerenciarCardapioScreen
- [x] Criar script de inicialização limpa
- [x] Criar script de testes automatizados
- [x] Documentar mudanças (CONTEXT.md, CARDAPIO_COMPLETO.md)

### Firebase
- [x] Configurar projeto restaurante-6f221
- [x] Habilitar Firestore
- [x] Habilitar Authentication
- [x] Popular cardápio inicial (3 caldos, 5 comidas, 5 bebidas)
- [x] Criar usuário admin

### Testes
- [x] Teste de cardápio (caldos, comidas, bebidas)
- [x] Teste de criação de pedidos
- [x] Teste de usuário admin
- [x] Teste de estrutura de dados
- [x] Script automatizado (6 testes)

---

## 📜 HISTÓRICO DE DESENVOLVIMENTO

### Sessão 19/01/2026 (13h00-13h05)
**Foco:** Sistema de Cancelamento + Documentação Completa

**Arquivos Modificados:**
- `ComandaGerenciamentoScreen.js` - 8 modificações (estados, função, UI, filtros)
- `CONTEXT.md` - Atualização completa com implementações técnicas
- `TODO.md` - Registro detalhado de todas as tarefas
- `CANCELAMENTO.md` - Documentação nova e completa

**Linhas de Código Adicionadas:** ~200
**Scripts Criados:** 2 (ver-canceladas.js, testar-cancelamento.js)

### Sessão 19/01/2026 (12h47-12h59)
**Foco:** Layout de Bebidas + Preparação para Cancelamento

**Arquivos Modificados:**
- `NovoPedidoScreen.js` - Layout horizontal de bebidas

**Mudanças:** Reorganização completa do layout de bebidas

### Sessão Anterior (15-19/01/2026)
**Foco:** Preços Dinâmicos + Tamanhos + Temperos + Pagamentos

**Arquivos Modificados:**
- `OrderContext.firestore.js` - Cálculo dinâmico
- `NovoPedidoScreen.js` - Caldos com tamanhos e temperos
- `ComandaGerenciamentoScreen.js` - Display de pagamentos
- `PagamentosService.js` - Registro de forma

**Scripts Criados:** 4 (limpar-hoje, ver-tudo, ver-pagamentos, adicionar-caldos)
**Linhas de Código Adicionadas:** ~500

---

## 🚀 MELHORIAS FUTURAS (Opcional)

### Funcionalidades
- [ ] Relatórios de vendas por período
- [ ] Gráficos de produtos mais vendidos
- [ ] Histórico de comandas fechadas e canceladas
- [ ] Impressão de comandas (integração com impressora térmica)
- [ ] Notificações push para cozinha
- [ ] Sistema de mesas (além de comandas)
- [ ] Controle de estoque básico
- [ ] Tempo médio de preparo por produto
- [ ] Reabrir comandas canceladas (com justificativa)
- [ ] Exportar relatório de cancelamentos

### UX/UI
- [ ] Modo escuro
- [ ] Animações de transição
- [ ] Feedback visual melhorado
- [ ] Sons de notificação
- [ ] Tutorial de primeiro uso
- [ ] Atalhos de teclado para garçons
- [ ] Confirmação visual ao cancelar comanda

### Técnico
- [ ] Testes unitários (Jest)
- [ ] Testes E2E (Detox)
- [ ] CI/CD pipeline
- [ ] Versionamento semântico
- [ ] Logs estruturados
- [ ] Monitoramento de erros (Sentry)
- [ ] Backup automático de comandas canceladas

---

## 📁 ARQUIVOS CRÍTICOS E SUAS FUNÇÕES

### Contexto e Gerenciamento de Estado
**OrderContext.firestore.js** (~/context/)
- Linhas 10-47: `calculateTotalFromFirestore()` - Busca preços do Firestore
- Linha 28: Remove temperos antes de buscar preço
- Linhas 30-37: Detecta tamanhos (300ml/180ml)
- Linha 200: Integração no fluxo de criação de pedidos

### Telas Principais
**NovoPedidoScreen.js** (~/screens/)
- Linhas 320-441: Caldos 300ml com 3 temperos
- Linhas 442-552: Caldos 180ml com 3 temperos
- Linhas 557-677: Risotos com 3 temperos
- Linhas 680-710: Bebidas (layout horizontal otimizado)
- Linhas 850-870: Estilos de produtos (produtoName, produtoPrice)

**ComandaGerenciamentoScreen.js** (~/screens/)
- Linha 98: State `comandasCanceladas`
- Linha 103: State `pagamentosComanda`
- Linhas 73-91: `loadPagamentosComanda()` - Carrega pagamentos
- Linhas 473-479: Tratamento de status 'cancelada'
- Linhas 697-709: Filtro e separação de comandas por status
- Linhas 750-769: Integração de pagamentos em `selecionarComanda()`
- Linhas 859-889: `cancelarComanda()` - Função principal de cancelamento
- Linhas 1262-1270: UI de display de pagamentos
- Linhas 1500-1510: Botão "CANCELAR COMANDA"
- Linhas 1786-1806: Abas (ABERTAS, PAGAS, CANCELADAS)
- Linhas 1930-1975: Visualização de comandas canceladas
- Linhas 2074-2080: Estilos de pagamentos

### Serviços
**PagamentosService.js** (~/src/services/)
- Linha 158: `forma: formaKey` - Salva forma de pagamento
- Linha 159: `valor: valorNum` - Salva valor
- Linha 160: `usuarioNome` - Salva quem recebeu

### Scripts Utilitários (~/restaurante-app/)
- `limpar-hoje.js` - Limpa dados do dia (comandas, pedidos, pagamentos)
- `ver-tudo.js` - Lista todas as comandas e pedidos
- `ver-canceladas.js` - Lista comandas canceladas com detalhes
- `ver-pagamentos-detalhado.js` - Mostra pagamentos por comanda
- `testar-cancelamento.js` - Verifica comandas disponíveis para teste
- `adicionar-caldos-tamanhos.js` - Popula caldos com 2 tamanhos

### Documentação
- `CONTEXT.md` - Contexto completo do projeto com implementações técnicas
- `TODO.md` - Histórico de tarefas e desenvolvimento
- `CANCELAMENTO.md` - Documentação específica do sistema de cancelamento
- `CARDAPIO_COMPLETO.md` - Detalhes do cardápio

---

## 🎯 RESUMO EXECUTIVO

**Status Atual:** Sistema 100% funcional com todas as features implementadas

**Principais Conquistas:**
1. ✅ Cálculo dinâmico de preços via Firestore
2. ✅ Caldos com 2 tamanhos (300ml/180ml)
3. ✅ Temperos personalizáveis (3 opções)
4. ✅ Sistema completo de cancelamento com auditoria
5. ✅ Display de formas de pagamento
6. ✅ UI otimizada e responsiva
7. ✅ 8 scripts utilitários para gestão

**Próxima Versão Sugerida:** v2.2
- Relatórios de vendas
- Gráficos de produtos
- Histórico de cancelamentos com filtros

---

**Desenvolvido com:** React Native + Expo + Firebase  
**Versão Atual:** 2.1  
**Última Atualização:** 19/01/2026 13:05
- [ ] Backup automático do Firestore
- [ ] Cache offline (React Query)

### Segurança
- [ ] Rate limiting no Firebase
- [ ] Validação de dados no backend (Cloud Functions)
- [ ] Auditoria de ações críticas
- [ ] Recuperação de senha
- [ ] 2FA para admin

### Performance
- [ ] Lazy loading de telas
- [ ] Otimização de queries Firestore
- [ ] Compressão de imagens (se adicionar fotos)
- [ ] Paginação de listas longas

---

## 🐛 BUGS CONHECIDOS

Nenhum bug crítico identificado no momento.

---

## 📝 BACKLOG (Prioridade Baixa)

### Cardápio
- [ ] Adicionar fotos dos produtos
- [ ] Categorias personalizáveis
- [ ] Produtos com ingredientes opcionais
- [ ] Combos e promoções
- [ ] Produtos sazonais (ativar/desativar por período)

### Pedidos
- [ ] Dividir conta entre pessoas
- [ ] Gorjeta sugerida
- [ ] Cupom de desconto
- [ ] Pedidos agendados
- [ ] Pedidos para viagem

### Funcionários
- [ ] Controle de jornada
- [ ] Comissões por vendas
- [ ] Metas individuais
- [ ] Avaliação de desempenho

### Clientes
- [ ] Cadastro de clientes
- [ ] Programa de fidelidade
- [ ] Histórico de pedidos por cliente
- [ ] Preferências salvas

---

## 🔧 MANUTENÇÃO

### Mensal
- [ ] Revisar logs de erro
- [ ] Atualizar dependências npm
- [ ] Backup manual do Firestore
- [ ] Revisar regras de segurança Firebase

### Trimestral
- [ ] Auditoria de código
- [ ] Revisão de performance
- [ ] Atualização de documentação
- [ ] Treinamento de novos usuários

---

## 📊 MÉTRICAS PARA ACOMPANHAR

- [ ] Tempo médio de preparo por pedido
- [ ] Produtos mais vendidos
- [ ] Horários de pico
- [ ] Taxa de erro em pedidos
- [ ] Tempo médio de atendimento
- [ ] Ticket médio por comanda
- [ ] Satisfação do cliente (se implementar)

---

## 🎯 ROADMAP 2026

### Q1 (Jan-Mar)
- [x] Migração para caldos ✅
- [x] Adicionar comidas ✅
- [ ] Relatórios básicos
- [ ] Modo escuro

### Q2 (Abr-Jun)
- [ ] Sistema de mesas
- [ ] Impressão de comandas
- [ ] Notificações push

### Q3 (Jul-Set)
- [ ] Controle de estoque
- [ ] Programa de fidelidade
- [ ] App mobile nativo (iOS/Android)

### Q4 (Out-Dez)
- [ ] Dashboard analytics
- [ ] Integração com delivery
- [ ] API pública

---

## 💡 IDEIAS PARA EXPLORAR

- Integração com iFood/Uber Eats
- Sistema de reservas
- Cardápio digital com QR Code
- Pagamento via PIX integrado
- Chatbot para pedidos
- Reconhecimento de voz para garçons
- IA para sugestão de produtos

---

## 📞 CONTATOS ÚTEIS

- **Firebase Console:** https://console.firebase.google.com/project/restaurante-6f221
- **Expo Dashboard:** https://expo.dev
- **Documentação React Native:** https://reactnative.dev
- **Documentação Firebase:** https://firebase.google.com/docs

---

## 🔄 CHANGELOG

### v2.0.1 (15/01/2026)
- Criado script build-android.sh automatizado
- Configurado assinatura automática de APKs
- APKs copiados para pasta build/ (fácil acesso)
- Aumentada memória do Gradle (4GB RAM + 1GB Metaspace)
- Gerados APKs para ARM64 e ARMv7
- Documentação de instalação (INSTALACAO_APK.md)

### v2.0.0 (15/01/2026)
- Migração completa de espetinhos para caldos
- Adicionado categoria comidas (risotos + batata frita)
- Simplificado modelo de preços
- Removido sistema de variações
- Atualizado sistema de roles
- Criado scripts de teste automatizado
- Documentação completa atualizada

### v1.0.0 (Anterior)
- Sistema inicial com espetinhos
- Pontos de cocção
- Variações de preparo
- Sistema de churrasqueira

---

**Nota:** Este TODO.md é um documento vivo e deve ser atualizado conforme o projeto evolui.
