/* ============== <gantt-fab> ============== */
/* Botão flutuante (estilo JIRA) para navegação de datas:
   Hoje (centraliza o dia atual), Semana e Mês (presets de zoom + hoje).
   Pode ser minimizado para a lateral. */
(function(){
  'use strict';
  const S = window.GanttStore;

  class GanttFab extends HTMLElement {
    connectedCallback(){
      if(this._inited) return;
      this._inited = true;
      this.className = 'fab min';
      this.innerHTML = `
        <button class="fab-tab" id="fabTab" title="Mostrar navegação">🗓</button>
        <div class="fab-panel" id="fabPanel">
          <div class="fab-head">
            <span>Navegação</span>
            <button id="fabMin" title="Minimizar">▸</button>
          </div>
          <button class="fab-btn" data-act="today">📍 Hoje</button>
          <button class="fab-btn" data-act="week">🗓 Semana</button>
          <button class="fab-btn" data-act="month">📅 Mês</button>
        </div>`;

      const goChart = (fn)=>{ const c = document.querySelector('gantt-chart'); if(c) fn(c); };

      this.querySelector('#fabMin').onclick = ()=> this.classList.add('min');
      this.querySelector('#fabTab').onclick = ()=> this.classList.remove('min');

      this.querySelectorAll('.fab-btn').forEach(b=>{
        b.onclick = ()=>{
          const act = b.dataset.act;
          if(act==='today'){
            goChart(c=> c.scrollToToday());
          } else if(act==='week'){
            S.setDayWidth(48);
            goChart(c=> c.scrollToToday());
          } else if(act==='month'){
            S.setDayWidth(16);
            goChart(c=> c.scrollToToday());
          }
        };
      });
    }
  }

  customElements.define('gantt-fab', GanttFab);
})();
