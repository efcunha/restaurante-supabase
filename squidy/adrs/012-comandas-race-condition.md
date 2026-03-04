# Resolvendo Race Conditions na Criação de Comandas

## Status
Aceito e Implementado

## Contexto
O aplicativo restaurante-supabase é multi-inquilino (multi-enterprise) com múltiplos usuários (garçons, caixas) operando em paralelo. Descobrimos um erro de `406 Not Acceptable` originado da chamada `.single()` no serviço de `PagamentosService`. A análise revelou que, devido a testes E2E concorrentes (mas o mesmo seria visível em horário de pico num restaurante real), múltiplas comandas abertas com o mesmo número (ex: Comanda 1) foram cadastradas simultaneamente. O código em `ComandasService.ensureComandaAberta` rodava 1) um Select e, se nulo, 2) um Insert. Se dois usuários chamassem esse código no exato mesmo milissegundo, ambos recebiam "null" no Select e ambos executavam o Insert, duplicando as ordens e quebrando o banco.

## Decisão
Implementamos uma defesa em duas camadas (Banco de Dados + Código Cliente) para interceptar esse fluxo garantindo 100% de exclusividade.

1. **Trava no Banco (Supabase SQL)**
Criamos um índice único parcial na tabela `comandas`:
```sql
CREATE UNIQUE INDEX idx_unique_open_comanda 
ON comandas (company_id, date_key, comanda_number) 
WHERE status = 'aberta';
```
Esta regra no nível do SGBD impede fisicamente a aceitação de duas comandas com número idêntico para a mesma empresa, na mesma data, enquanto estiverem abertas.

2. **Captura Antecipada (Services Typescript - Web/App)**
No cliente (tanto no `restaurante-web` quando no `restaurante-app`), ajustamos `ComandasService` para blindar o retorno dessa Unique Constraint. Caso ocorra uma colisão (Erro Postgres `23505`), o Catch Exception interceptará em background e reconvocará recursivamente o método:
```typescript
if (error.code === '23505') { 
    // 23505 = Unique violation. Meaning another instance concurrently created this 'aberta' comanda just milliseconds ago!
    console.warn('[ComandasService] Empate (Race condition) identificado! Comanda foi criada milisegundos antes por outro usuário. Recuperando a existente...');
    return this.ensureComandaAberta(companyId, comandaNumber, usuarioId, usuarioNome, mesa, cliente);
}
```

## Consequências (Impacto Front e Backend)
1. **Estabilidade Absoluta:** É matematicamente impossível recriar logs duplicados e quebrar chamadas `.single()` do PagamentosService ou ComandaService devido ao volume assíncrono.
2. **Experiência do Usuário (UX):** Nenhuma quebra visual. Se o garçom clicar pra lançar ao mesmo microsegundo que outro, o banco barra o dele, mas o próprio código typescript entende a recusa e amarra o produto do garçom à referida comanda existente, resolvendo de forma limpa, silenciosa e com o feedback correto.
3. **Consistência do Banco:** A integridade na contabilidade dos itens e balanços de comanda são muito mais seguros uma vez que os ID's de ponteiros serão os mesmos.
