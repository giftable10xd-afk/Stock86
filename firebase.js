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

function applySnapshot(snap) {
  if (!snap) return;
  CATS.forEach(cat => {
    if (snap[cat]) {
      // Firebase is source of truth — replace local list entirely
      INVENTORY[cat] = Object.values(snap[cat]);
    }
  });
}

function applySoldMap(map) {
  if (!map) return;
  CATS.forEach(cat => {
    (INVENTORY[cat] || []).forEach(item => {
      if (map.hasOwnProperty(item.id)) item.sold = map[item.id];
    });
  });
}

// ── Public save functions called by app.js ────────────────────

window.fbSaveSoldState = function() {
  set(ref(db, "soldState"), buildSoldMap())
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

  function rerenderIfReady() {
    if (!inventoryReady) return; // wait for at least the first real inventory snapshot
    if (typeof renderAll === "function") renderAll();
    if (typeof renderProductPage === "function") renderProductPage();
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
