const assets = import.meta.glob("../assets/essentials/**/*.{png,jpg,jpeg,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

function findAsset(folder, filename) {
  const suffix = `/assets/essentials/${folder}/${filename}`;
  const entry = Object.entries(assets).find(([path]) => path.endsWith(suffix));
  return entry?.[1] || null;
}

export function essentialsAsset(folder, filename) {
  return findAsset(folder, filename);
}

export function essentialsProductAsset(name) {
  const productMap = [
    ["oreo", "oreo.png"],
    ["lays", "lays.png"],
    ["kitkat", "kitkat.png"],
    ["coca-cola", "coca-cola.png"],
    ["sprite", "sprite.png"],
    ["fanta", "fanta.png"],
    ["thums", "thums-up.png"],
    ["red bull", "red-bull.png"],
    ["bisleri", "bisleri.png"],
  ];
  const normalized = String(name || "").toLowerCase();
  const match = productMap.find(([term]) => normalized.includes(term));
  return match ? findAsset("products", match[1]) : null;
}
