(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Simple router: show section matching data-go
  const pages = $$('.page');
  const tabs = $$('.tabbar .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-go');
      pages.forEach(p => p.classList.toggle('page-active', p.getAttribute('data-page') === target));
      tabs.forEach(t => t.classList.toggle('tab-active', t === tab));
    });
  });

  // Theme toggle cycles between tech-red and slate
  const themeToggle = $('#themeToggle');
  const root = document.documentElement;
  const THEMES = ['tech-red', 'slate'];
  const saved = localStorage.getItem('bn_theme');
  if (saved && THEMES.includes(saved)) root.setAttribute('data-theme', saved);

  themeToggle?.addEventListener('click', () => {
    const cur = root.getAttribute('data-theme') || THEMES[0];
    const idx = (THEMES.indexOf(cur) + 1) % THEMES.length;
    const next = THEMES[idx];
    root.setAttribute('data-theme', next);
    localStorage.setItem('bn_theme', next);
  });

  // Modal handlers
  const bindModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    $$(`[data-open="${id}"]`).forEach(btn => btn.addEventListener('click', () => {
      modal.removeAttribute('aria-hidden');
    }));
    $$('[data-close]', modal).forEach(btn => btn.addEventListener('click', () => {
      modal.setAttribute('aria-hidden', 'true');
    }));
    $('.modal-backdrop', modal)?.addEventListener('click', () => modal.setAttribute('aria-hidden', 'true'));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.setAttribute('aria-hidden', 'true');
    });
  };
  bindModal('addModal');
})();

