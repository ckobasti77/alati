"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvex } from "convex/react";
import { LoadingDots } from "@/components/LoadingDots";
import { Card, CardContent } from "@/components/ui/card";
import { useConvexMutation } from "@/lib/convex";
import type { Order } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { getProductDisplayName, resolveProductImageUrl } from "./_lib/helpers";
import { useOrdersFeed } from "./_hooks/useOrdersFeed";
import { useRefundPeriod } from "./_hooks/useRefundPeriod";
import { useOrderCatalog } from "./_hooks/useOrderCatalog";
import { useRestock } from "./_hooks/useRestock";
import { useOrdersPdf } from "./_hooks/useOrdersPdf";
import { useOrderEntries } from "./_hooks/useOrderEntries";
import { useOrderSelection } from "./_hooks/useOrderSelection";
import { useOrderReorder } from "./_hooks/useOrderReorder";
import { useLongPress } from "./_hooks/useLongPress";
import { useOrderRowActions } from "./_hooks/useOrderRowActions";
import { useOrderForm } from "./_hooks/useOrderForm";
import { useOrderFormActions } from "./_hooks/useOrderFormActions";
import { useOrderDelete } from "./_hooks/useOrderDelete";
import { RefundPeriodDialog } from "./_components/modals/RefundPeriodDialog";
import { OrderFormDialog } from "./_components/order-form/OrderFormDialog";
import { ExitConfirmDialog } from "./_components/modals/ExitConfirmDialog";
import { DeleteOrderDialog } from "./_components/modals/DeleteOrderDialog";
import { QuickEditDialog } from "./_components/modals/QuickEditDialog";
import { RestockDialog } from "./_components/modals/RestockDialog";
import { DeleteRestockDialog } from "./_components/modals/DeleteRestockDialog";
import { ShipmentNumberDialog } from "./_components/modals/ShipmentNumberDialog";
import { OrdersHeader } from "./_components/OrdersHeader";
import { OrdersToolbar } from "./_components/OrdersToolbar";
import { RefundPeriodPanel } from "./_components/RefundPeriodPanel";
import { BulkBar } from "./_components/BulkBar";
import { MiniObracun } from "./_components/MiniObracun";
import { OrderCardList } from "./_components/OrderCardList";
import { OrdersTable } from "./_components/OrdersTable";

export default function OrdersPage() {
  return (
    <RequireAuth>
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const basePath = "/narudzbine";
  const orderScope: "default" | "kalaba" = "default";
  const router = useRouter();
  const convex = useConvex();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const { token } = useAuth();
  const sessionToken = token as string;
  const feed = useOrdersFeed({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken });
  const { search, dateFrom, dateTo, stageFilters, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, orders, setOrders, draggingOrderId, setDraggingOrderId, dragOverOrderId, setDragOverOrderId, isLoadingMoreOrders, ordersLoaderRef, orderListQueryArgs, hasMoreOrders, dateFilterActive, resetOrdersFeed } = feed;
  const refund = useRefundPeriod({ orderScope, sessionToken, resetOrdersFeed });
  const { refundPeriodOverview } = refund;
  const updateOrder = useConvexMutation("orders:update");
  const catalog = useOrderCatalog({ sessionToken });
  const { products, productMap, supplierMap } = catalog;
  const restock = useRestock({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken, products, productMap });

  const entries = useOrderEntries({ orders, refundPeriodOverview });
  const { visibleOrderIds } = entries;
  const selection = useOrderSelection({ orderScope, sessionToken, stageFilters, showUnreturnedOnly, showReturnedOnly, setOrders, visibleOrderIds });

  const pdf = useOrdersPdf({ convex, search, dateFrom, dateTo, stageFilters, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, orderListQueryArgs, dateFilterActive, refundPeriodOverview, productMap });
  const orderForm = useOrderForm({ orderScope, searchParams, sessionToken, products, supplierMap });
  const { editingOrder } = orderForm;
  const getOrderPreviewImages = useCallback(
    (order: Order) => {
      const items = order.items ?? [];
      const previews: { id: string; url?: string | null; alt: string }[] = [];
      items.forEach((item) => {
        const product = item.productId ? productMap.get(item.productId) : undefined;
        const url = resolveProductImageUrl(product, item.variantId);
        const alt = product ? getProductDisplayName(product) : item.title || "Proizvod";
        const qty = Math.max(Number(item.kolicina) || 1, 1);
        for (let index = 0; index < qty; index += 1) {
          previews.push({ id: `${item.id}-${index}`, url, alt });
        }
      });
      return previews;
    },
    [productMap],
  );

  const longPress = useLongPress();
  const rowActions = useOrderRowActions({ orderScope, sessionToken, stageFilters, showUnreturnedOnly, showReturnedOnly, setOrders, updateOrder });
  const formActions = useOrderFormActions({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken, resetOrdersFeed, updateOrder, products, supplierMap, orderForm });
  const { resetOrderForm } = formActions;

  const orderDelete = useOrderDelete({ orderScope, sessionToken, resetOrdersFeed, editingOrder, resetOrderForm });
  const reorder = useOrderReorder({ orderScope, sessionToken, orders, setOrders, draggingOrderId, setDraggingOrderId, dragOverOrderId, setDragOverOrderId });
  const handleRowClick = (id: string) => {
    router.push(`${basePath}/${id}`);
  };

  return (
    <div className="relative mx-auto space-y-6">
      <RefundPeriodDialog refund={refund} />
      <OrderFormDialog orderForm={orderForm} formActions={formActions} catalog={catalog} />
      <ExitConfirmDialog orderForm={orderForm} formActions={formActions} />
      <DeleteOrderDialog orderDelete={orderDelete} />
      <QuickEditDialog rowActions={rowActions} />
      <RestockDialog catalog={catalog} restock={restock} />
      <DeleteRestockDialog restock={restock} />
      <ShipmentNumberDialog rowActions={rowActions} />
      <OrdersHeader feed={feed} formActions={formActions} router={router} />

      <Card>
        <OrdersToolbar feed={feed} refund={refund} pdf={pdf} />
        <CardContent className="space-y-4">
          <RefundPeriodPanel refund={refund} />
          <BulkBar feed={feed} entries={entries} selection={selection} />
          <MiniObracun feed={feed} />
          <OrderCardList feed={feed} entries={entries} catalog={catalog} selection={selection} longPress={longPress} rowActions={rowActions} orderDelete={orderDelete} getOrderPreviewImages={getOrderPreviewImages} handleRowClick={handleRowClick} />

          <OrdersTable feed={feed} catalog={catalog} entries={entries} selection={selection} reorder={reorder} rowActions={rowActions} orderDelete={orderDelete} getOrderPreviewImages={getOrderPreviewImages} handleRowClick={handleRowClick} />
          <div ref={ordersLoaderRef} className="flex justify-center">
            <LoadingDots show={isLoadingMoreOrders && hasMoreOrders} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
