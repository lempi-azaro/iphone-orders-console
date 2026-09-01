// Real-world iPhone model → year → storage options → color options →
// approximate Malaysia launch price (base storage, RM) → per-storage-step
// price increment → product line category (used for reporting/charts).
export const IPHONE_MODELS = [
  { name: "iPhone 11", year: 2019, storage: [64, 128, 256], basePrice: 3099, storageStep: 180, category: "Standard",
    colors: ["Black", "Green", "Yellow", "Purple", "(PRODUCT)RED", "White"] },
  { name: "iPhone 11 Pro", year: 2019, storage: [64, 256, 512], basePrice: 4599, storageStep: 350, category: "Pro",
    colors: ["Midnight Green", "Space Gray", "Silver", "Gold"] },
  { name: "iPhone 11 Pro Max", year: 2019, storage: [64, 256, 512], basePrice: 5099, storageStep: 350, category: "Pro Max",
    colors: ["Midnight Green", "Space Gray", "Silver", "Gold"] },

  { name: "iPhone 12 mini", year: 2020, storage: [64, 128, 256], basePrice: 3099, storageStep: 180, category: "Standard",
    colors: ["Black", "White", "(PRODUCT)RED", "Green", "Blue", "Purple"] },
  { name: "iPhone 12", year: 2020, storage: [64, 128, 256], basePrice: 3599, storageStep: 180, category: "Standard",
    colors: ["Black", "White", "(PRODUCT)RED", "Green", "Blue", "Purple"] },
  { name: "iPhone 12 Pro", year: 2020, storage: [128, 256, 512], basePrice: 4599, storageStep: 350, category: "Pro",
    colors: ["Graphite", "Silver", "Gold", "Pacific Blue"] },
  { name: "iPhone 12 Pro Max", year: 2020, storage: [128, 256, 512], basePrice: 5099, storageStep: 350, category: "Pro Max",
    colors: ["Graphite", "Silver", "Gold", "Pacific Blue"] },

  { name: "iPhone 13 mini", year: 2021, storage: [128, 256, 512], basePrice: 3299, storageStep: 300, category: "Standard",
    colors: ["Pink", "Blue", "Midnight", "Starlight", "(PRODUCT)RED", "Green"] },
  { name: "iPhone 13", year: 2021, storage: [128, 256, 512], basePrice: 3799, storageStep: 300, category: "Standard",
    colors: ["Pink", "Blue", "Midnight", "Starlight", "(PRODUCT)RED", "Green"] },
  { name: "iPhone 13 Pro", year: 2021, storage: [128, 256, 512, 1024], basePrice: 4899, storageStep: 350, category: "Pro",
    colors: ["Graphite", "Gold", "Silver", "Sierra Blue", "Alpine Green"] },
  { name: "iPhone 13 Pro Max", year: 2021, storage: [128, 256, 512, 1024], basePrice: 5399, storageStep: 350, category: "Pro Max",
    colors: ["Graphite", "Gold", "Silver", "Sierra Blue", "Alpine Green"] },

  { name: "iPhone 14", year: 2022, storage: [128, 256, 512], basePrice: 3999, storageStep: 350, category: "Standard",
    colors: ["Midnight", "Purple", "Starlight", "(PRODUCT)RED", "Blue", "Yellow"] },
  { name: "iPhone 14 Plus", year: 2022, storage: [128, 256, 512], basePrice: 4399, storageStep: 350, category: "Standard",
    colors: ["Midnight", "Purple", "Starlight", "(PRODUCT)RED", "Blue", "Yellow"] },
  { name: "iPhone 14 Pro", year: 2022, storage: [128, 256, 512, 1024], basePrice: 5099, storageStep: 400, category: "Pro",
    colors: ["Space Black", "Silver", "Gold", "Deep Purple"] },
  { name: "iPhone 14 Pro Max", year: 2022, storage: [128, 256, 512, 1024], basePrice: 5599, storageStep: 400, category: "Pro Max",
    colors: ["Space Black", "Silver", "Gold", "Deep Purple"] },

  { name: "iPhone 15", year: 2023, storage: [128, 256, 512], basePrice: 4399, storageStep: 400, category: "Standard",
    colors: ["Black", "Blue", "Green", "Yellow", "Pink"] },
  { name: "iPhone 15 Plus", year: 2023, storage: [128, 256, 512], basePrice: 4799, storageStep: 400, category: "Standard",
    colors: ["Black", "Blue", "Green", "Yellow", "Pink"] },
  { name: "iPhone 15 Pro", year: 2023, storage: [128, 256, 512, 1024], basePrice: 5399, storageStep: 450, category: "Pro",
    colors: ["Black Titanium", "White Titanium", "Blue Titanium", "Natural Titanium"] },
  { name: "iPhone 15 Pro Max", year: 2023, storage: [256, 512, 1024], basePrice: 6399, storageStep: 450, category: "Pro Max",
    colors: ["Black Titanium", "White Titanium", "Blue Titanium", "Natural Titanium"] },

  { name: "iPhone 16", year: 2024, storage: [128, 256, 512], basePrice: 4599, storageStep: 400, category: "Standard",
    colors: ["Black", "White", "Pink", "Teal", "Ultramarine"] },
  { name: "iPhone 16 Plus", year: 2024, storage: [128, 256, 512], basePrice: 4999, storageStep: 400, category: "Standard",
    colors: ["Black", "White", "Pink", "Teal", "Ultramarine"] },
  { name: "iPhone 16 Pro", year: 2024, storage: [128, 256, 512, 1024], basePrice: 5699, storageStep: 450, category: "Pro",
    colors: ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"] },
  { name: "iPhone 16 Pro Max", year: 2024, storage: [256, 512, 1024], basePrice: 6799, storageStep: 450, category: "Pro Max",
    colors: ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"] },

  { name: "iPhone 17", year: 2025, storage: [256, 512], basePrice: 4499, storageStep: 1100, category: "Standard",
    colors: ["Lavender", "Sage", "Mist Blue", "White", "Black"] },
  { name: "iPhone Air", year: 2025, storage: [256, 512, 1024], basePrice: 5599, storageStep: 1100, category: "Air",
    colors: ["Sky Blue", "Light Gold", "Cloud White", "Space Black"] },
  { name: "iPhone 17 Pro", year: 2025, storage: [256, 512, 1024], basePrice: 6199, storageStep: 1100, category: "Pro",
    colors: ["Cosmic Orange", "Deep Blue", "Silver"] },
  { name: "iPhone 17 Pro Max", year: 2025, storage: [256, 512, 1024, 2048], basePrice: 6899, storageStep: 1100, category: "Pro Max",
    colors: ["Cosmic Orange", "Deep Blue", "Silver"] },
];

export function findModel(name) {
  return IPHONE_MODELS.find((m) => m.name === name);
}

export function storageLabel(gb) {
  if (gb >= 2048) return (gb / 1024) + "TB";
  if (gb >= 1024) return "1TB";
  return `${gb}GB`;
}

export function estimatePriceAndBattery(model, storageGb, answers) {
  const {
    screenCondition = "flawless",
    bodyCondition = "flawless",
    faceIdWorks = true,
    cameraWorks = true,
    chargingPortWorks = true,
    partsReplaced = "none",
    waterDamage = false,
    yearsUsed = null,
  } = answers;

  const currentYear = new Date().getFullYear();
  const age = yearsUsed ?? Math.max(0, currentYear - model.year);

  let battery = Math.round(100 - age * 6);
  if (partsReplaced === "battery" || partsReplaced === "multiple") battery = 97;
  battery = Math.max(60, Math.min(100, battery));

  let score = 100;
  if (screenCondition === "minor_scratches") score -= 8;
  if (screenCondition === "cracked") score -= 35;
  if (bodyCondition === "minor_scratches") score -= 5;
  if (bodyCondition === "dents_or_cracks") score -= 20;
  if (!faceIdWorks) score -= 25;
  if (!cameraWorks) score -= 20;
  if (!chargingPortWorks) score -= 15;
  if (partsReplaced === "screen") score -= 10;
  if (partsReplaced === "back_glass") score -= 5;
  if (partsReplaced === "multiple") score -= 15;
  if (waterDamage) score -= 40;
  score = Math.max(15, Math.min(100, score));

  const storageIndex = model.storage.indexOf(Number(storageGb));
  const basePrice = model.basePrice + Math.max(0, storageIndex) * model.storageStep;
  const depreciation = Math.max(0.28, 1 - age * 0.14);
  const conditionMultiplier = score / 100;
  const price = Math.round((basePrice * depreciation * conditionMultiplier) / 10) * 10;

  return { estimatedPrice: price, estimatedBattery: battery, conditionScore: score, ageYears: age };
}

// ---- Data Persistence & Helpers for 100 Orders ----
export function getModelSeriesList() {
  return ["iPhone 11", "iPhone 12", "iPhone 13", "iPhone 14", "iPhone 15", "iPhone 16", "iPhone 17"];
}

export function getVariantsForSeries(series) {
  if (!series) return [];
  if (series === "iPhone 17") {
    return IPHONE_MODELS.filter(m => m.name.startsWith("iPhone 17") || m.name === "iPhone Air");
  }
  return IPHONE_MODELS.filter(m => m.name.startsWith(series));
}

export function generate100Orders() {
  const conditions = ['New', 'Like New', 'Used - Excellent', 'Used - Good'];
  const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const addresses = [
    'Jalan Bukit Bintang, Kuala Lumpur', 'Georgetown, Penang', 'JB Sentral, Johor Bahru',
    'Kota Kinabalu, Sabah', 'Kuching, Sarawak', 'Ipoh, Perak', 'Melaka City, Melaka'
  ];

  const orders = [];
  for (let i = 1; i <= 100; i++) {
    const modelObj = IPHONE_MODELS[(i - 1) % IPHONE_MODELS.length];
    const storageVal = modelObj.storage[(i - 1) % modelObj.storage.length];
    const colorVal = modelObj.colors[(i - 1) % modelObj.colors.length];
    const condition = conditions[i % conditions.length];
    const battery = condition === 'New' ? '100%' : `${80 + (i % 20)}%`;

    orders.push({
      id: `ORD-${1000 + i}`,
      year: modelObj.year,
      modelName: modelObj.name,
      storage: storageVal,
      color: colorVal,
      condition,
      batteryHealth: battery,
      price: modelObj.basePrice,
      status: statuses[i % statuses.length],
      address: `${i * 12} ${addresses[i % addresses.length]}`
    });
  }
  return orders;
}

export function loadSavedOrders() {
  const saved = localStorage.getItem('iphone_orders_app_data');
  if (saved) {
    try { return JSON.parse(saved); } catch (e) { console.error(e); }
  }
  const initial = generate100Orders();
  saveOrders(initial);
  return initial;
}

export function saveOrders(orders) {
  localStorage.setItem('iphone_orders_app_data', JSON.stringify(orders));
}

// Expose globally for browser non-module script tag compatibility
if (typeof window !== 'undefined') {
  window.IPHONE_MODELS = IPHONE_MODELS;
  window.findModel = findModel;
  window.storageLabel = storageLabel;
  window.getModelSeriesList = getModelSeriesList;
  window.getVariantsForSeries = getVariantsForSeries;
  window.loadSavedOrders = loadSavedOrders;
  window.saveOrders = saveOrders;
}
