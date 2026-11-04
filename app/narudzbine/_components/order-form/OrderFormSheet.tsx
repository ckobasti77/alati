"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
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

const isVisibleField = (el: HTMLElement) => !(el as HTMLInputElement).disabled && el.getClientRects().length > 0;

/** Fokusirano polje ostaje iznad tastature (visualViewport se smanji kad se tastatura otvori). */
function useKeepFocusedVisible(container: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const viewport = window.visualViewport;
    const reveal = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !container.current?.contains(el)) return;
      if (!el.matches("input, textarea, select")) return;
      const rect = el.getBoundingClientRect();
      const visibleTop = viewport ? viewport.offsetTop : 0;
      const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      // Prostor za sticky footer ispod polja.
      if (rect.top < visibleTop + 64 || rect.bottom > visibleBottom - 88) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    let timer: number | undefined;
    const onFocusIn = () => {
      window.clearTimeout(timer);
      // Tastatura se otvara ~250 ms posle fokusa.
      timer = window.setTimeout(reveal, 280);
    };
    document.addEventListener("focusin", onFocusIn);
    viewport?.addEventListener("resize", reveal);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
      viewport?.removeEventListener("resize", reveal);
    };
  }, [active, container]);
}

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
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.enterKeyHint !== "next") return;
    event.preventDefault();
    const fields = [...(bodyRef.current?.querySelectorAll<HTMLElement>("input[enterkeyhint], textarea[enterkeyhint]") ?? [])].filter(
      (el) => isVisibleField(el) && el.getAttribute("enterkeyhint") !== "search",
    );
    const next = fields[fields.indexOf(target) + 1];
    next?.focus();
  };

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
      // Fokus na pretragu proizvoda radi hook (kao ranije); Radix ne fokusira ✕.
      onOpenAutoFocus={(event) => event.preventDefault()}
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
