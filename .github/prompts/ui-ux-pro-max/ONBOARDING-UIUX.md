# UI/UX Pro Max — Índice de Onboarding

Guia de entrada para novos membros do time trabalharem com o sistema de UI/UX deste repositório.

---

## O que é este sistema

O **UI/UX Pro Max** é o workflow de design, revisão e implementação adotado neste repositório para garantir consistência visual, acessibilidade e padrões de produto nos dois projetos:

- `restaurante-app` — aplicativo React Native/Expo (PDV balcão, pedidos, caixa)
- `restaurante-web` — aplicação web (delivery checkout, painel admin, gestão)

O sistema é composto por três camadas:
1. **Design Systems** — regras de design por contexto (Master + overrides por tela)
2. **Documentação de processo** — como usar o workflow no dia a dia
3. **Exemplos de PR** — templates preenchidos para orientar revisões reais

---

## Estrutura de artefatos

### Camada 1 — Entrada rápida (comece aqui)

| Propósito | Arquivo |
|---|---|
| Prompts rápidos Copilot + comandos de terminal | [ATALHO-USO-INTERNO.md](./ATALHO-USO-INTERNO.md) |
| Pack com prompts por papel, checklist e PR template | [PACK-EXECUCAO-UIUX.md](./PACK-EXECUCAO-UIUX.md) |
| Prompt principal do workflow (referência completa) | [PROMPT.md](./PROMPT.md) |

### Camada 2 — Design systems por contexto

Cada pacote tem um `MASTER.md` com regras globais e overrides por tela em `pages/`.

| Contexto | MASTER | Override de tela |
|---|---|---|
| Web — Delivery Checkout | [restaurante-web-delivery/MASTER.md](../../../docs/design-system/restaurante-web-delivery/MASTER.md) | [pages/delivery-screen.md](../../../docs/design-system/restaurante-web-delivery/pages/delivery-screen.md) |
| App — Novo Pedido (PDV) | [restaurante-app-novo-pedido/MASTER.md](../../../docs/design-system/restaurante-app-novo-pedido/MASTER.md) | [pages/novo-pedido-screen.md](../../../docs/design-system/restaurante-app-novo-pedido/pages/novo-pedido-screen.md) |
| Web — Admin Operations | [restaurante-web-admin/MASTER.md](../../../docs/design-system/restaurante-web-admin/MASTER.md) | [pages/admin-screen.md](../../../docs/design-system/restaurante-web-admin/pages/admin-screen.md) |

### Camada 3 — Exemplos de PR preenchidos

PRs reais que demonstram como preencher o template de revisão UI/UX.

| Contexto | Arquivo |
|---|---|
| DeliveryScreen (web) | [EXEMPLO-PR-DELIVERYSCREEN.md](./EXEMPLO-PR-DELIVERYSCREEN.md) |
| NovoPedidoScreen (app) | [EXEMPLO-PR-NOVOPEDIDO.md](./EXEMPLO-PR-NOVOPEDIDO.md) |
| AdminScreen (web) | [EXEMPLO-PR-ADMINSCREEN-WEB.md](./EXEMPLO-PR-ADMINSCREEN-WEB.md) |

---

## Primeiro uso — em 5 minutos

### Passo 1 — Copilot Chat (revisão de tela existente)

Abra o Copilot Chat e cole o prompt do [ATALHO-USO-INTERNO.md](./ATALHO-USO-INTERNO.md) adaptado para a tela que você vai trabalhar.

**Exemplo para web:**
```
#file:.github/skills/ui-ux-pro-max/PROMPT.md
#file:restaurante-web/src/screens/DeliveryScreen.tsx

Revise esta tela e gere um relatório de design e UX focado em checkout delivery para restaurante brasileiro.
```

**Exemplo para app:**
```
#file:.github/skills/ui-ux-pro-max/PROMPT.md
#file:restaurante-app/src/screens/NovoPedidoScreen.tsx

Revise esta tela e gere um relatório de design e UX focado em PDV de balcão mobile-first.
```

### Passo 2 — Consultar o design system da tela

Antes de implementar qualquer mudança visual, consulte o MASTER e o override correspondente ao contexto da tela.

- Tela de checkout delivery → [restaurante-web-delivery/MASTER.md](../../../docs/design-system/restaurante-web-delivery/MASTER.md)
- Tela de pedido no app → [restaurante-app-novo-pedido/MASTER.md](../../../docs/design-system/restaurante-app-novo-pedido/MASTER.md)
- Tela admin web → [restaurante-web-admin/MASTER.md](../../../docs/design-system/restaurante-web-admin/MASTER.md)

### Passo 3 — Abrir PR

Ao abrir o PR, use o template do [PACK-EXECUCAO-UIUX.md](./PACK-EXECUCAO-UIUX.md) (seção 3). Consulte os exemplos preenchidos para orientação.

---

## Gerar novo design system para uma tela nova

Se você está implementando uma tela que ainda não tem design system, use o script:

```bash
# Windows
python .github/skills/ui-ux-pro-max/scripts/search.py \
  --design-system \
  --persist \
  --page "nome-da-tela" \
  -p "nome-do-projeto" \
  --format markdown \
  "descreva o contexto e propósito da tela"
```

**Saída esperada:**
- `docs/design-system/<projeto-slug>/MASTER.md`
- `docs/design-system/<projeto-slug>/pages/<tela-slug>.md`

> **Atenção:** O gerador pode produzir conteúdo genérico na primeira versão. Revise os arquivos gerados e ajuste para o contexto real do restaurante. Consulte os MASTER files existentes como referência de padrão.

---

## Papéis no workflow

Ver [PACK-EXECUCAO-UIUX.md](./PACK-EXECUCAO-UIUX.md) para os prompts específicos por papel.

| Papel | Foco principal |
|---|---|
| **Produto** | Validar fluxo, prioridades operacionais, regras de negócio |
| **Design** | Verificar consistência visual, acessibilidade, componentes |
| **Dev** | Checar implementação fiel ao design system, sem regressões |

---

## Roteamento global (Copilot)

O roteamento de skills do Copilot para este repositório está em [.github/copilot-instructions.md](../../copilot-instructions.md).

O workflow UI/UX Pro Max é invocado via `/ui-ux-pro-max <pedido>` no Copilot Chat ou anexando `#file:.github/skills/ui-ux-pro-max/PROMPT.md` nas mensagens.

---

## Mapa completo de arquivos

```
.github/
  copilot-instructions.md          ← roteamento global de skills
  skills/ui-ux-pro-max/
    PROMPT.md                      ← prompt principal (referência completa)
    ATALHO-USO-INTERNO.md          ← entrada rápida para o time
    PACK-EXECUCAO-UIUX.md          ← pack de execução por papel
    ONBOARDING-UIUX.md             ← este arquivo
    EXEMPLO-PR-DELIVERYSCREEN.md   ← exemplo de PR preenchido (web delivery)
    EXEMPLO-PR-NOVOPEDIDO.md       ← exemplo de PR preenchido (app PDV)
    EXEMPLO-PR-ADMINSCREEN-WEB.md  ← exemplo de PR preenchido (web admin)

docs/design-system/
  restaurante-web-delivery/
    MASTER.md                      ← regras globais para contexto delivery web
    pages/
      delivery-screen.md           ← override da DeliveryScreen
  restaurante-app-novo-pedido/
    MASTER.md                      ← regras globais para contexto PDV app
    pages/
      novo-pedido-screen.md        ← override da NovoPedidoScreen
  restaurante-web-admin/
    MASTER.md                      ← regras globais para contexto admin web
    pages/
      admin-screen.md              ← override da AdminScreen
```
