/* ============== <gantt-app> ============== */
(function(){
  'use strict';

  class GanttApp extends HTMLElement {
    connectedCallback(){
      this.innerHTML = `
        <gantt-toolbar></gantt-toolbar>
        <div class="hint">
          <span class="ic">✋</span>
          <span><b>Arraste</b> uma tarefa pelo nome para vinculá-la como filha (solte na faixa
          <b>“Nível superior”</b> para desvincular). Na timeline, <b>arraste a barra</b> para mover datas, puxe as bordas
          para redimensionar e arraste o <b>knob branco</b> para alterar o progresso. O progresso das tarefas pai é
          calculado automaticamente a partir dos filhos. <b>Ctrl + scroll</b> dá zoom, <b>Ctrl + arrastar</b> move a
          timeline e o botão <b>📍 Hoje</b> centraliza o dia atual.</span>
        </div>
        <gantt-chart></gantt-chart>
        <gantt-modal id="modal"></gantt-modal>`;

      const modal = this.querySelector('#modal');
      this.addEventListener('gantt-open-modal', e=> modal.open(e.detail));
    }
  }

  customElements.define('gantt-app', GanttApp);
})();
