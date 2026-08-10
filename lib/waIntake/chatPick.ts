// waIntake/chatPick.ts
// Cist izbor WhatsApp chata po imenu: prvo exact (case-insensitive, trim),
// pa najbolji fuzzy preko tokenSetSimilarity (isti prag kao productMatch).
// Odvojen od providera da se testira bez puppeteer-a.

import { tokenSetSimilarity } from "../textMatch";

export const CHAT_NAME_MATCH_THRESHOLD = 0.8;

export type ChatNameCandidate = { id: string; name: string };

export function pickChatIdByName(chats: ChatNameCandidate[], wanted: string): string | null {
  const target = wanted.trim().toLowerCase();
  if (!target) return null;

  const exact = chats.find((chat) => chat.id && chat.name.trim().toLowerCase() === target);
  if (exact) return exact.id;

  let bestId: string | null = null;
  let bestScore = 0;
  for (const chat of chats) {
    if (!chat.id) continue;
    const score = tokenSetSimilarity(wanted, chat.name);
    if (score > bestScore) {
      bestScore = score;
      bestId = chat.id;
    }
  }
  return bestScore >= CHAT_NAME_MATCH_THRESHOLD ? bestId : null;
}
