# Estudo de Implementacao: Cardapio Digital com QR no restaurante-supabase

Data: 2026-03-25
Escopo: Definir implementacao de cardapio publico com QR code e fotos de produtos, reaproveitando Supabase e arquitetura atual do monorepo.

## 1. Objetivo

Implementar cardapio digital publico por QR code, com foco em:
- leitura publica segura de produtos por empresa;
- exibicao de fotos performatica em mobile;
- preservacao das regras multi-tenant (`company_id`) e RLS;
- rollout gradual sem regressao em fluxos criticos (Balcao, Mesa, Delivery, Montagem).

## 2. Repositorios de referencia analisados

1. `charnowsky/FeastQR`
- Pontos fortes: stack com Supabase, geracao de QR, menu publico por URL, templates PDF, i18n e variantes.
- Limites para copia direta: base antiga (3 anos), arquitetura Next+tRPC+Prisma diferente do monorepo atual.

2. `kaje94/menufic`
- Pontos fortes: foco forte em UX de compartilhamento, SEO/social preview, multiplos banners, fluxo simples de publicacao.
- Destaque para imagens: uso de servico dedicado de imagens (ImageKit) e otimizacao de entrega.

3. `danishfareed/restaurant-digital-menu`
- Pontos fortes: experiencia simples de navegacao por categorias e itens com fotos.
- Insight util: separar experiencia publica (consumo) da area administrativa (edicao), mesmo em stacks diferentes.

4. `amratansh12/digital-menu`
- Pontos fortes: fluxo completo admin/usuario, QR integrado, pedido e papel de admin;
- Insight util: separacao por papeis e jornada clara para criar restaurante/cardapio e publicar QR.

## 3. Decisao arquitetural para o nosso projeto

### 3.1 O que aproveitar (conceito)

- URL publica por estabelecimento para cardapio (`/menu/:slug`).
- QR code como ponte de acesso para cliente final.
- Camada administrativa para publicacao e gestao do cardapio.
- Imagens com variacoes de tamanho para melhor performance.

### 3.2 O que NAO aproveitar (codigo)

- Nao aplicar migrations SQL externas dos repositorios de referencia.
- Nao adotar Prisma/tRPC para esse modulo no monorepo atual.
- Nao alterar fluxo de billing existente (Mercado Pago / restaurante-ops).

## 4. Modelo de dados proposto (compativel com estado atual)

Premissas:
- Ja existe tabela `public.products` com `company_id`, `category`, `price`, `image_url`, `active`, `available`, `prices`, `ingredients`, `subcategory`.
- Multi-tenant deve permanecer ancorado em `company_id`.

Propostas incrementais:

1. Slug publico por empresa
- Adicionar `public_slug` em `public.companies` (ou tabela equivalente de empresa usada em producao).
- Regra: unico, imutavel por padrao (ou alteravel com historico/redirect).

2. Campos de apresentacao no produto (opcional fase 2)
- `display_order integer` para ordenar itens na vitrine publica.
- `photo_alt text` para acessibilidade e SEO.
- `tags text[]` para marcadores tipo `vegano`, `sem_gluten`, etc.

3. Publicacao
- Reutilizar `active` + `available` como gate de exibicao publica.

## 5. Estrategia de fotos (ponto principal)

## 5.1 Bucket e path

Criar bucket dedicado para cardapio, por exemplo `menu-images`.

Estrutura de objeto recomendada:
- `companies/{company_id}/products/{product_id}/original/{filename}`
- `companies/{company_id}/products/{product_id}/thumb.webp`
- `companies/{company_id}/products/{product_id}/medium.webp`
- `companies/{company_id}/products/{product_id}/full.webp`

Beneficios:
- isolamento por tenant;
- invalidacao e auditoria por produto;
- facilidade de politica por prefixo.

## 5.2 Padrao de entrega

Salvar no `products.image_url` a URL da versao `medium` (ou caminho relativo padronizado).

Para listagem publica:
- usar `thumb` no grid/lista;
- trocar para `medium` quando item entra em viewport;
- abrir `full` apenas em detalhe/zoom.

## 5.3 Upload e processamento

Fluxo recomendado:
1. admin envia imagem original;
2. Edge Function (ou job assinado) valida MIME e tamanho;
3. gera `thumb/medium/full` em WebP;
4. grava objetos no bucket;
5. atualiza `products.image_url` com versao `medium`;
6. registra metadados (dimensoes, bytes, hash) para observabilidade.

Guardrails:
- limite de upload (ex.: 8MB original);
- aceitar `image/jpeg`, `image/png`, `image/webp`;
- normalizar orientacao EXIF;
- bloquear SVG para evitar vetores XSS.

## 5.4 Cache e performance

- Configurar `cacheControl` alto para assets versionados.
- Incluir sufixo de versao no path quando imagem mudar (`.../v2/medium.webp`).
- Habilitar lazy loading no web e prefetch controlado no app.
- Placeholder blur/skeleton para reduzir layout shift.

## 6. Seguranca, RLS e policies

## 6.1 Tabela products

Leitura publica deve mostrar SOMENTE itens publicaveis:
- `active = true`
- `available = true`
- `company_id` pertencente a empresa publicada.

Implementar com policy especifica para `anon`, sem abrir dados internos.

## 6.2 Storage

- Escrita (`insert/update/delete`) restrita a usuarios autenticados da mesma `company_id`.
- Leitura publica apenas para arquivos em prefixos permitidos de empresas publicadas.
- Evitar bucket totalmente publico sem filtro de path/prefixo.

## 6.3 Segredos e operacao

- Nenhum segredo no cliente.
- Processamento de imagem sensivel em Edge Function com service role no servidor.
- Logs de upload/processamento com correlacao por `company_id` e `product_id`.

## 7. UX e fluxo de produto

1. Admin publica cardapio
- define `public_slug`;
- escolhe itens visiveis (`active/available`);
- faz upload de fotos;
- gera QR do link publico.

2. Cliente acessa
- escaneia QR;
- abre `/menu/:slug` com categorias e fotos;
- busca e filtros basicos por categoria.

3. Evolucao opcional
- CTA para iniciar pedido (quando acoplar fluxo de checkout/mesa).

## 8. Plano de implementacao por fases

## Fase 0 - Fundacao (baixa complexidade)
- Criar migration para `public_slug`.
- Criar endpoint/rota publica `menu/:slug` no `restaurante-web`.
- Exibir lista publica com dados de `products` ja existentes.

Entregavel:
- cardapio publico sem login, sem QR ainda.

## Fase 1 - Fotos robustas
- Criar bucket `menu-images`.
- Criar policies de storage por `company_id`.
- Implementar upload + derivacoes (`thumb/medium/full`).
- Atualizar telas admin para fluxo de foto padrao.

Entregavel:
- itens com foto otimizada e carregamento rapido em mobile.

## Fase 2 - QR e print
- Gerar QR code para `https://<dominio>/menu/:slug`.
- Tela de download/impressao de cartaz/cartao QR (PDF simples).

Entregavel:
- operacao pronta para mesa/balcao com QR fisico.

## Fase 3 - Diferenciais
- Ordenacao manual (`display_order`).
- Tags nutricionais.
- Tema visual por empresa (logo/capa/cores).
- i18n (se necessario por mercado).

## 9. Riscos e mitigacoes

1. Risco: abrir dados entre empresas
- Mitigacao: policy sempre com `company_id` + `active/available`; testes de isolamento multi-tenant.

2. Risco: lentidao por imagens pesadas
- Mitigacao: pipeline de derivacoes WebP + lazy loading + cache versionado.

3. Risco: regressao em fluxos criticos
- Mitigacao: feature flag `CARDAPIO_QR_UI_NEXT` + rollout canario por empresas.

4. Risco: drift de schema
- Mitigacao: toda alteracao via migration versionada em `database-backup/migrations/` e aplicacao imediata no banco alvo.

## 10. Checklist tecnico de inicio imediato

1. Banco e migration
- Criar migration: `add_public_slug_for_companies`.
- Aplicar e validar em catalogo remoto.

2. Web publico
- Implementar rota publica de cardapio por slug.
- Garantir consulta filtrada por empresa e status publicavel.

3. Fotos
- Criar bucket `menu-images`.
- Implementar policies de leitura/escrita.
- Integrar upload admin com atualizacao de `products.image_url`.

4. QR
- Adicionar geracao QR no painel admin.
- Exportar PDF simples para impressao.

5. Rollout
- Ativar por flag.
- Smoke tests por empresa piloto.

## 11. UX/UI Mobile - Cardapio Otimizado para Celular

O cardapio QR e acessado quase exclusivamente em celular pelo cliente final. A experiencia deve ser rapida, visualmente atraente e facil de navegar com uma mao.

### 11.1 Principios gerais

- Mobile-first absoluto: todas as decisoes de layout partem do celular.
- Performance percebida primeiro: skeleton, lazy loading e preload sao obrigatorios.
- Touch-friendly: areas clicaveis com minimo 44px de altura (guideline Apple/Google).
- Contraste AA minimo em todos os textos e botoes.
- Nunca depender so de cor para comunicar estado.

### 11.2 Fluxo de navegacao do cliente

```
[QR Scan] -> [Hero do restaurante] -> [Chips de categoria sticky] -> [Grid/Lista de itens]
                                                                         |
                                                      [Toque no item] -> [Detalhe do produto]
                                                                         |
                                                     [Adicionar] -> [Carrinho flutuante]
                                                                         |
                                                                [Checkout simplificado]
```

### 11.3 Estrutura de tela - Hero (primeira dobra)

- Foto/banner do restaurante com gradiente inferior para legibilidade.
- Logo do restaurante sobreposto no rodape do banner.
- Nome + cidade abaixo do banner.
- Maximo 35% da altura inicial de viewport (nao travar o usuario no hero).
- Transicao suave para o conteudo ao rolar para baixo.

### 11.4 Navegacao por categorias - chips sticky

- Barra horizontal com chips de categoria fixada logo abaixo do hero ao rolar.
- ScrollView horizontal sem indicadores de scroll.
- Chip ativo destacado com cor primaria e pill arredondado.
- Toque no chip faz scroll suave ate a secao correspondente.
- Animacao de transicao curta (150-200ms) sem jank.

### 11.5 Cards de produto

- Foto em proporcao 4:3 para todos os cards (sem quebra de layout por formatos diferentes).
- Nome do produto: max 2 linhas, truncado com elipse.
- Descricao: max 1 linha em card compacto, expandida na visao de detalhe.
- Preco em destaque: fonte maior, cor contrastante.
- Badges: "Mais pedido", "Vegano", "Sem gluten", "Novidade" - visual sutil, nao sobrecarregar.
- Botao de adicionar (+) sempre visivel no card.
- Produto indisponivel: card em menor opacidade com label "Indisponivel".

### 11.6 Performance visual de imagens

- Estrategia de variantes por tamanho:
  - `thumb` (100x75px WebP): usado no grid/lista.
  - `medium` (400x300px WebP): carregado ao item entrar no viewport.
  - `full` (original otimizado): apenas em zoom/detalhe.
- Lazy loading com IntersectionObserver (web) ou FlashList onViewableItemsChanged (app).
- Placeholder blur cinza claro enquanto imagem carrega (skeleton).
- Fallback branded com icone de prato quando `image_url` for nulo.
- Versao em URL para invalidar cache ao atualizar foto: `medium.webp?v=2`.

### 11.7 Busca e filtros rapidos

- Barra de busca no topo, abaixo dos chips de categoria.
- Busca em tempo real com debounce de 300ms.
- Filtros por badge/tag (Vegano, Sem Gluten, etc.) como toggles horizontais.
- Resultado de busca vazio: mensagem amigavel com sugestao de categorias.

### 11.8 Carrinho flutuante

- Barra sticky na parte inferior da tela.
- Exibe: icone de carrinho + quantidade de itens + subtotal + botao "Ver carrinho".
- Aparece com animacao ao adicionar o primeiro item.
- Nao cobre conteudo do ultimo card (padding-bottom no scroll igual a altura da barra).
- Botao "Ver carrinho" leva ao checkout sem sair do cardapio.

### 11.9 Checkout simplificado

- Fluxo em no maximo 3 telas/etapas:
  1. Resumo do pedido (itens, quantidades, total).
  2. Dados do cliente (nome, telefone, opcao mesa/entrega/balcao).
  3. Confirmacao e pagamento (QR Pix ou selecao de metodo).
- Minimizar campos obrigatorios.
- Mostrar resumo do pedido sempre visivel em todas as etapas.

### 11.10 Diretrizes visuais

- Tipografia:
  - Titulo do restaurante: sans-serif bold, 22-24px.
  - Nome do produto: medium, 16px.
  - Preco: bold, 18px, cor primaria.
  - Descricao: regular, 13-14px, cor secundaria.
- Paleta gastronômica:
  - Fundo: branco ou off-white quente (#FAFAF8).
  - Primaria: cor da marca do restaurante (configuravel).
  - Texto principal: #1A1A1A.
  - Texto secundario: #6B6B6B.
  - Separadores: #EFEFEF.
- Espacamento generoso entre itens para toque confortavel com uma mao.
- Raio de borda nos cards: 12px para visual moderno.

### 11.11 Metricas UX a monitorar desde o MVP

- Tempo ate primeira interacao (Time to First Interaction).
- Taxa de clique em produto (card tap rate).
- Adicoes ao carrinho por sessao.
- Abandono no checkout (etapa de maior saida).
- Tempo medio entre scan do QR e finalizacao do pedido.

### 11.12 Checklist de aceitacao UX para QA

- [ ] Cardapio carrega em menos de 2s em 3G (sem fotos na fold inicial).
- [ ] Hero nao ocupa mais de 35% da altura inicial.
- [ ] Chips de categoria ficam sticky ao rolar.
- [ ] Scroll suave funciona ao tocar no chip.
- [ ] Foto de produto tem placeholder durante carregamento.
- [ ] Produto sem foto exibe fallback branded (sem bloco vazio).
- [ ] Produto indisponivel esta visualmente marcado e nao permite adicionar.
- [ ] Botao de adicionar tem area de toque minima de 44px.
- [ ] Carrinho flutuante aparece ao adicionar primeiro item.
- [ ] Cardapio e legivel e navegavel com uma mao.
- [ ] Contraste de texto passa AA em todos os elementos.
- [ ] Busca retorna resultados corretos com acentos/sem acentos (normalizacao NFD).
- [ ] Fluxo de checkout completo e acessivel sem autenticacao do cliente.

## 12. Recomendacao final

A estrategia mais segura e eficiente para o monorepo atual e:
- usar os 4 projetos como referencia de produto/UX;
- implementar internamente em `restaurante-web` e Supabase ja existentes;
- manter governanca de multi-tenant e RLS por `company_id` como regra inegociavel;
- aplicar as diretrizes UX mobile desta secao como criterio de aceitacao em QA.

Isso entrega valor rapido (cardapio com QR + fotos) sem introduzir acoplamento tecnologico externo nem regressao nos modulos operacionais existentes.
