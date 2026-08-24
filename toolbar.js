/* ============== TOOLBAR ============== */
function initToolbar(){
  document.getElementById('zoomIn').onclick = ()=>{ dayWidth = Math.min(160, dayWidth+8); render(); };
  document.getElementById('zoomOut').onclick = ()=>{ dayWidth = Math.max(10, dayWidth-8); render(); };
  document.getElementById('expandAll').onclick = ()=>{ tasks.forEach(t=>t.collapsed=false); render(); };
  document.getElementById('collapseAll').onclick = ()=>{ tasks.forEach(t=>{ if(hasChildren(t.id)) t.collapsed=true; }); render(); };
  document.getElementById('goToday').onclick = ()=> scrollToToday();

  const sw = document.getElementById('scrollwrap');

  // Zoom com Ctrl + scroll do mouse (ancorado no cursor)
  sw.addEventListener('wheel', (e)=>{
    if(!e.ctrlKey) return;            // sem Ctrl, o scroll normal acontece
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const old = dayWidth;
    const next = Math.min(160, Math.max(10, old + dir*6));
    if(next === old) return;
    const rect = sw.getBoundingClientRect();
    const cursorX = e.clientX - rect.left + sw.scrollLeft;
    const dateIdx = (cursorX - 360) / old;   // dia sob o cursor antes do zoom
    dayWidth = next;
    render();
    const newX = 360 + dateIdx*next + next/2;
    sw.scrollLeft = newX - (e.clientX - rect.left);
  }, {passive:false});

  // Pan (arrastar) com Ctrl + botão do mouse
  sw.addEventListener('mousedown', (e)=>{
    if(!e.ctrlKey) return;
    if(e.target.closest('.tree-cell')) return;  // mantém o arraste de vínculo
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    const sl = sw.scrollLeft, st = sw.scrollTop;
    const move = (ev)=>{
      sw.scrollLeft = sl - (ev.clientX - sx);
      sw.scrollTop  = st - (ev.clientY - sy);
    };
    const up = ()=>{
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      sw.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    sw.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  });

  // Ctrl + Início volta para hoje
  document.addEventListener('keydown', (e)=>{
    if(e.ctrlKey && e.key === 'Home'){ e.preventDefault(); scrollToToday(); }
  });
}

/* ============== INIT ============== */
initToolbar();
render();
