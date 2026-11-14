"use client";

import { Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Switch } from "@/components/ui/switch";
import type { CandidateOrder, MatchResult } from "@/lib/legleMatcher";
import { isOrderStage, STAGES } from "@/lib/stages";
import {
  labelClass,
  RowCard,
  selectClass,
  Spinner,
  StatusBadge,
  tdClass,
  thClass,
  WarningList,
  type BadgeTone,
} from "../../uvoz/_components/ImportKit";
import type { LegleItem, UploadState } from "./types";

const matchBadge: Record<MatchResult["status"], { label: string; tone: BadgeTone }> = {
  high: { label: "Pouzdano", tone: "success" },
  review: { label: "Proveri", tone: "warning" },
  none: { label: "Nema predloga", tone: "danger" },
};

export function UploadList({ uploads }: { uploads: UploadState[] }) {
  return (
    <ul aria-label="Učitane specifikacije" className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {uploads.map((upload) => (
        <li key={upload.key} className="flex items-center gap-3 rounded-2xl bg-surface p-2 ring-1 ring-border">
          <a
            href={upload.previewUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Otvori sliku specifikacije"
            className="block size-11 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={upload.previewUrl} alt="Specifikacija" className="size-full rounded-lg object-cover ring-1 ring-border" />
          </a>
          <div className="min-w-0 flex-1 text-[13px] leading-5">
            <p className="truncate font-medium text-text">{upload.name}</p>
            {upload.status === "processing" ? (
              <p className="flex items-center gap-1.5 text-text-muted">
                <Spinner className="size-3.5" />
                Obrada…
              </p>
            ) : upload.status === "failed" ? (
              <p className="text-danger">{upload.error}</p>
            ) : (
              <p className="text-text-muted">
                <span className="num">{upload.rowCount ?? 0}</span> {upload.rowCount === 1 ? "red" : "redova"}
                {upload.error ? ` · ${upload.error}` : ""}
              </p>
            )}
          </div>
          {upload.status === "failed" ? <StatusBadge tone="danger">Greška</StatusBadge> : null}
        </li>
      ))}
    </ul>
  );
}

export type PareRowsProps = {
  items: LegleItem[];
  matches: Map<string, MatchResult>;
  dropdownCandidates: CandidateOrder[];
  candidateName: (orderId?: string) => string;
  updateItem: (key: string, patch: Partial<LegleItem>) => void;
  removeItem: (key: string) => void;
};

type RowViewProps = Omit<PareRowsProps, "items"> & { item: LegleItem };

function buildWarnings(item: LegleItem, match: MatchResult | undefined) {
  const warnings: string[] = [];
  if (item.extractWarning) warnings.push(item.extractWarning);
  if (match) warnings.push(...match.warnings);
  return warnings;
}

function StatusCell({ item, match }: { item: LegleItem; match: MatchResult | undefined }) {
  if (item.writeResult) {
    return item.writeResult.status === "updated" ? (
      <StatusBadge tone="success">Upisano</StatusBadge>
    ) : (
      <StatusBadge tone="warning">Preskočeno</StatusBadge>
    );
  }
  if (match) {
    return (
      <StatusBadge tone={matchBadge[match.status].tone} title={match.reason}>
        {matchBadge[match.status].label}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone="neutral">
      <Spinner className="size-3" />
      Uparivanje
    </StatusBadge>
  );
}

function OrderSelect({ item, dropdownCandidates, updateItem }: Pick<RowViewProps, "item" | "dropdownCandidates" | "updateItem">) {
  return (
    <select
      aria-label="Narudžbina za ovaj red"
      className={selectClass}
      value={item.selectedOrderId ?? ""}
      onChange={(event) =>
        updateItem(item.key, {
          selectedOrderId: event.target.value,
          ...(event.target.value === "" ? { accepted: false } : {}),
        })
      }
    >
      <option value="">— izaberi —</option>
      {dropdownCandidates.map((candidate) => (
        <option key={candidate.id} value={candidate.id}>
          {candidate.customerName}
          {candidate.brojPosiljke ? ` · ${candidate.brojPosiljke}` : ""} ·{" "}
          {isOrderStage(candidate.stage) ? STAGES[candidate.stage].longLabel : candidate.stage}
        </option>
      ))}
    </select>
  );
}

function LegleCard(props: RowViewProps) {
  const { item, matches, candidateName, updateItem, removeItem } = props;
  const match = matches.get(item.key);
  const frozen = Boolean(item.writeResult);
  const warnings = buildWarnings(item, match);
  return (
    <RowCard>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-5 text-text">{item.platilac || "(ime nije pročitano)"}</p>
          <p className="num mt-0.5 font-mono text-[13px] leading-5 text-text-muted">NalogID: {item.nalogId || "—"}</p>
        </div>
        <IconButton aria-label="Ukloni red" onClick={() => removeItem(item.key)} className="-mr-1 -mt-1">
          <Trash2 aria-hidden />
        </IconButton>
      </div>

      <StatusCell item={item} match={match} />

      <div>
        <p className={labelClass}>Narudžbina</p>
        {frozen ? <p className="text-[15px] text-text">{candidateName(item.selectedOrderId)}</p> : <OrderSelect {...props} />}
      </div>

      {frozen && item.writeResult?.reason ? (
        <p className="text-[13px] leading-5 text-warning">{item.writeResult.reason}</p>
      ) : warnings.length > 0 ? (
        <WarningList items={warnings} />
      ) : match ? (
        <p className="text-[13px] leading-5 text-text-muted">{match.reason}</p>
      ) : null}

      <div className="border-t border-border pt-1">
        <Switch
          label="Prihvati"
          checked={item.accepted}
          disabled={frozen}
          onCheckedChange={(checked) => updateItem(item.key, { accepted: checked })}
        />
      </div>
    </RowCard>
  );
}

function LegleTableRow(props: RowViewProps) {
  const { item, matches, candidateName, updateItem, removeItem } = props;
  const match = matches.get(item.key);
  const frozen = Boolean(item.writeResult);
  const warnings = buildWarnings(item, match);
  return (
    <tr className="hover:bg-surface-2/60">
      <td className={tdClass}>
        <span className="text-sm font-medium text-text">{item.platilac || "(ime nije pročitano)"}</span>
      </td>
      <td className={tdClass}>
        <span className="num font-mono text-[13px] text-text-muted">{item.nalogId || "—"}</span>
      </td>
      <td className={tdClass}>
        {frozen ? <span className="text-sm text-text">{candidateName(item.selectedOrderId)}</span> : <OrderSelect {...props} />}
      </td>
      <td className={tdClass}>
        <StatusCell item={item} match={match} />
      </td>
      <td className={tdClass}>
        {frozen && item.writeResult?.reason ? (
          <p className="text-xs text-warning">{item.writeResult.reason}</p>
        ) : warnings.length > 0 ? (
          <WarningList items={warnings} />
        ) : match ? (
          <p className="text-xs text-text-muted">{match.reason}</p>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>
      <td className={`${tdClass} text-center`}>
        <Switch
          aria-label="Prihvati"
          checked={item.accepted}
          disabled={frozen}
          onCheckedChange={(checked) => updateItem(item.key, { accepted: checked })}
        />
      </td>
      <td className={`${tdClass} text-right`}>
        <IconButton aria-label="Ukloni red" onClick={() => removeItem(item.key)}>
          <Trash2 aria-hidden />
        </IconButton>
      </td>
    </tr>
  );
}

export function PareRows({ items, ...rest }: PareRowsProps) {
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Redovi specifikacije">
        {items.map((item) => (
          <LegleCard key={item.key} item={item} {...rest} />
        ))}
      </ul>
      <table className="w-full table-fixed border-separate border-spacing-0 max-md:hidden">
        <colgroup>
          <col className="w-[200px]" />
          <col className="w-[170px]" />
          <col />
          <col className="w-[140px]" />
          <col className="w-[220px]" />
          <col className="w-[90px]" />
          <col className="w-[56px]" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={thClass}>
              Platilac
            </th>
            <th scope="col" className={thClass}>
              NalogID (broj pošiljke)
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
          {items.map((item) => (
            <LegleTableRow key={item.key} item={item} {...rest} />
          ))}
        </tbody>
      </table>
    </>
  );
}
