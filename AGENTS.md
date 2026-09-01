# AGENTS.md — GanttHierarquico

Regras rápidas para toda tarefa neste projeto. Detalhes completos e a
retrospectiva da esteira estão na skill **gantt-dev**
(`.opencode/skills/gantt-dev/SKILL.md`) — LEIA-A ao começar qualquer tarefa.

## Regras rápidas

1. **Simule antes de editar**: para mudanças em `store.js` (rollup, datas),
   carregue o store no Node e verifique o comportamento atual primeiro.
2. **Valide sintaxe**: `node --check <arquivo.js>` após cada edição de JS.
3. **Rollup de %**: só a RAIZ ("pai de todos") deriva — média simples da % de TODAS
   as tarefas descendentes (filhas, netas, tataranetas...), cada uma contando uma vez.
   Pais intermediários têm % MANUAL (desvinculada das filhas). Mover/redimensionar
   datas NÃO muda a %.
4. **Datas da raiz (envelope)**: o pai acompanha o filho que ultrapassa e volta
   ao normal quando o filho retorna. Não remover sem o usuário pedir.
5. **`this` em funções comuns** dentro de `_attachBarDrag` NÃO é o componente:
   use `chart`. Isso quebra todo o drag se errar.
6. **Geometria da coluna**: usar `chart._treeW()`, nunca o literal `360`.
7. **Push nos dois remotes**: `origin` (Forgejo `srm/ganttHierarquico`) e `github`.
   Credenciais: `$env:GCM_PROVIDER='generic'`; senha com `@` exige
   `[Uri]::EscapeDataString()`. Nunca force-push; se divergiu, faça merge.
8. **Não remover/alterar comportamento documentado** sem confirmar com o usuário.
9. Ao terminar a esteira, atualize a seção "Retrospectiva recente" da skill gantt-dev.