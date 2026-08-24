/* ============== RENDER ============== */
function render(){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  const {min,max} = getRange();
  const numDays = dayDiff(min,max)+1;
  const flat = flatten();
  const N = flat.length;

  rollupProgress();

  grid.style.gridTemplateColumns = `var(--tree-w) repeat(${numDays}, ${dayWidth}px)`;
  grid.style.gridTemplateRows = `28px 28px 34px repeat(${N}, var(--row-h))`;

  const today = new Date(); today.setHours(0,0,0,0);
  const todayIdx = dayDiff(min, today);

  // ---- canto superior esquerdo ----
  const corner = document.createElement('div');
  corner.className='head-corner';
  corner.textContent = `Tarefas (${tasks.length})`;
  grid.appendChild(corner);

  // ---- cabeçalho de mês ----
  let dayCursor = 0;
  while(dayCursor < numDays){
    const d = addDays(min, dayCursor);
    const monthIdx = d.getMonth(), year = d.getFullYear();
    let span = 0;
    while(dayCursor+span < numDays){
      const dd = addDays(min, dayCursor+span);
      if(dd.getMonth()!==monthIdx || dd.getFullYear()!==year) break;
      span++;
    }
    const el = document.createElement('div');
    el.className='head-month';
    el.style.gridColumn = `${2+dayCursor} / span ${span}`;
    el.style.gridRow = '1';
    el.textContent = `${MONTHS[monthIdx]} ${year}`;
    grid.appendChild(el);
    dayCursor += span;
  }

  // ---- cabeçalho de dias ----
  for(let i=0;i<numDays;i++){
    const d = addDays(min,i);
    const isWeekend = d.getDay()===0 || d.getDay()===6;
    const isToday = dayDiff(today,d)===0;
    const el = document.createElement('div');
    el.className = 'head-day' + (isWeekend?' weekend':'') + (isToday?' today':'');
    el.style.gridColumn = String(2+i);
    el.style.gridRow = '2';
    el.innerHTML = `<span class="num">${d.getDate()}</span><span class="dow">${DOW[d.getDay()]}</span>`;
    grid.appendChild(el);
  }

  // ---- faixa "nível superior" (drop zone para desvincular) ----
  const dz = document.createElement('div');
  dz.className='dropzone';
  dz.style.gridRow='3';
  dz.innerHTML = `<span class="ic">🏠</span><span>Nível superior — solte aqui para desvincular do pai</span>`;
  dz.addEventListener('dragover', e=>{ e.preventDefault(); dz.classList.add('drop-hover'); });
  dz.addEventListener('dragleave', ()=> dz.classList.remove('drop-hover'));
  dz.addEventListener('drop', e=>{
    e.preventDefault(); dz.classList.remove('drop-hover');
    if(dragTaskId!==null) reparent(dragTaskId, null);
  });
  grid.appendChild(dz);

  // ---- linhas de fundo por dia (para cada task row) + tree cells + bars ----
  const rowMeta = {}; // id -> {rowIndex, depth, startIdx, endIdx}

  flat.forEach((item, rowIndex) => {
    const t = item.task;
    const gridRow = 4 + rowIndex;
    rowMeta[t.id] = {rowIndex, depth:item.depth};

    // tree cell
    const tc = document.createElement('div');
    tc.className='tree-cell';
    tc.style.gridColumn='1';
    tc.style.gridRow=String(gridRow);
    tc.draggable = true;
    tc.dataset.id = t.id;

    const indent = document.createElement('div');
    indent.className='indent';
    indent.style.width = (item.depth*18)+'px';
    tc.appendChild(indent);

    const twisty = document.createElement('div');
    twisty.className='twisty' + (hasChildren(t.id) ? '' : ' empty');
    twisty.textContent = hasChildren(t.id) ? (t.collapsed ? '▸' : '▾') : '';
    twisty.addEventListener('click', (e)=>{ e.stopPropagation(); t.collapsed = !t.collapsed; render(); });
    tc.appendChild(twisty);

    const handle = document.createElement('div');
    handle.className='drag-handle';
    handle.textContent='⋮⋮';
    tc.appendChild(handle);

    const chip = document.createElement('div');
    chip.className='type-chip';
    chip.style.background = `var(--${t.type})`;
    chip.textContent = TYPE_LABEL[t.type];
    tc.appendChild(chip);

    const nm = document.createElement('div');
    nm.className='name';
    nm.textContent = t.name;
    nm.title = t.name;
    tc.appendChild(nm);

    if(t.parentId!==null){
      const ptag = document.createElement('div');
      ptag.className='parent-tag';
      const parent = findTask(t.parentId);
      ptag.textContent = '↳ ' + (parent ? parent.name.split(' ').slice(0,2).join(' ') : '');
      tc.appendChild(ptag);

      const ub = document.createElement('button');
      ub.className='unlink-btn';
      ub.title='Desvincular da tarefa pai';
      ub.textContent='✕';
      ub.addEventListener('click', (e)=>{ e.stopPropagation(); reparent(t.id, null); });
      tc.appendChild(ub);
    }

    const assignees = Array.isArray(t.assignee) 
      ? t.assignee
      : (t.assignee ? [t.assignee] : []);
    const avWrap = document.createElement('div');
    avWrap.className='avatars';
    assignees.forEach((a, i)=>{
      const av = document.createElement('div');
      av.className='avatar' + (i>0 ? ' stacked' : '');
      av.textContent = a;
      av.title = a;
      avWrap.appendChild(av);
    });
    tc.appendChild(avWrap);

    // drag events (reparenting)
    tc.addEventListener('dragstart', (e)=>{
      dragTaskId = t.id;
      tc.classList.add('dragging');
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain', String(t.id));
    });
    tc.addEventListener('dragend', ()=>{ tc.classList.remove('dragging'); dragTaskId=null; });
    tc.addEventListener('dragover', (e)=>{
      e.preventDefault();
      if(dragTaskId===null || dragTaskId===t.id) return;
      const valid = !isDescendant(dragTaskId, t.id);
      tc.classList.toggle('drop-valid', valid);
      tc.classList.toggle('drop-invalid', !valid);
    });
    tc.addEventListener('dragleave', ()=>{ tc.classList.remove('drop-valid','drop-invalid'); });
    tc.addEventListener('drop', (e)=>{
      e.preventDefault();
      tc.classList.remove('drop-valid','drop-invalid');
      if(dragTaskId!==null) reparent(dragTaskId, t.id);
    });

    grid.appendChild(tc);

    // day background cells for this row
    for(let i=0;i<numDays;i++){
      const d = addDays(min,i);
      const isWeekend = d.getDay()===0 || d.getDay()===6;
      const dc = document.createElement('div');
      dc.className='day-cell' + (isWeekend?' weekend':'');
      dc.style.gridColumn = String(2+i);
      dc.style.gridRow = String(gridRow);
      grid.appendChild(dc);
    }

    // bar
    const s = parseDate(t.start), e = parseDate(t.end);
    const startIdx = dayDiff(min,s), endIdx = dayDiff(min,e);
    rowMeta[t.id].startIdx = startIdx; rowMeta[t.id].endIdx = endIdx;
    const span = Math.max(1, endIdx-startIdx+1);

    const bar = document.createElement('div');
    bar.className = 'bar ' + t.type;
    bar.style.gridColumn = `${2+startIdx} / span ${span}`;
    bar.style.gridRow = String(gridRow);
    bar.title = `${t.name}\n${t.start} → ${t.end}\nProgresso: ${t.progress}%`;
    bar.dataset.id = t.id;

    const fill = document.createElement('div');
    fill.className='fill';
    fill.style.width = t.progress+'%';
    bar.appendChild(fill);

    const label = document.createElement('div');
    label.className='label' + (span*dayWidth < 70 ? ' outside' : '');
    label.textContent = t.name;
    bar.appendChild(label);

    const pct = document.createElement('div');
    pct.className='pct';
    pct.textContent = t.progress+'%';
    bar.appendChild(pct);

    const knob = document.createElement('div');
    knob.className='prog-knob';
    knob.style.left = t.progress+'%';
    bar.appendChild(knob);

    const hl = document.createElement('div'); hl.className='handle l';
    const hr = document.createElement('div'); hr.className='handle r';
    bar.appendChild(hl); bar.appendChild(hr);

    attachBarDrag(bar, t, hl, hr, fill, knob, pct);
    grid.appendChild(bar);
  });

  // ---- linha do "hoje" ----
  if(todayIdx>=0 && todayIdx<numDays){
    const headerH = 28+28+34;
    const totalH = headerH + N*44;
    const line = document.createElement('div');
    line.className='today-line';
    line.style.left = (360 + todayIdx*dayWidth + dayWidth/2)+'px';
    line.style.height = totalH+'px';
    grid.appendChild(line);
    const flag = document.createElement('div');
    flag.className='today-flag';
    flag.style.left = (360 + todayIdx*dayWidth + dayWidth/2)+'px';
    flag.textContent='HOJE';
    grid.appendChild(flag);
  }

  // ---- conectores hierárquicos (SVG) ----
  const headerH = 28+28+34;
  const totalW = 360 + numDays*dayWidth;
  const totalH = headerH + N*44;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','connectors');
  svg.setAttribute('width', totalW);
  svg.setAttribute('height', totalH);
  flat.forEach(item=>{
    const t = item.task;
    if(t.parentId===null) return;
    const pm = rowMeta[t.parentId];
    const cm = rowMeta[t.id];
    if(!pm || !cm) return;
    const ax = 360 + pm.startIdx*dayWidth + 10;
    const ay = headerH + pm.rowIndex*44 + 22;
    const bx = 360 + cm.startIdx*dayWidth + 10;
    const by = headerH + cm.rowIndex*44 + 22;
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    const midY = (ay+by)/2;
    path.setAttribute('d', `M ${ax} ${ay} C ${ax-14} ${ay}, ${ax-14} ${by}, ${bx-6} ${by}`);
    path.setAttribute('fill','none');
    path.setAttribute('stroke','#C9CDEA');
    path.setAttribute('stroke-width','1.5');
    svg.appendChild(path);
  });
  grid.appendChild(svg);

  document.getElementById('zoomLvl').textContent = dayWidth+'px';

  if(!initialScrollDone && todayIdx>=0 && todayIdx<numDays){
    const sw = document.getElementById('scrollwrap');
    const x = 360 + todayIdx*dayWidth + dayWidth/2;
    sw.scrollLeft = Math.max(0, x - 360 - dayWidth*2);
    initialScrollDone = true;
  }
}
