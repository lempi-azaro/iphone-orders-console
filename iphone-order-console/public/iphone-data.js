// Real-world iPhone model → year → storage options → color options.
// Source: Apple's published specs per generation. Storage/colors reflect
// what Apple actually sold for that model (e.g. Pro Max models that never
// had a 128GB option won't offer one here).
export const IPHONE_MODELS = [
  { name: "iPhone 11", year: 2019, storage: [64, 128, 256],
    colors: ["Black", "Green", "Yellow", "Purple", "(PRODUCT)RED", "White"] },
  { name: "iPhone 11 Pro", year: 2019, storage: [64, 256, 512],
    colors: ["Midnight Green", "Space Gray", "Silver", "Gold"] },
  { name: "iPhone 11 Pro Max", year: 2019, storage: [64, 256, 512],
    colors: ["Midnight Green", "Space Gray", "Silver", "Gold"] },

  { name: "iPhone 12 mini", year: 2020, storage: [64, 128, 256],
    colors: ["Black", "White", "(PRODUCT)RED", "Green", "Blue", "Purple"] },
  { name: "iPhone 12", year: 2020, storage: [64, 128, 256],
    colors: ["Black", "White", "(PRODUCT)RED", "Green", "Blue", "Purple"] },
  { name: "iPhone 12 Pro", year: 2020, storage: [128, 256, 512],
    colors: ["Graphite", "Silver", "Gold", "Pacific Blue"] },
  { name: "iPhone 12 Pro Max", year: 2020, storage: [128, 256, 512],
    colors: ["Graphite", "Silver", "Gold", "Pacific Blue"] },

  { name: "iPhone 13 mini", year: 2021, storage: [128, 256, 512],
    colors: ["Pink", "Blue", "Midnight", "Starlight", "(PRODUCT)RED", "Green"] },
  { name: "iPhone 13", year: 2021, storage: [128, 256, 512],
    colors: ["Pink", "Blue", "Midnight", "Starlight", "(PRODUCT)RED", "Green"] },
  { name: "iPhone 13 Pro", year: 2021, storage: [128, 256, 512, 1024],
    colors: ["Graphite", "Gold", "Silver", "Sierra Blue", "Alpine Green"] },
  { name: "iPhone 13 Pro Max", year: 2021, storage: [128, 256, 512, 1024],
    colors: ["Graphite", "Gold", "Silver", "Sierra Blue", "Alpine Green"] },

  { name: "iPhone 14", year: 2022, storage: [128, 256, 512],
    colors: ["Midnight", "Purple", "Starlight", "(PRODUCT)RED", "Blue", "Yellow"] },
  { name: "iPhone 14 Plus", year: 2022, storage: [128, 256, 512],
    colors: ["Midnight", "Purple", "Starlight", "(PRODUCT)RED", "Blue", "Yellow"] },
  { name: "iPhone 14 Pro", year: 2022, storage: [128, 256, 512, 1024],
    colors: ["Space Black", "Silver", "Gold", "Deep Purple"] },
  { name: "iPhone 14 Pro Max", year: 2022, storage: [128, 256, 512, 1024],
    colors: ["Space Black", "Silver", "Gold", "Deep Purple"] },

  { name: "iPhone 15", year: 2023, storage: [128, 256, 512],
    colors: ["Black", "Blue", "Green", "Yellow", "Pink"] },
  { name: "iPhone 15 Plus", year: 2023, storage: [128, 256, 512],
    colors: ["Black", "Blue", "Green", "Yellow", "Pink"] },
  { name: "iPhone 15 Pro", year: 2023, storage: [128, 256, 512, 1024],
    colors: ["Black Titanium", "White Titanium", "Blue Titanium", "Natural Titanium"] },
  { name: "iPhone 15 Pro Max", year: 2023, storage: [256, 512, 1024], // no 128GB option
    colors: ["Black Titanium", "White Titanium", "Blue Titanium", "Natural Titanium"] },

  { name: "iPhone 16", year: 2024, storage: [128, 256, 512],
    colors: ["Black", "White", "Pink", "Teal", "Ultramarine"] },
  { name: "iPhone 16 Plus", year: 2024, storage: [128, 256, 512],
    colors: ["Black", "White", "Pink", "Teal", "Ultramarine"] },
  { name: "iPhone 16 Pro", year: 2024, storage: [128, 256, 512, 1024],
    colors: ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"] },
  { name: "iPhone 16 Pro Max", year: 2024, storage: [256, 512, 1024], // no 128GB option
    colors: ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"] },
];

export function findModel(name) {
  return IPHONE_MODELS.find((m) => m.name === name);
}

export function storageLabel(gb) {
  return gb >= 1024 ? "1TB" : `${gb}GB`;
}
