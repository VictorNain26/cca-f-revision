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
    ['Practice_Questions.html', 'QCM', 'Practice Questions — 112 QCM corrigés, en anglais'],
    ['Scenarios_Exam.html', 'Scénarios', "Les 6 scénarios d'examen"],
    ['Exam_Strategy.html', 'Stratégie', 'Stratégie jour J + cheat sheet'],
    ['anthropic_courses/CCA-F_Exam_Guide_v1.0.pdf', 'Guide', "Le guide d'examen officiel (PDF) — la seule source qui fait foi"],
  ];

  // Sélecteur de langue : page française (racine) → jumeau anglais (en/).
  // Lu par tools/lib/nav.mjs (readTranslations) pour rester la source unique.
  const TRANSLATIONS = {
    'D0_API_Fundamentals.html': 'en/D0_API_Fundamentals.html',
    'D1_Architecture_Orchestration_27pct.html': 'en/D1_Architecture_Orchestration_27pct.html',
    'D2_Tool_Design_MCP_18pct.html': 'en/D2_Tool_Design_MCP_18pct.html',
    'D3_Claude_Code_Config_20pct.html': 'en/D3_Claude_Code_Config_20pct.html',
    'D4_Prompt_Engineering_20pct.html': 'en/D4_Prompt_Engineering_20pct.html',
    'D5_Context_Fiabilite_15pct.html': 'en/D5_Context_Fiabilite_15pct.html',
  };

  const nav = document.querySelector('nav.navbar');
  if (!nav) return;

  const inEn = location.pathname.includes('/en/');
  let cur = (location.pathname.split('/').pop() || '').trim();
  if (cur === '') cur = 'index.html';

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const homeHref = inEn ? '../index.html' : 'index.html';

  let html = `<a class="home" href="${homeHref}">CCA-F</a>`;
  for (const [href, label, title] of LINKS) {
    const linkHref = inEn ? `../${href}` : href;
    const t = title ? ` title="${esc(title)}"` : '';
    const ext = href.endsWith('.pdf') ? ' target="_blank" rel="noopener"' : '';
    html += `<a${href === cur ? ' class="current"' : ''} href="${linkHref}"${t}${ext}>${label}</a>`;
  }
  nav.innerHTML = html;

  let switchHtml = null;
  if (inEn) {
    const entry = Object.entries(TRANSLATIONS).find(([, en]) => en === `en/${cur}`);
    if (entry) switchHtml = `<a href="../${entry[0]}">FR</a>`;
  } else if (TRANSLATIONS[cur]) {
    switchHtml = `<a href="${TRANSLATIONS[cur]}">EN</a>`;
  }
  if (switchHtml) {
    let box = document.querySelector('.lang-switch');
    if (!box) {
      box = document.createElement('div');
      box.className = 'lang-switch';
      nav.after(box);
    }
    box.innerHTML = switchHtml;
  }
})();
