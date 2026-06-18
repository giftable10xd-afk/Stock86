// ============================================================
// STOCK/86 — INVENTORY DATA
// ============================================================

const INVENTORY = {

  // ----------------------------------------------------------
  // NINTENDO SWITCH
  // hasControllerAddon:true → shows the controller + game add-on modal
  // ----------------------------------------------------------
  switches: [
    {
      id: "SW-01",
      name: "Nintendo Switch (Modded) — 512GB",
      price: 200,
      condition: "Good",
      sold: false,
      icon: "switch",
      image: "assets/switchscratched.jpg",
      description: "Modded Nintendo Switch with 512GB of storage. Comes complete with all original accessories: dock, Joy-Con controllers, Joy-Con grip, HDMI cable, and AC charger. Also includes a carrying case and a free bag as a gift.",
      specs: ["512GB modded", "Dock + all accessories", "AC charger included", "Case included", "Free bag — gift"],
      hasControllerAddon: true
    },
    {
      id: "SW-02",
      name: "Nintendo Switch (Modded) — 256GB",
      price: 200,
      condition: "Excellent",
      sold: false,
      icon: "switch",
      image: "assets/switchlikenewmodded.jpg",
      description: "Modded Nintendo Switch with 256GB of storage. Comes complete with all original accessories: dock, Joy-Con controllers, Joy-Con grip, HDMI cable, and AC charger. Also includes a carrying case and a free bag as a gift.",
      specs: ["256GB modded", "Dock + all accessories", "AC charger included", "Case included", "Free bag — gift"],
      hasControllerAddon: true
    },
    {
      id: "SW-03",
      name: "Nintendo Switch OLED",
      price: 220,
      condition: "Like New",
      sold: false,
      icon: "switch",
      image: "assets/switcholed.jpg",
      description: "Nintendo Switch OLED in like-new condition, with its original box and all accessories: dock, Joy-Con controllers, Joy-Con grip, HDMI cable, and AC charger. Also includes a carrying case and a free bag. Comes preloaded with 25 games split across two 64GB memory cards.",
      specs: ["Original box", "Dock + all accessories", "AC charger included", "25 games preloaded", "2× 64GB cards (128GB)", "Free bag — gift"],
      hasControllerAddon: true
    }
  ],

  // ----------------------------------------------------------
  // CONTROLLER ADD-ONS
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
  // condition is intentionally null — not shown anywhere for games
  // ----------------------------------------------------------
  games: [
    {
      id: "GM-01",
      name: "Plants vs. Zombies",
      price: 20,
      condition: null,
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
      condition: null,
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
      condition: null,
      sold: false,
      icon: "game",
      image: "assets/hogwartslegacy.jpg",
      description: "Physical Switch cartridge. Clean, tested, working.",
      specs: ["Switch cartridge", "Tested"]
    }
  ],

  // ----------------------------------------------------------
  // HANDHELDS & CONSOLES
  // ----------------------------------------------------------
  consoles: [
    {
      id: "HC-01",
      name: "AYANEO AIR Pro — 1TB",
      price: 400,
      condition: "Like New",
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
      condition: "Like New",
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
      condition: "Excellent",
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
      condition: "Like New",
      sold: false,
      icon: "console",
      image: "assets/xboxseriess.jpg",
      description: "512GB digital-only Xbox Series S, includes one controller.",
      specs: ["512GB digital-only", "1 controller included", "No original box"]
    },
    {
      id: "CON-PSP1K",
      name: "Sony PSP-1000 (Custom Modded)",
      price: 120,
      condition: "Good",
      sold: false,
      icon: "console",
      image: "assets/psp1000.jpg",
      description: "PSP-1000 with custom firmware, 64GB card loaded, full PS1 support.",
      specs: ["64GB memory card", "PS1 compatible", "Custom firmware (CFW)", "333 MHz unlocked", "Clean + tested"]
    }
  ],

  // ----------------------------------------------------------
  // LAPTOPS
  // ----------------------------------------------------------
  laptops: [
    {
      id: "LP-01",
      name: "MacBook Pro (2014)",
      price: 100,
      condition: "Good",
      sold: false,
      icon: "laptop",
      image: "assets/macbookpro2014.jpg",
      description: "2014 MacBook Pro, fully functional with no issues. Good cosmetic condition.",
      specs: ["8GB RAM", "256GB SSD", "Works perfectly"]
    }
  ]
};

// ----------------------------------------------------------
// SITE CONFIG
// ----------------------------------------------------------
const WHATSAPP_NUMBER = "9617655382" + "9"; // +961 76 553 829
const DELIVERY_FEE    = 10;
const ADMIN_CODE      = "stock86";
