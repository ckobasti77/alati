const COMBINING_MARKS = /[\u0300-\u036f]/g;
const DJ_CHAR = /\u0111/g;

export const normalizeSearchText = (value: string) => {
  if (!value) return "";
  const lower = value.toLowerCase();
  const withDj = lower.replace(DJ_CHAR, "dj");
  return withDj.normalize("NFD").replace(COMBINING_MARKS, "");
};

export const toSearchTokens = (value: string) =>
  normalizeSearchText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

export const matchesAllTokensInNormalizedText = (normalizedText: string, tokens: string[]) => {
  if (!tokens.length) return true;
  return tokens.every((token) => normalizedText.includes(token));
};

export const matchesAllTokens = (value: string, tokens: string[]) =>
  matchesAllTokensInNormalizedText(normalizeSearchText(value), tokens);
