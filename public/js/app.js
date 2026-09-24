'use strict';
/* =====================================================================
   Marketico · SPA en JavaScript puro (sin build). Rutas por hash (#/…)
   ===================================================================== */

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { user: null, categories: [], providers: {}, next: null, timers: [] };

const CAT_EMOJI = { 'Electrónica': '📱', 'Vehículos': '🚗', 'Hogar': '🛋️', 'Moda': '👕', 'Deportes': '⚽', 'Inmuebles': '🏡', 'Juguetes': '🧸', 'Herramientas': '🛠️', 'Mascotas': '🐾', 'Libros': '📚', 'Otros': '✨' };
const STATUS = { active: 'Activa', paused: 'Pausada', sold: 'Vendida' };
const STAR = 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z';

const I = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  star: `<path d="${STAR}"/>`,
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chev: '<path d="m15 18-6-6 6-6"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  swap: '<path d="m17 3 4 4-4 4"/><path d="M3 7h18"/><path d="m7 21-4-4 4-4"/><path d="M21 17H3"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 9v9M17 5v13"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m7 4 13 8-13 8z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5A7 7 0 0 1 22 21"/>',
};
const ico = (n, s = 20) => `<svg class="ico" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;

const LOGO = `<svg viewBox="0 0 40 40" width="36" height="36" aria-hidden="true"><rect width="40" height="40" rx="12" fill="#0A7B58"/><path d="M15 16.5v-2.2a5 5 0 0 1 10 0v2.2" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M10.5 16h19l-1.7 12.3a2 2 0 0 1-2 1.7H14.2a2 2 0 0 1-2-1.7z" fill="#fff"/><circle cx="29" cy="10.5" r="4.6" fill="#FFC933"/></svg>`;
const GOOGLE = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.55 21.3 7.27 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.27 0 3.55 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>`;
const FACEBOOK = `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.34l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/></svg>`;

const money = (n) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n || 0);
const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 2592000) return `hace ${Math.floor(s / 86400)} d`;
  return new Date(d).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' });
};
const hue = (s) => [...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const avatar = (name, src, size = 36) =>
  src
    ? `<img class="av" style="--s:${size}px" src="${esc(src)}" alt="" loading="lazy">`
    : `<span class="av" style="--s:${size}px;background:hsl(${hue(name)} 45% 38%)">${esc((name || '?').trim().charAt(0).toUpperCase())}</span>`;
const stars = (r, size = 15) =>
  `<span class="stars" role="img" aria-label="${r || 0} de 5">${[1, 2, 3, 4, 5].map((i) => `<svg class="${i <= Math.round(r || 0) ? 'on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="${STAR}"/></svg>`).join('')}</span>`;

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3600);
}

async function api(url, { method = 'GET', body, form } = {}) {
  const opt = { method, headers: {}, credentials: 'same-origin' };
  if (form) opt.body = form;
  else if (body) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  const r = await fetch(url, opt);
  let data = null;
  try { data = await r.json(); } catch (_) {}
  if (!r.ok) throw Object.assign(new Error((data && data.error) || 'Algo salió mal. Inténtalo de nuevo.'), { status: r.status });
  return data;
}

function openModal(html, cls = '') {
  const m = document.createElement('div');
  m.className = 'modal-back';
  m.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(m);
  document.body.classList.add('noscroll');
  const close = () => { m.remove(); if (!$('.modal-back')) document.body.classList.remove('noscroll'); };
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) close(); });
  return { el: m.firstElementChild, close };
}
const confirmBox = (msg, okText = 'Confirmar') =>
  new Promise((res) => {
    const { el, close } = openModal(`<h3>${esc(msg)}</h3><div class="modal-actions"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" id="cok">${esc(okText)}</button></div>`);
    $('#cok', el).onclick = () => { close(); res(true); };
    el.parentElement.addEventListener('click', (e) => { if (e.target === el.parentElement || e.target.closest('[data-close]')) res(false); });
  });

const timer = (fn, ms) => S.timers.push(setInterval(async () => { try { await fn(); } catch (_) {} }, ms));
const clearTimers = () => { S.timers.forEach(clearInterval); S.timers = []; };
const go = (h) => (location.hash === h ? route() : (location.hash = h));

function setView(html) { $('#view').innerHTML = html; }
const loading = () => setView(`<div class="wrap" style="padding-top:24px"><div class="skel" style="height:200px"></div><div class="grid" style="margin-top:20px">${'<div class="skel" style="height:280px"></div>'.repeat(4)}</div></div>`);
const emptyState = (icon, title, text, cta) => `<div class="empty">${ico(icon, 44)}<h3>${title}</h3><p>${text}</p>${cta || ''}</div>`;

function needAuth(role) {
  if (!S.user) { S.next = location.hash; go('#/login?role=' + (role || 'buyer')); return false; }
  if (role && S.user.role !== role) {
    toast(role === 'seller' ? 'Esta sección es solo para vendedores' : 'Esta sección es solo para compradores', 'err');
    go('#/');
    return false;
  }
  return true;
}

/* ---------- barra superior y navegación móvil ---------- */
function renderChrome() {
  const u = S.user;
  $('#header').innerHTML = `<div class="wrap top-in">
    <a class="brand" href="#/">${LOGO}<span>Marketico</span></a>
    <form class="hsearch" id="hsearch" role="search">${ico('search', 18)}<input name="q" type="search" placeholder="Buscar en Marketico" aria-label="Buscar" autocomplete="off"><button class="btn btn-sm">Buscar</button></form>
    <nav class="nav">
      <a href="#/" data-nav="/">Explorar</a>
      ${u && u.role === 'buyer' ? `<a href="#/favoritos" data-nav="/favoritos">Favoritos</a>` : ''}
      ${u ? `<a href="#/mensajes" data-nav="/mensajes">Mensajes<i class="badge-n" data-badge hidden></i></a>` : ''}
      ${u && u.role === 'seller' ? `<a href="#/panel" data-nav="/panel">Panel</a><a class="btn btn-sun btn-sm" href="#/vender">${ico('plus', 16)} Publicar</a>` : ''}
      ${!u ? `<a class="btn btn-ghost btn-sm" href="#/login?role=buyer">Ingresar</a><a class="btn btn-sm" href="#/login?role=seller&mode=register">Quiero vender</a>` : `
      <div class="umenu"><button class="uchip" data-act="menu" aria-haspopup="true">${avatar(u.name, u.avatar, 32)}<span>${esc(u.name.split(' ')[0])}</span></button>
        <div class="dropdown" id="dd">
          <div class="dd-head"><b>${esc(u.name)}</b>${u.role === 'seller' ? 'Cuenta de vendedor' : 'Cuenta de comprador'}</div>
          <a href="#/panel">${ico(u.role === 'seller' ? 'chart' : 'home', 18)} ${u.role === 'seller' ? 'Panel de ventas' : 'Mi espacio'}</a>
          <a href="#/u/${u.id}">${ico('user', 18)} Mi perfil público</a>
          <a href="#/perfil">${ico('edit', 18)} Editar perfil</a>
          <a href="#/mensajes">${ico('chat', 18)} Mensajes</a>
          <hr><button data-act="logout">${ico('logout', 18)} Cerrar sesión</button>
        </div></div>`}
    </nav></div>`;

  const tabs = !u
    ? [['/', 'home', 'Inicio', '#/'], ['/vender', 'plus', 'Vender', '#/login?role=seller&mode=register'], ['/login', 'user', 'Ingresar', '#/login']]
    : u.role === 'seller'
      ? [['/', 'home', 'Inicio', '#/'], ['/panel', 'chart', 'Panel', '#/panel'], ['/vender', 'plus', 'Publicar', '#/vender', 'cta'], ['/mensajes', 'chat', 'Mensajes', '#/mensajes'], ['/perfil', 'user', 'Perfil', '#/perfil']]
      : [['/', 'home', 'Inicio', '#/'], ['/favoritos', 'heart', 'Favoritos', '#/favoritos'], ['/mensajes', 'chat', 'Mensajes', '#/mensajes'], ['/perfil', 'user', 'Perfil', '#/perfil']];
  $('#tabbar').innerHTML = tabs.map(([p, ic, label, href, cls]) =>
    `<a href="${href}" data-nav="${p}" class="${cls || ''}">${cls === 'cta' ? `<span class="pill">${ico(ic, 24)}</span>` : ico(ic, 22)}<span>${label}</span>${p === '/mensajes' ? '<i class="badge-n" data-badge hidden></i>' : ''}</a>`).join('');
  highlightNav();
  pollUnread();
}
function highlightNav() {
  const path = (location.hash.slice(1) || '/').split('?')[0];
  $$('[data-nav]').forEach((a) => {
    const p = a.dataset.nav;
    a.classList.toggle('on', p === '/' ? path === '/' : path.startsWith(p));
  });
}
function setBadge(n) { $$('[data-badge]').forEach((el) => { el.textContent = n > 9 ? '9+' : n; el.hidden = !n; }); }
async function pollUnread() {
  if (!S.user) return;
  try { setBadge((await api('/api/unread')).count); } catch (_) {}
}

document.addEventListener('submit', (e) => {
  if (e.target.id === 'hsearch') {
    e.preventDefault();
    const q = new FormData(e.target).get('q').trim();
    go('#/' + (q ? '?q=' + encodeURIComponent(q) : ''));
  }
});
document.addEventListener('click', async (e) => {
  const dd = $('#dd');
  if (dd && (!e.target.closest('.umenu') || e.target.closest('#dd a'))) dd.classList.remove('open');
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  try {
    if (act === 'menu') { e.preventDefault(); dd.classList.toggle('open'); }
    else if (act === 'logout') {
      await api('/api/auth/logout', { method: 'POST' });
      S.user = null; setBadge(0); renderChrome(); toast('Cerraste sesión'); go('#/');
    } else if (act === 'fav') {
      e.preventDefault(); e.stopPropagation(); await toggleFav(t);
    }
  } catch (err) { toast(err.message, 'err'); }
});

async function toggleFav(btn) {
  if (!S.user) { toast('Inicia sesión para guardar favoritos'); S.next = location.hash; go('#/login?role=buyer'); return; }
  const r = await api(`/api/products/${btn.dataset.id}/favorite`, { method: 'POST' });
  btn.classList.toggle('on', r.favorited);
  toast(r.favorited ? 'Guardado en favoritos' : 'Quitado de favoritos');
}

/* ---------- componentes ---------- */
function card(p) {
  const src = p.coverUrl || (p.cover ? `/img/${p.cover}` : null);
  return `<article class="card ${p.status === 'sold' ? 'is-sold' : ''}">
    <a class="card-link" href="#/p/${p.id}">
      <div class="thumb">${src ? `<img loading="lazy" src="${esc(src)}" alt="${esc(p.title)}">` : `<div class="noimg">${ico('image', 34)}</div>`}
        ${p.status === 'sold' ? '<span class="badge sold">Vendido</span>' : p.accepts_trade ? `<span class="badge">${ico('swap', 13)} Trueque</span>` : ''}</div>
      <div class="cbody"><div class="price">${money(p.price)}</div><h3>${esc(p.title)}</h3>
        <div class="meta">${p.city ? `<span>${ico('pin', 13)} ${esc(p.city)}</span>` : ''}<span>${ago(p.created_at)}</span></div></div>
    </a>
    <button class="fav ${p.favorited ? 'on' : ''}" data-act="fav" data-id="${p.id}" aria-label="Guardar en favoritos">${ico('heart', 18)}</button>
    <a class="cseller" href="#/u/${p.seller_id}">${avatar(p.seller_name, p.seller_avatar, 24)}<span>${esc(p.seller_name)}</span>${p.seller_rating ? `<b>★ ${p.seller_rating}</b>` : ''}</a>
  </article>`;
}

/* compresión de imágenes en el navegador antes de subirlas */
async function compress(file, max = 1600, q = 0.85) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const r = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', q));
    if (!blob || (blob.size > file.size && r === 1)) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch (_) { return file; } finally { URL.revokeObjectURL(url); }
}

/* ---------- enrutador ---------- */
const routes = [
  [/^\/$/, homeView], [/^\/login$/, loginView], [/^\/p\/(\d+)$/, productView],
  [/^\/vender$/, sellForm], [/^\/editar\/(\d+)$/, sellForm], [/^\/panel$/, dashboardView],
  [/^\/mensajes(?:\/(\d+))?$/, messagesView], [/^\/perfil$/, profileEditView],
  [/^\/u\/(\d+)$/, publicProfileView], [/^\/favoritos$/, favoritesView],
];
async function route() {
  clearTimers();
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const q = new URLSearchParams(qs || '');
  highlightNav();
  window.scrollTo(0, 0);
  for (const [re, fn] of routes) {
    const m = path.match(re);
    if (m) {
      try { await fn(...m.slice(1), q); }
      catch (e) {
        if (e.status === 401) { S.user = null; renderChrome(); return needAuth(); }
        setView(`<div class="wrap">${emptyState('shield', 'No pudimos cargar esta página', esc(e.message), `<a class="btn" href="#/">Volver al inicio</a>`)}</div>`);
      }
      return;
    }
  }
  setView(`<div class="wrap">${emptyState('search', 'Esta página no existe', 'Revisa el enlace o vuelve a explorar.', `<a class="btn" href="#/">Ir al inicio</a>`)}</div>`);
}

/* ======================= INICIO ======================= */
const HF = { sort: 'recent', min: '', max: '', trade: false };
async function homeView(q) {
  const st = { q: q.get('q') || '', category: q.get('category') || '', page: 1 };
  setView(`
  <section class="hero"><div class="wrap hero-in">
    <div>
      <h1>Compra, vende y conversa directo con la gente.</h1>
      <p>Publica en minutos, negocia por chat, haz ofertas o propone un trueque. Cada vendedor tiene su perfil y sus calificaciones.</p>
      <form class="hero-search" id="hs">${ico('search', 20)}<input id="hq" type="search" value="${esc(st.q)}" placeholder="Bicicleta, iPhone, sofá…" aria-label="¿Qué buscas?"><button class="btn">Buscar</button></form>
      <ul class="perks"><li>${ico('chat', 16)} Chat y ofertas</li><li>${ico('swap', 16)} Trueque</li><li>${ico('star', 16)} Vendedores calificados</li></ul>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="fc fc1"><span>🚲</span><b>₡85.000</b><small>Bici de montaña</small></div>
      <div class="fc fc2"><span>📱</span><b>₡210.000</b><small>Celular con caja</small></div>
      <div class="fc fc3"><span>🛋️</span><b>₡60.000</b><small>Sofá de 3 puestos</small></div>
    </div>
  </div></section>
  <section class="wrap">
    <div class="chips" id="chips"></div>
    <div class="filters">
      <select id="fs" aria-label="Ordenar por"><option value="recent">Más recientes</option><option value="popular">Más vistos</option><option value="price_asc">Precio: menor a mayor</option><option value="price_desc">Precio: mayor a menor</option></select>
      <input id="fmin" type="number" min="0" placeholder="Precio mínimo" aria-label="Precio mínimo">
      <input id="fmax" type="number" min="0" placeholder="Precio máximo" aria-label="Precio máximo">
      <label class="check"><input type="checkbox" id="ftrade"> Solo trueque</label>
    </div>
    <div class="grid" id="grid"></div><div class="center" id="more"></div>
  </section>`);

  $('#fs').value = HF.sort; $('#fmin').value = HF.min; $('#fmax').value = HF.max; $('#ftrade').checked = HF.trade;
  const chips = () => {
    $('#chips').innerHTML = `<button class="chip ${!st.category ? 'on' : ''}" data-c="">Todo</button>` +
      S.categories.map((c) => `<button class="chip ${st.category === c ? 'on' : ''}" data-c="${esc(c)}">${CAT_EMOJI[c] || ''} ${esc(c)}</button>`).join('');
  };
  const sync = () => history.replaceState(null, '', '#/' + (new URLSearchParams({ ...(st.q && { q: st.q }), ...(st.category && { category: st.category }) }).toString() ? '?' + new URLSearchParams({ ...(st.q && { q: st.q }), ...(st.category && { category: st.category }) }) : ''));

  async function load(reset) {
    if (reset) st.page = 1;
    const p = new URLSearchParams({ page: st.page, sort: HF.sort });
    if (st.q) p.set('q', st.q);
    if (st.category) p.set('category', st.category);
    if (HF.min) p.set('min', HF.min);
    if (HF.max) p.set('max', HF.max);
    if (HF.trade) p.set('trade', '1');
    const grid = $('#grid');
    if (reset) grid.innerHTML = '<div class="skel" style="height:280px"></div>'.repeat(4);
    try {
      const r = await api('/api/products?' + p);
      const html = r.items.map(card).join('');
      if (reset) grid.innerHTML = html || emptyState('search', 'No encontramos publicaciones', 'Prueba con otra búsqueda o quita algunos filtros.', S.user?.role === 'seller' ? `<a class="btn" href="#/vender">Publica la primera</a>` : '');
      else grid.insertAdjacentHTML('beforeend', html);
      $('#more').innerHTML = r.hasMore ? `<button class="btn btn-ghost" id="moreBtn">Ver más publicaciones</button>` : '';
      const mb = $('#moreBtn'); if (mb) mb.onclick = () => { st.page++; load(false); };
    } catch (e) { grid.innerHTML = emptyState('shield', 'No pudimos cargar las publicaciones', esc(e.message)); }
  }
  chips();
  $('#chips').onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; st.category = b.dataset.c; chips(); sync(); load(true); };
  $('#hs').onsubmit = (e) => { e.preventDefault(); st.q = $('#hq').value.trim(); sync(); load(true); };
  $('#fs').onchange = (e) => { HF.sort = e.target.value; load(true); };
  let t; const deb = (k) => (e) => { HF[k] = e.target.value; clearTimeout(t); t = setTimeout(() => load(true), 400); };
  $('#fmin').oninput = deb('min'); $('#fmax').oninput = deb('max');
  $('#ftrade').onchange = (e) => { HF.trade = e.target.checked; load(true); };
  load(true);
}

/* ======================= LOGIN / REGISTRO ======================= */
function loginView(q) {
  if (S.user) return go(S.user.role === 'seller' ? '#/panel' : '#/');
  let role = q.get('role') === 'seller' ? 'seller' : 'buyer';
  let mode = q.get('mode') === 'register' ? 'register' : 'login';
  const err = q.get('error') || '';
  const copy = {
    buyer: { t: 'Encuentra lo que buscas', items: [['chat', 'Conversa directo', 'Pregunta y haz ofertas sin intermediarios.'], ['heart', 'Guarda favoritos', 'Vuelve a ellos cuando quieras.'], ['star', 'Califica vendedores', 'Ayuda a otros a comprar con confianza.']] },
    seller: { t: 'Vende con tu propia tienda', items: [['camera', 'Publica en minutos', 'Hasta 5 fotos, precio y categoría.'], ['chart', 'Mide tus publicaciones', 'Sabe quién las vio y cuántos interesados tienes.'], ['users', 'Construye reputación', 'Tu perfil muestra tus calificaciones.']] },
  };
  const draw = () => {
    const c = copy[role];
    setView(`<section class="auth">
      <aside class="auth-side"><a class="brand" href="#/" style="color:#fff">${LOGO}<span>Marketico</span></a><h2>${c.t}</h2>
        <ul>${c.items.map(([i, b, t]) => `<li>${ico(i, 22)}<div><b>${b}</b>${t}</div></li>`).join('')}</ul></aside>
      <div class="auth-main"><div class="auth-card panel">
        <div class="role-tabs" role="tablist"><button type="button" role="tab" data-role="buyer" class="${role === 'buyer' ? 'on' : ''}">${ico('heart', 18)} Comprador</button><button type="button" role="tab" data-role="seller" class="${role === 'seller' ? 'on' : ''}">${ico('box', 18)} Vendedor</button></div>
        <h1>${mode === 'login' ? 'Ingresa a tu cuenta' : 'Crea tu cuenta'}</h1>
        <p class="muted">${role === 'seller' ? 'Para publicar artículos y ver tu panel de ventas.' : 'Para comprar, chatear y guardar favoritos.'}</p>
        <div class="oauth"><a href="/auth/google?role=${role}">${GOOGLE} Google</a><a href="/auth/facebook?role=${role}">${FACEBOOK} Facebook</a></div>
        <div class="or">o con tu correo</div>
        <form id="af" novalidate>
          <div class="form-error" id="ferr" role="alert">${esc(err)}</div>
          ${mode === 'register' ? `<label class="field"><span>Nombre</span><input name="name" type="text" autocomplete="name" maxlength="60" required></label>` : ''}
          <label class="field"><span>Correo</span><input name="email" type="email" autocomplete="email" required></label>
          <label class="field"><span>Contraseña</span><input name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" minlength="8" required>${mode === 'register' ? '<small>Mínimo 8 caracteres.</small>' : ''}</label>
          <button class="btn btn-block" id="abtn">${mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
        </form>
        <p class="switch-line">${mode === 'login' ? '¿Aún no tienes cuenta? <button class="link" data-mode="register">Crear cuenta</button>' : '¿Ya tienes cuenta? <button class="link" data-mode="login">Ingresar</button>'}</p>
      </div></div></section>`);
    $$('[data-role]').forEach((b) => (b.onclick = () => { role = b.dataset.role; draw(); }));
    $$('[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; draw(); }));
    $('#af').onsubmit = async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const btn = $('#abtn'); btn.disabled = true; $('#ferr').textContent = '';
      try {
        const r = await api(`/api/auth/${mode}`, { method: 'POST', body: { ...f, role } });
        S.user = r.user; renderChrome();
        toast(mode === 'login' ? `¡Hola de nuevo, ${r.user.name.split(' ')[0]}!` : '¡Cuenta creada! Bienvenido a Marketico');
        const next = S.next; S.next = null;
        go(next || (r.user.role === 'seller' ? '#/panel' : '#/'));
      } catch (er) { $('#ferr').textContent = er.message; btn.disabled = false; }
    };
  };
  draw();
}

/* ======================= DETALLE DE PRODUCTO ======================= */
async function startChat(pid) {
  if (!S.user) { S.next = location.hash; go('#/login?role=buyer'); return null; }
  if (S.user.role !== 'buyer') { toast('Entra con una cuenta de comprador para contactar vendedores', 'err'); return null; }
  return (await api('/api/conversations', { method: 'POST', body: { product_id: pid } })).id;
}
function offerModal(p, after) {
  const { el, close } = openModal(`<h3>Hacer una oferta</h3><p class="muted">Precio publicado: <b>${money(p.price)}</b></p>
    <label class="field"><span>Tu oferta (₡)</span><input type="number" id="oamt" min="1" value="${Math.round(p.price * 0.9)}"></label>
    <label class="field"><span>Mensaje <em>(opcional)</em></span><textarea id="onote" rows="2" maxlength="300" placeholder="Puedo pasar hoy por él"></textarea></label>
    <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn" id="osend">Enviar oferta</button></div>`);
  $('#osend', el).onclick = async () => {
    try {
      const amount = Number($('#oamt', el).value);
      if (!(amount > 0)) return toast('Escribe un monto válido', 'err');
      await after(amount, $('#onote', el).value.trim());
      close();
    } catch (e) { toast(e.message, 'err'); }
  };
}
async function productView(id) {
  loading();
  const p = await api('/api/products/' + id);
  const mine = S.user && S.user.id === p.seller_id;
  const imgs = p.images;
  setView(`<div class="wrap pdp">
    <a class="crumb" href="#/">${ico('chev', 16)} Volver a explorar</a>
    <div class="pdp-grid">
      <div>
        <div class="gmain">${imgs.length ? `<img id="mainImg" src="/img/${imgs[0]}" alt="${esc(p.title)}">` : `<div class="noimg">${ico('image', 48)}</div>`}${p.status === 'sold' ? '<span class="badge sold big">Vendido</span>' : ''}</div>
        ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((x, i) => `<button class="${i ? '' : 'on'}" data-img="${x}" aria-label="Foto ${i + 1}"><img src="/img/${x}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="pdp-info">
        <div class="panel">
          <div class="tags"><span class="tag">${CAT_EMOJI[p.category] || ''} ${esc(p.category)}</span><span class="tag">${esc(p.item_condition)}</span>${p.accepts_trade ? `<span class="tag trade">Acepta trueque</span>` : ''}</div>
          <h1>${esc(p.title)}</h1>
          <div class="pdp-price">${money(p.price)}</div>
          <div class="meta">${p.city ? `<span>${ico('pin', 14)} ${esc(p.city)}</span>` : ''}<span>Publicado ${ago(p.created_at)}</span><span>${ico('eye', 14)} ${p.views} vistas</span><span>${ico('heart', 14)} ${p.favorites}</span></div>
          ${mine ? `
            ${p.status === 'paused' ? `<div class="note">Esta publicación está pausada: solo tú la ves.</div>` : ''}
            <div class="acts">
              <a class="btn" href="#/editar/${p.id}">${ico('edit', 16)} Editar</a>
              <button class="btn btn-ghost" data-st="${p.status === 'paused' ? 'active' : 'paused'}">${ico(p.status === 'paused' ? 'play' : 'pause', 16)} ${p.status === 'paused' ? 'Reactivar' : 'Pausar'}</button>
              ${p.status !== 'sold' ? `<button class="btn btn-sun" data-st="sold">${ico('check', 16)} Marcar vendido</button>` : `<button class="btn btn-ghost" data-st="active">Volver a publicar</button>`}
              <button class="btn btn-danger" id="pdel">${ico('trash', 16)} Eliminar</button>
            </div>` : p.status === 'sold' ? `<div class="note">Este artículo ya se vendió.</div>` : `
            <div class="acts">
              <button class="btn" id="pchat">${ico('chat', 18)} Chatear con el vendedor</button>
              <button class="btn btn-sun" id="poffer">${ico('tag', 18)} Hacer una oferta</button>
              <button class="icon-btn fav-lg ${p.favorited ? 'on' : ''}" data-act="fav" data-id="${p.id}" aria-label="Favorito" style="${p.favorited ? 'color:var(--coral)' : ''}">${ico('heart', 18)}</button>
              <button class="icon-btn" id="pshare" aria-label="Compartir">${ico('share', 18)}</button>
            </div>`}
        </div>
        <a class="panel seller-card" href="#/u/${p.seller_id}">${avatar(p.seller_name, p.seller_avatar, 56)}
          <div><b>${esc(p.seller_name)}</b><span>${stars(p.seller_rating)} <small>${p.seller_rating ? p.seller_rating + ' · ' : ''}${p.seller_reviews} opiniones</small></span><br><small>Miembro desde ${new Date(p.seller_since).toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })}</small></div></a>
      </div>
    </div>
    <div class="panel desc"><h2>Descripción</h2><p>${esc(p.description)}</p></div></div>`);

  $$('.thumbs button').forEach((b) => (b.onclick = () => { $('#mainImg').src = '/img/' + b.dataset.img; $$('.thumbs button').forEach((x) => x.classList.toggle('on', x === b)); }));
  const mi = $('#mainImg'); if (mi) mi.onclick = () => openModal(`<img src="${mi.src}" alt="">`, 'wide');
  $$('[data-st]').forEach((b) => (b.onclick = async () => { try { await api(`/api/products/${p.id}/status`, { method: 'PATCH', body: { status: b.dataset.st } }); toast('Publicación actualizada'); productView(id); } catch (e) { toast(e.message, 'err'); } }));
  const del = $('#pdel'); if (del) del.onclick = async () => { if (await confirmBox('¿Eliminar esta publicación? No se puede deshacer.', 'Eliminar')) { try { await api('/api/products/' + p.id, { method: 'DELETE' }); toast('Publicación eliminada'); go('#/panel'); } catch (e) { toast(e.message, 'err'); } } };
  const chat = $('#pchat'); if (chat) chat.onclick = async () => { try { const c = await startChat(p.id); if (c) go('#/mensajes/' + c); } catch (e) { toast(e.message, 'err'); } };
  const off = $('#poffer'); if (off) off.onclick = async () => {
    try {
      const c = await startChat(p.id); if (!c) return;
      offerModal(p, async (amount, note) => { await api(`/api/conversations/${c}/messages`, { method: 'POST', body: { kind: 'offer', amount, body: note } }); toast('Oferta enviada'); go('#/mensajes/' + c); });
    } catch (e) { toast(e.message, 'err'); }
  };
  const sh = $('#pshare'); if (sh) sh.onclick = async () => {
    const url = location.href;
    if (navigator.share) { try { await navigator.share({ title: p.title, url }); } catch (_) {} }
    else { try { await navigator.clipboard.writeText(url); toast('Enlace copiado'); } catch (_) { toast('No se pudo copiar el enlace', 'err'); } }
  };
}

/* ======================= PUBLICAR / EDITAR ======================= */
async function sellForm(id) {
  if (!needAuth('seller')) return;
  if (typeof id !== 'string') id = null; // en /vender el primer argumento es el objeto de query, no un id
  let p = null;
  if (id) {
    loading();
    p = await api('/api/products/' + id);
    if (p.seller_id !== S.user.id) { toast('No puedes editar esta publicación', 'err'); return go('#/panel'); }
  }
  const MAX = 5;
  let imgs = (p ? p.images : []).map((x) => ({ kind: 'e', id: x, url: '/img/' + x }));
  const val = (k, d = '') => esc(p ? p[k] ?? d : d);
  setView(`<div class="wrap sell"><h1>${p ? 'Editar publicación' : 'Publica un artículo'}</h1>
    <div class="sell-grid">
      <form id="sf" class="panel" novalidate>
        <div class="field"><span>Fotos <em id="icount"></em></span>
          <div class="drop" id="drop" tabindex="0" role="button" aria-label="Subir fotos">${ico('camera', 30)}<b>Toca para subir o arrastra tus fotos aquí</b><small>Hasta ${MAX} fotos · JPG, PNG, WEBP o GIF · 5 MB máx. cada una</small></div>
          <input type="file" id="fi" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>
          <div class="imgs" id="imgs"></div></div>
        <label class="field"><span>Título</span><input name="title" type="text" maxlength="100" required value="${val('title')}" placeholder="Ej. Bicicleta de montaña aro 29"></label>
        <div class="row2">
          <label class="field"><span>Categoría</span><select name="category" required>${S.categories.map((c) => `<option ${p && p.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
          <label class="field"><span>Precio (₡)</span><input name="price" type="number" min="0" step="1" required value="${p ? Math.round(p.price) : ''}" placeholder="85000"></label>
        </div>
        <div class="field"><span>Estado del artículo</span><div class="seg">${['nuevo', 'como nuevo', 'usado'].map((c) => `<label><input type="radio" name="condition" value="${c}" ${(p ? p.item_condition : 'usado') === c ? 'checked' : ''}><span>${c}</span></label>`).join('')}</div></div>
        <label class="field"><span>Ubicación</span><input name="city" type="text" maxlength="60" value="${esc(p ? p.city : S.user.city)}" placeholder="Ej. Cartago, Paraíso"></label>
        <label class="field"><span>Descripción</span><textarea name="description" rows="6" maxlength="3000" required placeholder="Cuenta el estado, medidas, tiempo de uso y por qué lo vendes.">${val('description')}</textarea></label>
        <label class="switch"><input type="checkbox" name="trade" ${p && p.accepts_trade ? 'checked' : ''}> Acepto trueque</label>
        <button class="btn btn-block" id="sbtn">${p ? 'Guardar cambios' : 'Publicar ahora'}</button>
      </form>
      <aside class="sell-side"><div class="panel sticky"><h3>Así se verá</h3><div id="pv" class="pv" style="margin-top:12px"></div>
        <ul class="tips"><li>${ico('camera', 16)} La primera foto es la portada.</li><li>${ico('tag', 16)} Un precio claro recibe más mensajes.</li><li>${ico('shield', 16)} Describe defectos con honestidad para ganar buenas calificaciones.</li></ul></div></aside>
    </div></div>`);

  const renderPv = () => {
    const f = new FormData($('#sf'));
    $('#pv').innerHTML = card({ id: 0, title: f.get('title') || 'Título de tu artículo', price: Number(f.get('price')) || 0, city: f.get('city'), created_at: new Date(), accepts_trade: f.get('trade') === 'on', status: 'active', coverUrl: imgs[0] && imgs[0].url, seller_id: S.user.id, seller_name: S.user.name, seller_avatar: S.user.avatar, seller_rating: null });
  };
  const renderImgs = () => {
    $('#icount').textContent = `(${imgs.length}/${MAX})`;
    $('#imgs').innerHTML = imgs.map((it, i) => `<div class="it"><img src="${esc(it.url)}" alt="Foto ${i + 1}">${i === 0 ? '<span class="cv">Portada</span>' : `<button type="button" class="mk" data-mk="${i}" aria-label="Hacer portada" title="Hacer portada">${ico('star', 14)}</button>`}<button type="button" class="rm" data-rm="${i}" aria-label="Quitar foto">${ico('x', 14)}</button></div>`).join('');
    $('#drop').style.display = imgs.length >= MAX ? 'none' : '';
    renderPv();
  };
  $('#imgs').onclick = (e) => {
    const rm = e.target.closest('[data-rm]'), mk = e.target.closest('[data-mk]');
    if (rm) { const [it] = imgs.splice(+rm.dataset.rm, 1); if (it.kind === 'n') URL.revokeObjectURL(it.url); renderImgs(); }
    if (mk) { const [it] = imgs.splice(+mk.dataset.mk, 1); imgs.unshift(it); renderImgs(); }
  };
  const addFiles = async (list) => {
    const files = [...list].filter((f) => f.type.startsWith('image/'));
    for (const f of files) {
      if (imgs.length >= MAX) { toast(`Máximo ${MAX} fotos por publicación`, 'err'); break; }
      if (f.size > 25 * 1024 * 1024) { toast(`"${f.name}" es demasiado grande`, 'err'); continue; }
      const c = await compress(f);
      if (c.size > 5 * 1024 * 1024) { toast(`"${f.name}" pesa más de 5 MB`, 'err'); continue; }
      imgs.push({ kind: 'n', file: c, url: URL.createObjectURL(c) });
    }
    renderImgs();
  };
  const drop = $('#drop'), fi = $('#fi');
  drop.onclick = () => fi.click();
  drop.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } };
  fi.onchange = async () => { await addFiles(fi.files); fi.value = ''; };
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
  $('#sf').addEventListener('input', renderPv);
  renderImgs();

  $('#sf').onsubmit = async (e) => {
    e.preventDefault();
    if (!imgs.length) return toast('Sube al menos una foto', 'err');
    const f = new FormData(e.target);
    if (!f.get('title').trim() || !f.get('price') || f.get('description').trim().length < 10) return toast('Completa título, precio y una descripción de al menos 10 caracteres', 'err');
    const fd = new FormData();
    ['title', 'category', 'price', 'condition', 'city', 'description'].forEach((k) => fd.append(k, f.get(k) ?? ''));
    if (f.get('trade') === 'on') fd.append('trade', 'on');
    const order = []; let n = 0;
    imgs.forEach((it) => { if (it.kind === 'e') order.push('e:' + it.id); else { order.push('n:' + n++); fd.append('images', it.file, it.file.name); } });
    fd.append('order', JSON.stringify(order));
    const btn = $('#sbtn'); btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      const r = await api(p ? `/api/products/${p.id}` : '/api/products', { method: p ? 'PUT' : 'POST', form: fd });
      toast(p ? 'Cambios guardados' : '¡Publicado!');
      go('#/p/' + r.id);
    } catch (er) { toast(er.message, 'err'); btn.disabled = false; btn.textContent = p ? 'Guardar cambios' : 'Publicar ahora'; }
  };
}

/* ======================= PANEL / DASHBOARD ======================= */
function barChart(series) {
  const W = 680, H = 210, pl = 34, pr = 8, pt = 14, pb = 28;
  const max = Math.max(4, ...series.map((d) => d.views));
  const bw = (W - pl - pr) / series.length;
  const ch = H - pt - pb;
  const grid = [0, 0.5, 1].map((f) => { const y = pt + ch - ch * f; return `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="#DCE7E0" stroke-dasharray="${f ? '3 4' : '0'}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${Math.round(max * f)}</text>`; }).join('');
  const bars = series.map((d, i) => {
    const h = Math.max(d.views ? 3 : 0, ch * d.views / max), x = pl + i * bw + bw * 0.16, y = pt + ch - h;
    const dt = new Date(d.day + 'T12:00:00');
    return `<rect x="${x}" y="${y}" width="${bw * 0.68}" height="${h}" rx="5" fill="${i === series.length - 1 ? '#FFC933' : '#0A7B58'}"><title>${dt.toLocaleDateString('es-CR', { day: 'numeric', month: 'long' })}: ${d.views} vistas</title></rect>${i % 2 === (series.length - 1) % 2 ? `<text x="${x + bw * 0.34}" y="${H - 8}" text-anchor="middle">${dt.getDate()}</text>` : ''}`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Vistas de los últimos 14 días">${grid}${bars}</svg>`;
}
async function dashboardView() {
  if (!needAuth()) return;
  if (S.user.role === 'buyer') return buyerHome();
  loading();
  const d = await api('/api/dashboard');
  const t = d.totals;
  const top = [...d.products].sort((a, b) => b.views - a.views)[0];
  const kpi = (ic, label, val, sub, tone = '') => `<div class="kpi ${tone}"><div class="kpi-ic">${ico(ic, 22)}</div><div><small>${label}</small><b>${val}</b>${sub ? `<em>${sub}</em>` : ''}</div></div>`;
  setView(`<div class="wrap dash">
    <div class="dash-head"><div><h1 style="font-size:clamp(26px,3.4vw,36px)">Hola, ${esc(S.user.name.split(' ')[0])}</h1><p class="muted">Así van tus publicaciones en Marketico.</p></div><a class="btn btn-sun" href="#/vender">${ico('plus', 18)} Nueva publicación</a></div>
    <div class="kpis">
      ${kpi('eye', 'Vistas totales', t.views, `+${t.views7} en 7 días`)}
      ${kpi('users', 'Visitantes únicos', t.visitors, '', 'sun')}
      ${kpi('heart', 'Guardados en favoritos', t.favorites, '', 'coral')}
      ${kpi('chat', 'Conversaciones', t.chats, t.unread ? `${t.unread} sin leer` : 'Todo al día')}
      ${kpi('box', 'Activas / vendidas', `${t.active} / ${t.sold}`)}
      ${kpi('star', 'Calificación', t.rating ? t.rating + ' ★' : '—', `${t.reviews} opiniones`, 'sun')}
    </div>
    <div class="dash-cols">
      <div class="panel"><h2>Vistas de los últimos 14 días</h2><p class="sub">${top && top.views ? `Tu publicación más vista: <b>${esc(top.title)}</b> (${top.views} vistas).` : 'Cuando alguien abra tus publicaciones, verás aquí la actividad.'}</p>${barChart(d.series)}</div>
      <div class="panel"><h2>Quién vio tus publicaciones</h2><p class="sub">Las últimas 15 visitas. Quien no ha iniciado sesión aparece como visitante.</p>
        ${d.viewers.length ? d.viewers.map((v) => `<div class="viewer">${avatar(v.name || 'V', v.avatar, 38)}<div>${v.user_id ? `<a href="#/u/${v.user_id}"><b>${esc(v.name)}</b></a>` : '<b>Visitante sin cuenta</b>'}<small>Vio: ${esc(v.title)}</small></div><time>${ago(v.created_at)}</time></div>`).join('') : `<p class="muted">Aún no hay visitas.</p>`}</div>
    </div>
    <div class="panel"><h2>Mis publicaciones</h2><p class="sub">Vistas, favoritos y conversaciones de cada artículo.</p>
      <div id="plist">${d.products.length ? d.products.map((p) => `<div class="prow" data-pid="${p.id}">
        <a class="pthumb" href="#/p/${p.id}">${p.cover ? `<img src="/img/${p.cover}" alt="">` : ''}</a>
        <div class="pinfo"><a href="#/p/${p.id}"><b>${esc(p.title)}</b></a><small>${money(p.price)} · ${esc(p.category)}</small></div>
        <span class="status ${p.status}">${STATUS[p.status]}</span>
        <div class="pstats"><span title="Vistas">${ico('eye', 15)} ${p.views}${p.views7 ? `<i>+${p.views7}</i>` : ''}</span><span title="Favoritos">${ico('heart', 15)} ${p.favorites}</span><span title="Conversaciones">${ico('chat', 15)} ${p.chats}</span></div>
        <div class="pact">
          <a class="icon-btn" href="#/editar/${p.id}" aria-label="Editar" title="Editar">${ico('edit', 16)}</a>
          <button class="icon-btn" data-st="${p.status === 'paused' ? 'active' : 'paused'}" aria-label="${p.status === 'paused' ? 'Reactivar' : 'Pausar'}" title="${p.status === 'paused' ? 'Reactivar' : 'Pausar'}">${ico(p.status === 'paused' ? 'play' : 'pause', 16)}</button>
          ${p.status !== 'sold' ? `<button class="icon-btn" data-st="sold" aria-label="Marcar vendido" title="Marcar vendido">${ico('check', 16)}</button>` : ''}
          <button class="icon-btn danger" data-del aria-label="Eliminar" title="Eliminar">${ico('trash', 16)}</button>
        </div></div>`).join('') : emptyState('camera', 'Aún no has publicado nada', 'Sube tu primer artículo con hasta 5 fotos.', `<a class="btn" href="#/vender">Publicar mi primer artículo</a>`)}</div>
    </div></div>`);
  $('#plist').addEventListener('click', async (e) => {
    const b = e.target.closest('button'), row = e.target.closest('[data-pid]');
    if (!b || !row) return;
    try {
      if (b.dataset.st) { await api(`/api/products/${row.dataset.pid}/status`, { method: 'PATCH', body: { status: b.dataset.st } }); toast('Publicación actualizada'); dashboardView(); }
      else if ('del' in b.dataset && (await confirmBox('¿Eliminar esta publicación? No se puede deshacer.', 'Eliminar'))) { await api('/api/products/' + row.dataset.pid, { method: 'DELETE' }); toast('Publicación eliminada'); dashboardView(); }
    } catch (er) { toast(er.message, 'err'); }
  });
}
async function buyerHome() {
  loading();
  const [fav, conv] = await Promise.all([api('/api/favorites'), api('/api/conversations')]);
  setView(`<div class="wrap dash">
    <div class="dash-head"><div><h1 style="font-size:clamp(26px,3.4vw,36px)">Hola, ${esc(S.user.name.split(' ')[0])}</h1><p class="muted">Tu espacio de comprador.</p></div><a class="btn" href="#/">${ico('search', 18)} Explorar</a></div>
    <div class="kpis"><div class="kpi"><div class="kpi-ic">${ico('heart', 22)}</div><div><small>Favoritos</small><b>${fav.length}</b></div></div><div class="kpi sun"><div class="kpi-ic">${ico('chat', 22)}</div><div><small>Conversaciones</small><b>${conv.length}</b></div></div></div>
    <div class="dash-cols"><div class="panel"><h2>Tus favoritos</h2><p class="sub">Lo que guardaste para más tarde.</p><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${fav.slice(0, 6).map(card).join('') || emptyState('heart', 'Sin favoritos aún', 'Toca el corazón en cualquier publicación para guardarla.')}</div></div>
    <div class="panel"><h2>Conversaciones recientes</h2><p class="sub">Retoma tus negociaciones.</p>${conv.slice(0, 6).map((c) => `<a class="conv" style="padding-inline:0" href="#/mensajes/${c.id}">${avatar(c.other_name, c.other_avatar, 40)}<div class="cv-t"><b>${esc(c.other_name)}</b><small class="cv-p">${esc(c.product_title)}</small></div>${c.unread ? `<i class="badge-n">${c.unread}</i>` : ''}</a>`).join('') || '<p class="muted">Cuando escribas a un vendedor, aparecerá aquí.</p>'}</div></div></div>`);
}

/* ======================= MENSAJES (chat P2P) ======================= */
const bubble = (m) => {
  const mine = m.sender_id === S.user.id;
  const t = new Date(m.created_at).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
  if (m.kind === 'offer') return `<div class="msg ${mine ? 'me' : ''}"><div class="offer"><small>${mine ? 'Tu oferta' : 'Oferta recibida'}</small><b>${money(m.amount)}</b>${m.body ? `<p>${esc(m.body)}</p>` : ''}<time>${t}</time></div></div>`;
  return `<div class="msg ${mine ? 'me' : ''}"><div class="bub">${esc(m.body)}<time>${t}</time></div></div>`;
};
async function messagesView(id) {
  if (!needAuth()) return;
  id = id ? +id : null;
  setView(`<div class="wrap msgs ${id ? 'has-chat' : ''}"><aside class="conv-list"><h2>Mensajes</h2><div id="clist"></div></aside>
    <section class="chat" id="chat">${id ? '' : `<div class="chat-empty">${ico('chat', 46)}<h3>Tus conversaciones</h3><p>Elige un chat para ver los mensajes.</p></div>`}</section></div>`);
  const paint = async () => {
    const list = await api('/api/conversations');
    $('#clist').innerHTML = list.length ? list.map((c) => `<a class="conv ${c.id === id ? 'on' : ''}" href="#/mensajes/${c.id}">${avatar(c.other_name, c.other_avatar, 46)}<div class="cv-t"><div class="cv-h"><b>${esc(c.other_name)}</b><time>${c.last_at ? ago(c.last_at) : ''}</time></div><small class="cv-p">${esc(c.product_title)}</small><p>${c.last_kind === 'offer' ? 'Oferta enviada' : esc(c.last_body || 'Sin mensajes aún')}</p></div>${c.unread ? `<i class="badge-n">${c.unread}</i>` : ''}</a>`).join('') : `<p class="muted pad">Aún no tienes conversaciones. ${S.user.role === 'buyer' ? 'Abre un artículo y toca “Chatear con el vendedor”.' : 'Cuando un comprador te escriba, aparecerá aquí.'}</p>`;
    pollUnread();
  };
  await paint();
  timer(paint, 8000);
  if (id) await openChat(id);
}
async function openChat(id) {
  const r = await api(`/api/conversations/${id}/messages`);
  const cv = r.conversation;
  let last = 0, first = true;
  const seen = new Set();
  $('#chat').innerHTML = `<header class="chat-h"><a class="back" href="#/mensajes" aria-label="Volver">${ico('chev', 22)}</a>${avatar(cv.other_name, cv.other_avatar, 42)}
    <div><a href="#/u/${cv.other_id}"><b>${esc(cv.other_name)}</b></a><small>${cv.other_role === 'seller' ? 'Vendedor' : 'Comprador'}</small></div>
    <a class="pmini" href="#/p/${cv.product_id}">${cv.cover ? `<img src="/img/${cv.cover}" alt="">` : ''}<span><b>${esc(cv.product_title)}</b><small>${money(cv.product_price)}</small></span></a></header>
    <div class="chat-body" id="cb"><div class="chat-hint">Saluda y pregunta por el artículo. Puedes hacer una oferta cuando quieras.</div></div>
    <form class="composer" id="cf">${S.user.role === 'buyer' ? `<button type="button" class="btn btn-ghost btn-sm" id="cOffer">${ico('tag', 16)} Ofertar</button>` : ''}<input id="ci" type="text" maxlength="2000" placeholder="Escribe un mensaje" autocomplete="off" aria-label="Mensaje"><button class="btn icon-send" aria-label="Enviar">${ico('send', 18)}</button></form>`;
  const body = $('#cb');
  const add = (msgs) => {
    const near = body.scrollHeight - body.scrollTop - body.clientHeight < 140;
    let html = '';
    for (const m of msgs) { if (seen.has(m.id)) continue; seen.add(m.id); last = Math.max(last, m.id); html += bubble(m); }
    if (!html) return;
    const hint = $('.chat-hint', body); if (hint) hint.remove();
    body.insertAdjacentHTML('beforeend', html);
    if (near || first) body.scrollTop = body.scrollHeight;
    first = false;
  };
  add(r.messages);
  timer(async () => { const x = await api(`/api/conversations/${id}/messages?after=${last}`); add(x.messages); }, 3000);
  $('#cf').onsubmit = async (e) => {
    e.preventDefault();
    const inp = $('#ci'), text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    try { add([await api(`/api/conversations/${id}/messages`, { method: 'POST', body: { body: text } })]); }
    catch (er) { toast(er.message, 'err'); inp.value = text; }
  };
  const of = $('#cOffer');
  if (of) of.onclick = () => offerModal({ price: cv.product_price }, async (amount, note) => { add([await api(`/api/conversations/${id}/messages`, { method: 'POST', body: { kind: 'offer', amount, body: note } })]); });
}

/* ======================= PERFILES ======================= */
async function profileEditView() {
  if (!needAuth()) return;
  const u = S.user;
  let file = null, remove = false;
  setView(`<div class="wrap narrow" style="padding:24px 0 48px"><h1 style="font-size:clamp(26px,3.4vw,36px);margin-bottom:16px">Editar perfil</h1>
    <form class="panel" id="pf" novalidate>
      <div class="avatar-edit"><div id="apv">${avatar(u.name, u.avatar, 84)}</div><div><button type="button" class="btn btn-ghost btn-sm" id="pick">${ico('camera', 16)} Cambiar foto</button> <button type="button" class="btn btn-danger btn-sm" id="rmav" ${u.avatar ? '' : 'hidden'}>Quitar</button><input type="file" id="pfile" accept="image/jpeg,image/png,image/webp" hidden><br><small class="muted">JPG, PNG o WEBP. Se ajusta automáticamente.</small></div></div>
      <label class="field"><span>Nombre</span><input name="name" type="text" maxlength="60" required value="${esc(u.name)}"></label>
      <div class="row2"><label class="field"><span>Ciudad</span><input name="city" type="text" maxlength="60" value="${esc(u.city)}" placeholder="Ej. Cartago"></label>
      <label class="field"><span>Teléfono <em>(privado)</em></span><input name="phone" type="text" maxlength="30" value="${esc(u.phone)}"></label></div>
      <label class="field"><span>Sobre ti</span><textarea name="bio" rows="4" maxlength="500" placeholder="${u.role === 'seller' ? 'Cuéntale a los compradores qué vendes y cómo trabajas.' : 'Cuéntanos un poco sobre ti.'}">${esc(u.bio)}</textarea></label>
      <p class="muted" style="margin-bottom:16px">Correo: <b>${esc(u.email || 'sin correo (cuenta social)')}</b> · Tipo de cuenta: <b>${u.role === 'seller' ? 'Vendedor' : 'Comprador'}</b></p>
      <div class="acts"><button class="btn" id="psave">Guardar cambios</button><a class="btn btn-ghost" href="#/u/${u.id}">Ver mi perfil público</a></div>
    </form></div>`);
  $('#pick').onclick = () => $('#pfile').click();
  $('#pfile').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    file = await compress(f, 640, 0.88); remove = false;
    if (file.size > 5 * 1024 * 1024) { file = null; return toast('La imagen pesa más de 5 MB', 'err'); }
    $('#apv').innerHTML = `<img class="av" style="--s:84px" src="${URL.createObjectURL(file)}" alt="">`; $('#rmav').hidden = false;
  };
  $('#rmav').onclick = () => { file = null; remove = true; $('#apv').innerHTML = avatar($('[name=name]').value, null, 84); $('#rmav').hidden = true; };
  $('#pf').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), fd = new FormData();
    ['name', 'city', 'phone', 'bio'].forEach((k) => fd.append(k, f.get(k) || ''));
    if (file) fd.append('avatar', file, file.name);
    if (remove) fd.append('removeAvatar', '1');
    const btn = $('#psave'); btn.disabled = true;
    try { S.user = (await api('/api/me', { method: 'PUT', form: fd })).user; renderChrome(); toast('Perfil actualizado'); go('#/u/' + S.user.id); }
    catch (er) { toast(er.message, 'err'); btn.disabled = false; }
  };
}
async function publicProfileView(id) {
  loading();
  const [u, pr] = await Promise.all([api('/api/users/' + id), api('/api/products?seller=' + id)]);
  const own = S.user && S.user.id === u.id, seller = u.role === 'seller';
  let rating = u.myReview ? u.myReview.rating : 0;
  setView(`<div class="wrap prof">
    <div class="panel prof-head"><div class="prof-cover"></div>
      <div class="prof-row">${avatar(u.name, u.avatar, 96)}<div><h1>${esc(u.name)}</h1>
        <div class="meta"><span>${seller ? 'Vendedor' : 'Comprador'}</span>${u.city ? `<span>${ico('pin', 14)} ${esc(u.city)}</span>` : ''}<span>Miembro desde ${new Date(u.created_at).toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })}</span></div>
        ${seller ? `<div class="rate-line">${stars(u.rating, 18)} <b>${u.rating || 'Sin calificar'}</b> <span class="muted">${u.reviews} opiniones</span> <span class="muted">${u.active} activas · ${u.sold} vendidas</span></div>` : ''}</div>
        ${own ? `<a class="btn btn-ghost" href="#/perfil">${ico('edit', 16)} Editar perfil</a>` : ''}</div>
      ${u.bio ? `<p class="bio">${esc(u.bio)}</p>` : ''}</div>
    ${seller ? `<h2>Publicaciones</h2><div class="grid">${pr.items.map(card).join('') || emptyState('box', 'Sin publicaciones activas', 'Vuelve pronto.')}</div>
    <h2>Opiniones de compradores</h2>
    <div class="panel">
      ${u.canReview ? `<form id="rf"><h3 style="margin-bottom:8px">${u.myReview ? 'Actualiza tu calificación' : 'Califica a este vendedor'}</h3>
        <div class="stars-pick" id="sp">${[1, 2, 3, 4, 5].map((i) => `<button type="button" data-s="${i}" class="${i <= rating ? 'on' : ''}" aria-label="${i} estrellas"><svg width="30" height="30" viewBox="0 0 24 24"><path d="${STAR}"/></svg></button>`).join('')}</div>
        <label class="field" style="margin-top:10px"><span>Tu experiencia <em>(opcional)</em></span><textarea name="comment" rows="3" maxlength="600" placeholder="¿Cómo fue el trato? ¿El artículo era como se describía?">${esc(u.myReview ? u.myReview.comment : '')}</textarea></label>
        <button class="btn">${u.myReview ? 'Actualizar opinión' : 'Publicar opinión'}</button></form><hr style="border:0;border-top:1px solid var(--line);margin:20px 0">`
        : S.user && S.user.role === 'buyer' && !own ? `<p class="note" style="margin:0 0 16px">Para calificar a este vendedor, primero escríbele desde alguna de sus publicaciones.</p>` : ''}
      ${u.list.length ? u.list.map((r) => `<div class="review">${avatar(r.buyer_name, r.buyer_avatar, 42)}<div><b>${esc(r.buyer_name)}</b>${stars(r.rating, 14)} <time>${ago(r.created_at)}</time>${r.comment ? `<p>${esc(r.comment)}</p>` : ''}</div></div>`).join('') : '<p class="muted">Este vendedor aún no tiene opiniones.</p>'}
    </div>` : ''}</div>`);
  const sp = $('#sp');
  if (sp) {
    sp.onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b) return; rating = +b.dataset.s; $$('button', sp).forEach((x) => x.classList.toggle('on', +x.dataset.s <= rating)); };
    $('#rf').onsubmit = async (e) => {
      e.preventDefault();
      if (!rating) return toast('Elige de 1 a 5 estrellas', 'err');
      try { await api(`/api/users/${id}/reviews`, { method: 'POST', body: { rating, comment: new FormData(e.target).get('comment') } }); toast('¡Gracias por tu opinión!'); publicProfileView(id); }
      catch (er) { toast(er.message, 'err'); }
    };
  }
}

/* ======================= FAVORITOS ======================= */
async function favoritesView() {
  if (!needAuth()) return;
  loading();
  const items = await api('/api/favorites');
  setView(`<div class="wrap" style="padding:24px 0 40px"><h1 style="font-size:clamp(26px,3.4vw,36px);margin-bottom:18px">Tus favoritos</h1><div class="grid">${items.map(card).join('') || emptyState('heart', 'Todavía no guardas nada', 'Toca el corazón de una publicación para verla aquí.', `<a class="btn" href="#/">Explorar publicaciones</a>`)}</div></div>`);
}

/* ======================= arranque ======================= */
(async function boot() {
  $('#yr').textContent = new Date().getFullYear();
  try {
    const [me, meta] = await Promise.all([api('/api/auth/me'), api('/api/meta')]);
    S.user = me.user; S.categories = meta.categories; S.providers = meta.providers;
  } catch (e) { S.categories = Object.keys(CAT_EMOJI); }
  renderChrome();
  window.addEventListener('hashchange', route);
  setInterval(pollUnread, 12000);
  route();
})();
