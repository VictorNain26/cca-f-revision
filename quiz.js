/* CCA-F Revision — quiz UX enhancer (ESNext)
 * Post-traite les blocs <details> de quiz au chargement :
 *   - extrait les choix A/B/C/D du <summary> ou du <div> body vers une <ul class="choices">
 *   - rend les choix cliquables (feedback immédiat correct / wrong)
 *   - le bouton « Voir la réponse » apparaît seulement APRÈS un clic
 *   - persiste le score par page dans localStorage
 *   - affiche un widget de progression en bas à gauche
 * Script classique (pas de module) pour rester ouvrable en file:// hors serveur.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'cca-quiz-state-v2';
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  // ---------- localStorage helpers ----------
  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const saveState = (state) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { /* quota plein, ignorer */ }
  };

  const pageKey = () => (window.location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');

  const quizId = (detailsEl, idx) => {
    if (detailsEl.id) return detailsEl.id;
    const summary = detailsEl.querySelector(':scope > summary');
    const text = summary ? (summary.textContent || '').trim().slice(0, 60) : '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return `q${idx}-${Math.abs(hash).toString(36)}`;
  };

  // ---------- Détection ----------
  const isQuiz = (details) => {
    if (!details || details.classList.contains('answer-reveal')) return false;
    const summary = details.querySelector(':scope > summary');
    if (!summary) return false;
    return /^Q\s*\d+/i.test((summary.textContent || '').trim());
  };

  // ---------- Décorations ----------
  const decorateQTag = (summary) => {
    if (summary.querySelector('.q-tag')) return;
    const m = summary.innerHTML.match(/^\s*(?:<strong>)?\s*(Q\s*\d+)(?:\.|\s*:)?\s*(?:<\/strong>)?\s*(.*)$/is);
    if (!m) return;
    const qnum = m[1].replace(/\s+/g, '');
    const rest = (m[2] || '').replace(/^\s*<\/?strong>\s*/i, '');
    summary.innerHTML = `<span class="q-tag">${qnum}</span>${rest}`;
  };

  const splitChoicesInSummary = (summary) => {
    const html = summary.innerHTML;
    const aIdx = html.search(/\b\s*A\)\s/);
    if (aIdx < 0) return null;
    const questionPart = html.slice(0, aIdx).trim();
    const choicesPart = html.slice(aIdx);
    const choices = [];
    let cursor = 0;
    let current = LETTERS[0];
    for (let i = 1; i < LETTERS.length; i++) {
      const pat = new RegExp(`\\b${LETTERS[i]}\\)\\s`, 'g');
      pat.lastIndex = cursor;
      const m = pat.exec(choicesPart);
      if (!m) break;
      const raw = choicesPart.slice(cursor, m.index)
        .replace(new RegExp(`^\\s*${current}\\)\\s*`), '').trim()
        .replace(/[.,]\s*$/, '');
      choices.push({ letter: current, html: raw });
      cursor = m.index;
      current = LETTERS[i];
    }
    const lastRaw = choicesPart.slice(cursor)
      .replace(new RegExp(`^\\s*${current}\\)\\s*`), '').trim()
      .replace(/[.,]\s*$/, '');
    if (lastRaw) choices.push({ letter: current, html: lastRaw });
    if (choices.length < 2) return null;
    return { questionHtml: questionPart, choices };
  };

  // Retourne { letters: ['A', ...], multi: bool }.
  // Marqueur prioritaire : <p class="correct"> (Practice_Questions + nouvelles
  // questions multi). Fallback pour les fiches de domaine : le premier <p> dont le
  // texte commence par « Réponse(s) » (format <strong>Réponse : X.</strong> sans
  // classe). Le multi est détecté quand plusieurs lettres suivent le marqueur
  // (« Réponses : A, C »). Scopé au marqueur pour ne pas matcher un « Réponse : X »
  // cité dans une narration.
  const findCorrect = (detailsEl) => {
    let correctP = detailsEl.querySelector('p.correct');
    if (!correctP) {
      correctP = [...detailsEl.querySelectorAll(':scope > p, :scope > div > p')]
        .find((p) => /^\s*R[ée]ponses?\s*[:.]/i.test(p.textContent || ''));
    }
    if (!correctP) return { letters: [], multi: false };
    const text = (correctP.textContent || '').replace(/\s+/g, ' ');
    const seg = text.match(/R[ée]ponses?\s*:?\s*([A-E](?:\s*(?:,|et|&|\/|ou)\s*[A-E])*)/i);
    if (!seg) return { letters: [], multi: false };
    const letters = [...new Set((seg[1].match(/[A-E]/gi) || []).map((c) => c.toUpperCase()))];
    return { letters, multi: letters.length > 1 };
  };

  const extractCategory = (summaryText) => {
    const m = (summaryText || '').match(/^\s*Q\s*\d+\s*\(([^)]+)\)/i);
    return m ? m[1].trim() : 'Autre';
  };

  // ---------- Wrap réponse dans <details class="answer-reveal"> ----------
  const wrapAnswerInReveal = (detailsEl) => {
    const body = detailsEl.querySelector(':scope > div');
    let bodyParas;
    let holder;

    if (body) {
      bodyParas = [...body.children].filter(
        (el) => !el.classList.contains('choices') && !el.classList.contains('quiz-feedback')
      );
      if (bodyParas.length === 0) return null;
      holder = body;
    } else {
      bodyParas = [...detailsEl.children].filter((el) => el.tagName !== 'SUMMARY');
      if (bodyParas.length === 0) return null;
      const newDiv = document.createElement('div');
      for (const el of bodyParas) newDiv.appendChild(el);
      detailsEl.appendChild(newDiv);
      holder = newDiv;
      bodyParas = [...newDiv.children];
    }

    const reveal = document.createElement('details');
    reveal.className = 'answer-reveal is-locked';
    const revSummary = document.createElement('summary');
    revSummary.innerHTML = '<span class="lock-hint">🔒 Réponds d\'abord pour voir l\'explication</span>';
    reveal.appendChild(revSummary);
    const revBody = document.createElement('div');
    for (const el of bodyParas) revBody.appendChild(el);
    reveal.appendChild(revBody);

    const firstP = revBody.querySelector('p');
    if (firstP && /^R[ée]ponses?\s*[:.]/i.test((firstP.textContent || '').trim())) {
      firstP.classList.add('answer-correct');
    }

    holder.appendChild(reveal);
    return reveal;
  };

  // ---------- Interaction : clic sur un choix ----------
  const attachChoiceHandlers = (detailsEl, correct, revealEl, qid) => {
    const ul = detailsEl.querySelector('.choices');
    if (!ul) return;

    const unlockReveal = () => {
      if (!revealEl) return;
      revealEl.classList.remove('is-locked');
      const revSummary = revealEl.querySelector(':scope > summary');
      if (revSummary) revSummary.innerHTML = 'Voir la réponse complète';
    };

    const persist = (picked, isCorrect) => {
      const state = loadState();
      const key = pageKey();
      (state[key] ??= {})[qid] = { picked, correct: isCorrect, multi: correct.multi, ts: Date.now() };
      saveState(state);
      renderProgressWidget();
    };

    const lis = [...ul.querySelectorAll('li')];

    // ---- Mode multi-réponses : cases à cocher + bouton « Vérifier » ----
    if (correct.multi) {
      const answers = new Set(correct.letters);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-check';
      btn.textContent = `Vérifier (${answers.size} réponses attendues)`;
      ul.insertAdjacentElement('afterend', btn);

      const grade = () => {
        if (ul.classList.contains('is-answered')) return;
        const picked = lis.filter((li) => li.classList.contains('is-checked'))
          .map((li) => li.dataset.letter);
        if (picked.length === 0) return;
        ul.classList.add('is-answered');
        let allCorrect = picked.length === answers.size;
        for (const li of lis) {
          const l = li.dataset.letter;
          const chosen = li.classList.contains('is-checked');
          const good = answers.has(l);
          li.classList.remove('is-checked');
          li.setAttribute('aria-checked', chosen ? 'true' : 'false');
          if (chosen && good) li.classList.add('is-selected', 'is-correct-pick');
          else if (chosen && !good) { li.classList.add('is-selected', 'is-wrong'); allCorrect = false; }
          else if (!chosen && good) { li.classList.add('is-correct'); allCorrect = false; }
        }
        btn.disabled = true;
        unlockReveal();
        persist([...picked].sort().join(''), allCorrect);
      };

      for (const li of lis) {
        li.setAttribute('role', 'checkbox');
        li.setAttribute('aria-checked', 'false');
        li.setAttribute('tabindex', '0');
        const toggle = () => {
          if (ul.classList.contains('is-answered')) return;
          const on = li.classList.toggle('is-checked');
          li.setAttribute('aria-checked', on ? 'true' : 'false');
        };
        li.addEventListener('click', toggle);
        li.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); }
        });
      }
      btn.addEventListener('click', grade);
      return;
    }

    // ---- Mode réponse unique ----
    const correctLetter = correct.letters[0] || null;
    for (const li of lis) {
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');

      const onPick = () => {
        if (ul.classList.contains('is-answered')) return;
        ul.classList.add('is-answered');
        const picked = li.dataset.letter;
        const isCorrect = picked === correctLetter;
        li.classList.add('is-selected', isCorrect ? 'is-correct-pick' : 'is-wrong');
        if (correctLetter) {
          const correctLi = ul.querySelector(`li[data-letter="${correctLetter}"]`);
          if (correctLi && correctLi !== li) correctLi.classList.add('is-correct');
        }
        unlockReveal();
        persist(picked, isCorrect);
      };

      li.addEventListener('click', onPick);
      li.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(); }
      });
    }
  };

  // ---------- Process ----------
  const extractChoicesFromBody = (body2) => {
    const ps = [...body2.querySelectorAll(':scope > p')];
    const choicesPs = ps.filter((p) => /^\s*[A-E]\)/.test(p.textContent || ''));

    if (choicesPs.length >= 2) {
      const ul = document.createElement('ul');
      ul.className = 'choices';
      for (const p of choicesPs) {
        const letter = (p.textContent || '').match(/^\s*([A-E])\)/)[1];
        const li = document.createElement('li');
        li.dataset.letter = letter;
        li.innerHTML = p.innerHTML.replace(/^\s*[A-E]\)\s*/, '').replace(/[.,]\s*$/, '');
        ul.appendChild(li);
      }
      choicesPs[0].parentNode.replaceChild(ul, choicesPs[0]);
      for (let k = 1; k < choicesPs.length; k++) choicesPs[k].remove();
      return;
    }

    // Cas alternatif : un seul <p> avec "A) ... <br> B) ... <br> ..."
    const brP = ps.find((p) => {
      const t = p.textContent || '';
      return /\bA\)\s/.test(t) && /\bB\)\s/.test(t);
    });
    if (!brP) return;

    const split = splitChoicesInSummary({ innerHTML: brP.innerHTML });
    if (!split || split.choices.length < 2) return;

    const ul = document.createElement('ul');
    ul.className = 'choices';
    for (const c of split.choices) {
      const li = document.createElement('li');
      li.dataset.letter = c.letter;
      li.innerHTML = c.html.replace(/^(<br\s*\/?>)+/i, '').trim();
      ul.appendChild(li);
    }
    if (split.questionHtml && split.questionHtml.replace(/<[^>]+>/g, '').trim()) {
      brP.innerHTML = split.questionHtml;
      brP.parentNode.insertBefore(ul, brP.nextSibling);
    } else {
      brP.parentNode.replaceChild(ul, brP);
    }
  };

  const processQuiz = (detailsEl, idx) => {
    if (detailsEl.dataset.quizProcessed === '1') return;
    detailsEl.dataset.quizProcessed = '1';

    const summary = detailsEl.querySelector(':scope > summary');
    if (!summary) return;
    const qid = quizId(detailsEl, idx);
    // Capturé avant toute décoration/mutation du summary (q-tag, split des choix).
    detailsEl.dataset.qid = qid;
    detailsEl.dataset.category = extractCategory(summary.textContent);

    // 1) Réponse correcte AVANT de wrapper (pour ne pas perdre le texte)
    const correct = findCorrect(detailsEl);

    // 2) Choix depuis le summary, sinon depuis le body
    const split = splitChoicesInSummary(summary);
    if (split) {
      summary.innerHTML = split.questionHtml;
      const ul = document.createElement('ul');
      ul.className = 'choices';
      for (const c of split.choices) {
        const li = document.createElement('li');
        li.dataset.letter = c.letter;
        li.innerHTML = c.html;
        ul.appendChild(li);
      }
      const body = detailsEl.querySelector(':scope > div');
      if (body) {
        body.insertBefore(ul, body.firstChild);
      } else {
        const wrap = document.createElement('div');
        wrap.appendChild(ul);
        const nodes = [];
        let cur = summary.nextSibling;
        while (cur) {
          const nxt = cur.nextSibling;
          if (cur.nodeType === 1) nodes.push(cur);
          cur = nxt;
        }
        for (const n of nodes) wrap.appendChild(n);
        detailsEl.appendChild(wrap);
      }
    } else {
      const body2 = detailsEl.querySelector(':scope > div');
      if (body2) extractChoicesFromBody(body2);
    }

    decorateQTag(summary);

    const revealEl = wrapAnswerInReveal(detailsEl);
    attachChoiceHandlers(detailsEl, correct, revealEl, qid);

    // Restaurer l'état si déjà répondu
    const prev = (loadState()[pageKey()] || {})[qid];
    if (!prev) return;

    const ulCur = detailsEl.querySelector('.choices');
    if (ulCur) {
      ulCur.classList.add('is-answered');
      if (correct.multi) {
        const pickedSet = new Set((prev.picked || '').split(''));
        const answers = new Set(correct.letters);
        for (const li of ulCur.querySelectorAll('li')) {
          const l = li.dataset.letter;
          const chosen = pickedSet.has(l);
          const good = answers.has(l);
          li.setAttribute('aria-checked', chosen ? 'true' : 'false');
          if (chosen && good) li.classList.add('is-selected', 'is-correct-pick');
          else if (chosen && !good) li.classList.add('is-selected', 'is-wrong');
          else if (!chosen && good) li.classList.add('is-correct');
        }
        const b = detailsEl.querySelector('.quiz-check');
        if (b) b.disabled = true;
      } else {
        const pickedLi = ulCur.querySelector(`li[data-letter="${prev.picked}"]`);
        if (pickedLi) pickedLi.classList.add('is-selected', prev.correct ? 'is-correct-pick' : 'is-wrong');
        const correctLetter = correct.letters[0];
        if (correctLetter && correctLetter !== prev.picked) {
          ulCur.querySelector(`li[data-letter="${correctLetter}"]`)?.classList.add('is-correct');
        }
      }
    }
    if (revealEl) {
      revealEl.classList.remove('is-locked');
      const rs = revealEl.querySelector(':scope > summary');
      if (rs) rs.innerHTML = 'Voir la réponse complète';
    }
  };

  // ---------- Widget de progression (bottom-left) ----------
  const renderProgressWidget = () => {
    let widget = document.getElementById('cca-progress');
    const totalQ = document.querySelectorAll('details[data-quiz-processed="1"]').length;
    if (totalQ === 0) {
      widget?.remove();
      document.body.classList.remove('has-progress');
      return;
    }
    document.body.classList.add('has-progress');
    const pageQ = loadState()[pageKey()] || {};
    const answered = Object.keys(pageQ).length;
    const correct = Object.values(pageQ).filter((q) => q.correct).length;

    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'cca-progress';
      widget.className = 'cca-progress-widget';
      document.body.appendChild(widget);
    }

    const pct = Math.round((answered / totalQ) * 100);
    const scorePct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    // Score par catégorie (tag "(Domaine)" ou "(Scénario)" extrait du summary,
    // stocké sur chaque <details> par processQuiz). Purement dérivé du DOM au
    // rendu : aucun changement de forme dans le state persisté (STORAGE_KEY
    // inchangée, dégradation propre si un state plus ancien ne matche plus aucun
    // <details> de la page).
    const byCategory = new Map();
    for (const el of document.querySelectorAll('details[data-quiz-processed="1"]')) {
      const cat = el.dataset.category || 'Autre';
      if (!byCategory.has(cat)) byCategory.set(cat, { answered: 0, correct: 0 });
      const rec = pageQ[el.dataset.qid];
      if (rec) {
        const entry = byCategory.get(cat);
        entry.answered++;
        if (rec.correct) entry.correct++;
      }
    }
    const breakdownRows = [...byCategory.entries()]
      .filter(([, v]) => v.answered > 0)
      .sort((a, b) => a[0].localeCompare(b[0], 'fr'));

    const breakdownHtml = breakdownRows.length > 0
      ? `<details class="prog-breakdown">` +
        `<summary>Détail par catégorie</summary>` +
        `<div class="prog-breakdown-body">` +
        breakdownRows.map(([cat, v]) => {
          const p = Math.round((v.correct / v.answered) * 100);
          return `<div class="prog-breakdown-row"><span class="prog-breakdown-cat">${cat}</span>` +
            `<span class="prog-breakdown-score ${p >= 70 ? 'good' : 'warn'}">${v.correct} / ${v.answered} (${p}%)</span></div>`;
        }).join('') +
        `</div></details>`
      : '';

    widget.innerHTML =
      `<div class="prog-row"><span class="prog-label">Questions</span>` +
      `<strong>${answered} / ${totalQ}</strong></div>` +
      `<div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>` +
      (answered > 0
        ? `<div class="prog-score"><span class="prog-label">Score</span>` +
          `<strong class="${scorePct >= 70 ? 'good' : 'warn'}">${correct} / ${answered} (${scorePct}%)</strong></div>`
        : '') +
      breakdownHtml +
      `<button class="prog-reset" type="button" aria-label="Réinitialiser">Reset</button>`;

    widget.querySelector('.prog-reset')?.addEventListener('click', () => {
      if (!confirm('Effacer ton score sur cette page ?')) return;
      const st = loadState();
      delete st[pageKey()];
      saveState(st);
      location.reload();
    });

    // Le widget passe sur 3-4 lignes selon la largeur d'écran : on mesure sa
    // hauteur réelle plutôt que de supposer une valeur fixe (voir --progress-h,
    // utilisée par back-to-top / toc-fab pour ne pas chevaucher le widget).
    const updateProgressHeight = () => {
      document.documentElement.style.setProperty('--progress-h', `${widget.offsetHeight}px`);
    };
    updateProgressHeight();
    if (!widget._roAttached) {
      new ResizeObserver(updateProgressHeight).observe(widget);
      widget._roAttached = true;
    }
  };

  // ---------- Tables responsive : injecter data-label sur td ----------
  const decorateTablesForMobile = () => {
    for (const table of document.querySelectorAll('table')) {
      let headers = [...table.querySelectorAll('thead th')];
      if (headers.length === 0) {
        const firstRow = table.querySelector('tr');
        if (firstRow?.querySelector('th')) headers = [...firstRow.querySelectorAll('th')];
      }
      if (headers.length === 0) continue;
      const labels = headers.map((h) => (h.textContent || '').trim());
      for (const tr of table.querySelectorAll('tbody tr, tr')) {
        // Pas de <thead> dans ce corpus : la ligne d'en-tête est un <tr><th> ordinaire.
        // On la marque pour que le CSS mobile la masque (déjà dupliquée via data-label).
        if (tr.querySelector('th') && !tr.querySelector('td')) {
          tr.classList.add('table-header-row');
          continue;
        }
        [...tr.querySelectorAll('td')].forEach((td, i) => {
          if (!td.hasAttribute('data-label') && labels[i]) td.setAttribute('data-label', labels[i]);
        });
      }
    }
  };

  // ---------- Init ----------
  const init = () => {
    document.querySelectorAll('details').forEach((d, i) => {
      if (isQuiz(d)) processQuiz(d, i);
    });
    decorateTablesForMobile();
    renderProgressWidget();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
