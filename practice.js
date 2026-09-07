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

  /* Un titre dont toutes les questions sont masquées n'annonce plus rien : on le
   * masque avec elles, ainsi que le paragraphe d'intro qui le suit. */
  const hideEmptyHeadings = () => {
    for (const heading of document.querySelectorAll('main h2[id], main h3')) {
      let node = heading.nextElementSibling;
      let visible = false;
      const trailing = [];
      while (node && !/^H[23]$/.test(node.tagName)) {
        if (node.matches('details[data-task]')) {
          if (!node.hidden) visible = true;
        } else {
          trailing.push(node);
        }
        node = node.nextElementSibling;
      }
      const owns = heading.parentElement.querySelector('details[data-task]');
      if (!owns && !trailing.some((n) => n.querySelector?.('details[data-task]'))) continue;
      if (visible) continue;
      for (const el of [heading, ...trailing]) {
        el.hidden = true;
        el.dataset.filterHidden = '1';
      }
    }
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
