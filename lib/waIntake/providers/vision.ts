// waIntake/providers/vision.ts
// Vision provider: real (Gemini preko lib/gemini.ts) + FakeVision za testove.
// Interfejs VisionChat vraca string sadrzaj koji segment.ts parsira — isti
// JSON ulaz/izlaz kao ranije, samo je backend Gemini umesto lokalne Ollame.

import { geminiVision } from "../../gemini";
import type { VisionChat } from "../types";

export class GeminiVision implements VisionChat {
  async chatJson(prompt: string, images: string[]): Promise<string> {
    try {
      const parsed = await geminiVision(prompt, images);
      return JSON.stringify(parsed);
    } catch (error) {
      // Ne-JSON odgovor: prazan sadrzaj, parseSegmentation/parseExtraction to
      // tretiraju kao "nista procitano" (isto kao ranije sa Ollama izlazom).
      if (error instanceof SyntaxError) return "";
      throw error;
    }
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

const globalStore = globalThis as unknown as { __waIntakeVision?: GeminiVision };

export function getVision(): VisionChat {
  if (!globalStore.__waIntakeVision) {
    globalStore.__waIntakeVision = new GeminiVision();
  }
  return globalStore.__waIntakeVision;
}
