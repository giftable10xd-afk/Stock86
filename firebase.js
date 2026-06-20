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

// ── Public save functions called by app.js ────────────────────

window.fbSaveSoldState = function() {
  set(ref(db, "soldState"), buildSoldMap())
    .catch(e => console.error("Firebase soldState write failed:", e));
};

window.fbSaveInventory = function(callback) {
  set(ref(db, "inventory"), buildInventorySnapshot())
    .then(() => {
      set(ref(db, "soldState"), buildSoldMap());
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
