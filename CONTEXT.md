# CONTEXT.md - Sistema Multi-Empresa para Restaurantes (SaaS)

**Última atualização:** 22/01/2026 15:15
**Status:** ✅ SaaS Operacional + Multi-Inquilino + Segurança Reforçada
**Versão:** 3.0

---

## 📋 VISÃO GERAL

Plataforma SaaS (Software as a Service) para gerenciamento de restaurantes. Permite que múltiplos estabelecimentos utilizem o mesmo aplicativo com dados completamente isolados.

**Funcionalidades Principais (v3.0):**

- ✅ **Multi-Inquilino (Multi-Tenant):** Cadastro independente para cada restaurante.
- ✅ **Isolamento de Dados:** Segurança via Firestore Rules (cada empresa só vê seus dados).
- ✅ **Onboarding Integrado:** Registro de nova empresa direto no app.
- ✅ **PDFs Personalizados:** Comprovantes com nome e CNPJ da empresa.
- ✅ **Gestão de Perfil:** Admin pode editar dados da empresa (Nome, CNPJ).
- ✅ **Toast Notifications:** Feedback visual elegante (substituindo Alerts nativos).
- ✅ **Cardápio Flexível:** Suporte a categoria "Outros" e ordenação personalizada.

---

## 🏗️ ARQUITETURA SAAS

### Modelo de Dados (Firestore)

A estrutura foi migrada para suportar múltiplos clientes.

**Coleção Raiz:** `companies/{companyId}`

Todos os dados operacionais agora vivem dentro da sub-coleção da empresa:

- `companies/{companyId}/cardapio`
- `companies/{companyId}/pedidos`
- `companies/{companyId}/comandas`
- `companies/{companyId}/pagamentos`
- `companies/{companyId}/caixa`

**Coleção Global:** `users`

- O usuário possui um campo `companyId` que o vincula à sua empresa.

### Segurança (Firestore Security Rules)

Regras estritas garantem que:

- Usuários só leem/gravam na coleção `companies/{seuCompanyId}`.
- Bloqueio total de acesso cruzado entre empresas.

---

## 👥 SISTEMA DE ROLES (RBAC)

| Role           | Permissões                       | Telas Acessíveis                                         |
| -------------- | -------------------------------- | -------------------------------------------------------- |
| **admin**      | Acesso Total + Gestão da Empresa | Admin, Novo Pedido, Cozinha, Montagem, Prontos, Comandas |
| **gerente**    | Operacional Total                | Novo Pedido, Cozinha, Montagem, Prontos, Comandas, Admin |
| **garcom**     | Vendas + Atendimento             | Novo Pedido, Comandas                                    |
| **cozinheiro** | Produção                         | Cozinha                                                  |
| **montagem**   | Finalização e Entrega            | Montagem, Prontos                                        |

_Nota: Antigo papel "churrasqueiro" foi migrado para "cozinheiro"._

---

## 📱 TELAS E FLUXOS NOVOS

### 1. Registro de Empresa (Onboarding)

- Criação de novo usuário Admin.
- Criação automática da Empresa no Firestore.
- Inicialização de cardápio padrão.

### 2. Edição de Empresa (Admin)

- Alterar Nome Fantasia.
- Alterar CNPJ/CPF.
- Dados refletem imediatamente nos relatórios e PDFs.

### 3. Comprovantes PDF

- Gerador dinâmico injeta nome e documento da empresa no cabeçalho.
- Compartilhamento nativo (WhatsApp/Email).

---

## 🔧 IMPLEMENTAÇÕES TÉCNICAS RECENTES

### 1. useNovoPedido Hook (Refatorado)

- **Correção:** Inclusão da categoria "Outros".
- **Correção:** Ordenação correta (Caldos > Comidas > Porções > Outros > Bebidas).
- **Resiliência:** Cache local com AsyncStorage para funcionamento offline.

### 2. PDFService

- Aceita objeto `companyData` para personalização on-the-fly.

### 3. ToastContext

- Substituição de `window.alert` e `Alert.alert` por notificações não intrusivas.
- Cores semânticas (Sucesso=Verde, Erro=Vermelho, Info=Azul).

---

## 🚀 COMANDOS ÚTEIS

```bash
# Iniciar app
npm start

# Limpar dados de TESTE (da empresa logada apenas)
// Botão disponível na tela de Comandas (Admin apenas)

# Build Android
./build-android.sh
```

---

## 📊 MÉTRICAS DO PROJETO

- **Versão:** 3.0 (SaaS)
- **Tecnologia:** React Native + Firebase
- **Arquitetura:** Multi-Tenant no Firestore
- **Plataformas:** Android, iOS, Web (Suporte parcial)

---

## 📞 SUPORTE

Para problemas de acesso ou dados incorretos:

1. Verifique o `companyId` no perfil do usuário no Firebase Console.
2. Certifique-se que as regras de segurança `firestore.rules` estão publicadas.
