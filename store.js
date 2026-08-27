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

  /* ---------- undo (pilha de snapshots) ---------- */
  let undoStack = [];
  function snapshot(){ undoStack.push(JSON.stringify(tasks)); if(undoStack.length>50) undoStack.shift(); }
  function undo(){ if(!undoStack.length) return; tasks = JSON.parse(undoStack.pop()); notify(); }

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
  /* Recalcula datas/progresso usando computeEffective():
      - O progresso de TODO pai (raiz OU intermediário) é DERIVADO (média ponderada)
        a partir de TODAS as suas folhas. Assim, ao alterar a % de uma folha (ex.: uma
        "neta"), todos os pais acima (intermediário e raiz) refletem a mudança.
      - As DATAS dos pais intermediários continuam MANUAIS (podem ser arrastados); só a
        raiz deriva datas (com envelope). A raiz inclui as datas do pai intermediário no
        seu envelope, reagindo quando este é movido.
      - REGRA DO ENVELOPE (só cresce) no pai de todos:
         início  = recua SÓ SE uma folha iniciar antes do início atual do pai
         término = avança SÓ SE uma folha terminar após o término atual do pai
       Mover uma folha para DENTRO do intervalo não altera o pai. */
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
        const e = { start: parseDate(node.start), end: parseDate(node.end), progress: node.progress, isGroup: false };
        effective[node.id] = e; return e;
      }
      let minC = null, maxC = null, total = 0, weight = 0;
      kids.forEach(k => {
        const ke = computeEffective(k);
        if (!minC || ke.start < minC) minC = ke.start;
        if (!maxC || ke.end > maxC) maxC = ke.end;
        const dur = dayDiff(ke.start, ke.end) + 1;
        total += ke.progress * dur; weight += dur;
      });
      // pais intermediários têm datas MANUAIS (podem ser arrastados): inclui as datas
      // do próprio nó no envelope para que o pai raiz reaja ao movê-los.
      // (a raiz em si é excluída para não criar realimentação/deriva acumulada)
      if (node.parentId !== null) {
        const ns = parseDate(node.start), ne = parseDate(node.end);
        if (!minC || ns < minC) minC = ns;
        if (!maxC || ne > maxC) maxC = ne;
      }
      const e = { start: minC, end: maxC, progress: weight > 0 ? Math.max(0, Math.min(100, Math.round(total / weight))) : 0, isGroup: true };
      effective[node.id] = e; return e;
    }

     // Deriva o progresso de TODOS os pais (raiz E intermediários) a partir dos
     // descendentes, para que ao alterar a % de uma folha (inclusive neta) todos os
     // pais acima reflitam a mudança. As datas dos pais intermediários continuam
     // manuais (podem ser arrastados); só a raiz deriva datas (com envelope).
     // Raízes com vínculo DESTRAVADO (manual=true) mantêm datas/progresso manuais.
     tasks.forEach(p => {
       if (!hasChildren(p.id)) return;
       if (p.manual) return;                      // destravado: mantém progresso manual
       const eff = computeEffective(p);
       p.progress = eff.progress;
     });

     // Aplica derivação de DATAS SOMENTE nas raízes ("pai de todos"). O envelope é a
     // UNIÃO do envelope inicial (capturado na 1ª vez = união das folhas, o "normal"
     // exibido) e das folhas atuais. Assim o pai acompanha quando uma folha ultrapassa,
     // mas VOLTA AO NORMAL quando a folha retorna para dentro do intervalo inicial
     // (não fica "grudado" expandido). Raízes destravadas (manual) mantêm datas manuais.
      (childrenMap['__root__'] || []).forEach(r => {
        if (!hasChildren(r.id)) return;            // raiz sem filhas: mantém manual
        if (r.manual) return;                      // destravado: não sobrescreve datas
        const eff = computeEffective(r);           // envelope de TODAS as folhas
        if (rootBaseline === null) rootBaseline = {};
        if (!rootBaseline[r.id]) {
          // 1ª vez: base = união do envelope das folhas COM as datas próprias
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
  /* Verifica se TODAS as folhas descendentes estão DENTRO do período [start,end]
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
    notify();
    return nt;
  }
  function updateTask(id, data) {
    const t = findTask(id);
    if (!t) return;
    snapshot();
    Object.assign(t, data);
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

  return {
    TYPE_LABEL, DOW, MONTHS, MSG_KINDS, AVATAR_PALETTE, avatarColor,
    subscribe, notify,
    parseDate, fmt, addDays, addMonths, dayDiff, getRange,
    children, hasChildren, findTask, isDescendant, flatten, recompute,
    reparent, nextId, deleteTask, addTask, updateTask, snapshot, undo,
    descendantsWithinRange,
    getTasks, getDayWidth, setDayWidth,
    setDragTaskId, getDragTaskId,
    isScrollDone, markScrollDone, toggleCollapse
  };
})();
