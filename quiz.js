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

  const findCorrectLetter = (detailsEl) => {
    const text = (detailsEl.textContent || '').replace(/\s+/g, ' ');
    const m = text.match(/R[ée]ponse\s*:?\s*<?([A-E])\b/i);
    return m ? m[1].toUpperCase() : null;
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
    if (firstP && /^R[ée]ponse\s*[:.]/i.test((firstP.textContent || '').trim())) {
      firstP.classList.add('answer-correct');
    }

    holder.appendChild(reveal);
    return reveal;
  };

  // ---------- Interaction : clic sur un choix ----------
  const attachChoiceHandlers = (detailsEl, correctLetter, revealEl, qid) => {
    const ul = detailsEl.querySelector('.choices');
    if (!ul) return;

    const unlockReveal = () => {
      if (!revealEl) return;
      revealEl.classList.remove('is-locked');
      const revSummary = revealEl.querySelector(':scope > summary');
      if (revSummary) revSummary.innerHTML = 'Voir la réponse complète';
    };

    for (const li of ul.querySelectorAll('li')) {
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

        const state = loadState();
        const key = pageKey();
        (state[key] ??= {})[qid] = { picked, correct: isCorrect, ts: Date.now() };
        saveState(state);
        renderProgressWidget();
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

    // 1) Réponse correcte AVANT de wrapper (pour ne pas perdre le texte)
    const correctLetter = findCorrectLetter(detailsEl);

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
    attachChoiceHandlers(detailsEl, correctLetter, revealEl, qid);

    // Restaurer l'état si déjà répondu
    const prev = (loadState()[pageKey()] || {})[qid];
    if (!prev) return;

    const ulCur = detailsEl.querySelector('.choices');
    if (ulCur) {
      ulCur.classList.add('is-answered');
      const pickedLi = ulCur.querySelector(`li[data-letter="${prev.picked}"]`);
      if (pickedLi) pickedLi.classList.add('is-selected', prev.correct ? 'is-correct-pick' : 'is-wrong');
      if (correctLetter && correctLetter !== prev.picked) {
        ulCur.querySelector(`li[data-letter="${correctLetter}"]`)?.classList.add('is-correct');
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

    widget.innerHTML =
      `<div class="prog-row"><span class="prog-label">Questions</span>` +
      `<strong>${answered} / ${totalQ}</strong></div>` +
      `<div class="prog-bar"><div class="prog-fill" style="width:${pct}%"></div></div>` +
      (answered > 0
        ? `<div class="prog-score"><span class="prog-label">Score</span>` +
          `<strong class="${scorePct >= 70 ? 'good' : 'warn'}">${correct} / ${answered} (${scorePct}%)</strong></div>`
        : '') +
      `<button class="prog-reset" type="button" aria-label="Réinitialiser">Reset</button>`;

    widget.querySelector('.prog-reset')?.addEventListener('click', () => {
      if (!confirm('Effacer ton score sur cette page ?')) return;
      const st = loadState();
      delete st[pageKey()];
      saveState(st);
      location.reload();
    });
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
        if (tr.querySelector('th') && !tr.querySelector('td')) continue;
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
