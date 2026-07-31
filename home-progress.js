/* Progression sur l'accueil.
   Lit le score des quiz (même localStorage que quiz.js) et produit deux choses :
   1. Un badge sur chaque carte : ✓ Terminé (≥ 75 %) / % · à revoir / À faire / En cours.
   2. Le profil par domaine dans #cca-profil : les 5 domaines triés par priorité de
      révision, c'est-à-dire poids d'examen × faiblesse. Un domaine lourd et mal
      maîtrisé passe avant un domaine léger et mal maîtrisé.
   Les totaux ci-dessous doivent correspondre au nombre réel de <summary>Qn</summary>
   par page — sinon un domaine ne peut jamais atteindre « Terminé ». */
(() => {
  'use strict';

  const TOTALS = {
    D0_API_Fundamentals: 6,
    D1_Architecture_Orchestration_27pct: 8,
    D2_Tool_Design_MCP_18pct: 7,
    D3_Claude_Code_Config_20pct: 8,
    D4_Prompt_Engineering_20pct: 7,
    D5_Context_Fiabilite_15pct: 9,
    Practice_Questions: 112,
  };
  const PASS = 0.75;

  const DOMAINS = [
    { key: 'D1_Architecture_Orchestration_27pct', code: 'D1', label: 'Architecture et orchestration', weight: 27 },
    { key: 'D2_Tool_Design_MCP_18pct', code: 'D2', label: 'Tool design et MCP', weight: 18 },
    { key: 'D3_Claude_Code_Config_20pct', code: 'D3', label: 'Configuration Claude Code', weight: 20 },
    { key: 'D4_Prompt_Engineering_20pct', code: 'D4', label: 'Prompt engineering', weight: 20 },
    { key: 'D5_Context_Fiabilite_15pct', code: 'D5', label: 'Context et fiabilité', weight: 15 },
  ];

  let state = {};
  try { state = JSON.parse(localStorage.getItem('cca-quiz-state-v2') || '{}'); } catch { /* ignore */ }

  const scoreOf = (key) => {
    const page = state[key] || {};
    const answered = Object.keys(page).length;
    const correct = Object.values(page).filter((q) => q && q.correct).length;
    return { answered, correct, total: TOTALS[key] || 0 };
  };

  // ---------- Badges sur les cartes ----------
  for (const card of document.querySelectorAll('a.card[href]')) {
    const key = (card.getAttribute('href') || '').replace(/\.html$/, '');
    if (!TOTALS[key]) continue;

    const { answered, correct, total } = scoreOf(key);
    const badge = document.createElement('span');
    badge.className = 'card-status';

    if (answered < total) {
      badge.classList.add('is-progress');
      badge.textContent = answered === 0 ? 'À faire' : `En cours · ${answered}/${total}`;
    } else {
      const pct = Math.round((correct / total) * 100);
      badge.classList.add(correct / total >= PASS ? 'is-done' : 'is-fail');
      badge.textContent = correct / total >= PASS ? `✓ Terminé · ${pct}%` : `${pct}% · à revoir`;
    }
    card.appendChild(badge);
  }

  // ---------- Profil par domaine ----------
  const host = document.getElementById('cca-profil');
  if (!host) return;

  const rows = DOMAINS.map((d) => {
    const { answered, correct, total } = scoreOf(d.key);
    // Le reste à combler = les questions ratées ET celles pas encore ouvertes.
    // Sans ce second terme, un domaine à moitié fait avec un bon score passerait
    // derrière un domaine entièrement fait avec un score moyen.
    const acquired = total > 0 ? correct / total : 0;
    return { ...d, answered, correct, total, acquired, priority: d.weight * (1 - acquired) };
  }).sort((a, b) => b.priority - a.priority);

  const totalAnswered = rows.reduce((n, r) => n + r.answered, 0);

  if (totalAnswered === 0) {
    host.innerHTML =
      '<p class="profil-empty">Réponds aux auto-évaluations des fiches de domaine : ' +
      'ton ordre de révision s\'affichera ici, du domaine le plus rentable au moins rentable ' +
      '(poids à l\'examen × ce qu\'il te reste à combler).</p>';
    return;
  }

  const statusOf = (r) => {
    if (r.answered === 0) return { cls: 'todo', text: 'pas commencé' };
    if (r.answered < r.total) return { cls: 'partial', text: `${r.total - r.answered} restantes` };
    return r.acquired >= PASS
      ? { cls: 'ok', text: 'maîtrisé' }
      : { cls: 'weak', text: 'à revoir' };
  };

  host.innerHTML =
    '<ol class="profil-list">' +
    rows.map((r) => {
      const s = statusOf(r);
      const pct = Math.round(r.acquired * 100);
      return (
        `<li class="profil-row is-${s.cls}">` +
        `<a class="profil-name" href="${r.key}.html"><strong>${r.code}</strong> ${r.label}</a>` +
        `<span class="profil-weight">${r.weight} %</span>` +
        `<span class="profil-bar" role="img" aria-label="${r.correct} sur ${r.total} acquises">` +
        `<span class="profil-fill" style="width:${pct}%"></span></span>` +
        `<span class="profil-score">${r.correct}/${r.total} acquises</span>` +
        `<span class="profil-tag">${s.text}</span>` +
        '</li>'
      );
    }).join('') +
    '</ol>' +
    '<p class="profil-hint">' +
    (rows[0].acquired >= 1
      ? 'Tous les domaines sont acquis. Enchaîne sur les <a href="Practice_Questions.html">112 QCM</a> : vise ≥ 85 % au 2<sup>e</sup> passage.'
      : `Classement par rentabilité : commence par <strong>${rows[0].code}</strong>. ` +
        'Une question non ouverte compte comme non acquise — un domaine à moitié fait reste à moitié à réviser.') +
    '</p>';
})();
