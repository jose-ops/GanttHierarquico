/* ============== <gantt-toolbar> ============== */
(function(){
  'use strict';
  const S = window.GanttStore;

  class GanttToolbar extends HTMLElement {
    connectedCallback(){
      this.className = 'toolbar';
      this.innerHTML = `
        <h1><span class="logo">SRM</span>Gantt Hierárquico - ATA Reunião</h1>
        <div class="sep"></div>
        <button class="btn" id="expandAll">▾ Expandir tudo</button>
        <button class="btn" id="collapseAll">▸ Recolher tudo</button>
        <div class="sep"></div>
        <button class="btn primary" id="addTask">＋ Adicionar tarefa</button>
        <div class="sep"></div>
        <div class="zoomgroup">
          <button id="zoomOut">−</button>
          <span class="lvl" id="zoomLvl">${S.getDayWidth()}px</span>
          <button id="zoomIn">+</button>
        </div>
        <button class="btn" id="goToday" title="Voltar para o dia de hoje (Ctrl+Início)">📍 Hoje</button>
        <div class="legend">
          <div class="lg-item"><span class="dot" style="background:var(--epic)"></span>Epic</div>
          <div class="lg-item"><span class="dot" style="background:var(--story)"></span>Story</div>
          <div class="lg-item"><span class="dot" style="background:var(--task)"></span>Task</div>
          <div class="lg-item"><span class="dot" style="background:var(--bug)"></span>Bug</div>
        </div>`;

      this.querySelector('#zoomIn').onclick = ()=> S.setDayWidth(S.getDayWidth()+8);
      this.querySelector('#zoomOut').onclick = ()=> S.setDayWidth(S.getDayWidth()-8);
      this.querySelector('#expandAll').onclick = ()=>{ S.getTasks().forEach(t=>t.collapsed=false); S.notify(); };
      this.querySelector('#collapseAll').onclick = ()=>{ S.getTasks().forEach(t=>{ if(S.hasChildren(t.id)) t.collapsed=true; }); S.notify(); };
      this.querySelector('#addTask').onclick = ()=> this._emit({mode:'add', parentId:null});
      this.querySelector('#goToday').onclick = ()=>{
        const chart = document.querySelector('gantt-chart');
        if(chart) chart.scrollToToday();
      };
      document.addEventListener('keydown', e=>{
        if(e.ctrlKey && e.key==='Home'){ e.preventDefault(); const c=document.querySelector('gantt-chart'); if(c) c.scrollToToday(); }
      });

      // reflete o zoom atual no rótulo
      S.subscribe(()=>{ this.querySelector('#zoomLvl').textContent = S.getDayWidth()+'px'; });
    }

    _emit(detail){
      this.dispatchEvent(new CustomEvent('gantt-open-modal', {detail, bubbles:true}));
    }
  }

  customElements.define('gantt-toolbar', GanttToolbar);
})();
