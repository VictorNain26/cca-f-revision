/* CCA-F Revision — quiz UX enhancer
 * Post-traite les blocs <details> de quiz au chargement :
 *   - extrait les choix A/B/C/D du <summary> vers une <ul class="choices">
 *   - rend les choix cliquables (feedback immédiat correct / wrong)
 *   - le bouton "Voir la réponse" apparaît seulement APRÈS un clic
 *   - persiste le score par page dans localStorage
 *   - affiche un widget de progression en bas à gauche
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cca-quiz-state-v2';

  // ---------- localStorage helpers ----------
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* quota plein, ignorer */ }
  }

  function pageKey() {
    var p = window.location.pathname.split('/').pop() || 'index';
    return p.replace(/\.html$/, '');
  }

  function quizId(detailsEl, idx) {
    if (detailsEl.id) return detailsEl.id;
    var summary = detailsEl.querySelector(':scope > summary');
    var text = summary ? (summary.textContent || '').trim().slice(0, 60) : '';
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return 'q' + idx + '-' + Math.abs(hash).toString(36);
  }

  // ---------- Détection ----------
  function isQuiz(details) {
    if (!details) return false;
    if (details.classList.contains('answer-reveal')) return false;
    var summary = details.querySelector(':scope > summary');
    if (!summary) return false;
    return /^Q\s*\d+/i.test((summary.textContent || '').trim());
  }

  // ---------- Décorations ----------
  function decorateQTag(summary) {
    if (summary.querySelector('.q-tag')) return;
    var html = summary.innerHTML;
    var m = html.match(/^\s*(?:<strong>)?\s*(Q\s*\d+)(?:\.|\s*:)?\s*(?:<\/strong>)?\s*(.*)$/is);
    if (!m) return;
    var qnum = m[1].replace(/\s+/g, '');
    var rest = (m[2] || '').replace(/^\s*<\/?strong>\s*/i, '');
    summary.innerHTML = '<span class="q-tag">' + qnum + '</span>' + rest;
  }

  function splitChoicesInSummary(summary) {
    var html = summary.innerHTML;
    var aIdx = html.search(/\b\s*A\)\s/);
    if (aIdx < 0) return null;
    var questionPart = html.slice(0, aIdx).trim();
    var choicesPart = html.slice(aIdx);
    var letters = ['A', 'B', 'C', 'D', 'E'];
    var choices = [];
    var cursor = 0;
    var current = letters[0];
    for (var i = 1; i < letters.length; i++) {
      var pat = new RegExp('\\b' + letters[i] + '\\)\\s', 'g');
      pat.lastIndex = cursor;
      var m = pat.exec(choicesPart);
      if (!m) break;
      var raw = choicesPart.slice(cursor, m.index)
        .replace(new RegExp('^\\s*' + current + '\\)\\s*'), '').trim()
        .replace(/[.,]\s*$/, '');
      choices.push({ letter: current, html: raw });
      cursor = m.index;
      current = letters[i];
    }
    var lastRaw = choicesPart.slice(cursor)
      .replace(new RegExp('^\\s*' + current + '\\)\\s*'), '').trim()
      .replace(/[.,]\s*$/, '');
    if (lastRaw) choices.push({ letter: current, html: lastRaw });
    if (choices.length < 2) return null;
    return { questionHtml: questionPart, choices: choices };
  }

  function findCorrectLetter(detailsEl) {
    // Cherche dans tous les descendants directs (avant wrap reveal)
    var text = (detailsEl.textContent || '').replace(/\s+/g, ' ');
    // Premier match "Réponse : X" ou "Reponse : X"
    var m = text.match(/R[ée]ponse\s*:?\s*<?([A-E])\b/i);
    if (m) return m[1].toUpperCase();
    return null;
  }

  // ---------- Wrap réponse dans <details class="answer-reveal"> ----------
  function wrapAnswerInReveal(detailsEl) {
    var body = detailsEl.querySelector(':scope > div');
    var bodyParas = [];
    var holder;

    if (body) {
      bodyParas = Array.from(body.children).filter(function (el) {
        return !el.classList.contains('choices') && !el.classList.contains('quiz-feedback');
      });
      if (bodyParas.length === 0) return null;
      holder = body;
    } else {
      bodyParas = Array.from(detailsEl.children).filter(function (el) {
        return el.tagName !== 'SUMMARY';
      });
      if (bodyParas.length === 0) return null;
      var newDiv = document.createElement('div');
      bodyParas.forEach(function (el) { newDiv.appendChild(el); });
      detailsEl.appendChild(newDiv);
      holder = newDiv;
      bodyParas = Array.from(newDiv.children);
    }

    var reveal = document.createElement('details');
    reveal.className = 'answer-reveal is-locked';
    var revSummary = document.createElement('summary');
    revSummary.innerHTML = '<span class="lock-hint">🔒 Réponds d\'abord pour voir l\'explication</span>';
    reveal.appendChild(revSummary);
    var revBody = document.createElement('div');
    bodyParas.forEach(function (el) { revBody.appendChild(el); });
    reveal.appendChild(revBody);

    var firstP = revBody.querySelector('p');
    if (firstP && /^R[ée]ponse\s*[:.]/i.test((firstP.textContent || '').trim())) {
      firstP.classList.add('answer-correct');
    }

    holder.appendChild(reveal);
    return reveal;
  }

  // ---------- Interaction : clic sur un choix ----------
  function attachChoiceHandlers(detailsEl, correctLetter, revealEl, qid) {
    var ul = detailsEl.querySelector('.choices');
    if (!ul) return;
    var lis = ul.querySelectorAll('li');
    lis.forEach(function (li) {
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      var clickHandler = function () {
        if (ul.classList.contains('is-answered')) return;
        ul.classList.add('is-answered');
        var picked = li.getAttribute('data-letter');
        var isCorrect = picked === correctLetter;
        li.classList.add('is-selected');
        li.classList.add(isCorrect ? 'is-correct-pick' : 'is-wrong');
        // Marquer le bon choix dans tous les cas (après réponse)
        if (correctLetter) {
          var correctLi = ul.querySelector('li[data-letter="' + correctLetter + '"]');
          if (correctLi && correctLi !== li) correctLi.classList.add('is-correct');
        }
        // Débloquer le reveal
        if (revealEl) {
          revealEl.classList.remove('is-locked');
          var revSummary = revealEl.querySelector(':scope > summary');
          if (revSummary) revSummary.innerHTML = 'Voir la réponse complète';
        }
        // Tracker dans localStorage
        var state = loadState();
        var key = pageKey();
        if (!state[key]) state[key] = {};
        state[key][qid] = { picked: picked, correct: isCorrect, ts: Date.now() };
        saveState(state);
        renderProgressWidget();
      };
      li.addEventListener('click', clickHandler);
      li.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); clickHandler(); }
      });
    });
  }

  // ---------- Process ----------
  function processQuiz(detailsEl, idx) {
    if (detailsEl.dataset.quizProcessed === '1') return;
    detailsEl.dataset.quizProcessed = '1';

    var summary = detailsEl.querySelector(':scope > summary');
    if (!summary) return;
    var qid = quizId(detailsEl, idx);

    // 1) Cherche réponse correcte AVANT de wrapper (pour ne pas perdre le texte)
    var correctLetter = findCorrectLetter(detailsEl);

    // 2) Extrait choix de summary OU de body
    var split = splitChoicesInSummary(summary);
    if (split) {
      summary.innerHTML = split.questionHtml;
      var ul = document.createElement('ul');
      ul.className = 'choices';
      split.choices.forEach(function (c) {
        var li = document.createElement('li');
        li.setAttribute('data-letter', c.letter);
        li.innerHTML = c.html;
        ul.appendChild(li);
      });
      var body = detailsEl.querySelector(':scope > div');
      if (body) {
        body.insertBefore(ul, body.firstChild);
      } else {
        var wrap = document.createElement('div');
        wrap.appendChild(ul);
        var nodes = [];
        var cur = summary.nextSibling;
        while (cur) {
          var nxt = cur.nextSibling;
          if (cur.nodeType === 1) nodes.push(cur);
          cur = nxt;
        }
        nodes.forEach(function (n) { wrap.appendChild(n); });
        detailsEl.appendChild(wrap);
      }
    } else {
      // Format Practice : choix déjà dans body en <p>A) ...</p>, <p>B) ...</p>...
      // OU format D5 : choix dans UN seul <p> séparés par <br>
      var body2 = detailsEl.querySelector(':scope > div');
      if (body2) {
        var ps = Array.from(body2.querySelectorAll(':scope > p'));
        var choicesPs = ps.filter(function (p) {
          return /^\s*[A-E]\)/.test(p.textContent || '');
        });
        if (choicesPs.length >= 2) {
          var ul2 = document.createElement('ul');
          ul2.className = 'choices';
          choicesPs.forEach(function (p) {
            var letter = (p.textContent || '').match(/^\s*([A-E])\)/)[1];
            var html = p.innerHTML.replace(/^\s*[A-E]\)\s*/, '').replace(/[.,]\s*$/, '');
            var li = document.createElement('li');
            li.setAttribute('data-letter', letter);
            li.innerHTML = html;
            ul2.appendChild(li);
          });
          choicesPs[0].parentNode.replaceChild(ul2, choicesPs[0]);
          for (var k = 1; k < choicesPs.length; k++) choicesPs[k].remove();
        } else {
          // Cas 2 : un seul <p> avec "A) ... <br> B) ... <br> ..."
          var brP = ps.find(function (p) {
            var t = p.textContent || '';
            return /\bA\)\s/.test(t) && /\bB\)\s/.test(t);
          });
          if (brP) {
            var fakeSummary = { innerHTML: brP.innerHTML };
            var split2 = splitChoicesInSummary(fakeSummary);
            if (split2 && split2.choices.length >= 2) {
              var ul3 = document.createElement('ul');
              ul3.className = 'choices';
              split2.choices.forEach(function (c) {
                var li = document.createElement('li');
                li.setAttribute('data-letter', c.letter);
                li.innerHTML = c.html.replace(/^(<br\s*\/?>)+/i, '').trim();
                ul3.appendChild(li);
              });
              if (split2.questionHtml && split2.questionHtml.replace(/<[^>]+>/g, '').trim()) {
                brP.innerHTML = split2.questionHtml;
                brP.parentNode.insertBefore(ul3, brP.nextSibling);
              } else {
                brP.parentNode.replaceChild(ul3, brP);
              }
            }
          }
        }
      }
    }

    decorateQTag(summary);

    var revealEl = wrapAnswerInReveal(detailsEl);
    attachChoiceHandlers(detailsEl, correctLetter, revealEl, qid);

    // Restaurer état si déjà répondu
    var state = loadState();
    var prev = (state[pageKey()] || {})[qid];
    if (prev) {
      var ulCur = detailsEl.querySelector('.choices');
      if (ulCur) {
        ulCur.classList.add('is-answered');
        var pickedLi = ulCur.querySelector('li[data-letter="' + prev.picked + '"]');
        if (pickedLi) {
          pickedLi.classList.add('is-selected');
          pickedLi.classList.add(prev.correct ? 'is-correct-pick' : 'is-wrong');
        }
        if (correctLetter && correctLetter !== prev.picked) {
          var corLi = ulCur.querySelector('li[data-letter="' + correctLetter + '"]');
          if (corLi) corLi.classList.add('is-correct');
        }
      }
      if (revealEl) {
        revealEl.classList.remove('is-locked');
        var rs = revealEl.querySelector(':scope > summary');
        if (rs) rs.innerHTML = 'Voir la réponse complète';
      }
    }
  }

  // ---------- Widget de progression (bottom-left) ----------
  function renderProgressWidget() {
    var widget = document.getElementById('cca-progress');
    var totalQ = document.querySelectorAll('details[data-quiz-processed="1"]').length;
    if (totalQ === 0) {
      if (widget) widget.remove();
      return;
    }
    var state = loadState();
    var pageQ = state[pageKey()] || {};
    var answered = Object.keys(pageQ).length;
    var correct = Object.values(pageQ).filter(function (q) { return q.correct; }).length;

    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'cca-progress';
      widget.className = 'cca-progress-widget';
      document.body.appendChild(widget);
    }

    var pct = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;
    var scorePct = answered > 0 ? Math.round((correct / answered) * 100) : 0;

    widget.innerHTML =
      '<div class="prog-row"><span class="prog-label">Questions</span>' +
      '<strong>' + answered + ' / ' + totalQ + '</strong></div>' +
      '<div class="prog-bar"><div class="prog-fill" style="width:' + pct + '%"></div></div>' +
      (answered > 0 ?
        '<div class="prog-score"><span class="prog-label">Score</span>' +
        '<strong class="' + (scorePct >= 70 ? 'good' : 'warn') + '">' +
        correct + ' / ' + answered + ' (' + scorePct + '%)</strong></div>' : '') +
      '<button class="prog-reset" type="button" aria-label="Réinitialiser">Reset</button>';

    var resetBtn = widget.querySelector('.prog-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (!confirm('Effacer ton score sur cette page ?')) return;
        var st = loadState();
        delete st[pageKey()];
        saveState(st);
        location.reload();
      });
    }
  }

  // ---------- Tables responsive : injecter data-label sur td ----------
  function decorateTablesForMobile() {
    document.querySelectorAll('table').forEach(function (table) {
      var headers = Array.from(table.querySelectorAll('thead th'));
      // Si pas de thead, prendre le premier <tr> avec des <th>
      if (headers.length === 0) {
        var firstRow = table.querySelector('tr');
        if (firstRow && firstRow.querySelector('th')) {
          headers = Array.from(firstRow.querySelectorAll('th'));
        }
      }
      if (headers.length === 0) return;
      var labels = headers.map(function (h) { return (h.textContent || '').trim(); });
      table.querySelectorAll('tbody tr, tr').forEach(function (tr) {
        if (tr.querySelector('th') && !tr.querySelector('td')) return;
        Array.from(tr.querySelectorAll('td')).forEach(function (td, i) {
          if (!td.hasAttribute('data-label') && labels[i]) {
            td.setAttribute('data-label', labels[i]);
          }
        });
      });
    });
  }

  // ---------- Init ----------
  function init() {
    document.querySelectorAll('details').forEach(function (d, i) {
      if (isQuiz(d)) processQuiz(d, i);
    });
    decorateTablesForMobile();
    renderProgressWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
