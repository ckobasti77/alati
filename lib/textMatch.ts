// textMatch.ts
// Zajednicka normalizacija teksta i fuzzy poredjenje (Jaro-Winkler + token-set).
// Refaktorisano iz receiptMatcher.ts da bi i WhatsApp uvoz (productMatch, KP kartice)
// koristio istu logiku bez duplikata. receiptMatcher re-exportuje foldName/jaro/jaroWinkler
// pa njegovi testovi i potrosaci ostaju netaknuti.

const CYR2LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ж: "z", з: "z",
  и: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o",
  п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f", х: "h", ц: "c",
  ч: "c", џ: "dz", ш: "s",
};

export function foldName(value?: string): string {
  if (!value) return "";
  let s = value.toLowerCase();
  s = s.split("").map((ch) => CYR2LAT[ch] ?? ch).join("");
  s = s.replace(/đ/g, "dj"); // đ -> dj (kao normalizeSearchText)
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); // skini dijakritike (š->s, ć->c, ž->z...)
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  return s;
}

export function foldTokens(value?: string): string[] {
  return foldName(value).split(/\s+/).filter(Boolean).sort();
}

// --- Jaro-Winkler ---
export function jaro(s1: string, s2: string): number {
  if (s1 === s2) return s1.length === 0 ? 0 : 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;
  const matchDistance = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  t /= 2;
  return (matches / len1 + matches / len2 + (matches - t) / matches) / 3;
}

export function jaroWinkler(s1: string, s2: string): number {
  const j = jaro(s1, s2);
  let prefix = 0;
  const maxPrefix = Math.min(4, s1.length, s2.length);
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return j + prefix * 0.1 * (1 - j);
}

// Slicnost dva teksta: red reci nebitan (tokeni sortirani), token-set
// (svaki token manjeg skupa trazi najblizi u vecem) + poredjenje spojene niske.
export function tokenSetSimilarity(a?: string, b?: string): number {
  const ta = foldTokens(a);
  const tb = foldTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  let sum = 0;
  for (const t of small) {
    let best = 0;
    for (const u of big) best = Math.max(best, jaroWinkler(t, u));
    sum += best;
  }
  const tokenSet = sum / small.length;
  const joined = jaroWinkler(ta.join(""), tb.join(""));
  return Math.max(tokenSet, joined);
}
