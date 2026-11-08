"use client";

import { useRef, useState } from "react";
import type { OrderWithProduct } from "@/types/order";
import {
  ORDER_EDIT_FIELDS,
  isOrderEditDirty,
  toOrderEditValues,
  validateOrderEdit,
  type OrderEditErrors,
  type OrderEditField,
  type OrderEditValues,
} from "../_lib/orderEdit";
import type { useOrderDetailUpdates } from "./useOrderDetailUpdates";

/** Sekcija na koju forma skroluje i fokusira prvo polje ("Izmeni" na kartici). */
export type OrderEditSection = "naslov" | "kupac" | "slanje" | "novac" | "napomena";

export const ORDER_EDIT_SECTION_FIELD: Record<OrderEditSection, OrderEditField> = {
  naslov: "title",
  kupac: "customerName",
  slanje: "slanjeMode",
  novac: "transportCost",
  napomena: "napomena",
};

export const orderEditFieldId = (field: OrderEditField) => `order-edit-${field}`;

type UseOrderEditFormParams = {
  order: OrderWithProduct | null;
  applyOrderUpdate: ReturnType<typeof useOrderDetailUpdates>["applyOrderUpdate"];
};

/** Forma „Izmeni narudžbinu“: nacrt svih polja, validacija samo promenjenih, jedan `orders:update`. */
export function useOrderEditForm({ order, applyOrderUpdate }: UseOrderEditFormParams) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<OrderEditSection | null>(null);
  const [initial, setInitial] = useState<OrderEditValues | null>(null);
  const [values, setValues] = useState<OrderEditValues | null>(null);
  const [errors, setErrors] = useState<OrderEditErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const savingRef = useRef(false);

  const openEdit = (target?: OrderEditSection) => {
    if (!order) return;
    const next = toOrderEditValues(order);
    setInitial(next);
    setValues(next);
    setErrors({});
    setSection(target ?? null);
    setOpen(true);
  };

  const setField = <K extends OrderEditField>(field: K, value: OrderEditValues[K]) => {
    setValues((current) => (current ? { ...current, [field]: value } : current));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  };

  const isDirty = Boolean(initial && values && isOrderEditDirty(initial, values));

  const requestClose = () => {
    if (savingRef.current) return;
    if (isDirty) {
      setExitConfirmOpen(true);
      return;
    }
    setOpen(false);
  };

  const discardAndClose = () => {
    setExitConfirmOpen(false);
    setOpen(false);
  };

  const save = async () => {
    if (!initial || !values || savingRef.current) return;
    const result = validateOrderEdit(initial, values);
    const firstError = ORDER_EDIT_FIELDS.find((field) => result.errors[field]);
    if (firstError) {
      setErrors(result.errors);
      document.getElementById(orderEditFieldId(firstError))?.focus();
      return;
    }
    if (Object.keys(result.patch).length === 0) {
      setOpen(false);
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    try {
      await applyOrderUpdate((current) => ({ ...current, ...result.patch }), "Sačuvano.");
      setOpen(false);
    } catch {
      // applyOrderUpdate je već vratio lokalno stanje i prikazao grešku; forma ostaje popunjena.
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return { open, section, values, errors, isSaving, isDirty, exitConfirmOpen, setExitConfirmOpen, openEdit, setField, requestClose, discardAndClose, save };
}
