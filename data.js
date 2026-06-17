// ============================================================
// STOCK/86 — INVENTORY DATA
// Edit this file to add, remove, or change items, prices, or details.
// Each item needs a unique "id" — never reuse an id once it's been sold.
// "icon" controls which placeholder glyph shows on the card (no real
// product photos were supplied, so each category gets a simple icon).
// ============================================================

const INVENTORY = {

  switches: [
    {
      id: "SW-01",
      name: "Nintendo Switch (Modded) — 512GB",
      price: 200,
      condition: "Good — light scratches",
      sold: false,
      icon: "switch",
      description: "Modded Nintendo Switch with 512GB of storage. Comes with a carrying case and a free bag included as a gift.",
      specs: ["512GB modded", "Case included", "Free bag — gift"],
      hasControllerAddon: true
    },
    {
      id: "SW-02",
      name: "Nintendo Switch (Modded) — 256GB",
      price: 200,
      condition: "Like new",
      sold: false,
      icon: "switch",
      description: "Modded Nintendo Switch with 256GB of storage. Comes with a carrying case and a free bag included as a gift.",
      specs: ["256GB modded", "Case included", "Free bag — gift"],
      hasControllerAddon: true
    },
    {
      id: "SW-03",
      name: "Nintendo Switch OLED",
      price: 220,
      condition: "Like new — original box",
      sold: false,
      icon: "switch",
      description: "Nintendo Switch OLED in like-new condition, with its original box, a carrying case, and a free bag. Comes preloaded with 25 games split across two 64GB memory cards.",
      specs: ["Original box", "25 games preloaded", "2× 64GB cards (128GB)", "Free bag — gift"],
      hasControllerAddon: true
    }
  ],

  // Add-ons only available alongside a Switch purchase
  controllerAddons: {
    pro: {
      label: "Pro Controller",
      price: 15,
      editions: ["Super Smash Bros Edition", "Tears of the Kingdom Edition", "Splatoon Edition"]
    },
    wired: {
      label: "Wired / third-party wireless controller",
      price: 10,
      editions: null
    }
  },

  games: [
    { id: "GM-01", name: "Plants vs. Zombies", price: 20, sold: false, icon: "game" },
    { id: "GM-02", name: "Naruto Shippuden: Ultimate Ninja Storm 4", price: 20, sold: false, icon: "game" },
    { id: "GM-03", name: "Hogwarts Legacy", price: 20, sold: false, icon: "game" }
  ],

  consoles: [
    {
      id: "HC-01",
      name: "AYANEO AIR Pro — 1TB",
      price: 400,
      condition: "Like new",
      sold: false,
      icon: "handheld",
      description: "6-inch AMOLED screen, AMD Ryzen 7 series APU. A handheld gaming PC running Windows.",
      specs: ["1TB storage", "6\" AMOLED screen", "AMD Ryzen 7 series APU", "Charger + manual included"]
    },
    {
      id: "HC-02",
      name: "ASUS ROG Ally — Z1 Extreme",
      price: 450,
      condition: "Like new — original box",
      sold: false,
      icon: "handheld",
      description: "7-inch 120Hz touchscreen, AMD Z1 Extreme APU, runs Windows 11 with a built-in kickstand.",
      specs: ["16GB RAM / 512GB", "7\" 120Hz touchscreen", "Original box included", "65W charger + manual"]
    },
    {
      id: "HC-03",
      name: "Xbox One S — Fortnite Edition",
      price: 140,
      condition: "Like new — no original box",
      sold: false,
      icon: "console",
      description: "1TB Fortnite-themed Xbox One S console, includes one controller.",
      specs: ["1TB storage", "Fortnite-themed design", "1 controller included", "No original box"]
    },
    {
      id: "HC-04",
      name: "Xbox Series S",
      price: 200,
      condition: "Like new — no original box",
      sold: false,
      icon: "console",
      description: "512GB digital-only Xbox Series S, includes one controller.",
      specs: ["512GB digital-only", "1 controller included", "No original box"]
    }
  ],

  laptops: [
    {
      id: "LP-01",
      name: "MacBook Pro (2014)",
      price: 100,
      condition: "Good — works perfectly",
      sold: false,
      icon: "laptop",
      description: "2014 MacBook Pro, fully functional with no issues. Good cosmetic condition.",
      specs: ["8GB RAM", "256GB SSD", "Works perfectly"]
    }
  ]
};

// WhatsApp number orders are sent to (international format, no + or spaces)
const WHATSAPP_NUMBER = "9617655382" + "9"; // +961 76 553 829

// Flat delivery fee, Lebanon-wide
const DELIVERY_FEE = 10;

// Admin unlock code — change this to whatever you like
const ADMIN_CODE = "stock86";
