# Adição do Framework Playwright para Testes End-to-End

## Contexto
O ecossistema `restaurante-supabase` inclui o projeto `restaurante-web` focado no gerenciamento, PDV, painéis financeiros e recepção de pedidos. O projeto contava até o momento com a estrutura de testes do Jest focado em testes unitários e de integração, porem carecia de uma ferramenta madura para validar os fluxos finais no navegador a partir da perspectiva do usuário de forma confiável (testes E2E).

## Decisão
Decidimos introduzir o **Playwright**, um framework moderno de testes E2E mantido pela Microsoft. 
Ele foi adicionado como dependência de desenvolvimento (`@playwright/test`) dentro do escopo do `restaurante-web`.

## Consequências

### Impactos Positivos
- **Confiabilidade:** O Playwright é projetado para lidar com aplicações web modernas (SPA) eliminando muitos dos "flaky tests" comuns no ecossistema (através de auto-waiting).
- **Cobertura Visual/Fluxo:** Permite simular cliques, inputs e rotas num navegador Chromium real, testando integrações ponta-a-ponta (ex: Login, fluxo de Novo Pedido, etc) do mesmo modo como o cliente veria. 
- **Desenvolvimento e CI/CD:** A ferramenta possui relatórios HTML ricos em informações e suporte out-of-the-box para execução em ambientes de CI.

### Impactos Neutros / Pontos de Atenção
- **restaurante-app (Mobile):** Inicialmente o Playwright no nosso setup tem como objetivo focar 100% no teste do layout web gerado pelo `restaurante-web` (Expo export web). Os testes E2E genuinamente Mobile continuam um assunto paralelo, não afetado nem prejudicado por essa implementação web.
- **Banco de Dados / Integrações:** A inserção do Playwright trata-se puramente de uma modificação de tooling no front. Não há nenhuma mudança no schema do Supabase, roteamento no n8n ou webhooks da Evolution API, de modo que o app (Mobile) não sofre consequências. Devido aos testes consumirem/interagirem com as APIs e bancos de dados através da UI, será pertinente futuramente delinear dados segregados para mocks e evitar lixo no Supabase durante a execução contínua desses testes.

## Alternativas Consideradas
- **Cypress:** Popular no ecossistema front-end, porém sua arquitetura o limita no uso do mesmo loop de eventos do navegador da aplicação testada e suporte restrito para multithreading e Múltiplos abas simulâneas de maneira nativa se comparado com o Playwright. Playwright, possuindo um servidor próprio WebSockets na sua arquitetura, provê uma performance e um sandbox de emulação de contextos isolados mais consistente.
- **Selenium:** Uma tecnologia testada pelo tempo porem significativamente mais lenta e que frequentemente requer ajustes manuais complexos para tempos de espera (`Explicit/Implicit Waits`). O Playwright gerencia essa assincronia inerentemente.
