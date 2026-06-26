/* Badges de progression sur les cartes de l'accueil.
   Lit le score des quiz (même localStorage que quiz.js) et marque chaque carte :
   - ✓ Terminé (vert)  : quiz complété ET ≥ 75 % de bonnes réponses
   - % · à revoir (rouge) : quiz complété mais < 75 %
   - À faire / En cours (gris) : quiz non complété */
(() => {
  'use strict';

  const TOTALS = {
    D0_API_Fundamentals: 4,
    D1_Architecture_Orchestration_27pct: 8,
    D2_Tool_Design_MCP_18pct: 7,
    D3_Claude_Code_Config_20pct: 9,
    D4_Prompt_Engineering_20pct: 7,
    D5_Context_Fiabilite_15pct: 6,
    Practice_Questions: 78,
  };
  const PASS = 0.75;

  let state = {};
  try { state = JSON.parse(localStorage.getItem('cca-quiz-state-v2') || '{}'); } catch { /* ignore */ }

  for (const card of document.querySelectorAll('a.card[href]')) {
    const key = (card.getAttribute('href') || '').replace(/\.html$/, '');
    const total = TOTALS[key];
    if (!total) continue;

    const page = state[key] || {};
    const answered = Object.keys(page).length;
    const correct = Object.values(page).filter((q) => q && q.correct).length;

    const badge = document.createElement('span');
    badge.className = 'card-status';

    if (answered < total) {
      badge.classList.add('is-progress');
      badge.textContent = answered === 0 ? 'À faire' : `En cours · ${answered}/${total}`;
    } else {
      const pct = Math.round((correct / total) * 100);
      if (correct / total >= PASS) {
        badge.classList.add('is-done');
        badge.textContent = `✓ Terminé · ${pct}%`;
      } else {
        badge.classList.add('is-fail');
        badge.textContent = `${pct}% · à revoir`;
      }
    }
    card.appendChild(badge);
  }
})();
