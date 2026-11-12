(() => {
  'use strict';
  const allowed = new Set(['website', 'pinterest', 'facebook', 'partner']);
  const params = new URLSearchParams(location.search);
  const candidate = (params.get('src') || params.get('utm_source') || (location.pathname === '/checklist/facebook-button.html' ? 'facebook' : location.pathname === '/checklist/pinterest-profile.html' ? 'pinterest' : '')).trim().toLowerCase();
  const source = allowed.has(candidate) ? candidate : 'website';
  // No arbitrary query strings, referrers, identifiers or summit selections leave this page.
  document.querySelectorAll('[data-amazon]').forEach(a => {
    // Current-edition checklist links use new provider tags; legacy book pages retain their tags.
    a.href = a.hasAttribute('data-current-logbook')
      ? `/go/logbook-136/${source === 'facebook' ? 'facebook' : 'website'}.html`
      : `/go/logbook/${source}.html`;
  });
  document.querySelectorAll('[data-companion], a[href="/logbook.html"], a[href="/14ers-checklist.html"]').forEach(a => {
    const url = new URL(a.getAttribute('href'), location.origin);
    if (source !== 'website') url.searchParams.set('src', source);
    a.href = url.pathname + url.search;
  });
  const boxes = [...document.querySelectorAll('[data-peak]')];
  if (!boxes.length) return;
  const key = 'sendlines-14ers-checklist-v1';
  const status = document.getElementById('save-status');
  let canSave = true;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    const saved = new Set(Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string') : []);
    boxes.forEach(box => { box.checked = saved.has(box.dataset.peak); });
  } catch (_) { canSave = false; }
  const update = (persist = false) => {
    const selected = boxes.filter(b => b.checked).map(b => b.dataset.peak);
    document.getElementById('progress').textContent = `${selected.length} of ${boxes.length} summits`;
    document.getElementById('summit-progress').value = selected.length;
    if (persist) {
      try { localStorage.setItem(key, JSON.stringify(selected)); canSave = true; }
      catch (_) { canSave = false; }
    }
    status.textContent = canSave ? 'Checks you make save on this device, in this browser. Clearing browser data removes your progress. Print a copy to keep it.' : 'Browser storage is unavailable. Your checks work for this visit; print a copy to keep them.';
  };
  boxes.forEach(box => box.addEventListener('change', () => update(true)));
  document.getElementById('print-list').hidden = false;
  document.getElementById('print-list').addEventListener('click', () => window.print());
  const reset = document.getElementById('reset-list'); reset.hidden = false;
  reset.addEventListener('click', () => {
    if (!boxes.some(b => b.checked) || !window.confirm('Clear all your checked summits on this device?')) return;
    boxes.forEach(b => { b.checked = false; });
    try { localStorage.removeItem(key); canSave = true; } catch (_) { canSave = false; }
    update();
  });
  update();
})();
