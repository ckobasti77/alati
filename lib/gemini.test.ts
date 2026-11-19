// gemini.test.ts — samo mock global fetch-a (bez pravog poziva Gemini-ju).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GEMINI_MODEL, GeminiRateLimitError, geminiVision, VisionUnavailableError } from "./gemini";

// Minimalna lažna Response (jsdom nema pouzdan global Response — ne zavisimo od njega).
function fakeResponse(status: number, body: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  } as unknown as Response;
}

const geminiBody = (inner: string) =>
  JSON.stringify({ candidates: [{ content: { parts: [{ text: inner }] } }] });

// Tipovan mock fetch-a: implementacija ignoriše arg, ali mock.calls ima tip
// [string] — bez nekorišćenog parametra (lint čisto).
const okFetch = () =>
  vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
    fakeResponse(200, geminiBody(JSON.stringify({ ok: true }))),
  );

describe("geminiVision", () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = "***";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it("parsira uspešan JSON odgovor i koristi podrazumni model", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    const result = await geminiVision("prompt", ["AAAA"]);
    expect(result).toEqual({ ok: true });
    expect(String(fetchMock.mock.calls[0][0])).toContain(`${DEFAULT_GEMINI_MODEL}:generateContent`);
  });

  it("koristi eksplicitni model kad je dat", async () => {
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);
    await geminiVision("prompt", ["AAAA"], "gemini-3.5-flash");
    expect(String(fetchMock.mock.calls[0][0])).toContain("gemini-3.5-flash:generateContent");
  });

  it("HTTP 429 → GeminiRateLimitError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => fakeResponse(429, JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED" } }))),
    );
    await expect(geminiVision("prompt", ["AAAA"])).rejects.toBeInstanceOf(GeminiRateLimitError);
  });

  it("RESOURCE_EXHAUSTED u 400 telu → GeminiRateLimitError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        fakeResponse(400, JSON.stringify({ error: { message: "Quota exceeded for RESOURCE_EXHAUSTED" } })),
      ),
    );
    await expect(geminiVision("prompt", ["AAAA"])).rejects.toBeInstanceOf(GeminiRateLimitError);
  });

  it("ostale HTTP greške → VisionUnavailableError (ne RateLimit)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fakeResponse(500, JSON.stringify({ error: "boom" }))));
    const error: unknown = await geminiVision("prompt", ["AAAA"]).catch((e) => e);
    expect(error).toBeInstanceOf(VisionUnavailableError);
    expect(error).not.toBeInstanceOf(GeminiRateLimitError);
  });

  it("bez ključa → VisionUnavailableError, fetch se ne poziva", async () => {
    process.env.GEMINI_API_KEY = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(geminiVision("prompt", ["AAAA"])).rejects.toBeInstanceOf(VisionUnavailableError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
