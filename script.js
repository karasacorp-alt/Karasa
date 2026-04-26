/* ═══════════════════════════════════════════
   KARASA — script.js (FIXED)
   Fix:
   · [FIX 1] Tombol + di beranda sekarang render qty control (−/angka/+)
   · [FIX 2] Order Sekarang di menu.html & paket.html terhubung ke cart modal
   · [FIX 3] Cart modal bisa dibuka dari semua halaman
═══════════════════════════════════════════ */

/* ─────────────────────────────────────────
   KONFIGURASI
───────────────────────────────────────────*/
const CONFIG = {
  WA_NUMBER:      '6281234567890',
  GOFOOD_URL:     'https://gofood.co.id/bandung/restaurant/karasa-xxxxx',
  GRABFOOD_URL:   'https://grab.com/id/food/karasa-xxxxx',
  KARASAFOOD_URL: '',
  STORE_NAME:     'Karasa',
  HOME_MENU_LIMIT: 8,
};

/* ─────────────────────────────────────────
   CART STATE — persisten via localStorage
───────────────────────────────────────────*/
const CART_KEY = 'karasa_cart';

function cartLoad() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function cartSave(items) { localStorage.setItem(CART_KEY, JSON.stringify(items)); }

function cartAdd(name, price, qty = 1) {
  const items    = cartLoad();
  const existing = items.find(i => i.name === name);
  if (existing) { existing.qty += qty; } else { items.push({ name, price, qty }); }
  cartSave(items);
  cartRefreshUI();
  /* [FIX 1] Refresh tampilan qty control di grid menu beranda */
  refreshMenuGridQty(name);
  showToast(name + ' ditambahkan!');
}

function cartRemove(name) {
  cartSave(cartLoad().filter(i => i.name !== name));
  cartRefreshUI();
  renderCartModal();
  refreshMenuGridQty(name);
}

function cartChangeQty(name, delta) {
  const items = cartLoad();
  const item  = items.find(i => i.name === name);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cartSave(items.filter(i => i.name !== name));
  } else {
    cartSave(items);
  }
  cartRefreshUI();
  renderCartModal();
  /* [FIX 1] Refresh qty control di grid juga */
  refreshMenuGridQty(name);
}

function cartClear() { localStorage.removeItem(CART_KEY); cartRefreshUI(); refreshAllMenuGridQty(); }
function cartTotal() { return cartLoad().reduce((s, i) => s + i.price * i.qty, 0); }
function cartCount() { return cartLoad().reduce((s, i) => s + i.qty, 0); }

function cartRefreshUI() {
  const count   = cartCount();
  const total   = cartTotal();
  const countEl = document.getElementById('cartCount');
  const totalEl = document.getElementById('cartTotal');
  const floatEl = document.getElementById('cart-float');
  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
  if (floatEl) floatEl.classList.toggle('visible', count > 0);
}

/* ─────────────────────────────────────────
   [FIX 1] REFRESH QTY CONTROL DI MENU GRID
   Setelah add/remove/change qty, update
   tampilan tombol di card menu beranda.
───────────────────────────────────────────*/
function refreshMenuGridQty(name) {
  const card = document.querySelector(`.menu-item[data-name="${CSS.escape(name)}"]`);
  if (!card) return;
  const items   = cartLoad();
  const inCart  = items.find(i => i.name === name);
  const footer  = card.querySelector('.menu-item-footer');
  if (!footer) return;

  const price = parseInt(card.dataset.price);

  if (inCart && inCart.qty > 0) {
    footer.querySelector('.menu-item-footer-right').innerHTML = `
      <div class="menu-qty-ctrl">
        <button class="menu-qty-btn dec" data-name="${name}" data-price="${price}">−</button>
        <span class="menu-qty-num">${inCart.qty}</span>
        <button class="menu-qty-btn inc" data-name="${name}" data-price="${price}">+</button>
      </div>
    `;
  } else {
    footer.querySelector('.menu-item-footer-right').innerHTML = `
      <button class="add-btn" data-name="${name}" data-price="${price}" aria-label="Tambah ${name}">+</button>
    `;
  }
}

function refreshAllMenuGridQty() {
  document.querySelectorAll('.menu-item[data-name]').forEach(card => {
    refreshMenuGridQty(card.dataset.name);
  });
}

/* ─────────────────────────────────────────
   WHATSAPP DEEPLINK
───────────────────────────────────────────*/
function buildWAMessage(items) {
  if (!items || !items.length) return '';
  const lines = items.map(i =>
    `• ${i.name} x${i.qty}  =  Rp ${(i.price * i.qty).toLocaleString('id-ID')}`
  );
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  return [
    `Halo ${CONFIG.STORE_NAME}, saya mau order:`, '',
    ...lines, '',
    `*Total: Rp ${total.toLocaleString('id-ID')}*`, '',
    'Mohon dikonfirmasi ya, terima kasih!',
  ].join('\n');
}

function buildWAMessageSingle(name, price) {
  return [
    `Halo ${CONFIG.STORE_NAME}, saya mau order:`, '',
    `• ${name}  —  Rp ${price.toLocaleString('id-ID')}`, '',
    'Mohon dikonfirmasi ya, terima kasih!',
  ].join('\n');
}

function openWA(message) {
  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

function orderViaWA() {
  const items = cartLoad();
  if (!items.length) { showToast('Keranjang masih kosong!'); return; }
  openWA(buildWAMessage(items));
}

function orderSingleViaWA(name, price) { openWA(buildWAMessageSingle(name, price)); }
window.orderSingleViaWA = orderSingleViaWA;

/* ─────────────────────────────────────────
   PLATFORM REDIRECTS
───────────────────────────────────────────*/
function openPlatform(platform) {
  const urls = {
    gofood:   CONFIG.GOFOOD_URL,
    grabfood: CONFIG.GRABFOOD_URL,
    karasa:   CONFIG.KARASAFOOD_URL,
  };
  const url = urls[platform];
  if (url) { window.open(url, '_blank'); }
  else { openWA(`Halo ${CONFIG.STORE_NAME}, saya mau order via ${platform}. Bisa dibantu?`); }
}

/* [FIX 2] initPlatformButtons — sekarang handle semua halaman */
function initPlatformButtons() {
  document.querySelectorAll('[data-platform]').forEach(btn => {
    btn.addEventListener('click', e => { e.preventDefault(); openPlatform(btn.dataset.platform); });
  });

  /* [FIX 2] Tombol "Order Sekarang" di nav — buka cart modal di SEMUA halaman */
  document.querySelectorAll('[data-action="order"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const items = cartLoad();
      if (items.length) {
        openCartModal();
      } else {
        /* Kalau di menu.html / paket.html, scroll ke section menu/paket */
        const target = document.getElementById('menu')
                    || document.getElementById('menuGrid')
                    || document.getElementById('paketGrid')
                    || document.getElementById('menuContent');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          showToast('Pilih dulu menu yang kamu mau!');
        } else {
          /* Kalau tidak ada section yang cocok, arahkan ke menu.html */
          window.location.href = 'menu.html';
        }
      }
    });
  });
}

window.openPlatform = openPlatform;

/* ─────────────────────────────────────────
   CART MODAL
───────────────────────────────────────────*/
function injectCartModal() {
  if (document.getElementById('cart-modal-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id    = 'cart-modal-overlay';
  overlay.innerHTML = `
    <div class="cart-modal" id="cartModal">
      <div class="cart-modal-header">
        <div class="cart-modal-title">Keranjang Belanja</div>
        <button class="cart-modal-close" id="cartModalClose" aria-label="Tutup">✕</button>
      </div>
      <div class="cart-modal-body"  id="cartModalBody"></div>
      <div class="cart-modal-footer" id="cartModalFooter"></div>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    /* ── Menu grid qty control (FIX 1) ── */
    .menu-item-footer { display:flex; align-items:center; justify-content:space-between; }
    .menu-item-footer-right { display:flex; align-items:center; }
    .menu-qty-ctrl {
      display: flex; align-items: center; gap: 6px;
    }
    .menu-qty-btn {
      width: 32px; height: 32px; border-radius: 10px;
      background: rgba(212,98,42,.12); border: none; cursor: pointer;
      font-size: 18px; font-weight: 700; color: var(--orange, #D4622A);
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s, transform 0.1s;
      line-height: 1;
    }
    .menu-qty-btn:hover { background: rgba(212,98,42,.25); transform: scale(1.08); }
    .menu-qty-btn:active { transform: scale(0.95); }
    .menu-qty-num {
      font-family: 'Nunito', sans-serif; font-weight: 900;
      font-size: 15px; min-width: 22px; text-align: center;
      color: var(--espresso, #2C1A0E);
    }

    /* ── Cart modal ── */
    #cart-modal-overlay {
      position: fixed; inset: 0; z-index: 500;
      background: rgba(15,6,2,.55);
      display: flex; align-items: flex-end; justify-content: center;
      backdrop-filter: blur(4px);
      opacity: 0; pointer-events: none;
      transition: opacity 0.25s ease;
    }
    #cart-modal-overlay.open { opacity: 1; pointer-events: all; }
    .cart-modal {
      background: var(--cream, #F5ECD7);
      border-radius: 24px 24px 0 0;
      width: 100%; max-width: 540px;
      max-height: 85vh; overflow: hidden;
      display: flex; flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.32,0.72,0,1);
    }
    #cart-modal-overlay.open .cart-modal { transform: translateY(0); }
    .cart-modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px 16px;
      border-bottom: 1px solid rgba(44,26,14,.1);
    }
    .cart-modal-title {
      font-family: 'Nunito', sans-serif; font-weight: 900;
      font-size: 18px; color: var(--espresso, #2C1A0E);
    }
    .cart-modal-close {
      background: rgba(44,26,14,.08); border: none; border-radius: 50%;
      width: 32px; height: 32px; cursor: pointer;
      font-size: 14px; color: var(--espresso, #2C1A0E);
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .cart-modal-close:hover { background: rgba(44,26,14,.15); }
    .cart-modal-body { flex: 1; overflow-y: auto; padding: 16px 24px; }
    .cart-modal-empty { text-align: center; padding: 48px 0; font-size: 14px; color: var(--text-muted, #7A5A42); }
    .cart-modal-empty-icon { font-size: 40px; margin-bottom: 12px; }
    .cart-item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid rgba(44,26,14,.07);
    }
    .cart-item:last-child { border-bottom: none; }
    .cart-item-name { flex: 1; font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 14px; color: var(--espresso, #2C1A0E); }
    .cart-item-price { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 14px; color: var(--orange, #D4622A); min-width: 80px; text-align: right; }
    .cart-qty-ctrl { display: flex; align-items: center; gap: 8px; }
    .cart-qty-btn {
      width: 28px; height: 28px; border-radius: 8px;
      background: rgba(212,98,42,.12); border: none; cursor: pointer;
      font-size: 16px; font-weight: 700; color: var(--orange, #D4622A);
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .cart-qty-btn:hover { background: rgba(212,98,42,.22); }
    .cart-qty-num { font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 14px; min-width: 20px; text-align: center; color: var(--espresso, #2C1A0E); }
    .cart-modal-footer { padding: 16px 24px 28px; border-top: 1px solid rgba(44,26,14,.1); background: var(--cream, #F5ECD7); }
    .cart-total-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .cart-total-label { font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 14px; color: var(--text-muted, #7A5A42); }
    .cart-total-amount { font-family: 'Nunito', sans-serif; font-weight: 900; font-size: 22px; color: var(--orange, #D4622A); }
    .cart-checkout-btns { display: flex; flex-direction: column; gap: 10px; }
    .cart-btn-wa {
      background: #25D366; color: #fff; border: none; border-radius: 100px; padding: 14px 24px;
      font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 15px;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: background 0.15s, transform 0.15s;
    }
    .cart-btn-wa:hover { background: #20b858; transform: translateY(-1px); }
    .cart-platform-row { display: flex; gap: 8px; }
    .cart-btn-platform {
      flex: 1; background: var(--white, #fff); color: var(--orange, #D4622A);
      border: 1.5px solid rgba(212,98,42,.25); border-radius: 100px;
      padding: 11px 16px; font-family: 'Nunito', sans-serif; font-weight: 800;
      font-size: 13px; cursor: pointer; transition: background 0.15s;
    }
    .cart-btn-platform:hover { background: rgba(212,98,42,.06); }
    .cart-clear-btn {
      background: transparent; border: none; color: var(--text-muted, #7A5A42);
      font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 12px;
      cursor: pointer; text-align: center; padding: 6px; width: 100%;
      transition: color 0.15s;
    }
    .cart-clear-btn:hover { color: var(--orange, #D4622A); }
    @media (max-width: 480px) {
      .cart-modal { border-radius: 20px 20px 0 0; }
      .cart-platform-row { flex-direction: column; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeCartModal(); });
  document.getElementById('cartModalClose').addEventListener('click', closeCartModal);

  overlay.addEventListener('click', e => {
    const btn = e.target.closest('[data-cart-action]');
    if (!btn) return;
    const { cartAction: action, name } = btn.dataset;
    if (action === 'wa')       orderViaWA();
    if (action === 'gofood')   openPlatform('gofood');
    if (action === 'grabfood') openPlatform('grabfood');
    if (action === 'clear')    { cartClear(); closeCartModal(); showToast('Keranjang dikosongkan.'); }
    if (action === 'inc')      cartChangeQty(name,  1);
    if (action === 'dec')      cartChangeQty(name, -1);
    if (action === 'remove')   cartRemove(name);
  });
}

function renderCartModal() {
  const body   = document.getElementById('cartModalBody');
  const footer = document.getElementById('cartModalFooter');
  if (!body || !footer) return;

  const items = cartLoad();

  if (!items.length) {
    body.innerHTML = `
      <div class="cart-modal-empty">
        <div class="cart-modal-empty-icon">🛒</div>
        <div>Keranjang masih kosong.</div>
        <div style="margin-top:6px;font-size:12px;">Tambahkan menu dulu ya!</div>
      </div>`;
    footer.innerHTML = '';
    return;
  }

  body.innerHTML = items.map(i => `
    <div class="cart-item">
      <div class="cart-item-name">${i.name}</div>
      <div class="cart-qty-ctrl">
        <button class="cart-qty-btn" data-cart-action="dec" data-name="${i.name}">−</button>
        <span class="cart-qty-num">${i.qty}</span>
        <button class="cart-qty-btn" data-cart-action="inc" data-name="${i.name}">+</button>
      </div>
      <div class="cart-item-price">Rp ${(i.price * i.qty).toLocaleString('id-ID')}</div>
    </div>
  `).join('');

  const total = cartTotal();
  footer.innerHTML = `
    <div class="cart-total-row">
      <span class="cart-total-label">Total pesanan</span>
      <span class="cart-total-amount">Rp ${total.toLocaleString('id-ID')}</span>
    </div>
    <div class="cart-checkout-btns">
      <button class="cart-btn-wa" data-cart-action="wa">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
        Order via WhatsApp
      </button>
      <div class="cart-platform-row">
        <button class="cart-btn-platform" data-cart-action="gofood">GoFood</button>
        <button class="cart-btn-platform" data-cart-action="grabfood">GrabFood</button>
      </div>
      <button class="cart-clear-btn" data-cart-action="clear">Kosongkan keranjang</button>
    </div>
  `;
}

function openCartModal() {
  injectCartModal();
  renderCartModal();
  const overlay = document.getElementById('cart-modal-overlay');
  if (overlay) { overlay.offsetHeight; overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

function closeCartModal() {
  const overlay = document.getElementById('cart-modal-overlay');
  if (overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
}

window.openCartModal = openCartModal;

/* ─────────────────────────────────────────
   DETEKSI HALAMAN
───────────────────────────────────────────*/
function isHomePage() {
  const path = window.location.pathname;
  return path === '/' || path.endsWith('index.html') || path.endsWith('/');
}

/* ─────────────────────────────────────────
   LOAD DATA & INIT
───────────────────────────────────────────*/
document.addEventListener('DOMContentLoaded', () => {
  /* [FIX 2] Inisialisasi platform buttons + cart float di SEMUA halaman */
  initPlatformButtons();
  initCartFloat();
  initKeyboardClose();
  cartRefreshUI();

  /* Render konten dari data.json hanya jika elemen target ada (beranda) */
  const hasHero    = !!document.getElementById('heroStats');
  const hasMenuGrid = !!document.getElementById('menuGrid');

  if (hasHero || hasMenuGrid) {
    fetch('data.json')
      .then(r => r.json())
      .then(data => {
        if (hasHero) {
          renderHeroBg(data.hero);
          renderHeroStats(data.hero);
          renderStrip(data.strip);
          renderHeroCards(data.hero);
          renderBundles(data.bundles);
          renderReviews(data.reviews);
          renderLocations(data.locations);
        }
        if (hasMenuGrid) {
          renderMenu(data.menu);
        }
        initInteractions();
        cartRefreshUI();
      })
      .catch(err => console.error('Gagal load data.json:', err));
  } else {
    /* Halaman menu.html / paket.html — init interaksi saja */
    initInteractions();
  }
});

/* ─── RENDER: HERO BACKGROUND ─── */
function renderHeroBg(hero) {
  if (!hero.bgImage) return;
  const heroEl = document.getElementById('hero');
  if (!heroEl) return;
  heroEl.style.backgroundImage    = `url('${hero.bgImage}')`;
  heroEl.style.backgroundSize     = 'cover';
  heroEl.style.backgroundPosition = 'center';
  heroEl.classList.add('has-bg-image');
}

/* ─── RENDER: HERO STATS ─── */
function renderHeroStats(hero) {
  const el = document.getElementById('heroStats') || document.querySelector('.hero-stats');
  if (!el || !hero.stats) return;
  el.innerHTML = hero.stats.map(s => `
    <div>
      <div class="hero-stat-num">${s.num}</div>
      <div class="hero-stat-label">${s.label}</div>
    </div>
  `).join('');
}

/* ─── RENDER: STRIP ─── */
function renderStrip(items) {
  const inner = document.querySelector('.strip-inner');
  if (!inner) return;
  inner.innerHTML = items
    .map((item, i) =>
      `<span class="strip-item">${item}</span>${i < items.length - 1 ? '<div class="strip-dot"></div>' : ''}`
    ).join('');
}

/* ─── RENDER: HERO CARDS ─── */
function renderHeroCards(hero) {
  const grid = document.querySelector('.hero-cards');
  if (!grid) return;

  grid.innerHTML = hero.foodCards.map(c => `
    <div class="food-card${c.accent ? ' accent' : ''}">
      <span class="food-card-emoji">${c.emoji}</span>
      <div class="food-card-name">${c.name}</div>
      <div class="food-card-sub">${c.sub}</div>
    </div>
  `).join('') + `
    <div class="hero-promo">
      <div>
        <div class="hero-promo-info">${hero.promo.icon} ${hero.promo.title}</div>
        <div class="hero-promo-sub">${hero.promo.sub}</div>
      </div>
      <div class="hero-promo-price">${hero.promo.price}</div>
    </div>
  `;
}

/* ─────────────────────────────────────────
   [FIX 1] RENDER: MENU (beranda)
   Card sekarang pakai wrapper .menu-item-footer-right
   supaya qty control bisa di-swap dengan tombol +
───────────────────────────────────────────*/
function renderMenu(menuData) {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;

  const onHome      = isHomePage();
  const itemsToShow = onHome ? menuData.slice(0, CONFIG.HOME_MENU_LIMIT) : menuData;
  const totalItems  = menuData.length;
  const hidden      = totalItems - itemsToShow.length;

  grid.innerHTML = itemsToShow.map(item => {
    const tagHTML        = item.tag ? `<span class="tag ${item.tag.class}">${item.tag.label}</span>` : '';
    const priceFormatted = 'Rp ' + item.price.toLocaleString('id-ID');
    /* [FIX 1] Tambah data-name & data-price di .menu-item,
       dan bungkus tombol + di .menu-item-footer-right */
    return `
      <div class="menu-item visible"
           data-cat="${item.cat}"
           data-name="${item.name}"
           data-price="${item.price}">
        <div class="menu-item-img ${item.bg}">${item.emoji}</div>
        <div class="menu-item-body">
          <div class="menu-item-header">
            <span class="menu-item-name heading">${item.name}</span>
            ${tagHTML}
          </div>
          <p class="menu-item-desc">${item.desc}</p>
          <div class="menu-item-footer">
            <span class="price" style="font-size:16px;font-weight:900;">${priceFormatted}</span>
            <div class="menu-item-footer-right">
              <button class="add-btn"
                data-name="${item.name}"
                data-price="${item.price}"
                aria-label="Tambah ${item.name}">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (onHome && hidden > 0) {
    const seeAll = document.createElement('div');
    seeAll.className = 'menu-see-all-wrap';
    seeAll.innerHTML = `
      <a href="menu.html" class="menu-see-all-btn">
        Lihat semua ${totalItems} menu
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </a>
    `;
    grid.insertAdjacentElement('afterend', seeAll);
  }

  /* [FIX 1] Bind klik — handle tombol + dan tombol qty −/+ */
  grid.addEventListener('click', e => {
    const addBtn = e.target.closest('.add-btn');
    const qtyBtn = e.target.closest('.menu-qty-btn');

    if (addBtn) {
      cartAdd(addBtn.dataset.name, parseInt(addBtn.dataset.price));
    }

    if (qtyBtn) {
      const name  = qtyBtn.dataset.name;
      const price = parseInt(qtyBtn.dataset.price);
      if (qtyBtn.classList.contains('inc')) {
        cartAdd(name, price);
      } else if (qtyBtn.classList.contains('dec')) {
        cartChangeQty(name, -1);
      }
    }
  });

  /* Restore qty control untuk item yang sudah di cart */
  refreshAllMenuGridQty();
}

/* ─── RENDER: BUNDLES ─── */
function renderBundles(bundles) {
  const list = document.querySelector('.bundle-list');
  if (!list) return;

  list.innerHTML = bundles.map(b => {
    const saveHTML = b.save ? `<div class="bundle-save">${b.save}</div>` : '';
    return `
      <div class="bundle-card ${b.featured ? 'featured' : 'regular'}"
           style="cursor:pointer;"
           data-bundle-name="${b.name}"
           data-bundle-price="${b.priceNum || 0}">
        <div class="bundle-card-left">
          <div class="bundle-card-name">${b.name}</div>
          <div class="bundle-card-desc">${b.desc}</div>
          ${saveHTML}
        </div>
        <div><div class="bundle-card-price">${b.price}</div></div>
      </div>
    `;
  }).join('');

  list.addEventListener('click', e => {
    const card = e.target.closest('[data-bundle-name]');
    if (!card) return;
    orderSingleViaWA(card.dataset.bundleName, parseInt(card.dataset.bundlePrice));
  });
}

/* ─── RENDER: REVIEWS ─── */
function renderReviews(reviews) {
  const ratingBig   = document.querySelector('.rating-big');
  const ratingCount = document.querySelector('.rating-count');
  const starsEl     = document.querySelector('.stars');
  const breakdown   = document.querySelector('.rating-breakdown');
  const grid        = document.querySelector('.reviews-grid');

  if (ratingBig)   ratingBig.textContent   = reviews.rating;
  if (ratingCount) ratingCount.textContent = `dari ${reviews.count} ulasan di ${reviews.platform}`;
  if (starsEl)     starsEl.textContent     = '★★★★★';

  if (breakdown) {
    breakdown.innerHTML = reviews.bars.map(b => `
      <div class="bar-row">
        <span class="bar-label">${b.star}</span>
        <div class="bar-track">
          <div class="bar-fill" data-w="${b.pct}" style="width:0%"></div>
        </div>
        <span style="font-size:12px;color:var(--text-muted);">${b.pct}%</span>
      </div>
    `).join('');
  }

  if (grid) {
    grid.innerHTML = reviews.cards.map(c => `
      <div class="review-card">
        <div class="review-stars">${'★'.repeat(c.stars)}</div>
        <p class="review-text">"${c.text}"</p>
        <div class="review-author">
          <div class="review-avatar">${c.initials}</div>
          <div>
            <div class="review-name">${c.name}</div>
            <div class="review-platform">${c.platform}</div>
          </div>
        </div>
      </div>
    `).join('');
  }
}

/* ─── RENDER: LOCATIONS ─── */
function renderLocations(locations) {
  const grid = document.querySelector('.location-grid');
  if (!grid) return;

  const mapsLinks = [
    'https://maps.google.com/?q=Jl+Kolonel+Masturi+12+Cimahi',
    'https://maps.google.com/?q=Jl+Soekarno+Hatta+88+Bandung',
  ];

  grid.innerHTML = locations.map((loc, i) => `
    <div class="location-card">
      <div class="location-icon">📍</div>
      <div class="location-name">${loc.name}</div>
      <p class="location-addr">${loc.address}</p>
      <div class="location-hours">Buka <span>${loc.hours}</span></div>
      <div style="margin-top:16px;">
        <a href="${mapsLinks[i] || '#'}" target="_blank" rel="noopener"
           class="btn btn-ghost" style="font-size:12px;padding:8px 16px;">
          Buka di Maps
        </a>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════
   INTERAKSI
═══════════════════════════════════════════ */
function initInteractions() {
  initNav();
  initMenuTabs();
  initScrollAnimations();
  initRatingBars();
}

function initNav() {
  const navbar    = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMobile = document.getElementById('navMobile');
  if (!navbar) return;

  if (!navbar.classList.contains('scrolled')) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  if (navToggle && navMobile) {
    navToggle.addEventListener('click', () => {
      navMobile.classList.toggle('open');
      navToggle.classList.toggle('is-open');
    });
    navMobile.querySelectorAll('a, button').forEach(l =>
      l.addEventListener('click', () => {
        navMobile.classList.remove('open');
        navToggle.classList.remove('is-open');
      })
    );
    document.addEventListener('click', e => {
      if (!navbar.contains(e.target)) {
        navMobile.classList.remove('open');
        navToggle.classList.remove('is-open');
      }
    });
  }

  injectMobileOrderBtn(navbar, navToggle);
}

function injectMobileOrderBtn(navbar, navToggle) {
  if (navbar.querySelector('.nav-mobile-order')) return;
  const navInner = navbar.querySelector('.nav-inner');
  if (!navInner || !navToggle) return;

  const btn = document.createElement('button');
  btn.className = 'nav-mobile-order';
  btn.innerHTML = '\u{1F6D2} Order';
  btn.addEventListener('click', () => {
    const items = cartLoad();
    if (items.length) {
      openCartModal();
    } else {
      const target = document.getElementById('menu')
                  || document.getElementById('menuContent')
                  || document.getElementById('paketGrid');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
      else window.location.href = 'menu.html';
      showToast('Pilih menu dulu ya!');
    }
  });
  navInner.insertBefore(btn, navToggle);

  if (!document.getElementById('nav-mobile-style')) {
    const s = document.createElement('style');
    s.id = 'nav-mobile-style';
    s.textContent = `
      .nav-mobile-order {
        display: none;
        align-items: center;
        gap: 4px;
        background: var(--orange, #D4622A);
        color: #fff;
        border: none;
        border-radius: 100px;
        padding: 7px 13px;
        font-family: 'Nunito', sans-serif;
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s, transform 0.1s;
        line-height: 1;
      }
      .nav-mobile-order:active { transform: scale(0.95); }
      @media (max-width: 768px) {
        .nav-mobile-order { display: flex; }
      }
      .nav-toggle span {
        transition: transform 0.2s ease, opacity 0.15s ease;
        display: block;
      }
      .nav-toggle.is-open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      .nav-toggle.is-open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
      .nav-toggle.is-open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
    `;
    document.head.appendChild(s);
  }
}

function initMenuTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const cat = tab.dataset.cat;
      document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.toggle('visible', cat === 'all' || item.dataset.cat === cat);
      });
    });
  });
}

function initCartFloat() {
  const floatEl = document.getElementById('cart-float');
  if (floatEl) floatEl.addEventListener('click', openCartModal);
}

function initKeyboardClose() {
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCartModal(); });
}

function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('in-view'), i * 80);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
}

function initRatingBars() {
  const barObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.bar-fill').forEach(bar => {
          bar.style.width = bar.dataset.w + '%';
        });
        barObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const tryObserve = () => {
    const el = document.querySelector('.reviews-top, .rating-breakdown');
    if (el) barObs.observe(el);
  };
  tryObserve();
  setTimeout(tryObserve, 500);
}

/* ─── TOAST ─── */
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

window.showToast = showToast;
window.addToCart = cartAdd;