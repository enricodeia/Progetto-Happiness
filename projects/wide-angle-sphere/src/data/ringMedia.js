// The images the rings carry. Four drop-in folders, each with a fallback
// chain, so the piece is never empty and never needs a manifest:
//
//   people        src/people/*        ordinary people — the inner ring
//   experiences   src/experiences/*   the practices / techniques — the outer
//   teachers      src/therapists/*    the network's OWN teacher dots, then
//                 → src/photos/*      the real named portraits V1's sphere
//                                     assembles out of, untouched by this
//
// Files are used in filename order, so a numeric prefix controls where an image
// sits on the orbit. While a folder is empty its ring falls back to whatever is
// there — the portraits, in the end — so nothing ever renders blank.

const PEOPLE = import.meta.glob("../people/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});
const EXPERIENCES = import.meta.glob("../experiences/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});
const RING = import.meta.glob("../ring-media/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});
const CARDS = import.meta.glob("../cards/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});
const VALUES = import.meta.glob("../values/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});
const PHOTOS = import.meta.glob("../photos/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});
const THERAPISTS = import.meta.glob("../therapists/*.{jpg,jpeg,png,webp,avif}", {
  eager: true, query: "?url", import: "default",
});

const CHAINS = {
  people: [["people", PEOPLE], ["ring-media", RING], ["cards", CARDS], ["photos", PHOTOS]],
  experiences: [["experiences", EXPERIENCES], ["ring-media", RING], ["values", VALUES], ["photos", PHOTOS]],
  teachers: [["therapists", THERAPISTS], ["photos", PHOTOS]],
};

const listOf = (files) =>
  Object.keys(files)
    .sort()
    .map((p) => ({ image: files[p] }));

/** The first folder in `source`'s chain that actually has images. */
function resolve(source) {
  for (const [name, files] of CHAINS[source] || CHAINS.people) {
    const list = listOf(files);
    if (list.length) return { name, list };
  }
  return { name: "none", list: [] };
}

export const ringMedia = (source) => resolve(source).list;
export const ringSource = (source) => resolve(source).name;
