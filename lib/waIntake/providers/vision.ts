// waIntake/providers/vision.ts
// Vision provider: real (lokalna Ollama, qwen2.5vl) + FakeVision za testove.
// Isti obrazac poziva kao lib/receiptExtract.ts (format json, temperature 0).

import { OllamaUnavailableError } from "../../receiptExtract";
import type { VisionChat } from "../types";

export const DEFAULT_WA_QWEN_MODEL = "qwen2.5vl:7b";
const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const CHAT_TIMEOUT_MS = 240_000; // segmentacija moze da nosi vise slika

export class OllamaVision implements VisionChat {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(opts?: { ollamaUrl?: string; model?: string }) {
    this.baseUrl = (opts?.ollamaUrl ?? process.env.OLLAMA_URL ?? DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
    this.model = opts?.model ?? process.env.WA_QWEN_MODEL ?? DEFAULT_WA_QWEN_MODEL;
  }

  async chatJson(prompt: string, images: string[]): Promise<string> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: "json",
          options: { temperature: 0 },
          messages: [
            {
              role: "user",
              content: prompt,
              ...(images.length > 0 ? { images } : {}),
            },
          ],
        }),
      });
    } catch {
      throw new OllamaUnavailableError(
        `Ollama nije dostupna na ${this.baseUrl}. Proveri da li je pokrenuta (ollama serve).`,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new OllamaUnavailableError(
        `Ollama je vratila gresku ${response.status} za model ${this.model}. ${body.slice(0, 200)}`,
      );
    }

    const payload = (await response.json().catch(() => null)) as { message?: { content?: string } } | null;
    return payload?.message?.content ?? "";
  }
}

// Fake za testove: vraca unapred zadate odgovore redom (poslednji se ponavlja).
export class FakeVision implements VisionChat {
  readonly calls: { prompt: string; imageCount: number }[] = [];
  private cursor = 0;

  constructor(private readonly responses: string[]) {}

  async chatJson(prompt: string, images: string[]): Promise<string> {
    this.calls.push({ prompt, imageCount: images.length });
    const response = this.responses[Math.min(this.cursor, this.responses.length - 1)] ?? "{}";
    this.cursor += 1;
    return response;
  }
}

const globalStore = globalThis as unknown as { __waIntakeVision?: OllamaVision };

export function getVision(): VisionChat {
  if (!globalStore.__waIntakeVision) {
    globalStore.__waIntakeVision = new OllamaVision();
  }
  return globalStore.__waIntakeVision;
}
