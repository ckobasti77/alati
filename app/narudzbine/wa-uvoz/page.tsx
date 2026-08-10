"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, List, Trash2 } from "lucide-react";
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
import type { DraftOrder, PriceSource } from "@/lib/waIntake/types";

type ProductOption = { _id: string; name: string; kpName?: string };

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

type WaChat = { id: string; name: string; isGroup: boolean; lastMessageAt?: number };

type DraftRow = {
  key: string;
  draft: DraftOrder;
  customerName: string;
  phone: string;
  address: string;
  title: string;
  productId: string; // "" = bez proizvoda iz kataloga
  nabavnaDraft: string;
  prodajnaDraft: string;
  napomena: string;
  pickup: boolean;
  accepted: boolean;
  writeResult?: { status: "inserted" | "skipped"; reason?: string };
};

const sourceLabels: Record<PriceSource, string> = {
  poruka: "iz poruke",
  "kp-link": "KP link",
  "kp-pretraga": "KP pretraga",
  katalog: "katalog",
};

const confidenceBadge = (confidence: number) => {
  if (confidence >= 0.8) return { label: `Pouzdano ${Math.round(confidence * 100)}%`, tone: "border-emerald-200 bg-emerald-50 text-emerald-800" };
  if (confidence >= 0.5) return { label: `Proveri ${Math.round(confidence * 100)}%`, tone: "border-amber-200 bg-amber-50 text-amber-800" };
  return { label: `Nisko ${Math.round(confidence * 100)}%`, tone: "border-rose-200 bg-rose-50 text-rose-800" };
};

const parsePriceInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const priceInputValid = (value: string) => value.trim() === "" || parsePriceInput(value) !== undefined;

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
      setLastPullInfo(`Pregledano ${data?.scannedMessages ?? 0} poruka, predlozeno ${drafts.length} porudzbina.`);
      for (const message of data?.errors ?? []) toast.error(message);
      if (drafts.length === 0) {
        toast.info("Nema novih porudzbina u chatu.");
      } else {
        toast.success(`Predlozeno ${drafts.length} porudzbina za pregled.`);
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
        toast.info("Nema chatova (ili klijent jos nije spreman).");
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

  const handleConfirmSubmit = async () => {
    if (isSaving || validAcceptedRows.length === 0) return;
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
      toast.success(`Upisano ${inserted}, preskoceno ${results.length - inserted}.`);
      setIsConfirmOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Upis nije uspeo.");
    } finally {
      setIsSaving(false);
    }
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
              Upisace se {validAcceptedRows.length}{" "}
              {validAcceptedRows.length === 1 ? "narudzbina" : "narudzbina"} (stage: poruceno). Duplikati po WhatsApp
              poruci se automatski preskacu.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-sm text-slate-700">
            {validAcceptedRows.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-3">
                <span className="truncate">
                  {row.customerName} · {row.title}
                </span>
                <span className="text-xs text-slate-500">{row.pickup ? "licno" : "slanje"}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsConfirmOpen(false)} disabled={isSaving}>
              Otkazi
            </Button>
            <Button type="button" onClick={() => void handleConfirmSubmit()} disabled={isSaving}>
              {isSaving ? "Upisivanje..." : "Potvrdi i upisi sve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">WhatsApp uvoz porudzbina</h1>
          <p className="text-sm text-slate-500">
            Na dugme povuce nove poruke iz chata, Qwen ih grupise i procita, KP daje prodajnu cenu. Nista se ne
            upisuje bez tvoje potvrde.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" className="gap-2" onClick={() => void handlePull()} disabled={isPulling}>
            <Download className="h-4 w-4" />
            {isPulling ? "Povlacenje..." : "Povuci iz WhatsApp-a"}
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/narudzbine">
              <ArrowLeft className="h-4 w-4" />
              Narudzbine
            </Link>
          </Button>
        </div>
      </header>

      {isPulling ? (
        <LoadingDots show label="Citam chat, segmentiram i vadim podatke (Qwen + KP)... moze potrajati." />
      ) : null}

      {lastPullInfo && !isPulling ? <p className="text-xs text-slate-500">{lastPullInfo}</p> : null}

      <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Dev helper: proveri ime chata</h2>
            <p className="text-xs text-slate-500">
              Izlista sve chatove — tacno IME ide u WA_PORUDZBINE_CHAT / WA_PAPIRICI_CHAT u .env.local.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void handleListChats()}
            disabled={isListingChats}
          >
            <List className="h-4 w-4" />
            {isListingChats ? "Ucitavanje..." : "Izlistaj WhatsApp chatove"}
          </Button>
        </div>

        {isListingChats ? <LoadingDots show label="Ucitavam chatove (skeniraj QR u konzoli servera ako je prvi put)..." /> : null}

        {!isListingChats && chats && chats.length > 0 ? (
          <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
            {chats.map((chat) => (
              <li
                key={chat.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {chat.name || "(bez imena)"}
                    {chat.isGroup ? <span className="ml-2 text-xs font-normal text-slate-500">grupa</span> : null}
                  </p>
                  <p className="truncate font-mono text-xs text-slate-500">{chat.id}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => void handleCopyChatId(chat.id)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Kopiraj ID
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {!isListingChats && chats && chats.length === 0 ? (
          <p className="text-xs text-slate-500">Nema chatova za prikaz.</p>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tip</TableHead>
                <TableHead>Kupac</TableHead>
                <TableHead>Proizvod</TableHead>
                <TableHead>Cene</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Upozorenja</TableHead>
                <TableHead className="text-center">Prihvati</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const frozen = Boolean(row.writeResult);
                const badge = confidenceBadge(row.draft.confidence);
                return (
                  <TableRow key={row.key}>
                    <TableCell>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={row.pickup}
                          disabled={frozen}
                          onChange={(event) => updateRow(row.key, { pickup: event.target.checked })}
                        />
                        Licno
                      </label>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          value={row.customerName}
                          placeholder="Ime i prezime"
                          className="h-8 w-44 text-sm"
                          disabled={frozen}
                          onChange={(event) => updateRow(row.key, { customerName: event.target.value })}
                        />
                        <Input
                          value={row.phone}
                          placeholder="Telefon"
                          className="h-8 w-44 font-mono text-xs"
                          disabled={frozen}
                          onChange={(event) => updateRow(row.key, { phone: event.target.value })}
                        />
                        {!row.pickup ? (
                          <Input
                            value={row.address}
                            placeholder="Adresa"
                            className="h-8 w-44 text-xs"
                            disabled={frozen}
                            onChange={(event) => updateRow(row.key, { address: event.target.value })}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          value={row.title}
                          placeholder="Naziv narudzbine"
                          className="h-8 w-52 text-sm"
                          disabled={frozen}
                          onChange={(event) => updateRow(row.key, { title: event.target.value })}
                        />
                        <select
                          className="w-52 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                          value={row.productId}
                          disabled={frozen}
                          onChange={(event) => updateRow(row.key, { productId: event.target.value })}
                        >
                          <option value="">— bez proizvoda iz kataloga —</option>
                          {productOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {row.draft.productText ? (
                          <p className="max-w-52 truncate text-xs text-slate-500" title={row.draft.productText}>
                            Iz poruke: {row.draft.productText}
                          </p>
                        ) : null}
                        {row.draft.kpLink ? (
                          <a
                            href={row.draft.kpLink}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-52 truncate text-xs text-blue-600 hover:underline"
                          >
                            KP oglas
                          </a>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.nabavnaDraft}
                            placeholder="Nabavna"
                            className="h-8 w-24 text-xs"
                            disabled={frozen}
                            onChange={(event) => updateRow(row.key, { nabavnaDraft: event.target.value })}
                          />
                          {row.draft.nabavnaSource ? (
                            <span className="text-[11px] text-slate-500">{sourceLabels[row.draft.nabavnaSource]}</span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.prodajnaDraft}
                            placeholder="Prodajna"
                            className="h-8 w-24 text-xs"
                            disabled={frozen}
                            onChange={(event) => updateRow(row.key, { prodajnaDraft: event.target.value })}
                          />
                          {row.draft.prodajnaSource ? (
                            <span className="text-[11px] text-slate-500">{sourceLabels[row.draft.prodajnaSource]}</span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {frozen ? (
                        row.writeResult?.status === "inserted" ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                            Upisano
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                            Preskoceno
                          </span>
                        )
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${badge.tone}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {frozen && row.writeResult?.reason ? (
                        <p className="text-xs text-amber-700">{row.writeResult.reason}</p>
                      ) : row.draft.warnings.length > 0 ? (
                        <ul className="max-w-56 space-y-0.5 text-xs text-amber-700">
                          {row.draft.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={row.accepted}
                        disabled={frozen}
                        onChange={(event) => updateRow(row.key, { accepted: event.target.checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.key)}
                        aria-label="Ukloni predlog"
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
            Prihvaceno {acceptedRows.length} od {rows.filter((row) => !row.writeResult).length}
            {acceptedRows.length !== validAcceptedRows.length
              ? " — svaki prihvacen red mora da ima ime, telefon, naziv i (za slanje) adresu, a cene moraju biti brojevi."
              : "."}
          </p>
          <Button type="button" onClick={() => setIsConfirmOpen(true)} disabled={!canConfirm}>
            Potvrdi i upisi sve ({validAcceptedRows.length})
          </Button>
        </div>
      ) : null}
    </div>
  );
}
