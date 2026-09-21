// The two navigation bars (his ask, 2026-09-21 — the final task, "due tipi
// distinti di esperienze"): what each one lists, and what opens under it.
//
// Experience 1 (his first three frames): Discover · Become a teacher ·
// Clinical Resources · Research · About, the search and one black "Log In".
// Experience 2 (frames four to six): Discover · About · Become a teacher,
// an outlined "For therapists", the search and "Get the app".
//
// Two links carry a dropdown — Discover and About — and Discover's three rows
// each open a SECOND, much wider panel beside the card ("una tendina molto più
// larga dove queste voci sono elencate"), which is where the real technique
// directory is listed. The techniques come from the same file the pills use
// (`techniques.js`, insighttimer.com/techniques scraped 2026-09-11), so the
// menu and the sphere can never disagree about what a technique is called.

import { CATEGORIES } from "./techniques.js";

/** every link the two bars can hold, by key */
export const NAV_LINKS = {
  discover: {
    label: "Discover",
    icon: "globe",
    menu: [
      { label: "Techniques", sub: "techniques" },
      { label: "Teachers", sub: "teachers" },
      { label: "Benefits", sub: "benefits" },
    ],
  },
  about: {
    label: "About",
    icon: "book",
    menu: [
      { label: "Mission" },
      { label: "Research" },
      { label: "Newsroom" },
      { label: "Blog" },
    ],
  },
  teach: { label: "Become a teacher" },
  clinical: { label: "Clinical Resources" },
  research: { label: "Research" },
};

/** the wide second panels — what a chevron row opens */
export const NAV_SUBS = {
  techniques: {
    title: "Techniques",
    // the real directory's categories, in the directory's own order
    items: CATEGORIES,
  },
  teachers: {
    title: "Teachers",
    items: [
      "Popular teachers", "Psychologists & therapists", "Buddhist teachers",
      "Yoga & breath guides", "Sleep specialists", "Sound healers",
      "Neuroscientists", "Coaches & mentors", "Musicians",
      "Faith & tradition", "New this month", "Browse all teachers",
    ],
  },
  benefits: {
    title: "Benefits",
    items: [
      "Stress", "Anxiety", "Sleep", "Focus", "Self-esteem", "Relationships",
      "Grief", "Depression", "Addiction recovery", "Pain", "Performance",
      "Compassion", "Happiness", "Emotional healing", "Trauma", "Burnout",
      "Parenting", "Confidence", "Kids & teens", "Productivity",
    ],
  },
};
