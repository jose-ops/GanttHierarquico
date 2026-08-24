/* ============== ÁRVORE ============== */
function children(id){ return tasks.filter(t=>t.parentId===id); }
function hasChildren(id){ return tasks.some(t=>t.parentId===id); }
function findTask(id){ return tasks.find(t=>t.id===id); }

function isDescendant(ancestorId, taskId){
  // taskId está dentro da subárvore de ancestorId?
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
  function walk(parentId, depth){
    children(parentId).forEach(t=>{
      out.push({task:t, depth});
      if(hasChildren(t.id) && !t.collapsed){ walk(t.id, depth+1); }
    });
  }
  walk(null, 0);
  return out;
}

function rollupProgress(){
  function compute(id){
    const kids = children(id);
    if(kids.length===0) return;
    let total = 0, weight = 0;
    kids.forEach(k=>{
      compute(k.id);
      const kk = findTask(k.id);
      const dur = dayDiff(parseDate(kk.start), parseDate(kk.end)) + 1;
      total += kk.progress * dur;
      weight += dur;
    });
    const t = findTask(id);
    t.progress = weight > 0 ? Math.max(0, Math.min(100, Math.round(total / weight))) : 0;
  }
  children(null).forEach(t=> compute(t.id));
}

function reparent(taskId, newParentId){
  if(taskId===newParentId) return;
  if(newParentId!==null && isDescendant(taskId, newParentId)) return; // evita ciclo
  const t = findTask(taskId);
  if(!t || t.parentId===newParentId) return;
  t.parentId = newParentId;
  if(newParentId!==null){
    const p = findTask(newParentId);
    if(p) p.collapsed = false;
  }
  render();
}
