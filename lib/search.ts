const COMBINING_MARKS = /[\u0300-\u036f]/g;
const DJ_CHAR = /\u0111/g;

export const normalizeSearchText = (value: string) => {
  if (!value) return "";
  const lower = value.toLowerCase();
  const withDj = lower.replace(DJ_CHAR, "dj");
  return withDj.normalize("NFD").replace(COMBINING_MARKS, "");
};
