/* Index des questions du corpus.
 * Une question est un <details> dont le <summary> commence par « Qn » — même
 * détection que quiz.js, pour que le contrôle voie exactement ce que le lecteur
 * voit. Le module ne porte aucune règle : il décrit, il ne juge pas.
 * L'empreinte ne retient que les identifiants de code et les valeurs chiffrées,
 * les deux seuls éléments qui survivent à une traduction — c'est ce qui permet
 * d'apparier une question française et sa version anglaise.
 * Requiert jsdom (devDependency) et Node >= 20.11.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

const OPTION_RE = /^\s*([A-E])\)/;
const QUIZ_SUMMARY_RE = /^Q\s*\d+/i;

export const pagePrefix = (file) =>
  file === 'Practice_Questions.html' ? 'pq' : file.slice(0, 2).toLowerCase();

export const fingerprint = (el) => {
  const text = el.textContent || '';
  const code = [...el.querySelectorAll('code')].map((c) => (c.textContent || '').trim().toLowerCase());
  const nums = (text.match(/\b\d+(?:[.,]\d+)?\s*%?/g) || []).map((s) => s.replace(/\s+/g, ''));
  return new Set([...code, ...nums].filter((t) => t.length > 1));
};

export const overlap = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
};

export const parseQuestions = (html, file) => {
  const doc = new JSDOM(html).window.document;
  const prefix = pagePrefix(file);

  return [...doc.querySelectorAll('details')]
    .filter((d) => QUIZ_SUMMARY_RE.test((d.querySelector(':scope > summary')?.textContent || '').trim()))
    .map((d) => {
      const label = (d.querySelector(':scope > summary')?.textContent || '').trim();
      const tagged = [...d.querySelectorAll('p[data-opt]')];
      const optionEls = tagged.length
        ? tagged
        : [...d.querySelectorAll('p')].filter((p) => OPTION_RE.test(p.textContent || ''));
      const correct = d.querySelector('p.correct');
      const stripped = d.cloneNode(true);
      for (const c of stripped.querySelectorAll('code')) c.remove();

      return {
        file,
        prefix,
        id: d.id || null,
        migrated: Boolean(d.id),
        qnum: Number((label.match(/^Q\s*(\d+)/i) || [, 0])[1]),
        label,
        domain: d.dataset.domain || null,
        task: d.dataset.task || null,
        citedTask: ((d.textContent || '').match(/\bTask\s+(\d\.\d+)\b/) || [, null])[1],
        options: optionEls.map((p, index) => ({
          opt: p.dataset.opt ?? null,
          letterInText: ((p.textContent || '').match(OPTION_RE) || [, null])[1],
          index,
        })),
        answer: (correct?.dataset.answer || '').split(/\s+/).filter(Boolean),
        answerText: (correct?.textContent || '').trim(),
        explanations: [...d.querySelectorAll('li[data-opt]')].map((li) => li.dataset.opt),
        prose: (stripped.textContent || '').replace(/\s+/g, ' ').trim(),
        fp: fingerprint(d),
      };
    });
};

export const loadCorpus = () =>
  fs.readdirSync(ROOT)
    .filter((f) => /^(D\d_.*|Practice_Questions)\.html$/.test(f))
    .sort()
    .flatMap((f) => parseQuestions(fs.readFileSync(path.join(ROOT, f), 'utf8'), f));
