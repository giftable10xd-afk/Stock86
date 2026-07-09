// ============================================================
// RetroStation — INVENTORY DATA
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
      price: 205,
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
      price: 205,
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
      price: 225,
      condition: "Like New",
      sold: false,
      icon: "switch",
      image: "assets/switcholed.jpg",
      description: "Nintendo Switch OLED in like-new condition, with its original box and all accessories: dock, Joy-Con controllers, Joy-Con grip, HDMI cable, and AC charger. Also includes a carrying case and a free bag. Comes preloaded with 25 games split across a 64GB memory card and a 256GB memory card.",
      specs: ["Original box", "Dock + all accessories", "AC charger included", "25 games preloaded", "64GB + 256GB cards (320GB)", "Free bag — gift"],
      hasControllerAddon: true
    }
  ],

  // ----------------------------------------------------------
  // CONTROLLER ADD-ONS
  // ----------------------------------------------------------
  controllerAddons: {
    pro: {
      label: "Pro Controller",
      price: 20,
      editions: ["Super Smash Bros Edition", "Tears of the Kingdom Edition", "Splatoon Edition"]
    },
    wired: {
      label: "Wired / third-party wireless controller",
      price: 15,
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
      price: 405,
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
      price: 455,
      condition: "Like New",
      sold: false,
      icon: "handheld",
      image: "assets/rogally.jpg",
      description: "7-inch 120Hz touchscreen, AMD Z1 Extreme APU, runs Windows 11 with a built-in kickstand. No original box, comes with a carrying bag.",
      specs: ["16GB RAM / 512GB", "7\" 120Hz touchscreen", "No original box", "Carrying bag included", "65W charger + manual"]
    },
    {
      id: "HC-03",
      name: "Xbox One S — Fortnite Edition",
      price: 145,
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
      price: 205,
      condition: "Like New",
      sold: true,
      icon: "console",
      image: "assets/xboxseriess.jpg",
      description: "512GB digital-only Xbox Series S, includes one controller.",
      specs: ["512GB digital-only", "1 controller included", "No original box"]
    },
    {
      id: "CON-WIIU1",
      name: "Nintendo Wii U (Modded) — 256GB",
      price: 115,
      condition: "Excellent",
      sold: true,
      icon: "console",
      image: "assets/wiiu.jpg",
      description: "Modded Wii U with 256GB storage and custom firmware.",
      specs: ["256GB modded", "Custom firmware", "Clean + tested"]
    },
    {
      id: "CON-PSP1K",
      name: "Sony PSP-1000 (Custom Modded)",
      price: 65,
      condition: "Good",
      sold: true,
      icon: "console",
      image: "assets/psp1000.jpg",
      description: "Modded PSP-1000 with custom firmware and 64GB card.",
      specs: ["64GB card loaded", "Custom firmware", "PS1 support", "Clean + tested"]
    }
  ],

  // ----------------------------------------------------------
  // PHONES
  // ----------------------------------------------------------
  phones: [
    {
      id: "PH-01",
      name: "OnePlus 13R — 256GB / 16GB RAM",
      price: 450,
      condition: "Like New",
      sold: false,
      icon: "phone",
      image: "assets/oneplus13r.jpg",
      description: "OnePlus 13R in like-new condition. Snapdragon 8 Gen 3, 16GB RAM, 256GB storage. Smooth 120Hz AMOLED display, 5500mAh battery with 80W SUPERVOOC fast charging. All original accessories included.",
      specs: ["256GB storage", "16GB RAM", "Snapdragon 8 Gen 3", "120Hz AMOLED", "80W SUPERVOOC charging", "All accessories included"]
    }
  ],

  // ----------------------------------------------------------
  // LAPTOPS
  // ----------------------------------------------------------
  laptops: [
    {
      id: "LP-01",
      name: "MacBook Pro (2014)",
      price: 105,
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
// CONDITION OPTIONS (admin-manageable)
// Seeded here, then synced via Firebase like everything else —
// admins can add/remove options from the admin panel and it's
// reflected for every visitor.
// ----------------------------------------------------------
let CUSTOM_CONDITIONS = ["New", "Like New", "Excellent", "Good"];

// ----------------------------------------------------------
// SITE CONFIG
// ----------------------------------------------------------
const WHATSAPP_NUMBER = "9617655382" + "9"; // +961 76 553 829
const DELIVERY_FEE    = 5;
const ADMIN_CODE      = "50441440";
