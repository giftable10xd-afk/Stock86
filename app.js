// ============================================================
// STOCK/86 — APP LOGIC
// ============================================================

const STORAGE_KEY = "stock86_sold_state_v1";

let cart = [];
let adminMode = false;

// ---------- ICONS (simple line icons, category placeholders) ----------

const ICONS = {
  switch: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="6" height="12" rx="2"/><rect x="16" y="6" width="6" height="12" rx="2"/><rect x="8" y="4" width="8" height="16" rx="1"/><circle cx="5" cy="10" r="0.8" fill="currentColor"/><circle cx="19" cy="14" r="0.8" fill="currentColor"/></svg>`,
  console: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="9" width="18" height="7" rx="2"/><circle cx="7" cy="12.5" r="1"/><circle cx="10" cy="12.5" r="1"/><line x1="15" y1="11" x2="17" y2="11"/><line x1="15" y1="14" x2="17" y2="14"/></svg>`,
  handheld: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7" y="6" width="10" height="8" rx="1"/><circle cx="9" cy="17.5" r="1"/><circle cx="15" cy="17.5" r="1"/></svg>`,
  game: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>`,
  laptop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="11" rx="1"/><path d="M2 19h20l-2-3H4l-2 3z"/></svg>`,
  sold: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><line x1="7" y1="7" x2="17" y2="17"/></svg>`
};

// ---------- PERSISTENCE FOR SOLD STATE ----------

function allLists() {
  return [INVENTORY.switches, INVENTORY.games, INVENTORY.consoles, INVENTORY.laptops];
}

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
  } catch (e) {
    console.warn("Could not load sold state:", e);
  }
}

function saveSoldState() {
  const soldMap = {};
  allLists().forEach(list => list.forEach(item => { soldMap[item.id] = item.sold; }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(soldMap));
  } catch (e) {
    console.warn("Could not save sold state:", e);
  }
}

function findItemById(id) {
  for (const list of allLists()) {
    const found = list.find(i => i.id === id);
    if (found) return found;
  }
  return null;
}

function toggleSold(id) {
  const item = findItemById(id);
  if (!item) return;
  item.sold = !item.sold;
  saveSoldState();
  renderAll();
}

// ---------- RENDERING: PRODUCT CARDS ----------

function renderProductCard(item, opts) {
  opts = opts || {};
  const soldClass = item.sold ? "is-sold" : "";
  const icon = ICONS[item.icon] || ICONS.console;

  const specsHtml = (item.specs || [])
    .map(s => `<span class="badge badge-default badge-gray">${s}</span>`)
    .join("");

  let priceActionHtml = "";
  if (item.sold) {
    priceActionHtml = `<span class="badge badge-lg badge-danger">Sold</span>`;
  } else {
    priceActionHtml = `<button class="btn btn-brand btn-sm" onclick="addToCart('${item.id}', event)">Add to cart</button>`;
  }

  let adminHtml = "";
  if (adminMode) {
    adminHtml = `<button class="admin-item-toggle ${item.sold ? 'is-sold' : ''}" onclick="event.stopPropagation(); toggleSold('${item.id}')">
      ${item.sold ? "Mark available" : "Mark sold"}
    </button>`;
  }

  let addonHtml = "";
  if (opts.hasControllerAddon && !item.sold) {
    addonHtml = renderControllerAddonBlock(item.id);
  }

  const hasDetail = item.description || (item.specs && item.specs.length) || adminHtml || addonHtml;

  return `
    <div class="card ${soldClass}" id="card-${item.id}">
      <div class="card-media">
        ${icon}
        ${item.sold ? `<div class="sold-overlay"><span class="badge badge-lg badge-danger">Sold</span></div>` : ""}
      </div>
      <div class="card-body">
        <span class="card-sku">${item.id}</span>
        <h3 class="card-title">${item.name}</h3>
        ${item.condition ? `<span class="card-condition">${item.condition}</span>` : ""}
        <div class="card-price-row">
          <span class="card-price"><span class="currency">$</span>${item.price}</span>
          ${priceActionHtml}
        </div>
        ${hasDetail ? `
          <button class="detail-toggle" onclick="toggleExpand('${item.id}')" id="toggle-${item.id}">
            <span>Details</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        ` : ""}
      </div>
      ${hasDetail ? `
        <div class="card-detail" id="detail-${item.id}">
          ${item.description ? `<p>${item.description}</p>` : ""}
          <div class="card-specs" style="margin-bottom:12px;">${specsHtml}</div>
          ${addonHtml}
          ${adminHtml}
        </div>
      ` : ""}
    </div>
  `;
}

function renderControllerAddonBlock(switchId) {
  const pro = INVENTORY.controllerAddons.pro;
  const wired = INVENTORY.controllerAddons.wired;
  const editionOptions = pro.editions.map(e => `<option value="${e}">${e}</option>`).join("");

  return `
    <div class="addon-block">
      <div class="addon-row">
        <span class="addon-label">${pro.label} <span class="addon-price">+$${pro.price}</span></span>
        <div class="addon-controls">
          <select class="input" id="pro-edition-${switchId}">${editionOptions}</select>
          <button class="btn btn-tertiary btn-sm" onclick="event.stopPropagation(); addProControllerAddon('${switchId}')">Add</button>
        </div>
      </div>
      <div class="addon-row">
        <span class="addon-label">${wired.label} <span class="addon-price">+$${wired.price}</span></span>
        <div class="addon-controls">
          <button class="btn btn-tertiary btn-sm" onclick="event.stopPropagation(); addWiredControllerAddon('${switchId}')">Add</button>
        </div>
      </div>
    </div>
  `;
}

function toggleExpand(id) {
  const detail = document.getElementById(`detail-${id}`);
  const toggle = document.getElementById(`toggle-${id}`);
  if (!detail) return;
  const isOpen = detail.classList.toggle("open");
  if (toggle) toggle.classList.toggle("open", isOpen);
}

// ---------- MAIN RENDER ----------

function renderAll() {
  document.getElementById("switchList").innerHTML =
    INVENTORY.switches.map(i => renderProductCard(i, { hasControllerAddon: true })).join("");

  document.getElementById("gamesGrid").innerHTML =
    INVENTORY.games.map(i => renderProductCard(i)).join("");

  document.getElementById("consoleList").innerHTML =
    INVENTORY.consoles.map(i => renderProductCard(i)).join("");

  document.getElementById("laptopList").innerHTML =
    INVENTORY.laptops.map(i => renderProductCard(i)).join("");

  document.getElementById("adminBar").classList.toggle("open", adminMode);
}

// ---------- CART ----------

function addToCart(id, evt) {
  if (evt) evt.stopPropagation();
  const item = findItemById(id);
  if (!item || item.sold) return;
  cart.push({ lineId: `${id}-${Date.now()}`, sourceId: id, name: item.name, price: item.price, meta: "" });
  renderCart();
  openDrawer();
}

function addProControllerAddon(switchId) {
  const switchItem = findItemById(switchId);
  if (!switchItem || switchItem.sold) return;
  const editionSelect = document.getElementById(`pro-edition-${switchId}`);
  const edition = editionSelect ? editionSelect.value : "";
  const pro = INVENTORY.controllerAddons.pro;
  cart.push({
    lineId: `addon-pro-${switchId}-${Date.now()}`,
    sourceId: `addon-pro-${switchId}`,
    name: `Pro Controller — ${edition}`,
    price: pro.price,
    meta: `Add-on with ${switchItem.name}`
  });
  renderCart();
  openDrawer();
}

function addWiredControllerAddon(switchId) {
  const switchItem = findItemById(switchId);
  if (!switchItem || switchItem.sold) return;
  const wired = INVENTORY.controllerAddons.wired;
  cart.push({
    lineId: `addon-wired-${switchId}-${Date.now()}`,
    sourceId: `addon-wired-${switchId}`,
    name: wired.label,
    price: wired.price,
    meta: `Add-on with ${switchItem.name}`
  });
  renderCart();
  openDrawer();
}

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
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(url, "_blank");
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
    renderAll();
  } else {
    alert("Wrong code.");
  }
}

function exitAdmin() {
  adminMode = false;
  renderAll();
}

// ---------- EVENT WIRING ----------

document.addEventListener("DOMContentLoaded", () => {
  loadSoldState();
  renderAll();
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
});
