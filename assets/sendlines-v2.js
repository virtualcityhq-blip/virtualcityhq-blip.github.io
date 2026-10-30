document.documentElement.classList.add('js');
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
  const menuLinks = () => [toggle, ...menu.querySelectorAll('a,button')].filter(Boolean);
  const background = [...document.querySelectorAll('main,.site-footer,.brand,.skip-link,.sticky-buy')];
  const savedInert = new Map();
  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    menu.dataset.open = 'false';
    document.body.classList.remove('menu-open');
    background.forEach(node => { if (savedInert.has(node)) node.inert = savedInert.get(node); });
    savedInert.clear();
    if (priorFocus?.getClientRects().length) priorFocus.focus(); else document.querySelector('.brand')?.focus();
  };
  const openMenu = () => {
    priorFocus = document.activeElement;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    menu.dataset.open = 'true';
    document.body.classList.add('menu-open');
    background.forEach(node => { savedInert.set(node, node.inert); node.inert = true; });
    menu.querySelector('a')?.focus();
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

  const header = document.querySelector('.site-header');
  const syncHeader = () => {
    if (header) document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
    if (toggle?.getAttribute('aria-expanded') === 'true' && getComputedStyle(toggle).display === 'none') closeMenu();
  };
  if (header && 'ResizeObserver' in window) new ResizeObserver(syncHeader).observe(header);
  addEventListener('resize', syncHeader);
  syncHeader();
  document.querySelector('.skip-link')?.addEventListener('click', () => {
    document.querySelector('main')?.focus({preventScroll:true});
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
    if (requestSuccess) { requestSuccess.hidden = false; requestSuccess.querySelector('h2')?.focus(); }
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
        stickyBuy.inert = true;
        scheduled = false;
        return;
      }
      const purchase = buyBlock.getBoundingClientRect();
      const primary = primaryBuy.getBoundingClientRect();
      const purchaseIsVisible = purchase.top < innerHeight && purchase.bottom > 0;
      const visible = (primary.bottom < 0 && !purchaseIsVisible) || stickyBuy.contains(document.activeElement);
      stickyBuy.classList.toggle('is-visible', visible);
      stickyBuy.inert = !visible;
      scheduled = false;
    };
    const scheduleStickyBuy = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(updateStickyBuy);
    };
    stickyBuy.addEventListener('focusout', scheduleStickyBuy);
    addEventListener('scroll', scheduleStickyBuy, {passive: true});
    addEventListener('resize', scheduleStickyBuy);
    mobileBuy.addEventListener('change', scheduleStickyBuy);
    updateStickyBuy();
  }
})();

// Native details keeps secondary navigation usable without JavaScript.
(() => {
 const more=document.querySelector('.nav-more');
 if(!more)return;
 const summary=more.querySelector('summary');
 more.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&more.open){more.open=false;summary.focus();event.preventDefault();}
 });
 document.addEventListener('click',event=>{if(more.open&&!more.contains(event.target))more.open=false;});
 more.addEventListener('focusout',()=>setTimeout(()=>{if(!more.contains(document.activeElement))more.open=false;},0));
 addEventListener('resize',()=>{if(getComputedStyle(more.closest('.desktop-nav')).display==='none')more.open=false;});
})();

/* Progressive catalog gallery: all destinations remain in the native index without JS. */
(() => {
 const gallery=document.querySelector('[data-shop-gallery]');
 const table=document.querySelector('[data-peak-index]');
 if(!gallery||!table)return;
 const cards=new Map([...gallery.querySelectorAll('[data-shop-path]')].map(card=>[card.dataset.shopPath,card]));
 const more=document.querySelector('[data-shop-more]');
 const wrap=document.querySelector('[data-shop-more-wrap]');
 const status=document.querySelector('[data-shop-progress]');
 let limit=12;
 let restoring=false;
 const search=document.querySelector('[data-peak-search]');
 const range=document.querySelector('[data-range-filter]');
 const controls=document.querySelector('[data-index-controls]');
 const save=()=>{
  if(restoring)return;
  const u=new URL(location.href);
  const values={q:search?.value||'',range:range?.value||'',sort:controls?.querySelector('[aria-pressed="true"]')?.dataset.sort||'',shown:limit>12?String(limit):''};
  for(const [k,v] of Object.entries(values)){if(v)u.searchParams.set(k,v);else u.searchParams.delete(k)}
  history.replaceState(null,'',u);
 };
 const render=()=>{
  let count=0;
  for(const row of table.querySelectorAll('tbody tr')){
   const card=cards.get(row.querySelector('a')?.getAttribute('href'));
   if(!card)continue;
   gallery.append(card);
   card.hidden=row.hidden||count>=limit;
   if(!row.hidden)count++;
  }
  gallery.hidden=false;wrap.hidden=false;
  more.hidden=count<=limit;
  save();
  status.textContent=count?`Showing ${Math.min(limit,count)} of ${count} mountain prints`:'No matching mountains. Try a different name or range.';
 };
 document.querySelector('[data-peak-search]')?.addEventListener('input',()=>{limit=12;render()});
 document.querySelector('[data-range-filter]')?.addEventListener('change',()=>{limit=12;render()});
 document.querySelector('[data-index-controls]')?.addEventListener('click',render);
 document.querySelector('[data-clear-search]')?.addEventListener('click',()=>{limit=12;render()});
 more?.addEventListener('click',()=>{const before=[...cards.values()].filter(x=>!x.hidden);limit+=12;render();[...gallery.children].find(x=>!x.hidden&&!before.includes(x))?.focus()});
 const restore=()=>{
  restoring=true;
  const p=new URLSearchParams(location.search);
  search.value=p.get('q')||'';
  range.value=[...range.options].some(o=>o.value===p.get('range'))?p.get('range'):'';
  search.dispatchEvent(new Event('input'));range.dispatchEvent(new Event('change'));
  const sort=[...controls.querySelectorAll('[data-sort]')].find(b=>b.dataset.sort===(p.get('sort')||'elevation'));
  sort?.click();
  limit=Math.min(60,Math.max(12,Number(p.get('shown'))||12));
  render();restoring=false;
 };
 addEventListener('popstate',restore);restore();
})();
