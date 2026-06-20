// ============================================================
// STOCK/86 — SHARED APP LOGIC
// Works on both index.html (grid) and product.html (detail page)
// ============================================================

const STORAGE_KEY      = "stock86_sold_state_v1";
const CART_STORAGE_KEY = "stock86_cart_v1";

let cart = [];
let adminMode = false;

// ---------- SMOOTH PAGE NAVIGATION ----------
// The cross-fade itself is now handled entirely by the browser's native
// cross-document View Transition (see the `@view-transition { navigation:
// auto; }` CSS rule in both pages). That only fires for *real* navigations
// — actual <a> clicks and the Back/Forward buttons — not for navigations
// triggered from JS via window.location.href. So we deliberately let plain
// <a href="..."> clicks go through untouched; we don't preventDefault or
// fake the fade in JS anymore, since that's what caused the blink (a fake
// fade-out on the old page, then a fresh unstyled paint underneath with no
// real connecting animation).

// Browsers without cross-document View Transition support get a plain,
// instant navigation — no transition, but also no blink, since nothing
// is being faked in JS. We only add a gentle fallback fade-in for very
// old browsers that don't even support view transitions at all.
let hasViewTransitionSupport = false;
try {
  hasViewTransitionSupport = CSS.supports("selector(::view-transition-old(root))");
} catch (e) { /* very old browser — CSS.supports selector() syntax itself unsupported */ }

if (!hasViewTransitionSupport) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("page-fade-fallback");
  });
}

// ---------- SCROLL MEMORY (index.html ⇄ product.html) ----------
// Remembers exactly which product card the person was looking at, so
// "← All listings" can scroll back to that exact card — not a raw pixel
// offset. A pixel offset drifts because card images (especially admin
// photos, which are large base64 data-URIs) finish loading and decoding
// at different times, reflowing the grid; anchoring to the actual card
// element sidesteps that entirely.
const SCROLL_MEMORY_KEY = "stock86_index_scroll_anchor_v2";

function rememberIndexScroll(productId) {
  try {
    sessionStorage.setItem(SCROLL_MEMORY_KEY, JSON.stringify({ id: productId || null, y: window.scrollY }));
  } catch (e) { /* ignore */ }
}

let _pendingScrollAnchor = undefined; // undefined = not yet read this page load

function readScrollAnchorOnce() {
  if (_pendingScrollAnchor !== undefined) return _pendingScrollAnchor;
  try {
    const raw = sessionStorage.getItem(SCROLL_MEMORY_KEY);
    sessionStorage.removeItem(SCROLL_MEMORY_KEY);
    _pendingScrollAnchor = raw ? JSON.parse(raw) : null;
  } catch (e) { _pendingScrollAnchor = null; }
  return _pendingScrollAnchor;
}

function restoreIndexScroll() {
  const anchor = readScrollAnchorOnce();
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

// Note: no click interception anymore — links navigate natively so the
// browser's own cross-document view transition can run. We only listen
// (not intercept) to record which card was clicked before leaving the grid.
function wireSmoothNav() {
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href) return;
    const match = /^product\.html\?id=([^&]+)/.exec(href);
    if (!match) return;
    const leavingIndex = !!document.getElementById("section-switches");
    if (leavingIndex) rememberIndexScroll(decodeURIComponent(match[1]));
    // No preventDefault — let the browser handle the navigation and its
    // own native view transition.
  }, { capture: true });
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
    <div class="card ${soldClass}" id="card-${item.id}">
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
        ${showConditionOnCard ? `<span class="card-condition-badge condition-${(item.condition||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}">${item.condition}</span>` : ""}
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
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:var(--dark); color:var(--white);
      font-family:"NintendoSwitchUI",sans-serif; font-size:13px; font-weight:500;
      padding:10px 18px; border-radius:var(--radius-base);
      box-shadow:var(--shadow-lg); z-index:9999;
      pointer-events:none; opacity:0; transition:opacity 200ms ease;
      white-space:nowrap;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = "Only 1 of each item allowed";
  toast.style.opacity = "1";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = "0"; }, 2200);
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
  cart = cart.filter(line => line.lineId !== lineId);
  saveCartState();
  renderCart();
  updateAddToCartButtons();
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
  countEl.textContent    = total_items;
  countEl.style.display  = total_items === 0 ? "none" : "flex";

  if (total_items === 0) {
    body.innerHTML = `<div class="drawer-empty">Your cart is empty.<br>Browse the inventory and add something.</div>`;
    foot.style.display = "none";
    return;
  }

  body.innerHTML = cart.map(line => `
    <div class="cart-line">
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
  lines.push("Order from STOCK/86 website:");
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

function wireCommonUI() {
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

function setCategory(cat) {
  activeCategory = cat;
  document.querySelectorAll(".cat-tab").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  renderAll();
}

function searchScore(item, query) {
  if (!query) return 1;
  const name  = (item.name  || "").toLowerCase();
  const id    = (item.id    || "").toLowerCase();
  const desc  = (item.description || "").toLowerCase();
  const specs = (item.specs || []).join(" ").toLowerCase();

  if (name.includes(query))               return 3;
  if (id.includes(query))                 return 2;
  if (desc.includes(query) || specs.includes(query)) return 1;
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
      const bestScore = sec.items.reduce((best, item) => Math.max(best, searchScore(item, query)), 0);
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
      const score       = searchScore(item, query);
      const matchSearch = !query || score > 0;
      return matchPrice && matchAvail && matchSearch;
    });

    // Available items first (highest price → lowest), sold items always
    // pushed below available ones (also highest → lowest within that group).
    filtered = filtered.slice().sort((a, b) => {
      if (a.sold !== b.sold) return a.sold ? 1 : -1;
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
      gridEl.innerHTML = filtered.map(sec.renderFn).join("");
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

function renderProductPage() {
  const params    = new URLSearchParams(window.location.search);
  const id        = params.get("id");
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

  document.title = `${item.name} — STOCK/86`;

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
    ? `<span class="card-condition-badge condition-${(item.condition||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}">${item.condition}</span>`
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
  document.getElementById("adminTabAdd").style.display    = tab === "add" ? "" : "none";
  document.getElementById("adminTabDelete").style.display = tab === "delete" ? "" : "none";
  if (tab === "delete") renderAdminDeleteList();
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
  wireAdminImageInput();
}
