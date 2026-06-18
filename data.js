// ============================================================
// STOCK/86 — INVENTORY DATA
// ============================================================
// HOW TO ADD A NEW ITEM:
//
//   1. Find the right category below (switches / games / consoles / laptops)
//   2. Copy one of the existing blocks in that category
//   3. Paste it at the end of the list (before the closing ] )
//   4. Change EVERY field — especially give it a brand-new unique id
//   5. Upload the photo into the "assets" folder on GitHub
//   6. Save and push — Netlify will rebuild in ~30 seconds
//
// IDs: use the same prefix already in use for that category
//   switches  → SW-01, SW-02, …  next would be SW-04
//   games     → GM-01, GM-02, …  next would be GM-04
//   consoles  → HC-01, HC-02, …  next would be HC-05
//   laptops   → LP-01, LP-02, …  next would be LP-02
//
// PHOTOS: upload a photo into /assets on GitHub. The filename goes in
// the "image" field (e.g. "assets/switchscratched.jpg"). If the file
// is missing the card shows an icon instead — nothing breaks.
//
// SOLD: setting sold:true grays out the card. You can also toggle it
// live from admin mode on the site without touching this file.
// ============================================================

const INVENTORY = {

  // ----------------------------------------------------------
  // NINTENDO SWITCH
  // ----------------------------------------------------------
  // hasControllerAddon:true  →  before adding to cart the buyer is
  // asked whether they want to add a controller. Set false to skip.
  // ----------------------------------------------------------
  switches: [
    {
      id: "SW-01",
      name: "Nintendo Switch (Modded) — 512GB",
      price: 200,
      condition: "Good — light scratches",
      sold: false,
      icon: "switch",
      image: "assets/switchscratched.jpg",
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
      image: "assets/switchlikenewmodded.jpg",
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
      image: "assets/switcholed.jpg",
      description: "Nintendo Switch OLED in like-new condition, with its original box, a carrying case, and a free bag. Comes preloaded with 25 games split across two 64GB memory cards.",
      specs: ["Original box", "25 games preloaded", "2× 64GB cards (128GB)", "Free bag — gift"],
      hasControllerAddon: true
    }

    // ---- TEMPLATE: copy this block to add a new Switch ----
    // ,{
    //   id: "SW-04",
    //   name: "Nintendo Switch Lite — Blue",
    //   price: 120,
    //   condition: "Good — minor wear",
    //   sold: false,
    //   icon: "switch",
    //   image: "assets/switchliteblue.jpg",
    //   description: "Write a description here.",
    //   specs: ["Spec 1", "Spec 2"],
    //   hasControllerAddon: false   // Lite can't use Pro controllers
    // }
  ],

  // ----------------------------------------------------------
  // CONTROLLER ADD-ONS (only offered alongside Switch purchases)
  // ----------------------------------------------------------
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

  // ----------------------------------------------------------
  // SWITCH GAMES
  // ----------------------------------------------------------
  games: [
    {
      id: "GM-01",
      name: "Plants vs. Zombies",
      price: 20,
      condition: "Good",
      sold: false,
      icon: "game",
      image: "assets/plantsvszombies.jpg",
      description: "Physical Switch cartridge. Clean, tested, working.",
      specs: ["Switch cartridge", "Tested"]
    },
    {
      id: "GM-02",
      name: "Naruto Shippuden: Ultimate Ninja Storm 4",
      price: 20,
      condition: "Good",
      sold: false,
      icon: "game",
      image: "assets/narutostorm4.jpg",
      description: "Physical Switch cartridge. Clean, tested, working.",
      specs: ["Switch cartridge", "Tested"]
    },
    {
      id: "GM-03",
      name: "Hogwarts Legacy",
      price: 20,
      condition: "Like new",
      sold: false,
      icon: "game",
      image: "assets/hogwartslegacy.jpg",
      description: "Physical Switch cartridge, like-new condition.",
      specs: ["Switch cartridge", "Like new"]
    }

    // ---- TEMPLATE: copy this block to add a new game ----
    // ,{
    //   id: "GM-04",
    //   name: "Mario Kart 8 Deluxe",
    //   price: 20,
    //   condition: "Good",
    //   sold: false,
    //   icon: "game",
    //   image: "assets/mariokart8.jpg",
    //   description: "Physical Switch cartridge. Clean, tested, working.",
    //   specs: ["Switch cartridge", "Tested"]
    // }
  ],

  // ----------------------------------------------------------
  // HANDHELDS & CONSOLES
  // ----------------------------------------------------------
  consoles: [
    {
      id: "HC-01",
      name: "AYANEO AIR Pro — 1TB",
      price: 400,
      condition: "Like new — original box",
      sold: false,
      icon: "handheld",
      image: "assets/ayaneoair.jpg",
      description: "6-inch AMOLED screen, AMD Ryzen 7 series APU. A handheld gaming PC running Windows.",
      specs: ["1TB storage", "6\" AMOLED screen", "AMD Ryzen 7 series APU", "Original box", "Charger + manual included"]
    },
    {
      id: "HC-02",
      name: "ASUS ROG Ally — Z1 Extreme",
      price: 450,
      condition: "Like new — original box",
      sold: false,
      icon: "handheld",
      image: "assets/rogally.jpg",
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
      image: "assets/xboxonesfortnite.jpg",
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
      image: "assets/xboxseriess.jpg",
      description: "512GB digital-only Xbox Series S, includes one controller.",
      specs: ["512GB digital-only", "1 controller included", "No original box"]
    }

    // ---- TEMPLATE: copy this block to add a new console/handheld ----
    // ,{
    //   id: "HC-05",
    //   name: "Steam Deck — 512GB",
    //   price: 380,
    //   condition: "Like new",
    //   sold: false,
    //   icon: "handheld",   // use "handheld" for portables, "console" for home consoles
    //   image: "assets/steamdeck.jpg",
    //   description: "Write a description here.",
    //   specs: ["512GB", "SteamOS", "Charger included"]
    // }
  ],

  // ----------------------------------------------------------
  // LAPTOPS
  // ----------------------------------------------------------
  laptops: [
    {
      id: "LP-01",
      name: "MacBook Pro (2014)",
      price: 100,
      condition: "Good — works perfectly",
      sold: false,
      icon: "laptop",
      image: "assets/macbookpro2014.jpg",
      description: "2014 MacBook Pro, fully functional with no issues. Good cosmetic condition.",
      specs: ["8GB RAM", "256GB SSD", "Works perfectly"]
    }

    // ---- TEMPLATE: copy this block to add a new laptop ----
    // ,{
    //   id: "LP-02",
    //   name: "Dell XPS 13 (2020)",
    //   price: 350,
    //   condition: "Good",
    //   sold: false,
    //   icon: "laptop",
    //   image: "assets/dellxps13.jpg",
    //   description: "Write a description here.",
    //   specs: ["16GB RAM", "512GB SSD", "Charger included"]
    // }
  ]
};

// ----------------------------------------------------------
// SITE CONFIG — edit these when your details change
// ----------------------------------------------------------

// Your WhatsApp number (international format, no + or spaces)
const WHATSAPP_NUMBER = "9617655382" + "9"; // +961 76 553 829

// Flat delivery fee added at checkout
const DELIVERY_FEE = 10;

// Admin unlock code — change this to whatever you want
const ADMIN_CODE = "stock86";
