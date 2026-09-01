/* ============== <gantt-chart> ============== */
/* Renderiza o grid (cabeçalho, dropzone, células de árvore, barras,
   linha do hoje e conectores) e trata zoom, pan, drag e drop. */
(function(){
  'use strict';
  const S = window.GanttStore; 

  class GanttChart extends HTMLElement {
    connectedCallback(){
      this.className = 'scrollwrap';
      this._ensureGrid();
      this._ensureTreeToggle();
      if(!this._subscribed){
        this._unsub = S.subscribe(()=> this.renderChart());
        this._subscribed = true;
      }
      this._bindInteractions();
      this.renderChart();
    }

    disconnectedCallback(){
      if(this._unsub){ this._unsub(); this._unsub = null; this._subscribed = false; }
    }
    _ensureTreeToggle(){
      if(this._treeToggle) return;
      const btn = document.createElement('button');
      btn.className = 'tree-toggle';
      btn.title = 'Mostrar/esconder a lista de tarefas';
      btn.innerHTML = '<span class="line"></span><span class="line"></span><span class="line"></span>';
      btn.addEventListener('click', ()=>{
        S.setTreeVisible(!S.isTreeVisible());
        const chart = document.querySelector('gantt-chart');
        if(chart) chart.scrollToToday();
      });
      document.body.appendChild(btn);
      this._treeToggle = btn;
      this._updateTreeTogglePos();
    }

    _updateTreeTogglePos(){
      const btn = this._treeToggle;
      if(!btn) return;
      const hidden = !S.isTreeVisible();
      btn.classList.toggle('collapsed', hidden);
      // âncora no topo, alinhado com a primeira linha de tarefas (abaixo do cabeçalho),
      // para nunca ficar "flutuando no meio" da tela
      const r = this.getBoundingClientRect();
      const headerH = 28+28+34;
      btn.style.top = (r.top + headerH) + 'px';
      btn.style.transform = 'none';
    }

    _ensureGrid(){
      if(!this._grid){
        this._grid = document.createElement('div');
        this._grid.className = 'grid';
        this.appendChild(this._grid);
      }
      return this._grid;
    }


    /* ---- API de navegação ---- */
    _treeW(){
      return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tree-w')) || 0;
    }

    scrollToDay(idx){
      const x = this._treeW() + idx*S.getDayWidth() + S.getDayWidth()/2;
      this.scrollLeft = Math.max(0, x - this.clientWidth/2);
    }

    scrollToToday(){
      const {min} = S.getRange();
      const today = new Date(); today.setHours(0,0,0,0);
      const idx = S.dayDiff(min, today);
      if(idx>=0) this.scrollToDay(idx);
    }


    _openModal(opts){
      this.dispatchEvent(new CustomEvent('gantt-open-modal', {detail: opts, bubbles: true}));
    }

    _toast(msg){
      this.dispatchEvent(new CustomEvent('gantt-toast', {detail: msg, bubbles: true}));
    }

    /* ---- render principal **ATENÇÃO** ---- */
    renderChart(){
      const grid = this._grid;
      // preserva o foco no filtro de busca caso o render ocorra durante a digitação
      const refocusFilter = !!(grid.querySelector && grid.querySelector('input.filter-input') === document.activeElement);
      grid.innerHTML = '';
      document.documentElement.style.setProperty('--tree-w', S.isTreeVisible() ? '360px' : '0px');
      this.classList.toggle('tree-hidden', !S.isTreeVisible());
      this._updateTreeTogglePos();
      const {min,max} = S.getRange();
      const numDays = S.dayDiff(min,max)+1;
      const flat = S.flatten();
      let rows = flat;
      if(this._filterRaw){
        const f = this._filterRaw.trim().toLowerCase();
        const visible = new Set();
        const visit = (id)=>{
          const t = S.findTask(id);
          let ok = t.name.toLowerCase().includes(f);
          S.children(id).forEach(c=>{ if(visit(c.id)) ok = true; });
          if(ok) visible.add(id);
          return ok;
        };
        S.children(null).forEach(r=> visit(r.id));
        rows = flat.filter(r=> visible.has(r.task.id));
      }
      const N = rows.length;
      S.recompute();

      grid.style.gridTemplateColumns = `var(--tree-w) repeat(${numDays}, ${S.getDayWidth()}px)`;
      grid.style.gridTemplateRows = `28px 28px 34px repeat(${N}, var(--row-h))`;

      const today = new Date(); today.setHours(0,0,0,0);
      const todayIdx = S.dayDiff(min, today);

      // canto superior esquerdo (título + filtro de busca)
      const corner = document.createElement('div');
      corner.className = 'head-corner';
      const title = document.createElement('span');
      title.className = 'corner-title';
      title.textContent = `Tarefas (${S.getTasks().length})`;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'filter-input';
      input.placeholder = 'Buscar…';
      input.value = this._filterRaw || '';
      input.addEventListener('input', e=>{ this._filterRaw = e.target.value; this.renderChart(); });
      input.addEventListener('keydown', e=> e.stopPropagation());
      input.addEventListener('mousedown', e=> e.stopPropagation());
      corner.append(title, input);
      grid.appendChild(corner);
      if(refocusFilter){ input.focus(); const v = input.value; input.setSelectionRange(v.length, v.length); }

      // cabeçalho de mês
      let dayCursor = 0;
      while(dayCursor < numDays){
        const d = S.addDays(min, dayCursor);
        const monthIdx = d.getMonth(), year = d.getFullYear();
        let span = 0;
        while(dayCursor+span < numDays){
          const dd = S.addDays(min, dayCursor+span);
          if(dd.getMonth()!==monthIdx || dd.getFullYear()!==year) break;
          span++;
        }
        const el = document.createElement('div');
        el.className = 'head-month';
        el.style.gridColumn = `${2+dayCursor} / span ${span}`;
        el.style.gridRow = '1';
        el.textContent = `${S.MONTHS[monthIdx]} ${year}`;
        grid.appendChild(el);
        dayCursor += span;
      }

      // cabeçalho de dia
      for(let i=0;i<numDays;i++){
        const d = S.addDays(min,i);
        const isWeekend = d.getDay()===0 || d.getDay()===6;
        const isToday = S.dayDiff(today,d)===0;
        const el = document.createElement('div');
        el.className = 'head-day' + (isWeekend?' weekend':'') + (isToday?' today':'');
        el.style.gridColumn = String(2+i);
        el.style.gridRow = '2';
        el.innerHTML = `<span class="num">${d.getDate()}</span><span class="dow">${S.DOW[d.getDay()]}</span>`;
        grid.appendChild(el);
      }

      // dropzone "nível superior"
      const dz = document.createElement('div');
      dz.className = 'dropzone';
      dz.style.gridRow = '3';
      dz.innerHTML = `<span class="ic">🏠</span><span>Nível superior — solte aqui para desvincular do pai</span>`;
      dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drop-hover'); });
      dz.addEventListener('dragleave', ()=> dz.classList.remove('drop-hover'));
      dz.addEventListener('drop', e=>{
        e.preventDefault(); dz.classList.remove('drop-hover');
        const id = S.getDragTaskId();
        if(id!==null) S.reparent(id, null);
      });
      grid.appendChild(dz);

      const rowMeta = {};
      rows.forEach((item, rowIndex) => {
        const t = item.task;
        const gridRow = 4 + rowIndex;
        rowMeta[t.id] = {rowIndex, depth:item.depth};
        const tc = this._buildTreeCell(t, item.depth, gridRow);
        grid.appendChild(tc);

        // células de fundo por dia
        for(let i=0;i<numDays;i++){
          const d = S.addDays(min,i);
          const isWeekend = d.getDay()===0 || d.getDay()===6;
          const dc = document.createElement('div');
          dc.className = 'day-cell' + (isWeekend?' weekend':'');
          dc.style.gridColumn = String(2+i);
          dc.style.gridRow = String(gridRow);
          grid.appendChild(dc);
        }

        // barra
        const s = S.parseDate(t.start), e = S.parseDate(t.end);
        const startIdx = S.dayDiff(min,s), endIdx = S.dayDiff(min,e);
        rowMeta[t.id].startIdx = startIdx; rowMeta[t.id].endIdx = endIdx;
        const span = Math.max(1, endIdx-startIdx+1);
        const bar = document.createElement('div');
        bar.className = 'bar ' + t.type;
        bar.style.gridColumn = `${2+startIdx} / span ${span}`;
        bar.style.gridRow = String(gridRow);
        bar.title = `${t.name}\n${t.start} → ${t.end}\nProgresso: ${t.progress}%`;
        bar.dataset.id = t.id;

        const fill = document.createElement('div'); fill.className='fill'; fill.style.width = t.progress+'%';
        const label = document.createElement('div'); label.className='label' + (span*S.getDayWidth()<70?' outside':''); label.textContent = t.name;
        const pct = document.createElement('div'); pct.className='pct'; pct.textContent = t.progress+'%';
        const knob = document.createElement('div'); knob.className='prog-knob'; knob.style.left = t.progress+'%';
        const hl = document.createElement('div'); hl.className='handle l';
        const hr = document.createElement('div'); hr.className='handle r';
        bar.append(fill, label, pct, knob, hl, hr);
        this._attachBarDrag(bar, t, hl, hr, fill, knob, pct);
        bar.addEventListener('dblclick', ev=>{ ev.stopPropagation(); this._openModal({mode:'edit', taskId:t.id}); });
        grid.appendChild(bar);
      });

      // linha do hoje
      if(todayIdx>=0 && todayIdx<numDays){
        const headerH = 28+28+34;
        const totalH = headerH + N*44;
        const line = document.createElement('div');
        line.className='today-line';
        line.style.left = (this._treeW() + todayIdx*S.getDayWidth() + S.getDayWidth()/2)+'px';
        line.style.height = totalH+'px';
        grid.appendChild(line);
        const flag = document.createElement('div');
        flag.className='today-flag';
        flag.style.left = (this._treeW() + todayIdx*S.getDayWidth() + S.getDayWidth()/2)+'px';
        flag.textContent='HOJE';
        grid.appendChild(flag);
      }

      // conectores hierárquicos
      const headerH = 28+28+34; // altura do cabeçalho (meses + dias + dropzone)
      const totalW = this._treeW() + numDays*S.getDayWidth();
      const totalH = headerH + N*44;
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('class','connectors');
      svg.setAttribute('width', totalW);
      svg.setAttribute('height', totalH);
      rows.forEach(item=>{
        const t = item.task;
        if(t.parentId===null) return;
        const pm = rowMeta[t.parentId], cm = rowMeta[t.id];
        if(!pm || !cm) return;
        const ax = this._treeW() + pm.startIdx*S.getDayWidth() + 10;
        const ay = headerH + pm.rowIndex*44 + 22;
        const bx = this._treeW() + cm.startIdx*S.getDayWidth() + 10;
        const by = headerH + cm.rowIndex*44 + 22;
        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d', `M ${ax} ${ay} C ${ax-14} ${ay}, ${ax-14} ${by}, ${bx-6} ${by}`);
        path.setAttribute('fill','none');
        const typeVar = {epic:'--epic', story:'--story', task:'--task', bug:'--bug'}[t.type] || '--connector';
        path.setAttribute('stroke', getComputedStyle(document.documentElement).getPropertyValue(typeVar).trim() || '#C9CDEA');
        path.setAttribute('stroke-width','1.5');
        svg.appendChild(path);
      });
      grid.appendChild(svg);

      // scroll inicial para hoje (uma vez)
      if(!S.isScrollDone() && todayIdx>=0 && todayIdx<numDays){
        const x = this._treeW() + todayIdx*S.getDayWidth() + S.getDayWidth()/2;
        this.scrollLeft = Math.max(0, x - this._treeW() - S.getDayWidth()*2);
        S.markScrollDone();
      }
    }

    _buildTreeCell(t, depth, gridRow){
      const S = window.GanttStore;
      const tc = document.createElement('div');
      tc.className = 'tree-cell';
      tc.style.gridColumn = '1';
      tc.style.gridRow = String(gridRow);
      tc.draggable = true;
      tc.dataset.id = t.id;

      const indent = document.createElement('div'); indent.className='indent'; indent.style.width = (depth*18)+'px';
      const twisty = document.createElement('div');
      twisty.className = 'twisty' + (S.hasChildren(t.id)?'':' empty');
      twisty.textContent = S.hasChildren(t.id) ? (t.collapsed?'▸':'▾') : '';
      twisty.addEventListener('click', e=>{ e.stopPropagation(); S.toggleCollapse(t.id); });
      const handle = document.createElement('div'); handle.className='drag-handle'; handle.textContent='⋮⋮';
      const chip = document.createElement('div'); chip.className='type-chip'; chip.style.background = `var(--${t.type})`; chip.textContent = S.TYPE_LABEL[t.type];

      // badges de mensagens
      const msgs = Array.isArray(t.messages) ? t.messages : [];
      if(msgs.length){
        const counts = {};
        msgs.forEach(m=> counts[m.kind]=(counts[m.kind]||0)+1);
        const bWrap = document.createElement('div'); bWrap.className='msg-badges';
        Object.keys(counts).forEach(kind=>{
          const k = S.MSG_KINDS[kind] || S.MSG_KINDS.info;
          const b = document.createElement('span');
          b.className = 'msg-badge ' + kind;
          b.textContent = counts[kind];
          b.title = 'Mensagens:\n' + msgs.filter(m=>m.kind===kind).map(m=>'• '+m.text).join('\n');
          b.onclick = ev=>{ ev.stopPropagation(); this._openModal({mode:'edit', taskId:t.id}); };
          bWrap.appendChild(b);
        });
        chip.appendChild(bWrap);
      }

      const nm = document.createElement('div'); nm.className='name'; nm.textContent = t.name; nm.title = t.name;

      tc.append(indent, twisty, handle, chip, nm);

      if(t.parentId!==null){
        const parent = S.findTask(t.parentId);
        const ptag = document.createElement('div'); ptag.className='parent-tag';
        ptag.textContent = '↳ ' + (parent ? parent.name.split(' ').slice(0,2).join(' ') : '');
        const ub = document.createElement('button'); ub.className='unlink-btn'; ub.title='Desvincular da tarefa pai'; ub.textContent='✕';
        ub.addEventListener('click', e=>{ e.stopPropagation(); S.reparent(t.id, null); });
        tc.append(ptag, ub);
      }

      const assignees = Array.isArray(t.assignee) ? t.assignee : (t.assignee ? [t.assignee] : []);
      const avWrap = document.createElement('div'); avWrap.className='avatars';
      assignees.forEach((a,i)=>{
        const av = document.createElement('div'); av.className='avatar'+(i>0?' stacked':''); av.textContent=a; av.title=a;
        av.style.background = S.avatarColor(a);
        avWrap.appendChild(av);
      });
      tc.appendChild(avWrap);

      // ações da linha
      const acts = document.createElement('div'); acts.className='row-actions';
      const addBtn = document.createElement('button'); addBtn.className='row-btn add'; addBtn.title='Adicionar subtarefa'; addBtn.textContent='＋';
      addBtn.onclick = e=>{ e.stopPropagation(); this._openModal({mode:'add', parentId:t.id}); };
      const editBtn = document.createElement('button'); editBtn.className='row-btn edit'; editBtn.title='Editar tarefa'; editBtn.textContent='✎';
      editBtn.onclick = e=>{ e.stopPropagation(); this._openModal({mode:'edit', taskId:t.id}); };
      acts.append(addBtn, editBtn);
      tc.appendChild(acts);

      // arrastar para reparentar
      tc.addEventListener('dragstart', e=>{
        S.setDragTaskId(t.id); tc.classList.add('dragging');
        e.dataTransfer.effectAllowed='move'; e.dataTransfer.setData('text/plain', String(t.id));
      });
      tc.addEventListener('dragend', ()=>{ tc.classList.remove('dragging'); S.setDragTaskId(null); });
      tc.addEventListener('dragover', e=>{
        e.preventDefault();
        const id = S.getDragTaskId();
        if(id===null || id===t.id) return;
        const valid = !S.isDescendant(id, t.id);
        tc.classList.toggle('drop-valid', valid);
        tc.classList.toggle('drop-invalid', !valid);
      });
      tc.addEventListener('dragleave', ()=> tc.classList.remove('drop-valid','drop-invalid'));
      tc.addEventListener('drop', e=>{
        e.preventDefault(); tc.classList.remove('drop-valid','drop-invalid');
        const id = S.getDragTaskId();
        if(id!==null) S.reparent(id, t.id);
      });

      return tc;
    }


    /* ---- drag da barra (mover/redimensionar/progresso) ---- */
    _attachBarDrag(bar, t, hl, hr, fill, knob, pct){
      const S = window.GanttStore;
      const chart = this;
      function startDrag(mode, e){
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX;
        const origStart = S.parseDate(t.start);
        const origEnd = S.parseDate(t.end);
        const rangeMin = S.getRange().min;
        const treeW = chart._treeW();
        const barLeft0 = bar.getBoundingClientRect().left;
        bar.style.transition = 'none';
        function onMove(ev){
          const deltaDays = Math.round((ev.clientX - startX)/S.getDayWidth());
          let newStart = origStart, newEnd = origEnd;
          if(mode==='move'){
            const dMin = -S.dayDiff(rangeMin, origStart);
            const dMax = S.dayDiff(origEnd, S.getRange().max);
            // a barra pode ir livremente até onde o mouse indicar; só não pode
            // atravessar a coluna de tarefas (posição absoluta dentro do grid)
            const gridLeft = bar.closest('.grid').getBoundingClientRect().left;
            const origAbsLeft = barLeft0 - gridLeft;
            const minTranslateDays = Math.ceil((treeW - origAbsLeft) / S.getDayWidth());
            let eff = Math.max(dMin, deltaDays);
            eff = Math.min(eff, dMax);
            eff = Math.max(eff, minTranslateDays);
            newStart = S.addDays(origStart, eff);
            newEnd = S.addDays(origEnd, eff);
            bar.style.transform = `translateX(${eff*S.getDayWidth()}px)`;
          } else if(mode==='resize-l'){
            newStart = S.addDays(origStart, deltaDays);
            if(newStart >= origEnd) newStart = S.addDays(origEnd,-1);
            if(newStart < rangeMin) newStart = rangeMin;
          } else if(mode==='resize-r'){
            newEnd = S.addDays(origEnd, deltaDays);
            if(newEnd <= origStart) newEnd = S.addDays(origStart,1);
          }
          bar.dataset.pendingStart = S.fmt(newStart);
          bar.dataset.pendingEnd = S.fmt(newEnd);
          bar.style.outline = '2px solid rgba(76,95,255,.6)';
        }
        function onUp(){
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          bar.style.outline = '';
          if(bar.dataset.pendingStart){
            S.snapshot();
            t.start = bar.dataset.pendingStart;
            t.end = bar.dataset.pendingEnd;
            delete bar.dataset.pendingStart; delete bar.dataset.pendingEnd;
            // datas da raiz são editáveis: a edição vira o novo "normal" do envelope
            if(S.hasChildren(t.id) && t.parentId === null) S.resetRootBaseline(t.id);
            // tarefa filha/neta que ultrapassa a raiz: o pai acompanha (com aviso)
            if(t.parentId !== null){
              const root = S.rootAncestorOf(t.id);
              if(root){
                const rs = S.parseDate(root.start), re = S.parseDate(root.end);
                const ss = S.parseDate(t.start), ee = S.parseDate(t.end);
                const warns = [];
                if(ss < rs) warns.push(`início (${t.start}) é anterior ao início (${root.start})`);
                if(ee > re) warns.push(`fim (${t.end}) é posterior ao fim (${root.end})`);
                if(warns.length){
                  chart._toast('⚠️ O ' + warns.join(' e o ') + ` da Tarefa Pai “${root.name}”. O período do pai será ajustado para acompanhar.`);
                }
              }
            }
            chart.renderChart();
          } 
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      }
      function startProgressDrag(e){
        if(S.hasChildren(t.id) && t.parentId === null){
          e.preventDefault();
          const onFirstMove = () => {
            chart._toast('O progresso da Tarefa Pai é calculado automaticamente (média simples das Filhas).');
            document.removeEventListener('mousemove', onFirstMove);
          };
          const cleanup = () => {
            document.removeEventListener('mousemove', onFirstMove);
            document.removeEventListener('mouseup', cleanup);
          };
          document.addEventListener('mousemove', onFirstMove);
          document.addEventListener('mouseup', cleanup);
          return;
        }
        e.preventDefault(); e.stopPropagation();
        const rect = bar.getBoundingClientRect();
        const origProgress = t.progress;
        fill.style.transition = 'none';
        function onMove(ev){
          let p = Math.round(((ev.clientX - rect.left)/rect.width)*100);
          p = Math.max(0, Math.min(100, p));
          t.progress = p; fill.style.width = p+'%'; knob.style.left = p+'%'; pct.textContent = p+'%';
          bar.title = `${t.name}\n${t.start} → ${t.end}\nProgresso: ${p}%`;
        }
        function onUp(){
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if(t.progress !== origProgress) S.snapshot();
          chart.renderChart();
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      }
      bar.addEventListener('mousedown', e=>{
        if(e.ctrlKey) return;
        if(e.target===hl || e.target===hr || e.target===knob) return;
        startDrag('move', e);
      });
      hl.addEventListener('mousedown', e=>{ if(e.ctrlKey) return; startDrag('resize-l', e); });
      hr.addEventListener('mousedown', e=>{ if(e.ctrlKey) return; startDrag('resize-r', e); });
      knob.addEventListener('mousedown', e=>{ if(e.ctrlKey) return; startProgressDrag(e); });
    }


    /* ---- zoom (Ctrl+scroll) e pan (Ctrl+arrastar) ---- */
    _bindInteractions(){
      if(this._interactionsBound) return;
      this._interactionsBound = true;
      const chart = this;

      chart.addEventListener('wheel', e=>{
        if(!e.ctrlKey) return;
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const old = S.getDayWidth();
        const next = Math.min(160, Math.max(10, old + dir*6));
        if(next === old) return;
        const rect = chart.getBoundingClientRect();
        const cursorX = e.clientX - rect.left + chart.scrollLeft;
        const dateIdx = (cursorX - chart._treeW()) / old;
        S.setDayWidth(next);
        const newX = chart._treeW() + dateIdx*next + next/2;
        chart.scrollLeft = newX - (e.clientX - rect.left);
      }, {passive:false});

      chart.addEventListener('mousedown', e=>{
        if(!e.ctrlKey) return;
        if(e.target.closest('.tree-cell')) return;
        e.preventDefault();
        const sx = e.clientX, sy = e.clientY;
        const sl = chart.scrollLeft, st = chart.scrollTop;
        const move = ev=>{ chart.scrollLeft = sl - (ev.clientX - sx); chart.scrollTop = st - (ev.clientY - sy); };
        const up = ()=>{
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', up);
          chart.style.cursor=''; document.body.style.userSelect='';
        };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
        chart.style.cursor='grabbing'; document.body.style.userSelect='none';
      });
    }

  }

  customElements.define('gantt-chart', GanttChart);
})();
