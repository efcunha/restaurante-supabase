---
name: opencode-rag
description: Semantic code retrieval via OpenCodeRAG — vector search, file skeletons, and symbol usage lookup for this workspace
---

## OpenCodeRAG Tools

This workspace has OpenCodeRAG indexed for semantic code search. Use these tools BEFORE planning, editing, or answering code questions.

### When to use each tool

| Tool | Use when | Example |
|------|----------|---------|
| `search_semantic` | Any code search — find relevant code by meaning or keyword | `"authentication middleware"` |
| `get_file_skeleton` | You have a file path but need to orient before reading | `"src/plugin.ts"` |
| `find_usages` | Before editing any function, class, or variable — check all call sites | `"createRagHooks"` |

### Workflow

1. **Skeleton first** — call `get_file_skeleton(filePath)` to see structure
2. **Find usages** — call `find_usages(symbolName)` before modifying any symbol
3. **Search** — call `search_semantic(query)` to find relevant code
4. **Read** — use the `read` tool on specific line ranges identified above
5. **Edit** — now you have full context to make safe changes

### Parameters

- `search_semantic`: `query` (req), `pathHints?`, `languageHints?`, `topK?`
- `get_file_skeleton`: `filePath` (req)
- `find_usages`: `symbolName` (req), `pathHint?`, `topK?`

### Tips

- Use `pathHints` to narrow searches to specific directories
- Use `languageHints` to filter by file type
- `find_usages` is essential before refactoring — it shows every reference
- If no results appear, the workspace may not be indexed yet — run `opencode-rag index`
