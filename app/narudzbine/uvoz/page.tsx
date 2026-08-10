"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { LoadingDots } from "@/components/LoadingDots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  matchBatch,
  type CandidateOrder,
  type MatchResult,
  type ReceiptData,
} from "@/lib/receiptMatcher";
import { decodeReceiptBarcode, downscaleForOcr, reconcileBroj, type BrojReconcile } from "@/lib/receiptBarcode";
import type { ReceiptExtraction } from "@/lib/receiptExtract";

const digitsOnly = (value?: string) => (value ?? "").replace(/\D/g, "");

const stageShortLabels: Record<string, string> = {
  poruceno: "Poruceno",
  aks: "Aks",
  na_stanju: "Na stanju",
  poslato: "Poslato",
  stiglo: "Stiglo",
  legle_pare: "Legle pare",
  vraceno: "Vraceno",
};

// Zavrsena stanja: i dalje se mogu izabrati u dropdownu, ali se ne racunaju u
// badge "ceka slanje" (matcher ih salje na review sa upozorenjem).
const COMPLETED_STAGES = new Set(["poslato", "stiglo", "legle_pare", "vraceno"]);

const matchBadge: Record<MatchResult["status"], { label: string; tone: string }> = {
  high: { label: "Pouzdano", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  review: { label: "Proveri", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  none: { label: "Nema predloga", tone: "border-rose-200 bg-rose-50 text-rose-800" },
};

type RowStatus = "queued" | "processing" | "ready" | "failed";

type ReceiptRow = {
  key: string;
  file: File;
  previewUrl: string;
  status: RowStatus;
  error?: string;
  extracted?: ReceiptExtraction;
  barcode?: string | null;
  broj?: BrojReconcile;
  matchInit?: boolean;
  selectedOrderId?: string;
  brojDraft?: string;
  accepted: boolean;
  writeResult?: { status: "updated" | "skipped"; reason?: string };
};

type MarkPoslatoResult = { orderId: string; status: "updated" | "skipped"; reason?: string };

async function extractViaApi(file: File): Promise<ReceiptExtraction> {
  const blob = await downscaleForOcr(file);
  const form = new FormData();
  form.append("file", blob, file.name);
  const response = await fetch("/api/receipt-extract", { method: "POST", body: form });
  const data = (await response.json().catch(() => null)) as (ReceiptExtraction & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(data?.error || "Ekstrakcija nije uspela.");
  }
  if (!data) {
    throw new Error("Ekstrakcija nije vratila podatke.");
  }
  return data;
}

// Jedna slika povucena iz WhatsApp chata (ruta /api/receipt-extract/from-whatsapp).
type WaPulledImage = { messageId: string; imageIndex: number; ts: number; data: string };

const waImageKey = (entry: { messageId: string; imageIndex: number }) => `${entry.messageId}#${entry.imageIndex}`;

// base64 (bez data: prefiksa) -> File, da WhatsApp slike udju kroz isti
// addFiles/red-obrade pipeline kao rucni drag-drop.
function base64ToFile(base64: string, name: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: "image/jpeg" });
}

export default function UvozPriznanicaPage() {
  return (
    <RequireAuth>
      <UvozContent />
    </RequireAuth>
  );
}

function UvozContent() {
  const orderScope: "default" | "kalaba" = "default";
  const { token } = useAuth();
  const sessionToken = token as string;

  const candidates = useConvexQuery<CandidateOrder[]>("orders:pendingForShipping", {
    token: sessionToken,
    scope: orderScope,
  });
  const markPoslatoBatch = useConvexMutation<
    { token: string; scope: "default" | "kalaba"; items: { orderId: string; brojPosiljke: string }[] },
    MarkPoslatoResult[]
  >("orders:markPoslatoBatch");

  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPullingWa, setIsPullingWa] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processingRef = useRef(false);
  // Kljucevi (messageId#imageIndex) vec povucenih WhatsApp slika u ovoj sesiji;
  // ref (ne state) jer ne utice na render. Brisanje reda namerno NE oslobadja
  // kljuc — ponovni pull ne sme da vaskrsne namerno obrisan red.
  const pulledWaKeysRef = useRef<Set<string>>(new Set());
  const previewUrlsRef = useRef<string[]>([]);

  previewUrlsRef.current = rows.map((row) => row.previewUrl);
  useEffect(
    () => () => {
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const files = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    setRows((prev) => [
      ...prev,
      ...files.map((file) => ({
        key: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued" as const,
        accepted: false,
      })),
    ]);
  }, []);

  // Sekvencijalna obrada: Ollama sluzi jedan zahtev, pa red po red
  // (bar-kod za istu sliku ide paralelno sa Ollama pozivom).
  useEffect(() => {
    if (processingRef.current) return;
    const next = rows.find((row) => row.status === "queued");
    if (!next) return;
    processingRef.current = true;
    setRows((prev) => prev.map((row) => (row.key === next.key ? { ...row, status: "processing" } : row)));
    void (async () => {
      try {
        const [extracted, barcode] = await Promise.all([extractViaApi(next.file), decodeReceiptBarcode(next.file)]);
        const broj = reconcileBroj(extracted.brojPosiljke, barcode);
        setRows((prev) =>
          prev.map((row) =>
            row.key === next.key
              ? { ...row, status: "ready", error: undefined, extracted, barcode, broj, brojDraft: broj.value }
              : row,
          ),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Obrada slike nije uspela.";
        setRows((prev) =>
          prev.map((row) => (row.key === next.key ? { ...row, status: "failed", error: message } : row)),
        );
      } finally {
        processingRef.current = false;
      }
    })();
  }, [rows]);

  // Sve narudzbine su kandidati (bilo koje stanje, i "licno") — dropdown i prefil
  // koriste ceo spisak. Badge "ceka slanje" broji samo one koje jos nisu zavrsene.
  const dropdownCandidates = useMemo(() => {
    if (!candidates) return [];
    return [...candidates].sort((a, b) => a.customerName.localeCompare(b.customerName, "sr"));
  }, [candidates]);

  const waitingCount = useMemo(
    () => (candidates ?? []).filter((candidate) => !COMPLETED_STAGES.has(candidate.stage)).length,
    [candidates],
  );

  const matchableRows = useMemo(
    () => rows.filter((row) => row.status === "ready" && !row.writeResult),
    [rows],
  );

  const matches = useMemo(() => {
    const map = new Map<string, MatchResult>();
    if (!candidates || matchableRows.length === 0) return map;
    const receipts: ReceiptData[] = matchableRows.map((row) => ({
      name: row.extracted?.imePrimaoca || undefined,
      phone: row.extracted?.telefonPrimaoca || undefined,
      brojPosiljke: row.broj?.value || undefined,
    }));
    const results = matchBatch(receipts, candidates);
    matchableRows.forEach((row, index) => map.set(row.key, results[index]));
    return map;
  }, [matchableRows, candidates]);

  // Prvi put kad match stigne za red: prefiluj dropdown i default "Prihvati"
  // (samo za "high" bez mismatch-a i sa procitanim brojem).
  useEffect(() => {
    if (!candidates) return;
    const candidateIds = new Set(dropdownCandidates.map((candidate) => candidate.id));
    setRows((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (row.status !== "ready" || row.matchInit || row.writeResult) return row;
        const match = matches.get(row.key);
        if (!match) return row;
        const proposed = match.orderId && candidateIds.has(match.orderId) ? match.orderId : "";
        changed = true;
        return {
          ...row,
          matchInit: true,
          selectedOrderId: proposed,
          accepted:
            match.status === "high" && proposed !== "" && !row.broj?.mismatch && (row.broj?.value ?? "") !== "",
        };
      });
      return changed ? next : prev;
    });
  }, [matches, candidates, dropdownCandidates]);

  const updateRow = useCallback((key: string, patch: Partial<ReceiptRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => {
      const target = prev.find((row) => row.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((row) => row.key !== key);
    });
  }, []);

  const acceptedRows = useMemo(
    () => rows.filter((row) => row.accepted && row.status === "ready" && !row.writeResult),
    [rows],
  );
  const validAcceptedRows = useMemo(
    () => acceptedRows.filter((row) => row.selectedOrderId && digitsOnly(row.brojDraft) !== ""),
    [acceptedRows],
  );
  const pendingCount = rows.filter((row) => row.status === "queued" || row.status === "processing").length;
  const canConfirm = acceptedRows.length > 0 && acceptedRows.length === validAcceptedRows.length && !isSaving;

  const handleConfirmSubmit = async () => {
    if (isSaving || validAcceptedRows.length === 0) return;
    setIsSaving(true);
    try {
      const submitted = validAcceptedRows;
      const items = submitted.map((row) => ({
        orderId: row.selectedOrderId as string,
        brojPosiljke: (row.brojDraft ?? "").trim(),
      }));
      const results = await markPoslatoBatch({ token: sessionToken, scope: orderScope, items });
      const byKey = new Map<string, { status: "updated" | "skipped"; reason?: string }>();
      submitted.forEach((row, index) => {
        const result = results[index];
        if (result) byKey.set(row.key, { status: result.status, reason: result.reason });
      });
      setRows((prev) =>
        prev.map((row) =>
          byKey.has(row.key) ? { ...row, writeResult: byKey.get(row.key), accepted: false } : row,
        ),
      );
      const updated = results.filter((result) => result.status === "updated").length;
      toast.success(`Upisano ${updated}, preskoceno ${results.length - updated}.`);
      setIsConfirmOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Upis nije uspeo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    addFiles(event.dataTransfer.files);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };

  const handlePullFromWhatsApp = async () => {
    if (isPullingWa) return;
    setIsPullingWa(true);
    try {
      const response = await fetch("/api/receipt-extract/from-whatsapp", { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { images?: WaPulledImage[]; scannedMessages?: number; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error || "Povlacenje iz WhatsApp-a nije uspelo.");
      }
      const entries = data?.images ?? [];
      const fresh = entries.filter((entry) => !pulledWaKeysRef.current.has(waImageKey(entry)));
      if (fresh.length === 0) {
        toast.info(
          entries.length === 0 ? "Nema slika u chatu u poslednjih 48h." : "Sve slike iz chata su vec u tabeli.",
        );
        return;
      }
      for (const entry of fresh) pulledWaKeysRef.current.add(waImageKey(entry));
      addFiles(fresh.map((entry) => base64ToFile(entry.data, `wa-${entry.messageId}-${entry.imageIndex}.jpg`)));
      toast.success(`Dodato ${fresh.length} slika iz WhatsApp-a — obrada krece.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Povlacenje iz WhatsApp-a nije uspelo.");
    } finally {
      setIsPullingWa(false);
    }
  };

  const candidateName = (orderId?: string) => {
    if (!orderId) return "—";
    const candidate = candidates?.find((entry) => entry.id === orderId);
    return candidate ? candidate.customerName : orderId;
  };

  return (
    <div className="space-y-6">
      <Dialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) setIsConfirmOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Potvrdi upis</DialogTitle>
            <DialogDescription>
              Oznacices {validAcceptedRows.length}{" "}
              {validAcceptedRows.length === 1 ? "narudzbinu" : "narudzbina"} kao poslato i upisati broj posiljke.
              Upis ide u produkcijsku bazu.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-slate-700">
            {validAcceptedRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3">
                <span className="truncate">{candidateName(row.selectedOrderId)}</span>
                <span className="font-mono text-xs text-slate-500">{digitsOnly(row.brojDraft)}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsConfirmOpen(false)} disabled={isSaving}>
              Otkazi
            </Button>
            <Button type="button" onClick={() => void handleConfirmSubmit()} disabled={isSaving}>
              {isSaving ? "Upisivanje..." : "Potvrdi i posalji sve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Uvoz AKS priznanica</h1>
          <p className="text-sm text-slate-500">
            Ubaci slike priznanica — ekstrakcija (Gemini) + bar-kod predlazu narudzbine. Nista se ne upisuje
            bez tvoje potvrde.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {candidates === undefined ? "..." : `${waitingCount} ceka slanje`}
          </div>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/narudzbine">
              <ArrowLeft className="h-4 w-4" />
              Narudzbine
            </Link>
          </Button>
        </div>
      </header>

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
          isDragOver ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <ImagePlus className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-700">Prevuci slike priznanica ovde ili klikni za izbor</p>
        <p className="text-xs text-slate-500">Moze vise slika odjednom. Obrada ide redom, slika po slika.</p>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-500">Ili povuci slike papirica direktno iz WhatsApp chata (poslednjih 48h).</p>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => void handlePullFromWhatsApp()}
          disabled={isPullingWa}
        >
          <Download className="h-4 w-4" />
          {isPullingWa ? "Povlacenje..." : "Povuci papiriće iz WhatsApp-a"}
        </Button>
      </div>

      {isPullingWa ? (
        <LoadingDots show label="Povlacim slike iz WhatsApp-a (ako je prvi put, skeniraj QR u konzoli servera)..." />
      ) : null}

      {pendingCount > 0 ? (
        <LoadingDots show label={`Obrada priznanica (${pendingCount} preostalo)...`} />
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slika</TableHead>
                <TableHead>Izvuceno</TableHead>
                <TableHead>Narudzbina</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Upozorenja</TableHead>
                <TableHead className="text-center">Prihvati</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const match = matches.get(row.key);
                const frozen = Boolean(row.writeResult);
                const warnings: string[] = [];
                if (row.extracted?.warning) warnings.push(row.extracted.warning);
                if (row.broj?.mismatch) {
                  warnings.push(`Bar-kod (${digitsOnly(row.barcode ?? "")}) se ne poklapa sa Gemini ciframa — proveri.`);
                }
                if (row.broj?.source === "barcode") {
                  warnings.push("Broj procitan samo sa bar-koda — proveri.");
                }
                if (match) warnings.push(...match.warnings);
                return (
                  <TableRow key={row.key}>
                    <TableCell>
                      <a href={row.previewUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.previewUrl}
                          alt="Priznanica"
                          className="h-12 w-12 rounded-md border border-slate-200 object-cover"
                        />
                      </a>
                    </TableCell>
                    <TableCell>
                      {row.status === "processing" || row.status === "queued" ? (
                        <span className="text-sm text-slate-400">Obrada...</span>
                      ) : row.status === "failed" ? (
                        <span className="text-sm text-rose-600">{row.error}</span>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-900">
                            {row.extracted?.imePrimaoca || "(ime nije procitano)"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.extracted?.telefonPrimaoca || "(telefon nije procitan)"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              value={row.brojDraft ?? ""}
                              placeholder="Broj posiljke"
                              className="h-8 w-40 font-mono text-xs"
                              disabled={frozen}
                              onChange={(event) => updateRow(row.key, { brojDraft: event.target.value })}
                            />
                            {row.broj?.barcodeConfirmed ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                Bar-kod ✓
                              </span>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {frozen ? (
                        <span className="text-sm text-slate-700">{candidateName(row.selectedOrderId)}</span>
                      ) : row.status === "ready" ? (
                        <select
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                          value={row.selectedOrderId ?? ""}
                          onChange={(event) =>
                            updateRow(row.key, {
                              selectedOrderId: event.target.value,
                              ...(event.target.value === "" ? { accepted: false } : {}),
                            })
                          }
                        >
                          <option value="">— izaberi —</option>
                          {dropdownCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.customerName} · {candidate.phone} ·{" "}
                              {stageShortLabels[candidate.stage] ?? candidate.stage}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {frozen ? (
                        row.writeResult?.status === "updated" ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                            Upisano
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                            Preskoceno
                          </span>
                        )
                      ) : row.status === "ready" && match ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${matchBadge[match.status].tone}`}
                          title={match.reason}
                        >
                          {matchBadge[match.status].label}
                        </span>
                      ) : row.status === "failed" ? (
                        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800">
                          Greska
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {frozen && row.writeResult?.reason ? (
                        <p className="text-xs text-amber-700">{row.writeResult.reason}</p>
                      ) : warnings.length > 0 ? (
                        <ul className="space-y-0.5 text-xs text-amber-700">
                          {warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      ) : match ? (
                        <p className="text-xs text-slate-500">{match.reason}</p>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.status === "failed" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => updateRow(row.key, { status: "queued", error: undefined })}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Ponovi
                        </Button>
                      ) : (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={row.accepted}
                          disabled={frozen || row.status !== "ready"}
                          onChange={(event) => updateRow(row.key, { accepted: event.target.checked })}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.key)}
                        aria-label="Ukloni sliku"
                      >
                        <Trash2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Prihvaceno {acceptedRows.length} od {rows.length}
            {acceptedRows.length !== validAcceptedRows.length
              ? " — svaki prihvacen red mora da ima izabranu narudzbinu i broj posiljke."
              : "."}
          </p>
          <Button type="button" onClick={() => setIsConfirmOpen(true)} disabled={!canConfirm}>
            Potvrdi i posalji sve ({validAcceptedRows.length})
          </Button>
        </div>
      ) : null}
    </div>
  );
}
