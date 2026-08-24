/* ============== DRAG DE BARRA (mover / redimensionar datas) ============== */
function attachBarDrag(bar, t, hl, hr, fill, knob, pct){
  function startDrag(mode, e){
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const origStart = parseDate(t.start);
    const origEnd = parseDate(t.end);
    const rangeMin = getRange().min;
    const treeW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tree-w')) || 360;
    const barLeft0 = bar.getBoundingClientRect().left;
    bar.style.transition = 'none';

    function onMove(ev){
      const deltaDays = Math.round((ev.clientX - startX)/dayWidth);
      let newStart = origStart, newEnd = origEnd;
      if(mode==='move'){
        // limites por intervalo e pelo painel esquerdo (não esconder atrás da árvore)
        const dMin = -dayDiff(rangeMin, origStart);
        const dMax = dayDiff(origEnd, getRange().max);
        const minTranslateDays = Math.ceil((treeW + dayWidth - barLeft0) / dayWidth);
        let effDelta = Math.max(dMin, deltaDays);
        effDelta = Math.min(effDelta, dMax);
        effDelta = Math.max(effDelta, minTranslateDays);
        newStart = addDays(origStart, effDelta);
        newEnd = addDays(origEnd, effDelta);
        bar.style.transform = `translateX(${effDelta*dayWidth}px)`;
      } else if(mode==='resize-l'){
        newStart = addDays(origStart, deltaDays);
        if(newStart >= origEnd) newStart = addDays(origEnd,-1);
        if(newStart < rangeMin) newStart = rangeMin;
      } else if(mode==='resize-r'){
        newEnd = addDays(origEnd, deltaDays);
        if(newEnd <= origStart) newEnd = addDays(origStart,1);
      }
      bar.dataset.pendingStart = fmt(newStart);
      bar.dataset.pendingEnd = fmt(newEnd);
      bar.style.outline = '2px solid rgba(76,95,255,.6)';
    }
    function onUp(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      bar.style.outline = '';
      if(bar.dataset.pendingStart){
        t.start = bar.dataset.pendingStart;
        t.end = bar.dataset.pendingEnd;
        delete bar.dataset.pendingStart;
        delete bar.dataset.pendingEnd;
        render();
      }
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ---- drag de progresso (arrastar o knob) ----
  function startProgressDrag(e){
    e.preventDefault();
    e.stopPropagation();
    const rect = bar.getBoundingClientRect();
    fill.style.transition = 'none';
    function onMove(ev){
      let p = Math.round(((ev.clientX - rect.left) / rect.width) * 100);
      p = Math.max(0, Math.min(100, p));
      t.progress = p;
      fill.style.width = p + '%';
      knob.style.left = p + '%';
      pct.textContent = p + '%';
      bar.title = `${t.name}\n${t.start} → ${t.end}\nProgresso: ${p}%`;
    }
    function onUp(){
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      render();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  bar.addEventListener('mousedown', (e)=>{
    if(e.target===hl || e.target===hr || e.target===knob) return;
    startDrag('move', e);
  });
  hl.addEventListener('mousedown', (e)=> startDrag('resize-l', e));
  hr.addEventListener('mousedown', (e)=> startDrag('resize-r', e));
  knob.addEventListener('mousedown', (e)=> startProgressDrag(e));
}
