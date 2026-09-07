/* Filtre la banque de questions sur un task statement.
 *
 * Le défaut que ce script corrige : les six cours se terminent 35 fois par
 * « À tester — les questions de la banque étiquetées data-task="5.1" ». Les 112
 * questions portent bien l'attribut. Aucun script ne le lisait, il n'existait ni
 * lien, ni filtre, ni ancre : on demandait au réviseur de retrouver à la main
 * les questions d'une task dans une page qui en compte 112. La promesse était
 * écrite 35 fois et inexécutable.
 *
 * Angle mort : le filtre masque, il ne réordonne pas. Une task couverte par des
 * questions dispersées dans plusieurs scénarios laisse des titres de scénario
 * vides — d'où le masquage des sections devenues vides.
 */
(function () {
  const page = document.querySelector('.q-index');
  if (!page && !document.querySelector('details[data-task]')) return;

  const fr = (document.documentElement.lang || 'fr') === 'fr';
  const T = fr
    ? { on: (t, n) => `Filtré sur le task statement ${t} — ${n} question${n > 1 ? 's' : ''}`, all: 'Afficher les 112', none: (t) => `Aucune question ne porte le task statement ${t}` }
    : { on: (t, n) => `Filtered on task statement ${t} — ${n} question${n > 1 ? 's' : ''}`, all: 'Show all 112', none: (t) => `No question carries task statement ${t}` };

  const questions = [...document.querySelectorAll('details[data-task]')];
  if (!questions.length) return;

  const tasksOf = (el) => [el.dataset.task, ...(el.dataset.alsoTasks || '').split(' ')].filter(Boolean);

  let banner = null;

  const clear = () => {
    for (const el of questions) el.hidden = false;
    for (const el of document.querySelectorAll('[data-filter-hidden]')) {
      el.hidden = false;
      delete el.dataset.filterHidden;
    }
    banner?.remove();
    banner = null;
  };

  /* Un groupe dont toutes les questions sont masquées n'annonce plus rien : son
   * titre et sa prose de contexte partent avec elles.
   *
   * Le regroupement se fait par frontière et non par « le titre puis ses frères
   * jusqu'au prochain titre » : sur cette page un h2 est enveloppé dans
   * <div class="section-header"> (tools/lib/practice.mjs), si bien qu'un
   * terminateur qui ne connaît que H2/H3 ne voit jamais de h2 — les en-têtes de
   * scénario restaient affichés au-dessus de zéro question, et le dernier h3 de
   * la page avalait tout ce qui suit, table de couverture comprise.
   *
   * Un groupe qui ne porte aucune question n'est jamais masqué : la section
   * « Couverture » n'en a pas et doit rester lisible sous n'importe quel filtre. */
  const isH2 = (el) => el.matches('.section-header');
  const isH3 = (el) => el.tagName === 'H3';

  const hideEmptyGroups = (root, isBoundary) => {
    let group = null;
    const groups = [];
    for (const node of root.children) {
      if (isBoundary(node)) {
        group = { boundary: node, body: [] };
        groups.push(group);
        continue;
      }
      group?.body.push(node);
    }

    for (const { boundary, body } of groups) {
      const owned = [boundary, ...body].flatMap((n) => [
        ...(n.matches('details[data-task]') ? [n] : []),
        ...n.querySelectorAll('details[data-task]'),
      ]);
      if (!owned.length || owned.some((d) => !d.hidden)) continue;
      for (const el of [boundary, ...body]) {
        if (el.hidden) continue;
        el.hidden = true;
        el.dataset.filterHidden = '1';
      }
    }
  };

  /* Le rail de sommaire est construit par toc.js depuis les h2 de la page, avant
   * que le filtre ne masque quoi que ce soit : sans ce nettoyage il garde des
   * entrées qui ne mènent plus nulle part. */
  const hideEmptyTocEntries = () => {
    for (const link of document.querySelectorAll('.toc-rail a[href^="#"], .toc a[href^="#"]')) {
      const target = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1)));
      if (!target?.closest('[data-filter-hidden]') && !target?.hasAttribute('data-filter-hidden')) continue;
      link.closest('li') ? (link.closest('li').hidden = true) : (link.hidden = true);
      (link.closest('li') || link).dataset.filterHidden = '1';
    }
  };

  const hideEmptyHeadings = () => {
    const root = document.querySelector('main') || document.body;
    hideEmptyGroups(root, isH3);
    hideEmptyGroups(root, isH2);
    hideEmptyTocEntries();
  };

  const apply = () => {
    clear();
    const task = new URLSearchParams(location.search).get('task');
    if (!task || !/^\d+\.\d+$/.test(task)) return;

    let n = 0;
    for (const el of questions) {
      const match = tasksOf(el).includes(task);
      el.hidden = !match;
      if (match) n += 1;
    }
    hideEmptyHeadings();

    banner = document.createElement('div');
    banner.className = 'task-filter';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `<span>${n ? T.on(task, n) : T.none(task)}</span>`;

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'task-filter-clear';
    reset.textContent = T.all;
    reset.addEventListener('click', () => {
      history.replaceState(null, '', location.pathname);
      apply();
    });
    banner.appendChild(reset);

    const anchor = document.querySelector('main') || document.body;
    anchor.insertBefore(banner, anchor.firstChild);
    banner.scrollIntoView({ block: 'nearest' });
  };

  window.addEventListener('popstate', apply);
  apply();
})();
