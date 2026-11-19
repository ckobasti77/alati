// orderScreenshot/types.ts
// Tipovi za "Popuni narudžbinu iz slike" — screenshot (KP poruke, WhatsApp,
// Viber, istorija poziva sa ručnim natpisom) -> PREDLOG narudžbine.
// Ništa se ne snima automatski: ruta vraća ScreenshotDraft, čovek potvrđuje.

export type ScreenshotSourceType = "kp" | "whatsapp" | "viber" | "call_log" | "other";

export type RawPrice = {
  value: string; // čitak broj, npr. "260", "80-130"
  role: "prodajna" | "nabavna" | "unknown";
  raw: string; // tekst tačno kao na slici, npr. "260e", "80-130€"
};

// Šta Gemini vision model mora vratiti (STRICT JSON — ključevi baš ovako).
// Prazno polje = model to nije procitao; nikad ne izmišljati.
export type ScreenshotRaw = {
  sourceType: ScreenshotSourceType;
  customerFirstName: string;
  customerLastName: string;
  customerNameRaw: string;
  phones: string[];
  street: string;
  postalCode: string;
  city: string;
  addressRaw: string;
  pickupExplicit: boolean;
  productText: string;
  variantText: string;
  adTitle: string;
  prices: RawPrice[];
  uncertain: string[]; // nazivi ključeva u koja model nije siguran
};

// Pogled na proizvod iz kataloga (products.list) + varijante = tipovi (npr. 4x2,5).
export type CatalogVariant = {
  id: string;
  label: string;
  nabavnaCena: number;
  prodajnaCena: number;
  isDefault: boolean;
};

export type CatalogProduct = {
  id: string;
  name: string;
  kpName?: string;
  nabavnaCena: number;
  prodajnaCena: number;
  variants?: CatalogVariant[];
};

// Pobednik + kandidati za UI (do 5, najbolji prvi).
export type DraftProductHit = {
  productId: string;
  name: string;
  kpName?: string;
  variantId?: string;
  variantLabel?: string;
  score: number; // 0..1
};

// Šta ruta /api/order-screenshot vraća UI-ju (UI se pravi u sledećoj sesiji).
export type ScreenshotDraft = {
  sourceType: ScreenshotSourceType;
  customerName: string; // "Ime Prezime", "" ako nepoznato
  customerNameRaw: string;
  phone: string; // "06xxxxxxx" ili ""
  address: string; // "Ulica broj, PTT Mesto" ili "" (kod pickup-a uvek "")
  pickup: boolean;
  product?: DraftProductHit;
  candidates: DraftProductHit[];
  prodajnaCena?: number;
  nabavnaCena?: number;
  fieldConfidence: {
    customerName: number;
    phone: number;
    address: number;
    product: number;
    price: number;
  };
  warnings: string[];
};
