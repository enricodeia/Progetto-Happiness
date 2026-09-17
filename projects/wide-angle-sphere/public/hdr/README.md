# Environment maps for the bowl

Drop the two equirectangular EXRs here:

    creative_office.exr
    gsg_prostudiosmetal_vol2_31_env.exr

(the file names are `bowl.studio.hdr.files` in `src/config.js` — change them
there if yours are named differently, or add `.hdr` files instead).

They are blended by `hdr.mix`, pre-filtered through PMREM and used as
`scene.environment` — the 3D **only**. `scene.background` is never set and the
bowl's canvas is a transparent layer over the page, so the page's own paper
shows straight through.

With no files here the bowl falls back to the panel rig in `src/env.js` and
`npm run verify` says so: `ambiente: 0/2 HDR caricati → rig a pannelli`.
