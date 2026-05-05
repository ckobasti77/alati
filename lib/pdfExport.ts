"use client";

export type PdfShareResult = "shared" | "downloaded" | "aborted";

export type OrdersTablePdfTotals = {
  nabavno: number;
  transport: number;
  prodajno: number;
  profit: number;
  povrat: number;
};

export type OrdersTablePdfRow = {
  date: string;
  stage: string;
  title: string;
  contact: string;
  nabavno: string;
  transport: string;
  prodajno: string;
  profit: string;
  povrat: string;
  shipmentNumber: string;
};

export type OrderDetailPdfItem = {
  productName: string;
  variantName?: string;
  quantity?: number;
};

type PdfImagePage = {
  bytes: Uint8Array;
  pageWidth: number;
  pageHeight: number;
  imageWidth: number;
  imageHeight: number;
};

type PdfColumn = {
  header: string;
  subheader?: string;
  width: number;
  align?: CanvasTextAlign;
  getValue: (row: OrdersTablePdfRow) => string;
};

type TextSpan = {
  text: string;
  bold?: boolean;
  color?: string;
};

const A4 = {
  portrait: { width: 595.28, height: 841.89 },
  landscape: { width: 841.89, height: 595.28 },
};

const CANVAS_SCALE = 2;
const FONT_FAMILY = 'Arial, "Helvetica Neue", sans-serif';

const encoder = new TextEncoder();

const encodeAscii = (value: string) => encoder.encode(value);

const moneyNumber = (value: number) =>
  value.toLocaleString("sr-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const sanitizePdfFileName = (value: string) => {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return cleaned.length > 0 ? cleaned : "izvoz";
};

export const downloadPdfFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const sharePdfFile = async (
  file: File,
  data: { title: string; text?: string },
): Promise<PdfShareResult> => {
  const shareData = {
    title: data.title,
    text: data.text,
    files: [file],
  };

  const canShareFile =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (typeof navigator.canShare !== "function" || navigator.canShare({ files: [file] }));

  if (canShareFile) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return "aborted";
      console.error(error);
    }
  }

  downloadPdfFile(file);
  return "downloaded";
};

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * CANVAS_SCALE);
  canvas.height = Math.round(height * CANVAS_SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nije dostupan.");
  ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx };
};

const setFont = (ctx: CanvasRenderingContext2D, size: number, weight: "400" | "600" | "700" = "400") => {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
};

const drawText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number;
    weight?: "400" | "600" | "700";
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  } = {},
) => {
  setFont(ctx, options.size ?? 10, options.weight ?? "400");
  ctx.fillStyle = options.color ?? "#0f172a";
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = options.baseline ?? "top";
  ctx.fillText(text, x, y);
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number, weight: "400" | "600" | "700" = "400") => {
  setFont(ctx, fontSize, weight);
  const input = String(text || "-").trim() || "-";
  const lines: string[] = [];

  input.split("\n").forEach((segment) => {
    const normalizedSegment = segment.replace(/[ \t\r]+/g, " ").trim();
    if (!normalizedSegment) {
      lines.push("");
      return;
    }
    const words = normalizedSegment.split(" ");
    let line = "";

    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        return;
      }

      if (line) {
        lines.push(line);
        line = "";
      }

      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
        return;
      }

      let chunk = "";
      Array.from(word).forEach((char) => {
        const nextChunk = `${chunk}${char}`;
        if (ctx.measureText(nextChunk).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = nextChunk;
        }
      });
      line = chunk;
    });

    if (line) lines.push(line);
  });

  return lines.length ? lines : ["-"];
};

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  width: number,
  options: {
    size: number;
    lineHeight: number;
    weight?: "400" | "600" | "700";
    color?: string;
    align?: CanvasTextAlign;
  },
) => {
  setFont(ctx, options.size, options.weight ?? "400");
  ctx.fillStyle = options.color ?? "#0f172a";
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "top";
  const textX = options.align === "right" ? x + width : options.align === "center" ? x + width / 2 : x;
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, y + index * options.lineHeight);
  });
};

const spanTokens = (spans: TextSpan[]) =>
  spans.flatMap((span) =>
    span.text
      .split(/(\s+)/)
      .filter((part) => part.length > 0)
      .map((text) => ({ ...span, text })),
  );

const drawInlineSpans = (
  ctx: CanvasRenderingContext2D,
  spans: TextSpan[],
  x: number,
  y: number,
  maxWidth: number,
  options: { size: number; lineHeight: number; color?: string },
) => {
  const tokens = spanTokens(spans);
  const lines: TextSpan[][] = [[]];
  let lineWidth = 0;

  tokens.forEach((token) => {
    setFont(ctx, options.size, token.bold ? "700" : "400");
    const tokenWidth = ctx.measureText(token.text).width;
    const current = lines[lines.length - 1];
    if (current.length > 0 && lineWidth + tokenWidth > maxWidth) {
      lines.push([token]);
      lineWidth = tokenWidth;
      return;
    }
    current.push(token);
    lineWidth += tokenWidth;
  });

  lines.forEach((line, lineIndex) => {
    let cursorX = x;
    line.forEach((token) => {
      setFont(ctx, options.size, token.bold ? "700" : "400");
      ctx.fillStyle = token.color ?? options.color ?? "#0f172a";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(token.text, cursorX, y + lineIndex * options.lineHeight);
      cursorX += ctx.measureText(token.text).width;
    });
  });

  return Math.max(lines.length, 1) * options.lineHeight;
};

const canvasToJpegBytes = async (canvas: HTMLCanvasElement) => {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) resolve(nextBlob);
        else reject(new Error("PDF slika nije napravljena."));
      },
      "image/jpeg",
      0.92,
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
};

const buildPdfBlob = (pages: PdfImagePage[]) => {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (part: Uint8Array) => {
    parts.push(part);
    length += part.byteLength;
  };
  const pushAscii = (value: string) => push(encodeAscii(value));
  const appendObject = (id: number, body: Array<string | Uint8Array>) => {
    offsets[id] = length;
    pushAscii(`${id} 0 obj\n`);
    body.forEach((part) => (typeof part === "string" ? pushAscii(part) : push(part)));
    pushAscii("\nendobj\n");
  };

  pushAscii("%PDF-1.4\n%PDF generated by alati\n");

  const pageIds = pages.map((_, index) => 3 + index * 3);
  const imageIds = pages.map((_, index) => 4 + index * 3);
  const contentIds = pages.map((_, index) => 5 + index * 3);
  const objectCount = 2 + pages.length * 3;

  appendObject(1, ["<< /Type /Catalog /Pages 2 0 R >>"]);
  appendObject(2, [`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`]);

  pages.forEach((page, index) => {
    const pageId = pageIds[index];
    const imageId = imageIds[index];
    const contentId = contentIds[index];
    const content = `q\n${page.pageWidth.toFixed(2)} 0 0 ${page.pageHeight.toFixed(2)} 0 0 cm\n/Im${index} Do\nQ\n`;

    appendObject(pageId, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.pageWidth.toFixed(2)} ${page.pageHeight.toFixed(
        2,
      )}] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    ]);
    appendObject(imageId, [
      `<< /Type /XObject /Subtype /Image /Width ${page.imageWidth} /Height ${page.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.byteLength} >>\nstream\n`,
      page.bytes,
      "\nendstream",
    ]);
    appendObject(contentId, [`<< /Length ${encodeAscii(content).byteLength} >>\nstream\n${content}endstream`]);
  });

  const xrefOffset = length;
  pushAscii(`xref\n0 ${objectCount + 1}\n`);
  pushAscii("0000000000 65535 f \n");
  for (let id = 1; id <= objectCount; id += 1) {
    pushAscii(`${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  pushAscii(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const blobParts = parts.map((part) => {
    const buffer = new ArrayBuffer(part.byteLength);
    const copy = new Uint8Array(buffer);
    copy.set(part);
    return buffer;
  });
  return new Blob(blobParts, { type: "application/pdf" });
};

const canvasesToPdfFile = async (canvases: Array<{ canvas: HTMLCanvasElement; pageWidth: number; pageHeight: number }>, fileName: string) => {
  const pages = await Promise.all(
    canvases.map(async ({ canvas, pageWidth, pageHeight }) => ({
      bytes: await canvasToJpegBytes(canvas),
      pageWidth,
      pageHeight,
      imageWidth: canvas.width,
      imageHeight: canvas.height,
    })),
  );
  const blob = buildPdfBlob(pages);
  return new File([blob], fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`, {
    type: "application/pdf",
  });
};

export const createOrdersTablePdfFile = async ({
  rows,
  totals,
  fileName,
  title,
  subtitle,
}: {
  rows: OrdersTablePdfRow[];
  totals: OrdersTablePdfTotals;
  fileName: string;
  title: string;
  subtitle?: string;
}) => {
  const page = A4.landscape;
  const margin = 22;
  const tableTopGap = 16;
  const contentBottom = page.height - margin;
  const columns: PdfColumn[] = [
    { header: "Datum", width: 52, getValue: (row) => row.date },
    { header: "Stage", width: 58, getValue: (row) => row.stage },
    { header: "Naslov", width: 135, getValue: (row) => row.title },
    { header: "Kontakt", width: 110, getValue: (row) => row.contact },
    { header: "Nabavno", subheader: `${moneyNumber(totals.nabavno)} EUR`, width: 68, align: "right", getValue: (row) => row.nabavno },
    { header: "Transport", subheader: `${moneyNumber(totals.transport)} EUR`, width: 68, align: "right", getValue: (row) => row.transport },
    { header: "Prodajno", subheader: `${moneyNumber(totals.prodajno)} EUR`, width: 68, align: "right", getValue: (row) => row.prodajno },
    { header: "Profit (50%)", subheader: `${moneyNumber(totals.profit)} EUR`, width: 72, align: "right", getValue: (row) => row.profit },
    { header: "Povrat", subheader: `${moneyNumber(totals.povrat)} EUR`, width: 68, align: "right", getValue: (row) => row.povrat },
    { header: "Broj porudzbine", width: 80, getValue: (row) => row.shipmentNumber },
  ];

  const canvases: Array<{ canvas: HTMLCanvasElement; pageWidth: number; pageHeight: number }> = [];
  let ctx: CanvasRenderingContext2D;
  let y = margin;
  let currentPageNumber = 0;

  const drawTableHeader = () => {
    const headerHeight = 32;
    let x = margin;
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(margin, y, page.width - margin * 2, headerHeight);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.7;
    ctx.strokeRect(margin, y, page.width - margin * 2, headerHeight);
    columns.forEach((column) => {
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(x, y, column.width, headerHeight);
      drawText(ctx, column.header, x + 4, y + 5, { size: 7.5, weight: "700", color: "#0f172a" });
      if (column.subheader) {
        drawText(ctx, column.subheader, x + column.width - 4, y + 18, {
          size: 6.8,
          weight: "600",
          color: totals.profit < 0 && column.header === "Profit (50%)" ? "#dc2626" : "#64748b",
          align: "right",
        });
      }
      x += column.width;
    });
    y += headerHeight;
  };

  const addPage = () => {
    const next = createCanvas(page.width, page.height);
    canvases.push({ canvas: next.canvas, pageWidth: page.width, pageHeight: page.height });
    ctx = next.ctx;
    currentPageNumber += 1;
    y = margin;

    drawText(ctx, title, margin, y, { size: 18, weight: "700", color: "#0f172a" });
    drawText(ctx, `Strana ${currentPageNumber}`, page.width - margin, y + 3, {
      size: 8,
      weight: "600",
      color: "#64748b",
      align: "right",
    });
    y += 24;

    if (subtitle && currentPageNumber === 1) {
      const subtitleLines = wrapText(ctx, subtitle, page.width - margin * 2, 8.5);
      drawWrappedText(ctx, subtitleLines, margin, y, page.width - margin * 2, {
        size: 8.5,
        lineHeight: 11,
        color: "#475569",
      });
      y += subtitleLines.length * 11 + tableTopGap;
    } else {
      y += tableTopGap;
    }

    drawTableHeader();
  };

  addPage();

  if (rows.length === 0) {
    drawText(ctx!, "Nema narudzbina za izvoz.", margin, y + 20, { size: 11, weight: "600", color: "#64748b" });
  } else {
    rows.forEach((row, rowIndex) => {
      const lineHeight = 9.5;
      const fontSize = 7.8;
      const cellLines = columns.map((column) => wrapText(ctx!, column.getValue(row), column.width - 8, fontSize));
      const rowHeight = Math.max(24, ...cellLines.map((lines) => lines.length * lineHeight + 8));
      if (y + rowHeight > contentBottom) {
        addPage();
      }

      const fill = rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc";
      let x = margin;
      ctx!.fillStyle = fill;
      ctx!.fillRect(margin, y, page.width - margin * 2, rowHeight);

      columns.forEach((column, columnIndex) => {
        ctx!.strokeStyle = "#e2e8f0";
        ctx!.lineWidth = 0.5;
        ctx!.strokeRect(x, y, column.width, rowHeight);
        drawWrappedText(ctx!, cellLines[columnIndex], x + 4, y + 5, column.width - 8, {
          size: fontSize,
          lineHeight,
          color: column.header === "Profit (50%)" && row.profit.trim().startsWith("-") ? "#dc2626" : "#0f172a",
          align: column.align ?? "left",
        });
        x += column.width;
      });

      y += rowHeight;
    });
  }

  return canvasesToPdfFile(canvases, fileName);
};

export const createOrderDetailPdfFile = async ({
  fileName,
  orderTitle,
  createdAt,
  items,
  customerName,
  nabavno,
  transport,
  prodajno,
  cleanProfit,
}: {
  fileName: string;
  orderTitle: string;
  createdAt: string;
  items: OrderDetailPdfItem[];
  customerName: string;
  nabavno: string;
  transport: string;
  prodajno: string;
  cleanProfit: string;
}) => {
  const page = A4.portrait;
  const margin = 42;
  const rowGap = 14;
  const canvases: Array<{ canvas: HTMLCanvasElement; pageWidth: number; pageHeight: number }> = [];
  const { canvas, ctx } = createCanvas(page.width, page.height);
  canvases.push({ canvas, pageWidth: page.width, pageHeight: page.height });

  let y = margin;
  drawText(ctx, "Narudzbina", margin, y, { size: 22, weight: "700" });
  drawText(ctx, createdAt, page.width - margin, y + 6, { size: 10, weight: "600", color: "#64748b", align: "right" });
  y += 34;
  const titleLines = wrapText(ctx, orderTitle, page.width - margin * 2, 12, "600");
  drawWrappedText(ctx, titleLines, margin, y, page.width - margin * 2, {
    size: 12,
    lineHeight: 16,
    weight: "600",
    color: "#475569",
  });
  y += titleLines.length * 16 + 26;

  const drawDivider = () => {
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(page.width - margin, y);
    ctx.stroke();
    y += 14;
  };

  const drawRow = (label: string, spans: TextSpan[]) => {
    drawText(ctx, label, margin, y, { size: 8, weight: "700", color: "#64748b" });
    y += 13;
    const usedHeight = drawInlineSpans(ctx, spans, margin, y, page.width - margin * 2, {
      size: 13,
      lineHeight: 17,
      color: "#0f172a",
    });
    y += usedHeight + rowGap;
    drawDivider();
  };

  const exportedItems = items.length > 0 ? items : [{ productName: orderTitle }];
  exportedItems.forEach((item, index) => {
    const quantity = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : "";
    const spans: TextSpan[] = [{ text: item.productName || orderTitle }];
    if (item.variantName) {
      spans.push({ text: " - " }, { text: item.variantName, bold: true });
    }
    if (quantity) spans.push({ text: quantity, color: "#64748b" });
    drawRow(index === 0 ? "Naziv alata" : "Naziv alata", spans);
  });

  drawRow("Ime i prezime kupca", [{ text: customerName || "-" }]);
  drawRow("Finansije", [
    { text: `Nabavna: ${nabavno} - Transport: ${transport} - Prodajna: ${prodajno} - ` },
    { text: `Cista zarada (100%): ${cleanProfit}`, bold: true, color: cleanProfit.trim().startsWith("-") ? "#dc2626" : "#0f172a" },
  ]);

  return canvasesToPdfFile(canvases, fileName);
};
