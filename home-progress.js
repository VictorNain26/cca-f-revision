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

  /* ---------- « À revoir » : la règle 4 de la méthode, rendue exécutable ----------
     Exam_Strategy.html affiche « revois chaque domaine tous les 2-3 jours et
     mélange-les », et rien sur le site ne le supportait : une question posée
     juste après sa section teste la récence, pas le rappel différé.
     Ce bloc ne crée pas l'espacement, il le rend visible. Un lecteur qui fait
     tout en un week-end verra une file vide le jour 1 et pleine le jour 3 ;
     le plafond et l'entrelacement évitent le mur, rien de plus. */
  const DAY = 86400000;
  const DUE_AFTER = { correct: 3 * DAY, wrong: 1 * DAY };
  const MAX_DUE = 10;

  const PAGE_LABEL = Object.fromEntries([
    ...DOMAINS.map((d) => [d.key, d.code]),
    ['D0_API_Fundamentals', 'D0'],
    ['Practice_Questions', 'QCM'],
  ]);

  /* « d5-q1 » → « Q1 », « pq-q34 » → « Q34 ». L'accueil n'a pas le texte des
     questions : le numéro et le domaine sont tout ce qu'on peut nommer sans
     dupliquer le corpus. Un id qui ne suit pas la forme est affiché tel quel. */
  const questionLabel = (qid) => {
    const m = qid.match(/-q(\d+)$/i);
    return m ? `Q${m[1]}` : qid;
  };

  const dueList = () => {
    const now = Date.now();
    const perPage = [];

    for (const page of Object.keys(PAGE_LABEL)) {
      const answers = state[page];
      if (!answers) continue;
      const due = Object.entries(answers)
        .filter(([, a]) => a && typeof a.ts === 'number'
          && now - a.ts >= (a.correct ? DUE_AFTER.correct : DUE_AFTER.wrong))
        /* Une question ratée après avoir été juste passe devant : elle mesure
           une instabilité, ce que la seule ancienneté ne voit pas. */
        .sort((a, b) => {
          const unstable = (x) => ((x[1].n || 1) > 1 && !x[1].correct ? 0 : 1);
          return unstable(a) - unstable(b) || a[1].ts - b[1].ts;
        })
        .map(([qid, a]) => ({ page, qid, wrong: !a.correct }));
      if (due.length) perPage.push(due);
    }
    if (!perPage.length) return [];

    /* Tour de rôle entre les pages plutôt qu'un tri global : c'est
       l'entrelacement de la règle 4, et il est reproductible là où un mélange
       aléatoire changerait la liste à chaque rechargement. */
    const out = [];
    for (let i = 0; out.length < MAX_DUE; i++) {
      let placed = false;
      for (const list of perPage) {
        if (i >= list.length) continue;
        out.push(list[i]);
        placed = true;
        if (out.length === MAX_DUE) break;
      }
      if (!placed) break;
    }
    return out;
  };

  const renderDue = () => {
    const anchor = document.getElementById('cca-profil');
    if (!anchor) return;
    const items = dueList();
    if (!items.length) return;

    const box = document.createElement('div');
    box.className = 'a-revoir';
    box.innerHTML =
      `<h3 class="a-revoir-title">À revoir — ${items.length} question${items.length > 1 ? 's' : ''}</h3>` +
      '<p class="a-revoir-hint">Revues au moins un jour après ta réponse, mélangées entre domaines. ' +
      'Une seconde réponse fausse fait baisser ton profil ci-dessus : c\'est normal, il compte la dernière.</p>' +
      '<ul class="a-revoir-list">' +
      items.map((it) =>
        `<li class="a-revoir-item${it.wrong ? ' is-wrong' : ''}">` +
        `<a href="${it.page}.html?replay=${encodeURIComponent(it.qid)}#${it.qid}">` +
        `<span class="a-revoir-dom">${PAGE_LABEL[it.page]}</span> ${questionLabel(it.qid)}</a></li>`
      ).join('') +
      '</ul>';
    anchor.insertAdjacentElement('afterend', box);
  };

  renderDue();
})();
