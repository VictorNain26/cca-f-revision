/* CCA-F Revision — quiz UX enhancer
 * Post-traite les blocs <details> de quiz au chargement :
 *   - extrait les choix A/B/C/D du <summary> vers une <ul class="choices">
 *   - emballe les paragraphes de réponse dans un <details class="answer-reveal">
 *   - met une pastille .q-tag stylée autour du "Q1" / "Q2"
 *   - marque le choix correct (lecture du "Réponse : A/B/C/D") avec .is-correct
 */
(function () {
  'use strict';

  function isQuiz(details) {
    if (!details) return false;
    if (details.classList.contains('answer-reveal')) return false;
    var summary = details.querySelector(':scope > summary');
    if (!summary) return false;
    var text = (summary.textContent || '').trim();
    return /^Q\s*\d+/i.test(text);
  }

  function decorateQTag(summary) {
    if (summary.querySelector('.q-tag')) return;
    var html = summary.innerHTML;
    var m = html.match(/^\s*(?:<strong>)?\s*(Q\s*\d+)(?:\.|\s*:)?\s*(?:<\/strong>)?\s*(.*)$/is);
    if (!m) return;
    var qnum = m[1].replace(/\s+/g, '');
    var rest = m[2] || '';
    rest = rest.replace(/^\s*<\/?strong>\s*/i, '');
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
      var raw = choicesPart.slice(cursor, m.index).replace(new RegExp('^\\s*' + current + '\\)\\s*'), '').trim();
      raw = raw.replace(/[.,]\s*$/, '');
      choices.push({ letter: current, html: raw });
      cursor = m.index;
      current = letters[i];
    }
    var lastRaw = choicesPart.slice(cursor).replace(new RegExp('^\\s*' + current + '\\)\\s*'), '').trim();
    lastRaw = lastRaw.replace(/[.,]\s*$/, '');
    if (lastRaw) choices.push({ letter: current, html: lastRaw });

    if (choices.length < 2) return null;
    return { questionHtml: questionPart, choices: choices };
  }

  function findCorrectLetter(bodyEl) {
    var text = (bodyEl.textContent || '').replace(/\s+/g, ' ');
    var m = text.match(/R[ée]ponse\s*:?\s*<?([A-E])\b/i);
    if (m) return m[1].toUpperCase();
    var strong = bodyEl.querySelector('strong');
    if (strong) {
      var sm = (strong.textContent || '').match(/[Rr][ée]ponse\s*[:=]?\s*([A-E])\b/);
      if (sm) return sm[1].toUpperCase();
    }
    return null;
  }

  function wrapAnswerInReveal(detailsEl) {
    var body = detailsEl.querySelector(':scope > div');
    var directChildren = Array.from(detailsEl.children);
    var bodyParas = [];
    var holder;

    if (body) {
      bodyParas = Array.from(body.children).filter(function (el) {
        return !el.classList.contains('choices');
      });
      if (bodyParas.length === 0) return;
      holder = body;
    } else {
      bodyParas = directChildren.filter(function (el) {
        return el.tagName !== 'SUMMARY';
      });
      if (bodyParas.length === 0) return;
      var newDiv = document.createElement('div');
      bodyParas.forEach(function (el) { newDiv.appendChild(el); });
      detailsEl.appendChild(newDiv);
      holder = newDiv;
      bodyParas = Array.from(newDiv.children);
    }

    var reveal = document.createElement('details');
    reveal.className = 'answer-reveal';
    var revSummary = document.createElement('summary');
    revSummary.textContent = 'Voir la réponse';
    reveal.appendChild(revSummary);
    var revBody = document.createElement('div');
    bodyParas.forEach(function (el) { revBody.appendChild(el); });
    reveal.appendChild(revBody);

    var firstP = revBody.querySelector('p');
    if (firstP) {
      var t = (firstP.textContent || '').trim();
      if (/^R[ée]ponse\s*[:.]/i.test(t)) {
        firstP.classList.add('answer-correct');
      }
    }

    holder.appendChild(reveal);
  }

  function markCorrectChoice(detailsEl, correctLetter) {
    if (!correctLetter) return;
    var li = detailsEl.querySelector('.choices li[data-letter="' + correctLetter + '"]');
    if (li) li.classList.add('is-correct');
  }

  function processQuiz(detailsEl) {
    if (detailsEl.dataset.quizProcessed === '1') return;
    detailsEl.dataset.quizProcessed = '1';

    var summary = detailsEl.querySelector(':scope > summary');
    if (!summary) return;

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
        }
      }
    }

    decorateQTag(summary);

    var correctLetter = findCorrectLetter(detailsEl);
    markCorrectChoice(detailsEl, correctLetter);

    wrapAnswerInReveal(detailsEl);
  }

  function init() {
    document.querySelectorAll('details').forEach(function (d) {
      if (isQuiz(d)) processQuiz(d);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
