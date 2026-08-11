/* CCA-F Revision — quiz UX enhancer (ESNext)
 * Post-traite les blocs <details> de quiz au chargement :
 *   - extrait les choix A/B/C/D des <p data-opt> du body vers une <ul class="choices">
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
  // Les énoncés sont en anglais (langue de l'examen), le chrome reste en français.
  const ANSWER_LABEL = /^\s*(?:R[ée]ponses?|Answers?)\s*[:.]/i;

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

  // Retourne { letters: ['A', ...], multi: bool }.
  // data-answer sur <p class="correct"> est la source unique : le contrat retire
  // la lettre du texte du corrigé, elle est réinjectée depuis la position
  // courante des options nommées dans data-answer.
  const findCorrect = (detailsEl) => {
    const correctP = detailsEl.querySelector('p.correct');
    if (!correctP?.dataset.answer) return { letters: [], multi: false, opts: [] };
    const opts = correctP.dataset.answer.split(/\s+/).filter(Boolean);
    const letters = opts
      .map((o) => detailsEl.querySelector(`.choices li[data-opt="${o}"]`)?.dataset.letter)
      .filter(Boolean);
    return { letters, multi: letters.length > 1, opts };
  };

  // ---------- Verrou du corrigé ----------
  // `pointer-events: none` (styles.css) ne ferme que la souris. Le <summary>
  // reste dans l'ordre de tabulation, et Entrée l'active nativement : sans ce
  // preventDefault, un utilisateur au clavier ouvre le corrigé sans répondre.
  const unlockReveal = (revealEl) => {
    if (!revealEl) return;
    revealEl.classList.remove('is-locked');
    const revSummary = revealEl.querySelector(':scope > summary');
    if (!revSummary) return;
    revSummary.innerHTML = 'Voir la réponse complète';
    revSummary.removeAttribute('aria-disabled');
  };

  // ---------- Wrap réponse dans <details class="answer-reveal"> ----------
  const wrapAnswerInReveal = (detailsEl) => {
    let holder = detailsEl.querySelector(':scope > div');
    if (!holder) {
      const loose = [...detailsEl.children].filter((el) => el.tagName !== 'SUMMARY');
      if (loose.length === 0) return null;
      holder = document.createElement('div');
      for (const el of loose) holder.appendChild(el);
      detailsEl.appendChild(holder);
    }

    // L'énoncé (Scenario / Question) doit rester lisible pendant qu'on répond :
    // seul ce qui suit le <hr> part dans le bloc masqué. Sans <hr>, on coupe au
    // premier paragraphe de réponse.
    const children = [...holder.children];
    const sep = children.find((el) => el.tagName === 'HR');
    let bodyParas;
    if (sep) {
      bodyParas = children.slice(children.indexOf(sep) + 1);
      sep.remove();
    } else {
      const start = children.findIndex(
        (el) => el.classList.contains('correct') || ANSWER_LABEL.test(el.textContent || '')
      );
      bodyParas = start >= 0 ? children.slice(start) : children;
    }
    bodyParas = bodyParas.filter(
      (el) => !el.classList.contains('choices') && !el.classList.contains('quiz-feedback')
    );
    if (bodyParas.length === 0) return null;

    const reveal = document.createElement('details');
    reveal.className = 'answer-reveal is-locked';
    const revSummary = document.createElement('summary');
    revSummary.innerHTML = '<span class="lock-hint">🔒 Réponds d\'abord pour voir l\'explication</span>';
    revSummary.setAttribute('aria-disabled', 'true');
    revSummary.addEventListener('click', (ev) => {
      if (reveal.classList.contains('is-locked')) ev.preventDefault();
    });
    reveal.appendChild(revSummary);
    const revBody = document.createElement('div');
    for (const el of bodyParas) revBody.appendChild(el);
    reveal.appendChild(revBody);

    const firstP = revBody.querySelector('p');
    if (firstP && ANSWER_LABEL.test((firstP.textContent || '').trim())) {
      firstP.classList.add('answer-correct');
    }

    holder.appendChild(reveal);
    return reveal;
  };

  // ---------- Interaction : clic sur un choix ----------
  const attachChoiceHandlers = (detailsEl, correct, revealEl, qid) => {
    const ul = detailsEl.querySelector('.choices');
    if (!ul) return;

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
        unlockReveal(revealEl);
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
        unlockReveal(revealEl);
        persist(picked, isCorrect);
      };

      li.addEventListener('click', onPick);
      li.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick(); }
      });
    }
  };

  // ---------- Process ----------
  // Le contrat de question impose un <p data-opt> par option : c'est la seule
  // forme d'où les choix se lisent, et findCorrect n'apparie la clé que par ce
  // data-opt. Reconstruire des choix d'après un « A) » du texte donnerait des
  // <li> sans data-opt, donc une question sans clé, sans que rien le signale.
  const extractChoicesFromBody = (body) => {
    const choicesPs = [...body.querySelectorAll(':scope > p')].filter((p) => p.dataset.opt);
    if (choicesPs.length < 2) return;

    const ul = document.createElement('ul');
    ul.className = 'choices';
    choicesPs.forEach((p, index) => {
      const li = document.createElement('li');
      // L'identité d'une option est son data-opt ; sa lettre est sa position.
      li.dataset.opt = p.dataset.opt;
      li.dataset.letter = LETTERS[index];
      li.innerHTML = p.innerHTML.replace(/^\s*[A-E]\)\s*/, '').replace(/[.,]\s*$/, '');
      ul.appendChild(li);
    });
    choicesPs[0].parentNode.replaceChild(ul, choicesPs[0]);
    for (let k = 1; k < choicesPs.length; k++) choicesPs[k].remove();
  };

  const processQuiz = (detailsEl, idx) => {
    if (detailsEl.dataset.quizProcessed === '1') return;
    detailsEl.dataset.quizProcessed = '1';

    const summary = detailsEl.querySelector(':scope > summary');
    if (!summary) return;
    const qid = quizId(detailsEl, idx);
    // Capturé avant toute décoration du summary (q-tag).
    detailsEl.dataset.qid = qid;

    // 1) Choix depuis les <p data-opt> du body
    const body = detailsEl.querySelector(':scope > div');
    if (body) extractChoicesFromBody(body);

    // 2) Réponse correcte : lue via .choices li[data-opt=…], donc APRÈS que le
    // ul.choices ci-dessus existe.
    const correct = findCorrect(detailsEl);

    decorateQTag(summary);

    const revealEl = wrapAnswerInReveal(detailsEl);

    // Le corrigé et les explications ne portent plus de lettre en dur : elle
    // est réinjectée depuis la position courante des options. Le badge ✓ occupe
    // déjà ::before sur .answer-correct, d'où l'injection dans le texte.
    if (detailsEl.id && correct.letters.length) {
      const correctP = detailsEl.querySelector('.correct');
      if (correctP && !/\b[A-E]\)/.test(correctP.textContent || '')) {
        correctP.innerHTML = correctP.innerHTML.replace(
          /(Answers?\s*:\s*)/i,
          `$1${correct.letters.join(', ')}) `
        );
      }
      for (const li of detailsEl.querySelectorAll('.answer-reveal li[data-opt]')) {
        const letter = detailsEl.querySelector(`.choices li[data-opt="${li.dataset.opt}"]`)?.dataset.letter;
        if (letter && !/^\s*[A-E]\)/.test(li.textContent || '')) {
          li.innerHTML = `${letter}) ${li.innerHTML}`;
        }
      }
    }

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
    unlockReveal(revealEl);
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
