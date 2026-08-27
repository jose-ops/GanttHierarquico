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
              <div class="bind-row" id="bindRow" hidden>
                <button id="bindToggle" class="btn" type="button">🔒 Travar vínculo com filhas</button>
              </div>
              <button id="openRel" class="btn" type="button" hidden>🔗 Ver filhas e relacionamentos</button>
           </div>
          <div class="modal-foot">
            <button id="modalDelete" class="btn danger">Excluir</button>
            <button id="modalCancel" class="btn">Cancelar</button>
              <button id="modalSave" class="btn primary">Salvar</button>
            </div>
          </div>
          <div class="rel-overlay" id="relOverlay" hidden>
            <div class="rel-modal">
              <div class="modal-head">
                <span>Filhas e relacionamentos</span>
                <button class="modal-x" id="relClose" title="Fechar">✕</button>
              </div>
              <div class="rel-body" id="relBody"></div>
            </div>
          </div>`;

      this.querySelector('#modalClose').onclick = ()=> this.close();
      this.querySelector('#modalCancel').onclick = ()=> this.close();
      this.querySelector('#modalSave').onclick = ()=> this._save();
      this.querySelector('#modalDelete').onclick = ()=> this._delete();
      this.querySelector('#m_add').onclick = ()=> this._addMessage();
      this.querySelector('#m_text').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); this._addMessage(); } });
      this.querySelector('#openRel').onclick = ()=> this._openRel();
      this.querySelector('#bindToggle').onclick = ()=> this._onBindToggle();
      this.querySelector('#relClose').onclick = ()=>{ this.querySelector('#relOverlay').hidden = true; };
      this.querySelector('#relOverlay').addEventListener('mousedown', e=>{ if(e.target===this.querySelector('#relOverlay')) this.querySelector('#relOverlay').hidden = true; });
      this.addEventListener('mousedown', e=>{ if(e.target===this) this.close(); });
      if(!this._escHandler){
        this._escHandler = e=>{
          if(e.key !== 'Escape') return;
          const rel = this.querySelector('#relOverlay');
          if(rel && !rel.hidden){ rel.hidden = true; return; }
          if(this.classList.contains('open')) this.close();
        };
        document.addEventListener('keydown', this._escHandler);
      }
    }

    open(opts={}){
      const taskId = (opts.taskId!=null) ? opts.taskId : null;
      const t = taskId!=null ? S.findTask(taskId) : null;
      this._state = {
        mode: t ? 'edit' : 'add',
        taskId,
        parentId: (opts.parentId!=null) ? opts.parentId : (t ? t.parentId : null),
        messages: t && Array.isArray(t.messages) ? t.messages.map(x=>({...x})) : [],
        progress0: t ? t.progress : 0,
        manual: !!(t && t.manual)
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

      // Tarefa Pai (raiz): vínculo com as filhas (travado = deriva datas/progresso;
      // destravado = manual). Botão de configuração para alternar.
      const isParent = !!(t && S.hasChildren(t.id) && t.parentId === null);
      const isRootCtx = isParent || (this._state.mode === 'add' && this._state.parentId == null);
      const locked = isParent && !this._state.manual;
      const fStart = this.querySelector('#f_start');
      const fEnd = this.querySelector('#f_end');
      const fProg = this.querySelector('#f_progress');
      const note = this.querySelector('#parentNote');
      const bindRow = this.querySelector('#bindRow');
      const bindBtn = this.querySelector('#bindToggle');

      bindRow.hidden = !isRootCtx;
      bindBtn.textContent = this._state.manual ? '🔒 Travar vínculo com filhas' : '🔓 Destravar vínculo com filhas';

      note.hidden = !isParent;
      if(isParent){
        note.textContent = locked
          ? '⚠️ Tarefa Pai travada: as datas e o progresso são calculados automaticamente a partir das Filhas e não podem ser editados diretamente.'
          : '🔓 Vínculo destravado: as datas e o progresso são manuais e NÃO são calculados a partir das Filhas.';
      }
      fStart.disabled = locked;
      fEnd.disabled = locked;
      fProg.disabled = locked;
      const warn = ()=>{ if(locked) this._toast('As datas e o progresso do Pai travado dependem estritamente do cronograma das Filhas.'); };
      fStart.onclick = warn; fEnd.onclick = warn; fProg.onclick = warn;

      // botão de filhas/avisos/relacionamentos (só pai raiz existente)
      this.querySelector('#openRel').hidden = !isParent;
      this.querySelector('#relOverlay').hidden = true;

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

    _openRel(){
      this._relStatusFilter = 'todos';
      this._renderRelTree();
      this.querySelector('#relOverlay').hidden = false;
    }

    _onBindToggle(){
      const st = this._state;
      if(!st) return;
      const willManual = !st.manual;   // true = vai destravar; false = vai travar

      if(st.mode === 'edit' && st.taskId != null){
        const t = S.findTask(st.taskId);
        if(!t) return;
        if(willManual){
          // DESTRAVAR: libera edição manual de datas/progresso
          t.manual = true; st.manual = true; S.notify();
          this._toast('Vínculo destravado: as datas e o progresso desta Tarefa Pai agora são manuais e NÃO serão calculados a partir das Filhas.');
        } else {
          // TRAVAR de novo: exige que todas as filhas estejam DENTRO do período do pai
          const chk = S.descendantsWithinRange(t.id);
          if(chk.total > 0 && !chk.all){
            this._toast('Para travar o vínculo novamente (voltar a derivar das Filhas), primeiro organize TODAS as tarefas filhas dentro do período do pai, conforme a regra original. Há ' + chk.outside + ' fora do intervalo.');
            return; // mantém destravado
          }
          t.manual = false; st.manual = false; S.notify();
          this._toast('Vínculo travado: datas e progresso voltarão a ser calculados automaticamente a partir das Filhas.');
        }
      } else {
        // modo add: só define o estado futuro da nova tarefa raiz e avisa
        st.manual = willManual;
        if(willManual){
          this._toast('Ao destravar o vínculo, esta nova Tarefa Pai manterá datas e progresso manuais mesmo após receber filhas.');
        } else {
          this._toast('Ao travar o vínculo, as datas e o progresso desta Tarefa Pai serão calculados automaticamente a partir das Filhas (regra original).');
        }
      }

      // atualiza rótulo do botão e estado dos campos
      const bindBtn = this.querySelector('#bindToggle');
      bindBtn.textContent = st.manual ? '🔒 Travar vínculo com filhas' : '🔓 Destravar vínculo com filhas';
      const lockedNow = st.mode === 'edit' && !st.manual;
      this.querySelector('#f_start').disabled = lockedNow;
      this.querySelector('#f_end').disabled = lockedNow;
      this.querySelector('#f_progress').disabled = lockedNow;
      const note = this.querySelector('#parentNote');
      if(note && !note.hidden){
        note.textContent = lockedNow
          ? '⚠️ Tarefa Pai travada: as datas e o progresso são calculados automaticamente a partir das Filhas e não podem ser editados diretamente.'
          : '🔓 Vínculo destravado: as datas e o progresso são manuais e NÃO são calculados a partir das Filhas.';
      }
    }

    _renderRelTree(){
      const root = S.findTask(this._state.taskId);
      if(!root) return;
      const rootStart = S.parseDate(root.start), rootEnd = S.parseDate(root.end);
      const today = new Date(); today.setHours(0,0,0,0);
      const isLate = t => t.progress < 100 && S.parseDate(t.end) < today;
      const STATUS = {
        atrasado:     { label:'Atrasado',     cls:'st-atrasado' },
        concluido:    { label:'Concluído',    cls:'st-concluido' },
        em_andamento: { label:'Em andamento', cls:'st-em_andamento' },
      };
      /* Status de grupo — regra por prioridade:
         1) se QUALQUER descendente estiver "atrasado"   -> atrasado
         2) senão, se TODOS estiverem "concluido"        -> concluido
         3) senão (há algo não-concluído e nada atrasado)-> em_andamento
         Folha (sem filhos) mantém o próprio status. */
      function groupStatusOf(id){
        const t = S.findTask(id);
        if(!S.hasChildren(id)){
          if(isLate(t)) return 'atrasado';
          if(t.progress >= 100) return 'concluido';
          return 'em_andamento';
        }
        const leaves = [];
        (function collect(i){ S.children(i).forEach(c=>{ if(S.hasChildren(c.id)) collect(c.id); else leaves.push(c); }); })(id);
        if(leaves.some(isLate)) return 'atrasado';
        if(leaves.length && leaves.every(l=> l.progress >= 100)) return 'concluido';
        return 'em_andamento';
      }
      // status de uma folha (usado na filtragem)
      function leafStatusOf(t){
        if(isLate(t)) return 'atrasado';
        if(t.progress >= 100) return 'concluido';
        return 'em_andamento';
      }

      const body = this.querySelector('#relBody');
      body.innerHTML = '';

      // filtro por status
      const filterRow = document.createElement('div');
      filterRow.className = 'rel-filter';
      filterRow.innerHTML = `<label>Filtrar por status:
        <select id="relStatusFilter">
          <option value="todos">Todos</option>
          <option value="atrasado">Atrasado</option>
          <option value="concluido">Concluído</option>
          <option value="em_andamento">Em andamento</option>
        </select></label>`;
      body.appendChild(filterRow);
      const sel = filterRow.querySelector('#relStatusFilter');
      sel.value = this._relStatusFilter || 'todos';
      sel.addEventListener('change', e=>{ this._relStatusFilter = e.target.value; this._renderRelTree(); });

      // legenda da regra exibida no topo do painel
      const legend = document.createElement('div');
      legend.className = 'rel-legend';
      legend.innerHTML = `<b>Status do grupo (por prioridade):</b>
        <span><i class="dot st-atrasado"></i> <b>Atrasado</b> — se <b>qualquer</b> descendente está atrasado</span>
        <span><i class="dot st-concluido"></i> <b>Concluído</b> — se <b>todos</b> os descendentes estão concluídos</span>
        <span><i class="dot st-em_andamento"></i> <b>Em andamento</b> — caso contrário</span>`;
      body.appendChild(legend);

      const makeCard = (c, isRoot)=>{
        const cs = S.parseDate(c.start), ce = S.parseDate(c.end);
        const outOfRange = cs < rootStart || ce > rootEnd;
        const st = groupStatusOf(c.id);
        const stInfo = STATUS[st];
        const msgs = Array.isArray(c.messages) ? c.messages : [];
        const card = document.createElement('div');
        card.className = 'rel-card' + (isRoot ? ' is-root' : '');
        let h = `<div class="rel-card-top">
            <span class="child-name">${escapeHtml(c.name)}</span>
            <span class="child-type" style="background:var(--${c.type})">${S.TYPE_LABEL[c.type]}</span>
            <span class="child-range">${c.start} → ${c.end}</span>
            <span class="child-prog">${c.progress}%</span>
            <span class="child-status ${stInfo.cls}">${stInfo.label}</span>
          </div>`;
        if(outOfRange){
          h += `<div class="child-msgs"><div class="child-msg"><span class="msg-dot" style="background:var(--today)"></span><b style="color:var(--today)">Fora do prazo</b>: esta tarefa está fora do intervalo da tarefa pai.</div></div>`;
        }
        if(msgs.length){
          h += '<div class="child-msgs">';
          msgs.forEach(m=>{
            const k = S.MSG_KINDS[m.kind] || S.MSG_KINDS.info;
            h += `<div class="child-msg"><span class="msg-dot" style="background:${k.color}"></span><b style="color:${k.color}">${k.label}</b>: ${escapeHtml(m.text)}</div>`;
          });
          h += '</div>';
        }
        card.innerHTML = h;
        return card;
      };

      const build = (id, isRoot)=>{
        const c = S.findTask(id);
        const kids = S.children(id);
        // filtra folhas por status; grupo fica visível se tiver algum filho visível
        const filt = this._relStatusFilter || 'todos';
        const visibleKids = [];
        kids.forEach(ch=>{
          const kn = build(ch.id, false);
          if(kn) visibleKids.push(kn);
        });
        const isLeaf = kids.length === 0;
        let show = true;
        if(filt !== 'todos'){
          if(isLeaf) show = leafStatusOf(c) === filt;
          else show = visibleKids.length > 0;
        }
        if(!show && !isRoot) return null;   // a raiz sempre permanece visível (contexto)
        const node = document.createElement('div');
        node.className = 'rel-node';
        node.appendChild(makeCard(c, isRoot));
        if(visibleKids.length){
          const kidsWrap = document.createElement('div');
          kidsWrap.className = 'rel-kids';
          visibleKids.forEach(k=> kidsWrap.appendChild(k));
          node.appendChild(kidsWrap);
        }
        return node;
      };

      const tree = document.createElement('div');
      tree.className = 'rel-tree';
      if(!S.children(root.id).length){
        tree.innerHTML = '<div class="msg-empty">Esta tarefa não possui filhas.</div>';
      } else {
        tree.appendChild(build(root.id, true));
      }
      body.appendChild(tree);
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

      // Só o "pai de todos" (raiz) travado preserva datas/progresso derivados;
      // destravado (manual) ou tarefa normal permite edição.
      const isParentEdit = this._state.mode==='edit' && this._state.taskId!=null && (()=>{ const t=S.findTask(this._state.taskId); return t && S.hasChildren(t.id) && t.parentId===null; })();
      const locked = isParentEdit && !this._state.manual;
      const data = { name, type, assignee, parentId, messages: this._state.messages };
      if(!locked){
        data.start = start;
        data.end = end;
        data.progress = progress;
      }
      // flag de vínculo: relevante só para tarefas raiz
      const isRootCtx = isParentEdit || (this._state.mode==='add' && parentId == null);
      if(isRootCtx) data.manual = !!this._state.manual;

      if(this._state.mode==='edit' && this._state.taskId!=null){
        S.updateTask(this._state.taskId, data);
        // pai intermediário: a % é derivada das folhas, então propagate a edição
        // para os descendentes folha para que o roll-up até o pai raiz reflita a mudança
        const id = this._state.taskId;
        const tt = S.findTask(id);
        if(tt && S.hasChildren(id) && tt.parentId !== null && progress !== this._state.progress0){
          (function setLeaves(i){
            S.children(i).forEach(c=>{
              if(S.hasChildren(c.id)) setLeaves(c.id);
              else c.progress = progress;
            });
          })(id);
          S.notify();
        }
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
