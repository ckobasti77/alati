"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Trash2 } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { LoadingDots } from "@/components/LoadingDots";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { matchLegleBatch, type CandidateOrder, type LegleData, type MatchResult } from "@/lib/legleMatcher";
import { downscaleForOcr } from "@/lib/receiptBarcode";
import type { LegleExtraction, LegleRow } from "@/lib/legleExtract";

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

const matchBadge: Record<MatchResult["status"], { label: string; tone: string }> = {
  high: { label: "Pouzdano", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  review: { label: "Proveri", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  none: { label: "Nema predloga", tone: "border-rose-200 bg-rose-50 text-rose-800" },
};

type UploadStatus = "processing" | "done" | "failed";

type UploadState = {
  key: string;
  name: string;
  previewUrl: string;
  status: UploadStatus;
  error?: string;
  rowCount?: number;
};

// Jedan red tabele = jedna stavka (red) sa AKS specifikacije.
type LegleItem = {
  key: string;
  uploadKey: string;
  platilac: string;
  nalogId: string;
  extractWarning?: string;
  matchInit?: boolean;
  selectedOrderId?: string;
  accepted: boolean;
  writeResult?: { status: "updated" | "skipped"; reason?: string };
};

type MarkLegloResult = { orderId: string; status: "updated" | "skipped"; reason?: string };

async function extractViaApi(file: File): Promise<LegleExtraction> {
  const blob = await downscaleForOcr(file);
  const form = new FormData();
  form.append("file", blob, file.name);
  const response = await fetch("/api/legle-extract", { method: "POST", body: form });
  const data = (await response.json().catch(() => null)) as (LegleExtraction & { error?: string }) | null;
  if (!response.ok) {
    throw new Error(data?.error || "Ekstrakcija nije uspela.");
  }
  if (!data) {
    throw new Error("Ekstrakcija nije vratila podatke.");
  }
  return data;
}

export default function LegleParePage() {
  return (
    <RequireAuth>
      <LegleContent />
    </RequireAuth>
  );
}

function LegleContent() {
  const orderScope: "default" | "kalaba" = "default";
  const { token } = useAuth();
  const sessionToken = token as string;

  const candidates = useConvexQuery<CandidateOrder[]>("orders:pendingForShipping", {
    token: sessionToken,
    scope: orderScope,
  });
  const markLegloBatch = useConvexMutation<
    { token: string; scope: "default" | "kalaba"; items: { orderId: string }[] },
    MarkLegloResult[]
  >("orders:markLegloBatch");

  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [items, setItems] = useState<LegleItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processingRef = useRef(false);
  const previewUrlsRef = useRef<string[]>([]);

  previewUrlsRef.current = uploads.map((upload) => upload.previewUrl);
  useEffect(
    () => () => {
      for (const url of previewUrlsRef.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const filesRef = useRef<Map<string, File>>(new Map());

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const files = Array.from(incoming).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) return;
    setUploads((prev) => [
      ...prev,
      ...files.map((file) => {
        const key = crypto.randomUUID();
        filesRef.current.set(key, file);
        return {
          key,
          name: file.name,
          previewUrl: URL.createObjectURL(file),
          status: "processing" as const,
        };
      }),
    ]);
  }, []);

  // Sekvencijalna obrada slika: jedna po jedna (Gemini sluzi jedan zahtev).
  useEffect(() => {
    if (processingRef.current) return;
    const next = uploads.find((upload) => upload.status === "processing" && upload.rowCount === undefined && !upload.error);
    if (!next) return;
    const file = filesRef.current.get(next.key);
    if (!file) return;
    processingRef.current = true;
    void (async () => {
      try {
        const extraction = await extractViaApi(file);
        const rows: LegleRow[] = extraction.rows ?? [];
        setItems((prev) => [
          ...prev,
          ...rows.map((row) => ({
            key: crypto.randomUUID(),
            uploadKey: next.key,
            platilac: row.platilac,
            nalogId: row.nalogId,
            extractWarning: row.warning,
            accepted: false,
          })),
        ]);
        setUploads((prev) =>
          prev.map((upload) =>
            upload.key === next.key
              ? { ...upload, status: "done", rowCount: rows.length, error: extraction.warning }
              : upload,
          ),
        );
        if (rows.length === 0) {
          toast.info(extraction.warning || "Nijedan red nije pročitan sa slike.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Obrada slike nije uspela.";
        setUploads((prev) =>
          prev.map((upload) => (upload.key === next.key ? { ...upload, status: "failed", error: message } : upload)),
        );
      } finally {
        filesRef.current.delete(next.key);
        processingRef.current = false;
      }
    })();
  }, [uploads]);

  const dropdownCandidates = useMemo(() => {
    if (!candidates) return [];
    return [...candidates].sort((a, b) => a.customerName.localeCompare(b.customerName, "sr"));
  }, [candidates]);

  const matchableItems = useMemo(() => items.filter((item) => !item.writeResult), [items]);

  const matches = useMemo(() => {
    const map = new Map<string, MatchResult>();
    if (!candidates || matchableItems.length === 0) return map;
    const rows: LegleData[] = matchableItems.map((item) => ({
      platilac: item.platilac || undefined,
      nalogId: item.nalogId || undefined,
    }));
    const results = matchLegleBatch(rows, candidates);
    matchableItems.forEach((item, index) => map.set(item.key, results[index]));
    return map;
  }, [matchableItems, candidates]);

  // Prvi put kad match stigne za stavku: prefiluj dropdown i default "Prihvati"
  // (samo za "high" — egzaktan pogodak po NalogID broju bez upozorenja).
  useEffect(() => {
    if (!candidates) return;
    const candidateIds = new Set(dropdownCandidates.map((candidate) => candidate.id));
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        if (item.matchInit || item.writeResult) return item;
        const match = matches.get(item.key);
        if (!match) return item;
        const proposed = match.orderId && candidateIds.has(match.orderId) ? match.orderId : "";
        changed = true;
        return {
          ...item,
          matchInit: true,
          selectedOrderId: proposed,
          accepted: match.status === "high" && proposed !== "",
        };
      });
      return changed ? next : prev;
    });
  }, [matches, candidates, dropdownCandidates]);

  const updateItem = useCallback((key: string, patch: Partial<LegleItem>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const acceptedItems = useMemo(
    () => items.filter((item) => item.accepted && !item.writeResult),
    [items],
  );
  const validAcceptedItems = useMemo(
    () => acceptedItems.filter((item) => item.selectedOrderId),
    [acceptedItems],
  );
  const processingCount = uploads.filter((upload) => upload.status === "processing").length;
  const canConfirm = acceptedItems.length > 0 && acceptedItems.length === validAcceptedItems.length && !isSaving;

  const candidateName = (orderId?: string) => {
    if (!orderId) return "—";
    const candidate = candidates?.find((entry) => entry.id === orderId);
    return candidate ? candidate.customerName : orderId;
  };

  const handleConfirmSubmit = async () => {
    if (isSaving || validAcceptedItems.length === 0) return;
    setIsSaving(true);
    try {
      const submitted = validAcceptedItems;
      const payload = submitted.map((item) => ({ orderId: item.selectedOrderId as string }));
      const results = await markLegloBatch({ token: sessionToken, scope: orderScope, items: payload });
      const byKey = new Map<string, { status: "updated" | "skipped"; reason?: string }>();
      submitted.forEach((item, index) => {
        const result = results[index];
        if (result) byKey.set(item.key, { status: result.status, reason: result.reason });
      });
      setItems((prev) =>
        prev.map((item) =>
          byKey.has(item.key) ? { ...item, writeResult: byKey.get(item.key), accepted: false } : item,
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
              Oznacices {validAcceptedItems.length}{" "}
              {validAcceptedItems.length === 1 ? "narudzbinu" : "narudzbina"} kao „Legle pare". Upis ide u
              produkcijsku bazu.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-slate-700">
            {validAcceptedItems.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <span className="truncate">{candidateName(item.selectedOrderId)}</span>
                <span className="font-mono text-xs text-slate-500">{item.nalogId}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsConfirmOpen(false)} disabled={isSaving}>
              Otkazi
            </Button>
            <Button type="button" onClick={() => void handleConfirmSubmit()} disabled={isSaving}>
              {isSaving ? "Upisivanje..." : "Potvrdi i oznaci sve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Uvoz specifikacije (legle pare)</h1>
          <p className="text-sm text-slate-500">
            Ubaci sliku AKS specifikacije leglih pouzeca — ekstrakcija (Gemini) poklapa narudzbine po broju
            posiljke (NalogID). Nista se ne upisuje bez tvoje potvrde.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />
        <ImagePlus className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-2 text-sm font-medium text-slate-700">Prevuci sliku specifikacije ovde ili klikni za izbor</p>
        <p className="text-xs text-slate-500">Jedna slika moze imati vise redova — svaki red je jedno leglo pouzece.</p>
      </div>

      {processingCount > 0 ? (
        <LoadingDots show label={`Obrada specifikacije (${processingCount} slika u obradi)...`} />
      ) : null}

      {uploads.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {uploads.map((upload) => (
            <div
              key={upload.key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <a href={upload.previewUrl} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={upload.previewUrl}
                  alt="Specifikacija"
                  className="h-10 w-10 rounded-md border border-slate-200 object-cover"
                />
              </a>
              <div className="text-xs">
                <div className="max-w-[10rem] truncate font-medium text-slate-700">{upload.name}</div>
                {upload.status === "processing" ? (
                  <span className="text-slate-400">Obrada...</span>
                ) : upload.status === "failed" ? (
                  <span className="text-rose-600">{upload.error}</span>
                ) : (
                  <span className="text-slate-500">
                    {upload.rowCount ?? 0} {upload.rowCount === 1 ? "red" : "redova"}
                    {upload.error ? ` · ${upload.error}` : ""}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platilac</TableHead>
                <TableHead>NalogID (broj posiljke)</TableHead>
                <TableHead>Narudzbina</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Upozorenja</TableHead>
                <TableHead className="text-center">Prihvati</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const match = matches.get(item.key);
                const frozen = Boolean(item.writeResult);
                const warnings: string[] = [];
                if (item.extractWarning) warnings.push(item.extractWarning);
                if (match) warnings.push(...match.warnings);
                return (
                  <TableRow key={item.key}>
                    <TableCell>
                      <span className="text-sm font-medium text-slate-900">
                        {item.platilac || "(ime nije procitano)"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-slate-600">{item.nalogId || "—"}</span>
                    </TableCell>
                    <TableCell>
                      {frozen ? (
                        <span className="text-sm text-slate-700">{candidateName(item.selectedOrderId)}</span>
                      ) : (
                        <select
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                          value={item.selectedOrderId ?? ""}
                          onChange={(event) =>
                            updateItem(item.key, {
                              selectedOrderId: event.target.value,
                              ...(event.target.value === "" ? { accepted: false } : {}),
                            })
                          }
                        >
                          <option value="">— izaberi —</option>
                          {dropdownCandidates.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {candidate.customerName}
                              {candidate.brojPosiljke ? ` · ${candidate.brojPosiljke}` : ""} ·{" "}
                              {stageShortLabels[candidate.stage] ?? candidate.stage}
                            </option>
                          ))}
                        </select>
                      )}
                    </TableCell>
                    <TableCell>
                      {frozen ? (
                        item.writeResult?.status === "updated" ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                            Upisano
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                            Preskoceno
                          </span>
                        )
                      ) : match ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${matchBadge[match.status].tone}`}
                          title={match.reason}
                        >
                          {matchBadge[match.status].label}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {frozen && item.writeResult?.reason ? (
                        <p className="text-xs text-amber-700">{item.writeResult.reason}</p>
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
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={item.accepted}
                        disabled={frozen}
                        onChange={(event) => updateItem(item.key, { accepted: event.target.checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.key)}
                        aria-label="Ukloni red"
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

      {items.length > 0 ? (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-500">
            Prihvaceno {acceptedItems.length} od {items.length}
            {acceptedItems.length !== validAcceptedItems.length
              ? " — svaki prihvacen red mora da ima izabranu narudzbinu."
              : "."}
          </p>
          <Button type="button" onClick={() => setIsConfirmOpen(true)} disabled={!canConfirm}>
            Potvrdi i oznaci sve ({validAcceptedItems.length})
          </Button>
        </div>
      ) : null}
    </div>
  );
}
