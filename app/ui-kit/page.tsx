"use client";

import {
  AlertTriangle,
  Archive,
  CalendarClock,
  Copy,
  Inbox,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Money } from "@/components/ui/money";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/ui/stage-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ViewToggle, type OrdersView } from "@/components/ui/view-toggle";
import { STAGE_OPTIONS } from "@/lib/stages";
import type { OrderStage } from "@/types/order";

export default function UiKitPage() {
  return (
    <RequireAuth>
      <UiKit />
    </RequireAuth>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 py-8 first:pt-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="max-w-[70ch] text-[13px] leading-5 text-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <div className="flex min-w-0 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const swatches = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["surface-3", "bg-surface-3"],
  ["raised", "bg-raised"],
  ["accent", "bg-accent"],
  ["accent-soft", "bg-accent-soft"],
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
  ["danger-solid", "bg-danger-solid"],
] as const;

function UiKit() {
  const [period, setPeriod] = useState<"danas" | "7d" | "mesec" | "sve">("7d");
  const [view, setView] = useState<OrdersView>("tabela");
  const [chips, setChips] = useState<Record<string, boolean>>({ kasni: true, povrat: false });
  const [pickup, setPickup] = useState(false);
  const [stage, setStage] = useState<OrderStage>("poslato");
  const [sheet, setSheet] = useState<"short" | "long" | "form" | null>(null);
  const [confirm, setConfirm] = useState<"danger" | "default" | null>(null);

  return (
    <div className="flex flex-col divide-y divide-border">
      <header className="flex flex-col gap-1 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">UI kit</h1>
        <p className="text-sm text-text-muted">
          Primitivi iz components/ui u svim stanjima. Interni pregled, nije u navigaciji. Brojevi i imena su primeri, ništa se ne snima.
        </p>
      </header>

      <Section title="Tokeni" description="Semantičke boje iz @theme inline. Menjaju se sa temom (html[data-theme]).">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {swatches.map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-12 rounded-xl ring-1 ring-inset ring-border ${cls}`} />
              <span className="text-xs text-text-muted">{name}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {STAGE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-inset ring-border">
              <span className={`size-3 rounded-full ${option.dotClass}`} />
              <span className="text-xs">{option.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tipografija" description="Geist, hijerarhija težinom i bojom. Novac uvek .num (tabular-nums).">
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold tracking-tight">Naslov stranice 24/32</p>
          <p className="text-base font-semibold">Naslov sekcije 16/24</p>
          <p className="text-[15px]">Telo liste na telefonu 15/22</p>
          <p className="text-sm">Telo na desktopu 14/20</p>
          <p className="text-[13px] text-text-muted">Sekundarni tekst 13/20</p>
          <p className="text-xs font-medium text-text-muted">Meta 12/16</p>
          <p className="num text-2xl font-semibold tracking-tight">1.234,50 € · 11.111,11 €</p>
        </div>
      </Section>

      <Section title="Dugmad" description="Button: 44px na telefonu (max-md), desktop nepromenjen. IconButton: aria-label je obavezan.">
        <Row label="Button varijante">
          <Button>
            <Plus className="size-4" /> Nova narudžbina
          </Button>
          <Button variant="secondary">Sekundarno</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Obriši</Button>
        </Row>
        <Row label="Stanja">
          <Button disabled>Onemogućeno</Button>
          <Button disabled>
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden /> Snimam…
          </Button>
          <Button size="sm">Malo</Button>
          <Button size="lg">Veliko</Button>
        </Row>
        <Row label="IconButton">
          <IconButton aria-label="Pozovi kupca">
            <Phone />
          </IconButton>
          <IconButton aria-label="Kopiraj broj" variant="outline">
            <Copy />
          </IconButton>
          <IconButton aria-label="Dodaj" variant="solid">
            <Plus />
          </IconButton>
          <IconButton aria-label="Obriši" variant="danger">
            <Trash2 />
          </IconButton>
          <IconButton aria-label="Onemogućeno" disabled>
            <Search />
          </IconButton>
        </Row>
      </Section>

      <Section title="Izbor" description="SegmentedControl (radiogroup, strelice), ViewToggle, Chip (filteri), Switch.">
        <Row label="SegmentedControl">
          <SegmentedControl
            ariaLabel="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "danas", label: "Danas" },
              { value: "7d", label: "7 dana" },
              { value: "mesec", label: "Ovaj mesec" },
              { value: "sve", label: "Sve", disabled: true },
            ]}
          />
        </Row>
        <Row label="ViewToggle">
          <ViewToggle value={view} onChange={setView} />
          <ViewToggle value={view} onChange={setView} showLabels />
        </Row>
        <Row label="Chip">
          <div className="flex w-full gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
            <Chip label="Kasni" icon={CalendarClock} selected={chips.kasni} onClick={() => setChips((c) => ({ ...c, kasni: !c.kasni }))} count={3} />
            <Chip label="100% povrat" selected={chips.povrat} onClick={() => setChips((c) => ({ ...c, povrat: !c.povrat }))} />
            <Chip label="Poslato" icon={Truck} count={12} />
            <Chip label="Arhiva" icon={Archive} disabled />
          </div>
        </Row>
        <Row label="Switch">
          <div className="w-full max-w-sm">
            <Switch label="Lično preuzimanje" description="Sakriva adresu i slanje" checked={pickup} onCheckedChange={setPickup} />
            <Switch label="Onemogućeno" disabled />
          </div>
          <Switch aria-label="Bez labele" defaultChecked />
        </Row>
      </Section>

      <Section title="Stage i novac" description="StageBadge: statičan ili sa izborom (Sheet na telefonu, Popover od md). Money: tabular, profit boji ±.">
        <Row label="Svi stage-ovi">
          {STAGE_OPTIONS.map((option) => (
            <StageBadge key={option.value} stage={option.value} />
          ))}
        </Row>
        <Row label="Sa izborom">
          <StageBadge stage={stage} onChange={(next) => setStage(next)} />
          <StageBadge stage="aks" onChange={() => undefined} disabled />
          <span className="text-xs text-text-muted">Primer, menja samo lokalno stanje</span>
        </Row>
        <Row label="Money">
          <Money value={1234.5} />
          <Money value={225} tone="profit" signed />
          <Money value={-42.1} tone="profit" />
          <Money value={0} tone="profit" />
          <Money value={null} />
          <Money value={89.9} tone="muted" />
        </Row>
      </Section>

      <Section title="Meniji i dijalozi" description="ActionMenu (⋯), Sheet (auto/full, sticky header i footer), ConfirmDialog.">
        <Row label="ActionMenu">
          <ActionMenu
            items={[
              { label: "Izmeni", icon: Pencil, onSelect: () => toast("Primer: Izmeni") },
              { label: "Kopiraj", icon: Copy, onSelect: () => toast("Primer: Kopiraj") },
              { label: "Podeli PDF", icon: Share2, onSelect: () => toast("Primer: Podeli"), disabled: true },
              { label: "Obriši", icon: Trash2, destructive: true, separatorBefore: true, onSelect: () => setConfirm("danger") },
            ]}
          />
        </Row>
        <Row label="Sheet">
          <Button variant="outline" onClick={() => setSheet("short")}>
            Kratak sheet
          </Button>
          <Button variant="outline" onClick={() => setSheet("long")}>
            Dug sadržaj + footer
          </Button>
          <Button variant="outline" onClick={() => setSheet("form")}>
            Forma preko celog ekrana
          </Button>
        </Row>
        <Row label="ConfirmDialog">
          <Button variant="outline" onClick={() => setConfirm("danger")}>
            Brisanje (danger)
          </Button>
          <Button variant="outline" onClick={() => setConfirm("default")}>
            Potvrda
          </Button>
        </Row>
      </Section>

      <Section title="Forme" description="Labela iznad polja, 16px na telefonu, greška ispod polja.">
        <div className="grid max-w-xl gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Kupac</span>
            <Input autoComplete="name" enterKeyHint="next" placeholder="Ime i prezime" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Telefon</span>
            <Input type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" aria-invalid aria-describedby="ui-kit-phone-error" className="ring-2 ring-danger" defaultValue="06" />
            <span id="ui-kit-phone-error" role="alert" className="text-[13px] text-danger">
              Broj je prekratak.
            </span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Napomena</span>
            <Textarea rows={3} placeholder="Opciono" />
          </label>
        </div>
      </Section>

      <Section title="Učitavanje, prazno, greška" description="Skeleton u obliku sadržaja; EmptyState kaže šta fali i nudi sledeći korak.">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl bg-surface ring-1 ring-border">
            <EmptyState
              icon={Inbox}
              title="Nema narudžbina za ove filtere"
              description="Promeni period ili očisti filtere."
              action={<Button variant="outline">Očisti filtere</Button>}
            />
          </div>
          <div className="rounded-2xl bg-surface ring-1 ring-border">
            <EmptyState
              tone="danger"
              icon={AlertTriangle}
              title="Narudžbine nisu učitane"
              description="Nema veze sa serverom. Podaci nisu izgubljeni."
              action={
                <Button variant="outline">
                  <RotateCcw className="size-4" /> Pokušaj ponovo
                </Button>
              }
            />
          </div>
        </div>
      </Section>

      <Sheet open={sheet === "short"} onOpenChange={(open) => !open && setSheet(null)} title="Promeni status" description="Primer kratkog sheet-a">
        <p className="text-sm text-text-muted">Sheet od dna na telefonu, centriran modal od md. Esc ili ✕ zatvara, fokus ostaje unutra.</p>
      </Sheet>

      <Sheet
        open={sheet === "long"}
        onOpenChange={(open) => !open && setSheet(null)}
        title="Filteri"
        description="Primer dugog sadržaja"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setSheet(null)}>
              Očisti
            </Button>
            <Button onClick={() => setSheet(null)}>Primeni</Button>
          </div>
        }
      >
        <div className="flex flex-col gap-2">
          {Array.from({ length: 24 }, (_, index) => (
            <div key={index} className="flex h-12 items-center rounded-xl bg-surface-2 px-3 text-sm">
              Stavka {index + 1}
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet
        open={sheet === "form"}
        onOpenChange={(open) => !open && setSheet(null)}
        title="Nova narudžbina"
        description="Primer forme (ne snima se)"
        size="full"
        desktopWidth="lg"
        footer={
          <Button size="lg" className="w-full" onClick={() => setSheet(null)}>
            Sačuvaj narudžbinu
          </Button>
        }
      >
        <div className="grid gap-4">
          <Switch label="Lično preuzimanje" checked={pickup} onCheckedChange={setPickup} />
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Kupac</span>
            <Input autoComplete="name" enterKeyHint="next" />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Telefon</span>
            <Input type="tel" inputMode="tel" autoComplete="tel" enterKeyHint="next" />
          </label>
          {!pickup ? (
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Adresa</span>
              <Input autoComplete="street-address" enterKeyHint="next" />
            </label>
          ) : null}
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Status</span>
            <StageBadge stage={stage} onChange={setStage} className="w-fit" />
          </div>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Napomena</span>
            <Textarea rows={4} />
          </label>
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone={confirm === "danger" ? "danger" : "default"}
        title={confirm === "danger" ? "Obrisati narudžbinu?" : "Označiti kao poslato?"}
        description={confirm === "danger" ? "Narudžbina i njena istorija se brišu. Ovo ne može da se vrati." : "Status se menja u Poslato."}
        confirmLabel={confirm === "danger" ? "Obriši" : "Potvrdi"}
        onConfirm={() =>
          new Promise<void>((resolve) =>
            window.setTimeout(() => {
              toast("Primer: ništa nije promenjeno");
              resolve();
            }, 700),
          )
        }
      />
    </div>
  );
}
