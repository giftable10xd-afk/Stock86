// ============================================================
// STOCK/86 — SHARED APP LOGIC
// Works on both index.html (grid) and product.html (detail page)
// ============================================================

const STORAGE_KEY      = "stock86_sold_state_v1";
const CART_STORAGE_KEY = "stock86_cart_v1";

let cart = [];
let adminMode = false;

// ---------- ICONS ----------

const ICONS = {
  switch:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="6" height="12" rx="2"/><rect x="16" y="6" width="6" height="12" rx="2"/><rect x="8" y="4" width="8" height="16" rx="1"/><circle cx="5" cy="10" r="0.8" fill="currentColor"/><circle cx="19" cy="14" r="0.8" fill="currentColor"/></svg>`,
  console:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="9" width="18" height="7" rx="2"/><circle cx="7" cy="12.5" r="1"/><circle cx="10" cy="12.5" r="1"/><line x1="15" y1="11" x2="17" y2="11"/><line x1="15" y1="14" x2="17" y2="14"/></svg>`,
  handheld: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="10" height="8" rx="1"/><circle cx="9" cy="17.5" r="1"/><circle cx="15" cy="17.5" r="1"/></svg>`,
  game:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>`,
  laptop:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="11" rx="1"/><path d="M2 19h20l-2-3H4l-2 3z"/></svg>`,
  sold:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="7" y1="7" x2="17" y2="17"/></svg>`
};

// ---------- DATA HELPERS ----------

function allLists() {
  return [INVENTORY.switches, INVENTORY.games, INVENTORY.consoles, INVENTORY.laptops];
}

function findItemById(id) {
  for (const list of allLists()) {
    const found = list.find(i => i.id === id);
    if (found) return found;
  }
  return null;
}

// ---------- SOLD STATE PERSISTENCE ----------

function loadSoldState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const soldMap = JSON.parse(raw);
    allLists().forEach(list => {
      list.forEach(item => {
        if (soldMap.hasOwnProperty(item.id)) item.sold = soldMap[item.id];
      });
    });
  } catch (e) { console.warn("Could not load sold state:", e); }
}

function saveSoldState() {
  const soldMap = {};
  allLists().forEach(list => list.forEach(item => { soldMap[item.id] = item.sold; }));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(soldMap)); }
  catch (e) { console.warn("Could not save sold state:", e); }
}

function toggleSold(id) {
  const item = findItemById(id);
  if (!item) return;
  item.sold = !item.sold;
  saveSoldState();
  if (typeof renderAll === "function") renderAll();
  if (typeof renderProductPage === "function") renderProductPage();
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

  const mediaHtml = item.image
    ? `<img src="${item.image}" alt="${item.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">`
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
          ${item.sold ? `<div class="sold-overlay"><span class="badge badge-lg badge-danger">Sold</span></div>` : ""}
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

  document.getElementById("controllerModalOverlay").classList.add("open");
}

function closeControllerModal() {
  document.getElementById("controllerModalOverlay").classList.remove("open");
  pendingSwitchId = null;
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
  // Reset to Whish by default
  selectPaymentMethod("whish");
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
  if (!isCOD) {
    lines.push("I have sent payment via Whish Money and attached the screenshot.");
  }
  lines.push("");
  if (name)    lines.push(`Name: ${name}`);
  if (address) lines.push(`Address: ${address}`);

  return encodeURIComponent(lines.join("\n"));
}

function sendOrderToWhatsApp() {
  const message = buildWhatsAppMessage();
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
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
  loadSoldState();
  loadCartState();   // ← restore cart from localStorage
  renderCart();

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
  const maxPrice = (typeof getMaxPrice    === "function") ? getMaxPrice()    : Infinity;

  const SECTIONS = [
    { key: "switches", items: INVENTORY.switches,  gridId: "switchList",  sectionId: "section-switches", renderFn: renderProductCard },
    { key: "games",    items: INVENTORY.games,      gridId: "gamesGrid",   sectionId: "section-games",    renderFn: renderProductCard },
    { key: "consoles", items: INVENTORY.consoles,   gridId: "consoleList", sectionId: "section-consoles", renderFn: renderProductCard },
    { key: "laptops",  items: INVENTORY.laptops,    gridId: "laptopList",  sectionId: "section-laptops",  renderFn: renderProductCard },
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

  orderedSections.forEach(sec => {
    const gridEl    = document.getElementById(sec.gridId);
    const sectionEl = document.getElementById(sec.sectionId);
    if (!gridEl) return;

    if (activeCategory !== "all" && activeCategory !== sec.key) {
      if (sectionEl) sectionEl.style.display = "none";
      return;
    }

    const filtered = sec.items.filter(item => {
      const matchPrice  = item.price <= maxPrice;
      const score       = searchScore(item, query);
      const matchSearch = !query || score > 0;
      return matchPrice && matchSearch;
    });

    if (filtered.length === 0 && query) {
      if (sectionEl) sectionEl.style.display = "none";
      return;
    }

    if (sectionEl) sectionEl.style.display = "";

    if (filtered.length === 0) {
      gridEl.innerHTML = `<div class="no-results">No listings match your search.</div>`;
    } else {
      gridEl.innerHTML = filtered.map(sec.renderFn).join("");
    }

    const countEl = sectionEl && sectionEl.querySelector(".count");
    if (countEl) {
      const avail = filtered.filter(i => !i.sold).length;
      countEl.textContent = `${avail} of ${filtered.length} available`;
    }
  });

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
    container.innerHTML = `
      <div class="not-found">
        <p>Product not found.</p>
        <a href="index.html" class="btn btn-brand btn-base">← Back to all listings</a>
      </div>`;
    return;
  }

  document.title = `${item.name} — STOCK/86`;

  const icon = ICONS[item.icon] || ICONS.console;
  const mediaHtml = item.image
    ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">`
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
        ${item.sold ? `<div class="sold-overlay"><span class="badge badge-lg badge-danger">Sold</span></div>` : ""}
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
