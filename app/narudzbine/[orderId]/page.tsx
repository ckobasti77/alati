"use client";

import { useCallback, } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequireAuth } from "@/components/RequireAuth";
import { deleteConfirmPhrase, } from "../_lib/types";
import { requiresDeleteConfirmation, } from "../_lib/helpers";
import { useOrderDetailData } from "./_hooks/useOrderDetailData";
import { useOrderItemDraft } from "./_hooks/useOrderItemDraft";
import { useOrderDetailUpdates } from "./_hooks/useOrderDetailUpdates";
import { useOrderDetailDerived } from "./_hooks/useOrderDetailDerived";
import { useOrderDetailShare } from "./_hooks/useOrderDetailShare";
import { useOrderDetailDelete } from "./_hooks/useOrderDetailDelete";
import { ShareDialog } from "./_components/ShareDialog";
import { DeleteDialog } from "./_components/DeleteDialog";
import { ShipmentDialog } from "./_components/ShipmentDialog";
import { DetailHeader } from "./_components/DetailHeader";
import { HistoryCard } from "./_components/HistoryCard";
import { CustomerCardMobile } from "./_components/CustomerCardMobile";
import { CustomerCardDesktop } from "./_components/CustomerCardDesktop";
import { FinanceCard } from "./_components/FinanceCard";
import { NoteCard } from "./_components/NoteCard";
import { ItemsCard } from "./_components/ItemsCard";

export default function OrderDetailsPage() {
  return (
    <RequireAuth>
      <OrderDetailsContent />
    </RequireAuth>
  );
}

function OrderDetailsContent() {
  const params = useParams();
  const basePath = "/narudzbine";
  const backLabel = "Nazad na narudzbine";
  const orderScope = "default";
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(basePath);
  }, [basePath, router]);

  if (!orderId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Nije prosledjen ID narudzbine.</p>
        <Button onClick={handleBack}>{backLabel}</Button>
      </div>
    );
  }

  return <OrderDetails orderId={orderId} basePath={basePath} backLabel={backLabel} orderScope={orderScope} />;
}

function OrderDetails({
  orderId,
  basePath,
  backLabel,
  orderScope,
}: {
  orderId: string;
  basePath: string;
  backLabel: string;
  orderScope: "default" | "kalaba";
}) {
  const router = useRouter();
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(basePath);
  }, [basePath, router]);
  const { sessionToken, updateOrder, setManualRefund100, deleteOrder, refundPeriodOverview, products, suppliers, shippingOwners, order, setOrder, isLoading, copyText } = useOrderDetailData({ orderId, orderScope });
  const { productInput, setProductInput, setProductSearch, productMenuOpen, setProductMenuOpen, setItemProductId, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, itemQuantity, setItemQuantity, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, productInputRef, supplierMap, filteredProducts, selectedProduct, selectedVariants, selectedVariantForPreview, supplierOptionsWithNames, bestSupplierOption, resetItemDraft } = useOrderItemDraft({ products, suppliers });






  const { isUpdatingStage, isAddingItem, isManualRefundSaving, shipmentStageModalOpen, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, handleOrderFieldSave, handlePickupToggle, handleAddItem, handleRemoveItem, closeShipmentStageModal, handleShipmentStageSubmit, handleStageChange, handlePovratToggle, handleManualRefund100Toggle } = useOrderDetailUpdates({ orderScope, sessionToken, updateOrder, setManualRefund100, order, setOrder, itemVariantId, itemSupplierId, itemQuantity, useManualPurchasePrice, manualPurchasePrice, useManualSalePrice, manualSalePrice, productInputRef, supplierMap, selectedProduct, resetItemDraft });
  const { totals, prodajnoUkupno, nabavnoUkupno, transport, prof, slanjeOwnerLabel, slanjeOwnerPlaceholder, isAksBexMode, aksBexOwnerOptions, aksBexOwnerQuickOptions, normalizedSlanjeOwnerLookupKey, myProfitPercent, myProfit, profitShare, calculatedProfitShare, profitSharePercent, povrat, calculatedPovrat, isInRefundPeriod, isManualRefund100, isFullRefund100, isExcludedBecauseReturned, telHref, shipmentNumber, hasShipmentNumber } = useOrderDetailDerived({ refundPeriodOverview, shippingOwners, order });
  const { shareOpen, setShareOpen, orderPdfMode, canShare, handleCopyShareLink, handleShareLink, isOrderPdfBusy, handleOrderPdf, handleShipmentNumberCopy } = useOrderDetailShare({ order, copyText, prodajnoUkupno, nabavnoUkupno, transport, prof, profitShare, profitSharePercent, povrat, calculatedPovrat, isManualRefund100, isFullRefund100, isExcludedBecauseReturned, shipmentNumber, hasShipmentNumber });
  const { deleteModalOpen, deleteConfirmText, setDeleteConfirmText, isDeletingOrder, openDeleteModal, closeDeleteModal, handleDeleteModalOpenChange, handleDeleteOrder } = useOrderDetailDelete({ handleBack, orderScope, sessionToken, deleteOrder, order });
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          <span className="text-sm text-slate-600">Ucitavanje narudzbine...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Narudzbina nije pronadjena.</p>
        <p className="text-sm text-slate-500">Proveri link ili se vrati na listu narudzbina.</p>
        <Button onClick={handleBack}>{backLabel}</Button>
      </div>
    );
  }

  const deleteRequiresConfirmation = requiresDeleteConfirmation(order.stage);
  const isDeletePhraseValid = deleteConfirmText.trim().toLowerCase() === deleteConfirmPhrase;
  const isDeleteDisabled = isDeletingOrder || (deleteRequiresConfirmation && !isDeletePhraseValid);

  const mainImage = (() => {
    const images = order.product?.images ?? [];
    return images.find((image) => image.isMain) ?? images[0];
  })();

  return (
    <div className="mx-auto space-y-6">
      <ShareDialog shareOpen={shareOpen} setShareOpen={setShareOpen} orderPdfMode={orderPdfMode} canShare={canShare} handleCopyShareLink={handleCopyShareLink} handleShareLink={handleShareLink} isOrderPdfBusy={isOrderPdfBusy} handleOrderPdf={handleOrderPdf} />
      <DeleteDialog order={order} deleteModalOpen={deleteModalOpen} deleteConfirmText={deleteConfirmText} setDeleteConfirmText={setDeleteConfirmText} isDeletingOrder={isDeletingOrder} closeDeleteModal={closeDeleteModal} handleDeleteModalOpenChange={handleDeleteModalOpenChange} handleDeleteOrder={handleDeleteOrder} deleteRequiresConfirmation={deleteRequiresConfirmation} isDeleteDisabled={isDeleteDisabled} />
      <ShipmentDialog order={order} shipmentStageModalOpen={shipmentStageModalOpen} shipmentNumberDraft={shipmentNumberDraft} setShipmentNumberDraft={setShipmentNumberDraft} isShipmentStageSaving={isShipmentStageSaving} closeShipmentStageModal={closeShipmentStageModal} handleShipmentStageSubmit={handleShipmentStageSubmit} />
      <DetailHeader order={order} isUpdatingStage={isUpdatingStage} handleStageChange={handleStageChange} isManualRefund100={isManualRefund100} isFullRefund100={isFullRefund100} isExcludedBecauseReturned={isExcludedBecauseReturned} setShareOpen={setShareOpen} openDeleteModal={openDeleteModal} handleBack={handleBack} backLabel={backLabel} />

      <HistoryCard order={order} />
      <ItemsCard products={products} order={order} productInput={productInput} setProductInput={setProductInput} setProductSearch={setProductSearch} productMenuOpen={productMenuOpen} setProductMenuOpen={setProductMenuOpen} setItemProductId={setItemProductId} itemVariantId={itemVariantId} setItemVariantId={setItemVariantId} itemSupplierId={itemSupplierId} setItemSupplierId={setItemSupplierId} itemQuantity={itemQuantity} setItemQuantity={setItemQuantity} useManualPurchasePrice={useManualPurchasePrice} setUseManualPurchasePrice={setUseManualPurchasePrice} manualPurchasePrice={manualPurchasePrice} setManualPurchasePrice={setManualPurchasePrice} useManualSalePrice={useManualSalePrice} setUseManualSalePrice={setUseManualSalePrice} manualSalePrice={manualSalePrice} setManualSalePrice={setManualSalePrice} productInputRef={productInputRef} filteredProducts={filteredProducts} selectedProduct={selectedProduct} selectedVariants={selectedVariants} selectedVariantForPreview={selectedVariantForPreview} supplierOptionsWithNames={supplierOptionsWithNames} bestSupplierOption={bestSupplierOption} resetItemDraft={resetItemDraft} isAddingItem={isAddingItem} handleOrderFieldSave={handleOrderFieldSave} handleAddItem={handleAddItem} handleRemoveItem={handleRemoveItem} />

      <div className="grid gap-4 md:grid-cols-2">
        <CustomerCardMobile order={order} handleOrderFieldSave={handleOrderFieldSave} handlePickupToggle={handlePickupToggle} transport={transport} slanjeOwnerLabel={slanjeOwnerLabel} slanjeOwnerPlaceholder={slanjeOwnerPlaceholder} isAksBexMode={isAksBexMode} aksBexOwnerOptions={aksBexOwnerOptions} aksBexOwnerQuickOptions={aksBexOwnerQuickOptions} normalizedSlanjeOwnerLookupKey={normalizedSlanjeOwnerLookupKey} shipmentNumber={shipmentNumber} hasShipmentNumber={hasShipmentNumber} handleShipmentNumberCopy={handleShipmentNumberCopy} />
        <CustomerCardDesktop order={order} handleOrderFieldSave={handleOrderFieldSave} handlePickupToggle={handlePickupToggle} transport={transport} slanjeOwnerLabel={slanjeOwnerLabel} slanjeOwnerPlaceholder={slanjeOwnerPlaceholder} isAksBexMode={isAksBexMode} aksBexOwnerOptions={aksBexOwnerOptions} aksBexOwnerQuickOptions={aksBexOwnerQuickOptions} normalizedSlanjeOwnerLookupKey={normalizedSlanjeOwnerLookupKey} shipmentNumber={shipmentNumber} hasShipmentNumber={hasShipmentNumber} handleShipmentNumberCopy={handleShipmentNumberCopy} />

        <FinanceCard refundPeriodOverview={refundPeriodOverview} order={order} isManualRefundSaving={isManualRefundSaving} handleOrderFieldSave={handleOrderFieldSave} handlePovratToggle={handlePovratToggle} handleManualRefund100Toggle={handleManualRefund100Toggle} totals={totals} prodajnoUkupno={prodajnoUkupno} nabavnoUkupno={nabavnoUkupno} transport={transport} prof={prof} myProfitPercent={myProfitPercent} myProfit={myProfit} profitShare={profitShare} calculatedProfitShare={calculatedProfitShare} profitSharePercent={profitSharePercent} povrat={povrat} calculatedPovrat={calculatedPovrat} isInRefundPeriod={isInRefundPeriod} isManualRefund100={isManualRefund100} isFullRefund100={isFullRefund100} isExcludedBecauseReturned={isExcludedBecauseReturned} />
      </div>

      <NoteCard order={order} handleOrderFieldSave={handleOrderFieldSave} telHref={telHref} />
    </div>
  );
}
