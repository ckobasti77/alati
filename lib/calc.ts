import type { Order, OrderItem } from "@/types/order";

export const ukupnoProdajno = (kolicina: number, prodajna: number) =>
  kolicina * prodajna;

export const ukupnoNabavno = (kolicina: number, nabavna: number) =>
  kolicina * nabavna;

export const profit = (prodajnoUkupno: number, nabavnoUkupno: number, transportCost = 0) =>
  prodajnoUkupno - nabavnoUkupno - transportCost;

const normalizeQuantity = (value?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return Math.max(Math.round(parsed), 1);
};

const sanitizePrice = (value?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

export const resolveOrderItems = (order: { items?: OrderItem[] } & Partial<Order>): OrderItem[] => {
  const stored = order.items ?? [];
  const normalized = stored
    .map((item) => ({
      ...item,
      kolicina: normalizeQuantity(item.kolicina),
      nabavnaCena: sanitizePrice(item.nabavnaCena),
      prodajnaCena: sanitizePrice(item.prodajnaCena),
      manualProdajna: item.manualProdajna,
    }))
    .filter((item) => item.kolicina > 0);
  if (normalized.length > 0) return normalized;
  if (order.kolicina === undefined || order.nabavnaCena === undefined || order.prodajnaCena === undefined) {
    return [];
  }
  return [
    {
      id: "legacy",
      productId: order.productId,
      supplierId: order.supplierId,
      variantId: order.variantId,
      variantLabel: order.variantLabel,
      title: order.title ?? "",
      kolicina: normalizeQuantity(order.kolicina),
      nabavnaCena: sanitizePrice(order.nabavnaCena),
      prodajnaCena: sanitizePrice(order.prodajnaCena),
      manualProdajna: false,
    },
  ];
};

export const orderTotals = (order: { items?: OrderItem[] } & Partial<Order>) => {
  const items = resolveOrderItems(order);
  const totalQty =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.kolicina, 0)
      : normalizeQuantity(order.kolicina);
  const totalProdajno =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.prodajnaCena * item.kolicina, 0)
      : ukupnoProdajno(normalizeQuantity(order.kolicina ?? 0), sanitizePrice(order.prodajnaCena));
  const totalNabavno =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.nabavnaCena * item.kolicina, 0)
      : ukupnoNabavno(normalizeQuantity(order.kolicina ?? 0), sanitizePrice(order.nabavnaCena));
  const transport = order.transportCost ?? 0;
  const profitValue = profit(totalProdajno, totalNabavno, transport);
  return {
    items,
    totalQty,
    totalProdajno,
    totalNabavno,
    transport,
    profit: profitValue,
  };
};
