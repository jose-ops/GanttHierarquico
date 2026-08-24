/* ============== TOOLBAR ============== */
function initToolbar(){
  document.getElementById('zoomIn').onclick = ()=>{ dayWidth = Math.min(64, dayWidth+8); render(); };
  document.getElementById('zoomOut').onclick = ()=>{ dayWidth = Math.max(18, dayWidth-8); render(); };
  document.getElementById('expandAll').onclick = ()=>{ tasks.forEach(t=>t.collapsed=false); render(); };
  document.getElementById('collapseAll').onclick = ()=>{ tasks.forEach(t=>{ if(hasChildren(t.id)) t.collapsed=true; }); render(); };
}

/* ============== INIT ============== */
initToolbar();
render();
