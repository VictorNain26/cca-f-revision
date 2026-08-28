/* Comportements de chrome partagés par toutes les pages.
   Extrait des dix copies inline identiques qui vivaient en fin de <body>.
   Script classique (pas de module) pour rester ouvrable en file:// hors serveur. */
(function() {
  var btn = document.getElementById('back-to-top');
  if (!btn) return;
  function toggle() {
    if (window.scrollY > 600) btn.classList.add('visible');
    else btn.classList.remove('visible');
  }
  window.addEventListener('scroll', toggle, { passive: true });
  toggle();
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
