/* ============== STORE (estado + lógica) ============== */
/* Componente central de estado. Substitui data.js, date.js e tree.js.
   Os Web Components consomem este objeto via window.GanttStore. */
window.GanttStore = (function(){
  'use strict';

  const TYPE_LABEL = {epic:'E', story:'S', task:'T', bug:'B'};
  const DOW = ['D','S','T','Q','Q','S','S'];
  const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const MSG_KINDS = {
    info:    {label:'Info',    color:'#3b82f6'},
    warning: {label:'Aviso',   color:'#f59e0b'},
    danger:  {label:'Perigo',  color:'#ef4444'},
    success: {label:'Sucesso', color:'#22c55e'},
  };

  /* ---------- dados de exemplo (seed) ---------- */
  let tasks = [
    {id:1,  parentId:null, name:'Administração',                type:'epic',  start:'2026-08-24', end:'2026-09-04', progress:65, assignee:['AC','MP'], collapsed:false},
    {id:2,  parentId:1,    name:'Adm Filho 1',                  type:'story', start:'2026-08-24', end:'2026-08-27', progress:100, assignee:'MP', collapsed:false},
    {id:3,  parentId:1,    name:'Adm Filho 2',                  type:'story', start:'2026-08-27', end:'2026-09-01', progress:50, assignee:['JS','RL'], collapsed:false, messages:[
      {kind:'warning', text:'Atraso no review do cliente', date:'2026-08-25'},
      {kind:'info', text:'Aguardando aprovação do layout', date:'2026-08-26'}
    ]},
    {id:4,  parentId:3,    name:'Adm Filho 2',                 type:'task',  start:'2026-08-28', end:'2026-08-31', progress:50, assignee:'JS', collapsed:false},

    {id:6,  parentId:null, name:'Cliente A',                    type:'epic',  start:'2026-09-02', end:'2026-09-16', progress:45, assignee:'RL', collapsed:false},
    {id:7,  parentId:6,    name:'Filho Cliente A ',             type:'story', start:'2026-09-02', end:'2026-09-06', progress:90, assignee:['RL','TB'], collapsed:false},
    {id:8,  parentId:6,    name:'Filho Cliente B',              type:'story', start:'2026-09-07', end:'2026-09-12', progress:40, assignee:'TB', collapsed:false},
    {id:9,  parentId:8,    name:'Filho Cliente B',              type:'task',  start:'2026-09-13', end:'2026-09-16', progress:0, assignee:['MP','DF'], collapsed:false},
    {id:10, parentId:6,    name:'Filho Cliente D     ',         type:'bug',   start:'2026-09-09', end:'2026-09-10', progress:60, assignee:'RL', collapsed:false},

    {id:11, parentId:null, name:'Reunião de Desenvolvimento',   type:'epic',  start:'2026-09-14', end:'2026-10-05', progress:15, assignee:['TB','DF','JS'], collapsed:false},
    {id:12, parentId:11,   name:'Autenticação e onboarding',    type:'story', start:'2026-09-14', end:'2026-09-20', progress:30, assignee:'DF', collapsed:false},
    {id:13, parentId:11,   name:'Tela principal e navegação',   type:'story', start:'2026-09-18', end:'2026-09-27', progress:10, assignee:['TB','DF'], collapsed:false, messages:[
      {kind:'info', text:'Aguardando definição do design system', date:'2026-09-17'}
    ]},
    {id:14, parentId:13,   name:'Implementar tab bar',          type:'task',  start:'2026-09-18', end:'2026-09-21', progress:20, assignee:'TB', collapsed:false},
    {id:15, parentId:13,   name:'Integração com API de conteúdo',type:'task', start:'2026-09-21', end:'2026-09-27', progress:0, assignee:'DF', collapsed:false},
    {id:16, parentId:11,   name:'Crash ao rotacionar tela',     type:'bug',   start:'2026-09-22', end:'2026-09-23', progress:0, assignee:'DF', collapsed:false, messages:[
      {kind:'danger', text:'Crash reproduzido em produção (Android 13)', date:'2026-09-22'},
      {kind:'warning', text:'Impacta 12% dos usuários ativos', date:'2026-09-22'}
    ]},
    {id:17, parentId:11,   name:'Notificações push',            type:'story', start:'2026-09-27', end:'2026-10-05', progress:0, assignee:'JS', collapsed:false},

    {id:18, parentId:null, name:'Lançamento',                   type:'epic',  start:'2026-10-06', end:'2026-10-14', progress:0, assignee:['AC','MP'], collapsed:false},
    {id:19, parentId:18,   name:'Publicação nas lojas',         type:'task',  start:'2026-10-06', end:'2026-10-09', progress:0, assignee:'AC', collapsed:false},
    {id:20, parentId:18,   name:'Campanha de marketing',        type:'task',  start:'2026-10-08', end:'2026-10-14', progress:0, assignee:'MP', collapsed:false},
  ];

  let dayWidth = 36;
  let dragTaskId = null;
  let initialScrollDone = false;

  /* ---------- pub/sub (reatividade) ---------- */
  const subscribers = new Set();
  function subscribe(fn){ subscribers.add(fn); return ()=>subscribers.delete(fn); }
  function notify(){ subscribers.forEach(fn=>fn()); }

  /* ---------- helpers de data ---------- */
  function parseDate(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
  function fmt(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function addDays(d,n){ const r = new Date(d); r.setDate(r.getDate()+n); return r; }
  function addMonths(date,months){ const d = new Date(date); d.setMonth(d.getMonth()+months); return d; }
  function dayDiff(a,b){ return Math.round((b-a)/86400000); }
  function getRange(){
    let min=null, max=null;
    tasks.forEach(t=>{
      const s=parseDate(t.start), e=parseDate(t.end);
      if(!min || s<min) min=s;
      if(!max || e>max) max=e;
    });
    min = addMonths(min,-2); max = addMonths(max,2);
    return {min,max};
  }

  /* ---------- árvore ---------- */
  function children(id){ return tasks.filter(t=>t.parentId===id); }
  function hasChildren(id){ return tasks.some(t=>t.parentId===id); }
  function findTask(id){ return tasks.find(t=>t.id===id); }
  function isDescendant(ancestorId, taskId){
    let queue = children(ancestorId).map(c=>c.id);
    while(queue.length){
      const cur = queue.shift();
      if(cur===taskId) return true;
      queue.push(...children(cur).map(c=>c.id));
    }
    return false;
  }
  function flatten(){
    const out = [];
    (function walk(parentId, depth){
      children(parentId).forEach(t=>{
        out.push({task:t, depth});
        if(hasChildren(t.id) && !t.collapsed) walk(t.id, depth+1);
      });
    })(null, 0);
    return out;
  }
  function rollupProgress(){
    function compute(id){
      const kids = children(id);
      if(kids.length===0) return;
      let total=0, weight=0;
      kids.forEach(k=>{
        compute(k.id);
        const kk = findTask(k.id);
        const dur = dayDiff(parseDate(kk.start), parseDate(kk.end))+1;
        total += kk.progress * dur; weight += dur;
      });
      const t = findTask(id);
      t.progress = weight>0 ? Math.max(0, Math.min(100, Math.round(total/weight))) : 0;
    }
    children(null).forEach(t=> compute(t.id));
  }
  function reparent(taskId, newParentId){
    if(taskId===newParentId) return;
    if(newParentId!==null && isDescendant(taskId, newParentId)) return;
    const t = findTask(taskId);
    if(!t || t.parentId===newParentId) return;
    t.parentId = newParentId;
    if(newParentId!==null){ const p = findTask(newParentId); if(p) p.collapsed=false; }
    notify();
  }
  function nextId(){ return tasks.reduce((m,t)=>Math.max(m,t.id),0)+1; }
  function deleteTask(id){
    const toRemove = new Set();
    (function collect(i){ toRemove.add(i); children(i).forEach(c=>collect(c.id)); })(id);
    for(let i=tasks.length-1;i>=0;i--){ if(toRemove.has(tasks[i].id)) tasks.splice(i,1); }
    notify();
  }
  function addTask(data){
    const nt = Object.assign({ id: nextId(), collapsed:false, messages: [] }, data);
    tasks.push(nt);
    notify();
    return nt;
  }
  function updateTask(id, data){
    const t = findTask(id);
    if(!t) return;
    Object.assign(t, data);
    notify();
  }

  /* ---------- acesso ao estado ---------- */
  function getTasks(){ return tasks; }
  function getDayWidth(){ return dayWidth; }
  function setDayWidth(w){ dayWidth = Math.max(10, Math.min(160, w)); notify(); }
  function setDragTaskId(v){ dragTaskId = v; }
  function getDragTaskId(){ return dragTaskId; }
  function isScrollDone(){ return initialScrollDone; }
  function markScrollDone(){ initialScrollDone = true; }
  function toggleCollapse(id){
    const t = findTask(id);
    if(t && hasChildren(t.id)){ t.collapsed = !t.collapsed; notify(); }
  }

  return {
    TYPE_LABEL, DOW, MONTHS, MSG_KINDS,
    subscribe, notify,
    parseDate, fmt, addDays, addMonths, dayDiff, getRange,
    children, hasChildren, findTask, isDescendant, flatten, rollupProgress,
    reparent, nextId, deleteTask, addTask, updateTask,
    getTasks, getDayWidth, setDayWidth,
    setDragTaskId, getDragTaskId,
    isScrollDone, markScrollDone, toggleCollapse
  };
})();
