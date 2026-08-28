# GanttHierarquico


Aplicação web (HTML/CSS/JS puro, sem build) de cronograma em Gantt hierárquico. As tarefas formam uma árvore de pai/filhas, e os pais agregam automaticamente o progresso e as datas das filhas (rollup). Principais recursos:

Rollup automático: o progresso de todo pai é a média ponderada das folhas; a raiz deriva datas por envelope (só cresce quando uma filha ultrapassa o intervalo).
Vínculo travável/destravável: a raiz pode ter vínculo travado (datas/progresso derivados das filhas) ou destravado (manuais).
Edição visual: arrastar barras para mover datas, puxar bordas para redimensionar, arrastar e soltar para reparentar (inclusive no "nível superior" para desvincular), Ctrl+Z desfaz.
Painel de relacionamentos: mostra filhas e descendentes da raiz, com regra de status por prioridade (Atrasado > Concluído > Em andamento) e filtro por status.
Mensagens e avisos por tarefa (info, aviso, perigo, sucesso).
Navegação: zoom, botão "Hoje", FAB flutuante, Ctrl+Início.
Sem backend nem banco: o estado vive em store.js (dados de exemplo no seed). 

Uso
Abra index.html no navegador (sem build, HTML/JS/CSS puros).

Estrutura
store.js — estado e lógica (datas, árvore, rollup)
gantt-chart.js — timeline
gantt-toolbar.js — barra de ferramentas
gantt-modal.js — edição, mensagens e painel de relacionamentos
gantt-fab.js — navegação flutuante
gantt-app.js — orquestração
styles.css — estilos
