// Local portraits. Anything dropped into `src/photos/` is picked up
// automatically — no manifest, no rebuild step. Files are used in filename
// order, and the display name is derived from the filename
// (`01-tara-brach.jpg` → "Tara Brach"), so a numeric prefix controls order.

const FILES = import.meta.glob("../photos/*.{jpg,jpeg,png,webp,avif}", {
  eager: true,
  query: "?url",
  import: "default",
});

const titleOf = (path) =>
  path
    .split("/")
    .pop()
    .replace(/\.\w+$/, "")
    .replace(/^\d+[-_ ]*/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

export function photoMedia() {
  return Object.keys(FILES)
    .sort()
    .map((p) => ({ image: FILES[p], video: null, title: titleOf(p) }));
}

export const photoCount = () => Object.keys(FILES).length;
