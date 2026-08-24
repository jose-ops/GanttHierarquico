/* ============== DADOS Ata reunião============== */
const tasks = [
  {id:1,  parentId:null, name:'Administração',                type:'epic',  start:'2026-08-24', end:'2026-09-04', progress:65, assignee:['AC','MP'], collapsed:false},
  {id:2,  parentId:1,    name:'Adm Filho 1',               type:'story', start:'2026-08-24', end:'2026-08-27', progress:100, assignee:'MP', collapsed:false},
  {id:3,  parentId:1,    name:'Adm Filho 2',               type:'story', start:'2026-08-27', end:'2026-09-01', progress:50, assignee:['JS','RL'], collapsed:false},
  {id:4,  parentId:3,    name:'Adm Filho 2',              type:'task',  start:'2026-08-28', end:'2026-08-31', progress:50, assignee:'JS', collapsed:false},
  
  {id:6,  parentId:null, name:'Cliente A',                    type:'epic',  start:'2026-09-02', end:'2026-09-16', progress:45, assignee:'RL', collapsed:false},
  {id:7,  parentId:6,    name:'Filho Cliente A ',      type:'story', start:'2026-09-02', end:'2026-09-06', progress:90, assignee:['RL','TB'], collapsed:false},
  {id:8,  parentId:6,    name:'Filho Cliente B',       type:'story', start:'2026-09-07', end:'2026-09-12', progress:40, assignee:'TB', collapsed:false},
  {id:9,  parentId:8,    name:'Filho Cliente B',       type:'task',  start:'2026-09-13', end:'2026-09-16', progress:0, assignee:['MP','DF'], collapsed:false},
  {id:10, parentId:6,    name:'Filho Cliente D     ',  type:'bug', start:'2026-09-09', end:'2026-09-10', progress:60, assignee:'RL', collapsed:false},

  {id:11, parentId:null, name:'Reunião de Desenvolvimento',                   type:'epic',  start:'2026-09-14', end:'2026-10-05', progress:15, assignee:['TB','DF','JS'], collapsed:false},
  {id:12, parentId:11,   name:'Autenticação e onboarding',         type:'story', start:'2026-09-14', end:'2026-09-20', progress:30, assignee:'DF', collapsed:false},
  {id:13, parentId:11,   name:'Tela principal e navegação',        type:'story', start:'2026-09-18', end:'2026-09-27', progress:10, assignee:['TB','DF'], collapsed:false},
  {id:14, parentId:13,   name:'Implementar tab bar',               type:'task',  start:'2026-09-18', end:'2026-09-21', progress:20, assignee:'TB', collapsed:false},
  {id:15, parentId:13,   name:'Integração com API de conteúdo',    type:'task',  start:'2026-09-21', end:'2026-09-27', progress:0, assignee:'DF', collapsed:false},
  {id:16, parentId:11,   name:'Crash ao rotacionar tela',          type:'bug',   start:'2026-09-22', end:'2026-09-23', progress:0, assignee:'DF', collapsed:false},
  {id:17, parentId:11,   name:'Notificações push',                 type:'story', start:'2026-09-27', end:'2026-10-05', progress:0, assignee:'JS', collapsed:false},

  {id:18, parentId:null, name:'Lançamento',                        type:'epic',  start:'2026-10-06', end:'2026-10-14', progress:0, assignee:['AC','MP'], collapsed:false},
  {id:19, parentId:18,   name:'Publicação nas lojas',               type:'task',  start:'2026-10-06', end:'2026-10-09', progress:0, assignee:'AC', collapsed:false},
  {id:20, parentId:18,   name:'Campanha de marketing',              type:'task',  start:'2026-10-08', end:'2026-10-14', progress:0, assignee:'MP', collapsed:false},
];

const TYPE_LABEL = {epic:'E', story:'S', task:'T', bug:'B'};
const DOW = ['D','S','T','Q','Q','S','S'];
const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

/* ============== ESTADO ============== */
let dayWidth = 36;
let dragTaskId = null;
let initialScrollDone = false;
