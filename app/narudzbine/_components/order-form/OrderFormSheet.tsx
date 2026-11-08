"use client";

import { Loader2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { focusNextField, useKeepFocusedVisible } from "@/lib/useKeepFocusedVisible";
import type { useOrderCatalog } from "../../_hooks/useOrderCatalog";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import type { useOrderFormActions } from "../../_hooks/useOrderFormActions";
import { OrderCustomerSection } from "./OrderCustomerSection";
import { OrderItemsSection } from "./OrderItemsSection";
import { OrderNoteField, OrderPickupSwitch, OrderStageField } from "./OrderPickupStageSection";
import { OrderShippingSection } from "./OrderShippingSection";

type OrderFormSheetProps = {
  orderForm: ReturnType<typeof useOrderForm>;
  formActions: ReturnType<typeof useOrderFormActions>;
  catalog: ReturnType<typeof useOrderCatalog>;
};

const FORM_ID = "order-form";

/**
 * Forma Nova/Izmeni narudžbinu: telefon preko celog ekrana (✕ · naslov · Sačuvaj gore, "Sačuvaj narudžbinu" dole),
 * desktop modal. Logika snimanja, validacije i exit-confirm su iz istih hookova kao ranije.
 */
export function OrderFormSheet({ orderForm, formActions, catalog }: OrderFormSheetProps) {
  const { isModalOpen, setIsModalOpen, editingOrder, form } = orderForm;
  const { requestCloseOrderModal, handleSubmitOrder } = formActions;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const submitting = form.formState.isSubmitting;
  useKeepFocusedVisible(bodyRef, isModalOpen);

  // enterKeyHint="next": Enter prelazi na sledeće polje umesto da šalje formu.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => focusNextField(event, bodyRef.current);

  return (
    <Sheet
      open={isModalOpen}
      onOpenChange={(open) => {
        if (open) {
          setIsModalOpen(true);
          return;
        }
        requestCloseOrderModal();
      }}
      title={editingOrder ? "Izmeni narudžbinu" : "Nova narudžbina"}
      description={editingOrder ? editingOrder.title : undefined}
      size="full"
      desktopWidth="lg"
      closeSide="start"
      // Prvi korak unosa: fokus na pretragu proizvoda (ne na ✕); izmena počinje od vrha forme.
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        document.getElementById("order-product")?.focus({ preventScroll: true });
      }}
      headerActions={
        <Button type="submit" form={FORM_ID} size="sm" disabled={submitting} className="h-11 rounded-xl px-4 md:h-9">
          Sačuvaj
        </Button>
      }
      footer={
        <Button type="submit" form={FORM_ID} disabled={submitting} className="w-full gap-2">
          {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {editingOrder ? "Sačuvaj izmene" : "Sačuvaj narudžbinu"}
        </Button>
      }
    >
      <div ref={bodyRef} onKeyDown={handleKeyDown}>
        <Form id={FORM_ID} form={form} onSubmit={handleSubmitOrder} className="flex flex-col gap-6 pb-2">
          <OrderPickupSwitch />
          <OrderItemsSection orderForm={orderForm} formActions={formActions} catalog={catalog} />
          <div className="h-px bg-border" aria-hidden />
          <OrderCustomerSection orderForm={orderForm} formActions={formActions} />
          <OrderShippingSection orderForm={orderForm} />
          <OrderStageField />
          <OrderNoteField />
        </Form>
      </div>
    </Sheet>
  );
}
