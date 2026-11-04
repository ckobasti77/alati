import type { DeepPartial, FieldErrors } from "react-hook-form";
import { z } from "zod";
import { ORDER_STAGES } from "@/lib/stages";
import { slanjeModes } from "./types";

export const orderSchema = z
  .object({
    stage: z.enum(ORDER_STAGES),
    customerName: z.string().trim().optional(),
    address: z.string().trim().optional(),
    phone: z.string().min(5, "Broj telefona je obavezan."),
    transportCost: z.preprocess(
      (value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        const normalized = typeof value === "string" ? value.replace(",", ".") : value;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : undefined;
      },
      z.number().min(0, "Transport je obavezan i mora biti 0 ili više."),
    ),
    slanjeMode: z.preprocess(
      (value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        return typeof value === "string" ? value : undefined;
      },
      z.enum(slanjeModes).optional(),
    ),
    slanjeOwner: z.preprocess(
      (value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        return typeof value === "string" ? value.trim() : undefined;
      },
      z.string().min(2, "Unesi podatak za isplatu.").optional(),
    ),
    slanjeOwnerStartingAmount: z.preprocess(
      (value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        const normalized = typeof value === "string" ? value.replace(",", ".") : value;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : undefined;
      },
      z.number().min(0, "Početni iznos mora biti 0 ili više.").optional(),
    ),
    myProfitPercent: z.preprocess(
      (value) => {
        if (value === "" || value === undefined || value === null) return undefined;
        const normalized = typeof value === "string" ? value.replace(",", ".") : value;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : undefined;
      },
      z
        .number()
        .min(0, "Procenat profita mora biti između 0 i 100.")
        .max(100, "Procenat profita mora biti između 0 i 100.")
        .optional(),
    ),
    pickup: z.boolean().optional(),
    note: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    const customerName = values.customerName?.trim() ?? "";
    const address = values.address?.trim() ?? "";

    if (!values.pickup) {
      if (customerName.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customerName"],
          message: "Ime i prezime naručioca je obavezno.",
        });
      }
      if (address.length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: "Adresa je obavezna.",
        });
      }
    }

    if (values.pickup) {
      return;
    }
    if (!values.slanjeMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeMode"],
        message: "Izaberi način slanja.",
      });
      return;
    }
    if (values.slanjeMode && !values.slanjeOwner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeOwner"],
        message: "Izaberi na čije ime leže pare.",
      });
      return;
    }
    if (values.slanjeOwner && !values.slanjeMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeMode"],
        message: "Izaberi način slanja.",
      });
      return;
    }
    if (values.slanjeMode === "Posta" && (!values.slanjeOwner || values.slanjeOwner.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeOwner"],
        message: "Unesi na ime.",
      });
    }
    if (
      (values.slanjeMode === "Aks" || values.slanjeMode === "Bex") &&
      (!values.slanjeOwner || values.slanjeOwner.trim().length < 2)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slanjeOwner"],
        message: "Unesi na čiji račun leže pare.",
      });
    }
  });

export type OrderFormValues = z.infer<typeof orderSchema>;

export const defaultFormValues: DeepPartial<OrderFormValues> = {
  stage: "poruceno",
  customerName: "",
  address: "",
  phone: "",
  transportCost: 0,
  slanjeMode: "Aks",
  slanjeOwner: undefined,
  slanjeOwnerStartingAmount: undefined,
  myProfitPercent: 100,
  pickup: false,
  note: "",
};

export const orderFocusOrder: (keyof OrderFormValues)[] = [
  "customerName",
  "address",
  "phone",
  "transportCost",
  "slanjeMode",
  "slanjeOwner",
  "slanjeOwnerStartingAmount",
  "note",
];

export const collectErrorPaths = (node: unknown, prefix = ""): string[] => {
  if (!node) return [];
  const paths: string[] = [];
  const entries = Array.isArray(node) ? Array.from(node.entries()) : Object.entries(node as Record<string, unknown>);
  for (const [rawKey, value] of entries) {
    if (!value) continue;
    const key = String(rawKey);
    if (key === "ref" || key === "types") continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const hasMessage = "message" in (value as Record<string, unknown>) || "type" in (value as Record<string, unknown>);
      const nested = collectErrorPaths(value, path);
      if (hasMessage || nested.length === 0) {
        paths.push(path);
      }
      paths.push(...nested);
    } else {
      paths.push(path);
    }
  }
  return paths;
};

export const findFirstErrorPath = (errors: FieldErrors | undefined, priority: string[] = []) => {
  if (!errors) return null;
  const paths = collectErrorPaths(errors);
  if (paths.length === 0) return null;
  const preferred = priority
    .map((prefix) => paths.find((path) => path === prefix || path.startsWith(`${prefix}.`)))
    .find((path): path is string => Boolean(path));
  return preferred ?? paths[0];
};
