// receiptBarcode.ts
// Klijentski helper: dekodiranje broja posiljke sa fotografije priznanice (bar-kod,
// @zxing/browser) + pomirenje sa brojem koji je procitala Ollama (Qwen).
//
// Pravilo (dogovoreno): bar-kod je bonus, Qwen broj je primaran.
// - bar-kod se poklapa sa Qwen ciframa -> koristi bar-kod (potvrdjeno)
// - bar-kod postoji, Qwen prazan -> koristi bar-kod (Code-128 ima checksum), uz oznaku za proveru
// - razlikuju se -> Qwen cifre pobedjuju, mismatch flag (UI skida "Prihvati")
//
// decodeReceiptBarcode i downscaleForOcr rade samo u browseru (canvas, object URL);
// reconcileBroj je cist i testira se vitest-om. zxing se ucitava dinamicki da import
// ovog modula (radi testova i bundlovanja) ne povlaci biblioteku.

const digitsOnly = (value?: string | null) => (value ?? "").replace(/\D/g, "");

export type BrojReconcile = {
  value: string; // konacne cifre broja posiljke ("" ako nema nijednog izvora)
  barcodeConfirmed: boolean; // bar-kod ucestvovao i slaze se
  mismatch: boolean; // oba izvora postoje i razlikuju se
  source: "both" | "barcode" | "qwen" | "none";
};

export function reconcileBroj(qwenBroj: string | undefined, barcodeBroj: string | null): BrojReconcile {
  const qwen = digitsOnly(qwenBroj);
  const barcode = digitsOnly(barcodeBroj);
  if (!qwen && !barcode) {
    return { value: "", barcodeConfirmed: false, mismatch: false, source: "none" };
  }
  if (qwen && barcode) {
    if (qwen === barcode) {
      return { value: barcode, barcodeConfirmed: true, mismatch: false, source: "both" };
    }
    return { value: qwen, barcodeConfirmed: false, mismatch: true, source: "both" };
  }
  if (barcode) {
    return { value: barcode, barcodeConfirmed: true, mismatch: false, source: "barcode" };
  }
  return { value: qwen, barcodeConfirmed: false, mismatch: false, source: "qwen" };
}

// Dekodira Code-128 bar-kod sa staticne slike. Vraca cifre ili null; nikad ne throw-uje
// (NotFoundException na mutnim slikama je normalan ishod).
export async function decodeReceiptBarcode(file: Blob): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
      import("@zxing/browser"),
      import("@zxing/library"),
    ]);
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints);
    const result = await reader.decodeFromImageUrl(url);
    const digits = digitsOnly(result.getText());
    return digits || null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Smanjuje fotografiju pre slanja Ollami (vision tokeni ~ povrsina piksela; 1500px je
// dovoljno za stampu na priznanici). Bar-kod dekodiranje uvek dobija ORIGINALNI fajl.
// Ako downscale ne uspe (format, canvas), vraca originalni fajl.
export async function downscaleForOcr(file: File, maxDim = 1500, quality = 0.85): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const largest = Math.max(bitmap.width, bitmap.height);
      const scale = largest > maxDim ? maxDim / largest : 1;
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      return blob ?? file;
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}
