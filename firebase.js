// ============================================================
// STOCK/86 — Firebase Realtime Database sync
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

// ── Helpers ──────────────────────────────────────────────────

const CATS = ["switches", "games", "consoles", "laptops", "phones"];

function allLists() {
  return CATS.map(c => INVENTORY[c] || []);
}

function findItem(id) {
  for (const list of allLists()) {
    const f = list.find(i => i.id === id);
    if (f) return f;
  }
  return null;
}

// Strip base64 images from the snapshot for the sold/state node
// (images live in the inventory node only)
function buildSoldMap() {
  const map = {};
  allLists().forEach(list => list.forEach(item => { map[item.id] = !!item.sold; }));
  return map;
}

// Build a clean inventory snapshot (safe to store — images included as base64)
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

// ── Save sold state ───────────────────────────────────────────

window.fbSaveSoldState = function() {
  set(ref(db, "soldState"), buildSoldMap())
    .catch(e => console.error("Firebase soldState write failed:", e));
};

// ── Save full inventory ───────────────────────────────────────

window.fbSaveInventory = function(callback) {
  const snap = buildInventorySnapshot();
  set(ref(db, "inventory"), snap)
    .then(() => {
      // Also keep soldState in sync
      set(ref(db, "soldState"), buildSoldMap());
      if (typeof callback === "function") callback();
    })
    .catch(e => {
      console.error("Firebase inventory write failed:", e);
      alert("Save failed — check your internet connection.");
    });
};

// ── Apply snapshot from Firebase into INVENTORY ───────────────

function applyInventorySnapshot(snap) {
  if (!snap) return;
  CATS.forEach(cat => {
    if (snap[cat]) {
      // Merge: Firebase is source of truth for items it knows about.
      // Items only in data.js (no Firebase record yet) are kept.
      const fbItems = Object.values(snap[cat]);
      const fbIds   = new Set(fbItems.map(i => i.id));
      const localOnly = (INVENTORY[cat] || []).filter(i => !fbIds.has(i.id));
      INVENTORY[cat] = [...fbItems, ...localOnly];
    }
  });
}

function applySoldMap(map) {
  if (!map) return;
  allLists().forEach(list => {
    list.forEach(item => {
      if (map.hasOwnProperty(item.id)) item.sold = map[item.id];
    });
  });
}

// ── Boot: load then subscribe to live updates ─────────────────

async function fbInit() {
  try {
    // 1. Load inventory from Firebase (products added via admin)
    const invSnap = await get(ref(db, "inventory"));
    if (invSnap.exists()) applyInventorySnapshot(invSnap.val());

    // 2. Load sold state
    const soldSnap = await get(ref(db, "soldState"));
    if (soldSnap.exists()) applySoldMap(soldSnap.val());

    // 3. Render the page now that Firebase data is merged in
    if (typeof renderAll === "function") renderAll();
    if (typeof renderProductPage === "function") renderProductPage();

    // 4. Subscribe to live sold-state changes (real-time across devices)
    onValue(ref(db, "soldState"), snapshot => {
      if (snapshot.exists()) {
        applySoldMap(snapshot.val());
        if (typeof renderAll === "function") renderAll();
        if (typeof renderProductPage === "function") renderProductPage();
      }
    });

    // 5. Subscribe to live inventory changes
    onValue(ref(db, "inventory"), snapshot => {
      if (snapshot.exists()) {
        applyInventorySnapshot(snapshot.val());
        if (typeof renderAll === "function") renderAll();
      }
    });

  } catch (e) {
    console.error("Firebase init error:", e);
    // Fall back to rendering with local data.js only
    if (typeof renderAll === "function") renderAll();
    if (typeof renderProductPage === "function") renderProductPage();
  }
}

// Wait for DOM + data.js to be ready, then init
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", fbInit);
} else {
  fbInit();
}
