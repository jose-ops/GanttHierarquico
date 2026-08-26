/* ============== <gantt-modal> ============== */
(function(){
  'use strict';
  const S = window.GanttStore;

  class GanttModal extends HTMLElement {
    connectedCallback(){
      this.className = 'modal-overlay';
      this.innerHTML = `
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
              <label class="fld">Início <input id="f_start" type="date"></label>
              <label class="fld">Fim <input id="f_end" type="date"></label>
            </div>
            <div class="parent-note" id="parentNote" hidden>⚠️ Esta é uma Tarefa Pai: as datas e o progresso são calculados automaticamente a partir das Tarefas Filhas e não podem ser editados diretamente.</div>
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

      this.querySelector('#modalClose').onclick = ()=> this.close();
      this.querySelector('#modalCancel').onclick = ()=> this.close();
      this.querySelector('#modalSave').onclick = ()=> this._save();
      this.querySelector('#modalDelete').onclick = ()=> this._delete();
      this.querySelector('#m_add').onclick = ()=> this._addMessage();
      this.querySelector('#m_text').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); this._addMessage(); } });
      this.addEventListener('mousedown', e=>{ if(e.target===this) this.close(); });
    }

    open(opts={}){
      const taskId = (opts.taskId!=null) ? opts.taskId : null;
      const t = taskId!=null ? S.findTask(taskId) : null;
      this._state = {
        mode: t ? 'edit' : 'add',
        taskId,
        parentId: (opts.parentId!=null) ? opts.parentId : (t ? t.parentId : null),
        messages: t && Array.isArray(t.messages) ? t.messages.map(x=>({...x})) : []
      };

      this.querySelector('#modalTitle').textContent = t ? 'Editar tarefa' : 'Adicionar tarefa';
      this.querySelector('#f_name').value = t ? t.name : '';
      this.querySelector('#f_type').value = t ? t.type : 'task';
      this.querySelector('#f_progress').value = t ? t.progress : 0;
      this.querySelector('#f_start').value = t ? t.start : S.fmt(new Date());
      this.querySelector('#f_end').value = t ? t.end : S.fmt(S.addDays(new Date(),3));
      const a = t ? (Array.isArray(t.assignee) ? t.assignee : (t.assignee ? [t.assignee] : [])) : [];
      this.querySelector('#f_assignee').value = a.join(', ');

      const sel = this.querySelector('#f_parent');
      sel.innerHTML = '<option value="">— Nível superior —</option>';
      const exclude = new Set();
      if(t){ (function collect(i){ exclude.add(i); S.children(i).forEach(c=>collect(c.id)); })(t.id); }
      S.flatten().forEach(({task, depth})=>{
        if(exclude.has(task.id)) return;
        const o = document.createElement('option');
        o.value = task.id;
        o.textContent = (depth>0 ? '  '.repeat(depth) : '') + task.name;
        sel.appendChild(o);
      });
      sel.value = (opts.parentId!=null) ? String(opts.parentId)
                : (t && t.parentId!=null) ? String(t.parentId) : '';

      this.querySelector('#modalDelete').style.display = t ? 'flex' : 'none';

      // Tarefa Pai: datas/progresso são derivados — bloqueia edição direta // *******26/08/2026 alterar!!!
      const isParent = !!(t && S.hasChildren(t.id) && t.parentId === null);
      const fStart = this.querySelector('#f_start');
      const fEnd = this.querySelector('#f_end');
      const fProg = this.querySelector('#f_progress');
      const note = this.querySelector('#parentNote');
      note.hidden = !isParent;
      fStart.disabled = isParent;
      fEnd.disabled = isParent;
      fProg.disabled = isParent;
      const warn = ()=>{ if(isParent) this._toast('As datas e o progresso do Pai dependem estritamente do cronograma das Filhas.'); };
      fStart.onclick = warn; fEnd.onclick = warn; fProg.onclick = warn;
 
      this._renderMsgList();
      this.classList.add('open');
      setTimeout(()=> this.querySelector('#f_name').focus(), 30);
    }

    _toast(msg){
      this.dispatchEvent(new CustomEvent('gantt-toast', {detail: msg, bubbles: true}));
    }

    close(){
      this.classList.remove('open');
      this._state = null;
    }

    _renderMsgList(){ 
      const list = this.querySelector('#msgList');
      list.innerHTML = '';
      if(!this._state.messages.length){ list.innerHTML = '<div class="msg-empty">Nenhuma mensagem ainda.</div>'; return; }
      this._state.messages.forEach((msg, idx)=>{
        const k = S.MSG_KINDS[msg.kind] || S.MSG_KINDS.info;
        const row = document.createElement('div');
        row.className = 'msg-row';
        row.innerHTML = `
          <span class="msg-dot" style="background:${k.color}"></span>
          <span class="msg-kind" style="color:${k.color}">${k.label}</span>
          <span class="msg-text">${escapeHtml(msg.text)}</span>
          <button class="msg-del" data-idx="${idx}" title="Remover">✕</button>`;
        row.querySelector('.msg-del').onclick = ()=>{ this._state.messages.splice(idx,1); this._renderMsgList(); };
        list.appendChild(row);
      });
    }

    _addMessage(){ /// banco
      const kind = this.querySelector('#m_kind').value;
      const text = this.querySelector('#m_text').value.trim();
      if(!text) return;
      this._state.messages.push({ kind, text, date: S.fmt(new Date()) });
      this.querySelector('#m_text').value = '';
      this._renderMsgList();
      this.querySelector('#m_text').focus();
    }

    _save(){  // banco 
      const name = this.querySelector('#f_name').value.trim();
      if(!name){ this.querySelector('#f_name').focus(); return; }
      let start = this.querySelector('#f_start').value;
      let end = this.querySelector('#f_end').value;
      if(!start) start = S.fmt(new Date());
      if(!end) end = start;
      if(S.parseDate(end) < S.parseDate(start)) end = start;
      const type = this.querySelector('#f_type').value;
      let progress = parseInt(this.querySelector('#f_progress').value,10);
      if(isNaN(progress)) progress = 0;
      progress = Math.max(0, Math.min(100, progress));
      const assignee = this.querySelector('#f_assignee').value.split(',').map(s=>s.trim()).filter(Boolean);
      const parentVal = this.querySelector('#f_parent').value;
      const parentId = parentVal ? parseInt(parentVal,10) : null;

      // Só o "pai de todos" (raiz) preserva datas/progresso derivados.
      const isParentEdit = this._state.mode==='edit' && this._state.taskId!=null && (()=>{ const t=S.findTask(this._state.taskId); return t && S.hasChildren(t.id) && t.parentId===null; })();
      const data = { name, type, progress, assignee, parentId, messages: this._state.messages };
      if(!isParentEdit){
        data.start = start;
        data.end = end;
      }

      if(this._state.mode==='edit' && this._state.taskId!=null){
        S.updateTask(this._state.taskId, data);
      } else {
        S.addTask(Object.assign({ parentId, start, end }, data));
      }
      this.close();
    }

    _delete(){ // banco
      if(this._state && this._state.taskId!=null){
        const id = this._state.taskId;
        this.close();
        S.deleteTask(id);
      }
    }
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  customElements.define('gantt-modal', GanttModal);
})();
