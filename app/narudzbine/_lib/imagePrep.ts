// imagePrep.ts — Priprema slike PRE SLANJA ka /api/order-screenshot:
// u browseru se smanjuje (najduža strana 1600px) i šifruje u JPEG (kvalitet 0.85) —
// manji payload, manje tokena i ispod limita za veličinu tela zahteva (Vercel).
// Čisti delovi (dimenzije, provera fajla) su testirani vitest-om; canvas deo radi samo u browseru.

export const MAX_IMAGE_SIDE = 1600;
export const JPEG_QUALITY = 0.85;

export type ResizeDimensions = { width: number; height: number; scale: number };

/** Čisto: dimenzije tako da najduža strana bude ≤ maxSide (nikad ne uvećava). */
export function computeResizeDimensions(width: number, height: number, maxSide: number = MAX_IMAGE_SIDE): ResizeDimensions {
  const safeWidth = Math.max(0, Math.floor(width));
  const safeHeight = Math.max(0, Math.floor(height));
  const longest = Math.max(safeWidth, safeHeight);
  if (longest === 0) return { width: 0, height: 0, scale: 1 };
  if (longest <= maxSide) return { width: safeWidth, height: safeHeight, scale: 1 };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
    scale,
  };
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "bmp", "avif", "heic", "heif"]);

/** Čisto: da li fajl deluje kao slika (type ili ekstenzija — neke galerije daju prazan type). */
export function isImageFile(file: Pick<File, "type" | "name">): boolean {
  if (file.type && file.type.startsWith("image/")) return true;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(extension);
}

/** Čisto: ime fajla za upload (uvek .jpg jer je ishod JPEG). */
export function uploadFileName(file: Pick<File, "name">): string {
  const base = file.name.replace(/\.[^.]*$/, "").trim();
  return base ? `${base}.jpg` : "slika.jpg";
}

export class ImagePrepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagePrepError";
  }
}

export type PreparedImage = { blob: Blob; fileName: string; width: number; height: number };

type DecodedSource = { bitmap: CanvasImageSource; width: number; height: number; release: () => void };

async function decodeImageSource(file: File): Promise<DecodedSource> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Neki formati (npr. HEIC) ne prođu kroz createImageBitmap — probaj Image fallback.
    }
  }
  return await new Promise<DecodedSource>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({
        bitmap: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImagePrepError("Slika se ne može otvoriti (format nije podržan). Izaberi JPG ili PNG."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

/** Smanji + JPEG-uj sliku u browseru. Baca ImagePrepError ako fajl nije slika ili canvas ne radi. */
export async function prepareImageForUpload(
  file: File,
  maxSide: number = MAX_IMAGE_SIDE,
  quality: number = JPEG_QUALITY,
): Promise<PreparedImage> {
  if (!isImageFile(file)) {
    throw new ImagePrepError("Ovo nije slika. Izaberi JPG, PNG ili sličnu sliku.");
  }
  const source = await decodeImageSource(file);
  try {
    const dimensions = computeResizeDimensions(source.width, source.height, maxSide);
    if (dimensions.width === 0 || dimensions.height === 0) {
      throw new ImagePrepError("Slika nema dimenzije — izaberi drugu sliku.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImagePrepError("Canvas nije dostupan u ovom browseru.");
    }
    context.drawImage(source.bitmap, 0, 0, dimensions.width, dimensions.height);
    const blob = await canvasToBlob(canvas, quality);
    if (!blob || blob.size === 0) {
      throw new ImagePrepError("Slika nije mogla da se sprema u JPEG format.");
    }
    return { blob, fileName: uploadFileName(file), width: dimensions.width, height: dimensions.height };
  } finally {
    source.release();
  }
}
