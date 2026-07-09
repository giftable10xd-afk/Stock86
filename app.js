// ============================================================
// RetroStation — SHARED APP LOGIC
// Works on both index.html (grid) and product.html (detail page)
// ============================================================

const STORAGE_KEY      = "retrostation_sold_state_v1";
const CART_STORAGE_KEY = "retrostation_cart_v1";

let cart = [];
let adminMode = false;

// ---------- IN-PAGE PRODUCT VIEW (no document reload) ----------
// index.html now contains both the grid (#gridView) and the product
// detail markup (#productView) in the same document. Going to a
// product swaps which one is visible via a class on <body> and pushes
// a real URL with pushState — no <a href> navigation, no document
// reload, so there's no white flash. The History API keeps the URL
// and Back/Forward button working normally.
//
// product.html itself is kept as-is, untouched, purely as a fallback:
// a shared link, a bookmark, or a no-JS visitor landing directly on
// product.html redirects straight into this same-document app (see
// the redirect script at the top of product.html).

const isIndexDocument = !!document.getElementById("gridView");

function showProductView(id, opts) {
  opts = opts || {};
  if (!isIndexDocument) return false; // we're actually on product.html — let it render normally
  document.body.classList.add("showing-product");
  if (typeof renderProductPage === "function") renderProductPage(id);
  if (!opts.skipPush) {
    history.pushState({ retroStationView: "product", id }, "", `product.html?id=${encodeURIComponent(id)}`);
  }
  // Always go to top first (instant), then after the product content renders
  // scroll down so the "← All listings" button sits at the very bottom of
  // the viewport — making it trivial for the customer to tap Add to cart and
  // then return without hunting for the button.
  window.scrollTo({ top: 0, behavior: "instant" });
  if (!opts.skipScrollTop) {
    _scrollToAllListingsBtn();
  }
  return true;
}

// Scrolls the page so the "← All listings" button is flush with the bottom
// of the viewport. Retries after a short delay to handle images loading and
// reflowing the layout (same pattern as restoreIndexScroll).
function _scrollToAllListingsBtn() {
  function attempt() {
    // The button is inside #productContent, rendered by renderProductPage.
    // We look for the .btn-secondary inside .product-detail-actions.
    const actionsEl = document.querySelector("#productContent .product-detail-actions");
    if (!actionsEl) return false;
    const rect = actionsEl.getBoundingClientRect();
    // Bottom of the actions block relative to the page
    const actionsBottom = window.scrollY + rect.bottom;
    // We want actionsBottom to equal window.innerHeight from the top of the page,
    // i.e. scroll so that actions bottom aligns with viewport bottom.
    const target = actionsBottom - window.innerHeight;
    if (target > 0) {
      window.scrollTo({ top: target, behavior: "instant" });
    }
    return true;
  }

  // First attempt — content may already be rendered
  if (!attempt()) {
    // Content not yet in DOM; wait a frame
    requestAnimationFrame(() => { attempt(); });
  }
  // Second pass after images/fonts settle
  setTimeout(attempt, 150);
  setTimeout(attempt, 400);
}

function showGridView(opts) {
  opts = opts || {};
  if (!isIndexDocument) return false;
  document.body.classList.remove("showing-product");
  if (!opts.skipPush) {
    history.pushState({ retroStationView: "grid" }, "", "index.html");
  }
  // "← All listings" always returns to the very top of the page so the
  // customer sees the hero / full product grid from the start.
  window.scrollTo({ top: 0, behavior: "instant" });
  if (typeof restoreIndexScroll === "function") restoreIndexScroll();
  return true;
}

window.addEventListener("popstate", (e) => {
  if (!isIndexDocument) return;
  const state = e.state;
  if (state && state.retroStationView === "product" && state.id) {
    showProductView(state.id, { skipPush: true });
  } else {
    showGridView({ skipPush: true });
  }
});

// ---------- SCROLL MEMORY (index.html ⇄ product.html) ----------
// Remembers exactly which product card the person was looking at, so
// "← All listings" can scroll back to that exact card — not a raw pixel
// offset. A pixel offset drifts because card images (especially admin
// photos, which are large base64 data-URIs) finish loading and decoding
// at different times, reflowing the grid; anchoring to the actual card
// element sidesteps that entirely.
const SCROLL_MEMORY_KEY = "retrostation_index_scroll_anchor_v2";

function rememberIndexScroll(productId) {
  try {
    sessionStorage.setItem(SCROLL_MEMORY_KEY, JSON.stringify({ id: productId || null, y: window.scrollY }));
  } catch (e) { /* ignore */ }
}

// NOTE: this used to be memoized behind a "read once per page load" guard.
// Because this is a single-document SPA (product ⇄ grid swaps happen via
// pushState, never a real reload), that guard meant sessionStorage was only
// ever consulted on the very first call in the whole session — every later
// "← All listings" tap re-used that same first result (often null once the
// first read had nothing to restore), so after the first product visit the
// page silently stopped returning to the correct card at all. Read fresh
// from sessionStorage on every call instead, so every return-to-grid uses
// the anchor that was just written for THAT product.
function readScrollAnchor() {
  try {
    const raw = sessionStorage.getItem(SCROLL_MEMORY_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(SCROLL_MEMORY_KEY);
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function restoreIndexScroll() {
  const anchor = readScrollAnchor();
  if (!anchor) return;

  function applyAnchor() {
    if (anchor.id) {
      const cardEl = document.getElementById(`card-${anchor.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ block: "center", inline: "nearest" });
        return true;
      }
    }
    if (anchor.y > 0) window.scrollTo(0, anchor.y);
    return false;
  }

  applyAnchor();

  // Images (especially large admin photos) can finish decoding after this
  // first pass and shift the grid's layout, drifting the page away from
  // the card. Re-apply the anchor once images currently in the viewport
  // area have settled, and once more after a short delay as a safety net.
  const imgs = Array.from(document.querySelectorAll(".product-grid img"));
  let remaining = imgs.filter(img => !img.complete).length;
  if (remaining > 0) {
    imgs.forEach(img => {
      if (img.complete) return;
      const onDone = () => {
        remaining--;
        if (remaining <= 0) applyAnchor();
      };
      img.addEventListener("load", onDone, { once: true });
      img.addEventListener("error", onDone, { once: true });
    });
  }
  // Belt-and-suspenders: one more pass shortly after, in case something
  // else (fonts, late reflow) shifted things.
  setTimeout(applyAnchor, 300);
}

// Intercepts clicks on product links and routes them in-page instead of
// letting the browser navigate to product.html — this is what actually
// removes the reload/blink, not just hides it with a CSS fade.
function wireSmoothNav() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) return;

    // Product card / title links → in-page swap
    const productMatch = /^product\.html\?id=([^&]+)/.exec(href);
    if (productMatch && isIndexDocument) {
      e.preventDefault();
      const id = decodeURIComponent(productMatch[1]);
      rememberIndexScroll(id);
      showProductView(id);
      return;
    }

    // "All listings" / breadcrumb / logo links back to index.html → in-page swap
    if (href === "index.html" && isIndexDocument && document.body.classList.contains("showing-product")) {
      e.preventDefault();
      showGridView();
      return;
    }
  }, { capture: true });
}

// product.html immediately redirects into index.html (see the redirect
// script at the top of product.html), so in practice this branch only
// ever runs in that brief instant before the redirect fires, or if JS
// is disabled and the redirect script itself didn't run. Kept as a
// harmless safety net, not load-bearing for the normal flow.
if (!isIndexDocument) {
  let hasViewTransitionSupport = false;
  try {
    hasViewTransitionSupport = CSS.supports("selector(::view-transition-old(root))");
  } catch (e) { /* very old browser — CSS.supports selector() syntax itself unsupported */ }

  if (!hasViewTransitionSupport) {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.classList.add("page-fade-fallback");
    });
  }
}

// ---------- ICONS ----------

const ICONS = {
  switch:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="6" height="12" rx="2"/><rect x="16" y="6" width="6" height="12" rx="2"/><rect x="8" y="4" width="8" height="16" rx="1"/><circle cx="5" cy="10" r="0.8" fill="currentColor"/><circle cx="19" cy="14" r="0.8" fill="currentColor"/></svg>`,
  console:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="9" width="18" height="7" rx="2"/><circle cx="7" cy="12.5" r="1"/><circle cx="10" cy="12.5" r="1"/><line x1="15" y1="11" x2="17" y2="11"/><line x1="15" y1="14" x2="17" y2="14"/></svg>`,
  handheld: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="10" height="8" rx="1"/><circle cx="9" cy="17.5" r="1"/><circle cx="15" cy="17.5" r="1"/></svg>`,
  game:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>`,
  laptop:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="11" rx="1"/><path d="M2 19h20l-2-3H4l-2 3z"/></svg>`,
  sold:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="7" y1="7" x2="17" y2="17"/></svg>`,
  phone:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="12" cy="18" r="1" fill="currentColor"/><line x1="9" y1="5" x2="15" y2="5"/></svg>`
};

// ---------- DATA HELPERS ----------

function allLists() {
  return [INVENTORY.switches, INVENTORY.games, INVENTORY.consoles, INVENTORY.laptops, INVENTORY.phones];
}

function findItemById(id) {
  for (const list of allLists()) {
    const found = list.find(i => i.id === id);
    if (found) return found;
  }
  return null;
}

// ---------- SOLD STATE PERSISTENCE ----------
// Actual save/load handled by firebase.js

function loadSoldState() { /* firebase.js handles this */ }
function saveSoldState()  { /* firebase.js handles this */ }

function toggleSold(id) {
  const item = findItemById(id);
  if (!item) return;
  item.sold = !item.sold;
  if (typeof window.fbSaveSoldState === "function") window.fbSaveSoldState();
  if (typeof renderAll === "function") renderAll();
  if (typeof renderProductPage === "function") renderProductPage();
}

function deleteProduct(id) {
  if (window.fbInventoryReady === false) {
    alert("Still syncing with the live database — please wait a couple of seconds and try again.");
    return;
  }
  if (!confirm("Permanently delete this product? This cannot be undone.")) return;
  let deleted = false;
  ["switches","games","consoles","laptops","phones"].forEach(cat => {
    const idx = (INVENTORY[cat] || []).findIndex(i => i.id === id);
    if (idx !== -1) { INVENTORY[cat].splice(idx, 1); deleted = true; }
  });
  if (!deleted) return;
  if (typeof window.fbSaveInventory === "function") {
    window.fbSaveInventory(() => {
      if (typeof renderAll === "function") renderAll();
      renderAdminDeleteList();
    }, [id]);
  } else {
    if (typeof renderAll === "function") renderAll();
    renderAdminDeleteList();
  }
}

// ---------- CART PERSISTENCE ----------

function saveCartState() {
  try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); }
  catch (e) { console.warn("Could not save cart:", e); }
}

function loadCartState() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    cart = JSON.parse(raw) || [];
  } catch (e) { console.warn("Could not load cart:", e); }
}

// ---------- PRODUCT CARD (index page) ----------

let cardEnterIndex = 0;

function renderProductCard(item) {
  const soldClass = item.sold ? "is-sold" : "";
  const icon = ICONS[item.icon] || ICONS.console;

  const imgStyle = item.sold
    ? `width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(100%);`
    : `width:100%;height:100%;object-fit:cover;display:block;`;

  const mediaHtml = item.image
    ? `<img src="${item.image}" alt="${item.name}" loading="lazy" style="${imgStyle}" onerror="this.style.display='none'">`
    : icon;

  let priceActionHtml = "";
  if (item.sold) {
    priceActionHtml = `<span class="badge badge-lg badge-danger">Sold</span>`;
  } else {
    const inCart = cart.some(l => l.sourceId === item.id);
    priceActionHtml = `<button class="btn btn-brand btn-sm" data-cart-id="${item.id}" onclick="startAddToCart('${item.id}', event)"${inCart ? ' disabled style="opacity:0.7;"' : ""}>${inCart ? "✓ In cart" : "Add to cart"}</button>`;
  }

  let adminHtml = "";
  if (adminMode) {
    adminHtml = `<button class="admin-item-toggle ${item.sold ? 'is-sold' : ''}" onclick="event.stopPropagation(); toggleSold('${item.id}')">
      ${item.sold ? "Mark available" : "Mark sold"}
    </button>`;
  }

  const specsHtml = (item.specs || [])
    .map(s => `<span class="badge badge-default badge-gray">${s}</span>`)
    .join("");

  const showConditionOnCard = item.icon !== "game" && item.condition;

  return `
    <div class="card card-enter ${soldClass}" id="card-${item.id}" style="--card-i:${(typeof cardEnterIndex !== "undefined" ? cardEnterIndex++ % 6 : 0)}">
      <a class="card-media-link" href="product.html?id=${item.id}" aria-label="View ${item.name}">
        <div class="card-media ${item.image ? 'has-photo' : ''}">
          ${mediaHtml}
          ${item.sold ? `<div class="sold-overlay"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"><line x1="0" y1="0" x2="100" y2="100" stroke="#CC0C39" stroke-width="3" vector-effect="non-scaling-stroke"/><line x1="100" y1="0" x2="0" y2="100" stroke="#CC0C39" stroke-width="3" vector-effect="non-scaling-stroke"/></svg><span class="badge badge-lg badge-danger">Sold</span></div>` : ""}
        </div>
      </a>
      <div class="card-body">
        <span class="card-sku">${item.id}</span>
        <a href="product.html?id=${item.id}" class="card-title-link">
          <h3 class="card-title">${item.name}</h3>
        </a>
        ${showConditionOnCard ? `<span class="card-condition-badge stamp-in condition-${(item.condition||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}">${item.condition}</span>` : ""}
        ${specsHtml ? `<div class="card-specs">${specsHtml}</div>` : ""}
        <div class="card-price-row">
          <span class="card-price"><span class="currency">$</span>${item.price}</span>
          ${priceActionHtml}
        </div>
        ${adminHtml ? `<div class="card-admin">${adminHtml}</div>` : ""}
      </div>
    </div>
  `;
}

// ---------- CONTROLLER + GAME ADDON MODAL ----------

let pendingSwitchId = null;

function startAddToCart(id, evt) {
  if (evt) evt.stopPropagation();
  const item = findItemById(id);
  if (!item || item.sold) return;

  // Enforce max 1 of each item
  if (cart.some(l => l.sourceId === id)) {
    showMaxOneToast();
    openDrawer();
    return;
  }

  if (item.hasControllerAddon) {
    pendingSwitchId = id;
    openSwitchAddonModal(item);
  } else {
    directAddToCart(id);
  }
}

function showMaxOneToast() {
  let toast = document.getElementById("maxOneToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "maxOneToast";
    toast.style.cssText = `
      position:fixed; bottom:24px; left:50%;
      background:var(--dark); color:var(--white);
      font-family:"Rimouski",sans-serif; font-size:13px; font-weight:500;
      padding:10px 18px; border-radius:var(--radius-base);
      box-shadow:var(--shadow-lg); z-index:9999;
      pointer-events:none; white-space:nowrap;
      transform:translateX(-50%) translateY(8px); opacity:0;
      transition:transform 220ms cubic-bezier(0.215,0.61,0.355,1), opacity 200ms ease-out;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = "Only 1 of each item allowed";
  // Retrigger-safe: read the current frame before re-animating in.
  toast.style.transform = "translateX(-50%) translateY(8px)";
  toast.style.opacity = "0";
  void toast.offsetWidth;
  toast.style.transform = "translateX(-50%) translateY(0)";
  toast.style.opacity = "1";

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(8px)";
    toast.style.opacity = "0";
  }, 2200);
}

// ---------- SWITCH ADDON MODAL (controllers + games) ----------

function openSwitchAddonModal(item) {
  const pro   = INVENTORY.controllerAddons.pro;
  const wired = INVENTORY.controllerAddons.wired;
  const editionOptions = pro.editions.map(e => `<option value="${e}">${e}</option>`).join("");

  document.getElementById("controllerModalItemName").textContent = item.name;
  document.getElementById("controllerModalProEditions").innerHTML = editionOptions;
  document.getElementById("controllerModalProPrice").textContent  = `+$${pro.price}`;
  document.getElementById("controllerModalWiredPrice").textContent = `+$${wired.price}`;

  // Populate game add-ons section
  const gamesSection = document.getElementById("controllerModalGamesSection");
  if (gamesSection) {
    const availableGames = INVENTORY.games.filter(g => !g.sold);
    gamesSection.innerHTML = availableGames.map(g => `
      <label class="game-addon-row">
        <input type="checkbox" class="game-addon-check" value="${g.id}" data-price="${g.price}" data-name="${g.name}">
        <span class="game-addon-label">${g.name}</span>
        <span class="game-addon-price">+$${g.price}</span>
      </label>
    `).join("");
  }

  updateGamesConfirmButton();
  document.getElementById("controllerModalOverlay").classList.add("open");
}

function updateGamesConfirmButton() {
  const btn = document.getElementById("controllerModalGamesConfirm");
  if (!btn) return;
  const checkedCount = document.querySelectorAll(".game-addon-check:checked").length;
  btn.disabled = checkedCount === 0;
  btn.textContent = checkedCount === 0
    ? "Add to order"
    : `Add to order (${checkedCount} game${checkedCount > 1 ? "s" : ""})`;
}

function closeControllerModal() {
  document.getElementById("controllerModalOverlay").classList.remove("open");
  pendingSwitchId = null;
}

// Delegated listener so dynamically-injected game checkboxes stay in sync
document.addEventListener("change", (e) => {
  if (e.target.classList && e.target.classList.contains("game-addon-check")) {
    updateGamesConfirmButton();
  }
});

function confirmNoAddon() {
  // Uncheck any selected games so "No thanks" never silently adds them
  document.querySelectorAll(".game-addon-check:checked").forEach(cb => { cb.checked = false; });
  confirmControllerChoice("none");
}

function confirmControllerChoice(type) {
  const id = pendingSwitchId;
  closeControllerModal();
  if (!id) return;

  const item = findItemById(id);
  if (!item || item.sold) return;

  // Main Switch item
  cart.push({
    lineId: `${id}-${Date.now()}`,
    sourceId: id,
    name: item.name,
    price: item.price,
    meta: ""
  });

  // Controller add-on
  if (type === "pro") {
    const editionSelect = document.getElementById("controllerModalProEditions");
    const edition = editionSelect ? editionSelect.value : "";
    const pro = INVENTORY.controllerAddons.pro;
    cart.push({
      lineId: `addon-pro-${id}-${Date.now()}`,
      sourceId: `addon-pro-${id}`,
      name: `Pro Controller — ${edition}`,
      price: pro.price,
      meta: `Add-on with ${item.name}`
    });
  } else if (type === "wired") {
    const wired = INVENTORY.controllerAddons.wired;
    cart.push({
      lineId: `addon-wired-${id}-${Date.now()}`,
      sourceId: `addon-wired-${id}`,
      name: wired.label,
      price: wired.price,
      meta: `Add-on with ${item.name}`
    });
  }

  // Game add-ons
  const checked = document.querySelectorAll(".game-addon-check:checked");
  checked.forEach(cb => {
    cart.push({
      lineId: `addon-game-${cb.value}-${Date.now()}`,
      sourceId: `addon-game-${cb.value}`,
      name: cb.dataset.name,
      price: parseInt(cb.dataset.price),
      meta: `Game add-on with ${item.name}`
    });
  });

  saveCartState();
  renderCart();
  updateAddToCartButtons();
  openDrawer();
}

function directAddToCart(id) {
  const item = findItemById(id);
  if (!item || item.sold) return;
  if (cart.some(l => l.sourceId === id)) {
    showMaxOneToast();
    openDrawer();
    return;
  }
  cart.push({ lineId: `${id}-${Date.now()}`, sourceId: id, name: item.name, price: item.price, meta: "" });
  saveCartState();
  renderCart();
  updateAddToCartButtons();
  openDrawer();
}

// ---------- CART ----------

function removeFromCart(lineId) {
  const row = document.querySelector(`.cart-line[data-line-id="${lineId}"]`);
  const doRemove = () => {
    cart = cart.filter(line => line.lineId !== lineId);
    saveCartState();
    renderCart();
    updateAddToCartButtons();
  };

  if (!row || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    doRemove();
    return;
  }

  // Collapse the row's own box (height/margin) while fading + sliding its
  // content — layout props are confined to a single short-lived element
  // being removed from the DOM, not animated on an ongoing basis.
  row.style.overflow = "hidden";
  row.style.transition = "height 180ms cubic-bezier(0.4,0,0.2,1), padding 180ms cubic-bezier(0.4,0,0.2,1), opacity 140ms ease-out";
  row.style.height = `${row.offsetHeight}px`;
  row.style.opacity = "1";
  void row.offsetHeight;
  requestAnimationFrame(() => {
    row.style.height = "0px";
    row.style.paddingTop = "0px";
    row.style.paddingBottom = "0px";
    row.style.opacity = "0";
  });
  row.addEventListener("transitionend", doRemove, { once: true });
}

function cartSubtotal() {
  return cart.reduce((sum, line) => sum + line.price, 0);
}

// Update all "Add to cart" / "In cart" buttons to reflect cart state
function updateAddToCartButtons() {
  const inCartIds = new Set(cart.map(l => l.sourceId));
  document.querySelectorAll("[data-cart-id]").forEach(btn => {
    const id = btn.dataset.cartId;
    if (inCartIds.has(id)) {
      btn.textContent = "✓ In cart";
      btn.disabled = true;
      btn.style.opacity = "0.7";
    } else {
      btn.textContent = "Add to cart";
      btn.disabled = false;
      btn.style.opacity = "";
    }
  });

  // product.html detail action button
  const detailBtn = document.getElementById("detailAddBtn");
  if (detailBtn) {
    const pid = detailBtn.dataset.cartId;
    if (pid && inCartIds.has(pid)) {
      detailBtn.innerHTML = `<span class="qty-pill">1</span> ✓ In cart`;
      detailBtn.disabled = true;
      detailBtn.style.opacity = "0.75";
    } else if (pid) {
      const item = findItemById(pid);
      detailBtn.innerHTML = `<span class="qty-pill">+</span> Add to cart — $${item ? item.price : ""}`;
      detailBtn.disabled = false;
      detailBtn.style.opacity = "";
    }
  }
}

function renderCart() {
  const body    = document.getElementById("drawerBody");
  const foot    = document.getElementById("drawerFoot");
  const countEl = document.getElementById("cartCount");
  if (!body) return;

  const total_items = cart.length;
  const prevCount = parseInt(countEl.textContent, 10) || 0;
  countEl.textContent    = total_items;
  countEl.style.display  = total_items === 0 ? "none" : "flex";

  // Feedback pulse only on increase — removal already has its own exit animation.
  if (total_items > prevCount) {
    countEl.classList.remove("bump");
    // Force reflow so the animation can retrigger if it fires again quickly.
    void countEl.offsetWidth;
    countEl.classList.add("bump");
    clearTimeout(countEl._bumpTimer);
    countEl._bumpTimer = setTimeout(() => countEl.classList.remove("bump"), 180);
  }

  if (total_items === 0) {
    body.innerHTML = `<div class="drawer-empty">Your cart is empty.<br>Browse the inventory and add something.</div>`;
    foot.style.display = "none";
    return;
  }

  body.innerHTML = cart.map(line => `
    <div class="cart-line" data-line-id="${line.lineId}">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="cart-qty-badge">1</span>
          <div class="cart-line-name">${line.name}</div>
        </div>
        ${line.meta ? `<div class="cart-line-meta">${line.meta}</div>` : ""}
        <button class="cart-line-remove" onclick="removeFromCart('${line.lineId}')">Remove</button>
      </div>
      <div class="cart-line-price">$${line.price}</div>
    </div>
  `).join("");

  foot.style.display = "block";
  const subtotal = cartSubtotal();
  const total    = subtotal + DELIVERY_FEE;
  document.getElementById("subtotalVal").textContent = `$${subtotal}`;
  document.getElementById("totalVal").textContent    = `$${total}`;
  // Sync both modal totals
  const modalTotal    = document.getElementById("modalTotal");
  const modalTotalCOD = document.getElementById("modalTotalCOD");
  if (modalTotal)    modalTotal.textContent    = `$${total}`;
  if (modalTotalCOD) modalTotalCOD.textContent = `$${total}`;

  // Whish logo row (index.html cart has it, product.html might not)
  const whishRow = document.getElementById("whishLogoRow");
  if (whishRow) whishRow.style.display = "flex";
}

// ---------- DRAWER ----------

function openDrawer() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("overlay").classList.add("open");
}
function closeDrawer() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("overlay").classList.remove("open");
}

// ---------- CHECKOUT MODAL ----------

function openCheckout() {
  if (cart.length === 0) return;
  const total = cartSubtotal() + DELIVERY_FEE;
  document.getElementById("modalTotal").textContent = `$${total}`;
  // Default to Cash on Delivery
  selectPaymentMethod("cod");
  document.getElementById("modalOverlay").classList.add("open");
}

function selectPaymentMethod(method) {
  const whishBtn = document.getElementById("payMethodWhish");
  const codBtn   = document.getElementById("payMethodCOD");
  const whishSection = document.getElementById("whishPaySection");
  const codSection   = document.getElementById("codPaySection");
  if (!whishBtn) return;

  if (method === "whish") {
    whishBtn.classList.add("active");
    codBtn.classList.remove("active");
    whishSection.style.display = "";
    codSection.style.display   = "none";
  } else {
    codBtn.classList.add("active");
    whishBtn.classList.remove("active");
    whishSection.style.display = "none";
    codSection.style.display   = "";
  }
  whishBtn.dataset.selected = method === "whish" ? "true" : "false";
}
function closeCheckout() {
  document.getElementById("modalOverlay").classList.remove("open");
}

function buildWhatsAppMessage() {
  const name    = document.getElementById("custName").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const subtotal = cartSubtotal();
  const total    = subtotal + DELIVERY_FEE;

  const whishBtn = document.getElementById("payMethodWhish");
  const isCOD = whishBtn && whishBtn.dataset.selected !== "true";

  let lines = [];
  lines.push("Order from RetroStation website:");
  lines.push("");
  cart.forEach(line => {
    lines.push(`- ${line.name} ($${line.price})${line.meta ? " [" + line.meta + "]" : ""}`);
  });
  lines.push("");
  lines.push(`Subtotal: $${subtotal}`);
  lines.push(`Delivery: $${DELIVERY_FEE}`);
  lines.push(`Total: $${total}`);
  lines.push("");
  lines.push(`Payment method: ${isCOD ? "Cash on Delivery" : "Whish Money"}`);
  lines.push("");
  if (name)    lines.push(`Name: ${name}`);
  if (address) lines.push(`Address: ${address}`);

  return encodeURIComponent(lines.join("\n"));
}

function sendOrderToWhatsApp() {
  const message = buildWhatsAppMessage();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
}

// ---------- LOGO: never navigates/refreshes; triple-press opens admin login ----------

let logoPressCount = 0;
let logoPressTimer = null;

function wireLogoPress() {
  const brandMarkEl = document.querySelector(".brand-mark");
  if (!brandMarkEl) return;

  brandMarkEl.addEventListener("click", (e) => {
    // Always block default link behaviour — the logo must never navigate or refresh.
    e.preventDefault();
    e.stopPropagation();

    logoPressCount++;
    if (logoPressTimer) clearTimeout(logoPressTimer);

    if (logoPressCount >= 3) {
      logoPressCount = 0;
      showLoginBox();
      return;
    }
    logoPressTimer = setTimeout(() => { logoPressCount = 0; }, 700);

    // Single/double press: reset filters & go to top, only if those controls exist on this page.
    if (typeof searchInput !== "undefined" && searchInput)       searchInput.value = "";
    if (typeof navSearchInput !== "undefined" && navSearchInput) navSearchInput.value = "";
    if (typeof appliedSearchQuery !== "undefined") appliedSearchQuery = "";
    if (typeof setCategory === "function")      setCategory("all");
    if (typeof updateNavActive === "function")  updateNavActive("all");
    if (typeof priceFromEl !== "undefined" && priceFromEl) priceFromEl.value = "";
    if (typeof priceToEl   !== "undefined" && priceToEl)   priceToEl.value   = "";
    if (typeof appliedPriceFrom !== "undefined") appliedPriceFrom = null;
    if (typeof appliedPriceTo   !== "undefined") appliedPriceTo   = null;
    if (typeof availabilityFilter !== "undefined") availabilityFilter = "all";
    const allRadio = document.querySelector('input[name="availability"][value="all"]');
    if (allRadio) allRadio.checked = true;
    if (typeof closeNav === "function")         closeNav();
    if (typeof closeFilterDrawer === "function") closeFilterDrawer();

    // If currently viewing a product, the logo should bring us back to
    // the grid (same as tapping "All listings") before resetting filters.
    if (typeof isIndexDocument !== "undefined" && isIndexDocument &&
        document.body.classList.contains("showing-product")) {
      showGridView();
    }

    if (typeof renderAll === "function") renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ---------- ADMIN ----------

function showLoginBox() { document.getElementById("loginBox").classList.add("open"); }
function hideLoginBox() { document.getElementById("loginBox").classList.remove("open"); }

function attemptAdminLogin() {
  const val = document.getElementById("adminPass").value;
  if (val === ADMIN_CODE) {
    adminMode = true;
    hideLoginBox();
    document.getElementById("adminPass").value = "";
    if (typeof renderAll === "function") renderAll();
    if (typeof renderProductPage === "function") renderProductPage();
  } else {
    alert("Wrong code.");
  }
}

function exitAdmin() {
  adminMode = false;
  if (typeof renderAll === "function") renderAll();
  if (typeof renderProductPage === "function") renderProductPage();
}

// ---------- COMMON EVENT WIRING ----------

// ============================================================
// LOGO — the site is dark-mode only now, so the logo always uses the
// original (white text + cyan accents) file. This function is kept as
// a no-op-safe stub since wireCommonUI() still calls it.
// ============================================================

const LOGO_SRC_DARK = "assets/retrostation-logo.png";

function updateLogoSrcs() {
  document.querySelectorAll(".logo-img, .nav-drawer-logo, .footer-logo").forEach(img => {
    if (img.getAttribute("src") !== LOGO_SRC_DARK) img.setAttribute("src", LOGO_SRC_DARK);
  });
}

function wireCommonUI() {
  initTopTicker();
  initBgVideo();
  initHeroCarousel();
  initCrtOverlay();
  updateLogoSrcs();
  loadCartState();
  renderCart();
  wireSmoothNav();

  document.getElementById("cartOpenBtn").addEventListener("click", openDrawer);
  document.getElementById("drawerCloseBtn").addEventListener("click", closeDrawer);
  document.getElementById("overlay").addEventListener("click", closeDrawer);
  document.getElementById("checkoutBtn").addEventListener("click", openCheckout);
  document.getElementById("modalCloseBtn").addEventListener("click", closeCheckout);
  document.getElementById("waSendBtn").addEventListener("click", sendOrderToWhatsApp);

  document.getElementById("adminToggleBtn").addEventListener("click", () => {
    const box = document.getElementById("loginBox");
    box.classList.contains("open") ? hideLoginBox() : showLoginBox();
  });
  document.getElementById("adminLoginBtn").addEventListener("click", attemptAdminLogin);
  document.getElementById("adminPass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptAdminLogin();
  });
  document.getElementById("adminExitBtn").addEventListener("click", exitAdmin);

  const loginBoxCloseBtn = document.getElementById("loginBoxCloseBtn");
  if (loginBoxCloseBtn) loginBoxCloseBtn.addEventListener("click", hideLoginBox);

  // Triple-press the logo to reveal the admin login box is wired in index.html
  // (alongside the existing "reset filters" logo handler) to avoid double-binding.

  document.getElementById("controllerModalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("controllerModalOverlay")) closeControllerModal();
  });
}

// ============================================================
// INDEX PAGE LOGIC
// ============================================================

let activeCategory = "all";

// Category keys → the human-readable label shown in the UI, so a search
// for "switch" or "phones" can match the category itself, not just
// individual product names.
const CATEGORY_LABELS = {
  switches: "Nintendo Switch",
  games:    "Switch Games",
  consoles: "Handhelds & Consoles",
  laptops:  "Laptops",
  phones:   "Phones"
};

function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll(".cat-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  renderAll();
}

// Score tiers, highest wins. Product name is checked before anything else
// so "switch" matching ten Switch Games by category never outranks an
// actual product named "Switch", and a search is judged by what it most
// specifically matched.
//   4 — product name
//   3 — product id / SKU
//   2 — category name (e.g. "phones", "laptops")
//   1 — description / specs (fallback full-text match)
//   0 — no match
function searchScore(item, query, categoryKey) {
  if (!query) return 1;
  const name     = (item.name  || "").toLowerCase();
  const id       = (item.id    || "").toLowerCase();
  const desc     = (item.description || "").toLowerCase();
  const specs    = (item.specs || []).join(" ").toLowerCase();
  const catLabel = (CATEGORY_LABELS[categoryKey] || "").toLowerCase();

  if (name.includes(query))                          return 4;
  if (id.includes(query))                             return 3;
  if (catLabel && catLabel.includes(query))            return 2;
  if (desc.includes(query) || specs.includes(query))   return 1;
  return 0;
}

function renderAll() {
  const adminBar = document.getElementById("adminBar");
  if (adminBar) adminBar.classList.toggle("open", adminMode);

  const query    = (typeof getSearchQuery === "function") ? getSearchQuery() : "";
  const priceRange = (typeof getPriceRange === "function") ? getPriceRange() : { from: null, to: null };
  const availability = (typeof getAvailabilityFilter === "function") ? getAvailabilityFilter() : "all";

  const SECTIONS = [
    { key: "switches", items: INVENTORY.switches,  gridId: "switchList",  sectionId: "section-switches", renderFn: renderProductCard },
    { key: "games",    items: INVENTORY.games,      gridId: "gamesGrid",   sectionId: "section-games",    renderFn: renderProductCard },
    { key: "consoles", items: INVENTORY.consoles,   gridId: "consoleList", sectionId: "section-consoles", renderFn: renderProductCard },
    { key: "laptops",  items: INVENTORY.laptops,    gridId: "laptopList",  sectionId: "section-laptops",  renderFn: renderProductCard },
    { key: "phones",   items: INVENTORY.phones,     gridId: "phoneList",   sectionId: "section-phones",   renderFn: renderProductCard },
  ];

  let orderedSections = [...SECTIONS];
  if (query) {
    orderedSections = orderedSections.map(sec => {
      const bestScore = sec.items.reduce((best, item) => Math.max(best, searchScore(item, query, sec.key)), 0);
      return { ...sec, bestScore };
    }).sort((a, b) => b.bestScore - a.bestScore);
  }

  const sectionEls = {};
  SECTIONS.forEach(sec => {
    const el = document.getElementById(sec.sectionId);
    if (el) sectionEls[sec.key] = el;
  });

  if (query) {
    const firstSection = document.getElementById(SECTIONS[0].sectionId);
    if (firstSection && firstSection.parentNode) {
      orderedSections.forEach(sec => {
        const el = sectionEls[sec.key];
        if (el) firstSection.parentNode.insertBefore(el, firstSection);
      });
    }
  } else {
    const firstSection = document.getElementById(SECTIONS[0].sectionId);
    if (firstSection && firstSection.parentNode) {
      SECTIONS.forEach(sec => {
        const el = sectionEls[sec.key];
        if (el) firstSection.parentNode.appendChild(el);
      });
    }
  }

  let grandTotal = 0;

  orderedSections.forEach(sec => {
    const gridEl    = document.getElementById(sec.gridId);
    const sectionEl = document.getElementById(sec.sectionId);
    if (!gridEl) return;

    if (activeCategory !== "all" && activeCategory !== sec.key) {
      if (sectionEl) sectionEl.style.display = "none";
      return;
    }

    let filtered = sec.items.filter(item => {
      const matchPrice  = (priceRange.from == null || item.price >= priceRange.from) &&
                           (priceRange.to   == null || item.price <= priceRange.to);
      const matchAvail  = availability === "all" ||
                           (availability === "in-stock"     && !item.sold) ||
                           (availability === "out-of-stock" &&  item.sold);
      const score       = searchScore(item, query, sec.key);
      const matchSearch = !query || score > 0;
      return matchPrice && matchAvail && matchSearch;
    });

    // Available items first, sold items always pushed below available
    // ones. While searching, items are additionally ranked by how they
    // matched — product name beats category name beats description —
    // before price breaks ties within the same tier; with no active
    // search, price-descending is the only ordering.
    filtered = filtered.slice().sort((a, b) => {
      if (a.sold !== b.sold) return a.sold ? 1 : -1;
      if (query) {
        const scoreA = searchScore(a, query, sec.key);
        const scoreB = searchScore(b, query, sec.key);
        if (scoreA !== scoreB) return scoreB - scoreA;
      }
      return b.price - a.price;
    });

    if (filtered.length === 0 && (query || availability !== "all" || priceRange.from != null || priceRange.to != null)) {
      if (sectionEl) sectionEl.style.display = "none";
      return;
    }

    if (sectionEl) sectionEl.style.display = "";

    if (filtered.length === 0) {
      gridEl.innerHTML = `<div class="no-results">No listings match your search.</div>`;
    } else {
      cardEnterIndex = 0;
      gridEl.innerHTML = filtered.map(sec.renderFn).join("");
      // Force the .card-enter starting state to paint, then strip it next
      // frame so the transition actually runs (instead of snapping in).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          gridEl.querySelectorAll(".card-enter").forEach(c => c.classList.remove("card-enter"));
        });
      });
    }

    grandTotal += filtered.length;

    const countEl = sectionEl && sectionEl.querySelector(".count");
    if (countEl) {
      const avail = filtered.filter(i => !i.sold).length;
      countEl.textContent = `${avail} of ${filtered.length} available`;
    }
  });

  // Update the top count-bar total ("X products"), and the drawer's count line
  const totalLabel = `${grandTotal} product${grandTotal === 1 ? "" : "s"}`;
  const countBarTotalEl = document.getElementById("countBarTotal");
  if (countBarTotalEl) countBarTotalEl.textContent = totalLabel;
  const filterDrawerCountEl = document.getElementById("filterDrawerCount");
  if (filterDrawerCountEl) filterDrawerCountEl.textContent = totalLabel;

  if (typeof updateAddToCartButtons === "function") updateAddToCartButtons();
}

// ============================================================
// PRODUCT DETAIL PAGE LOGIC
// ============================================================

function renderProductPage(explicitId) {
  const params    = new URLSearchParams(window.location.search);
  const id        = explicitId || params.get("id");
  const container = document.getElementById("productContent");
  const adminBar  = document.getElementById("adminBar");

  if (!container) return;
  if (adminBar) adminBar.classList.toggle("open", adminMode);

  const item = id ? findItemById(id) : null;

  if (!item) {
    // Before the live database has confirmed anything, show a neutral
    // loading state rather than a false "not found" for a brand-new product.
    const stillLoading = (typeof window.fbInventoryReady !== "undefined") && window.fbInventoryReady === false;
    if (stillLoading) {
      container.innerHTML = `<div class="not-found"><p>Loading…</p></div>`;
      return;
    }
    const knownIds = allLists().flat().map(i => i.id).join(", ") || "(none loaded)";
    container.innerHTML = `
      <div class="not-found">
        <p>Product not found.</p>
        <p style="font-size:12px;color:#888;margin-top:8px;word-break:break-all;">
          Looking for: <strong>${id || "(no id in link)"}</strong><br>
          Currently loaded IDs: ${knownIds}
        </p>
        <a href="index.html" class="btn btn-brand btn-base">← Back to all listings</a>
      </div>`;
    return;
  }

  document.title = `${item.name} — RetroStation`;
  const breadcrumbEl = document.getElementById("breadcrumbName");
  if (breadcrumbEl) breadcrumbEl.textContent = item.name;

  const icon = ICONS[item.icon] || ICONS.console;
  const detailImgStyle = item.sold
    ? `width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(100%);`
    : `width:100%;height:100%;object-fit:cover;display:block;`;

  const mediaHtml = item.image
    ? `<img src="${item.image}" alt="${item.name}" style="${detailImgStyle}" onerror="this.style.display='none'">`
    : icon;

  const specsHtml = (item.specs || [])
    .map(s => `<span class="badge badge-default badge-gray">${s}</span>`)
    .join("");

  // Condition: hide for games (icon === "game")
  const conditionHtml = (item.condition && item.icon !== "game")
    ? `<span class="card-condition-badge stamp-in condition-${(item.condition||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}">${item.condition}</span>`
    : "";

  const inCart = cart.some(l => l.sourceId === item.id);

  let actionHtml = "";
  if (item.sold) {
    actionHtml = `<span class="badge badge-lg badge-danger" style="font-size:15px;padding:8px 16px;">Sold</span>`;
  } else {
    actionHtml = `
      <button
        class="btn btn-brand btn-lg"
        id="detailAddBtn"
        data-cart-id="${item.id}"
        onclick="startAddToCart('${item.id}', event)"
        ${inCart ? 'disabled style="opacity:0.75;"' : ""}
      >
        <span class="qty-pill">${inCart ? "1" : "+"}</span>
        ${inCart ? "In cart" : `Add to cart — $${item.price}`}
      </button>`;
  }

  let adminHtml = "";
  if (adminMode) {
    adminHtml = `<button class="admin-item-toggle ${item.sold ? 'is-sold' : ''}" onclick="toggleSold('${item.id}')">
      ${item.sold ? "Mark available" : "Mark sold"}
    </button>`;
  }

  container.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-detail-media ${item.image ? 'has-photo' : ''} ${item.sold ? 'is-sold' : ''}">
        ${mediaHtml}
        ${item.sold ? `<div class="sold-overlay"><svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"><line x1="0" y1="0" x2="100" y2="100" stroke="#CC0C39" stroke-width="3" vector-effect="non-scaling-stroke"/><line x1="100" y1="0" x2="0" y2="100" stroke="#CC0C39" stroke-width="3" vector-effect="non-scaling-stroke"/></svg><span class="badge badge-lg badge-danger">Sold</span></div>` : ""}
      </div>
      <div class="product-detail-info">
        <span class="card-sku">${item.id}</span>
        <h1 class="product-detail-title">${item.name}</h1>
        ${conditionHtml}
        <div class="product-detail-price"><span class="currency">$</span>${item.price}</div>
        ${item.description ? `<p class="product-detail-desc">${item.description}</p>` : ""}
        ${specsHtml ? `<div class="card-specs" style="margin-bottom:16px;">${specsHtml}</div>` : ""}
        <div class="product-detail-actions">
          ${actionHtml}
          <a href="index.html" class="btn btn-secondary btn-base">← All listings</a>
        </div>
        ${adminHtml ? `<div style="margin-top:12px;">${adminHtml}</div>` : ""}
      </div>
    </div>
  `;
}

// ============================================================
// ADMIN — ADD / DELETE PRODUCT PANEL
// Everything here only touches the in-memory INVENTORY + this
// browser's localStorage. The "Save & download data.js" button
// is what makes a change permanent for every visitor: it writes
// a fresh data.js file (photos embedded) ready to drag into GitHub.
// ============================================================

const ADMIN_CATEGORY_PREFIX = {
  switches: "SW", games: "GM", consoles: "HC", laptops: "LP", phones: "PH"
};

let apPendingImageData = null; // base64 data-URI of the chosen photo, or null

function adminNextId(category) {
  const prefix = ADMIN_CATEGORY_PREFIX[category] || "IT";
  const list = INVENTORY[category] || [];
  let maxNum = 0;
  list.forEach(item => {
    const m = /^[A-Z]+-(\d+)$/.exec(item.id || "");
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  });
  const num = String(maxNum + 1).padStart(2, "0");
  return `${prefix}-${num}`;
}

function openAdminPanel() {
  document.getElementById("adminPanelOverlay").classList.add("open");
  adminSwitchTab("add");
}
function closeAdminPanel() {
  document.getElementById("adminPanelOverlay").classList.remove("open");
}

function adminSwitchTab(tab) {
  document.getElementById("tabAdd").classList.toggle("active", tab === "add");
  document.getElementById("tabDelete").classList.toggle("active", tab === "delete");
  document.getElementById("tabEdit").classList.toggle("active", tab === "edit");
  document.getElementById("adminTabAdd").style.display    = tab === "add"    ? "" : "none";
  document.getElementById("adminTabDelete").style.display = tab === "delete" ? "" : "none";
  document.getElementById("adminTabEdit").style.display   = tab === "edit"   ? "" : "none";
  if (tab === "delete") renderAdminDeleteList();
  if (tab === "edit")   renderAdminEditProductSelect();
}

function renderAdminDeleteList() {
  const wrap = document.getElementById("adminDeleteList");
  const allItems = [];
  Object.keys(ADMIN_CATEGORY_PREFIX).forEach(cat => {
    (INVENTORY[cat] || []).forEach(item => allItems.push(item));
  });
  if (!allItems.length) {
    wrap.innerHTML = `<div class="admin-empty">No products yet.</div>`;
    return;
  }
  wrap.innerHTML = allItems.map(item => `
    <div class="admin-list-row">
      <img class="admin-list-thumb" src="${item.image || ''}" alt="" onerror="this.style.visibility='hidden'">
      <div class="admin-list-info">
        <div class="admin-list-name">${item.name}</div>
        <div class="admin-list-meta">${item.id} · $${item.price}${item.sold ? " · Sold" : ""}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
        <button class="admin-item-toggle ${item.sold ? 'is-sold' : ''}" onclick="toggleSold('${item.id}'); renderAdminDeleteList();">
          ${item.sold ? "Available" : "Mark sold"}
        </button>
        <button class="admin-item-toggle" style="background:var(--danger);color:var(--white);border-color:transparent;" onclick="deleteProduct('${item.id}');">
          Delete
        </button>
      </div>
    </div>
  `).join("");
}

// ---------- EDIT PRODUCT (admin) ----------

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let epPendingImageData = null;

function renderAdminEditProductSelect() {
  const select = document.getElementById("epProductSelect");
  if (!select) return;
  const allItems = [];
  ["switches","games","consoles","laptops","phones"].forEach(cat => {
    (INVENTORY[cat] || []).forEach(item => allItems.push(item));
  });
  const prev = select.value;
  select.innerHTML = '<option value="">— choose a product —</option>' +
    allItems.map(i => '<option value="' + escapeHtml(i.id) + '">' + escapeHtml(i.name) + ' (' + i.id + ')</option>').join("");
  if (prev && allItems.some(i => i.id === prev)) select.value = prev;
  const form = document.getElementById("epForm");
  if (select.value) {
    adminLoadProductForEdit(select.value);
  } else {
    if (form) form.style.display = "none";
  }
}

function adminLoadProductForEdit(id) {
  const item = findItemById(id);
  const form = document.getElementById("epForm");
  if (!item || !form) return;
  form.style.display = "";
  document.getElementById("epName").value        = item.name || "";
  document.getElementById("epPrice").value       = item.price != null ? item.price : "";
  document.getElementById("epCondition").value   = item.condition || "";
  document.getElementById("epDescription").value = item.description || "";
  document.getElementById("epSpecs").value       = (item.specs || []).join("\n");
  const preview = document.getElementById("epImgPreview");
  if (item.image) {
    preview.src = item.image;
    preview.classList.add("show");
  } else {
    preview.src = "";
    preview.classList.remove("show");
  }
  document.getElementById("epImgDrop").textContent = item.image ? "Tap to change photo, or drag one here" : "Tap to choose a photo, or drag one here";
  epPendingImageData = null;
  const note = document.getElementById("epSaveNote");
  if (note) note.textContent = "";
}

function adminSaveProductEdit() {
  const id = document.getElementById("epProductSelect").value;
  if (!id) { alert("Please select a product."); return; }
  const item = findItemById(id);
  if (!item) { alert("Product not found."); return; }

  const name        = document.getElementById("epName").value.trim();
  const price       = parseFloat(document.getElementById("epPrice").value);
  const condition   = document.getElementById("epCondition").value || null;
  const description = document.getElementById("epDescription").value.trim();
  const specsRaw    = document.getElementById("epSpecs").value;
  const specs       = specsRaw.split("\n").map(s => s.trim()).filter(Boolean);

  if (!name)        { alert("Please enter a product name."); return; }
  if (isNaN(price)) { alert("Please enter a valid price."); return; }

  item.name        = name;
  item.price       = price;
  item.condition   = condition;
  item.description = description;
  item.specs       = specs;
  if (epPendingImageData) item.image = epPendingImageData;

  const btn  = document.getElementById("epSaveBtn");
  const note = document.getElementById("epSaveNote");

  if (typeof window.fbSaveInventory === "function") {
    btn.disabled = true;
    btn.textContent = "Saving…";
    window.fbSaveInventory(() => {
      if (typeof renderAll === "function") renderAll();
      btn.textContent = "Saved!";
      if (note) note.textContent = "Changes live on all devices.";
      setTimeout(() => { btn.textContent = "Save changes"; btn.disabled = false; if (note) note.textContent = ""; }, 2500);
    });
  } else {
    if (typeof renderAll === "function") renderAll();
    btn.textContent = "Saved!";
    setTimeout(() => { btn.textContent = "Save changes"; }, 2500);
  }
}

function wireAdminEditImageInput() {
  const drop      = document.getElementById("epImgDrop");
  const fileInput = document.getElementById("epImgFile");
  const preview   = document.getElementById("epImgPreview");
  if (!drop) return;

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    drop.textContent = "Processing photo…";
    resizeImageForUpload(file, 1280, (dataUrl) => {
      if (!dataUrl) {
        alert("Couldn't process that photo — please try a different image.");
        drop.textContent = "Tap to change photo, or drag one here";
        return;
      }
      epPendingImageData = dataUrl;
      preview.src = dataUrl;
      preview.classList.add("show");
      drop.textContent = file.name + " — tap to change";
    });
  }

  drop.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
  ["dragenter","dragover"].forEach(evt =>
    drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.add("drag-over"); })
  );
  ["dragleave","drop"].forEach(evt =>
    drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.remove("drag-over"); })
  );
  drop.addEventListener("drop", (e) => {
    handleFile(e.dataTransfer.files && e.dataTransfer.files[0]);
  });
}

// Resizes/recompresses an image so the resulting base64 string stays safely
// under Firebase's ~1MB single-write limit, regardless of the original photo size.
function resizeImageForUpload(file, maxDimension, callback) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round(height * (maxDimension / width));
          width = maxDimension;
        } else {
          width = Math.round(width * (maxDimension / height));
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until the result is comfortably small.
      let quality = 0.85;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      while (dataUrl.length > 700000 && quality > 0.4) {
        quality -= 0.15;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }
      callback(dataUrl);
    };
    img.onerror = () => callback(null);
    img.src = reader.result;
  };
  reader.onerror = () => callback(null);
  reader.readAsDataURL(file);
}

function wireAdminImageInput() {
  const drop = document.getElementById("apImgDrop");
  const fileInput = document.getElementById("apImgFile");
  const preview = document.getElementById("apImgPreview");

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    drop.textContent = "Processing photo…";
    resizeImageForUpload(file, 1280, (dataUrl) => {
      if (!dataUrl) {
        alert("Couldn't process that photo — please try a different image.");
        drop.textContent = "Tap to choose a photo, or drag one here";
        return;
      }
      apPendingImageData = dataUrl;
      preview.src = apPendingImageData;
      preview.classList.add("show");
      drop.textContent = file.name + " — tap to change";
    });
  }

  drop.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));
  ["dragenter", "dragover"].forEach(evt =>
    drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.add("drag-over"); })
  );
  ["dragleave", "drop"].forEach(evt =>
    drop.addEventListener(evt, (e) => { e.preventDefault(); drop.classList.remove("drag-over"); })
  );
  drop.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  });
}

function resetAdminAddForm() {
  document.getElementById("apName").value = "";
  document.getElementById("apPrice").value = "";
  document.getElementById("apCondition").value = "Like New";
  document.getElementById("apCategory").value = "switches";
  document.getElementById("apDescription").value = "";
  document.getElementById("apSpecs").value = "";
  document.getElementById("apImgPreview").classList.remove("show");
  document.getElementById("apImgPreview").src = "";
  document.getElementById("apImgDrop").textContent = "Tap to choose a photo, or drag one here";
  apPendingImageData = null;
}

function adminAddProduct() {
  if (window.fbInventoryReady === false) {
    alert("Still syncing with the live database — please wait a couple of seconds and try again.");
    return;
  }

  const category  = document.getElementById("apCategory").value;
  const name      = document.getElementById("apName").value.trim();
  const price     = parseFloat(document.getElementById("apPrice").value);
  const condition = document.getElementById("apCondition").value || null;
  const description = document.getElementById("apDescription").value.trim();
  const specsRaw  = document.getElementById("apSpecs").value;
  const specs     = specsRaw.split("\n").map(s => s.trim()).filter(Boolean);

  if (!name)               { alert("Please enter a product name."); return; }
  if (isNaN(price))        { alert("Please enter a valid price."); return; }
  if (!apPendingImageData) { alert("Please add a photo."); return; }

  const iconMap = { switches:"switch", games:"game", consoles:"console", laptops:"laptop", phones:"phone" };

  const newItem = {
    id: adminNextId(category),
    name, price, condition,
    sold: false,
    icon: iconMap[category] || "switch",
    image: apPendingImageData,
    description, specs
  };

  if (!INVENTORY[category]) INVENTORY[category] = [];
  INVENTORY[category].push(newItem);

  if (typeof window.fbSaveInventory === "function") {
    window.fbSaveInventory(() => {
      if (typeof renderAll === "function") renderAll();
      renderAdminDeleteList();
      resetAdminAddForm();
      const btn = document.getElementById("apSaveBtn");
      const note = document.getElementById("apSaveNote");
      btn.textContent = "✓ Saved!";
      btn.disabled = true;
      if (note) note.textContent = "Product live on all devices.";
      setTimeout(() => { btn.textContent = "Save product"; btn.disabled = false; if (note) note.textContent = ""; }, 2500);
    });
  } else {
    if (typeof renderAll === "function") renderAll();
    renderAdminDeleteList();
    resetAdminAddForm();
  }
}

function escapeForJs(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

function wireAdminPanel() {
  const manageBtn = document.getElementById("adminManageBtn");
  if (!manageBtn) return;

  manageBtn.addEventListener("click", openAdminPanel);
  document.getElementById("adminPanelClose").addEventListener("click", closeAdminPanel);
  document.getElementById("adminPanelOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("adminPanelOverlay")) closeAdminPanel();
  });
  document.getElementById("tabAdd").addEventListener("click", () => adminSwitchTab("add"));
  document.getElementById("tabDelete").addEventListener("click", () => adminSwitchTab("delete"));
  document.getElementById("tabEdit").addEventListener("click", () => adminSwitchTab("edit"));
  document.getElementById("apSaveBtn").addEventListener("click", adminAddProduct);
  document.getElementById("apSaveBtn2").addEventListener("click", () => {
    if (typeof window.fbSaveInventory === "function") {
      window.fbSaveInventory(() => {
        window.fbSaveSoldState();
        const btn = document.getElementById("apSaveBtn2");
        const orig = btn.textContent;
        btn.textContent = "✓ Saved!";
        btn.disabled = true;
        setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2500);
      });
    }
  });

  // Edit tab — product picker + save
  const epSelect = document.getElementById("epProductSelect");
  if (epSelect) epSelect.addEventListener("change", () => adminLoadProductForEdit(epSelect.value));
  const epSaveBtn = document.getElementById("epSaveBtn");
  if (epSaveBtn) epSaveBtn.addEventListener("click", adminSaveProductEdit);

  wireAdminImageInput();
  wireAdminEditImageInput();
}

// ============================================================
// TOP NEWS TICKER — small marquee bar pinned above the header,
// on top of everything else on the site. Shared by index.html
// and product.html via wireCommonUI(). Each message's leading
// "-" is a pixel icon (from the provided sticker sheet) instead
// of a dash, cycling through the set below.
// ============================================================

const TICKER_ICONS = {
  trophy: "data:image/png;base64,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",
  rocket: "data:image/png;base64,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",
  diamond: "data:image/png;base64,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",
  flower: "data:image/png;base64,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",
  joystick: "data:image/png;base64,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",
  bomb: "data:image/png;base64,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",
  controller: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAvCAYAAABTy8xRAAARXklEQVR42t1ae3hV1ZX/rb33OffePMFAwtOQoIk8SlHbSn1U41BAQMfaQWtLy7TT1lZrC36dUdtvinZarVZq7TeP+mo/OxYB7WdRAgqWKFMrqFREIBAhCeRBnoQkN/fec87ee80f98ENJEB1ih3Pl/3l3nPPuWfv317rt35rrQv8jR3MLNasWSPxYT6WL18uAODq2dfPOrCvcScz72Dmt5h554M/+vVMAFizhs8ICOqDBGLqlOne2eUTP/La1j9hz+5auK6DS2bP/PEbl+7+j3U1eIGZBRHZD6EFsGBmemXt1jJm9j772WsNAA3A6zlyhDtae36bcoe/+gaJDwKAuwAQET/z5NootBU5eXlCKSVcxxXRgQGjlOg/U3M54y7AzPKuu+7inW/uXTShtORrUAKOkNBak5QSBJKChMCH9UibdWLA/w4z86ZNm4LZV17JABhA0NzUwkc7Bx45Uy7wQZAgL7j08yP7+6KRmAczf/58GGMQieRAaw2GNZa1/TBuPqX+h99+fdeewNdeX1+fKSkpYQA8Y8ZMbqhv8JiZmxqan/wwWgClzFyUVowr2rnrLffRRx630WgU8+bNw4033oBJZZPc2t37tjQ3HX5x+fLlAk+DT/F9NJyVDfP6PcyaCEKIzGBmwczyNIfIuo+EEJg1a1bETwTNKx78qQVgAPDKp1YyMycaapuav3fzj2amFSGJwc8+cdBJzhGI6H1ZAHENS6oizczZgNj3CiQAbN26FYl4QOFwhJRSrLU21lgJjdfLpky8CoAEoIhIJ7dv2A3MB1Aw9AazTe18tKamJlFVVWWGswQ17OKZQUT61Re3//acj0y8wFURa60V+SPyWpyQ6M0y6WHN3Zggt/dIrFRAZlSHH4+J/BGRYgJBay0AsJQSULigq+PotrATImONGM66mZnYau7s7irs7e0fSUTMzIMuFkL4fuCLzvbOh6uqqr778MMPOzfddJMear5qqAcQET9+/9r89Ws2/nPlzLK5bo4s2rjxBYTcMIjovNMxLcDC2uQgEklMCDDaQG/V2PratjROtHnzZjiOkyulnCblqVMABoOGxD/1DGPCCxcuhA7MxZuq//ClgCauTl1Mp+IEYma1bNmyyNVz/mFprC/KiUTc/upXj5mUv6Yla3CaQ2fdlz0YADuOw0qptAaww1w73LAnGxs3bjTMzB1tHfZTF82+bvbs2YXMLE9CnCBmdgHg/rtX/Ky1uZWZOXHrt2+1+fl56Un+vxklJSX843t+ZJk5Xn+ggR984KGvZIVWOj42Z0zj909X/+fkivIvTp9REbnjzjvFE0/8hogUblv6XcRiMZCgv2mxwZYRiYTxwIr7EA67+MIXFuOee+7hd95+p+mPr7z+8s3f+eqS7DVTkqCJv/WtO0bP+tj5U+df/emn3JAzduPGDfYz1y0S48dNwGeuux533PE9xGIxCCkBFiezpA9SZ8OyQTji4L777sWzv3sanZ0dqK6u5iuqrqA9O/dg9crVN8y5aM76KxZdMUBErFKkh7JxEz969TVXbcofkcc/f+jnvGzpMgGS+Lcf349PXnQxXt7yKtxQKGkoGVfi4w3oDOqpE98nyRHwgzi+s+y7OKeiAstuvRnz5s2jJ574NS9e/CVdVl6+uvr5zbOIaBszJ+35pRdqVnxk5vTFxSWjRt5y6zed1aueRl/vAJ5cuQqFI4oQi3nHSatjhEqDLMGegcXTEPKOQcedISJIReg92oV/WrIEJSWjcP31N2DFihU6Go221Nc1PfTRC6f+XADA2RPGl40aXVj8yKO/pLVrn0dh4Vm4487v45xzz02GMmMyQoaIoKSCkhKOdNIq74wnFUoASjAcmXx9vENqreE6YZSXnYtv3nwL2BJWrVqFBx98EJFIpDTa3zsfKWdGbl6eV3+gjm/6+jfR0tSC2bPn4JZbvo26uv2IxeIQUoItg4gQaI2jfb3o7e9DT+9RDMRiEGcofU+rQsOEo1GBo1GFnn6F3gEBzSl7TC4JUkoMDAzgYGMzvnfnDzBn7ly0trbitttuo6amg9YP4m5GCFnWQimXlFIwxqCtvRV/3vEOlAxDkExFaQsnFMbuur14ZcsWRCIReJ6HsolnY/68qxAEQUrw/PXcgcnAERbtfQ7WvdwLRgjMBKXiuLaqAAU5AAWEtC4kAkKhMHa8sxvtXe0p6w2xdKQcX1ramgEgFA5pHU9Aa51E2BhIOQTTEyEIAmitYYyBMQbW2DO3+0wALDQJeByBZgcMgmsthHEgOQZDDIJM0eHghJCZobUmgNFY31iaqQm2HW4/K+XHlPZzIhqsFlLvJYnM5xn1mb5eCJyeTP5LFp58iGQF4jCMUJCsQdAQpCEQACKAlRqGJLR0oEUagPTdlFX+ZAID2tduBoDG+qYyTvoODSYbBjPDMEPDwjLDaj3oImMtNBi+NUgkEtBBkAKBjqMt8Z6GACDBSCgfRHEEwkKwABFDiNQAIxzEkZMg5MV85HpRKOOCSYIJsCAwOylADbMluG4okXGBsvJJ+4lEZRoyAmCthXRdbHvjdezb/y7ckAswEIvH4LgujDFQSqGtswOr1qwGmNHd3oncnBwsWbLkZDXBQenxyT5jZijhosE/gFeObIWrAgRsMNKOwd9f+XcIWQdGEHLjAc558r+Q2xOFSxYJBGj93BL0VVSCA3N8eGQSAmPHjWnLABAORxKptXO22bEg9A70o7vnCMLhMKy1EFlmTkTQ1qL7aA8cpdAfjUIHAZKp9IlShYiQzvbYMizbQddIqQBKgs/MACWLAz5F0WVbEDYSPjNIOCjJFZDMsEogpCzyuw6jsKMPNmQRDgw6vBiYFAB/yDDquk6QAWD/u/srK6eVD+4TEGDBMNZCOg5IJqssqXlldkikJi5JQIUcKNcBcXKxaSKi1D2eDjCQiIMA5DghuKFQJrRprZGIR0FEcEIuHMfJkIDkCMKk4AgJawkhWPgUh2NCSRK2BsIRkCoMPwQYqeFwBMQyFYvoBKGariGoVAGBh9LVCgI9Xd1obKhHbqpqW1RUhILCQjAzent7ER8YgNEGJAQ838OY0SUnfJU2BpHcHLS2dqK6uhqJWBwXzpiJy6uuQDQaRUF+Phqbm1BdXY0gnsCFF16ISy69FPF4HNrRsD5DBxYGEgFF4ZmRsJBgMJgAYSwoGkKUeyASBF8HCITOCsV8QkATqRNqcFI4WEqaQOOyiy/B1KlToaSE67rYu28fDjU3IRQOw/M8jBldjDlz5sIYDc0WOeEIhBCwWaEntyAf23e8hZ273kE8Fsesj38C51VUwPd9FI4Yge3bt2NH7S7EAg9XXnYZJk2aBD/wQUSwljFWjcfs0VdBQYAMoZDj+FhkFfJFN0BAvzsSh/5xISK9efAdD8L66Dt7PNh4Q3MNAJviG5Ud408AwBhMOrsUk8vKYaxBJCcH0f4oGg42piZnkZeXh+nTpsHzkg9jtvD9YBCx7W+ox569tTja04NzJpVhSkUlRo0ahZ7+XtQ1HMBbe3ahr68X55ZPxuSKc5EfyYXv+xBEYMvIFWFMl1Mh2MKoEEbKWkzM2QKXj4AICIfHYO+Ma9Dnn41AABIaNtAgY8E0BNHysUrjKcvivu+DmWHTNzFn4n06D4jH4/B9H9kaIhvEms2bER2IYuy4cVi4cCG0F8DzPHixBGpe+gMCtphcXo6r5y+ANxDLApMBAVgYGG0gwfCJ4bOGNWH4yAURoCwhFBvAUe4FE0MYF2lRynxc7piZnz0GAAni4Srr6RuYLZRSONJzBA319cjLz0e0vx/jikuOCaEsK0qHtHA4jM8tuh7aGEghwJaTRAngrJEjsWTxF+FZg5DjwAYGISc0iLO01bBMIAIEIxnbhYWiAAoeiBhW5EALBTYRKPYAkZ0iA8pxIGhwvmJtFgmSIDWo9A0HQjhgwjFdjaQMnlw+GddctQCu6yIIAhQVFaUKn4NtzXFcRKNRtLe3Q6YYnZlhrR1EO1LIIT5Lxg8yjOJxYxCORMCBgaUAAozAL8He6GcgKQ4CI45caDsKQnggm7XjRCAlsK+uDl093ceeA0A5IZ0B4KwRI7tTC2AA8DwPsVgsc0N6d4MgQHl5OSorKzPnjTEZ88/e/f7YAFrb2nDw4EEIJTPFigzX8OAMj7Kquuk6A2sNJxLCKMeBA4ImBw6iCDASu70Fmfs0ESIs4dgEPOFCsQEYMNagf6AfzS0t2bxEgEVXV8dZWUqwtKlv4AiklGytRUdHB3bs3IEpU8475otZnOB53hA+Naguj9q9tejt70d+YX5KXp5uBYnAZAFmSAjsrz+A3r4+TKs8D+xbaKUAChCyNiNb0iJXcwjSBrCcdL3m1hbs2r0LJSVjEAmHMkKMiBCLRXMzABjWMjABG5OUjdJVIFfhzT9vR2VFJYqLixGkwtIpkx1Ohpj8/Fw01Ndh3TObIZUCW/4L0t4kYNZoXF71aUwqnQQhJZQLMOWkovgxhk8zGBMgrIIgiXfr63GkrwfhnBCeXf1btDQ1prNBttryxAkTWzIAaN/I0aOK6cYbv4B169bicPNBvPnaHzG+tAztXZ1IBB6S4BBOuX5mCCHw7r5a7NqxHY31776vbPDtvDyEXQUhBIyxGRcZtiibilJdR7rR0nQIjfv34q0/vwHAYMKECZg7dx6KioqodnddQQaAtsMdveeNqoitXPmkqLrycrn1T9voxXXPYvHXbkF7ZweaW1tS0vZ0CrMWoVAYL9f8AQf27kIkEkFBXn6yU2Y1D9nU5QzxJf+S0pTiiQTefvstDCTiyC8ai2gsDin4pBVppqTvj8gtQGvTIby8+UWMHz8B8fgALrvsUn7ssUdtIp6ItTS1xABArVmzRv5+/e++vcBe97uPz5qxfu3vn+Of/ORevvfe++ixf38A1934JUy/4BPwEzGIdJZGJ+4BIxWmUgDYIMkTQRDgxY2bbEVFhSQBCKEGNSOQjtNsklrDAoH1Ud9Qzxdd9EkCgMK8QhTk5UG5CoOqb3Riw8syI+K42PDsc3hj2//AdV28sGEDikuKQcoQAHdLzbZrd+w6UsPMgtK9wMOHOXfbqxtuv/LTl97e2d3uVlev40g4lza9VIO6/QeSmTlb8Kk6AinNcNW8OSgrmwQppf3yl78sWpvbX2hr7tkWCklpTGCPafLklmptg5mzpu557eXXxrOwSy/+1CXlv/nvX9v777tf1NcfwvSZ58P3Apyqc2hTcb+udg9mzvwovvGNr2PBggVcUFBAhw61xFub2m6edcmFq4gokWmqZndXa/c0rPa94DAzG2a2iz9/43tqTW3YsIGZ2TKzf/hw257qZ1669nT9/qEVv7x937793cwcrPjZT3nq1CnvaQ5Lly5jZmbP88zBg4cSL67f/HxWJKYT287MYQDYVP3Kv3qez8wcX3T9ogBAIIXKbnpmNSlF9ghAMgCgn3pmlW+M4ebGVrvkhpsmAaD169eHmFkNN2pqahSnSjf/svSH0zrbujQz6+efX5tqsqrUc6QB6LhGLGWGFE4AIPjKV74aMJtEEAT8wH0PPQLATfY/+YTeYLYliOeeem6UygtdMf/quat6jnajs6MTjutmHM7CpGBOFiDTZZR0Jcz3PUw5dxraWjo27du5//YR43Lrzj///IHT7R+k5kFPr3z2Y5VTJm+Ycf6Ms96t2wPpuLBESaaHTNb6jhEoMnXT5G8PMHbsaIRVyG7a+Mq8V2ve3PWTX/zgsLV2kAih4X4fUFp6eXjl4w/8oqR4dIFUEpaYHNdly5Zq9+ye7Aeea6zNgMmWUTX74vXWau7r6w9FQgWxN7bu2HLNorkb09/5l4S/5cuXi7vvvts+98zG7zOZG5SAZSIBECLhnNiMGdMaU9KRrTYQNsmOVgBJsStgjI/21u6+Cy6Z9vXstZ3uDvyfHO/nl9+cqtS+32P58uViuDX9L1pIsShJVuPCAAAAAElFTkSuQmCC",
  star: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAA9CAYAAAAd1W/BAAAYjklEQVR42uWbebRcVZX/P/uce29VvXpT5nkgJJABCCEhGCCS0KAoNoIQEBHR/vkDVzstuxsbcUiC0G3jxOAPRPmBDGqT2GgAARWSAIEQSAyQhCGEhAxkeC95Y70a7r3n7N8fVS8GF4QAwaX+7lq1qu6tW/ecs88evvu7d8H/54f8pQZasGCBnTNnjvzsurumDRrTb2KhUPDtu9ub1qxec4QxFpvJth09/ZirJ5VHdk27ZJoD/N+VoEWqsl7ywLJ79E2Of/3cZRcCGGP+fjRAVY2I+McfXDl+9PgRn02dP3346MFjr776P/2uXS3Gecfxxx+vHz/v47L2mbVLC53x6s9d8i83PLf+0Ve99yIi+je77XPmzLFr1y6IYFD+3v+59wJVVedS7SoUdNiw4QoooJ/61EV7taBtV5tOOfy4M4Dwi1+8NqOq8req83s/b3p5y5O7d+9pU9XKD675vhs/cYJGdY0KkUJOBw0aqVOnHqPLlj/iVLXY2dH92h9Xrrn+LzHP4D1Se5k1a5Y9ZMSE9487bETfwcP7H+Z90ueRpY/oo489IS8+/wJTRjRSNzCEyLCtrYdVq7bw6B8eNdkgF02dduzQYcMGvu+m6289u9wRP/Plb17yiqr+zZiD1NS27hd3/M9m772qS/zih3/vAQ2zGW2OmnXZt47S+KcDtXjHSP3RhaPU2rwCOmLoIG1r2+GTuKSqqnf933u/DbBkiQZ/MxoQhqFOnToVQXMioojB2ECsCcErPo2xSYWw0k1gQOIszpUQYzBRFmszEoRBAph8U7ZnX3P6mxBAmqasWrWquVKp2OoVg7EW5wVNPcanxNaSGjAmQSVDiAcPqgI2AwQC2FK5UlFVZs3C/dXr/oIFCywgN1x909nPrHxm5+ZXt6Td3d3+jDPO0CMmHaGYBr34lFG67NJDdNfiszRefY4Wb+ir2/9rqD4x93CdOb5Ro0yDTp58tH7t8q+pqurOnbteW/30mme/csnlw3r9y8Gc80FFHO3t7UZVTVt35wmTp04eNHLUCE3TVJYvX87adWsRX2bssDred1xItqGAixxOYFB9kRmHVOiXUeJKiWeffYZ169YBMGjQwKFjDh11VDaT77dgwQI7b968v14BXHzxxV5EXEvrzk7nnPaiumwmg7GCYjAjx6InzqK4dgPmoT+QdUJCBY270cQjgDWGbDZTfahHC4Vuf+11V7Wce+65B90MDpYAZO7cuQaQn9/xq0uPnHLkP4HivbfqHL4GOK1JIQoJmvOIEYymqARYB6I5kAgRUPU4b/Dek/iy2NDI8pVP//Mji5786Lx581BV81clgDlz5pj58+d7EXn/jBnHXv3Ziz890tpAjDES5bJ458EpzjuSUgIKuTRBCTFSRkSphEJFFa8hXiHyBmMMYZBl0ODB/qipE7/ZNLDhMhHxBxMPvGt76gUojzy4/PZ8v8xHJx0xIbtmzZrg8ssvNzbMUUfKB4ZvYUAf6Bl/NNMnDmbcIZ7KA/eQ6dyJ2gDBoYHw9NZGtnd48nXK49uGsHLPMDBKU58G/fENN7pAo47Uu02l3aVvDR0/6EFVtSLyrsziDcKgii7BMuvAhbhkiWq/pnXTJk2Z1Ai4lpbd5qGHHgKgAeH7Vw/kkLE5mJWHuEJpTxfGl1AcIiFohPqUGaN6YISFxoiXd+7kwd+vrj6juY8kcRI0D2zuB/TP2rrBS5ZowKsEumT/UWEpMGsWLF26lNmzZ6cHIABRmU36diX53NPPdTrn1FpLFIVYazGhkCVDoWAotSdIIUOydSPJc49Sn3oQi/hqTmQ8uEoF5wQbhJBYrA0QlIa6JmxgAVLAlF2lc/bsfFo7PzhAqBZf5aFfP9XnyMnjTss3ZtU5J+U42c/PHTay9PQ4PKVBqiree3EuwTmHswEu45Fxh6PDugnCOiiVqe8pQKYPSlqzQY+gIAFqPNY6xCjO+WoY8DFpmladqqppa2v96Pq1r9Tl6nPi4vRN/YGxEVFoNZsLeX71hvSmn19/zx133FH23r9eAIoKYETE3XrTzwecMmb6nb03NB2AFPv/2bh1dXkECLU6RH78ZHLjIEk8icZo1EBO9ueCBOnNKBWsNTQ1NWFqTMmYcaMuAi56Oztd3yfHbbfddgTw/MSJc8Lnn1+YANUEQxBFcMt/v+LmEYcPOcJDYmqz+/rXL2ft2jVEUYj3HqX2jfYuQBD1BFjrDWKsYceOHagY4hR6CjHlxOHKRbpXrCC7p4VAQvBuvy7YKag6QGht7+K8j59PJorw3uPVe8BXcwQBta9z69YIlUqJT154EeecfSYAw8YMSe9b9MD9HS3t13zyf3/ih8ZUw2wAcNll/9kn7ukZPfrwMWcOHtm/39Ztm71RjLUh9/32Pp57ds3bjC2G5nxEYEPCLJggQgqtmE3ryYvBm3pU/lwAvjZ/BWKaM1kGNuXI5QRTUhb95td/Hr7fMoSPHn0Ys086kWKpSDZbJ6efcdrIxYsf/fCEw6a0Duk7dsniJxe+JgBLH1z+o8nTJ36+obG+vGHDC+GsWSfZSgJhmGXPnjZcUgFsbcd77Udr10zNF/na946Zxx3GNZ89lExjhcYJUxk0IIvp2EZl8X9TR4DTiIAK+joJ/MmUvVEKaT+6kgxZ08W2Sh8+fMVr7CyWekmkfV4GCPeJ6kntupCrz9Hc0ECpVGLa1Gnc/+D9vqur01S6Pf/n2h9/7D9+OPfXAUBTn4Zcc5/GqsEqtqWlA+8DItvNCWPyDKivI3UeI6BS3SNRwQdgTEpIhqRfX1yUp1TwzJw5kkmTQ1JjyQxXitvXwtYd5ByoCaoT1GoUeCNIYrzQZPfQFMbENkOY9XxmWp6XuyKCxKPO1rxETWjSK3xFVKgQUmeVZ1orrGvZg7qY9o52wiA0/fr2hb4mzecz9k9OUMSpKiKCkZAoqMd5pc6VuOq8Zk483BGXylgf470gWtMEA0YM3U5oOuUEGHMolCBB0XIPGZS02EP81NM0tHcTZAO87qtF+yxiH3QrgGpKKiGSQIMrc+WFjRh1JJ05fOrRxJCkDvWCeIOKImoxhMRq6ZNLmP9YnnUP9SAihEE14HkviNfgHz546qavX3lZVQDG617aGnV4rZB6T1kdadwNZfCFAsmAocj48RhXs1fxOBUCydC5pw1eeoEcoGJQMVQCQ1Aq0FgqEIUpqgZDUoNb9nVqX93FfY0hIPBVn6AGXLkTVY/NlbCkqLcYF6GJIL6CtylUGnB7HAkWTBl19aj66hNr6xPxiLHccuttxwKrgr1X6SUcBGMEo4LDsEcHUIgLGN9F0tCH5qGH4tMKmBCwxEFCpAm6/EnsppeQqDaeKjkFI4JYi75Drr/XT1gRkJr5ECI1MoUMeEmJNMBZIe4qoXF/OvQQemQP4DDG7K01eO/VYr01VTWshUGtq3m01CuUKyVAyOTy/MstOziqLuUn5x1Kn8Kr7HlhE9k+igsMxlkCcRSNkI17CHMRHotFUFESqxhnCNMA8Yra5N1mHvu8V83He0VNjqQrpLvV0yfblz/u7sdlt21ge+rIRBGVOKZQKFQFaUMBrPOa2SuA7o7SmrbWzhV1+eioMCMyc+ZMu2N7C69t38aWjgLFYsjdm+qY1TdiVLZEpRjT3MdCmOKNEvkAbzJVn1xTOVHIeFA83sag8jZTT9kP62pRtIpJbIa0XMG1tpNJ8jxXHsK9m0qsaO8htCFhKIwfP56pU6eqc4l2d3XvwgWvNDT2XbeXwa2ll5n1a1/tGDdpVBbw8+ZdaebP/yY2CsnZDEmpwBemj+J7ZzTT1r6dTCYmHBJhbRk0BQ0w+uZ2/baTVH0LAUiCGEOlElHZ0Yk1fakEw/jHm9fz1K5uJMyQJJVqQrT0EU466f0OsKufWv2TY4475pJeIGRERFXVqKpLU+asenrNjYCedtqp7rvfvZqxo8ZSKpfB5lm8LeXf7mtjy+6+ZIo5ii1FTGoxakA8+heqZ3qTICKkJUNhZ5Gc1vG7jXm+8tvdvNSZoEGWxKd8+PTTuObaH3LYuHGuo7Ujuea7191f6Cjccuqpp+adc+Z1etZbw7vlxl+NO+f8j6yvqw+w1vpZ759tHnlsKZkoj3eWxHXzk/OncNGYhM7ureSaYuoHZHGm6vhkXyG8RxqgYvAxdO1McHETjU2D+czdu/nlms2EYRarSjmt8N3vXMW//fvlKRCsXbluz5HHHjHg9Sq6D5wUEa+qNtOY3f3LO++a+fLzG+8GzI03XeefWrGcp55+nG9d8XWsMXzv4Vf55K9a8OEQMrGhq6UMSViDse9JqQVEqxpmHN5DvLOH+myG9V15Tv/pBh57pZu6XDN337OAFX98kidXPM6Fn74IIPjCJV9e8V9Xf/eTqmrnzp0bvCkfIFVA1CEiy55bvvGYcjEZN27chEOCIMgB9sUXX0KMsL29QqWU8vtdGSY0DGeSFknrurF9U2xs36Oas9bS5gylNqgkIRs7xrHoxV08vL1AxmbJ5gKOPeYYBg0cpoDrauvs3rFp567WnW03LbjnzgcPnTc6mD9/frpfQkREdO7cucFRM8ZcB9y4ZvX6jiOOHmcB39XVadI0pUBKIYHP3vk8Hz+8mdvO70/cU0QaApDywSabqyhREsQIaWzJJgm7cyP4Xze/wNruTgAqrodKAbo6uxg0cJgDgo0vb7l9yvuO+oqqip5bsX+++DetDM2fPz9VVZk2bRqvbtz6nfauPccee+yU06ZPn8o3v/ENE0UZKsUC1//kDh5p6+ELvytywWERUxu6IQfvWX+DB3WGu9fV8cCGmPWlHg6fcDTnn/sxKkmJIDQ6ZOhQv23z1uKe3R3Xu8Q/KCK6cOFCs3DhQve2SdG5c9XMny/+k2f968Drbpi3q8/gemqI0XqXMvbQMWzavAOAW84YyieOLmCaPGEmRdVWbfcd+YXXO0EvCuIgjqA7x+cWxty8pgNIOXfOOdy1YOGfbATsA4seLn34zFOaaqmhYT/tNvvdq/nzRZcsWRKc/amPxPf+5qHTH128/L+riDH1be0dpIlDUEJjyRpqSdJ71cpicKniUk82MhgTVVU/TkjTVAFxKW7u16668rbbf/kZVfW1Up1/N8VRnT17dqqqXSJy/z0//92InkLlBDEMiKJMVkzVM6fe48QjorwngUAFEYNPFVGDV8deXk8hCAK2b9sVt7W0d6x85I8337/87s3j5w038+fPf8s4fEDWKiK6ZO6S4IwLPnhzfUN21ItrN2xtqM8T+9QjVYibWnCivWzePoTFwarfCIqrMshq6AXWXtMUkEV333fNkVMnDBl+ZP/WuSfNDQ5k8QcsAFWVk684OX3q4ReOa9nWdvmQQX2ayuUerCKoR8VgvGDx1exN5V2AoDfbBV97psEZj9bS6kCN8d5z6imzpjyxeOX8yYe9r9+3H/t2WivVHRQByNKlS42qNiW+OGfAsD5XDhk1cECaOALbIJgINEUIUFWQpOb8DmIoEIfiEQ1wqqRYglr2bqPAGGMYO/HQU2fMnvqNhXffdaH33sybN08PpPJl9h8F5hpAn1+2acjqx59fOWbSsAuB5PJvfoPTPvghdu4pMGPEQO674EhmjI6RBksQ9sYrOQDTqvEU8lZTVVQ9mawQ5Yt8fkaGWy+cxvB8HY898SSzT57NokW/8UB85X/MveKu2+5+WETqVPUtI90BbdMhk0ZFk6YcNnbwkEH9gGDlU6vliRVPUikXGZlN+NCoMiP79mDzVR/QW7ztpc6qrtKQUi2RqwZ4D2nqSZ3HOUWTAFGp3as4A4pF8Bi0mmlaJWgUjhzYzimD22gMLK07W1i6ZCnbtm0zQHjCSTPs0BEDZgH9rDVvqQUH1CLjvddyXE7CXC4AQ74uj7UW5zypTymkFUT38QG1MbXGGBtAja+edRniDkF9BqduL1UFFRoGhZg6cKQYn2IIq+xSr+BqhfaKDylXEsrqsVYQLFFYDYvOOYrlUnqgazugm8rlivMuNWCqfKV6nKt6ZDHgrScUj1HdZ0GKIhgN8BWLS6rl8bgTtFRXVX+T/ElYaim1p9hKtTYYBB5CqXn/GuMrgipVrRBTE0x10TV1V2utDB82YjOwtRaN3jkOqDk//cipZ46fefJ0AzjvvVXvqqLAERjAeMTIPssWRAK8CGnF0tXisHGEEGOiOqQxwuCwBLVAKXgC4mIHvpBQUsE0hTT0E4xxtYWnaC20am1sI4oRjxEBdb3aShiGsaqm1Qi+/16C4EAwwLQpJ/bJ5vICqDGGxAm+2gBDwVmMaLWYaQKMJJBAsSMFp5hUyUqGMIiRuhz3rc2w4IUugqDKEqtWl9VkhC+dNJBxdV2UfYotl/C7PGWTw2Uh32QRiVEjCILB0+MsscuAlpCgagLGGOryeQ60iWK/AigUCvLFz3xtQEvX9taXXnqh1Nxcn6kIOtQmMql/PfgME/saXOjIGMVUHGhAXDRUuhM6yw20uAYsBlyZSCN+/1rML1/orHGwbq8vrpOUk44YTtbX050KIs04FQZniuTiblwUYQMBQkySYrEcPSBHv/oM5TSguHsPr2zchMGxadNrue9ced10W6L10qu+tOn1BYgDS4akVigZvmLZymXTZ0xpiaKo3gbZ8V693nnWGDnt0IRiMaW+rof80ISedki7yyAZXGLI19dx5WLLdSt202ATKmqIpI62cgflN2n5GxCEZG1ILBa1YJKEn36sPx8aE9MVpwgpSAZVJUAp0oxJHNQ3cekDe/jF2gLGlJk58wS36Nf32qcfWXvjrNOn/7OqBiKSvhMTKA8ZOsB193RNMdbE5UoZCMT4InXqcMQkPqajkMV3V4gqGVKJqvboUkpO6HKGiiiJAZN2c+xx0zh6yhRK5Tj11mFUENRkTWDueXAxW7dvJ2sSNA2oOKHLZ8GnaGKrjk8FYwJULXlJUO/Iy27EJyRxJ6A477Uun9Ojj5m4+Z2agBgjHhjy2vaWUdmGnLFBmJOkiIrQEyZ4HNgSkobY7d1E2XoknyNC8c6RyTZSdp3gu6jEf6r/nnX2x7j00q/qG4397PEn8tq2TZQ9tUwWQnHYXAZrDVk8AZ5SJUVij9iEivHkiEiIEMkAFVQtqirlSiF8t2HQ1Bon1HsvqJBTQzMRoVawkkFRMvVN3Lo2ZMkrHdRbiwdi183kD57Hwq9+EJeWsTaiXCkx+aijcanKUytWX7tty5bSs8+uHnvaBz4w5MSTT5gx/4pv09raYoIgRF0CoWXZz29i0cKn0TAiVI+mKZ+e1p/pw4BiQhD0EBhHFqXq+HVvyDRi9GAIoFZRsRgjeFHaPGyJG+lyjigtY4JBPLyxlQXruoCoSgn5IjO/OJ1zzj6LfbwdlUrK7tYOgij6/rmfOGsrwFETpvx7R0fnCaecMtvtc68A5tY7f82DazvB5sFV24ImjxrAmMEOV8zQk1Ea40YKvh3wtXkeeAt08OYMpAC6tbGhqU09fXt6ehQQiRr4+r07ySvEBlQcIq3s7CrVflraS0F0dHVUiw/G7K2Db3t1y+2LH101b+LEoR2qGixdCj+9/oKFP/nZjRt+fOMNt4wdf2jj3i4Rl+IKrbWTnr2Tu+IPG7lumUVScAYysovWihCEEWlSpru7o4YJgneNBDtsaAs2sM0XXPAJ1q9/UZ55Zg07yoL2EhIGRBzHzZjBoaMPoVwuOBOFWilXdMIRY8R5px27Ox+1NiwUy6XB7bt6ll988bmbeusQtZ3eCGwtFZI7ioXy6HKp7OIkPmTg4P4T33/yiZqtiyTKRKgTk8lm5YknlrN5Sw3oVQEJxkAuk2H27FN53/HTAdIwit5xMdLUEO345ctW9f6dx//4phv1DVo0FNA7br/9Df8J5suqP73qF4P2ebZ9g1xd/vzaS2s2ffzN/l123rnnvek8tmzdrKrqVFVffnbztTU+I3jbFci5c+ean/1sfvTlz/9o3tDhQ2Z+7Owzj9uwYb1Z9vgSwigUVa0RH4HGcUVOOeWUdMTwkfx20eIHGjMNL0eRaBAYSj2Je3Xzju/905fmtNWQpK/h9jciXszCheuCOXMmubtuvfeY11o2/aBULqk1gSkVi0w++ogRZ5770ZHLHn0sfXnDy0RRRG9jR+1dzznnHHEJhfXrNtz+/B/XP37hF+Ys2Efb3qYa1PjtD8w87/jdOzo1KSVvvMtetbu7pJs3bdez//FTR71XxOh3rvj+dWnitFKqVAd2+7y8qqaq5VKsz616YdvB6hUWVZUvnP/VwSd9YFa/OIlpb+8hCmthOoSSK4n1Xh9btnx0a8fu5v5Dht6zYMFNPatWrZKpU6cqS0Fmi3u7BGFv4+a+1378g9uGHDt1St/v/eD7h+xqbe0HDp9UUbUxFqylPpfz2Wx+K9m6p+bMmVV6L1rs/66O/wfnHtZLlPmVIQAAAABJRU5ErkJggg==",
  coin: "data:image/png;base64,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"
};

const TICKER_MESSAGES = [
  { icon: "rocket",     text: "FREE SHIPPING ON ALL ORDERS ABOVE $200" },
  { icon: "diamond",    text: "100% TESTED, GENUINE HARDWARE" },
  { icon: "trophy",     text: "TRADE-INS WELCOME ON CONSOLES & PHONES" },
  { icon: "controller", text: "NEW LISTINGS ADDED EVERY WEEK" },
  { icon: "coin",       text: "PAY BY WHISH OR CASH ON DELIVERY" },
  { icon: "star",       text: "RATED 5 STARS BY OUR CUSTOMERS" }
];

const TICKER_HEIGHT_PX = 30;

function buildTickerStrip() {
  return TICKER_MESSAGES.map(m => {
    const src = TICKER_ICONS[m.icon] || "";
    return `<span class="top-ticker-item">`
      + `<img class="top-ticker-icon" src="${src}" alt="" aria-hidden="true">`
      + `<span class="top-ticker-text">${escapeHtml(m.text)}</span>`
      + `</span>`;
  }).join("");
}

function initTopTicker() {
  if (document.getElementById("topTicker")) return;

  const style = document.createElement("style");
  style.id = "retrostationTickerStyles";
  style.textContent = `
    @font-face{
      font-family:"PerfectDOSVGA";
      src:url("assets/Perfect_DOS_VGA_437_Win.ttf") format("truetype");
      font-weight:normal; font-style:normal; font-display:swap;
    }
    .top-ticker{
      /* Sits above the header/hero, but *below* the nav-drawer, filter
         drawer, cart drawer and modal overlays (all z-index 90+), so
         those panels draw cleanly over it instead of the ticker
         overlapping their top edge while they're open. */
      position:sticky; top:0; z-index:45;
      height:${TICKER_HEIGHT_PX}px;
      background:var(--dark-strong, #09090B);
      border-bottom:1px solid rgba(255,210,61,0.22);
      overflow:hidden;
      display:flex; align-items:center;
    }
    .top-ticker-track{
      display:flex; align-items:center;
      white-space:nowrap;
      animation:top-ticker-scroll 26s linear infinite;
      will-change:transform;
    }
    .top-ticker:hover .top-ticker-track{ animation-play-state:paused; }
    .top-ticker-item{
      display:inline-flex; align-items:center;
      padding:0 20px;
    }
    .top-ticker-icon{
      width:16px; height:16px; object-fit:contain;
      margin-right:8px; flex-shrink:0;
      image-rendering:pixelated;
    }
    .top-ticker-text{
      font-family:"PerfectDOSVGA","Rimouski",monospace;
      font-size:12px; letter-spacing:0.5px;
      color:var(--accent-yellow, #FFD23D);
      text-shadow:0 0 6px rgba(255,210,61,0.35);
      line-height:1;
    }
    @keyframes top-ticker-scroll{
      from{ transform:translateX(0); }
      to{ transform:translateX(-50%); }
    }
    @media(prefers-reduced-motion:reduce){
      .top-ticker-track{ animation:none; }
    }
  `;
  document.head.appendChild(style);

  const strip = buildTickerStrip();
  const ticker = document.createElement("div");
  ticker.className = "top-ticker";
  ticker.id = "topTicker";
  ticker.setAttribute("role", "note");
  ticker.setAttribute("aria-label", "Store announcements");
  ticker.innerHTML = `<div class="top-ticker-track">${strip}${strip}</div>`;

  document.body.insertBefore(ticker, document.body.firstChild);
  document.body.classList.add("has-top-ticker");

  // index.html's header is position:sticky (so it can dock under the
  // ticker); product.html's header is a plain position:relative block
  // that already sits below the ticker in normal flow. Only nudge the
  // sticky one, so we don't double-offset the relative one.
  const headerEl = document.querySelector(".header");
  if (headerEl && getComputedStyle(headerEl).position === "sticky") {
    headerEl.style.top = TICKER_HEIGHT_PX + "px";
  }
}

// ============================================================
// LOOPING BACKGROUND VIDEO — the header/hero background is now the
// video only (assets/wallpaper.mp4); there's no static image fallback,
// just the solid --dark color underneath until it loads.
// Name the file "assets/wallpaper.mp4".
// ============================================================

const BG_VIDEO_SRC = "assets/wallpaper.mp4";

// ============================================================
// HERO CAROUSEL — cycles the intro-copy slide + 4 category slides
// every 5s. Active slide slides left + fades out; the next slide
// fades in from the right. Only runs on index.html (checks for
// #heroCarousel first since product.html doesn't have a hero band).
// ============================================================
const HERO_SLIDE_INTERVAL_MS = 5000;
const HERO_TRANSITION_MS = 550;

function initHeroCarousel() {
  const carousel = document.getElementById("heroCarousel");
  if (!carousel || carousel.dataset.wired === "1") return;
  carousel.dataset.wired = "1";

  const slides = Array.from(carousel.querySelectorAll(".hero-slide"));
  if (slides.length < 2) return;

  const dotsWrap = document.getElementById("heroDots");
  const CAT_DOT_VAR = {
    "nintendo-switch": "--cat-switch",
    "handhelds-consoles": "--cat-consoles",
    "laptops": "--cat-laptops",
    "phones": "--cat-phones",
  };
  let dots = [];
  if (dotsWrap) {
    dotsWrap.innerHTML = "";
    dots = slides.map((slide, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Show slide ${i + 1}`);
      const catVar = CAT_DOT_VAR[slide.dataset.category];
      if (catVar) b.style.setProperty("--dot-color", `var(${catVar})`);
      if (i === 0) b.classList.add("is-active");
      b.addEventListener("click", () => goToHeroSlide(i, true));
      dotsWrap.appendChild(b);
      return b;
    });
  }

  let current = slides.findIndex(s => s.classList.contains("is-active"));
  if (current < 0) current = 0;
  let timer = null;

  function goToHeroSlide(nextIndex, userTriggered) {
    if (nextIndex === current) return;
    const curEl = slides[current];
    const nextEl = slides[nextIndex];

    curEl.classList.remove("is-active");
    curEl.classList.add("is-exiting");

    // Force layout so the next slide's base (off-screen) state is
    // applied before we flip it to active, otherwise the browser
    // may coalesce both style changes and skip the entrance animation.
    void nextEl.offsetWidth;
    nextEl.classList.add("is-active");

    window.setTimeout(() => {
      curEl.classList.remove("is-exiting");
    }, HERO_TRANSITION_MS);

    if (dots[current]) dots[current].classList.remove("is-active");
    if (dots[nextIndex]) dots[nextIndex].classList.add("is-active");

    current = nextIndex;
    if (userTriggered) restartHeroTimer();
  }

  function advance() {
    goToHeroSlide((current + 1) % slides.length, false);
  }

  function restartHeroTimer() {
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(advance, HERO_SLIDE_INTERVAL_MS);
  }

  restartHeroTimer();

  // Pause while the tab isn't visible so slides don't pile up offscreen.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (timer) window.clearInterval(timer);
    } else {
      restartHeroTimer();
    }
  });

  // Manual prev/next arrows — wrap around at either end.
  const prevBtn = document.getElementById("heroArrowPrev");
  const nextBtn = document.getElementById("heroArrowNext");
  if (prevBtn) prevBtn.addEventListener("click", () => {
    goToHeroSlide((current - 1 + slides.length) % slides.length, true);
  });
  if (nextBtn) nextBtn.addEventListener("click", () => {
    goToHeroSlide((current + 1) % slides.length, true);
  });

  // Basic touch-swipe support so slides can be moved between on mobile too.
  let touchStartX = null;
  carousel.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  carousel.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 40) return; // ignore taps/small jitters
    if (dx < 0) goToHeroSlide((current + 1) % slides.length, true);
    else goToHeroSlide((current - 1 + slides.length) % slides.length, true);
  }, { passive: true });

  // Mouse-drag equivalent for desktop/no-touch — same gesture-only nav,
  // since the prev/next arrows are visually hidden.
  let mouseStartX = null;
  carousel.addEventListener("mousedown", (e) => {
    mouseStartX = e.clientX;
  });
  window.addEventListener("mouseup", (e) => {
    if (mouseStartX === null) return;
    const dx = e.clientX - mouseStartX;
    mouseStartX = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goToHeroSlide((current + 1) % slides.length, true);
    else goToHeroSlide((current - 1 + slides.length) % slides.length, true);
  });

  // Split each CTA's text into individually-colourable letter spans
  // (colours cycle via the .letter:nth-child rules in CSS).
  carousel.querySelectorAll(".hero-shop-cta").forEach(cta => {
    const text = cta.textContent;
    cta.innerHTML = "";
    Array.from(text).forEach(ch => {
      const span = document.createElement("span");
      span.className = "letter";
      span.textContent = ch === " " ? "\u00A0" : ch;
      cta.appendChild(span);
    });
  });

  // Category slides link to the shop grid filtered to that category.
  carousel.querySelectorAll(".hero-cat-link[data-filter-category]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = link.getAttribute("data-filter-category");
      if (typeof setCategory === "function") setCategory(cat);
      const grid = document.querySelector(".product-grid, #shopGrid, .count-bar-outer");
      grid?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

// ============================================================
// CRT OVERLAY — a fixed, full-viewport scanline + vignette layer
// for the retro-terminal theme. Injected once and shared across
// index.html/product.html, same pattern as initBgVideo(). Styling
// (the .crt-overlay rules + flicker keyframes) lives in the page's
// <style> block alongside the rest of the theme tokens.
// ============================================================
function initCrtOverlay() {
  if (document.querySelector(".crt-overlay")) return;
  const overlay = document.createElement("div");
  overlay.className = "crt-overlay";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);
}

function initBgVideo() {
  // .header exists on both pages; .hero-band only on index.html
  const targets = document.querySelectorAll(".header, .hero-band");
  targets.forEach(el => {
    if (el.querySelector(".bg-video")) return; // already injected
    const video = document.createElement("video");
    video.className = "bg-video";
    video.src = BG_VIDEO_SRC;
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("preload", "auto");
    video.setAttribute("aria-hidden", "true");
    // If the file is missing or the browser can't play it, quietly fall
    // back to the solid background color — no wallpaper image, no broken UI.
    video.addEventListener("error", () => video.remove());
    el.insertBefore(video, el.firstChild);
    // Some mobile browsers still refuse autoplay until a play() call
    // happens in response to a user gesture; this catches that case
    // instead of throwing an unhandled promise rejection.
    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => { /* stays on poster frame, fine */ });
    }
  });
}
