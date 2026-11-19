"use client";

// useOrderScreenshot.ts — "Popuni iz slike" u formi narudžbine:
// izbor slike (galerija/kamera, paste, drag-and-drop) → smanjenje u browseru
// (lib imagePrep) → POST /api/order-screenshot → popuna forme postojećim
// setterima. NIŠTA se ne snima automatski: korisnik uvek pritisne "Sačuvaj".
// Ako forma već ima unete podatke, pre prepisivanja se pita (ConfirmDialog).

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { useOrderCatalog } from "./useOrderCatalog";
import type { useOrderForm } from "./useOrderForm";
import { composeVariantLabel, getProductDisplayName } from "../_lib/helpers";
import { ImagePrepError, isImageFile, prepareImageForUpload } from "../_lib/imagePrep";
import {
  buildApplyPlan,
  buildFieldBadges,
  candidateOptions,
  formHasData,
  STRONG_MODEL,
  toScreenshotDraft,
  type CandidateOption,
  type ScreenshotBadges,
} from "../_lib/screenshotApply";
import type { ScreenshotDraft } from "@/lib/orderScreenshot/types";

export type ScreenshotStatus = "idle" | "loading" | "error";
export type ScreenshotError = { message: string; retryable: boolean };

// 429 (dnevni limit) — ista fiksna poruka kao u ruti (fallback kada telo nedostaje).
const RATE_LIMIT_FALLBACK = "Dnevni besplatni limit za čitanje slika je potrošen -- pokušaj sutra ili popuni ručno.";

class ScreenshotRequestError extends Error {
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "ScreenshotRequestError";
    this.retryable = retryable;
  }
}

type UseOrderScreenshotParams = {
  sessionToken: string;
  orderForm: ReturnType<typeof useOrderForm>;
  catalog: ReturnType<typeof useOrderCatalog>;
};

export function useOrderScreenshot({ sessionToken, orderForm, catalog }: UseOrderScreenshotParams) {
  const {
    form,
    draftItems,
    itemProductId,
    setItemProductId,
    setItemVariantId,
    setItemSupplierId,
    setItemQuantity,
    setProductInput,
    setProductMenuOpen,
    setUseManualSalePrice,
    setManualSalePrice,
    setUseManualPurchasePrice,
    setManualPurchasePrice,
  } = orderForm;
  const products = catalog.products;

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ScreenshotStatus>("idle");
  const [error, setError] = useState<ScreenshotError | null>(null);
  const [lastModel, setLastModel] = useState<"default" | typeof STRONG_MODEL>("default");
  const [draft, setDraft] = useState<ScreenshotDraft | null>(null);
  const [badges, setBadges] = useState<ScreenshotBadges | null>(null);
  const [candidatesDismissed, setCandidatesDismissed] = useState(false);
  const [applied, setApplied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pendingRef = useRef<ScreenshotDraft | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);
  const fileRef = useRef<File | null>(null);

  useEffect(() => {
    fileRef.current = file;
  }, [file]);

  const setPreview = useCallback((url: string | null) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreviewUrl(url);
  }, []);

  // Hook živi unutar tela Sheet-a: zatvaranje forme unmount-uje komponentu,
  // pa se stanje (slika, status, bedžovi) resetuje samo — bez reset efekta.
  // Unmount: abort u toku + oslobađanje object URL-a.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  // Nalepi (Ctrl+V) na desktopu: samo slike iz clipboarda, ne dirati tekstualno kopiranje.
  // Listener živi dok je sheet otvoren (unmount = zatvorena forma).
  const selectFileRef = useRef<(next: File) => void>(() => undefined);
  useEffect(() => {
    selectFileRef.current = selectFile;
  });
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const imageFile = item.getAsFile();
          if (imageFile) {
            event.preventDefault();
            selectFileRef.current(imageFile);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const applyDraft = useCallback(
    (next: ScreenshotDraft) => {
      const list = products ?? [];
      const plan = buildApplyPlan(next, list);
      const setValue = (name: "customerName" | "phone" | "address" | "pickup", value: string | boolean) =>
        form.setValue(name, value, { shouldDirty: true, shouldTouch: true });

      if (plan.customerName !== null) setValue("customerName", plan.customerName);
      if (plan.phone !== null) setValue("phone", plan.phone);
      if (plan.address !== null) setValue("address", plan.address);
      setValue("pickup", plan.pickup);

      if (plan.product) {
        const catalogProduct = list.find((item) => item._id === plan.product?.productId);
        const variant = catalogProduct?.variants?.find((item) => item.id === plan.product?.variantId);
        setItemProductId(plan.product.productId);
        setItemVariantId(plan.product.variantId);
        setItemSupplierId("");
        setItemQuantity(1);
        setProductInput(
          catalogProduct
            ? variant
              ? composeVariantLabel(catalogProduct, variant)
              : getProductDisplayName(catalogProduct)
            : (next.product?.name ?? ""),
        );
        setProductMenuOpen(false);
      }

      // Cena sa slike ide u ručnu (manualNabavna/manualProdajna) — pravilo 3.
      if (plan.prodajna !== null) {
        setUseManualSalePrice(true);
        setManualSalePrice(String(plan.prodajna));
      }
      if (plan.nabavna !== null) {
        setUseManualPurchasePrice(true);
        setManualPurchasePrice(String(plan.nabavna));
      }

      setBadges(buildFieldBadges(next, { product: plan.product !== null }));
      setDraft(next);
      setApplied(true);
    },
    [
      products,
      form,
      setItemProductId,
      setItemVariantId,
      setItemSupplierId,
      setItemQuantity,
      setProductInput,
      setProductMenuOpen,
      setUseManualSalePrice,
      setManualSalePrice,
      setUseManualPurchasePrice,
      setManualPurchasePrice,
    ],
  );

  // Izbor jednog od kandidata jednim tapom — proizvod + cene sa slike (ako postoje).
  const selectCandidate = useCallback(
    (option: CandidateOption) => {
      const list = products ?? [];
      const catalogProduct = list.find((item) => item._id === option.hit.productId);
      if (!catalogProduct) {
        toast.error("Proizvod nije nađen u listi — izaberi ga ručno.");
        return;
      }
      const variant = option.hit.variantId ? catalogProduct.variants?.find((item) => item.id === option.hit.variantId) : undefined;
      setItemProductId(catalogProduct._id);
      setItemVariantId(variant?.id ?? "");
      setItemSupplierId("");
      setItemQuantity(1);
      setProductInput(variant ? composeVariantLabel(catalogProduct, variant) : getProductDisplayName(catalogProduct));
      setProductMenuOpen(false);

      const current = draft;
      if (current) {
        if (current.prodajnaCena !== undefined && current.prodajnaCena !== null) {
          setUseManualSalePrice(true);
          setManualSalePrice(String(current.prodajnaCena));
        }
        if (current.nabavnaCena !== undefined && current.nabavnaCena !== null) {
          setUseManualPurchasePrice(true);
          setManualPurchasePrice(String(current.nabavnaCena));
        }
        setBadges(buildFieldBadges(current, { product: true }));
      }
      setApplied(true);
      setCandidatesDismissed(true);
    },
    [
      products,
      draft,
      setItemProductId,
      setItemVariantId,
      setItemSupplierId,
      setItemQuantity,
      setProductInput,
      setProductMenuOpen,
      setUseManualSalePrice,
      setManualSalePrice,
      setUseManualPurchasePrice,
      setManualPurchasePrice,
    ],
  );

  const dismissCandidates = useCallback(() => {
    setCandidatesDismissed(true);
  }, []);

  const read = useCallback(
    async (options: { model?: typeof STRONG_MODEL; file?: File } = {}) => {
      // options.file: selekcija zove read odmah (ref se sinkronizuje tek posle rendera).
      const currentFile = options.file ?? fileRef.current;
      if (!currentFile) return;
      const model = options.model;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setError(null);
      setLastModel(model ?? "default");
      try {
        const prepared = await prepareImageForUpload(currentFile);
        if (controller.signal.aborted) return;
        const body = new FormData();
        body.append("file", prepared.blob, prepared.fileName);
        body.append("token", sessionToken);
        if (model) body.append("model", model);
        const response = await fetch("/api/order-screenshot", { method: "POST", body, signal: controller.signal });
        const data: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const serverError =
            typeof data === "object" && data !== null && typeof (data as { error?: unknown }).error === "string"
              ? (data as { error: string }).error
              : undefined;
          const message =
            response.status === 429
              ? (serverError ?? RATE_LIMIT_FALLBACK)
              : (serverError ?? "Nešto nije pošlo po planu. Pokušaj ponovo.");
          // 429 (dnevni limit): poruka sa servera, BEZ "Pokušaj ponovo".
          throw new ScreenshotRequestError(message, response.status !== 429);
        }
        const parsed = toScreenshotDraft(data);
        if (!parsed) throw new ScreenshotRequestError("Server nije vratio ispravan podatak. Pokušaj ponovo.", true);
        if (controller.signal.aborted) return;
        setCandidatesDismissed(false);
        // Forma već ima unete podatke → pitaj pre prepisivanja.
        if (formHasData(form.getValues(), draftItems, itemProductId)) {
          pendingRef.current = parsed;
          setDraft(parsed);
          setConfirmOpen(true);
          setStatus("idle");
          return;
        }
        applyDraft(parsed);
        setStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof ScreenshotRequestError) {
          setStatus("error");
          setError({ message: err.message, retryable: err.retryable });
          return;
        }
        if (err instanceof ImagePrepError) {
          setStatus("error");
          setError({ message: err.message, retryable: false });
          return;
        }
        if (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setError({ message: "Sliku nije bilo moguće pročitati. Pokušaj ponovo.", retryable: true });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [sessionToken, form, draftItems, itemProductId, applyDraft],
  );

  // Izbor slike → odmah kreni sa čitanjem (pravilo 2: "Čitam sliku…" odmah posle selekcije).
  const selectFile = useCallback(
    (next: File) => {
      if (!isImageFile(next)) {
        setStatus("error");
        setError({ message: "Izaberi sliku (JPG, PNG ili slično).", retryable: true });
        return;
      }
      abortRef.current?.abort();
      abortRef.current = null;
      setFile(next);
      setPreview(URL.createObjectURL(next));
      setStatus("idle");
      setError(null);
      setLastModel("default");
      setDraft(null);
      setBadges(null);
      setCandidatesDismissed(false);
      setApplied(false);
      setConfirmOpen(false);
      pendingRef.current = null;
      void read({ file: next });
    },
    [setPreview, read],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setError(null);
  }, []);

  // "Pokušaj ponovo" — ista slika, isti model kao poslednji pokušaj.
  const retry = useCallback(() => {
    void read({ model: lastModel === STRONG_MODEL ? STRONG_MODEL : undefined });
  }, [lastModel, read]);

  // Pravilo 6: ista slika, jači model (whitelist u ruti: gemini-3.5-flash).
  const readStrong = useCallback(() => {
    void read({ model: STRONG_MODEL });
  }, [read]);

  // "Popuni formu" (nakon otkaženog prepisivanja) — ponovo proviriti da li je forma prazna.
  const requestApply = useCallback(() => {
    const current = draft;
    if (!current) return;
    if (formHasData(form.getValues(), draftItems, itemProductId)) {
      pendingRef.current = current;
      setConfirmOpen(true);
      return;
    }
    applyDraft(current);
  }, [draft, form, draftItems, itemProductId, applyDraft]);

  const confirmApply = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setConfirmOpen(false);
    if (pending) applyDraft(pending);
  }, [applyDraft]);

  const cancelConfirm = useCallback(() => {
    // Draft ostaje prikazan (upozorenja/kandidati) — korisnik može kasnije izabrati "Popuni formu".
    pendingRef.current = null;
    setConfirmOpen(false);
  }, []);

  const showCandidates = Boolean(draft && !candidatesDismissed && buildApplyPlan(draft, products ?? []).showCandidates);
  const candidateList: CandidateOption[] = draft ? candidateOptions(draft, products ?? []) : [];

  return {
    file,
    previewUrl,
    status,
    error,
    lastModel,
    draft,
    badges,
    applied,
    showCandidates,
    candidateList,
    confirmOpen,
    selectFile,
    read,
    retry,
    readStrong,
    cancel,
    requestApply,
    confirmApply,
    cancelConfirm,
    selectCandidate,
    dismissCandidates,
  };
}

export type OrderScreenshot = ReturnType<typeof useOrderScreenshot>;
