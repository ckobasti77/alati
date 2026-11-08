"use client";

import Link from "next/link";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Clock, Copy, Download, FileText, Link2, Pencil, Share2, Trash2 } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RequireAuth } from "@/components/RequireAuth";
import { HeaderActions, HeaderTitle } from "@/components/shell/ShellProvider";
import { setFocusReturn } from "@/lib/focusReturn";
import { useOrderDetailData } from "./_hooks/useOrderDetailData";
import { useOrderItemDraft } from "./_hooks/useOrderItemDraft";
import { useOrderDetailUpdates } from "./_hooks/useOrderDetailUpdates";
import { useOrderDetailDerived } from "./_hooks/useOrderDetailDerived";
import { useOrderDetailShare } from "./_hooks/useOrderDetailShare";
import { useOrderDetailDelete } from "./_hooks/useOrderDetailDelete";
import { useOrderEditForm, type OrderEditSection } from "./_hooks/useOrderEditForm";
import { StatusSection } from "./_components/StatusSection";
import { CustomerSection } from "./_components/CustomerSection";
import { ItemsSection } from "./_components/ItemsSection";
import { MoneySection } from "./_components/MoneySection";
import { ShippingSection } from "./_components/ShippingSection";
import { TimelineSection } from "./_components/TimelineSection";
import { NoteSection } from "./_components/NoteSection";
import { OrderActionBar } from "./_components/OrderActionBar";
import { OrderEditSheet } from "./_components/OrderEditSheet";
import { AddItemSheet } from "./_components/AddItemSheet";
import { DeleteOrderConfirm, ShipmentNumberSheet, StageSheet } from "./_components/OrderDetailSheets";

const BASE_PATH = "/narudzbine";
const ORDER_SCOPE = "default" as const;

export default function OrderDetailsPage() {
  return (
    <RequireAuth>
      <OrderDetailsContent />
    </RequireAuth>
  );
}

function useBack() {
  const router = useRouter();
  return useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(BASE_PATH);
  }, [router]);
}

function OrderDetailsContent() {
  const params = useParams();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";
  const handleBack = useBack();
  if (!orderId) {
    return (
      <EmptyState
        title="Nije prosleđen ID narudžbine."
        action={<Button onClick={handleBack}>Nazad na narudžbine</Button>}
        className="mx-auto mt-16 max-w-md"
      />
    );
  }
  return <OrderDetails orderId={orderId} />;
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-3 md:space-y-6" aria-busy="true" aria-label="Učitavanje narudžbine">
      <Skeleton className="hidden h-8 w-2/3 md:block" />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_380px] md:gap-6">
        <div className="space-y-3 md:space-y-6">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

function OrderDetails({ orderId }: { orderId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const handleBack = useBack();
  const data = useOrderDetailData({ orderId, orderScope: ORDER_SCOPE });
  const { sessionToken, updateOrder, setManualRefund100, deleteOrder, refundPeriodOverview, products, shippingOwners, order, setOrder, isLoading, copyText } = data;
  const draft = useOrderItemDraft({ products, suppliers: data.suppliers });
  const updates = useOrderDetailUpdates({ orderScope: ORDER_SCOPE, sessionToken, updateOrder, setManualRefund100, order, setOrder, draft });
  const derived = useOrderDetailDerived({ refundPeriodOverview, shippingOwners, order });
  const share = useOrderDetailShare({ order, copyText, ...derived });
  const orderDelete = useOrderDetailDelete({ handleBack, orderScope: ORDER_SCOPE, sessionToken, deleteOrder, order });
  const edit = useOrderEditForm({ order, applyOrderUpdate: updates.applyOrderUpdate });
  const [addOpen, setAddOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);

  // "Izmeni" iz ⋯ u listi vodi ovde sa ?izmeni=1: forma se otvara jednom, kad stigne narudžbina, pa se parametar čisti.
  const openEditFromUrl = useEffectEvent(() => {
    if (!order || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("izmeni") !== "1") return;
    params.delete("izmeni");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    edit.openEdit();
  });
  const hasOrder = Boolean(order);
  useEffect(() => {
    if (hasOrder) openEditFromUrl();
  }, [hasOrder]);

  if (isLoading) return <DetailSkeleton />;

  if (!order) {
    return (
      <EmptyState
        title="Narudžbina nije pronađena."
        description="Proveri link ili se vrati na listu narudžbina."
        action={<Button onClick={handleBack}>Nazad na narudžbine</Button>}
        className="mx-auto mt-16 max-w-md"
      />
    );
  }

  const openEdit = (section?: OrderEditSection) => edit.openEdit(section);
  const isSent = order.stage === "poslato";
  const menuItems: ActionMenuItem[] = [
    { label: "Izmeni", icon: Pencil, onSelect: () => openEdit() },
    ...(isSent
      ? [
          {
            label: order.kasni ? "Ukloni oznaku kašnjenja" : "Označi da kasni",
            icon: Clock,
            disabled: updates.isKasniSaving,
            onSelect: () => void updates.handleKasniToggle(!order.kasni),
          },
        ]
      : []),
    { label: "Kopiraj telefon", icon: Copy, disabled: !order.phone, onSelect: () => void copyText(order.phone, "Broj telefona je kopiran."), separatorBefore: true },
    { label: "Kopiraj ID", icon: Copy, onSelect: () => void copyText(order._id, "ID narudžbine je kopiran.") },
    { label: "Kopiraj link", icon: Link2, onSelect: () => void share.handleCopyShareLink() },
    { label: "Preuzmi PDF", icon: Download, disabled: share.isOrderPdfBusy, onSelect: () => void share.handleOrderPdf("download"), separatorBefore: true },
    { label: "Podeli PDF", icon: FileText, disabled: share.isOrderPdfBusy, onSelect: () => void share.handleOrderPdf("share") },
    ...(share.canShare ? [{ label: "Podeli link", icon: Share2, onSelect: () => void share.handleShareLink() }] : []),
    { label: "Obriši", icon: Trash2, destructive: true, separatorBefore: true, onSelect: orderDelete.openDeleteModal },
  ];
  const menuLabel = "Akcije narudžbine";

  return (
    <>
      <HeaderTitle>
        <h1 className="line-clamp-2 text-[15px] leading-[19px] font-semibold whitespace-normal">{order.title}</h1>
      </HeaderTitle>
      <HeaderActions>
        <ActionMenu items={menuItems} label={menuLabel} />
      </HeaderActions>

      <div className="mx-auto max-w-7xl">
        <div className="mb-6 hidden items-start gap-4 md:flex">
          <div className="min-w-0 flex-1">
            <Link
              href={BASE_PATH}
              onClick={(event) => {
                event.preventDefault();
                handleBack();
              }}
              className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-ring"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Narudžbine
            </Link>
            <h1 className="mt-1 line-clamp-2 text-2xl font-semibold tracking-tight text-text">{order.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-10">
            <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={() => openEdit()}>
              <Pencil className="size-4" aria-hidden />
              Izmeni
            </Button>
            <ActionMenu items={menuItems} label={menuLabel} />
          </div>
        </div>

        {/* DOM redosled = redosled na telefonu i redosled Tab-a: status, kupac, novac, pa stavke, slanje, tok, napomena.
            Desktop: aside desno (sticky), ostalo levo. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_380px] md:items-start md:gap-6">
          <aside
            aria-label="Pregled narudžbine"
            className="contents md:sticky md:col-start-2 md:row-start-1 md:top-[calc(var(--header-h)+24px)] md:block md:max-h-[calc(100dvh-var(--header-h)-48px)] md:divide-y md:divide-border md:overflow-y-auto md:rounded-2xl md:bg-surface md:p-5 md:ring-1 md:ring-border"
          >
            <StatusSection
              aside
              order={order}
              isUpdatingStage={updates.isUpdatingStage}
              onStageChange={(stage) => void updates.handleStageChange(stage)}
              isFullRefund100={derived.isFullRefund100}
              isManualRefund100={derived.isManualRefund100}
              isExcludedBecauseReturned={derived.isExcludedBecauseReturned}
            />
            <CustomerSection aside order={order} copyText={copyText} onEdit={() => openEdit("kupac")} />
            <MoneySection
              aside
              order={order}
              derived={derived}
              refundPeriodOverview={refundPeriodOverview}
              isManualRefundSaving={updates.isManualRefundSaving}
              onPovratToggle={(value) => void updates.handlePovratToggle(value)}
              onManualRefund100Toggle={(value) => void updates.handleManualRefund100Toggle(value)}
              onEdit={() => openEdit("novac")}
            />

            <div className="hidden gap-2 pt-4 md:flex">
              <Button type="button" variant="outline" className="flex-1 gap-2 rounded-xl" disabled={!order.phone} onClick={() => void copyText(order.phone, "Broj telefona je kopiran.")}>
                <Copy className="size-4" aria-hidden />
                Kopiraj broj
              </Button>
              <Button type="button" className="flex-1 gap-2 rounded-xl" onClick={() => openEdit()}>
                <Pencil className="size-4" aria-hidden />
                Izmeni
              </Button>
            </div>
          </aside>
          <div className="contents md:col-start-1 md:row-start-1 md:block md:space-y-6">
            <ItemsSection order={order} onAdd={() => setAddOpen(true)} onRemove={updates.handleRemoveItem} />
            <ShippingSection
              order={order}
              shipmentNumber={derived.shipmentNumber}
              copyText={copyText}
              onTrack={() => void share.handleShipmentNumberCopy()}
              onEdit={() => openEdit("slanje")}
            />
            <TimelineSection order={order} />
            <NoteSection order={order} onEdit={() => openEdit("napomena")} />
          </div>
        </div>
        {/* Prostor da sticky traka akcija ne prekrije poslednju karticu. */}
        <div aria-hidden className="h-20 md:hidden" />
      </div>

      <OrderActionBar
        phone={order.phone ?? ""}
        hasShipmentNumber={derived.hasShipmentNumber}
        onCopyPhone={() => void copyText(order.phone, "Broj telefona je kopiran.")}
        onStatus={() => setStageOpen(true)}
        onTrack={() => void share.handleShipmentNumberCopy()}
      />

      <StageSheet
        open={stageOpen}
        onOpenChange={setStageOpen}
        stage={order.stage}
        onSelect={(stage) => {
          // Sheet broja pošiljke se otvara dok se ovaj zatvara: fokus se posle vraća na "Status" u traci.
          if (stage === "poslato") setFocusReturn(document.getElementById("detail-bar-status"));
          void updates.handleStageChange(stage);
        }}
      />
      <ShipmentNumberSheet order={order} updates={updates} />
      <OrderEditSheet order={order} edit={edit} shippingOwners={shippingOwners} />
      <AddItemSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        draft={draft}
        products={products}
        isAddingItem={updates.isAddingItem}
        onAdd={updates.handleAddItem}
      />
      <DeleteOrderConfirm order={order} orderDelete={orderDelete} />
    </>
  );
}
