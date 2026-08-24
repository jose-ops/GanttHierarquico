/* ============== UI: Modal de tarefa + mensagens/avisos ============== */
const MSG_KINDS = {
  info:    {label:'Info',    color:'#3b82f6'},
  warning: {label:'Aviso',   color:'#f59e0b'},
  danger:  {label:'Perigo',  color:'#ef4444'},
  success: {label:'Sucesso', color:'#22c55e'},
};

let modal = null;
let modalState = null;

function ensureModal(){
  if(modal) return modal;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modalOverlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <span id="modalTitle">Adicionar tarefa</span>
        <button class="modal-x" id="modalClose" title="Fechar">✕</button>
      </div>
      <div class="modal-body">
        <label class="fld">Nome da tarefa
          <input id="f_name" type="text" placeholder="Ex.: Implementar login" autocomplete="off">
        </label>
        <div class="row2">
          <label class="fld">Tipo
            <select id="f_type">
              <option value="epic">Epic</option>
              <option value="story">Story</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
            </select>
          </label>
          <label class="fld">Progresso (%)
            <input id="f_progress" type="number" min="0" max="100" step="1">
          </label>
        </div>
        <div class="row2">
          <label class="fld">Início
            <input id="f_start" type="date">
          </label>
          <label class="fld">Fim
            <input id="f_end" type="date">
          </label>
        </div>
        <label class="fld">Responsáveis (separados por vírgula)
          <input id="f_assignee" type="text" placeholder="Ex.: AC, MP, JS" autocomplete="off">
        </label>
        <label class="fld">Tarefa pai (opcional)
          <select id="f_parent"><option value="">— Nível superior —</option></select>
        </label>

        <div class="msgs">
          <div class="msgs-head">Mensagens e avisos</div>
          <div id="msgList" class="msg-list"></div>
          <div class="msg-add">
            <select id="m_kind">
              <option value="info">Info</option>
              <option value="warning" selected>Aviso</option>
              <option value="danger">Perigo</option>
              <option value="success">Sucesso</option>
            </select>
            <input id="m_text" type="text" placeholder="Escreva uma mensagem ou aviso...">
            <button id="m_add" class="btn">＋ Add</button>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button id="modalDelete" class="btn danger">Excluir</button>
        <button id="modalCancel" class="btn">Cancelar</button>
        <button id="modalSave" class="btn primary">Salvar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  modal = overlay;

  overlay.querySelector('#modalClose').onclick = closeModal;
  overlay.querySelector('#modalCancel').onclick = closeModal;
  overlay.querySelector('#modalSave').onclick = saveTask;
  overlay.querySelector('#modalDelete').onclick = deleteCurrent;
  overlay.querySelector('#m_add').onclick = addMessage;
  overlay.querySelector('#m_text').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); addMessage(); } });
  overlay.addEventListener('mousedown', e=>{ if(e.target===overlay) closeModal(); });
  return overlay;
}

function openTaskModal(opts={}){
  const m = ensureModal();
  const taskId = (opts.taskId!=null) ? opts.taskId : null;
  const t = taskId!=null ? findTask(taskId) : null;
  modalState = {
    mode: t ? 'edit' : 'add',
    taskId,
    parentId: (opts.parentId!=null) ? opts.parentId : (t ? t.parentId : null),
    messages: t && Array.isArray(t.messages) ? t.messages.map(x=>({...x})) : []
  };

  m.querySelector('#modalTitle').textContent = t ? 'Editar tarefa' : 'Adicionar tarefa';
  m.querySelector('#f_name').value = t ? t.name : '';
  m.querySelector('#f_type').value = t ? t.type : 'task';
  m.querySelector('#f_progress').value = t ? t.progress : 0;
  m.querySelector('#f_start').value = t ? t.start : fmt(new Date());
  m.querySelector('#f_end').value = t ? t.end : fmt(addDays(new Date(), 3));
  const a = t ? (Array.isArray(t.assignee) ? t.assignee : (t.assignee ? [t.assignee] : [])) : [];
  m.querySelector('#f_assignee').value = a.join(', ');

  // popular select de pai (exclui a própria tarefa e seus descendentes)
  const sel = m.querySelector('#f_parent');
  sel.innerHTML = '<option value="">— Nível superior —</option>';
  const exclude = new Set();
  if(t){ (function collect(i){ exclude.add(i); children(i).forEach(c=>collect(c.id)); })(t.id); }
  flatten().forEach(({task, depth})=>{
    if(exclude.has(task.id)) return;
    const o = document.createElement('option');
    o.value = task.id;
    o.textContent = (depth>0 ? '  '.repeat(depth) : '') + task.name;
    sel.appendChild(o);
  });
  sel.value = (opts.parentId!=null) ? String(opts.parentId)
            : (t && t.parentId!=null) ? String(t.parentId) : '';

  m.querySelector('#modalDelete').style.display = t ? 'flex' : 'none';
  renderMsgList();
  m.classList.add('open');
  setTimeout(()=> m.querySelector('#f_name').focus(), 30);
}

function closeModal(){
  if(modal) modal.classList.remove('open');
  modalState = null;
}

function renderMsgList(){
  const list = modal.querySelector('#msgList');
  list.innerHTML = '';
  if(!modalState.messages.length){
    list.innerHTML = '<div class="msg-empty">Nenhuma mensagem ainda.</div>';
    return;
  }
  modalState.messages.forEach((msg, idx)=>{
    const k = MSG_KINDS[msg.kind] || MSG_KINDS.info;
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.innerHTML = `
      <span class="msg-dot" style="background:${k.color}"></span>
      <span class="msg-kind" style="color:${k.color}">${k.label}</span>
      <span class="msg-text">${escapeHtml(msg.text)}</span>
      <button class="msg-del" data-idx="${idx}" title="Remover">✕</button>`;
    row.querySelector('.msg-del').onclick = ()=>{
      modalState.messages.splice(idx,1);
      renderMsgList();
    };
    list.appendChild(row);
  });
}

function addMessage(){
  const kind = modal.querySelector('#m_kind').value;
  const text = modal.querySelector('#m_text').value.trim();
  if(!text) return;
  modalState.messages.push({ kind, text, date: fmt(new Date()) });
  modal.querySelector('#m_text').value = '';
  renderMsgList();
  modal.querySelector('#m_text').focus();
}

function saveTask(){
  const name = modal.querySelector('#f_name').value.trim();
  if(!name){ modal.querySelector('#f_name').focus(); return; }
  let start = modal.querySelector('#f_start').value;
  let end = modal.querySelector('#f_end').value;
  if(!start) start = fmt(new Date());
  if(!end) end = start;
  if(parseDate(end) < parseDate(start)) end = start;

  const type = modal.querySelector('#f_type').value;
  let progress = parseInt(modal.querySelector('#f_progress').value, 10);
  if(isNaN(progress)) progress = 0;
  progress = Math.max(0, Math.min(100, progress));

  const assigneeRaw = modal.querySelector('#f_assignee').value;
  const assignee = assigneeRaw.split(',').map(s=>s.trim()).filter(Boolean);
  const parentVal = modal.querySelector('#f_parent').value;
  const parentId = parentVal ? parseInt(parentVal,10) : null;

  if(modalState.mode==='edit' && modalState.taskId!=null){
    const t = findTask(modalState.taskId);
    if(t){
      t.name = name; t.type = type; t.start = start; t.end = end;
      t.progress = progress; t.assignee = assignee; t.parentId = parentId;
      t.messages = modalState.messages;
    }
  } else {
    const nt = {
      id: nextId(), parentId, name, type, start, end,
      progress, assignee, messages: modalState.messages, collapsed:false
    };
    tasks.push(nt);
  }
  closeModal();
  render();
}

function deleteCurrent(){
  if(modalState && modalState.taskId!=null){
    const id = modalState.taskId;
    closeModal();
    deleteTask(id);
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ============== INIT UI ============== */
function initUI(){
  const addBtn = document.getElementById('addTask');
  if(addBtn) addBtn.onclick = ()=> openTaskModal({mode:'add', parentId:null});
}
initUI();
