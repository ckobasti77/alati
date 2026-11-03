"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import type { useOrderCatalog } from "../../_hooks/useOrderCatalog";
import type { useOrderForm } from "../../_hooks/useOrderForm";
import type { useOrderFormActions } from "../../_hooks/useOrderFormActions";
import { OrderCustomerSection } from "./OrderCustomerSection";
import { OrderItemsSection } from "./OrderItemsSection";
import { OrderPickupStageSection } from "./OrderPickupStageSection";
import { OrderShippingSection } from "./OrderShippingSection";

type OrderFormDialogProps = {
  orderForm: ReturnType<typeof useOrderForm>;
  formActions: ReturnType<typeof useOrderFormActions>;
  catalog: ReturnType<typeof useOrderCatalog>;
};

export function OrderFormDialog({ orderForm, formActions, catalog }: OrderFormDialogProps) {
  const { isModalOpen, setIsModalOpen, editingOrder, form } = orderForm;
  const { requestCloseOrderModal, handleSubmitOrder } = formActions;
  return (
    <Dialog
      open={isModalOpen}
      onOpenChange={(open) => {
        if (open) {
          setIsModalOpen(true);
          return;
        }
        requestCloseOrderModal();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editingOrder ? "Izmeni narudzbinu" : "Nova narudzbina"}</DialogTitle>
          {editingOrder ? (
            <p className="text-sm text-slate-500">
              Menjas narudzbinu za: <span className="font-medium text-slate-700">{editingOrder.title}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Popuni formu za narudzbinu. Proizvod mozes pretraziti, a tip izabrati nakon otvaranja liste.
            </p>
          )}
        </DialogHeader>
        <Form form={form} onSubmit={handleSubmitOrder} className="space-y-4">
          <OrderPickupStageSection />
          <OrderItemsSection orderForm={orderForm} formActions={formActions} catalog={catalog} />
          <OrderCustomerSection orderForm={orderForm} formActions={formActions} />
          <OrderShippingSection orderForm={orderForm} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={requestCloseOrderModal}>
              {editingOrder ? "Otkazi izmene" : "Ponisti"}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {editingOrder ? "Azuriraj" : "Sacuvaj"}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
