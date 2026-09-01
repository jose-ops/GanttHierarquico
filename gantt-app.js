/* ============== <gantt-app> ============== */
(function(){
  'use strict';
  const S = window.GanttStore;

  class GanttApp extends HTMLElement {
    connectedCallback(){
      if(this._inited) return;
      this._inited = true;
      this.innerHTML = `
        <gantt-toolbar></gantt-toolbar>
        <div class="hint">
          <span class="ic">✋</span>
          <span><b>Arraste</b> uma tarefa pelo nome para vinculá-la como filha (solte na faixa
          <b>“Nível superior”</b> para desvincular). Na timeline, <b>arraste a barra</b> para mover datas, puxe as bordas
          para redimensionar e arraste o <b>knob branco</b> para alterar o progresso. O progresso das Tarefas Pai é
          calculado automaticamente a partir de todas as tarefas descendentes (média simples); as datas são livres, mas o pai acompanha
          quando uma Filha ultrapassa o período (⚠). <b>Ctrl + scroll</b> dá zoom,
          <b>Ctrl + arrastar</b> move a timeline, <b>Ctrl + Z</b> desfaz e o botão <b>📍 Hoje</b> centraliza o dia atual.</span>
        </div>
        <gantt-chart></gantt-chart>
        <gantt-modal id="modal"></gantt-modal>
        <gantt-fab></gantt-fab>
        <div class="toast-host"></div>`;

      const modal = this.querySelector('#modal');
      this.addEventListener('gantt-open-modal', e=> modal.open(e.detail));
      this.addEventListener('gantt-toast', e=> this._toast(e.detail));

      document.addEventListener('keydown', e=>{
        if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='z' && !e.shiftKey){
          const ae = document.activeElement;
          const modalOpen = modal.classList.contains('open');
          const typing = ae && ['INPUT','TEXTAREA','SELECT'].includes(ae.tagName);
          if(modalOpen || typing) return;
          e.preventDefault();
          S.undo();
          this._toast('Alteração desfeita (Ctrl+Z)');
        }
      });
    }

    _toast(msg){
      const host = this.querySelector('.toast-host');
      const el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      host.appendChild(el);
      requestAnimationFrame(()=> el.classList.add('show'));
      setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=> el.remove(), 250); }, 2800);
    }
  }

  customElements.define('gantt-app', GanttApp);
})();
