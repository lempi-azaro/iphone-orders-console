// Real-world iPhone model → year → storage options → color options →
// approximate Malaysia launch price (base storage, RM) → per-storage-step
// price increment → product line category (used for reporting/charts).
//
// Prices are approximate reference points for the depreciation estimator
// below — not live market data. Treat them as ballpark, not a valuation.
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
];

export function findModel(name) {
  return IPHONE_MODELS.find((m) => m.name === name);
}

export function storageLabel(gb) {
  return gb >= 1024 ? "1TB" : `${gb}GB`;
}

// ---- Estimator ----
// Transparent, rule-based depreciation + condition scoring. This is
// deliberately NOT a black-box AI call: every input maps to a documented
// weight below, which is safer (no API key exposed in a public frontend)
// and more auditable for a resale pricing tool than an opaque model.
export function estimatePriceAndBattery(model, storageGb, answers) {
  const {
    screenCondition = "flawless",   // flawless | minor_scratches | cracked
    bodyCondition = "flawless",     // flawless | minor_scratches | dents_or_cracks
    faceIdWorks = true,
    cameraWorks = true,
    chargingPortWorks = true,
    partsReplaced = "none",         // none | screen | battery | back_glass | multiple
    waterDamage = false,
    yearsUsed = null,               // if null, derived from model year
  } = answers;

  const currentYear = new Date().getFullYear();
  const age = yearsUsed ?? Math.max(0, currentYear - model.year);

  // --- Battery health estimate ---
  // Rough real-world average degradation: ~5–7%/year of daily use.
  let battery = Math.round(100 - age * 6);
  if (partsReplaced === "battery" || partsReplaced === "multiple") battery = 97;
  battery = Math.max(60, Math.min(100, battery));

  // --- Condition score out of 100 ---
  let score = 100;
  if (screenCondition === "minor_scratches") score -= 8;
  if (screenCondition === "cracked") score -= 35;
  if (bodyCondition === "minor_scratches") score -= 5;
  if (bodyCondition === "dents_or_cracks") score -= 20;
  if (!faceIdWorks) score -= 25;
  if (!cameraWorks) score -= 20;
  if (!chargingPortWorks) score -= 15;
  if (partsReplaced === "screen") score -= 10; // non-genuine part risk
  if (partsReplaced === "back_glass") score -= 5;
  if (partsReplaced === "multiple") score -= 15;
  if (waterDamage) score -= 40;
  score = Math.max(15, Math.min(100, score));

  // --- Price estimate ---
  const storageIndex = model.storage.indexOf(Number(storageGb));
  const basePrice = model.basePrice + Math.max(0, storageIndex) * model.storageStep;
  const depreciation = Math.max(0.28, 1 - age * 0.14); // floor at 28% of launch price
  const conditionMultiplier = score / 100;
  const price = Math.round((basePrice * depreciation * conditionMultiplier) / 10) * 10;

  return { estimatedPrice: price, estimatedBattery: battery, conditionScore: score, ageYears: age };
}
