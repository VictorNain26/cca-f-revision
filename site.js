/* Comportements de chrome partagés par toutes les pages.
   Extrait des dix copies inline identiques qui vivaient en fin de <body>.
   Script classique (pas de module) pour rester ouvrable en file:// hors serveur. */
(function() {
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  var btn = document.getElementById('back-to-top');
  if (btn) {
    var toggle = function() {
      if (window.scrollY > 600) btn.classList.add('visible');
      else btn.classList.remove('visible');
    };
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduced && reduced.matches ? 'auto' : 'smooth' });
    });
  }

  /* Un <details> fermé n'imprime pas son contenu : on les ouvre le temps de
     l'impression et on rend leur état d'origine ensuite. Aucune règle CSS ne
     force le rendu d'un <details> fermé de façon portable. */
  var reopened = [];
  window.addEventListener('beforeprint', function() {
    reopened = [];
    var all = document.querySelectorAll('details:not([open])');
    for (var i = 0; i < all.length; i++) {
      reopened.push(all[i]);
      all[i].open = true;
    }
  });
  window.addEventListener('afterprint', function() {
    for (var i = 0; i < reopened.length; i++) reopened[i].open = false;
    reopened = [];
  });
})();
