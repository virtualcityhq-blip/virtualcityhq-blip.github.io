(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
  const hero = document.querySelector('[data-trace-hero]');
  if (hero) {
    const field = hero.querySelector('.hero-field img');
    const ready = () => hero.classList.add('is-ready');
    if (reduced) ready();
    else if (field?.complete) setTimeout(ready, 300);
    else field?.addEventListener('load', () => setTimeout(ready, 300), {once: true});
  }

  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  document.querySelectorAll('.desktop-nav a,.mobile-menu a').forEach(link => {
    const url = new URL(link.href, location.href);
    const isCurrent = url.origin === location.origin && url.pathname === location.pathname && !url.hash;
    if (isCurrent) link.setAttribute('aria-current', 'page');
  });
  let priorFocus = null;
  const menuLinks = () => [...menu.querySelectorAll('a,button')];
  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    menu.dataset.open = 'false';
    document.body.classList.remove('menu-open');
    priorFocus?.focus();
  };
  const openMenu = () => {
    priorFocus = document.activeElement;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    menu.dataset.open = 'true';
    document.body.classList.add('menu-open');
    menuLinks()[0]?.focus();
  };
  toggle?.addEventListener('click', () => toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu());
  menu?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') closeMenu();
    if (event.key !== 'Tab' || toggle?.getAttribute('aria-expanded') !== 'true') return;
    const links = menuLinks();
    const first = links[0], last = links[links.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const observed = document.querySelectorAll('.reveal,.plate-card');
  if (reduced) observed.forEach(node => node.classList.add('is-visible'));
  else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), {threshold: .4});
    observed.forEach(node => observer.observe(node));
  }

  const tbody = document.querySelector('[data-peak-index] tbody');
  const controls = document.querySelector('[data-index-controls]');
  const peakSearch = document.querySelector('[data-peak-search]');
  const rangeFilter = document.querySelector('[data-range-filter]');
  const resultCount = document.querySelector('[data-result-count]');
  const archiveEmpty = document.querySelector('[data-archive-empty]');
  const clearSearch = document.querySelector('[data-clear-search]');
  const normalize = value => (value || '').normalize('NFKD').toLowerCase().replace(/\bmount\b/g, 'mt').replace(/[^a-z0-9]+/g, ' ').trim();
  const filterArchive = () => {
    if (!tbody) return;
    const query = normalize(peakSearch?.value);
    const range = rangeFilter?.value || '';
    let visible = 0;
    [...tbody.querySelectorAll('tr')].forEach(row => {
      const matchesQuery = !query || normalize(row.dataset.search).includes(query);
      const matchesRange = !range || row.dataset.range === range;
      row.hidden = !(matchesQuery && matchesRange);
      if (!row.hidden) visible += 1;
    });
    if (resultCount) resultCount.textContent = `${visible} ${visible === 1 ? 'PEAK' : 'PEAKS'}`;
    if (archiveEmpty) archiveEmpty.hidden = visible !== 0;
  };
  peakSearch?.addEventListener('input', filterArchive);
  rangeFilter?.addEventListener('change', filterArchive);
  clearSearch?.addEventListener('click', () => {
    if (peakSearch) peakSearch.value = '';
    if (rangeFilter) rangeFilter.value = '';
    filterArchive();
    peakSearch?.focus();
  });
  controls?.addEventListener('click', event => {
    const button = event.target.closest('button[data-sort]');
    if (!button || !tbody) return;
    const rows = [...tbody.querySelectorAll('tr')];
    const key = button.dataset.sort;
    rows.sort((a, b) => key === 'elevation'
      ? Number(b.dataset.elevation) - Number(a.dataset.elevation)
      : (a.dataset[key] || '').localeCompare(b.dataset[key] || ''));
    rows.forEach(row => tbody.append(row));
    controls.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });

  document.querySelectorAll('[data-edition-picker]').forEach(picker => {
    picker.addEventListener('click', event => {
      const button = event.target.closest('[data-edition-choice]');
      if (!button) return;
      const picture = picker.querySelector('.edition-preview-picture');
      const avif = picture?.querySelector('source[type="image/avif"]');
      const webp = picture?.querySelector('source[type="image/webp"]');
      const image = picture?.querySelector('img');
      if (!avif || !webp || !image) return;
      avif.srcset = button.dataset.avif;
      webp.srcset = button.dataset.webp;
      image.src = button.dataset.jpg.split(/\s+/)[0];
      image.srcset = button.dataset.jpg;
      image.alt = button.dataset.alt;
      picker.querySelectorAll('[data-edition-choice]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      const label = picker.querySelector('[data-edition-label]');
      if (label) label.textContent = `${button.dataset.label.toUpperCase()} · ${button.dataset.note.toUpperCase()}`;
    });
  });

  const requestForm = document.querySelector('[data-request-form]');
  const requestFrame = document.querySelector('[data-request-frame]');
  const requestStatus = document.querySelector('#request-status');
  const requestSuccess = document.querySelector('#request-success');
  let requestTimer = null;
  requestForm?.addEventListener('submit', event => {
    if (!navigator.onLine) {
      event.preventDefault();
      if (requestStatus) {
        requestStatus.textContent = 'No connection. Reconnect and try again, or open the original form below.';
        requestStatus.classList.add('is-error');
      }
      return;
    }
    requestForm.dataset.submitted = 'true';
    requestForm.querySelector('button[type="submit"]')?.setAttribute('disabled', '');
    if (requestStatus) {
      requestStatus.textContent = 'Sending your request…';
      requestStatus.classList.remove('is-error');
    }
    requestTimer = setTimeout(() => {
      if (requestForm.hidden) return;
      requestForm.querySelector('button[type="submit"]')?.removeAttribute('disabled');
      if (requestStatus) {
        requestStatus.textContent = 'We could not confirm the request. Try again, or open the original form below.';
        requestStatus.classList.add('is-error');
      }
    }, 15000);
  });
  requestFrame?.addEventListener('load', () => {
    if (requestForm?.dataset.submitted !== 'true') return;
    clearTimeout(requestTimer);
    requestForm.hidden = true;
    if (requestSuccess) requestSuccess.hidden = false;
  });

  const buyBlock = document.querySelector('.purchase-block');
  const stickyBuy = document.querySelector('.sticky-buy');
  const primaryBuy = document.querySelector('[data-primary-buy]');
  if (buyBlock && stickyBuy && primaryBuy) {
    const mobileBuy = matchMedia('(max-width: 768px)');
    let scheduled = false;
    const updateStickyBuy = () => {
      if (!mobileBuy.matches) {
        stickyBuy.classList.remove('is-visible');
        scheduled = false;
        return;
      }
      const purchase = buyBlock.getBoundingClientRect();
      const primary = primaryBuy.getBoundingClientRect();
      const purchaseIsVisible = purchase.top < innerHeight && purchase.bottom > 0;
      stickyBuy.classList.toggle('is-visible', primary.bottom < 0 && !purchaseIsVisible);
      scheduled = false;
    };
    const scheduleStickyBuy = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(updateStickyBuy);
    };
    addEventListener('scroll', scheduleStickyBuy, {passive: true});
    addEventListener('resize', scheduleStickyBuy);
    mobileBuy.addEventListener('change', scheduleStickyBuy);
    updateStickyBuy();
  }
})();
