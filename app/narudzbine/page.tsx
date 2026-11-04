"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useConvex } from "convex/react";
import { Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useConvexMutation } from "@/lib/convex";
import type { Order, OrderStage } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { getProductDisplayName, resolveProductImageUrl } from "./_lib/helpers";
import { orderMatchesFilters } from "./_lib/orderFilters";
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
import { useOrdersView } from "./_hooks/useOrdersView";
import { useListKeyboard } from "./_hooks/useListKeyboard";
import { RefundPeriodDialog } from "./_components/modals/RefundPeriodDialog";
import { OrderFormSheet } from "./_components/order-form/OrderFormSheet";
import { ExitConfirmDialog } from "./_components/modals/ExitConfirmDialog";
import { DeleteOrderDialog } from "./_components/modals/DeleteOrderDialog";
import { QuickEditDialog } from "./_components/modals/QuickEditDialog";
import { RestockDialog } from "./_components/modals/RestockDialog";
import { DeleteRestockDialog } from "./_components/modals/DeleteRestockDialog";
import { ShipmentNumberDialog } from "./_components/modals/ShipmentNumberDialog";
import { OrdersPageHeader } from "./_components/OrdersPageHeader";
import { OrdersToolbar } from "./_components/OrdersToolbar";
import { SummaryStrip } from "./_components/SummaryStrip";
import { SelectionBar } from "./_components/SelectionBar";
import { OrdersListProvider, type OrderPreview, type OrdersListContextValue } from "./_components/list/OrdersListContext";
import { OrdersTableView } from "./_components/views/OrdersTableView";
import { OrderCardGrid } from "./_components/views/OrderCardGrid";
import { OrderMobileList } from "./_components/views/OrderMobileList";

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
  const { search, dateFrom, dateTo, stageFilters, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, showRefund100Only, orders, setOrders, draggingOrderId, setDraggingOrderId, dragOverOrderId, setDragOverOrderId, isLoadingMoreOrders, ordersLoaderRef, orderListQueryArgs, hasMoreOrders, dateFilterActive, resetOrdersFeed } = feed;
  const refund = useRefundPeriod({ orderScope, sessionToken, resetOrdersFeed });
  const { refundPeriodOverview } = refund;
  const updateOrder = useConvexMutation("orders:update");
  const catalog = useOrderCatalog({ sessionToken });
  const { products, productMap, supplierMap } = catalog;
  const restock = useRestock({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken, products, productMap });

  const refundPeriod = refundPeriodOverview?.period;
  const matchesFilters = useCallback((order: Order) => orderMatchesFilters(order, feed.filters, refundPeriod), [feed.filters, refundPeriod]);
  const entries = useOrderEntries({ orders, refundPeriodOverview });
  const { orderEntries, visibleOrderIds } = entries;
  const selection = useOrderSelection({ orderScope, sessionToken, matchesFilters, setOrders, visibleOrderIds });

  const pdf = useOrdersPdf({ convex, search, dateFrom, dateTo, stageFilters, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, showRefund100Only, orderListQueryArgs, dateFilterActive, refundPeriodOverview, productMap });
  const orderForm = useOrderForm({ orderScope, searchParams, sessionToken, products, supplierMap });
  const { editingOrder } = orderForm;

  const longPress = useLongPress();
  const rowActions = useOrderRowActions({ convex, orderScope, sessionToken, matchesFilters, setOrders, updateOrder });
  const formActions = useOrderFormActions({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken, resetOrdersFeed, updateOrder, products, supplierMap, orderForm });
  const { resetOrderForm } = formActions;

  const orderDelete = useOrderDelete({ orderScope, sessionToken, resetOrdersFeed, editingOrder, resetOrderForm });
  const reorder = useOrderReorder({ orderScope, sessionToken, orders, setOrders, draggingOrderId, setDraggingOrderId, dragOverOrderId, setDragOverOrderId });
  const ordersView = useOrdersView({ basePath, router, searchParamsString });
  const searchRef = useRef<HTMLInputElement | null>(null);
  // Jedno "sada" po otvaranju stranice: relativni datumi ("juče") ne skaču između rendera.
  const [now] = useState(() => Date.now());

  const orderHref = useCallback((id: string) => `${basePath}/${id}`, []);
  const openOrder = useCallback((id: string) => router.push(`${basePath}/${id}`), [router]);
  const getPreview = useCallback(
    (order: Order): OrderPreview => {
      const items = order.items ?? [];
      let url: string | null = null;
      let alt = order.title || "Proizvod";
      for (const item of items) {
        const product = item.productId ? productMap.get(item.productId) : undefined;
        const candidate = resolveProductImageUrl(product, item.variantId);
        if (candidate) {
          url = candidate;
          alt = product ? getProductDisplayName(product) : item.title || alt;
          break;
        }
      }
      return { url, alt, count: Math.max(items.length, 1) };
    },
    [productMap],
  );

  const { selectedOrderIds, toggleOrderSelection } = selection;
  const keyboard = useListKeyboard({
    enabled: ordersView.isDesktop && ordersView.shortcutsEnabled,
    ids: visibleOrderIds,
    searchRef,
    onOpen: openOrder,
    onToggleSelect: (id) => toggleOrderSelection(id, !selectedOrderIds.has(id)),
    onToggleView: ordersView.toggleView,
  });

  const listContext: OrdersListContextValue = {
    productMap,
    getPreview,
    rowActions,
    onStageChange: (order: Order, stage: OrderStage) => void rowActions.handleStageChange(order, stage),
    onDelete: orderDelete.openDeleteModal,
    onMove: ordersView.isDesktop ? reorder.moveOrder : undefined,
    positionOf: (orderId: string) => ({ index: visibleOrderIds.indexOf(orderId), count: visibleOrderIds.length }),
    selected: selectedOrderIds,
    toggleSelected: toggleOrderSelection,
    selectionLocked: selection.bulkAction !== null,
    selectionMode: selection.selectionMode,
    enterSelection: selection.enterSelection,
    activeId: keyboard.activeId,
    setActiveId: keyboard.setActiveId,
    orderHref,
    openOrder,
    now,
  };

  const hasQuery = feed.activeFilterCount > 0 || search.trim().length > 0;
  const empty = hasQuery ? (
    <EmptyState
      icon={SearchX}
      title="Nema narudžbina za ove filtere"
      description="Promeni pretragu ili očisti filtere."
      action={
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            feed.clearAllFilters();
            feed.clearSearch();
          }}
        >
          Očisti filtere
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={Plus}
      title="Još nema narudžbina"
      description="Prva narudžbina se dodaje za par sekundi."
      action={
        <Button type="button" onClick={formActions.openCreateModal}>
          Nova narudžbina
        </Button>
      }
    />
  );

  const isDesktop = ordersView.isDesktop;
  const view = ordersView.view;
  const loading = feed.isOrdersLoading;
  const loadingMore = isLoadingMoreOrders && hasMoreOrders;
  const selectionBarVisible = isDesktop ? selection.selectedVisibleCount > 0 : selection.selectionMode || selection.selectedVisibleCount > 0;

  return (
    <div className="relative flex flex-col gap-3 md:gap-4">
      <RefundPeriodDialog refund={refund} />
      <OrderFormSheet orderForm={orderForm} formActions={formActions} catalog={catalog} />
      <ExitConfirmDialog orderForm={orderForm} formActions={formActions} />
      <DeleteOrderDialog orderDelete={orderDelete} />
      <QuickEditDialog rowActions={rowActions} />
      <RestockDialog catalog={catalog} restock={restock} />
      <DeleteRestockDialog restock={restock} />
      <ShipmentNumberDialog rowActions={rowActions} />

      <OrdersPageHeader
        ordersView={ordersView}
        total={feed.ordersPagination.total}
        pdfBusy={pdf.isOrdersPdfBusy || loading}
        pdfMode={pdf.ordersPdfMode}
        onPdf={(mode) => void pdf.handleOrdersPdf(mode)}
        onEditRefundPeriod={refund.openRefundPeriodModal}
        onOpenRestock={() => restock.setRestockModalOpen(true)}
        restockCount={restock.restockEntries?.length ?? 0}
        onStartSelection={() => selection.enterSelection()}
      />
      <OrdersToolbar feed={feed} ordersView={ordersView} refundPendingCount={refundPeriodOverview?.pendingCount} searchRef={searchRef} now={now} />
      <SummaryStrip
        isDesktop={isDesktop}
        showTotals={!isDesktop || view === "kartice"}
        overview={refundPeriodOverview}
        totals={feed.ordersTotals}
        total={feed.ordersPagination.total}
        loading={loading}
        showRefund100Only={showRefund100Only}
        onToggleRefundFilter={() => feed.handleRefund100Toggle(!showRefund100Only)}
        onEditRefundPeriod={refund.openRefundPeriodModal}
      />

      <OrdersListProvider value={listContext}>
        {!isDesktop ? (
          <OrderMobileList entries={orderEntries} detailed={view === "detaljno"} longPress={longPress} loading={loading} loadingMore={loadingMore} empty={empty} />
        ) : view === "kartice" ? (
          <OrderCardGrid entries={orderEntries} loading={loading} loadingMore={loadingMore} empty={empty} />
        ) : (
          <OrdersTableView
            entries={orderEntries}
            columns={ordersView.columns}
            density={ordersView.density}
            drag={{
              draggingId: draggingOrderId,
              dragOverId: dragOverOrderId,
              onDragStart: reorder.handleOrderDragStart,
              onDragEnd: reorder.handleOrderDragEnd,
              onDragOver: reorder.handleOrderDragOver,
              onDragLeave: reorder.handleOrderDragLeave,
              onDrop: reorder.handleOrderDrop,
            }}
            totals={feed.ordersTotals}
            total={feed.ordersPagination.total}
            allVisibleSelected={selection.allVisibleSelected}
            onToggleAll={selection.toggleAllVisibleOrders}
            selectionDisabled={selection.bulkAction !== null}
            loading={loading}
            loadingMore={loadingMore}
            empty={empty}
          />
        )}
      </OrdersListProvider>
      <div ref={ordersLoaderRef} aria-hidden className="h-px" />
      {!hasMoreOrders && orderEntries.length > 0 && !loading ? (
        <p className="py-2 text-center text-[13px] text-text-muted">To su sve narudžbine.</p>
      ) : null}

      <SelectionBar selection={selection} isDesktop={isDesktop} hasMore={hasMoreOrders} />
      {selectionBarVisible ? <div aria-hidden className="h-16 md:h-20" /> : null}
    </div>
  );
}
