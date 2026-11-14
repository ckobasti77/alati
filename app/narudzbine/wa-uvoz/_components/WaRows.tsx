"use client";

import { Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PriceSource } from "@/lib/waIntake/types";
import {
  fieldClass,
  labelClass,
  RowCard,
  selectClass,
  StatusBadge,
  tdClass,
  thClass,
  WarningList,
  type BadgeTone,
} from "../../uvoz/_components/ImportKit";
import type { DraftRow, ProductSelectOption } from "./types";

const sourceLabels: Record<PriceSource, string> = {
  poruka: "iz poruke",
  "kp-link": "KP link",
  "kp-pretraga": "KP pretraga",
  katalog: "katalog",
};

const confidenceBadge = (confidence: number): { label: string; tone: BadgeTone } => {
  if (confidence >= 0.8) return { label: `Pouzdano ${Math.round(confidence * 100)}%`, tone: "success" };
  if (confidence >= 0.5) return { label: `Proveri ${Math.round(confidence * 100)}%`, tone: "warning" };
  return { label: `Nisko ${Math.round(confidence * 100)}%`, tone: "danger" };
};

export type WaRowsProps = {
  rows: DraftRow[];
  productOptions: ProductSelectOption[];
  priceInputValid: (value: string) => boolean;
  updateRow: (key: string, patch: Partial<DraftRow>) => void;
  removeRow: (key: string) => void;
};

type RowViewProps = Omit<WaRowsProps, "rows"> & { row: DraftRow };

function StatusCell({ row }: { row: DraftRow }) {
  if (row.writeResult) {
    return row.writeResult.status === "inserted" ? (
      <StatusBadge tone="success">Upisano</StatusBadge>
    ) : (
      <StatusBadge tone="warning">Preskočeno</StatusBadge>
    );
  }
  const badge = confidenceBadge(row.draft.confidence);
  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>;
}

function ProductSelect({ row, productOptions, updateRow, id }: Pick<RowViewProps, "row" | "productOptions" | "updateRow"> & { id: string }) {
  return (
    <select
      id={id}
      aria-label="Proizvod iz kataloga"
      className={selectClass}
      value={row.productId}
      disabled={Boolean(row.writeResult)}
      onChange={(event) => updateRow(row.key, { productId: event.target.value })}
    >
      <option value="">— bez proizvoda iz kataloga —</option>
      {productOptions.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function PriceField({
  row,
  field,
  label,
  source,
  priceInputValid,
  updateRow,
  id,
  showLabel,
}: Pick<RowViewProps, "row" | "priceInputValid" | "updateRow"> & {
  field: "nabavnaDraft" | "prodajnaDraft";
  label: string;
  source?: PriceSource;
  id: string;
  showLabel: boolean;
}) {
  const valid = priceInputValid(row[field]);
  return (
    <div>
      <label htmlFor={id} className={showLabel ? labelClass : "sr-only"}>
        {label}
      </label>
      <Input
        id={id}
        value={row[field]}
        placeholder={label}
        inputMode="decimal"
        aria-invalid={valid ? undefined : true}
        className={`${fieldClass} num min-w-0 md:text-right`}
        disabled={Boolean(row.writeResult)}
        onChange={(event) => updateRow(row.key, { [field]: event.target.value })}
      />
      {!valid ? (
        <p role="alert" className="mt-1 text-[13px] text-danger">
          Unesi broj.
        </p>
      ) : source ? (
        <p className="mt-1 text-[11px] leading-4 text-text-muted">{sourceLabels[source]}</p>
      ) : null}
    </div>
  );
}

function DraftCard(props: RowViewProps) {
  const { row, updateRow, removeRow } = props;
  const frozen = Boolean(row.writeResult);
  const id = (name: string) => `${name}-${row.key}`;
  return (
    <RowCard>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <StatusCell row={row} />
        </div>
        <IconButton aria-label="Ukloni predlog" onClick={() => removeRow(row.key)} className="-mr-1 -mt-1">
          <Trash2 aria-hidden />
        </IconButton>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor={id("ime")} className={labelClass}>
            Ime i prezime
          </label>
          <Input
            id={id("ime")}
            value={row.customerName}
            autoComplete="off"
            className={fieldClass}
            disabled={frozen}
            onChange={(event) => updateRow(row.key, { customerName: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor={id("tel")} className={labelClass}>
            Telefon
          </label>
          <Input
            id={id("tel")}
            type="tel"
            inputMode="tel"
            value={row.phone}
            className={`${fieldClass} num`}
            disabled={frozen}
            onChange={(event) => updateRow(row.key, { phone: event.target.value })}
          />
        </div>
        <Switch
          label="Lično preuzimanje"
          checked={row.pickup}
          disabled={frozen}
          onCheckedChange={(checked) => updateRow(row.key, { pickup: checked })}
        />
        {!row.pickup ? (
          <div>
            <label htmlFor={id("adr")} className={labelClass}>
              Adresa
            </label>
            <Input
              id={id("adr")}
              value={row.address}
              autoComplete="street-address"
              className={fieldClass}
              disabled={frozen}
              onChange={(event) => updateRow(row.key, { address: event.target.value })}
            />
          </div>
        ) : null}
        <div>
          <label htmlFor={id("naziv")} className={labelClass}>
            Naziv narudžbine
          </label>
          <Input
            id={id("naziv")}
            value={row.title}
            className={fieldClass}
            disabled={frozen}
            onChange={(event) => updateRow(row.key, { title: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor={id("prod")} className={labelClass}>
            Proizvod iz kataloga
          </label>
          <ProductSelect {...props} id={id("prod")} />
          {row.draft.productText ? (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-text-muted">Iz poruke: {row.draft.productText}</p>
          ) : null}
          {row.draft.kpLink ? (
            <a
              href={row.draft.kpLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex min-h-11 items-center text-[13px] font-medium text-accent-text underline underline-offset-2"
            >
              KP oglas
            </a>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PriceField {...props} field="nabavnaDraft" label="Nabavna cena" source={row.draft.nabavnaSource} id={id("nab")} showLabel />
          <PriceField {...props} field="prodajnaDraft" label="Prodajna cena" source={row.draft.prodajnaSource} id={id("prod-c")} showLabel />
        </div>
      </div>

      {frozen && row.writeResult?.reason ? (
        <p className="text-[13px] leading-5 text-warning">{row.writeResult.reason}</p>
      ) : row.draft.warnings.length > 0 ? (
        <WarningList items={row.draft.warnings} />
      ) : null}

      <div className="border-t border-border pt-1">
        <Switch
          label="Prihvati"
          checked={row.accepted}
          disabled={frozen}
          onCheckedChange={(checked) => updateRow(row.key, { accepted: checked })}
        />
      </div>
    </RowCard>
  );
}

function DraftTableRow(props: RowViewProps) {
  const { row, updateRow, removeRow } = props;
  const frozen = Boolean(row.writeResult);
  const id = (name: string) => `d-${name}-${row.key}`;
  return (
    <tr className="hover:bg-surface-2/60">
      <td className={tdClass}>
        <label className="flex min-h-8 cursor-pointer items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={row.pickup}
            disabled={frozen}
            onChange={(event) => updateRow(row.key, { pickup: event.target.checked })}
          />
          Lično
        </label>
      </td>
      <td className={tdClass}>
        <div className="space-y-1.5">
          <Input
            aria-label="Ime i prezime"
            value={row.customerName}
            placeholder="Ime i prezime"
            className={fieldClass}
            disabled={frozen}
            onChange={(event) => updateRow(row.key, { customerName: event.target.value })}
          />
          <Input
            aria-label="Telefon"
            type="tel"
            inputMode="tel"
            value={row.phone}
            placeholder="Telefon"
            className={`${fieldClass} num`}
            disabled={frozen}
            onChange={(event) => updateRow(row.key, { phone: event.target.value })}
          />
          {!row.pickup ? (
            <Input
              aria-label="Adresa"
              value={row.address}
              placeholder="Adresa"
              className={fieldClass}
              disabled={frozen}
              onChange={(event) => updateRow(row.key, { address: event.target.value })}
            />
          ) : null}
        </div>
      </td>
      <td className={tdClass}>
        <div className="space-y-1.5">
          <Input
            aria-label="Naziv narudžbine"
            value={row.title}
            placeholder="Naziv narudžbine"
            className={fieldClass}
            disabled={frozen}
            onChange={(event) => updateRow(row.key, { title: event.target.value })}
          />
          <ProductSelect {...props} id={id("prod")} />
          {row.draft.productText ? (
            <p className="truncate text-xs text-text-muted" title={row.draft.productText}>
              Iz poruke: {row.draft.productText}
            </p>
          ) : null}
          {row.draft.kpLink ? (
            <a href={row.draft.kpLink} target="_blank" rel="noreferrer" className="block truncate text-xs text-accent-text hover:underline">
              KP oglas
            </a>
          ) : null}
        </div>
      </td>
      <td className={tdClass}>
        <div className="space-y-1.5">
          <PriceField {...props} field="nabavnaDraft" label="Nabavna" source={row.draft.nabavnaSource} id={id("nab")} showLabel={false} />
          <PriceField {...props} field="prodajnaDraft" label="Prodajna" source={row.draft.prodajnaSource} id={id("prodc")} showLabel={false} />
        </div>
      </td>
      <td className={tdClass}>
        <StatusCell row={row} />
      </td>
      <td className={tdClass}>
        {frozen && row.writeResult?.reason ? (
          <p className="text-xs text-warning">{row.writeResult.reason}</p>
        ) : row.draft.warnings.length > 0 ? (
          <WarningList items={row.draft.warnings} />
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>
      <td className={`${tdClass} text-center`}>
        <Switch
          aria-label="Prihvati"
          checked={row.accepted}
          disabled={frozen}
          onCheckedChange={(checked) => updateRow(row.key, { accepted: checked })}
        />
      </td>
      <td className={`${tdClass} text-right`}>
        <IconButton aria-label="Ukloni predlog" onClick={() => removeRow(row.key)}>
          <Trash2 aria-hidden />
        </IconButton>
      </td>
    </tr>
  );
}

export function WaRows({ rows, ...rest }: WaRowsProps) {
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Predlozi narudžbina">
        {rows.map((row) => (
          <DraftCard key={row.key} row={row} {...rest} />
        ))}
      </ul>
      <table className="w-full table-fixed border-separate border-spacing-0 max-md:hidden">
        <colgroup>
          <col className="w-[96px]" />
          <col className="w-[210px]" />
          <col />
          <col className="w-[130px]" />
          <col className="w-[130px]" />
          <col className="w-[190px]" />
          <col className="w-[84px]" />
          <col className="w-[56px]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={thClass}>
              Tip
            </th>
            <th scope="col" className={thClass}>
              Kupac
            </th>
            <th scope="col" className={thClass}>
              Proizvod
            </th>
            <th scope="col" className={`${thClass} text-right`}>
              Cene
            </th>
            <th scope="col" className={thClass}>
              Status
            </th>
            <th scope="col" className={thClass}>
              Upozorenja
            </th>
            <th scope="col" className={`${thClass} text-center`}>
              Prihvati
            </th>
            <th scope="col" className={thClass}>
              <span className="sr-only">Ukloni</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <DraftTableRow key={row.key} row={row} {...rest} />
          ))}
        </tbody>
      </table>
    </>
  );
}
