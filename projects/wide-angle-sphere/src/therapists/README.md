# the network's own teacher dots

The trust network (`v2.network`, `src/network.js`) has its own dedicated
teacher pool, separate from `src/photos/` — that folder is the REAL, named
teacher portraits V1's own sphere assembles out of, and stays exactly as it
is. These are a lighter, purpose-cropped set specifically for the globe's
small circular dots.

Drop any `.webp` / `.jpg` / `.png` / `.avif` in here, used in filename order.
Square crops read cleanest.

While this folder is empty the network falls back to `src/photos/` — the same
teacher portraits V1 uses — so the corner is never blank.
