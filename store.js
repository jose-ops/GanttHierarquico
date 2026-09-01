/* ============== STORE (estado + lógica) ============== */
/* Componente central de estado. Substitui data.js, date.js e tree.js.
   Os Web Components consomem este objeto via window.GanttStore. */
window.GanttStore = (function () {
  'use strict';

  const TYPE_LABEL = { epic: 'E', story: 'S', task: 'T', bug: 'B' };
  const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MSG_KINDS = {
    info:    {label:'Info',    color:'#3b82f6'},
    warning: {label:'Aviso',   color:'#f59e0b'},
    danger:  {label:'Perigo',  color:'#ef4444'},
    success: {label:'Sucesso', color:'#22c55e'},
  };

  /* paleta de cores dos avatares de responsáveis (uma cor por pessoa) */
  const AVATAR_PALETTE = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#0ea5e9','#e11d48,   #776c41','#2f583e','#eab308','#7c3aed','#f43f5e','#0d9488','#f97316','#4f46e5','#65a30d','#0284c7','#be185d','#16a34a','#c2410c','#4338ca','#15803d'];
  const _avatarColorMap = new Map();
  let _avatarColorCursor = 0;
  function avatarColor(name){
    const key = String(name||'').trim();
    if(!_avatarColorMap.has(key)){
      _avatarColorMap.set(key, AVATAR_PALETTE[_avatarColorCursor % AVATAR_PALETTE.length]);
      _avatarColorCursor++;
    }
    return _avatarColorMap.get(key);
  }

  /* ---------- dados de exemplo (seed) ---------- */
  let tasks = [
    { id: 1, parentId: null, name: 'Administração', type: 'epic', start: '2026-08-29', end: '2026-09-04', progress: 65, assignee: ['AC', 'MP'], collapsed: false },
    
    { id: 2, parentId: 1, name: 'Adm Filho 1', type: 'story', start: '2026-08-24', end: '2026-08-27', progress: 100, assignee: 'MP', collapsed: false },
    {
      id: 3, parentId: 1, name: 'Adm Filho 2', type: 'story', start: '2026-08-27', end: '2026-09-01', progress: 50, assignee: ['JS', 'RL'], collapsed: false, messages: [
        { kind: 'warning', text: 'Atraso no review do cliente', date: '2026-08-25' },
        { kind: 'info', text: 'Aguardando aprovação do layout', date: '2026-08-26' }
      ]
    },
    { id: 4, parentId: 3, name: 'Adm Filho do filho', type: 'task', start: '2026-08-28', end: '2026-08-31', progress: 50, assignee: 'JS', collapsed: false },

    { id: 6, parentId: null, name: 'Cliente A', type: 'epic', start: '2026-09-02', end: '2026-09-16', progress: 45, assignee: 'RL', collapsed: false },
    { id: 7, parentId: 6, name: 'Filho Cliente A ', type: 'story', start: '2026-09-02', end: '2026-09-06', progress: 90, assignee: ['RL', 'TB'], collapsed: false },
    { id: 8, parentId: 6, name: 'Filho Cliente B', type: 'story', start: '2026-09-07', end: '2026-09-12', progress: 40, assignee: 'TB', collapsed: false },
    { id: 9, parentId: 8, name: 'Filho do filho B', type: 'task', start: '2026-09-13', end: '2026-09-16', progress: 0, assignee: ['MP', 'DF'], collapsed: false },
    { id: 10, parentId: 6, name: 'alerta!', type: 'bug', start: '2026-09-09', end: '2026-09-10', progress: 60, assignee: 'RL', collapsed: false },

    { id: 11, parentId: null, name: 'Reunião de Desenvolvimento', type: 'epic', start: '2026-09-14', end: '2026-10-05', progress: 15, assignee: ['TB', 'DF', 'JS'], collapsed: false },
    { id: 12, parentId: 11, name: 'Autenticação e onboarding', type: 'story', start: '2026-09-14', end: '2026-09-20', progress: 30, assignee: 'DF', collapsed: false },
    {
      id: 13, parentId: 11, name: 'Tela principal e navegação', type: 'story', start: '2026-09-18', end: '2026-09-27', progress: 10, assignee: ['TB', 'DF'], collapsed: false, messages: [
        { kind: 'info', text: 'Aguardando definição do design system', date: '2026-09-17' }
      ]
    },
    { id: 14, parentId: 13, name: 'Implementar tab bar', type: 'task', start: '2026-09-18', end: '2026-09-21', progress: 20, assignee: 'TB', collapsed: false },
    { id: 15, parentId: 13, name: 'Integração com API de conteúdo', type: 'task', start: '2026-09-21', end: '2026-09-27', progress: 0, assignee: 'DF', collapsed: false },
    {
      id: 16, parentId: 11, name: 'atraso', type: 'bug', start: '2026-09-22', end: '2026-09-26', progress: 0, assignee: 'DF', collapsed: false, messages: [
        { kind: 'danger', text: 'Crash reproduzido em produção (Android 13)', date: '2026-09-22' },
        { kind: 'warning', text: 'Impacta 12% dos usuários ativos', date: '2026-09-22' }
      ]
    },
    { id: 17, parentId: 11, name: 'Notificações push', type: 'story', start: '2026-09-27', end: '2026-10-05', progress: 0, assignee: 'JS', collapsed: false },

    { id: 18, parentId: null, name: 'Lançamento', type: 'epic', start: '2026-10-06', end: '2026-10-14', progress: 0, assignee: ['AC', 'MP'], collapsed: false },
    { id: 19, parentId: 18, name: 'Publicação nas lojas', type: 'task', start: '2026-10-06', end: '2026-10-09', progress: 0, assignee: 'AC', collapsed: false },
    { id: 20, parentId: 18, name: 'Campanha de marketing', type: 'task', start: '2026-10-08', end: '2026-10-14', progress: 0, assignee: 'MP', collapsed: false },
  ];

  let dayWidth = 36;
  let dragTaskId = null;
  let initialScrollDone = false;
  let treeVisible = true;

  /* ---------- undo (pilha de snapshots) ---------- */
  let undoStack = [];
  function snapshot(){ undoStack.push(JSON.stringify(tasks)); if(undoStack.length>50) undoStack.shift(); }
  function undo(){
    if(!undoStack.length) return;
    tasks = JSON.parse(undoStack.pop());
    // descarta o baseline do envelope para que a recompute o re-capture a partir do
    // estado restaurado (sem isso, desfazer a edição de datas de uma raiz não voltava)
    rootBaseline = null;
    notify();
  }

  /* ---------- pub/sub (reatividade) ---------- */
  const subscribers = new Set();
  function subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
  function notify() { subscribers.forEach(fn => fn()); }

  /* ---------- helpers de data ---------- */
  function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function fmt(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function addMonths(date, months) { const d = new Date(date); d.setMonth(d.getMonth() + months); return d; }
  function dayDiff(a, b) { return Math.round((b - a) / 86400000); }
  function getRange() {
    let min = null, max = null;
    tasks.forEach(t => {
      const s = parseDate(t.start), e = parseDate(t.end);
      if (!min || s < min) min = s;
      if (!max || e > max) max = e;
    });
    if (min === null) {   // nenhuma tarefa: range seguro em torno de hoje
      const today = new Date(); today.setHours(0, 0, 0, 0);
      return { min: addDays(today, -30), max: addDays(today, 30) };
    }
    min = addMonths(min, -2); max = addMonths(max, 2);
    return { min, max };
  }

  /* ---------- árvore ---------- */
  function children(id) { return tasks.filter(t => t.parentId === id); }
  function hasChildren(id) { return tasks.some(t => t.parentId === id); }
  function findTask(id) { return tasks.find(t => t.id === id); }
  function isDescendant(ancestorId, taskId) {
    let queue = children(ancestorId).map(c => c.id);
    while (queue.length) {
      const cur = queue.shift();
      if (cur === taskId) return true;
      queue.push(...children(cur).map(c => c.id));
    }
    return false;
  }
  function flatten() {
    const out = [];
    (function walk(parentId, depth) {
      children(parentId).forEach(t => {
        out.push({ task: t, depth });
        if (hasChildren(t.id) && !t.collapsed) walk(t.id, depth + 1);
      });
    })(null, 0);
    return out;
  }
  /* Ancestral raiz ("pai de todos") de uma tarefa, ou null se a tarefa é raiz. */
  function rootAncestorOf(id) {
    let cur = findTask(id);
    if (!cur || cur.parentId === null) return null;
    while (cur.parentId !== null) {
      cur = findTask(cur.parentId);
      if (!cur) return null;
    }
    return cur;
  }
  /* Descarta o "normal" (baseline) do envelope da raiz para que uma edição manual
     das datas da raiz se torne a nova base. Chamado ao editar datas da raiz
     (modal ou drag); na próxima recompute o envelope re-captura o baseline. */
  function resetRootBaseline(id) {
    const r = rootAncestorOf(id) || findTask(id);
    if (!r || r.parentId !== null || rootBaseline === null) return;
    if (rootBaseline[r.id] !== undefined) delete rootBaseline[r.id];
  }
  /* Recalcula datas/progresso usando computeEffective():
      - PROGRESSO: folhas e pais INTERMEDIÁRIOS são MANUAIS (a % de um pai
        intermediário NÃO é derivada das % das filhas/netas — desvinculada). Só a RAIZ
        ("pai de todos") deriva: média simples da % de TODAS as tarefas descendentes
        (filhas, netas, tataranetas...), cada uma contando uma vez, em qualquer nível.
      - As DATAS dos pais intermediários continuam MANUAIS (podem ser arrastados); só a
        raiz deriva datas (com envelope). A raiz inclui as datas do pai intermediário no
        seu envelope, reagindo quando este é movido.
      - REGRA DO ENVELOPE (só cresce) no pai de todos:
         início  = recua SÓ SE uma filha iniciar antes do início atual do pai
         término = avança SÓ SE uma filha terminar após o término atual do pai
       Mover uma filha para DENTRO do intervalo não altera o pai.
      - As DATAS da raiz são EDITÁVEIS (modal/drag): ao editar manualmente, o baseline
        do envelope é descartado (resetRootBaseline) e a nova data vira o "normal".
        Se uma filha ultrapassar esse normal, a raiz acompanha (envelope). */
  // datas ORIGINAIS (cadastradas no início) de cada pai raiz — base do envelope
  let rootBaseline = null;
  function recompute() {
    const byId = {}; tasks.forEach(t => byId[t.id] = t);
    const childrenMap = {};
    tasks.forEach(t => {
      const key = t.parentId == null ? '__root__' : t.parentId;
      (childrenMap[key] || (childrenMap[key] = [])).push(t);
    });
    const effective = {};
    function computeEffective(node) {
      if (effective[node.id]) return effective[node.id];
      const kids = childrenMap[node.id] || [];
      if (!kids.length) {
        const e = { start: parseDate(node.start), end: parseDate(node.end), progress: node.progress, isGroup: false, leafCount: 1 };
        effective[node.id] = e; return e;
      }
      let minC = null, maxC = null, total = 0, weight = 0, leafCount = 0;
      kids.forEach(k => {
        const ke = computeEffective(k);
        if (!minC || ke.start < minC) minC = ke.start;
        if (!maxC || ke.end > maxC) maxC = ke.end;
        // progresso do grupo = MÉDIA SIMPLES das % das filhas descendentes.
        // Mover OU redimensionar datas NÃO altera a % do pai; só a alteração da
        // % de uma folha é que recalcula o progresso dos pais acima.
        const n = ke.leafCount != null ? ke.leafCount : 1;
        leafCount += n;
        total += ke.progress * n; weight += n;
      });
      // pais intermediários têm datas MANUAIS (podem ser arrastados): inclui as datas
      // do próprio nó no envelope para que o pai raiz reaja ao movê-los.
      // (a raiz em si é excluída para não criar realimentação/deriva acumulada)
      if (node.parentId !== null) {
        const ns = parseDate(node.start), ne = parseDate(node.end);
        if (!minC || ns < minC) minC = ns;
        if (!maxC || ne > maxC) maxC = ne;
      }
      const e = { start: minC, end: maxC, progress: weight > 0 ? Math.max(0, Math.min(100, Math.round(total / weight))) : 0, isGroup: true, leafCount };
      effective[node.id] = e; return e;
    }

     // Progresso: folhas e pais INTERMEDIÁRIOS são MANUAIS — a % de um pai
     // intermediário NÃO deriva das % das filhas/netas (desvinculada). Só a RAIZ
     // ("pai de todos") deriva: média simples da % de TODAS as tarefas descendentes
     // (filhas, netas, tataranetas...), cada uma contando uma vez, em qualquer nível.
     (childrenMap['__root__'] || []).forEach(r => {
       if (!hasChildren(r.id) || r.manual) return;   // raiz sem filhas ou destravada: manual
       const desc = [];
       (function collect(i){ (childrenMap[i] || []).forEach(c => { desc.push(c); collect(c.id); }); })(r.id);
       const sum = desc.reduce((s, t) => s + t.progress, 0);
       r.progress = desc.length ? Math.max(0, Math.min(100, Math.round(sum / desc.length))) : r.progress;
     });

     // Aplica derivação de DATAS SOMENTE nas raízes ("pai de todos"). O envelope é a
     // UNIÃO do envelope inicial (capturado na 1ª vez = união das filhas, o "normal"
     // exibido) e das filhas atuais. Assim o pai acompanha quando uma filha ultrapassa,
     // mas VOLTA AO NORMAL quando a filha retorna para dentro do intervalo inicial
     // (não fica "grudado" expandido). Uma edição manual das datas da raiz TRAVADA
     // descarta o baseline (resetRootBaseline) e vira o novo normal. Raízes destravadas
     // (manual) mantêm datas manuais.
      (childrenMap['__root__'] || []).forEach(r => {
        if (!hasChildren(r.id)) return;            // raiz sem filhas: mantém datas manuais
        if (r.manual) return;                      // destravado: não sobrescreve datas
        const eff = computeEffective(r);           // envelope de TODAS as filhas
        if (rootBaseline === null) rootBaseline = {};
        if (!rootBaseline[r.id]) {
          // 1ª vez: base = união do envelope das filhas COM as datas próprias
          // cadastradas do pai. Assim, ao criar um filho, o pai NÃO perde a data
          // que foi informada (o envelope só cresce a partir desse normal).
          const rs = parseDate(r.start), re = parseDate(r.end);
          rootBaseline[r.id] = {
            start: eff.start < rs ? eff.start : rs,
            end:   eff.end   > re ? eff.end   : re
          };
        }
        const base = rootBaseline[r.id];
        const start = eff.start < base.start ? eff.start : base.start;
        const end   = eff.end > base.end   ? eff.end   : base.end;
        r.start = fmt(start);
        r.end = fmt(end);
      });
  }
  function reparent(taskId, newParentId) {
    if (taskId === newParentId) return;
    if (newParentId !== null && isDescendant(taskId, newParentId)) return;
    const t = findTask(taskId);
    if (!t || t.parentId === newParentId) return;
    snapshot();
    t.parentId = newParentId;
    if (newParentId !== null) { const p = findTask(newParentId); if (p) p.collapsed = false; }
    notify();
  }
  function nextId() { return tasks.reduce((m, t) => Math.max(m, t.id), 0) + 1; }
  /* Verifica se TODAS as filhas descendentes estão DENTRO do período [start,end]
     do pai. Usado ao "travar" novamente o vínculo (regra original). */
  function descendantsWithinRange(id) {
    const p = findTask(id);
    if (!p) return { total: 0, outside: 0, all: true };
    const ps = parseDate(p.start), pe = parseDate(p.end);
    let total = 0, outside = 0;
    (function walk(i) {
      children(i).forEach(c => {
        if (hasChildren(c.id)) walk(c.id);
        else {
          total++;
          if (parseDate(c.start) < ps || parseDate(c.end) > pe) outside++;
        }
      });
    })(id);
    return { total, outside, all: total > 0 ? outside === 0 : true };
  }
  /* União das datas de TODAS as descendentes (não inclui o próprio nó).
     Retorna { start, end } como Dates, ou null se não há descendentes. */
  function descendantsRange(id) {
    let min = null, max = null;
    (function walk(i) {
      children(i).forEach(c => {
        const s = parseDate(c.start), e = parseDate(c.end);
        if (!min || s < min) min = s;
        if (!max || e > max) max = e;
        if (hasChildren(c.id)) walk(c.id);
      });
    })(id);
    return { start: min, end: max };
  }
  function deleteTask(id) {
    snapshot();
    const toRemove = new Set();
    (function collect(i) { toRemove.add(i); children(i).forEach(c => collect(c.id)); })(id);
    for (let i = tasks.length - 1; i >= 0; i--) { if (toRemove.has(tasks[i].id)) tasks.splice(i, 1); }
    notify();
  }
  function addTask(data) {
    snapshot();
    const nt = Object.assign({ id: nextId(), collapsed: false, messages: [] }, data);
    tasks.push(nt);
    // expande o pai para a nova tarefa não nascer escondida em um grupo colapsado
    if (nt.parentId !== null) { const p = findTask(nt.parentId); if (p) p.collapsed = false; }
    notify();
    return nt;
  }
  function updateTask(id, data) {
    const t = findTask(id);
    if (!t) return;
    const datesChanged = (data.start !== undefined && data.start !== t.start) || (data.end !== undefined && data.end !== t.end);
    snapshot();
    Object.assign(t, data);
    // edição manual de datas de uma raiz vira o novo "normal" do envelope
    if (datesChanged && t.parentId === null && hasChildren(t.id)) resetRootBaseline(t.id);
    notify();
  }

  /* ---------- acesso ao estado ---------- */
  function getTasks() { return tasks; }
  function getDayWidth() { return dayWidth; }
  function setDayWidth(w) { dayWidth = Math.max(10, Math.min(160, w)); notify(); }
  function setDragTaskId(v) { dragTaskId = v; }
  function getDragTaskId() { return dragTaskId; }
  function isScrollDone() { return initialScrollDone; }
  function markScrollDone() { initialScrollDone = true; }
  function toggleCollapse(id) {
    const t = findTask(id);
    if (t && hasChildren(t.id)) { t.collapsed = !t.collapsed; notify(); }
  }
  function isTreeVisible() { return treeVisible; }
  function setTreeVisible(v) { treeVisible = v; notify(); }

  return {
    TYPE_LABEL, DOW, MONTHS, MSG_KINDS, AVATAR_PALETTE, avatarColor,
    subscribe, notify,
    parseDate, fmt, addDays, addMonths, dayDiff, getRange,
    children, hasChildren, findTask, isDescendant, flatten, recompute,
    rootAncestorOf, resetRootBaseline,
    reparent, nextId, deleteTask, addTask, updateTask, snapshot, undo,
    descendantsWithinRange, descendantsRange,
    getTasks, getDayWidth, setDayWidth,
    setDragTaskId, getDragTaskId,
    isScrollDone, markScrollDone, toggleCollapse,
    isTreeVisible, setTreeVisible
  };
})();
