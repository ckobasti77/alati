import type { Order, SlanjeMode } from "@/types/order";
import { slanjeModes } from "../../_lib/types";

/** Polja forme „Izmeni narudžbinu“ (tekst kako se kuca; brojevi se parsiraju tek na Sačuvaj). */
export type OrderEditValues = {
  title: string;
  customerName: string;
  phone: string;
  address: string;
  slanjeMode: SlanjeMode | "";
  slanjeOwner: string;
  pickup: boolean;
  brojPosiljke: string;
  transportCost: string;
  myProfitPercent: string;
  napomena: string;
};

export type OrderEditField = keyof OrderEditValues;
export type OrderEditErrors = Partial<Record<OrderEditField, string>>;
export type OrderEditPatch = Partial<
  Pick<Order, "title" | "customerName" | "phone" | "address" | "slanjeMode" | "slanjeOwner" | "pickup" | "brojPosiljke" | "transportCost" | "myProfitPercent" | "napomena">
>;

export const ORDER_EDIT_FIELDS: OrderEditField[] = [
  "title",
  "customerName",
  "phone",
  "address",
  "slanjeMode",
  "slanjeOwner",
  "pickup",
  "brojPosiljke",
  "transportCost",
  "myProfitPercent",
  "napomena",
];

const numberToText = (value?: number) => (value === undefined || value === null ? "" : String(value).replace(".", ","));
const parseNumber = (input: string) => Number(input.replace(",", "."));

export const toOrderEditValues = (order: Order): OrderEditValues => ({
  title: order.title ?? "",
  customerName: order.customerName ?? "",
  phone: order.phone ?? "",
  address: order.address ?? "",
  slanjeMode: order.slanjeMode && slanjeModes.includes(order.slanjeMode) ? order.slanjeMode : "",
  slanjeOwner: order.slanjeOwner ?? "",
  pickup: Boolean(order.pickup),
  brojPosiljke: order.brojPosiljke ?? "",
  transportCost: numberToText(order.transportCost),
  myProfitPercent: numberToText(order.myProfitPercent),
  napomena: order.napomena ?? "",
});

export const isOrderEditDirty = (initial: OrderEditValues, values: OrderEditValues) =>
  ORDER_EDIT_FIELDS.some((field) => initial[field] !== values[field]);

/**
 * Ista pravila kao ranije `handleOrderFieldSave` (izmena polja jedno po jedno), ali za celu formu:
 * proveravaju se samo promenjena polja, a rezultat je jedan patch za jedan `orders:update`.
 */
export function validateOrderEdit(initial: OrderEditValues, values: OrderEditValues): { patch: OrderEditPatch; errors: OrderEditErrors } {
  const patch: OrderEditPatch = {};
  const errors: OrderEditErrors = {};
  const changed = (field: OrderEditField) => initial[field] !== values[field];

  for (const field of ["title", "customerName", "phone", "address"] as const) {
    if (!changed(field)) continue;
    const trimmed = values[field].trim();
    if (trimmed.length < 2) {
      errors[field] = "Popuni polje (najmanje 2 znaka).";
      continue;
    }
    patch[field] = trimmed;
  }

  if (changed("transportCost")) {
    const trimmed = values.transportCost.trim();
    if (!trimmed) {
      patch.transportCost = undefined;
    } else {
      const cost = parseNumber(trimmed);
      if (!Number.isFinite(cost) || cost < 0) errors.transportCost = "Transport mora biti 0 ili više.";
      else patch.transportCost = cost;
    }
  }

  if (changed("myProfitPercent")) {
    const trimmed = values.myProfitPercent.trim();
    const percent = parseNumber(trimmed);
    if (!trimmed) errors.myProfitPercent = "Unesi procenat profita.";
    else if (!Number.isFinite(percent) || percent < 0 || percent > 100) errors.myProfitPercent = "Procenat mora biti između 0 i 100.";
    else patch.myProfitPercent = percent;
  }

  const mode = values.slanjeMode ? slanjeModes.find((item) => item.toLowerCase() === values.slanjeMode.toLowerCase()) : undefined;
  if (changed("slanjeMode")) {
    patch.slanjeMode = mode;
    // Bez slanja nema ni računa (isto kao ranije).
    if (!mode) patch.slanjeOwner = undefined;
  }
  if (mode && (changed("slanjeOwner") || changed("slanjeMode"))) {
    const owner = values.slanjeOwner.trim();
    if (changed("slanjeOwner") || owner !== initial.slanjeOwner.trim()) patch.slanjeOwner = owner || undefined;
  } else if (!mode && changed("slanjeOwner") && values.slanjeOwner.trim() && !changed("slanjeMode")) {
    errors.slanjeOwner = "Prvo izaberi slanje.";
  }

  if (changed("pickup")) patch.pickup = values.pickup;
  // Prazan string briše broj na serveru (undefined bi zadržao stari).
  if (changed("brojPosiljke")) patch.brojPosiljke = values.brojPosiljke.trim();
  if (changed("napomena")) {
    const trimmed = values.napomena.trim();
    patch.napomena = trimmed.length === 0 ? undefined : trimmed;
  }

  return { patch, errors };
}
