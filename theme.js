/* Dark mode — bouton de bascule, persistance et a11y.
   Le thème initial est posé par un petit script inline en <head> (anti-flash) ;
   ce module ne fait qu'ajouter le contrôle dans la navbar et réagir aux clics.
   Script classique (pas de module) pour rester ouvrable en file:// hors serveur. */
(() => {
  const KEY = 'cca-theme';
  const root = document.documentElement;

  const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const saved = () => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  };
  const currentTheme = () => root.getAttribute('data-theme') ?? (prefersDark() ? 'dark' : 'light');

  const updateButton = (theme) => {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const dark = theme === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? 'Passer en mode clair' : 'Passer en mode sombre');
    btn.querySelector('.theme-toggle-icon').textContent = dark ? '☀' : '☾';
    btn.querySelector('.theme-toggle-label').textContent = dark ? 'Clair' : 'Sombre';
  };

  const setTheme = (theme, { persist = false } = {}) => {
    root.setAttribute('data-theme', theme);
    if (persist) {
      try { localStorage.setItem(KEY, theme); } catch { /* quota / mode privé */ }
    }
    updateButton(theme);
  };

  const init = () => {
    const nav = document.querySelector('.navbar');
    if (!nav) return;

    if (!document.getElementById('theme-toggle')) {
      const btn = document.createElement('button');
      btn.id = 'theme-toggle';
      btn.type = 'button';
      btn.className = 'theme-toggle';
      btn.innerHTML =
        '<span class="theme-toggle-icon" aria-hidden="true"></span>' +
        '<span class="theme-toggle-label"></span>';
      btn.addEventListener('click', () =>
        setTheme(currentTheme() === 'dark' ? 'light' : 'dark', { persist: true })
      );
      nav.appendChild(btn);
    }

    updateButton(currentTheme());

    // Suit le système tant que l'utilisateur n'a pas choisi explicitement
    window.matchMedia?.('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!saved()) setTheme(e.matches ? 'dark' : 'light');
      });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
