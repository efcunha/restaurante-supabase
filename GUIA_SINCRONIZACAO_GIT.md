# Guia de Sincronização do Repositório Git

## Status Atual ✅

```
Branch: test/coderabbit-demo
Status: Sincronizado com origin
Working tree: Limpo (sem mudanças pendentes)
```

## Comandos Básicos de Sincronização

### 1. Verificar Status
```bash
git status
```
**O que faz**: Mostra arquivos modificados, adicionados ou deletados

### 2. Adicionar Arquivos
```bash
# Adicionar todos os arquivos
git add -A

# Adicionar arquivo específico
git add caminho/do/arquivo.js

# Adicionar pasta específica
git add restaurante-app/src/
```

### 3. Fazer Commit
```bash
# Commit com mensagem
git commit -m "Descrição das mudanças"

# Exemplo
git commit -m "feat: Adiciona separação de vendas e cancelamentos"
```

### 4. Enviar para o Repositório Remoto
```bash
# Enviar para a branch atual
git push

# Enviar para branch específica
git push origin test/coderabbit-demo
```

### 5. Atualizar do Repositório Remoto
```bash
# Buscar atualizações
git fetch origin

# Baixar e mesclar atualizações
git pull origin test/coderabbit-demo
```

## Fluxo Completo de Sincronização

### Cenário 1: Enviar Suas Mudanças

```bash
# 1. Verificar o que mudou
git status

# 2. Adicionar arquivos
git add -A

# 3. Verificar novamente
git status

# 4. Fazer commit
git commit -m "feat: Descrição das mudanças"

# 5. Enviar para o remoto
git push origin test/coderabbit-demo
```

### Cenário 2: Receber Mudanças de Outros

```bash
# 1. Buscar atualizações
git fetch origin

# 2. Baixar e mesclar
git pull origin test/coderabbit-demo
```

### Cenário 3: Sincronização Completa (Enviar e Receber)

```bash
# 1. Salvar suas mudanças locais
git stash

# 2. Atualizar do remoto
git pull origin test/coderabbit-demo

# 3. Restaurar suas mudanças
git stash pop

# 4. Resolver conflitos (se houver)
# Editar arquivos com conflitos

# 5. Adicionar arquivos resolvidos
git add -A

# 6. Fazer commit
git commit -m "merge: Resolve conflitos"

# 7. Enviar
git push origin test/coderabbit-demo
```

## Comandos Úteis

### Ver Histórico de Commits
```bash
# Histórico completo
git log

# Histórico resumido
git log --oneline

# Últimos 5 commits
git log -5 --oneline
```

### Ver Diferenças
```bash
# Ver mudanças não commitadas
git diff

# Ver mudanças de um arquivo específico
git diff caminho/do/arquivo.js

# Ver mudanças entre commits
git diff HEAD~1 HEAD
```

### Desfazer Mudanças

```bash
# Desfazer mudanças em arquivo específico (antes do add)
git checkout -- caminho/do/arquivo.js

# Remover arquivo do staging (depois do add, antes do commit)
git reset HEAD caminho/do/arquivo.js

# Desfazer último commit (mantém mudanças)
git reset --soft HEAD~1

# Desfazer último commit (descarta mudanças) ⚠️ CUIDADO
git reset --hard HEAD~1
```

### Branches

```bash
# Listar branches
git branch

# Criar nova branch
git branch nome-da-branch

# Mudar de branch
git checkout nome-da-branch

# Criar e mudar para nova branch
git checkout -b nome-da-branch

# Deletar branch local
git branch -d nome-da-branch

# Deletar branch remota
git push origin --delete nome-da-branch
```

## Mensagens de Commit (Convenção)

### Formato
```
tipo(escopo): descrição curta

Descrição detalhada (opcional)
```

### Tipos Comuns
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração de código
- `test`: Adiciona ou corrige testes
- `chore`: Tarefas de manutenção

### Exemplos
```bash
git commit -m "feat: Adiciona filtro de comandas canceladas"
git commit -m "fix: Corrige cálculo de valores no gráfico"
git commit -m "docs: Atualiza README com instruções"
git commit -m "refactor: Melhora performance do AdminScreen"
git commit -m "test: Adiciona testes para diagnosticarComandas"
```

## Resolução de Conflitos

### Quando Acontece
Conflitos ocorrem quando:
- Você e outra pessoa modificam a mesma linha
- Você modifica um arquivo que foi deletado remotamente
- Mudanças incompatíveis

### Como Resolver

1. **Identificar arquivos com conflito**
```bash
git status
# Arquivos com conflito aparecem como "both modified"
```

2. **Abrir arquivo e procurar marcadores**
```javascript
<<<<<<< HEAD
// Sua versão
const valor = 100;
=======
// Versão remota
const valor = 200;
>>>>>>> origin/test/coderabbit-demo
```

3. **Escolher versão ou mesclar manualmente**
```javascript
// Decisão: manter sua versão
const valor = 100;

// OU mesclar ambas
const valor = 150; // Média das duas
```

4. **Remover marcadores de conflito**
```javascript
// Arquivo limpo após resolver
const valor = 100;
```

5. **Adicionar e commitar**
```bash
git add arquivo-resolvido.js
git commit -m "merge: Resolve conflito em arquivo-resolvido.js"
git push origin test/coderabbit-demo
```

## Boas Práticas

### ✅ Fazer

1. **Commit frequente**: Commits pequenos e frequentes
2. **Mensagens claras**: Descrever o que foi feito
3. **Pull antes de Push**: Sempre atualizar antes de enviar
4. **Testar antes de commitar**: Garantir que código funciona
5. **Revisar mudanças**: Usar `git diff` antes de commitar

### ❌ Evitar

1. **Commits gigantes**: Dificulta revisão
2. **Mensagens vagas**: "fix", "update", "changes"
3. **Commitar código quebrado**: Sempre testar antes
4. **Force push**: `git push --force` (só em casos extremos)
5. **Commitar arquivos sensíveis**: Senhas, tokens, chaves

## Arquivos a Ignorar (.gitignore)

Já configurado no projeto:
```
node_modules/
.env
.env.local
*.log
.DS_Store
build/
dist/
```

## Atalhos Úteis

```bash
# Status curto
git status -s

# Adicionar e commitar em um comando
git commit -am "mensagem"

# Ver último commit
git show

# Ver branches remotas
git branch -r

# Limpar branches deletadas remotamente
git fetch --prune

# Ver quem modificou cada linha
git blame arquivo.js
```

## Troubleshooting

### Problema: "Your branch is behind"
```bash
# Solução: Atualizar
git pull origin test/coderabbit-demo
```

### Problema: "Your branch is ahead"
```bash
# Solução: Enviar
git push origin test/coderabbit-demo
```

### Problema: "Merge conflict"
```bash
# Solução: Resolver conflitos manualmente
# 1. Editar arquivos
# 2. git add arquivo-resolvido.js
# 3. git commit -m "merge: Resolve conflitos"
# 4. git push
```

### Problema: "Permission denied"
```bash
# Solução: Verificar SSH ou usar HTTPS
git remote -v
git remote set-url origin https://github.com/usuario/repo.git
```

### Problema: Commitou arquivo errado
```bash
# Antes do push
git reset --soft HEAD~1
git reset HEAD arquivo-errado.js
git commit -m "mensagem correta"

# Depois do push (cuidado!)
git revert HEAD
git push
```

## Comandos de Emergência 🚨

### Desfazer tudo e voltar ao último commit
```bash
⚠️ CUIDADO: Isso descarta TODAS as mudanças não commitadas
git reset --hard HEAD
```

### Voltar para estado do remoto
```bash
⚠️ CUIDADO: Isso descarta TODOS os commits locais
git fetch origin
git reset --hard origin/test/coderabbit-demo
```

### Salvar mudanças temporariamente
```bash
# Guardar mudanças
git stash

# Ver stashes
git stash list

# Restaurar último stash
git stash pop

# Restaurar stash específico
git stash apply stash@{0}

# Deletar stash
git stash drop stash@{0}
```

## Workflow Recomendado

### Diário
```bash
# Manhã: Atualizar
git pull origin test/coderabbit-demo

# Durante o dia: Commitar frequentemente
git add -A
git commit -m "feat: Descrição"

# Fim do dia: Enviar
git push origin test/coderabbit-demo
```

### Antes de Grandes Mudanças
```bash
# Criar branch para feature
git checkout -b feature/nova-funcionalidade

# Trabalhar na branch
git add -A
git commit -m "feat: Nova funcionalidade"

# Quando pronto, mesclar
git checkout test/coderabbit-demo
git merge feature/nova-funcionalidade
git push origin test/coderabbit-demo
```

## Recursos Adicionais

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com/
- **Git Cheat Sheet**: https://education.github.com/git-cheat-sheet-education.pdf
- **Interactive Git Tutorial**: https://learngitbranching.js.org/

## Suporte

Se encontrar problemas:
1. Verificar mensagem de erro
2. Consultar este guia
3. Usar `git status` para entender estado atual
4. Pesquisar erro no Google
5. Pedir ajuda no chat

---

**Última atualização**: 01/02/2026
**Branch atual**: test/coderabbit-demo
**Status**: ✅ Sincronizado
