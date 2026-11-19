"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Inbox, TriangleAlert } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQueryState } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import { matchLegleBatch, type CandidateOrder, type LegleData, type MatchResult } from "@/lib/legleMatcher";
import { downscaleForOcr } from "@/lib/receiptBarcode";
import type { LegleExtraction, LegleRow } from "@/lib/legleExtract";
import { Dropzone, ImportActionBar, ImportHeader, outlineButtonClass, ProgressNote } from "../uvoz/_components/ImportKit";
import type { LegleItem, UploadState } from "./_components/types";
import { PareRows, UploadList } from "./_components/PareRows";
import { pluralOrders } from "../_lib/orderView";

type MarkLegloResult = { orderId: string; status: "updated" | "skipped"; reason?: string };

async function extractViaApi(file: File, token: string): Promise<LegleExtraction> {
  const blob = await downscaleForOcr(file);
  const form = new FormData();
  form.append("file", blob, file.name);
  form.append("token", token);
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

  const { data: candidates, error: candidatesError } = useConvexQueryState<CandidateOrder[]>(
    "orders:pendingForShipping",
    {
      token: sessionToken,
      scope: orderScope,
    },
  );
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

  // Sekvencijalna obrada slika: jedna po jedna (ekstrakcija sluzi jedan zahtev).
  useEffect(() => {
    if (processingRef.current) return;
    const next = uploads.find((upload) => upload.status === "processing" && upload.rowCount === undefined && !upload.error);
    if (!next) return;
    const file = filesRef.current.get(next.key);
    if (!file) return;
    processingRef.current = true;
    void (async () => {
      try {
        const extraction = await extractViaApi(file, sessionToken);
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
  }, [uploads, sessionToken]);

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

  // Vraca true kad je upis prosao; ConfirmDialog ostaje otvoren ako se vrati false (greska).
  const handleConfirmSubmit = async (): Promise<boolean> => {
    if (isSaving || validAcceptedItems.length === 0) return false;
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

  // Koraci: 0 Specifikacija (nema redova), 1 Uparivanje (redovi), 2 Upis (dijalog otvoren / snimanje),
  // 3 = sve upisano (poslednji korak je završen).
  const allWritten = items.length > 0 && items.every((item) => item.writeResult);
  const currentStep = allWritten ? 3 : isConfirmOpen || isSaving ? 2 : items.length > 0 ? 1 : 0;

  const openItems = items.filter((item) => !item.writeResult).length;
  const summary =
    acceptedItems.length === 0
      ? "Uključi „Prihvati“ kod bar jednog reda da bi mogao da upišeš."
      : acceptedItems.length !== validAcceptedItems.length
        ? `Prihvaćeno ${acceptedItems.length} od ${openItems}. Svaki prihvaćen red mora da ima izabranu narudžbinu.`
        : `Prihvaćeno ${acceptedItems.length} od ${openItems}.`;

  return (
    <div className="space-y-5 md:space-y-6">
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) setIsConfirmOpen(false);
        }}
        title="Potvrdi upis"
        description={`Označićeš ${validAcceptedItems.length} ${pluralOrders(validAcceptedItems.length, "akuzativ")} kao „Legle pare“. Upis ide u produkcijsku bazu.`}
        confirmLabel={`Upiši (${validAcceptedItems.length})`}
        onConfirm={async () => {
          if (!(await handleConfirmSubmit())) throw new Error("Upis nije uspeo.");
        }}
      >
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-text">
          {validAcceptedItems.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3">
              <span className="truncate">{candidateName(item.selectedOrderId)}</span>
              <span className="num font-mono text-xs text-text-muted">{item.nalogId}</span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      <ImportHeader
        title="Legle pare"
        description="Ubaci sliku AKS specifikacije leglih pouzeća. Slika se čita automatski, a narudžbine se upare po broju pošiljke (NalogID). Ništa se ne upisuje bez tvoje potvrde."
        aside={
          <Button asChild variant="outline" className={`gap-2 max-md:hidden ${outlineButtonClass}`}>
            <Link href="/narudzbine">
              <ArrowLeft className="size-4" aria-hidden />
              Narudžbine
            </Link>
          </Button>
        }
      />

      <Stepper
        label="Koraci uvoza specifikacije"
        steps={[
          { key: "specifikacija", label: "Učitaj" },
          { key: "uparivanje", label: "Upari" },
          { key: "upis", label: "Upis" },
        ]}
        current={currentStep}
      />

      {candidatesError ? (
        <EmptyState
          tone="danger"
          icon={TriangleAlert}
          title="Narudžbine za uparivanje nisu učitane"
          description="Bez njih redovi specifikacije ne mogu da se upare. Osveži stranicu ili pokušaj ponovo malo kasnije."
          action={
            <Button type="button" variant="outline" className={outlineButtonClass} onClick={() => window.location.reload()}>
              Pokušaj ponovo
            </Button>
          }
        />
      ) : (
        <>
          <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFileInput} />

          {candidates === undefined ? (
            <Skeleton className="h-44 w-full rounded-2xl" />
          ) : (
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
              titlePhone="Dodirni da izabereš sliku specifikacije"
              titleDesktop="Prevuci sliku specifikacije ovde ili klikni za izbor"
              hint="Slike (JPG, PNG). Jedna slika može imati više redova, svaki red je jedno leglo pouzeće."
              compact={uploads.length > 0}
            />
          )}

          {processingCount > 0 ? <ProgressNote>Obrada specifikacije: slika u obradi {processingCount}…</ProgressNote> : null}

          {uploads.length > 0 ? <UploadList uploads={uploads} /> : null}

          {items.length > 0 ? (
            <PareRows
              items={items}
              matches={matches}
              dropdownCandidates={dropdownCandidates}
              candidateName={candidateName}
              updateItem={updateItem}
              removeItem={removeItem}
            />
          ) : candidates !== undefined && processingCount === 0 ? (
            <EmptyState
              icon={Inbox}
              compact
              title="Još nema redova specifikacije"
              description="Dodaj sliku iznad. Svaki pročitan red postaje jedan predlog koji proveravaš pre upisa."
            />
          ) : null}

          {items.length > 0 ? (
            <ImportActionBar summary={summary}>
              <Button type="button" className="w-full md:w-auto" onClick={() => setIsConfirmOpen(true)} disabled={!canConfirm}>
                Upiši ({validAcceptedItems.length})
              </Button>
            </ImportActionBar>
          ) : null}
        </>
      )}
    </div>
  );
}
