/**
 * Metalab motion vocabulary.
 * Use with motion/react: <motion.div transition={ui} />
 */

export const dur = {
  tap: 0.1,
  quick: 0.2,
  fast: 0.3,
  ui: 0.4,
  medium: 0.6,
  glass: 0.7,
  section: 1,
  ambient: 7,
  marquee: 20,
}

export const ease = {
  default: [0.4, 0, 0.2, 1],
  out: [0.16, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
}

export const ui = { duration: dur.ui, ease: ease.default }
export const reveal = { duration: dur.section, ease: ease.out }
export const glass = { duration: dur.glass, ease: ease.default }
