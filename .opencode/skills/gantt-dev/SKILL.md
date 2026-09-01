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

- **Rollup de %**: média SIMPLES das % das folhas descendentes. Mover OU
  redimensionar datas NÃO altera a % do pai; só mudar a % de uma folha recalcula.
- **Datas da raiz (envelope)**: o pai ACOMPANHA o filho quando ele ultrapassa o
  início/fim (só cresce) e VOLTA ao normal quando o filho retorna. NÃO remover
  esta regra sem o usuário pedir.
- Pais intermediários têm datas manuais; só a raiz deriva datas.
- Arrastar barra da raiz (pai de todos) é bloqueado com toast explicativo.
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
- **Falhas**: `this._treeW()` dentro de função comum (quebrou todo drag de barra);
  push com 301 por URL remota errada; senha com `@` quebrando a URL; remoção não
  solicitada da regra do envelope; tracking ref desatualizada após push por URL manual.