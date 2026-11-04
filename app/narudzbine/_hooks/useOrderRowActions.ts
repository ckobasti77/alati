"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexMutation } from "@/lib/convex";
import type { Order, OrderStage } from "@/types/order";
import { type QuickEditField, type QuickEditState, type ShipmentStageModalState } from "../_lib/types";
import { resolveShipmentNumber, resolveProfitPercent } from "../_lib/helpers";
import type { Dispatch, SetStateAction } from "react";

type UseOrderRowActionsParams = {
  convex: ReturnType<typeof useConvex>;
  orderScope: "default" | "kalaba";
  sessionToken: string;
  stageFilters: OrderStage[];
  showUnreturnedOnly: boolean;
  showReturnedOnly: boolean;
  setOrders: Dispatch<SetStateAction<Order[]>>;
  updateOrder: ReturnType<typeof useConvexMutation>;
};

/** Polja koja brze akcije menjaju (ostalo ide iz svežeg dokumenta). */
type QuickPatch = Partial<
  Pick<Order, "stage" | "brojPosiljke" | "povratVracen" | "kasni" | "transportCost" | "myProfitPercent" | "customerName" | "phone" | "address">
>;

export function useOrderRowActions({ convex, orderScope, sessionToken, stageFilters, showUnreturnedOnly, showReturnedOnly, setOrders, updateOrder }: UseOrderRowActionsParams) {
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [isQuickEditSaving, setIsQuickEditSaving] = useState(false);
  const [shipmentStageModal, setShipmentStageModal] = useState<ShipmentStageModalState | null>(null);
  const [shipmentNumberDraft, setShipmentNumberDraft] = useState("");
  const [isShipmentStageSaving, setIsShipmentStageSaving] = useState(false);
  const [manualRefundSavingId, setManualRefundSavingId] = useState<string | null>(null);
  const [kasniSavingId, setKasniSavingId] = useState<string | null>(null);
  // "U toku" preko ref-a: dvoklik/dvostruki tap ne šalje istu izmenu dva puta (state stiže tek posle rendera).
  const inFlightRef = useRef(new Set<string>());
  const setManualRefund100 = useConvexMutation<{
    token: string;
    id: string;
    scope: "default" | "kalaba";
    enabled: boolean;
  }, {
    enabled: boolean;
    changedAt: number | null;
  }>("orders:setManualRefund100");

  const runGuarded = useCallback(async <T,>(key: string, task: () => Promise<T>): Promise<T | undefined> => {
    if (inFlightRef.current.has(key)) return undefined;
    inFlightRef.current.add(key);
    try {
      return await task();
    } finally {
      inFlightRef.current.delete(key);
    }
  }, []);

  const copyText = useCallback(async (value: string, successMessage: string) => {
    const text = value.trim();
    if (!text) {
      toast.error("Nema vrednosti za kopiranje.");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement("textarea");
        temp.value = text;
        temp.setAttribute("readonly", "true");
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error("Kopiranje nije uspelo.");
    }
  }, []);

  const openQuickEdit = useCallback((order: Order, field: QuickEditField) => {
    if (field === "contact") {
      setQuickEdit({ field, order, customerName: order.customerName ?? "", phone: order.phone ?? "" });
      return;
    }
    if (field === "address") {
      setQuickEdit({ field, order, address: order.address ?? "" });
      return;
    }
    if (field === "transport") {
      setQuickEdit({
        field,
        order,
        transportCost: order.transportCost !== undefined && order.transportCost !== null ? String(order.transportCost) : "",
      });
      return;
    }
    setQuickEdit({ field, order, myProfitPercent: String(resolveProfitPercent(order.myProfitPercent)) });
  }, []);

  /**
   * Izmena jednog ili dva polja: payload se pravi iz SVEŽEG dokumenta (orders:get), ne iz reda u listi,
   * da se ne pregaze izmene napravljene u međuvremenu (detalj, drugi uređaj). Stavke se ne šalju, pa ih
   * server uzima iz baze. Vraća lokalni patch za red u listi.
   */
  const updateFromFresh = useCallback(
    async (orderId: string, patch: QuickPatch): Promise<Partial<Order>> => {
      const fresh = (await convex.query(api.orders.get, {
        token: sessionToken,
        id: orderId as Id<"orders">,
        scope: orderScope,
      })) as unknown as Order | null;
      if (!fresh) throw new Error("Narudžbina nije pronađena.");
      await updateOrder({
        token: sessionToken,
        scope: orderScope,
        id: fresh._id,
        stage: fresh.stage,
        title: fresh.title,
        customerName: fresh.customerName ?? "",
        address: fresh.address ?? "",
        phone: fresh.phone ?? "",
        napomena: fresh.napomena,
        brojPosiljke: fresh.brojPosiljke,
        povratVracen: fresh.povratVracen,
        kasni: fresh.kasni,
        transportCost: fresh.transportCost,
        slanjeMode: fresh.slanjeMode,
        slanjeOwner: fresh.slanjeOwner,
        myProfitPercent: fresh.myProfitPercent,
        pickup: fresh.pickup,
        ...patch,
      });
      // Isto kao server (orders:update): datumi se menjaju samo kad se vrednost promeni, "kasni" važi samo za Poslato.
      const now = Date.now();
      const nextStage = patch.stage ?? fresh.stage;
      const nextKasni = nextStage === "poslato" ? Boolean(patch.kasni ?? fresh.kasni) : false;
      const nextPovrat = Boolean(patch.povratVracen ?? fresh.povratVracen);
      const scalars: Partial<Order> & Record<string, unknown> = { ...fresh };
      delete scalars.items;
      delete scalars.product;
      delete scalars.history;
      return {
        ...scalars,
        ...patch,
        stage: nextStage,
        kasni: nextKasni,
        povratVracen: nextPovrat,
        stageChangedAt: nextStage !== fresh.stage ? now : fresh.stageChangedAt,
        kasniAt: nextKasni !== Boolean(fresh.kasni) ? (nextKasni ? now : undefined) : fresh.kasniAt,
        povratVracenAt: nextPovrat !== Boolean(fresh.povratVracen) ? (nextPovrat ? now : undefined) : fresh.povratVracenAt,
      };
    },
    [convex, orderScope, sessionToken, updateOrder],
  );

  /** Spaja lokalni patch u red; red izlazi iz liste ako više ne prolazi aktivni filter statusa/povrata. */
  const mergeIntoList = useCallback(
    (orderId: string, local: Partial<Order>) => {
      setOrders((prev) =>
        prev.flatMap((item) => {
          if (item._id !== orderId) return [item];
          const next = { ...item, ...local };
          if (stageFilters.length > 0 && !stageFilters.includes(next.stage)) return [];
          if (showUnreturnedOnly && next.povratVracen) return [];
          if (showReturnedOnly && !next.povratVracen) return [];
          return [next];
        }),
      );
    },
    [setOrders, showReturnedOnly, showUnreturnedOnly, stageFilters],
  );

  const closeQuickEdit = useCallback(() => {
    if (isQuickEditSaving) return;
    setQuickEdit(null);
  }, [isQuickEditSaving]);

  const handleQuickEditSave = async () => {
    if (!quickEdit) return;
    const parseNumber = (value: string) => Number(value.replace(",", "."));
    let patch: QuickPatch;
    if (quickEdit.field === "transport") {
      const trimmed = quickEdit.transportCost.trim();
      let nextCost: number | undefined;
      if (trimmed.length > 0) {
        const parsed = parseNumber(trimmed);
        if (!Number.isFinite(parsed) || parsed < 0) {
          toast.error("Transport mora biti 0 ili više.");
          return;
        }
        nextCost = parsed;
      }
      patch = { transportCost: nextCost };
    } else if (quickEdit.field === "contact") {
      const name = quickEdit.customerName.trim();
      const phone = quickEdit.phone.trim();
      if (name.length < 2) {
        toast.error("Popuni ime i prezime.");
        return;
      }
      if (phone.length < 2) {
        toast.error("Popuni broj telefona.");
        return;
      }
      patch = { customerName: name, phone };
    } else if (quickEdit.field === "address") {
      const address = quickEdit.address.trim();
      if (address.length < 2) {
        toast.error("Popuni adresu.");
        return;
      }
      patch = { address };
    } else {
      const trimmed = quickEdit.myProfitPercent.trim();
      if (!trimmed) {
        toast.error("Unesi procenat profita.");
        return;
      }
      const percent = parseNumber(trimmed);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        toast.error("Procenat mora biti između 0 i 100.");
        return;
      }
      patch = { myProfitPercent: percent };
    }

    const orderId = quickEdit.order._id;
    await runGuarded(`quick:${orderId}`, async () => {
      setIsQuickEditSaving(true);
      try {
        mergeIntoList(orderId, await updateFromFresh(orderId, patch));
        toast.success("Sačuvano.");
        setQuickEdit(null);
      } catch (error) {
        console.error(error);
        toast.error("Čuvanje nije uspelo.");
      } finally {
        setIsQuickEditSaving(false);
      }
    });
  };

  const persistStageChange = useCallback(
    async (order: Order, nextStage: OrderStage, patch: QuickPatch = {}) => {
      mergeIntoList(order._id, await updateFromFresh(order._id, { ...patch, stage: nextStage }));
      toast.success("Status narudžbine je promenjen.");
    },
    [mergeIntoList, updateFromFresh],
  );

  const closeShipmentStageModal = useCallback(() => {
    if (isShipmentStageSaving) return;
    setShipmentStageModal(null);
    setShipmentNumberDraft("");
  }, [isShipmentStageSaving]);

  const openShipmentStageModal = useCallback((order: Order, nextStage: OrderStage) => {
    setShipmentStageModal({ order, nextStage });
    setShipmentNumberDraft(resolveShipmentNumber(order));
  }, []);

  const handleShipmentStageSubmit = useCallback(async () => {
    if (!shipmentStageModal) return;
    const shipmentNumber = shipmentNumberDraft.trim();
    if (!shipmentNumber) {
      toast.error("Unesi broj pošiljke.");
      return;
    }
    await runGuarded(`stage:${shipmentStageModal.order._id}`, async () => {
      setIsShipmentStageSaving(true);
      try {
        await persistStageChange(shipmentStageModal.order, shipmentStageModal.nextStage, { brojPosiljke: shipmentNumber });
        setShipmentStageModal(null);
        setShipmentNumberDraft("");
      } catch (error) {
        console.error(error);
        toast.error("Nije moguće promeniti status.");
      } finally {
        setIsShipmentStageSaving(false);
      }
    });
  }, [persistStageChange, runGuarded, shipmentNumberDraft, shipmentStageModal]);

  const handleStageChange = async (order: Order, nextStage: OrderStage) => {
    if (nextStage === "poslato") {
      openShipmentStageModal(order, nextStage);
      return;
    }
    await runGuarded(`stage:${order._id}`, async () => {
      try {
        await persistStageChange(order, nextStage);
      } catch (error) {
        console.error(error);
        toast.error("Nije moguće promeniti status.");
      }
    });
  };

  const handlePovratToggle = async (order: Order, nextValue: boolean) => {
    await runGuarded(`povrat:${order._id}`, async () => {
      try {
        mergeIntoList(order._id, await updateFromFresh(order._id, { povratVracen: nextValue }));
      } catch (error) {
        console.error(error);
        toast.error("Nije moguće sačuvati povrat.");
      }
    });
  };

  const handleKasniToggle = async (order: Order, nextValue: boolean) => {
    await runGuarded(`kasni:${order._id}`, async () => {
      setKasniSavingId(order._id);
      try {
        mergeIntoList(order._id, await updateFromFresh(order._id, { kasni: nextValue }));
        toast.success(nextValue ? "Označeno da kasni." : "Oznaka kašnjenja je uklonjena.");
      } catch (error) {
        console.error(error);
        toast.error("Nije moguće sačuvati oznaku kašnjenja.");
      } finally {
        setKasniSavingId(null);
      }
    });
  };

  const handleManualRefund100Toggle = async (order: Order, enabled: boolean) => {
    await runGuarded(`manual:${order._id}`, async () => {
      setManualRefundSavingId(order._id);
      try {
        const result = await setManualRefund100({ token: sessionToken, id: order._id, scope: orderScope, enabled });
        setOrders((previous) =>
          previous.map((item) =>
            item._id === order._id
              ? { ...item, manualRefund100: result.enabled, manualRefund100At: result.changedAt ?? undefined }
              : item,
          ),
        );
        toast.success(enabled ? "Narudžbina je ručno dodata u 100% povrat." : "Ručna oznaka 100% je uklonjena.");
      } catch (error) {
        console.error(error);
        toast.error("Nije moguće sačuvati ručni 100% povrat.");
      } finally {
        setManualRefundSavingId(null);
      }
    });
  };

  return { quickEdit, setQuickEdit, isQuickEditSaving, shipmentStageModal, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, manualRefundSavingId, kasniSavingId, copyText, openQuickEdit, closeQuickEdit, handleQuickEditSave, closeShipmentStageModal, handleShipmentStageSubmit, handleStageChange, handlePovratToggle, handleKasniToggle, handleManualRefund100Toggle };
}
