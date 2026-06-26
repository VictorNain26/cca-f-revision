/* Navbar — composant unique partagé par toutes les pages.
   Édite la liste LINKS ici, toutes les pages se mettent à jour.
   Chargé AVANT theme.js pour que le bouton de thème s'ajoute après le rendu. */
(() => {
  'use strict';

  const LINKS = [
    ['index.html', 'Accueil', ''],
    ['D0_API_Fundamentals.html', 'D0', "D0 — Fondamentaux de l'API"],
    ['D1_Architecture_Orchestration_27pct.html', 'D1', 'D1 — Architecture et orchestration (27 %)'],
    ['D2_Tool_Design_MCP_18pct.html', 'D2', 'D2 — Tool design et MCP (18 %)'],
    ['D3_Claude_Code_Config_20pct.html', 'D3', 'D3 — Configuration Claude Code (20 %)'],
    ['D4_Prompt_Engineering_20pct.html', 'D4', 'D4 — Prompt engineering (20 %)'],
    ['D5_Context_Fiabilite_15pct.html', 'D5', 'D5 — Context et reliability (15 %)'],
    ['Practice_Questions.html', 'QCM', 'Practice Questions — 78 QCM corrigés'],
    ['Scenarios_Exam.html', 'Scénarios', "Les 6 scénarios d'examen"],
    ['Exam_Strategy.html', 'Stratégie', 'Stratégie jour J + cheat sheet'],
  ];

  const nav = document.querySelector('nav.navbar');
  if (!nav) return;

  let cur = (location.pathname.split('/').pop() || '').trim();
  if (cur === '') cur = 'index.html';

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  let html = '<a class="home" href="index.html">CCA-F</a>';
  for (const [href, label, title] of LINKS) {
    const t = title ? ` title="${esc(title)}"` : '';
    html += `<a${href === cur ? ' class="current"' : ''} href="${href}"${t}>${label}</a>`;
  }
  nav.innerHTML = html;
})();
