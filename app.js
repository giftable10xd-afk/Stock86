// ============================================================
// STOCK/86 — SHARED APP LOGIC
// Works on both index.html (grid) and product.html (detail page)
// ============================================================

const STORAGE_KEY = "stock86_sold_state_v1";

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

  // Condition shown on card ONLY for non-game categories
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

// ---------- CONTROLLER ADDON MODAL ----------

let pendingSwitchId = null;

function startAddToCart(id, evt) {
  if (evt) evt.stopPropagation();
  const item = findItemById(id);
  if (!item || item.sold) return;

  if (item.hasControllerAddon) {
    pendingSwitchId = id;
    openControllerModal(item);
  } else {
    directAddToCart(id);
  }
}

function openControllerModal(item) {
  const pro = INVENTORY.controllerAddons.pro;
  const wired = INVENTORY.controllerAddons.wired;
  const editionOptions = pro.editions.map(e => `<option value="${e}">${e}</option>`).join("");

  document.getElementById("controllerModalItemName").textContent = item.name;
  document.getElementById("controllerModalProEditions").innerHTML = editionOptions;
  document.getElementById("controllerModalOverlay").classList.add("open");
  document.getElementById("controllerModalProPrice").textContent = `+$${pro.price}`;
  document.getElementById("controllerModalWiredPrice").textContent = `+$${wired.price}`;
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

  // Enforce max 1 of each item
  if (cart.some(l => l.sourceId === id)) {
    openDrawer();
    return;
  }

  cart.push({
    lineId: `${id}-${Date.now()}`,
    sourceId: id,
    name: item.name,
    price: item.price,
    meta: ""
  });

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

  renderCart();
  updateAddToCartButtons();
  openDrawer();
}

function directAddToCart(id) {
  const item = findItemById(id);
  if (!item || item.sold) return;
  // Enforce max 1 of each item
  if (cart.some(l => l.sourceId === id)) {
    openDrawer();
    return;
  }
  cart.push({ lineId: `${id}-${Date.now()}`, sourceId: id, name: item.name, price: item.price, meta: "" });
  renderCart();
  updateAddToCartButtons();
  openDrawer();
}

// ---------- CART ----------

function removeFromCart(lineId) {
  cart = cart.filter(line => line.lineId !== lineId);
  renderCart();
  updateAddToCartButtons();
}

// Update all "Add to cart" buttons on the page to reflect in-cart state
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
}

function cartSubtotal() {
  return cart.reduce((sum, line) => sum + line.price, 0);
}

function renderCart() {
  const body = document.getElementById("drawerBody");
  const foot = document.getElementById("drawerFoot");
  const countEl = document.getElementById("cartCount");
  if (!body) return;
  // Count only main items (not add-ons) for the badge
  const mainItems = cart.filter(l => !l.sourceId.startsWith("addon-"));
  countEl.textContent = cart.length;
  countEl.style.display = cart.length === 0 ? "none" : "flex";

  if (cart.length === 0) {
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
  const total = subtotal + DELIVERY_FEE;
  document.getElementById("subtotalVal").textContent = `$${subtotal}`;
  document.getElementById("totalVal").textContent = `$${total}`;
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
  document.getElementById("modalOverlay").classList.add("open");
}
function closeCheckout() {
  document.getElementById("modalOverlay").classList.remove("open");
}

function buildWhatsAppMessage() {
  const name = document.getElementById("custName").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const subtotal = cartSubtotal();
  const total = subtotal + DELIVERY_FEE;

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
  lines.push("I have sent payment via Whish Money and attached the screenshot.");
  lines.push("");
  if (name) lines.push(`Name: ${name}`);
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

// Score an item against a search query — higher = more relevant
function searchScore(item, query) {
  if (!query) return 1;
  const name = (item.name || "").toLowerCase();
  const id   = (item.id || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const specs = (item.specs || []).join(" ").toLowerCase();

  if (name.includes(query))  return 3;
  if (id.includes(query))    return 2;
  if (desc.includes(query) || specs.includes(query)) return 1;
  return 0;
}

function renderAll() {
  const adminBar = document.getElementById("adminBar");
  if (adminBar) adminBar.classList.toggle("open", adminMode);

  const query    = (typeof getSearchQuery === "function") ? getSearchQuery() : "";
  const maxPrice = (typeof getMaxPrice    === "function") ? getMaxPrice()    : Infinity;

  // Category definitions in default display order
  const SECTIONS = [
    { key: "switches", items: INVENTORY.switches,  gridId: "switchList",  sectionId: "section-switches", renderFn: renderProductCard },
    { key: "games",    items: INVENTORY.games,      gridId: "gamesGrid",   sectionId: "section-games",    renderFn: renderProductCard },
    { key: "consoles", items: INVENTORY.consoles,   gridId: "consoleList", sectionId: "section-consoles", renderFn: renderProductCard },
    { key: "laptops",  items: INVENTORY.laptops,    gridId: "laptopList",  sectionId: "section-laptops",  renderFn: renderProductCard },
  ];

  // When there's a search query, score each section by its best item score
  // so the most relevant category floats to the top of the DOM.
  let orderedSections = [...SECTIONS];
  if (query) {
    orderedSections = orderedSections.map(sec => {
      const bestScore = sec.items.reduce((best, item) => Math.max(best, searchScore(item, query)), 0);
      return { ...sec, bestScore };
    }).sort((a, b) => b.bestScore - a.bestScore);
  }

  // Reorder sections in DOM to match search relevance
  const mainEl = document.querySelector("main") || document.body;
  const sectionEls = {};
  SECTIONS.forEach(sec => {
    const el = document.getElementById(sec.sectionId);
    if (el) sectionEls[sec.key] = el;
  });

  if (query) {
    // Find a reference node to insert before (first of the original sections)
    const firstSection = document.getElementById(SECTIONS[0].sectionId);
    if (firstSection && firstSection.parentNode) {
      orderedSections.forEach(sec => {
        const el = sectionEls[sec.key];
        if (el) firstSection.parentNode.insertBefore(el, firstSection);
      });
    }
  } else {
    // Restore original order
    const firstSection = document.getElementById(SECTIONS[0].sectionId);
    if (firstSection && firstSection.parentNode) {
      SECTIONS.forEach(sec => {
        const el = sectionEls[sec.key];
        if (el) firstSection.parentNode.appendChild(el);
      });
    }
  }

  // Render each section
  orderedSections.forEach(sec => {
    const gridEl    = document.getElementById(sec.gridId);
    const sectionEl = document.getElementById(sec.sectionId);
    if (!gridEl) return;

    // Category filter
    if (activeCategory !== "all" && activeCategory !== sec.key) {
      if (sectionEl) sectionEl.style.display = "none";
      return;
    }

    // Search + price filter
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

  // Refresh button states after any re-render
  if (typeof updateAddToCartButtons === "function") updateAddToCartButtons();
}

// ============================================================
// PRODUCT DETAIL PAGE LOGIC
// ============================================================

function renderProductPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const container = document.getElementById("productContent");
  const adminBar = document.getElementById("adminBar");

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

  let actionHtml = "";
  if (item.sold) {
    actionHtml = `<span class="badge badge-lg badge-danger" style="font-size:15px;padding:8px 16px;">Sold</span>`;
  } else {
    actionHtml = `<button class="btn btn-brand btn-lg" onclick="startAddToCart('${item.id}', event)">Add to cart — $${item.price}</button>`;
  }

  let adminHtml = "";
  if (adminMode) {
    adminHtml = `<button class="admin-item-toggle ${item.sold ? 'is-sold' : ''}" onclick="toggleSold('${item.id}')">
      ${item.sold ? "Mark available" : "Mark sold"}
    </button>`;
  }

  // Condition shown on product detail page (always, including games)
  const conditionHtml = item.condition
    ? `<span class="card-condition-badge condition-${(item.condition||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}">${item.condition} Condition</span>`
    : "";

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
