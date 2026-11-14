"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, Inbox, List } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/ui/stepper";
import type { DraftOrder } from "@/lib/waIntake/types";
import {
  ImportActionBar,
  ImportHeader,
  outlineButtonClass,
  ProgressNote,
  RowCard,
  Spinner,
} from "../uvoz/_components/ImportKit";
import type { DraftRow, ProductOption, WaChat } from "./_components/types";
import { WaRows } from "./_components/WaRows";
import { pluralOrders } from "../_lib/orderView";

type BatchItem = {
  waMessageId: string;
  waTimestamp: number;
  customerName: string;
  phone: string;
  address: string;
  pickup?: boolean;
  title: string;
  productId?: string;
  nabavnaCena?: number;
  prodajnaCena?: number;
  napomena?: string;
};

type BatchResult = { waMessageId: string; status: "inserted" | "skipped"; reason?: string; orderId?: string };

const parsePriceInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const priceInputValid = (value: string) => value.trim() === "" || parsePriceInput(value) !== undefined;

const qrLinkClass = "font-medium text-accent-text underline underline-offset-2";

export default function WaUvozPage() {
  return (
    <RequireAuth>
      <WaUvozContent />
    </RequireAuth>
  );
}

function WaUvozContent() {
  const orderScope: "default" | "kalaba" = "default";
  const { token } = useAuth();
  const sessionToken = token as string;

  const products = useConvexQuery<ProductOption[]>("products:list", { token: sessionToken });
  const createBatchFromWa = useConvexMutation<
    { token: string; scope: "default" | "kalaba"; items: BatchItem[] },
    BatchResult[]
  >("orders:createBatchFromWa");

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [isPulling, setIsPulling] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastPullInfo, setLastPullInfo] = useState<string | null>(null);

  const [chats, setChats] = useState<WaChat[] | null>(null);
  const [isListingChats, setIsListingChats] = useState(false);

  const productOptions = useMemo(
    () =>
      (products ?? [])
        .map((product) => ({ id: product._id, label: product.kpName ?? product.name }))
        .sort((a, b) => a.label.localeCompare(b.label, "sr")),
    [products],
  );

  const handlePull = async () => {
    if (isPulling) return;
    setIsPulling(true);
    try {
      const response = await fetch("/api/wa-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: sessionToken, scope: orderScope }),
      });
      const data = (await response.json().catch(() => null)) as
        | { drafts?: DraftOrder[]; scannedMessages?: number; errors?: string[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error || "Uvoz iz WhatsApp-a nije uspeo.");
      }
      const drafts = data?.drafts ?? [];
      setRows(
        drafts.map((draft) => ({
          key: crypto.randomUUID(),
          draft,
          customerName: draft.customerName,
          phone: draft.phone,
          address: draft.address,
          title: draft.title,
          productId: draft.productId ?? "",
          nabavnaDraft: draft.nabavnaCena !== undefined ? String(draft.nabavnaCena) : "",
          prodajnaDraft: draft.prodajnaCena !== undefined ? String(draft.prodajnaCena) : "",
          napomena: "",
          pickup: draft.pickup,
          accepted: false,
        })),
      );
      setLastPullInfo(`Pregledano poruka: ${data?.scannedMessages ?? 0}, predloženo narudžbina: ${drafts.length}.`);
      for (const message of data?.errors ?? []) toast.error(message);
      if (drafts.length === 0) {
        toast.info("Nema novih narudžbina u chatu.");
      } else {
        toast.success(`Predloženo za pregled: ${drafts.length}.`);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Uvoz iz WhatsApp-a nije uspeo.");
    } finally {
      setIsPulling(false);
    }
  };

  const handleListChats = async () => {
    if (isListingChats) return;
    setIsListingChats(true);
    try {
      const response = await fetch("/api/wa-intake/chats");
      const data = (await response.json().catch(() => null)) as { chats?: WaChat[]; error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error || "Izlistavanje chatova nije uspelo.");
      }
      const list = data?.chats ?? [];
      setChats(list);
      if (list.length === 0) {
        toast.info("Nema chatova (ili klijent još nije spreman).");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Izlistavanje chatova nije uspelo.");
    } finally {
      setIsListingChats(false);
    }
  };

  const handleCopyChatId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("ID kopiran.");
    } catch (error) {
      console.error(error);
      toast.error("Kopiranje nije uspelo.");
    }
  };

  const updateRow = useCallback((key: string, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }, []);

  const removeRow = useCallback((key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  }, []);

  const isRowValid = useCallback(
    (row: DraftRow) =>
      row.customerName.trim() !== "" &&
      row.phone.trim() !== "" &&
      row.title.trim() !== "" &&
      (row.pickup || row.address.trim() !== "") &&
      priceInputValid(row.nabavnaDraft) &&
      priceInputValid(row.prodajnaDraft),
    [],
  );

  const acceptedRows = useMemo(() => rows.filter((row) => row.accepted && !row.writeResult), [rows]);
  const validAcceptedRows = useMemo(() => acceptedRows.filter(isRowValid), [acceptedRows, isRowValid]);
  const canConfirm = acceptedRows.length > 0 && acceptedRows.length === validAcceptedRows.length && !isSaving;

  // Vraca true kad je upis prosao; ConfirmDialog ostaje otvoren ako se vrati false (greska).
  const handleConfirmSubmit = async (): Promise<boolean> => {
    if (isSaving || validAcceptedRows.length === 0) return false;
    setIsSaving(true);
    try {
      const submitted = validAcceptedRows;
      const items: BatchItem[] = submitted.map((row) => {
        const nabavnaCena = parsePriceInput(row.nabavnaDraft);
        const prodajnaCena = parsePriceInput(row.prodajnaDraft);
        return {
          waMessageId: row.draft.waMessageId,
          waTimestamp: row.draft.waTimestamp,
          customerName: row.customerName.trim(),
          phone: row.phone.trim(),
          address: row.address.trim(),
          pickup: row.pickup,
          title: row.title.trim(),
          ...(row.productId ? { productId: row.productId } : {}),
          ...(nabavnaCena !== undefined ? { nabavnaCena } : {}),
          ...(prodajnaCena !== undefined ? { prodajnaCena } : {}),
          ...(row.napomena.trim() ? { napomena: row.napomena.trim() } : {}),
        };
      });
      const results = await createBatchFromWa({ token: sessionToken, scope: orderScope, items });
      const byKey = new Map<string, { status: "inserted" | "skipped"; reason?: string }>();
      submitted.forEach((row, index) => {
        const result = results[index];
        if (result) byKey.set(row.key, { status: result.status, reason: result.reason });
      });
      setRows((prev) =>
        prev.map((row) => (byKey.has(row.key) ? { ...row, writeResult: byKey.get(row.key), accepted: false } : row)),
      );
      const inserted = results.filter((result) => result.status === "inserted").length;
      toast.success(`Upisano ${inserted}, preskočeno ${results.length - inserted}.`);
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

  // Koraci: 0 Povuci (nema redova), 1 Proveri (redovi), 2 Upis (dijalog otvoren / snimanje),
  // 3 = sve upisano (poslednji korak je završen).
  const allWritten = rows.length > 0 && rows.every((row) => row.writeResult);
  const currentStep = allWritten ? 3 : isConfirmOpen || isSaving ? 2 : rows.length > 0 ? 1 : 0;

  const openRows = rows.filter((row) => !row.writeResult).length;
  const summary =
    acceptedRows.length === 0
      ? "Uključi „Prihvati“ kod bar jednog predloga da bi mogao da upišeš."
      : acceptedRows.length !== validAcceptedRows.length
        ? `Prihvaćeno ${acceptedRows.length} od ${openRows}. Svaki prihvaćen predlog mora da ima ime, telefon, naziv i (za slanje) adresu, a cene moraju biti brojevi.`
        : `Prihvaćeno ${acceptedRows.length} od ${openRows}.`;

  return (
    <div className="space-y-5 md:space-y-6">
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) setIsConfirmOpen(false);
        }}
        title="Potvrdi upis"
        description={`Upisaće se ${validAcceptedRows.length} ${pluralOrders(validAcceptedRows.length)} sa statusom Poručeno. Duplikati po WhatsApp poruci se automatski preskaču.`}
        confirmLabel={`Upiši (${validAcceptedRows.length})`}
        onConfirm={async () => {
          if (!(await handleConfirmSubmit())) throw new Error("Upis nije uspeo.");
        }}
      >
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-text">
          {validAcceptedRows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3">
              <span className="truncate">
                {row.customerName} · {row.title}
              </span>
              <span className="shrink-0 text-xs text-text-muted">{row.pickup ? "lično" : "slanje"}</span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      <ImportHeader
        title="WA uvoz"
        description="Povuče nove poruke iz WhatsApp chata, grupiše ih i pročita, a KP daje prodajnu cenu. Ništa se ne upisuje bez tvoje potvrde."
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
        label="Koraci WA uvoza"
        steps={[
          { key: "povuci", label: "Povuci" },
          { key: "proveri", label: "Proveri" },
          { key: "upis", label: "Upis" },
        ]}
        current={currentStep}
      />

      <section aria-label="Povlačenje poruka" className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-text">Nove poruke iz WhatsApp-a</h2>
          <p className="text-[13px] leading-5 text-text-muted">
            Poruke se čitaju automatski. Za svaku narudžbinu dobijaš predlog koji proveravaš pre upisa.
          </p>
        </div>
        <Button type="button" size="lg" className="w-full gap-2 md:w-auto" onClick={() => void handlePull()} disabled={isPulling}>
          {isPulling ? <Spinner /> : <Download className="size-4" aria-hidden />}
          {isPulling ? "Povlačenje…" : "Povuci iz WhatsApp-a"}
        </Button>
        {lastPullInfo && !isPulling ? <p className="text-[13px] leading-5 text-text-muted">{lastPullInfo}</p> : null}
      </section>

      {isPulling ? (
        <>
          <ProgressNote>
            Čitam chat i vadim podatke. Može potrajati. Ako je prvi put, prijavi nalog preko{" "}
            <a href="/api/wa-intake/qr" target="_blank" rel="noreferrer" className={qrLinkClass}>
              QR stranice
            </a>{" "}
            (otvara se u novom tabu).
          </ProgressNote>
          <ul className="space-y-3" aria-hidden>
            {[0, 1].map((index) => (
              <RowCard key={index}>
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-2/3 rounded-xl" />
              </RowCard>
            ))}
          </ul>
        </>
      ) : rows.length > 0 ? (
        <WaRows
          rows={rows}
          productOptions={productOptions}
          priceInputValid={priceInputValid}
          updateRow={updateRow}
          removeRow={removeRow}
        />
      ) : (
        <EmptyState
          icon={Inbox}
          compact
          title={lastPullInfo ? "Nema novih predloga" : "Još ništa nije povučeno"}
          description={
            lastPullInfo
              ? "U chatu nema novih narudžbina za uvoz."
              : "Klikni „Povuci iz WhatsApp-a“ da bi se pojavili predlozi narudžbina."
          }
        />
      )}

      {rows.length > 0 && !isPulling ? (
        <ImportActionBar summary={summary}>
          <Button type="button" className="w-full md:w-auto" onClick={() => setIsConfirmOpen(true)} disabled={!canConfirm}>
            Upiši ({validAcceptedRows.length})
          </Button>
        </ImportActionBar>
      ) : null}

      <details className="group rounded-2xl bg-surface ring-1 ring-border">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl px-4 text-sm font-medium text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <List className="size-4 text-text-muted" aria-hidden />
          Pomoć: proveri ime chata
        </summary>
        <div className="space-y-3 border-t border-border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[13px] leading-5 text-text-muted">
              Izlista sve chatove. Tačno IME ide u WA_PORUDZBINE_CHAT / WA_PAPIRICI_CHAT u .env.local.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`shrink-0 gap-2 ${outlineButtonClass}`}
              onClick={() => void handleListChats()}
              disabled={isListingChats}
            >
              {isListingChats ? <Spinner /> : <List className="size-4" aria-hidden />}
              {isListingChats ? "Učitavanje…" : "Izlistaj WhatsApp chatove"}
            </Button>
          </div>

          {isListingChats ? (
            <ProgressNote>
              Učitavam chatove. Ako je prvi put, prijavi nalog preko{" "}
              <a href="/api/wa-intake/qr" target="_blank" rel="noreferrer" className={qrLinkClass}>
                QR stranice
              </a>{" "}
              (otvara se u novom tabu).
            </ProgressNote>
          ) : null}

          {!isListingChats && chats && chats.length > 0 ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {chats.map((chat) => (
                <li key={chat.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-1.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">
                      {chat.name || "(bez imena)"}
                      {chat.isGroup ? <span className="ml-2 text-xs font-normal text-text-muted">grupa</span> : null}
                    </p>
                    <p className="truncate font-mono text-xs text-text-muted">{chat.id}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 gap-1 text-text hover:bg-surface-3"
                    onClick={() => void handleCopyChatId(chat.id)}
                  >
                    <Copy className="size-3.5" aria-hidden />
                    Kopiraj ID
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {!isListingChats && chats && chats.length === 0 ? (
            <p className="text-[13px] text-text-muted">Nema chatova za prikaz.</p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
