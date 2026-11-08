// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import type { FieldErrors } from "react-hook-form";
import { z } from "zod";
import { generateId, parsePrice } from "./productHelpers";

export const priceField = (label: string) =>
  z
    .string({ message: `${label} je obavezna.` })
    .trim()
    .min(1, `${label} je obavezna.`)
    .refine((value) => {
      const parsed = parsePrice(value);
      return Number.isFinite(parsed) && parsed >= 0;
    }, `${label} mora biti broj veci ili jednak nuli.`);

export const variantSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Naziv tipa je obavezan."),
  nabavnaCena: priceField("Nabavna cena"),
  nabavnaCenaIsReal: z.boolean().optional(),
  prodajnaCena: priceField("Prodajna cena"),
  opis: z.string().optional(),
  isDefault: z.boolean(),
});

export const supplierOfferSchema = z.object({
  id: z.string().optional(),
  supplierId: z.string({ message: "Dobavljac je obavezan." }).min(1, "Dobavljac je obavezan."),
  price: priceField("Cena dobavljaca"),
  variantId: z.string().optional(),
});

export const productSchema = z
  .object({
    productType: z.enum(["single", "variant"]),
    kpName: z.string().min(2, "KP naziv je obavezan."),
    name: z.string().min(2, "FB / Insta naziv je obavezan."),
    nabavnaCena: priceField("Nabavna cena"),
    nabavnaCenaIsReal: z.boolean().optional(),
    prodajnaCena: priceField("Prodajna cena"),
    categoryIds: z.array(z.string()).optional(),
    supplierOffers: z.array(supplierOfferSchema).optional(),
    opisKp: z.string().optional(),
    opisFbInsta: z.string().optional(),
    publishKp: z.boolean().optional(),
    publishFb: z.boolean().optional(),
    publishIg: z.boolean().optional(),
    publishFbProfile: z.boolean().optional(),
    publishMarketplace: z.boolean().optional(),
    pickupAvailable: z.boolean().optional(),
    variants: z.array(variantSchema).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.productType !== "variant") return;
    const variants = data.variants ?? [];
    if (variants.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dodaj bar jedan tip za tipski proizvod.",
        path: ["variants"],
      });
      return;
    }
    if (!variants.some((variant) => variant.isDefault)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Oznaci bar jedan tip kao glavni.",
        path: ["variants"],
      });
    }
  });

export type ProductFormValues = z.infer<typeof productSchema>;

export type VariantFormEntry = z.infer<typeof variantSchema>;

export type SupplierOfferFormEntry = z.infer<typeof supplierOfferSchema>;

export const createVariantFormEntry = (
  options: { isDefault?: boolean; label?: string; nabavnaCena?: string; prodajnaCena?: string; opis?: string } = {},
) => ({
  id: generateId(),
  label: options.label ?? "",
  nabavnaCena: options.nabavnaCena ?? "",
  nabavnaCenaIsReal: false,
  prodajnaCena: options.prodajnaCena ?? "",
  opis: options.opis ?? "",
  isDefault: options.isDefault ?? false,
});

export const emptyProductForm = (): ProductFormValues => ({
  productType: "single",
  kpName: "",
  name: "",
  nabavnaCena: "",
  nabavnaCenaIsReal: false,
  prodajnaCena: "",
  supplierOffers: [],
  categoryIds: [],
  opisKp: "",
  opisFbInsta: "",
  publishKp: false,
  publishFb: false,
  publishIg: false,
  publishFbProfile: false,
  publishMarketplace: false,
  pickupAvailable: false,
  variants: [],
});

export const productFocusOrder: (keyof ProductFormValues)[] = ["kpName", "name", "nabavnaCena", "prodajnaCena", "opisKp", "opisFbInsta"];
export const variantFocusOrder: (keyof VariantFormEntry)[] = ["label", "nabavnaCena", "prodajnaCena", "opis"];

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
