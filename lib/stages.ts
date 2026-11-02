import type { LucideIcon } from "lucide-react";
import { Banknote, MapPinCheck, PackageCheck, ShoppingCart, Truck, Undo2, Warehouse } from "lucide-react";
import type { OrderStage } from "@/types/order";

// Jedini izvor istine za stage-ove u UI-ju. Redosled prati `orderStages` u convex/orders.ts.
// Vrednosti (ključevi u bazi) se ne menjaju; ovde žive samo labele, boje i ikonice.
export const ORDER_STAGES = [
  "poruceno",
  "aks",
  "na_stanju",
  "poslato",
  "stiglo",
  "legle_pare",
  "vraceno",
] as const satisfies readonly OrderStage[];

export type StageMeta = {
  value: OrderStage;
  /** Kratka labela: bedževi, filteri, selecti. */
  label: string;
  /** Pun naziv tamo gde kratka labela nije jasna (npr. "Legle pare"). */
  longLabel: string;
  /** Tonirana pozadina + tekst, ispravno u obe teme. */
  tone: string;
  /** Puna boja stage-a: tačka, indikator, ikonica. */
  dotClass: string;
  icon: LucideIcon;
};

const STAGE_META: Record<OrderStage, Omit<StageMeta, "value">> = {
  poruceno: {
    label: "Poručeno",
    longLabel: "Poručeno",
    tone: "bg-stage-poruceno/12 text-stage-poruceno",
    dotClass: "bg-stage-poruceno",
    icon: ShoppingCart,
  },
  aks: {
    label: "Aks",
    longLabel: "Aks",
    tone: "bg-stage-aks/12 text-stage-aks",
    dotClass: "bg-stage-aks",
    icon: Warehouse,
  },
  na_stanju: {
    label: "Na stanju",
    longLabel: "Na stanju",
    tone: "bg-stage-na-stanju/12 text-stage-na-stanju",
    dotClass: "bg-stage-na-stanju",
    icon: PackageCheck,
  },
  poslato: {
    label: "Poslato",
    longLabel: "Poslato",
    tone: "bg-stage-poslato/12 text-stage-poslato",
    dotClass: "bg-stage-poslato",
    icon: Truck,
  },
  stiglo: {
    label: "Stiglo",
    longLabel: "Stiglo",
    tone: "bg-stage-stiglo/12 text-stage-stiglo",
    dotClass: "bg-stage-stiglo",
    icon: MapPinCheck,
  },
  legle_pare: {
    label: "Leglo",
    longLabel: "Legle pare",
    tone: "bg-stage-leglo/12 text-stage-leglo",
    dotClass: "bg-stage-leglo",
    icon: Banknote,
  },
  vraceno: {
    label: "Vraćeno",
    longLabel: "Vraćeno",
    tone: "bg-stage-vraceno/12 text-stage-vraceno",
    dotClass: "bg-stage-vraceno",
    icon: Undo2,
  },
};

export const STAGES = Object.fromEntries(
  ORDER_STAGES.map((value) => [value, { value, ...STAGE_META[value] }]),
) as Record<OrderStage, StageMeta>;

/** Svi stage-ovi po redosledu toka. */
export const STAGE_OPTIONS: StageMeta[] = ORDER_STAGES.map((value) => STAGES[value]);

/** Glavni tok bez "Vraćeno" (ono je izlaz iz toka, ne korak). */
export const STAGE_FLOW: StageMeta[] = STAGE_OPTIONS.filter((stage) => stage.value !== "vraceno");

export const isOrderStage = (value: unknown): value is OrderStage =>
  typeof value === "string" && (ORDER_STAGES as readonly string[]).includes(value);

/** Kao `normalizeStage` na backendu: nepoznata vrednost pada na "poruceno". */
export const getStage = (value?: string | null): StageMeta => (isOrderStage(value) ? STAGES[value] : STAGES.poruceno);
