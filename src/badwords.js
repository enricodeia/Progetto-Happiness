/**
 * Content filter — blocks profanity, blasphemy, insults, violence.
 * Italian + English. Local-only, no external API.
 */

const BAD_WORDS = [
  // ── Italian: bestemmie ──
  'porco dio', 'dio cane', 'dio porco', 'dio maiale', 'dio bestia',
  'madonna puttana', 'madonna troia', 'porca madonna', 'cristo dio',
  'gesù cristo', 'dio merda', 'porco gesù', 'dio santo',
  // ── Italian: parolacce / insulti ──
  'cazzo', 'merda', 'stronzo', 'stronza', 'vaffanculo', 'fanculo',
  'minchia', 'coglione', 'cogliona', 'puttana', 'troia', 'zoccola',
  'bastardo', 'bastarda', 'figlio di puttana', 'pezzo di merda',
  'testa di cazzo', 'rompicoglioni', 'cazzata', 'stronzata',
  'mignotta', 'baldracca', 'porca troia', 'che cazzo',
  // ── Italian: discriminazione ──
  'negro', 'negra', 'frocio', 'finocchio', 'ricchione',
  'ritardato', 'ritardata', 'handicappato', 'mongoloide', 'down',
  // ── Italian: violenza ──
  'ammazzare', 'ammazzati', 'uccidere', 'ucciditi',
  'suicidio', 'suicidati', 'ti ammazzo', 'vi ammazzo',
  'ti uccido', 'crepa', 'muori',
  // ── English: profanity ──
  'fuck', 'fucking', 'fucker', 'motherfucker',
  'shit', 'bullshit', 'shitty',
  'bitch', 'asshole', 'bastard',
  'dick', 'cock', 'pussy', 'cunt',
  'whore', 'slut', 'hoe',
  // ── English: discrimination ──
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  // ── English: violence ──
  'kill yourself', 'kill you', 'murder', 'suicide',
];

// Pre-compile regexes for performance
const PATTERNS = BAD_WORDS.map(w => {
  // Escape regex special chars, then create word-boundary pattern
  const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s|[^a-zàèéìòùA-Z])${escaped}(?:$|\\s|[^a-zàèéìòùA-Z])`, 'i');
});

/**
 * Returns true if text contains banned words.
 * Normalizes common evasion: strips repeated chars, common substitutions.
 */
export function containsBadWords(text) {
  if (!text) return false;

  // Normalize: lowercase, collapse repeated letters (fuuuck → fuck)
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/(.)\1{2,}/g, '$1$1'); // max 2 repeats

  // Common leet-speak substitutions
  normalized = normalized
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/@/g, 'a');

  // Pad for boundary matching
  const padded = ` ${normalized} `;

  return PATTERNS.some(re => re.test(padded));
}
