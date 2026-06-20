// ============================================================
// STOCK/86 — Firebase Realtime Database sync
// Firebase is the single source of truth.
// data.js products are seeded into Firebase on first run only.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyB5RLNxUWE2iG_M9sAugOxYoQdDA2CBRFg",
  authDomain:        "stock86-200f4.firebaseapp.com",
  databaseURL:       "https://stock86-200f4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "stock86-200f4",
  storageBucket:     "stock86-200f4.firebasestorage.app",
  messagingSenderId: "709360957488",
  appId:             "1:709360957488:web:94d6947f526a352c2795f5"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

const CATS = ["switches", "games", "consoles", "laptops", "phones"];

// ── Local cache (instant paint + no "Loading…" blink on revisits) ──
// We mirror every confirmed Firebase snapshot into localStorage. On the
// very next page load (e.g. tapping a product card, or coming back from
// product.html) we paint from this cache immediately — including any
// admin-added items — instead of waiting on a fresh network round trip.
// The live onValue() listener still re-syncs right after, silently.

const CACHE_KEY = "stock86_inventory_cache_v1";

function readInventoryCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function writeInventoryCache(snap) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(snap)); }
  catch (e) { /* ignore quota errors — cache is a nice-to-have */ }
}

// ── Serialise current INVENTORY into a plain object ───────────

function buildInventorySnapshot() {
  const snap = {};
  CATS.forEach(cat => {
    snap[cat] = (INVENTORY[cat] || []).map(item => ({
      id:          item.id,
      name:        item.name,
      price:       item.price,
      condition:   item.condition || null,
      sold:        !!item.sold,
      icon:        item.icon || "switch",
      image:       item.image || "",
      description: item.description || "",
      specs:       item.specs || [],
      ...(item.hasControllerAddon ? { hasControllerAddon: true } : {})
    }));
  });
  return snap;
}

function buildSoldMap() {
  const map = {};
  CATS.forEach(cat => {
    (INVENTORY[cat] || []).forEach(item => { map[item.id] = !!item.sold; });
  });
  return map;
}

// ── Apply Firebase snapshot → INVENTORY (Firebase wins entirely) ─

function applySnapshot(snap, opts) {
  if (!snap) return;
  CATS.forEach(cat => {
    if (snap[cat]) {
      // Firebase is source of truth — replace local list entirely
      INVENTORY[cat] = Object.values(snap[cat]);
    }
  });
  // Keep the local cache fresh so the next page load (or the back/forward
  // trip from product.html) can paint instantly, admin items included.
  if (!opts || !opts.fromCache) writeInventoryCache(snap);
}

const SOLD_CACHE_KEY = "stock86_sold_cache_v1";

function readSoldCache() {
  try {
    const raw = localStorage.getItem(SOLD_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function writeSoldCache(map) {
  try { localStorage.setItem(SOLD_CACHE_KEY, JSON.stringify(map)); }
  catch (e) { /* ignore quota errors */ }
}

function applySoldMap(map, opts) {
  if (!map) return;
  CATS.forEach(cat => {
    (INVENTORY[cat] || []).forEach(item => {
      if (map.hasOwnProperty(item.id)) item.sold = map[item.id];
    });
  });
  if (!opts || !opts.fromCache) writeSoldCache(map);
}

// ── Public save functions called by app.js ────────────────────

window.fbSaveSoldState = function() {
  const map = buildSoldMap();
  writeSoldCache(map);
  set(ref(db, "soldState"), map)
    .catch(e => console.error("Firebase soldState write failed:", e));
};

// removedIds (optional): IDs this device just deleted locally, so they're
// written out as removed rather than possibly reappearing.
window.fbSaveInventory = function(callback, removedIds) {
  const removed = new Set(removedIds || []);
  if (removed.size) {
    CATS.forEach(cat => {
      INVENTORY[cat] = (INVENTORY[cat] || []).filter(item => !removed.has(item.id));
    });
  }

  // INVENTORY is kept continuously up to date by the onValue() listener
  // (never a one-shot, possibly-stale get()), so it's already the most
  // current view of the server plus this device's own local edit.
  const snapshot = buildInventorySnapshot();

  // Cache immediately (don't wait on the network round trip) so that if
  // the admin taps straight into the new product, or simply navigates
  // away and back, this device already has it — no "Loading…" state.
  writeInventoryCache(snapshot);
  writeSoldCache(buildSoldMap());

  set(ref(db, "inventory"), snapshot)
    .then(() => set(ref(db, "soldState"), buildSoldMap()))
    .then(() => {
      if (typeof callback === "function") callback();
    })
    .catch(e => {
      console.error("Firebase inventory write failed:", e);
      alert("Save failed — check your internet connection.");
    });
};

// ── Boot ──────────────────────────────────────────────────────
// IMPORTANT: we deliberately do NOT use get() for the initial load.
// Firebase's get() can return a stale locally-cached value instead of
// contacting the server, with no error and no way to tell it happened.
// onValue() is the reliable path: it always fires with the current
// server value on first attach, then keeps firing on every change.

let seededIfEmpty = false;
window.fbInventoryReady = false;

function fbInit() {
  let inventoryReady = false;
  let soldReady = false;

  // ── Instant paint from cache ──────────────────────────────────
  // If we have a cached snapshot from a previous visit (this device),
  // apply it and render right away — before Firebase even responds.
  // This is what makes admin-added items appear immediately instead
  // of behind a "Loading…" state, and removes the blink on navigation
  // since product.html already has real content for its first paint.
  const cached = readInventoryCache();
  if (cached) {
    applySnapshot(cached, { fromCache: true });
    const cachedSold = readSoldCache();
    if (cachedSold) applySoldMap(cachedSold, { fromCache: true });
    inventoryReady = true;
    window.fbInventoryReady = true;
    if (typeof renderAll === "function") renderAll();
    if (typeof renderProductPage === "function") renderProductPage();
    // Grid contents may have just changed (e.g. an admin-added item now
    // exists), which can shift page height — re-apply the remembered
    // scroll position so "← All listings" still lands in the same spot.
    if (typeof restoreIndexScroll === "function") restoreIndexScroll();
  }

  let scrollRestoredOnce = !!cached; // already restored once above if we had a cache

  function rerenderIfReady() {
    if (!inventoryReady) return; // wait for at least the first real inventory snapshot
    if (typeof renderAll === "function") renderAll();
    if (typeof renderProductPage === "function") renderProductPage();
    if (!scrollRestoredOnce) {
      scrollRestoredOnce = true;
      if (typeof restoreIndexScroll === "function") restoreIndexScroll();
    }
  }

  onValue(ref(db, "inventory"), snapshot => {
    if (snapshot.exists()) {
      applySnapshot(snapshot.val());
      inventoryReady = true;
      window.fbInventoryReady = true;
      rerenderIfReady();
    } else if (!seededIfEmpty) {
      // First ever run — seed Firebase from data.js, only once.
      seededIfEmpty = true;
      set(ref(db, "inventory"), buildInventorySnapshot())
        .then(() => set(ref(db, "soldState"), buildSoldMap()))
        .catch(e => console.error("Firebase seed failed:", e));
      // The set() above will itself trigger this same onValue listener
      // again with the real data, so no manual render needed here.
    }
  }, e => {
    console.error("Firebase inventory listener error:", e);
    showLiveDataErrorBanner(e);
    inventoryReady = true; // fall back to data.js so the page isn't stuck blank
    window.fbInventoryReady = true;
    rerenderIfReady();
  });

  onValue(ref(db, "soldState"), snapshot => {
    if (snapshot.exists()) {
      applySoldMap(snapshot.val());
    }
    soldReady = true;
    rerenderIfReady();
  }, e => {
    console.error("Firebase soldState listener error:", e);
    soldReady = true;
    rerenderIfReady();
  });
}

function showLiveDataErrorBanner(e) {
  if (document.getElementById("fbErrorBanner")) return;
  const banner = document.createElement("div");
  banner.id = "fbErrorBanner";
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#CC0C39;color:#fff;font-size:13px;padding:8px 12px;text-align:center;";
  banner.textContent = "Live data failed to load (" + (e && e.message ? e.message : "unknown error") + "). Showing default listing only.";
  document.body.appendChild(banner);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fbInit);
} else {
  fbInit();
}
