import { describe, expect, it } from "vitest";
import { orderMatchesFilters, type OrderFilters } from "@/app/narudzbine/_lib/orderFilters";
import { ORDER_STAGES } from "@/lib/stages";
import type { Order } from "@/types/order";
import { isZaPovrat, isZaPovratFilter, ZA_POVRAT_HREF, zaPovratListArgs, zaPovratScope } from "./zaPovrat";

const noFilters: OrderFilters = {
  search: "",
  stages: [],
  unreturned: false,
  returned: false,
  pickup: false,
  shipping: false,
  late: false,
  refund100: false,
  dateFrom: "",
  dateTo: "",
};

const zaPovratFilters: OrderFilters = { ...noFilters, stages: ["legle_pare"], unreturned: true };

const order = (stage: Order["stage"], povratVracen: boolean | undefined) =>
  ({ _id: `${stage}-${String(povratVracen)}`, stage, povratVracen, kreiranoAt: 1, items: [] }) as unknown as Order;

describe("isZaPovrat", () => {
  it("Leglo + povrat nije urađen ulazi", () => {
    expect(isZaPovrat({ stage: "legle_pare", povratVracen: false })).toBe(true);
    expect(isZaPovrat({ stage: "legle_pare" })).toBe(true);
    expect(isZaPovrat({ stage: "legle_pare", povratVracen: null })).toBe(true);
  });

  it("Leglo + povrat urađen ne ulazi", () => {
    expect(isZaPovrat({ stage: "legle_pare", povratVracen: true })).toBe(false);
  });

  it("Vraćeno nikad ne ulazi (ni sa ni bez urađenog povrata)", () => {
    expect(isZaPovrat({ stage: "vraceno", povratVracen: false })).toBe(false);
    expect(isZaPovrat({ stage: "vraceno", povratVracen: true })).toBe(false);
    expect(isZaPovrat({ stage: "vraceno" })).toBe(false);
  });

  it("nijedan drugi stage ne ulazi", () => {
    for (const stage of ORDER_STAGES.filter((value) => value !== "legle_pare")) {
      for (const povratVracen of [true, false, undefined]) {
        expect(isZaPovrat({ stage, povratVracen })).toBe(false);
      }
    }
  });

  it("filter liste ?stage=legle_pare&unreturned=1 daje tačno isti skup", () => {
    expect(ZA_POVRAT_HREF).toBe("/narudzbine?stage=legle_pare&unreturned=1");
    for (const stage of ORDER_STAGES) {
      for (const povratVracen of [true, false, undefined]) {
        const item = order(stage, povratVracen);
        expect(orderMatchesFilters(item, zaPovratFilters)).toBe(isZaPovrat(item));
      }
    }
  });
});

describe("zaPovratScope", () => {
  it("prepoznaje filter Za povrat", () => {
    expect(isZaPovratFilter(zaPovratFilters)).toBe(true);
    expect(zaPovratScope(zaPovratFilters)).toBe("same");
    expect(isZaPovratFilter({ ...zaPovratFilters, unreturned: false })).toBe(false);
    expect(isZaPovratFilter({ ...zaPovratFilters, stages: ["legle_pare", "vraceno"] })).toBe(false);
  });

  it("prazan presek kad lista ne može da sadrži Leglo bez urađenog povrata", () => {
    expect(zaPovratScope({ ...noFilters, stages: ["vraceno"] })).toBe("empty");
    expect(zaPovratScope({ ...noFilters, stages: ["poruceno", "poslato"] })).toBe("empty");
    expect(zaPovratScope({ ...noFilters, returned: true })).toBe("empty");
  });

  it("presek kad lista sadrži i druge narudžbine", () => {
    expect(zaPovratScope(noFilters)).toBe("subset");
    expect(zaPovratScope({ ...noFilters, stages: ["legle_pare"] })).toBe("subset");
    expect(zaPovratScope({ ...noFilters, stages: ["legle_pare", "vraceno"], unreturned: true })).toBe("subset");
  });

  it("argumenti preseka zadržavaju ostale filtere", () => {
    const args = zaPovratListArgs({ token: "t", search: "kupac", stages: [], unreturnedOnly: false, returnedOnly: false, lateOnly: true });
    expect(args).toMatchObject({ token: "t", search: "kupac", lateOnly: true, stages: ["legle_pare"], unreturnedOnly: true, returnedOnly: false, page: 1, pageSize: 1 });
  });
});
