"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, ImagePlus, Inbox, TriangleAlert } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQueryState } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import {
  matchBatch,
  type CandidateOrder,
  type MatchResult,
  type ReceiptData,
} from "@/lib/receiptMatcher";
import { decodeReceiptBarcode, downscaleForOcr, reconcileBroj } from "@/lib/receiptBarcode";
import type { ReceiptExtraction } from "@/lib/receiptExtract";
import {
  Dropzone,
  ImportActionBar,
  ImportHeader,
  outlineButtonClass,
  ProgressNote,
  Spinner,
} from "./_components/ImportKit";
import { pluralOrders } from "../_lib/orderView";
import type { ReceiptRow } from "./_components/types";
import { UvozRows } from "./_components/UvozRows";

const digitsOnly = (value?: string) => (value ?? "").replace(/\D/g, "");

// Zavrsena stanja: i dalje se mogu izabrati u dropdownu, ali se ne racunaju u
// badge "ceka slanje" (matcher ih salje na review sa upozorenjem).
const COMPLETED_STAGES = new Set(["poslato", "stiglo", "legle_pare", "vraceno"]);

type MarkPoslatoResult = { orderId: string; status: "updated" | "skipped"; reason?: string };

async function extractViaApi(file: File, token: string): Promise<ReceiptExtraction> {
  const blob = await downscaleForOcr(file);
  const form = new FormData();
  form.append("file", blob, file.name);
  form.append("token", token);
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

  const { data: candidates, error: candidatesError } = useConvexQueryState<CandidateOrder[]>(
    "orders:pendingForShipping",
    {
      token: sessionToken,
      scope: orderScope,
    },
  );
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

  // Sekvencijalna obrada: ekstrakcija sluzi jedan zahtev, pa red po red
  // (bar-kod za istu sliku ide paralelno sa pozivom ekstrakcije).
  useEffect(() => {
    if (processingRef.current) return;
    const next = rows.find((row) => row.status === "queued");
    if (!next) return;
    processingRef.current = true;
    setRows((prev) => prev.map((row) => (row.key === next.key ? { ...row, status: "processing" } : row)));
    void (async () => {
      try {
        const [extracted, barcode] = await Promise.all([extractViaApi(next.file, sessionToken), decodeReceiptBarcode(next.file)]);
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
  }, [rows, sessionToken]);

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

  // Vraca true kad je upis prosao; ConfirmDialog ostaje otvoren ako se vrati false (greska).
  const handleConfirmSubmit = async (): Promise<boolean> => {
    if (isSaving || validAcceptedRows.length === 0) return false;
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
      toast.success(`Upisano ${updated}, preskočeno ${results.length - updated}.`);
      setIsConfirmOpen(false);
      return true;
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Upis nije uspeo.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
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
        throw new Error(data?.error || "Povlačenje iz WhatsApp-a nije uspelo.");
      }
      const entries = data?.images ?? [];
      const fresh = entries.filter((entry) => !pulledWaKeysRef.current.has(waImageKey(entry)));
      if (fresh.length === 0) {
        toast.info(
          entries.length === 0 ? "Nema slika u chatu u poslednjih 48 sati." : "Sve slike iz chata su već u tabeli.",
        );
        return;
      }
      for (const entry of fresh) pulledWaKeysRef.current.add(waImageKey(entry));
      addFiles(fresh.map((entry) => base64ToFile(entry.data, `wa-${entry.messageId}-${entry.imageIndex}.jpg`)));
      toast.success(`Dodato slika iz WhatsApp-a: ${fresh.length}. Obrada kreće.`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Povlačenje iz WhatsApp-a nije uspelo.");
    } finally {
      setIsPullingWa(false);
    }
  };

  const candidateName = (orderId?: string) => {
    if (!orderId) return "—";
    const candidate = candidates?.find((entry) => entry.id === orderId);
    return candidate ? candidate.customerName : orderId;
  };

  // Koraci: 0 Slike (nema redova), 1 Provera (redovi), 2 Upis (dijalog otvoren / snimanje),
  // 3 = sve upisano (poslednji korak je završen).
  const allWritten =
    rows.length > 0 &&
    rows.some((row) => row.writeResult) &&
    rows.every((row) => row.writeResult || row.status === "failed");
  const currentStep = allWritten ? 3 : isConfirmOpen || isSaving ? 2 : rows.length > 0 ? 1 : 0;

  const acceptedCount = acceptedRows.length;
  const openRows = rows.filter((row) => !row.writeResult).length;
  const summary =
    acceptedCount === 0
      ? "Uključi „Prihvati“ kod bar jednog reda da bi mogao da upišeš."
      : acceptedCount !== validAcceptedRows.length
        ? `Prihvaćeno ${acceptedCount} od ${openRows}. Svaki prihvaćen red mora da ima izabranu narudžbinu i broj pošiljke.`
        : `Prihvaćeno ${acceptedCount} od ${openRows}.`;

  return (
    <div className="space-y-5 md:space-y-6">
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) setIsConfirmOpen(false);
        }}
        title="Potvrdi upis"
        description={`Označićeš ${validAcceptedRows.length} ${pluralOrders(validAcceptedRows.length, "akuzativ")} kao poslato i upisati broj pošiljke. Upis ide u produkcijsku bazu.`}
        confirmLabel={`Potvrdi i pošalji (${validAcceptedRows.length})`}
        onConfirm={async () => {
          if (!(await handleConfirmSubmit())) throw new Error("Upis nije uspeo.");
        }}
      >
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-text">
          {validAcceptedRows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3">
              <span className="truncate">{candidateName(row.selectedOrderId)}</span>
              <span className="num font-mono text-xs text-text-muted">{digitsOnly(row.brojDraft)}</span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      <ImportHeader
        title="Uvoz priznanica"
        description="Ubaci slike AKS priznanica: slike se čitaju automatski, a bar-kod predlaže narudžbine. Ništa se ne upisuje bez tvoje potvrde."
        aside={
          <>
            {candidates === undefined ? (
              candidatesError ? null : <Skeleton className="h-7 w-28 rounded-full" />
            ) : (
              <span className="num inline-flex h-7 items-center rounded-full bg-surface-2 px-3 text-xs font-medium text-text-muted ring-1 ring-border">
                {waitingCount} čeka slanje
              </span>
            )}
            <Button asChild variant="outline" className={`gap-2 max-md:hidden ${outlineButtonClass}`}>
              <Link href="/narudzbine">
                <ArrowLeft className="size-4" aria-hidden />
                Narudžbine
              </Link>
            </Button>
          </>
        }
      />

      <Stepper
        label="Koraci uvoza priznanica"
        steps={[
          { key: "slike", label: "Slike" },
          { key: "provera", label: "Provera" },
          { key: "upis", label: "Upis" },
        ]}
        current={currentStep}
      />

      {candidatesError ? (
        <EmptyState
          tone="danger"
          icon={TriangleAlert}
          title="Narudžbine za uparivanje nisu učitane"
          description="Bez njih priznanice ne mogu da se upare. Osveži stranicu ili pokušaj ponovo malo kasnije."
          action={
            <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => window.location.reload()}>
              Pokušaj ponovo
            </Button>
          }
        />
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />

          {candidates === undefined ? (
            <Skeleton className="h-44 w-full rounded-2xl" />
          ) : (
            <section aria-label="Dodavanje slika" className="space-y-3">
              <Dropzone
                isDragOver={isDragOver}
                onPick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                icon={ImagePlus}
                titlePhone="Dodirni da izabereš slike priznanica"
                titleDesktop="Prevuci slike priznanica ovde ili klikni za izbor"
                hint="Slike (JPG, PNG), može više odjednom. Obrada ide redom, slika po slika."
                compact={rows.length > 0}
              />
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-[13px] leading-5 text-text-muted">
                  Ili povuci slike papirića direktno iz WhatsApp chata (poslednjih 48 sati).
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className={`gap-2 ${outlineButtonClass}`}
                  onClick={() => void handlePullFromWhatsApp()}
                  disabled={isPullingWa}
                >
                  {isPullingWa ? <Spinner /> : <Download className="size-4" aria-hidden />}
                  {isPullingWa ? "Povlačenje…" : "Povuci papiriće iz WhatsApp-a"}
                </Button>
              </div>
            </section>
          )}

          {isPullingWa ? (
            <ProgressNote>
              Povlačim slike iz WhatsApp-a. Ako je prvi put, prijavi nalog preko{" "}
              <a
                href="/api/wa-intake/qr"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent-text underline underline-offset-2"
              >
                QR stranice
              </a>{" "}
              (otvara se u novom tabu).
            </ProgressNote>
          ) : null}

          {pendingCount > 0 ? <ProgressNote>Obrada priznanica: preostalo {pendingCount}…</ProgressNote> : null}

          {rows.length > 0 ? (
            <UvozRows
              rows={rows}
              matches={matches}
              candidates={candidates}
              dropdownCandidates={dropdownCandidates}
              candidateName={candidateName}
              digitsOnly={digitsOnly}
              updateRow={updateRow}
              removeRow={removeRow}
            />
          ) : candidates !== undefined ? (
            <EmptyState
              icon={Inbox}
              compact
              title="Još nema priznanica"
              description="Dodaj slike iznad. Svaka priznanica postaje jedan red koji proveravaš pre upisa."
            />
          ) : null}

          {rows.length > 0 ? (
            <ImportActionBar summary={summary}>
              <Button type="button" className="w-full md:w-auto" onClick={() => setIsConfirmOpen(true)} disabled={!canConfirm}>
                Potvrdi i pošalji ({validAcceptedRows.length})
              </Button>
            </ImportActionBar>
          ) : null}
        </>
      )}
    </div>
  );
}
