// prompt.test.ts — čuva ključne reči iz prompta (ključevi JSON-a + pravila),
// da se prompt ne bi razdvojio od types.ts.
import { describe, expect, it } from "vitest";
import { ORDER_SCREENSHOT_PROMPT } from "./prompt";

const REQUIRED_KEYS = [
  "sourceType",
  "customerFirstName",
  "customerLastName",
  "customerNameRaw",
  "phones",
  "street",
  "postalCode",
  "city",
  "addressRaw",
  "pickupExplicit",
  "productText",
  "variantText",
  "adTitle",
  "prices",
  "uncertain",
];

describe("ORDER_SCREENSHOT_PROMPT", () => {
  it("navodi svaki JSON ključ iz ScreenshotRaw", () => {
    for (const key of REQUIRED_KEYS) {
      expect(ORDER_SCREENSHOT_PROMPT, `ključ nedostaje: ${key}`).toContain(`"${key}"`);
    }
  });

  it("sadrži ključna poslovna pravila", () => {
    expect(ORDER_SCREENSHOT_PROMPT).toContain("licno");
    expect(ORDER_SCREENSHOT_PROMPT).toContain("22323Novi slankamen");
    expect(ORDER_SCREENSHOT_PROMPT).toContain("80-130€");
    expect(ORDER_SCREENSHOT_PROMPT).toContain("Stihl");
    expect(ORDER_SCREENSHOT_PROMPT).toContain("NEVER invent");
  });
});
