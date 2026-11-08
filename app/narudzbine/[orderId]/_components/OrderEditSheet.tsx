"use client";

import { Loader2 } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { focusNextField, useKeepFocusedVisible } from "@/lib/useKeepFocusedVisible";
import { cn } from "@/lib/utils";
import type { OrderWithProduct, ShippingOwnerOptions, SlanjeMode } from "@/types/order";
import type { OrderEditField } from "../_lib/orderEdit";
import { ORDER_EDIT_SECTION_FIELD, orderEditFieldId, type useOrderEditForm } from "../_hooks/useOrderEditForm";

const FORM_ID = "order-edit-form";
const MODE_OPTIONS: { value: SlanjeMode | ""; label: string }[] = [
  { value: "Posta", label: "Pošta" },
  { value: "Aks", label: "Aks" },
  { value: "Bex", label: "Bex" },
  { value: "", label: "Bez slanja" },
];

type OrderEditSheetProps = {
  order: OrderWithProduct;
  edit: ReturnType<typeof useOrderEditForm>;
  shippingOwners: ShippingOwnerOptions | undefined;
};

function Field({
  field,
  label,
  hint,
  error,
  children,
}: {
  field: OrderEditField;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={orderEditFieldId(field)} className="text-sm font-medium text-text">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${orderEditFieldId(field)}-greska`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const errorProps = (field: OrderEditField, error?: string) =>
  error ? { "aria-invalid": true as const, "aria-describedby": `${orderEditFieldId(field)}-greska`, className: "ring-2 ring-danger" } : {};

/** „Izmeni narudžbinu“: telefon preko celog ekrana (✕ · naslov · Sačuvaj, dole „Sačuvaj izmene“), desktop modal. */
export function OrderEditSheet({ order, edit, shippingOwners }: OrderEditSheetProps) {
  const { open, section, values, errors, isSaving, exitConfirmOpen, setExitConfirmOpen, setField, requestClose, discardAndClose, save } = edit;
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useKeepFocusedVisible(bodyRef, open);
  if (!values) return null;

  const mode = values.slanjeMode;
  const ownerOptions = (mode === "Posta" ? shippingOwners?.postaNames : mode ? shippingOwners?.aksBexAccounts : undefined)?.slice(0, 12) ?? [];
  const ownerValue = values.slanjeOwner.trim().toLowerCase();

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) requestClose();
        }}
        title="Izmeni narudžbinu"
        description={order.title}
        size="full"
        desktopWidth="lg"
        closeSide="start"
        onOpenAutoFocus={(event) => {
          if (!section) return;
          event.preventDefault();
          const target = document.getElementById(orderEditFieldId(ORDER_EDIT_SECTION_FIELD[section]));
          const focusable = target?.matches("input, textarea, button") ? target : target?.querySelector<HTMLElement>("input, textarea, button");
          focusable?.focus({ preventScroll: true });
          target?.scrollIntoView({ block: "center" });
        }}
        headerActions={
          <Button type="submit" form={FORM_ID} size="sm" disabled={isSaving} className="h-11 rounded-xl px-4 md:h-9">
            Sačuvaj
          </Button>
        }
        footer={
          <Button type="submit" form={FORM_ID} disabled={isSaving} className="w-full gap-2">
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Sačuvaj izmene
          </Button>
        }
      >
        <div ref={bodyRef} onKeyDown={(event) => focusNextField(event, bodyRef.current)}>
          <form
            id={FORM_ID}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
            className="flex flex-col gap-7 pb-2"
          >
            <Field field="title" label="Naslov" error={errors.title}>
              <Textarea
                id={orderEditFieldId("title")}
                value={values.title}
                rows={2}
                autoResize
                enterKeyHint="next"
                onChange={(event) => setField("title", event.target.value)}
                {...errorProps("title", errors.title)}
              />
            </Field>

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 text-base font-semibold text-text">Kupac</legend>
              <Field field="customerName" label="Ime i prezime" error={errors.customerName}>
                <Input
                  id={orderEditFieldId("customerName")}
                  value={values.customerName}
                  autoComplete="name"
                  autoCapitalize="words"
                  enterKeyHint="next"
                  onChange={(event) => setField("customerName", event.target.value)}
                  {...errorProps("customerName", errors.customerName)}
                />
              </Field>
              <Field field="phone" label="Telefon" error={errors.phone}>
                <Input
                  id={orderEditFieldId("phone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  enterKeyHint="next"
                  value={values.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                  {...errorProps("phone", errors.phone)}
                />
              </Field>
              <Field field="address" label="Adresa" error={errors.address} hint={values.pickup ? "Lično preuzimanje: adresa se ne čuva." : undefined}>
                <Input
                  id={orderEditFieldId("address")}
                  value={values.address}
                  disabled={values.pickup}
                  autoComplete="street-address"
                  enterKeyHint="next"
                  onChange={(event) => setField("address", event.target.value)}
                  {...errorProps("address", errors.address)}
                />
              </Field>
            </fieldset>

            <fieldset className="flex flex-col gap-4">
              <legend className="mb-3 text-base font-semibold text-text">Slanje i račun</legend>
              <div className="-my-1">
                <Switch label="Lično preuzimanje" checked={values.pickup} onCheckedChange={(value) => setField("pickup", value)} />
              </div>
              {values.pickup ? (
                <p className="-mt-2 text-[13px] text-text-muted">Uz lično preuzimanje slanje i račun se ne čuvaju (server ih briše).</p>
              ) : (
                <>
              <div id={orderEditFieldId("slanjeMode")} className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text" aria-hidden>
                  Slanje
                </span>
                <SegmentedControl
                  ariaLabel="Slanje"
                  fullWidth
                  columns={4}
                  value={mode}
                  onChange={(value) => setField("slanjeMode", value)}
                  options={MODE_OPTIONS}
                />
              </div>
              <Field
                field="slanjeOwner"
                label={mode === "Posta" ? "Na ime (Pošta)" : "Na čiji račun"}
                error={errors.slanjeOwner}
                hint={mode ? undefined : "Prvo izaberi slanje."}
              >
                {mode && ownerOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Sačuvani računi">
                    {ownerOptions.map((option) => (
                      <Chip
                        key={option.value}
                        label={option.value}
                        selected={ownerValue === option.value.trim().toLowerCase()}
                        onClick={() => setField("slanjeOwner", option.value)}
                      />
                    ))}
                  </div>
                ) : null}
                <Input
                  id={orderEditFieldId("slanjeOwner")}
                  value={values.slanjeOwner}
                  disabled={!mode}
                  autoComplete="off"
                  enterKeyHint="next"
                  placeholder={mode === "Posta" ? "Upiši ime" : "Upiši račun"}
                  onChange={(event) => setField("slanjeOwner", event.target.value)}
                  {...errorProps("slanjeOwner", errors.slanjeOwner)}
                />
              </Field>
                </>
              )}
              <Field field="brojPosiljke" label="Broj pošiljke" error={errors.brojPosiljke}>
                <Input
                  id={orderEditFieldId("brojPosiljke")}
                  value={values.brojPosiljke}
                  autoComplete="off"
                  autoCapitalize="characters"
                  enterKeyHint="next"
                  onChange={(event) => setField("brojPosiljke", event.target.value)}
                />
              </Field>
            </fieldset>

            <fieldset className="grid grid-cols-2 gap-4">
              <legend className="col-span-2 mb-3 text-base font-semibold text-text">Novac</legend>
              <Field field="transportCost" label="Transport (€)" error={errors.transportCost}>
                <Input
                  id={orderEditFieldId("transportCost")}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  placeholder="0"
                  value={values.transportCost}
                  onChange={(event) => setField("transportCost", event.target.value)}
                  {...errorProps("transportCost", errors.transportCost)}
                  className={cn("num", errors.transportCost && "ring-2 ring-danger")}
                />
              </Field>
              <Field field="myProfitPercent" label="Moj profit (%)" error={errors.myProfitPercent}>
                <Input
                  id={orderEditFieldId("myProfitPercent")}
                  type="text"
                  inputMode="decimal"
                  enterKeyHint="next"
                  placeholder="100"
                  value={values.myProfitPercent}
                  onChange={(event) => setField("myProfitPercent", event.target.value)}
                  {...errorProps("myProfitPercent", errors.myProfitPercent)}
                  className={cn("num", errors.myProfitPercent && "ring-2 ring-danger")}
                />
              </Field>
            </fieldset>

            <Field field="napomena" label="Napomena" error={errors.napomena}>
              <Textarea
                id={orderEditFieldId("napomena")}
                value={values.napomena}
                rows={3}
                autoResize
                onChange={(event) => setField("napomena", event.target.value)}
              />
            </Field>
          </form>
        </div>
      </Sheet>

      <ConfirmDialog
        open={exitConfirmOpen}
        onOpenChange={setExitConfirmOpen}
        title="Napusti izmene?"
        description="Izmene koje nisu sačuvane biće izgubljene."
        confirmLabel="Napusti"
        cancelLabel="Nastavi izmenu"
        tone="danger"
        onConfirm={discardAndClose}
      />
    </>
  );
}
