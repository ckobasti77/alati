import { describe, expect, it } from "vitest";
import type { Order } from "@/types/order";
import { mergeListPage, orderMatchesFilters, type OrderFilters } from "./orderFilters";

const base: OrderFilters = {
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

const order = (id: string, sort: number, extra: Partial<Order> = {}) =>
  ({
    _id: id,
    stage: "poruceno",
    kreiranoAt: sort,
    sortIndex: sort,
    title: id,
    customerName: "",
    address: "",
    phone: "",
    items: [{ id: "i", title: "x", kolicina: 1, nabavnaCena: 50, prodajnaCena: 100 }],
    ...extra,
  }) as unknown as Order;

describe("orderMatchesFilters", () => {
  it("status, povrat, lično/slanje, kasni", () => {
    expect(orderMatchesFilters(order("a", 1, { stage: "aks" }), { ...base, stages: ["poslato"] })).toBe(false);
    expect(orderMatchesFilters(order("a", 1, { povratVracen: true }), { ...base, unreturned: true })).toBe(false);
    expect(orderMatchesFilters(order("a", 1, { povratVracen: false }), { ...base, returned: true })).toBe(false);
    expect(orderMatchesFilters(order("a", 1, { pickup: true }), { ...base, shipping: true })).toBe(false);
    expect(orderMatchesFilters(order("a", 1, { stage: "poslato", kasni: false }), { ...base, late: true })).toBe(false);
    expect(orderMatchesFilters(order("a", 1, { stage: "poslato", kasni: true }), { ...base, late: true })).toBe(true);
  });
  it("100% povrat: ručno ili u periodu, a nije vraćeno", () => {
    const filters = { ...base, refund100: true };
    expect(orderMatchesFilters(order("a", 1, { manualRefund100: true }), filters)).toBe(true);
    expect(orderMatchesFilters(order("a", 1, { manualRefund100: true, povratVracen: true }), filters)).toBe(false);
    expect(orderMatchesFilters(order("a", 1, { manualRefund100: false }), filters)).toBe(false);
    const inPeriod = order("b", new Date("2026-03-05T12:00:00+01:00").getTime());
    expect(orderMatchesFilters(inPeriod, filters, { startDate: "2026-03-01", endDate: "2026-03-10" })).toBe(true);
  });
});

describe("mergeListPage", () => {
  const ids = (list: Order[]) => list.map((item) => item._id);
  it("izbacuje red koji server više ne vraća u opsegu strane", () => {
    const prev = [order("a", 50), order("b", 40), order("c", 30)];
    const next = mergeListPage(prev, { items: [order("a", 50), order("c", 30)], pagination: { page: 1, pageSize: 30, total: 2, totalPages: 1 } });
    expect(ids(next)).toEqual(["a", "c"]);
  });
  it("ne dira redove pre prvog reda strane (pripadaju ranijim stranama)", () => {
    const prev = [order("a", 90), order("b", 80), order("c", 30), order("d", 20), order("e", 10)];
    // Poslednja strana vraća samo d: e (posle d) izlazi, a, b, c ostaju dok se lista ne osveži od početka.
    const next = mergeListPage(prev, { items: [order("d", 20)], pagination: { page: 2, pageSize: 2, total: 3, totalPages: 2 } });
    expect(ids(next)).toEqual(["a", "b", "c", "d"]);
  });
  it("srednja strana ne briše ono što je posle njenog poslednjeg reda", () => {
    const prev = [order("a", 90), order("b", 80), order("c", 70), order("d", 10)];
    const next = mergeListPage(prev, { items: [order("b", 80), order("c", 70)], pagination: { page: 2, pageSize: 2, total: 6, totalPages: 3 } });
    expect(ids(next)).toEqual(["a", "b", "c", "d"]);
  });
  it("prazna prva strana prazni listu, sveži red zamenjuje stari", () => {
    expect(mergeListPage([order("a", 1)], { items: [], pagination: { page: 1, pageSize: 30, total: 0, totalPages: 1 } })).toEqual([]);
    const next = mergeListPage([order("a", 1, { stage: "aks" })], { items: [order("a", 1, { stage: "poslato" })], pagination: { page: 1, pageSize: 30, total: 1, totalPages: 1 } });
    expect(next[0].stage).toBe("poslato");
  });
});
