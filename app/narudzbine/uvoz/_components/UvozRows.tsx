"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { CandidateOrder, MatchResult } from "@/lib/receiptMatcher";
import { isOrderStage, STAGES } from "@/lib/stages";
import {
  fieldClass,
  labelClass,
  outlineButtonClass,
  RowCard,
  selectClass,
  Spinner,
  StatusBadge,
  tdClass,
  thClass,
  WarningList,
  type BadgeTone,
} from "./ImportKit";
import type { ReceiptRow } from "./types";

const matchBadge: Record<MatchResult["status"], { label: string; tone: BadgeTone }> = {
  high: { label: "Pouzdano", tone: "success" },
  review: { label: "Proveri", tone: "warning" },
  none: { label: "Nema predloga", tone: "danger" },
};

export type UvozRowsProps = {
  rows: ReceiptRow[];
  matches: Map<string, MatchResult>;
  candidates: CandidateOrder[] | undefined;
  dropdownCandidates: CandidateOrder[];
  candidateName: (orderId?: string) => string;
  digitsOnly: (value?: string) => string;
  updateRow: (key: string, patch: Partial<ReceiptRow>) => void;
  removeRow: (key: string) => void;
};

type RowViewProps = Omit<UvozRowsProps, "rows"> & { row: ReceiptRow };

function buildWarnings(row: ReceiptRow, match: MatchResult | undefined, digitsOnly: (value?: string) => string) {
  const warnings: string[] = [];
  if (row.extracted?.warning) warnings.push(row.extracted.warning);
  if (row.broj?.mismatch) {
    warnings.push(`Bar-kod (${digitsOnly(row.barcode ?? "")}) se ne poklapa sa pročitanim ciframa — proveri.`);
  }
  if (row.broj?.source === "barcode") {
    warnings.push("Broj pročitan samo sa bar-koda — proveri.");
  }
  if (match) warnings.push(...match.warnings);
  return warnings;
}

function StatusCell({ row, match }: { row: ReceiptRow; match: MatchResult | undefined }) {
  if (row.writeResult) {
    return row.writeResult.status === "updated" ? (
      <StatusBadge tone="success">Upisano</StatusBadge>
    ) : (
      <StatusBadge tone="warning">Preskočeno</StatusBadge>
    );
  }
  if (row.status === "ready" && match) {
    return (
      <StatusBadge tone={matchBadge[match.status].tone} title={match.reason}>
        {matchBadge[match.status].label}
      </StatusBadge>
    );
  }
  if (row.status === "failed") return <StatusBadge tone="danger">Greška</StatusBadge>;
  return (
    <StatusBadge tone="neutral">
      <Spinner className="size-3" />
      Obrada
    </StatusBadge>
  );
}

function OrderSelect({ row, dropdownCandidates, candidates, updateRow, ariaLabel }: Pick<RowViewProps, "row" | "dropdownCandidates" | "candidates" | "updateRow"> & { ariaLabel: string }) {
  return (
    <select
      aria-label={ariaLabel}
      className={selectClass}
      value={row.selectedOrderId ?? ""}
      disabled={candidates === undefined}
      onChange={(event) =>
        updateRow(row.key, {
          selectedOrderId: event.target.value,
          ...(event.target.value === "" ? { accepted: false } : {}),
        })
      }
    >
      <option value="">— izaberi —</option>
      {dropdownCandidates.map((candidate) => (
        <option key={candidate.id} value={candidate.id}>
          {candidate.customerName} · {candidate.phone} ·{" "}
          {isOrderStage(candidate.stage) ? STAGES[candidate.stage].longLabel : candidate.stage}
        </option>
      ))}
    </select>
  );
}

function Thumb({ row, className }: { row: ReceiptRow; className: string }) {
  return (
    <a href={row.previewUrl} target="_blank" rel="noreferrer" aria-label="Otvori sliku priznanice" className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={row.previewUrl} alt="Priznanica" className="size-full rounded-lg object-cover ring-1 ring-border" />
    </a>
  );
}

function ProcessingLines() {
  return (
    <div className="space-y-2" aria-hidden>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

function BrojField({ row, updateRow, frozen, id }: Pick<RowViewProps, "row" | "updateRow"> & { frozen: boolean; id: string }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        value={row.brojDraft ?? ""}
        placeholder="Broj pošiljke"
        inputMode="numeric"
        className={`${fieldClass} min-w-0 font-mono md:w-44`}
        disabled={frozen}
        onChange={(event) => updateRow(row.key, { brojDraft: event.target.value })}
      />
      {row.broj?.barcodeConfirmed ? <StatusBadge tone="success">Bar-kod ✓</StatusBadge> : null}
    </div>
  );
}

function ReceiptCard(props: RowViewProps) {
  const { row, matches, candidateName, digitsOnly, updateRow, removeRow } = props;
  const match = matches.get(row.key);
  const frozen = Boolean(row.writeResult);
  const warnings = buildWarnings(row, match, digitsOnly);
  const busy = row.status === "queued" || row.status === "processing";
  return (
    <RowCard>
      <div className="flex items-start gap-3">
        <Thumb row={row} className="size-14 shrink-0" />
        <div className="min-w-0 flex-1">
          {busy ? (
            <ProcessingLines />
          ) : row.status === "failed" ? (
            <p className="text-[13px] leading-5 text-danger">{row.error}</p>
          ) : (
            <>
              <p className="text-[15px] font-medium leading-5 text-text">{row.extracted?.imePrimaoca || "(ime nije pročitano)"}</p>
              <p className="text-[13px] leading-5 text-text-muted">{row.extracted?.telefonPrimaoca || "(telefon nije pročitan)"}</p>
            </>
          )}
        </div>
        <IconButton aria-label="Ukloni sliku" onClick={() => removeRow(row.key)} className="-mr-1 -mt-1">
          <Trash2 aria-hidden />
        </IconButton>
      </div>

      <div className="flex items-center gap-2">
        <StatusCell row={row} match={match} />
        {busy ? <span className="text-[13px] text-text-muted">Obrada u toku…</span> : null}
      </div>

      {row.status === "ready" ? (
        <>
          <div>
            <label htmlFor={`broj-${row.key}`} className={labelClass}>
              Broj pošiljke
            </label>
            <BrojField row={row} updateRow={updateRow} frozen={frozen} id={`broj-${row.key}`} />
          </div>
          <div>
            <p className={labelClass}>Narudžbina</p>
            {frozen ? (
              <p className="text-[15px] text-text">{candidateName(row.selectedOrderId)}</p>
            ) : (
              <OrderSelect {...props} ariaLabel="Narudžbina za ovu priznanicu" />
            )}
          </div>
        </>
      ) : null}

      {frozen && row.writeResult?.reason ? (
        <p className="text-[13px] leading-5 text-warning">{row.writeResult.reason}</p>
      ) : warnings.length > 0 ? (
        <WarningList items={warnings} />
      ) : match ? (
        <p className="text-[13px] leading-5 text-text-muted">{match.reason}</p>
      ) : null}

      {row.status === "failed" ? (
        <Button
          type="button"
          variant="outline"
          className={`w-full gap-2 ${outlineButtonClass}`}
          onClick={() => updateRow(row.key, { status: "queued", error: undefined })}
        >
          <RotateCcw className="size-4" aria-hidden />
          Ponovi
        </Button>
      ) : (
        <div className="border-t border-border pt-1">
          <Switch
            label="Prihvati"
            checked={row.accepted}
            disabled={frozen || row.status !== "ready"}
            onCheckedChange={(checked) => updateRow(row.key, { accepted: checked })}
          />
        </div>
      )}
    </RowCard>
  );
}

function ReceiptTableRow(props: RowViewProps) {
  const { row, matches, candidateName, digitsOnly, updateRow, removeRow } = props;
  const match = matches.get(row.key);
  const frozen = Boolean(row.writeResult);
  const warnings = buildWarnings(row, match, digitsOnly);
  const busy = row.status === "queued" || row.status === "processing";
  return (
    <tr className="hover:bg-surface-2/60">
      <td className={tdClass}>
        <Thumb row={row} className="block size-12" />
      </td>
      <td className={tdClass}>
        {busy ? (
          <ProcessingLines />
        ) : row.status === "failed" ? (
          <p className="text-sm text-danger">{row.error}</p>
        ) : (
          <div className="space-y-1.5">
            <div>
              <p className="text-sm font-medium text-text">{row.extracted?.imePrimaoca || "(ime nije pročitano)"}</p>
              <p className="text-[13px] text-text-muted">{row.extracted?.telefonPrimaoca || "(telefon nije pročitan)"}</p>
            </div>
            <BrojField row={row} updateRow={updateRow} frozen={frozen} id={`broj-d-${row.key}`} />
          </div>
        )}
      </td>
      <td className={tdClass}>
        {frozen ? (
          <span className="text-sm text-text">{candidateName(row.selectedOrderId)}</span>
        ) : row.status === "ready" ? (
          <OrderSelect {...props} ariaLabel="Narudžbina za ovu priznanicu" />
        ) : (
          <span className="text-sm text-text-muted">—</span>
        )}
      </td>
      <td className={tdClass}>
        <StatusCell row={row} match={match} />
      </td>
      <td className={tdClass}>
        {frozen && row.writeResult?.reason ? (
          <p className="text-xs text-warning">{row.writeResult.reason}</p>
        ) : warnings.length > 0 ? (
          <WarningList items={warnings} />
        ) : match ? (
          <p className="text-xs text-text-muted">{match.reason}</p>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>
      <td className={`${tdClass} text-center`}>
        {row.status === "failed" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`gap-1 ${outlineButtonClass}`}
            onClick={() => updateRow(row.key, { status: "queued", error: undefined })}
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Ponovi
          </Button>
        ) : (
          <Switch
            aria-label="Prihvati"
            checked={row.accepted}
            disabled={frozen || row.status !== "ready"}
            onCheckedChange={(checked) => updateRow(row.key, { accepted: checked })}
          />
        )}
      </td>
      <td className={`${tdClass} text-right`}>
        <IconButton aria-label="Ukloni sliku" onClick={() => removeRow(row.key)}>
          <Trash2 aria-hidden />
        </IconButton>
      </td>
    </tr>
  );
}

export function UvozRows({ rows, ...rest }: UvozRowsProps) {
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Priznanice">
        {rows.map((row) => (
          <ReceiptCard key={row.key} row={row} {...rest} />
        ))}
      </ul>
      <table className="w-full table-fixed border-separate border-spacing-0 max-md:hidden">
        <colgroup>
          <col className="w-[72px]" />
          <col className="w-[270px]" />
          <col />
          <col className="w-[140px]" />
          <col className="w-[220px]" />
          <col className="w-[90px]" />
          <col className="w-[56px]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={thClass}>
              Slika
            </th>
            <th scope="col" className={thClass}>
              Izvučeno
            </th>
            <th scope="col" className={thClass}>
              Narudžbina
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
            <ReceiptTableRow key={row.key} row={row} {...rest} />
          ))}
        </tbody>
      </table>
    </>
  );
}
