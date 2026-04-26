/* ═══════════════════════════════════════════
   KARASA — cart.js
   Shared di SEMUA halaman:
   · Cart state (localStorage)
   · Qty controls (+/−) inline di card
   · Checkout modal (WA + GoFood + GrabFood)
   · WhatsApp deeplink otomatis
   · Platform redirect
   · Toast notification
═══════════════════════════════════════════ */

/* ─────────────────────────────────────────
   KONFIGURASI — edit sesuai data Karasa
───────────────────────────────────────────*/
const CONFIG = {
  WA_NUMBER:    '6281234567890',        /* format 62xxx tanpa + atau spasi */
  GOFOOD_URL:   'https://gofood.co.id/bandung/restaurant/karasa-xxxxx',
  GRABFOOD_URL: 'https://grab.com/id/food/karasa-xxxxx',
  KARASAFOOD_URL: '',                   /* kosongkan jika belum ada */
  STORE_NAME:   'Karasa',
};

/* ─────────────────────────────────────────
   CART STATE (localStorage)
───────────────────────────────────────────*/
const CART_KEY = 'karasa_cart';

function cartLoad() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function cartSave(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function cartAdd(name, price) {
  const items = cartLoad();
  const found = items.find(i => i.name === name);
  if (found) { found.qty++; }
  else { items.push({ name, price, qty: 1 }); }
  cartSave(items);
  cartRefreshUI();
  cartRefreshInlineQty(name);
  showToast(name + ' ditambahkan!');
}

function cartDec(name) {
  const items = cartLoad();
  const found = items.find(i => i.name === name);
  if (!found) return;
  found.qty--;
  if (found.qty <= 0) {
    cartSave(items.filter(i => i.name !== name));
  } else {
    cartSave(items);
  }
  cartRefreshUI();
  cartRefreshInlineQty(name);
  if (document.getElementById('cartModalBody')) renderCartModal();
}

function cartInc(name, price) {
  cartAdd(name, price);
  if (document.getElementById('cartModalBody')) renderCartModal();
}

function cartRemove(name) {
  cartSave(cartLoad().filter(i => i.name !== name));
  cartRefreshUI();
  cartRefreshInlineQty(name);
  renderCartModal();
}

function cartClear() {
  localStorage.removeItem(CART_KEY);
  cartRefreshUI();
  /* Reset semua inline qty di halaman */
  document.querySelectorAll('.qty-controls').forEach(el => {
    el.classList.remove('has-qty');
    const num = el.querySelector('.qty-num');
    if (num) num.textContent = '0';
  });
  if (document.getElementById('cartModalBody')) renderCartModal();
}

function cartGetQty(name) {
  const found = cartLoad().find(i => i.name === name);
  return found ? found.qty : 0;
}

function cartTotalAmount() {
  return cartLoad().reduce((s, i) => s + i.price * i.qty, 0);
}

function cartTotalQty() {
  return cartLoad().reduce((s, i) => s + i.qty, 0);
}

/* ─── Refresh floating cart button ─── */
function cartRefreshUI() {
  const qty   = cartTotalQty();
  const total = cartTotalAmount();

  const countEl = document.getElementById('cartCount');
  const totalEl = document.getElementById('cartTotal');
  const floatEl = document.getElementById('cart-float');

  if (countEl) countEl.textContent = qty;
  if (totalEl) totalEl.textContent = 'Rp ' + total.toLocaleString('id-ID');
  if (floatEl) floatEl.classList.toggle('visible', qty > 0);
}

/* ─── Refresh qty control di dalam card ─── */
function cartRefreshInlineQty(name) {
  const qty = cartGetQty(name);
  /* Cari semua card yang punya data-name cocok */
  document.querySelectorAll(`[data-item-name="${CSS.escape(name)}"]`).forEach(card => {
    const ctrl = card.querySelector('.qty-controls');
    const num  = card.querySelector('.qty-num');
    if (!ctrl || !num) return;
    num.textContent = qty;
    ctrl.classList.toggle('has-qty', qty > 0);
  });
}

/* ─────────────────────────────────────────
   WHATSAPP
───────────────────────────────────────────*/
function buildWACart() {
  const items = cartLoad();
  if (!items.length) return '';
  const lines = items.map(i =>
    `• ${i.name} x${i.qty}  =  Rp ${(i.price * i.qty).toLocaleString('id-ID')}`
  );
  const total = cartTotalAmount();
  return [
    `Halo ${CONFIG.STORE_NAME}, saya mau order:`,
    '',
    ...lines,
    '',
    `*Total: Rp ${total.toLocaleString('id-ID')}*`,
    '',
    'Mohon dikonfirmasi ya, terima kasih!',
  ].join('\n');
}

function buildWASingle(name, price) {
  return [
    `Halo ${CONFIG.STORE_NAME}, saya mau order:`,
    '',
    `• ${name}  —  Rp ${Number(price).toLocaleString('id-ID')}`,
    '',
    'Mohon dikonfirmasi ya, terima kasih!',
  ].join('\n');
}

function openWA(message) {
  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

window.orderViaWA = function() {
  const items = cartLoad();
  if (!items.length) { showToast('Keranjang masih kosong!'); return; }
  openWA(buildWACart());
};

window.orderSingleViaWA = function(name, price) {
  openWA(buildWASingle(name, price));
};

/* ─────────────────────────────────────────
   PLATFORM REDIRECT
───────────────────────────────────────────*/
window.openPlatform = function(platform) {
  const map = {
    gofood:   CONFIG.GOFOOD_URL,
    grabfood: CONFIG.GRABFOOD_URL,
    karasa:   CONFIG.KARASAFOOD_URL,
  };
  const url = map[platform];
  if (url) { window.open(url, '_blank'); }
  else     { openWA(`Halo ${CONFIG.STORE_NAME}, saya mau order. Bisa dibantu?`); }
};

/* ─────────────────────────────────────────
   CART MODAL
───────────────────────────────────────────*/
function ensureCartModal() {
  if (document.getElementById('cart-modal-overlay')) return;

  /* Inject HTML */
  const overlay = document.createElement('div');
  overlay.id = 'cart-modal-overlay';
  overlay.innerHTML = `
    <div class="cart-modal" id="cartModal" role="dialog" aria-modal="true" aria-label="Keranjang Belanja">
      <div class="cart-modal-drag"></div>
      <div class="cart-modal-header">
        <div class="cart-modal-title">🛒 Keranjang</div>
        <button class="cart-modal-close" id="cartModalClose" aria-label="Tutup">✕</button>
      </div>
      <div class="cart-modal-body" id="cartModalBody"></div>
      <div class="cart-modal-footer" id="cartModalFooter"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  /* Inject CSS (sekali saja) */
  if (!document.getElementById('cart-modal-css')) {
    const s = document.createElement('style');
    s.id = 'cart-modal-css';
    s.textContent = `
      #cart-modal-overlay {
        position:fixed;inset:0;z-index:600;
        background:rgba(15,6,2,0.6);backdrop-filter:blur(5px);
        display:flex;align-items:flex-end;justify-content:center;
        opacity:0;pointer-events:none;transition:opacity .25s ease;
      }
      #cart-modal-overlay.open { opacity:1;pointer-events:all; }
      .cart-modal {
        background:var(--cream,#F5ECD7);border-radius:24px 24px 0 0;
        width:100%;max-width:520px;max-height:88vh;
        display:flex;flex-direction:column;overflow:hidden;
        transform:translateY(100%);
        transition:transform .32s cubic-bezier(.32,.72,0,1);
      }
      #cart-modal-overlay.open .cart-modal { transform:translateY(0); }
      .cart-modal-drag {
        width:40px;height:4px;border-radius:2px;
        background:rgba(44,26,14,.15);margin:12px auto 0;flex-shrink:0;
      }
      .cart-modal-header {
        display:flex;justify-content:space-between;align-items:center;
        padding:14px 22px 14px;border-bottom:1px solid rgba(44,26,14,.09);flex-shrink:0;
      }
      .cart-modal-title {
        font-family:'Nunito',sans-serif;font-weight:900;
        font-size:18px;color:var(--espresso,#2C1A0E);
      }
      .cart-modal-close {
        width:32px;height:32px;border-radius:50%;border:none;cursor:pointer;
        background:rgba(44,26,14,.08);font-size:14px;color:var(--espresso,#2C1A0E);
        display:flex;align-items:center;justify-content:center;transition:background .15s;
      }
      .cart-modal-close:hover { background:rgba(44,26,14,.15); }
      .cart-modal-body { flex:1;overflow-y:auto;padding:8px 22px 0; }
      .cart-empty {
        text-align:center;padding:52px 0;
        font-size:14px;color:var(--text-muted,#7A5A42);
      }
      .cart-empty-icon { font-size:44px;margin-bottom:14px;opacity:.5; }
      .cart-empty-sub { font-size:12px;margin-top:6px;opacity:.7; }

      /* Cart items */
      .cart-item {
        display:flex;align-items:center;gap:12px;
        padding:13px 0;border-bottom:1px solid rgba(44,26,14,.07);
      }
      .cart-item:last-child { border-bottom:none; }
      .cart-item-info { flex:1;min-width:0; }
      .cart-item-name {
        font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;
        color:var(--espresso,#2C1A0E);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      .cart-item-unit {
        font-size:11px;color:var(--text-muted,#7A5A42);margin-top:2px;
      }
      .cart-item-qty-ctrl {
        display:flex;align-items:center;gap:6px;flex-shrink:0;
      }
      .cqb {
        width:28px;height:28px;border-radius:8px;border:none;cursor:pointer;
        font-size:16px;font-weight:700;display:flex;align-items:center;justify-content:center;
        transition:background .15s,transform .1s;
      }
      .cqb:active { transform:scale(.9); }
      .cqb-dec { background:rgba(212,98,42,.12);color:var(--orange,#D4622A); }
      .cqb-dec:hover { background:rgba(212,98,42,.22); }
      .cqb-inc { background:var(--orange,#D4622A);color:#fff; }
      .cqb-inc:hover { background:var(--orange-dk,#B84E1A); }
      .cqn {
        font-family:'Nunito',sans-serif;font-weight:900;font-size:15px;
        min-width:22px;text-align:center;color:var(--espresso,#2C1A0E);
      }
      .cart-item-price {
        font-family:'Nunito',sans-serif;font-weight:900;font-size:14px;
        color:var(--orange,#D4622A);min-width:72px;text-align:right;flex-shrink:0;
      }

      /* Footer */
      .cart-modal-footer {
        padding:14px 22px 28px;border-top:1px solid rgba(44,26,14,.09);
        background:var(--cream,#F5ECD7);flex-shrink:0;
      }
      .cart-total-row {
        display:flex;justify-content:space-between;align-items:baseline;
        margin-bottom:16px;
      }
      .cart-total-lbl {
        font-size:13px;color:var(--text-muted,#7A5A42);font-weight:600;
      }
      .cart-total-amt {
        font-family:'Nunito',sans-serif;font-weight:900;
        font-size:24px;color:var(--orange,#D4622A);
      }
      .cart-cta-stack { display:flex;flex-direction:column;gap:9px; }
      .cbtn-wa {
        background:#25D366;color:#fff;border:none;border-radius:100px;
        padding:14px;font-family:'Nunito',sans-serif;font-weight:800;font-size:15px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
        transition:background .15s,transform .12s;width:100%;
      }
      .cbtn-wa:hover { background:#1ebe5a;transform:translateY(-1px); }
      .cbtn-row { display:flex;gap:8px; }
      .cbtn-platform {
        flex:1;background:#fff;color:var(--orange,#D4622A);
        border:1.5px solid rgba(212,98,42,.2);border-radius:100px;
        padding:11px;font-family:'Nunito',sans-serif;font-weight:800;font-size:13px;
        cursor:pointer;transition:background .15s;
      }
      .cbtn-platform:hover { background:rgba(212,98,42,.06); }
      .cbtn-clear {
        background:none;border:none;color:var(--text-muted,#7A5A42);
        font-family:'Nunito',sans-serif;font-weight:700;font-size:12px;
        cursor:pointer;text-align:center;padding:4px;width:100%;
        transition:color .15s;
      }
      .cbtn-clear:hover { color:var(--orange,#D4622A); }

      /* Inline qty controls inside menu cards */
      .qty-controls {
        display:flex;align-items:center;gap:0;
        background:rgba(212,98,42,.1);border-radius:100px;
        overflow:hidden;max-width:0;opacity:0;
        transition:max-width .25s ease, opacity .2s ease, margin .2s;
        margin-right:0;
      }
      .qty-controls.has-qty {
        max-width:100px;opacity:1;margin-right:6px;
      }
      .qty-btn-sm {
        width:28px;height:28px;border:none;cursor:pointer;
        background:transparent;font-size:16px;font-weight:700;
        color:var(--orange,#D4622A);display:flex;align-items:center;
        justify-content:center;transition:background .12s;flex-shrink:0;
        line-height:1;
      }
      .qty-btn-sm:hover { background:rgba(212,98,42,.18); }
      .qty-num-sm {
        font-family:'Nunito',sans-serif;font-weight:900;font-size:13px;
        color:var(--espresso,#2C1A0E);min-width:18px;text-align:center;
      }
      @media(max-width:480px){
        .cart-modal { border-radius:20px 20px 0 0; }
        .cbtn-row { flex-direction:column; }
      }
    `;
    document.head.appendChild(s);
  }

  /* Event: tutup overlay click luar */
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeCartModal();
  });

  /* Event: semua tombol di dalam modal */
  overlay.addEventListener('click', e => {
    const btn = e.target.closest('[data-cart]');
    if (!btn) return;
    const action = btn.dataset.cart;
    const name   = btn.dataset.name;
    const price  = btn.dataset.price;

    if (action === 'inc')      cartInc(name, parseInt(price));
    if (action === 'dec')      cartDec(name);
    if (action === 'remove')   cartRemove(name);
    if (action === 'wa')       window.orderViaWA();
    if (action === 'gofood')   window.openPlatform('gofood');
    if (action === 'grabfood') window.openPlatform('grabfood');
    if (action === 'clear')    { cartClear(); showToast('Keranjang dikosongkan.'); }
  });

  document.getElementById('cartModalClose')
    .addEventListener('click', closeCartModal);
}

function renderCartModal() {
  const body   = document.getElementById('cartModalBody');
  const footer = document.getElementById('cartModalFooter');
  if (!body || !footer) return;

  const items = cartLoad();

  if (!items.length) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <div>Keranjang masih kosong.</div>
        <div class="cart-empty-sub">Tambahkan menu dulu ya!</div>
      </div>`;
    footer.innerHTML = '';
    return;
  }

  body.innerHTML = items.map(i => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-unit">Rp ${i.price.toLocaleString('id-ID')} / pcs</div>
      </div>
      <div class="cart-item-qty-ctrl">
        <button class="cqb cqb-dec" data-cart="dec" data-name="${i.name}" aria-label="Kurangi">−</button>
        <span class="cqn">${i.qty}</span>
        <button class="cqb cqb-inc" data-cart="inc" data-name="${i.name}" data-price="${i.price}" aria-label="Tambah">+</button>
      </div>
      <div class="cart-item-price">Rp ${(i.price * i.qty).toLocaleString('id-ID')}</div>
    </div>
  `).join('');

  const total = cartTotalAmount();
  footer.innerHTML = `
    <div class="cart-total-row">
      <span class="cart-total-lbl">Total pesanan (${cartTotalQty()} item)</span>
      <span class="cart-total-amt">Rp ${total.toLocaleString('id-ID')}</span>
    </div>
    <div class="cart-cta-stack">
      <button class="cbtn-wa" data-cart="wa">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
        Order via WhatsApp
      </button>
      <div class="cbtn-row">
        <button class="cbtn-platform" data-cart="gofood">GoFood</button>
        <button class="cbtn-platform" data-cart="grabfood">GrabFood</button>
      </div>
      <button class="cbtn-clear" data-cart="clear">Kosongkan keranjang</button>
    </div>
  `;
}

window.openCartModal = function() {
  ensureCartModal();
  renderCartModal();
  const ov = document.getElementById('cart-modal-overlay');
  if (ov) { ov.offsetHeight; ov.classList.add('open'); document.body.style.overflow = 'hidden'; }
};

window.closeCartModal = function() {
  const ov = document.getElementById('cart-modal-overlay');
  if (ov) { ov.classList.remove('open'); document.body.style.overflow = ''; }
};

/* ─────────────────────────────────────────
   SHARED UI INIT — dipanggil di semua halaman
───────────────────────────────────────────*/
window.initCartUI = function() {
  cartRefreshUI();

  /* Cart float button → buka modal */
  const floatBtn = document.querySelector('#cart-float .cart-btn, #cart-float .cart-float-btn');
  if (floatBtn) floatBtn.addEventListener('click', window.openCartModal);

  /* Tombol "Order Sekarang" [data-action="order"] */
  document.querySelectorAll('[data-action="order"]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (cartTotalQty() > 0) {
        window.openCartModal();
      } else {
        const menuEl = document.getElementById('menu') || document.getElementById('menuGrid') || document.getElementById('menuContent');
        if (menuEl) menuEl.scrollIntoView({ behavior: 'smooth' });
        showToast('Pilih dulu menu yang kamu mau!');
      }
    });
  });

  /* Tombol platform [data-platform] */
  document.querySelectorAll('[data-platform]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      window.openPlatform(btn.dataset.platform);
    });
  });

  /* Keyboard ESC */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') window.closeCartModal();
  });
};

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────────*/
let _toastTimer;
window.showToast = function(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastMsg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
};

/* ─────────────────────────────────────────
   HELPER: build menu card HTML dengan qty control
   Dipakai oleh script.js (index) dan menu.html
───────────────────────────────────────────*/
window.buildMenuCardHTML = function(item, cardClass = 'menu-item') {
  const price = 'Rp ' + item.price.toLocaleString('id-ID');
  const tag   = item.tag
    ? `<span class="tag ${item.tag.class}">${item.tag.label}</span>`
    : '';
  const qty   = cartGetQty(item.name);

  return `
    <div class="${cardClass} visible" data-cat="${item.cat}" data-item-name="${item.name}">
      <div class="menu-item-img ${item.bg}">${item.emoji}</div>
      <div class="menu-item-body">
        <div class="menu-item-header">
          <span class="menu-item-name heading">${item.name}</span>
          ${tag}
        </div>
        <p class="menu-item-desc">${item.desc}</p>
        <div class="menu-item-footer">
          <span class="price" style="font-size:16px;font-weight:900;">${price}</span>
          <div style="display:flex;align-items:center;">
            <div class="qty-controls${qty > 0 ? ' has-qty' : ''}"
                 data-item-name="${item.name}">
              <button class="qty-btn-sm qty-dec"
                      data-name="${item.name}" aria-label="Kurangi">−</button>
              <span class="qty-num-sm qty-num">${qty}</span>
              <button class="qty-btn-sm qty-inc"
                      data-name="${item.name}" data-price="${item.price}"
                      aria-label="Tambah">+</button>
            </div>
            <button class="add-btn"
                    data-name="${item.name}" data-price="${item.price}"
                    aria-label="Tambah ${item.name}">+</button>
          </div>
        </div>
      </div>
    </div>
  `;
};

/* ─────────────────────────────────────────
   DELEGASI EVENT untuk qty controls di grid
   Panggil ini setelah render grid
───────────────────────────────────────────*/
window.bindQtyEvents = function(gridEl) {
  if (!gridEl) return;
  /* Hapus listener lama supaya tidak double */
  gridEl.removeEventListener('click', gridEl._qtyHandler);

  gridEl._qtyHandler = function(e) {
    /* Tombol + (add-btn) → add ke cart, munculkan qty control */
    const addBtn = e.target.closest('.add-btn');
    if (addBtn) {
      cartAdd(addBtn.dataset.name, parseInt(addBtn.dataset.price));
      return;
    }
    /* Tombol + di dalam qty control */
    const incBtn = e.target.closest('.qty-inc');
    if (incBtn) {
      cartAdd(incBtn.dataset.name, parseInt(incBtn.dataset.price));
      return;
    }
    /* Tombol − */
    const decBtn = e.target.closest('.qty-dec');
    if (decBtn) {
      cartDec(decBtn.dataset.name);
      return;
    }
  };

  gridEl.addEventListener('click', gridEl._qtyHandler);
};