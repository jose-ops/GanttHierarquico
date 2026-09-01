---
name: gantt-dev
description: Use quando trabalhar no projeto GanttHierarquico — features, bugs, refatoracoes, drag de barras, rollup, datas, git push/commit. Contem a retrospectiva da esteira de implementacao e testes, com regras e licoes para mitigar falhas de forma ciclica.
---

# GanttHierarquico — Esteira de implementação e testes

App web (HTML/CSS/JS puro, sem build) de Gantt hierárquico. Componentes:
`store.js` (estado/rollup), `gantt-chart.js` (timeline/drag), `gantt-toolbar.js`,
`gantt-modal.js`, `gantt-fab.js`, `gantt-app.js`, `styles.css`.

## Fluxo obrigatório ao começar uma tarefa

1. **Leia o `AGENTS.md`** do projeto (regras rápidas) e depois esta skill.
2. **Antes de editar JS, simule a lógica no Node** com `node -e`/pipe de script
   carregando `store.js` (`global.window = global; require('.../store.js')`).
   Valide o comportamento ATUAL antes de tocar no código.
3. Após cada edição de `.js`, rode `node --check <arquivo>`.
4. A cada mudança relevante: `git add` dos arquivos certos, commit pequeno com
   mensagem clara, push para **os dois remotes** (`origin`=Forgejo e `github`).

## Verificação do push (não confie em "Everything up-to-date")

- "Everything up-to-date" pode aparecer mesmo com falha de auth. Confirme no
  output: `To http://...  <sha1>..<sha2> main -> main`, ou cheque o servidor/API.
- Push via URL manual NÃO atualiza a tracking ref `origin/main`. Depois rode
  `git fetch origin` (ou push via `origin`) para sincronizar.

## Credenciais (GCM) e remotes

- O GCM do Windows alterna entre a credencial boa (`jose.guimaraes`) e um JWT
  OAuth expirado (`OAUTH_USER`). Forçar o provider resolve:
  `$env:GCM_PROVIDER='generic'` e `-c credential.http://192.168.10.8:3000.provider=generic`.
- Remote canônico (sem redirect): `http://192.168.10.8:3000/srm/ganttHierarquico.git`.
  Qualquer outra URL causa redirect 301 e falha "RPC failed".
- Senha com caracteres especiais (`!@`) na URL do push: aplicar
  `[Uri]::EscapeDataString()` no usuário e senha.
- Antes de push em repo já existente: `git fetch <remote>` e comparar
  (`git log <remote>/main..main`). Se divergiu, use merge — NUNCA force-push.

## Regras de negócio do app (não quebrar)

- **Rollup de %**: só a RAIZ ("pai de todos") deriva — média SIMPLES da % de TODAS
  as tarefas descendentes (filhas, netas, tataranetas...), cada uma contando uma vez.
  Pais INTERMEDIÁRIOS têm % MANUAL (desvinculada das filhas/netas). Mover OU
  redimensionar datas NÃO altera a % do pai.
- **Datas da raiz (envelope)**: o pai ACOMPANHA o filho quando ele ultrapassa o
  início/fim (só cresce) e VOLTA ao normal quando o filho retorna. NÃO remover
  esta regra sem o usuário pedir.
- Pais intermediários têm datas manuais; só a raiz deriva datas.
- Drag da barra da raiz é liberado (edita as datas; o envelope acompanha filhas que
  ultrapassam, com aviso). Knob de progresso só é bloqueado na raiz vinculada.
- Data de início nunca pode ser maior que a final (inputs com min/max + guard no save).
- Coluna de tarefas colapsável: `--tree-w` 360px/0px; usar `chart._treeW()`
  (helper único) em TODA geometria que dependia do literal `360`.

## Lições da retrospectiva (falhas e como mitigar)

1. **`this` em função comum quebra o drag** — `startDrag`/`startProgressDrag`
   em `_attachBarDrag` são funções comuns: `this` NÃO é o componente. Use a
   variável capturada `chart` (nunca `this`). Checar se a função é arrow ou não.
2. **Não remover feature documentada sem pedir** — removi a regra do envelope
   por uma reclamação ambígua e o usuário cobrou de volta. Ao reportar um
   comportamento "errado", primeiro simule e CONFIRME a regra desejada com o
   usuário; se exagerou, reverta rápido.
3. **Semântica de controle**: o '✕' lateral era "desvincular" e o usuário queria
   "excluir". Confirmar a intenção de botões/ícones, não só o tooltip.
4. **Geometria centralizada**: espalhar `360` quebrou o colapso da coluna.
   Centralizar em helper único (`_treeW()`) e evitar literais.
5. **Constraints de drag devem usar coordenadas do grid**, não da viewport
   (`minTranslateDays` usava `getBoundingClientRect` da viewport e forçava a
   barra a "pular" / não mover para a esquerda).
6. **Ciclo aprendizado**: ao fim de cada esteira, atualizar esta skill com o
   que falhou/acertou (seção "Retrospectiva recente" abaixo), para mitigar a
   recorrência nas próximas execuções.

## Retrospectiva recente

- **Acertos**: simular rollup no Node antes de editar; `node --check` após edições;
  remote canônico + provider generic para push; reverter rápido quando houve overreach.
- **Esteira (datas da raiz "sem trava")**: a pedido do usuário, a raiz passou a ter
  datas EDITÁVEIS. A edição manual descarta o baseline do envelope (`resetRootBaseline`)
  e vira o novo "normal"; filha que ultrapassa ainda faz o pai acompanhar — com AVISO
  (toast) ao salvar no modal ou arrastar a barra. Regra início<=fim mantida; drag da
  barra da raiz liberado. **Depois restaurado a pedido do usuário**: opção de
  DESVINCULAR o pai das filhas (botão "🔓 Destravar vínculo" + flag `manual`):
  destravado = datas e progresso 100% manuais (pai não acompanha); travar exige filhas
  dentro do período (`descendantsWithinRange`).
- **QA (bugs encontrados e corrigidos)**: (1) UNDO de edição de datas da raiz não
  voltava — `undo()` não limpava o `rootBaseline`; fix: `rootBaseline = null` no undo.
  (2) Drag do knob de progresso em pai intermediário "voltava" — fix: bloquear
  `startProgressDrag` para qualquer pai (salvo `manual`). (3) Nova subtarefa sob pai
  colapsado nascia invisível — `addTask` agora expande o pai. (4) Apagar todas as
  tarefas deixava timeline em 1969/1970 (`new Date(null)`) — `getRange` vazio usa hoje
  ± 30 dias.
- **Coluna lateral responsiva**: com muitas tarefas/filhos, a coluna de 360px cortava
  avatares e ícones de edição. Fix: largura dinâmica por conteúdo (`--tree-w` calculado
  por `scrollWidth` das `.tree-cell`, teto 360–720px / 50% do chart), avatares limitados
  a 3 + "+N" e indentação limitada a 5 níveis. Geometria continua via `chart._treeW()`.
- **Status Pendente**: adicionado status "Pendente" para folha com progresso 0% e fim
  dentro do prazo (não atrasada). Prioridade de grupo: Atrasado > Pendente > Concluído >
  Em andamento (pendente quando TODAS as folhas estão pendentes). Cores: #64748b.
- **Rollup desvinculado dos intermediários**: a pedido do usuário, pais intermediários
  deixaram de derivar a % das filhas/netas (agora MANUAIS). Só a raiz deriva: média
  simples da % de TODAS as descendentes (filhas, netas, tataranetas), cada uma uma vez.
  Removida a propagação setLeaves no modal; knob de progresso liberado para intermediários.
- **Falhas**: `this._treeW()` dentro de função comum (quebrou todo drag de barra);
  push com 301 por URL remota errada; senha com `@` quebrando a URL; remoção não
  solicitada da regra do envelope; tracking ref desatualizada após push por URL manual.