// ============================================================
// STOCK/86 — Firebase Realtime Database sync
// Firebase is the single source of truth.
// data.js products are seeded into Firebase on first run only.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, get }
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

// ── Merge helper: combine the latest server state with this device's
//    local INVENTORY so a save from one device can never delete or
//    overwrite products that another device added in the meantime.
//    `removedIds` lists IDs this device is intentionally deleting right
//    now, so they aren't resurrected by merging in the server's copy. ──

function mergeSnapshots(serverSnap, localSnap, removedIds) {
  const removed = new Set(removedIds || []);
  const merged = {};
  CATS.forEach(cat => {
    const serverList = (serverSnap && serverSnap[cat]) ? Object.values(serverSnap[cat]) : [];
    const localList  = (localSnap  && localSnap[cat])  ? Object.values(localSnap[cat])  : [];

    const byId = new Map();
    // Start with whatever the server currently has (covers items added by other devices).
    serverList.forEach(item => { if (item && item.id && !removed.has(item.id)) byId.set(item.id, item); });
    // Layer this device's local items on top — adds new ones, updates existing ones,
    // but never removes an item this device doesn't know about.
    localList.forEach(item => { if (item && item.id && !removed.has(item.id)) byId.set(item.id, item); });

    merged[cat] = Array.from(byId.values());
  });
  return merged;
}

// ── Public save functions called by app.js ────────────────────

window.fbSaveSoldState = function() {
  set(ref(db, "soldState"), buildSoldMap())
    .catch(e => console.error("Firebase soldState write failed:", e));
};

// removedIds (optional): IDs this device just deleted locally, so the merge
// doesn't bring them back in from the server's still-current copy.
window.fbSaveInventory = function(callback, removedIds) {
  // Always re-fetch the latest server state right before writing, then merge,
  // so a save from this device can never clobber a product another device
  // added since this device's last sync.
  get(ref(db, "inventory"))
    .then(serverSnap => {
      const merged = mergeSnapshots(serverSnap.exists() ? serverSnap.val() : null, buildInventorySnapshot(), removedIds);

      return set(ref(db, "inventory"), merged).then(() => {
        // Reflect the merged result locally too, so this device's own view
        // immediately includes anything it just merged in from the server.
        CATS.forEach(cat => { INVENTORY[cat] = merged[cat]; });
        return set(ref(db, "soldState"), buildSoldMap());
      });
    })
    .then(() => {
      if (typeof callback === "function") callback();
    })
    .catch(e => {
      console.error("Firebase inventory write failed:", e);
      alert("Save failed — check your internet connection.");
    });
};

// ── Boot ──────────────────────────────────────────────────────

async function fbInit() {
  try {
    const invSnap = await get(ref(db, "inventory"));

    if (invSnap.exists()) {
      // Firebase has data → use it as source of truth
      applySnapshot(invSnap.val());

      // Also apply sold state on top
      const soldSnap = await get(ref(db, "soldState"));
      if (soldSnap.exists()) applySoldMap(soldSnap.val());

    } else {
      // First ever run — seed Firebase from data.js
      await set(ref(db, "inventory"), buildInventorySnapshot());
      await set(ref(db, "soldState"), buildSoldMap());
    }

    // Re-render with Firebase data (replaces the initial data.js render)
    if (typeof renderAll === "function") renderAll();
    if (typeof renderProductPage === "function") renderProductPage();

    // Live listeners — update instantly when any device makes a change
    onValue(ref(db, "inventory"), snapshot => {
      if (snapshot.exists()) {
        applySnapshot(snapshot.val());
        if (typeof renderAll === "function") renderAll();
        if (typeof renderProductPage === "function") renderProductPage();
      }
    });

    onValue(ref(db, "soldState"), snapshot => {
      if (snapshot.exists()) {
        applySoldMap(snapshot.val());
        if (typeof renderAll === "function") renderAll();
        if (typeof renderProductPage === "function") renderProductPage();
      }
    });

  } catch (e) {
    console.error("Firebase init error:", e);
    // Fallback: just render data.js as-is
    if (typeof renderAll === "function") renderAll();
    if (typeof renderProductPage === "function") renderProductPage();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fbInit);
} else {
  fbInit();
}
