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
  // Refresh whichever page we're on
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
    priceActionHtml = `<button class="btn btn-brand btn-sm" onclick="startAddToCart('${item.id}', event)">Add to cart</button>`;
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
        ${item.condition ? `<span class="card-condition">${item.condition}</span>` : ""}
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
// For Switch products: shown before the item is added to cart.
// The buyer chooses No controller / Pro / Wired, then the item
// (+ optional addon) goes into the cart together.

let pendingSwitchId = null;

function startAddToCart(id, evt) {
  if (evt) evt.stopPropagation();
  const item = findItemById(id);
  if (!item || item.sold) return;

  if (item.hasControllerAddon) {
    // Show the controller choice modal first
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
  // type: "none" | "pro" | "wired"
  const id = pendingSwitchId;
  closeControllerModal();
  if (!id) return;

  const item = findItemById(id);
  if (!item || item.sold) return;

  // Always add the main item
  cart.push({
    lineId: `${id}-${Date.now()}`,
    sourceId: id,
    name: item.name,
    price: item.price,
    meta: ""
  });

  // Add controller add-on if chosen
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
  openDrawer();
}

function directAddToCart(id) {
  const item = findItemById(id);
  if (!item || item.sold) return;
  cart.push({ lineId: `${id}-${Date.now()}`, sourceId: id, name: item.name, price: item.price, meta: "" });
  renderCart();
  openDrawer();
}

// ---------- CART ----------

function removeFromCart(lineId) {
  cart = cart.filter(line => line.lineId !== lineId);
  renderCart();
}

function cartSubtotal() {
  return cart.reduce((sum, line) => sum + line.price, 0);
}

function renderCart() {
  const body = document.getElementById("drawerBody");
  const foot = document.getElementById("drawerFoot");
  const countEl = document.getElementById("cartCount");
  if (!body) return;
  countEl.textContent = cart.length;

  if (cart.length === 0) {
    body.innerHTML = `<div class="drawer-empty">Your cart is empty.<br>Browse the inventory and add something.</div>`;
    foot.style.display = "none";
    return;
  }

  body.innerHTML = cart.map(line => `
    <div class="cart-line">
      <div>
        <div class="cart-line-name">${line.name}</div>
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

// ---------- COMMON EVENT WIRING (shared between pages) ----------

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

  // Controller modal buttons
  document.getElementById("controllerModalOverlay").addEventListener("click", (e) => {
    if (e.target === document.getElementById("controllerModalOverlay")) closeControllerModal();
  });

  // Hamburger / side menu (index page only)
  const menuOpenBtn = document.getElementById("menuOpenBtn");
  if (menuOpenBtn) {
    menuOpenBtn.addEventListener("click", openSideMenu);
    document.getElementById("sideMenuCloseBtn").addEventListener("click", closeSideMenu);
    document.getElementById("sideMenuOverlay").addEventListener("click", closeSideMenu);
  }

  // Search input (index page only)
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => onSearchInput(e.target.value));
  }

  // Filter panel (index page only)
  const filterToggleBtn = document.getElementById("filterToggleBtn");
  if (filterToggleBtn) {
    filterToggleBtn.addEventListener("click", toggleFilterPanel);
    document.getElementById("filterSlider").addEventListener("input", (e) => onFilterSliderInput(e.target.value));
    document.getElementById("filterClearBtn").addEventListener("click", clearFilter);
  }
}

// ============================================================
// INDEX PAGE LOGIC
// ============================================================

// Category filter state: "all" | "switches" | "games" | "consoles" | "laptops"
let activeCategory = "all";
let searchQuery = "";
let maxPriceFilter = null; // null = no filter applied

const SECTION_META = [
  { sectionId: "sectionSwitches", gridId: "switchList",  cat: "switches", items: () => INVENTORY.switches },
  { sectionId: "sectionGames",    gridId: "gamesGrid",    cat: "games",    items: () => INVENTORY.games },
  { sectionId: "sectionConsoles", gridId: "consoleList",  cat: "consoles", items: () => INVENTORY.consoles },
  { sectionId: "sectionLaptops",  gridId: "laptopList",   cat: "laptops",  items: () => INVENTORY.laptops }
];

function setCategory(cat) {
  activeCategory = cat;
  // Update side menu link states
  document.querySelectorAll(".side-menu-link").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  closeSideMenu();
  renderAll();
}

// ---- search matching helpers ----

function itemMatchesQuery(item, query) {
  if (!query) return true;
  const haystack = [
    item.name,
    item.id,
    item.condition || "",
    ...(item.specs || [])
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

function sectionMatchScore(meta, query) {
  if (!query) return 0;
  const items = meta.items();
  let score = 0;
  items.forEach(item => {
    const name = item.name.toLowerCase();
    if (name.includes(query)) score += 2;       // direct name match
    else if (itemMatchesQuery(item, query)) score += 1; // spec/condition/id match
  });
  return score;
}

function applyFilters(items) {
  const q = searchQuery.trim().toLowerCase();
  return items.filter(item => {
    if (q && !itemMatchesQuery(item, q)) return false;
    if (maxPriceFilter !== null && item.price > maxPriceFilter) return false;
    return true;
  });
}

function onSearchInput(value) {
  searchQuery = value;
  renderAll();
}

// ---- filter panel (price) ----

function toggleFilterPanel() {
  const panel = document.getElementById("filterPanel");
  const btn = document.getElementById("filterToggleBtn");
  const willOpen = !panel.classList.contains("open");
  panel.classList.toggle("open", willOpen);
  btn.classList.toggle("active", willOpen || maxPriceFilter !== null);
}

function onFilterSliderInput(value) {
  maxPriceFilter = parseInt(value, 10);
  document.getElementById("filterRangeVal").textContent = `$${maxPriceFilter}`;
  document.getElementById("filterToggleBtn").classList.add("active");
  renderAll();
}

function clearFilter() {
  maxPriceFilter = null;
  const slider = document.getElementById("filterSlider");
  slider.value = slider.max;
  document.getElementById("filterRangeVal").textContent = `$${slider.max}`;
  document.getElementById("filterToggleBtn").classList.remove("active");
  renderAll();
}

// ---- main render ----

function renderAll() {
  const adminBar = document.getElementById("adminBar");
  if (adminBar) adminBar.classList.toggle("open", adminMode);

  const q = searchQuery.trim().toLowerCase();
  let visibleCount = 0;

  // Render each section's grid + count, track relevance score for ordering
  const ranked = SECTION_META.map(meta => {
    const sectionEl = document.getElementById(meta.sectionId);
    const gridEl = document.getElementById(meta.gridId);
    if (!sectionEl || !gridEl) return { ...meta, sectionEl: null, score: -1, shouldShow: false };

    const categoryMatches = activeCategory === "all" || activeCategory === meta.cat;
    const allItems = meta.items();
    const filtered = applyFilters(allItems);
    const shouldShow = categoryMatches && (!q || filtered.length > 0);

    if (shouldShow) {
      gridEl.innerHTML = filtered.length
        ? filtered.map(renderProductCard).join("")
        : `<div class="no-results">No matches in this category.</div>`;
      visibleCount += filtered.length;

      const countEl = sectionEl.querySelector(".count");
      if (countEl) {
        const avail = filtered.filter(i => !i.sold).length;
        countEl.textContent = q || maxPriceFilter !== null
          ? `${filtered.length} match${filtered.length === 1 ? "" : "es"}`
          : `${avail} of ${allItems.length} available`;
      }
    }

    sectionEl.style.display = shouldShow ? "" : "none";
    const score = sectionMatchScore(meta, q);
    return { ...meta, sectionEl, score, shouldShow };
  });

  // Reorder sections by relevance when searching, so e.g. "mac" brings
  // Laptops to the top because MacBook lives there — even though the
  // Laptops section is otherwise last in the page.
  const root = document.getElementById("sectionsRoot");
  if (root) {
    const ordered = q
      ? [...ranked].sort((a, b) => b.score - a.score)
      : ranked;
    ordered.forEach(meta => {
      if (meta.sectionEl) root.appendChild(meta.sectionEl);
    });
    // Re-stripe alternating backgrounds based on final visual order
    let stripeIndex = 0;
    ordered.forEach(meta => {
      if (!meta.sectionEl || !meta.shouldShow) return;
      meta.sectionEl.classList.remove("bg-soft", "bg-secondary");
      meta.sectionEl.classList.add(stripeIndex % 2 === 0 ? "bg-soft" : "bg-secondary");
      stripeIndex++;
    });
  }

  // Global "nothing found anywhere" message
  let globalEmpty = document.getElementById("globalNoResults");
  if (q && visibleCount === 0) {
    const safeQuery = searchQuery.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
    if (!globalEmpty) {
      globalEmpty = document.createElement("div");
      globalEmpty.id = "globalNoResults";
      globalEmpty.className = "container";
      root.parentNode.insertBefore(globalEmpty, root);
    }
    globalEmpty.innerHTML = `<div class="no-results" style="padding:60px 20px;">No listings match "${safeQuery}".</div>`;
  } else if (globalEmpty) {
    globalEmpty.remove();
  }
}

// ---- side menu ----

function openSideMenu() {
  document.getElementById("sideMenu").classList.add("open");
  document.getElementById("sideMenuOverlay").classList.add("open");
}
function closeSideMenu() {
  document.getElementById("sideMenu").classList.remove("open");
  document.getElementById("sideMenuOverlay").classList.remove("open");
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

  // Update page title
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

  container.innerHTML = `
    <div class="product-detail-grid">
      <div class="product-detail-media ${item.image ? 'has-photo' : ''} ${item.sold ? 'is-sold' : ''}">
        ${mediaHtml}
        ${item.sold ? `<div class="sold-overlay"><span class="badge badge-lg badge-danger">Sold</span></div>` : ""}
      </div>
      <div class="product-detail-info">
        <span class="card-sku">${item.id}</span>
        <h1 class="product-detail-title">${item.name}</h1>
        ${item.condition ? `<span class="card-condition" style="font-size:14px;">${item.condition}</span>` : ""}
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
