"use client";

// OrderScreenshotSection — sekcija "Popuni iz slike" na VRHU forme Nova narudžbina.
// Ulaz: dugme "Slika" (galerija/kamera), paste (Ctrl+V) i prevuci-pusti (desktop).
// Stanja: izbor → čitam (sličica + skeleton + otkazivanje) → upozorenja/kandidati/akcije
//         | greška (jasna poruka + Pokušaj ponovo; 429 bez "Pokušaj ponovo").
// NIŠTA se ne snima automatski — korisnik uvek sam pritiska "Sačuvaj".

import { useRef, useState } from "react";
import { ImagePlus, Loader2, TriangleAlert } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FormLabel } from "@/components/ui/form";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OrderScreenshot } from "../../_hooks/useOrderScreenshot";

type OrderScreenshotSectionProps = {
  screenshot: OrderScreenshot;
};

export function OrderScreenshotSection({ screenshot }: OrderScreenshotSectionProps) {
  const {
    file,
    previewUrl,
    status,
    error,
    lastModel,
    draft,
    applied,
    showCandidates,
    candidateList,
    selectFile,
    retry,
    readStrong,
    cancel,
    requestApply,
    selectCandidate,
    dismissCandidates,
  } = screenshot;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => fileInputRef.current?.click();

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = Array.from(event.dataTransfer?.files ?? []).find(
      (item) => item.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(item.name),
    );
    if (dropped) selectFile(dropped);
  };

  const strongUsed = lastModel === "gemini-3.5-flash";

  return (
    <section
      aria-labelledby="order-screenshot-title"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col gap-3 rounded-2xl p-3 ring-1 transition-colors duration-(--duration-fast)",
        dragging ? "bg-accent-soft/40 ring-ring" : "bg-surface-2/60 ring-border",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) selectFile(selected);
          event.target.value = "";
        }}
      />

      <div className="flex items-center justify-between gap-3">
        <FormLabel id="order-screenshot-title" className="text-base font-semibold">
          Popuni iz slike
        </FormLabel>
        {applied ? <span className="text-[13px] text-text-muted">proveri i sačuvaj</span> : null}
      </div>

      {file && previewUrl ? (
        <div className="flex items-start gap-3">
          {/* blob: URL → next/image ga ostavlja unoptimized (običan <img>), bez optimizacije */}
          <Image
            src={previewUrl}
            alt="Slika za čitanje"
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
          <div className="min-w-0 flex-1" aria-live="polite">
            {status === "loading" ? (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-sm font-medium text-text">
                  <Loader2 className="size-4 animate-spin text-text-muted" aria-hidden />
                  Čitam sliku…
                </p>
                <Skeleton className="h-4 w-40" />
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={cancel}>
                  Otkaži
                </Button>
              </div>
            ) : status === "error" && error ? (
              <div className="flex flex-col gap-2" role="alert">
                <p className="text-[13px] leading-5 text-danger">{error.message}</p>
                {error.retryable ? (
                  <Button type="button" variant="outline" size="sm" className="self-start" onClick={retry}>
                    Pokušaj ponovo
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={openPicker} className="shrink-0">
            Promeni
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-3">
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-surface text-text-muted ring-1 ring-border">
            <ImagePlus className="size-5" aria-hidden />
          </span>
          <Button type="button" variant="secondary" onClick={openPicker} className="gap-2">
            <ImagePlus className="size-4" aria-hidden />
            Slika
          </Button>
          <p className="max-w-[36ch] text-center text-[13px] leading-5 text-text-muted">
            Galerija ili kamera · prevuci sliku ovde ili nalepi (Ctrl+V)
          </p>
        </div>
      )}

      {draft && draft.warnings.length > 0 ? (
        <ul aria-label="Upozorenja iz slike" className="flex flex-col gap-1.5 rounded-xl bg-warning-soft p-3 ring-1 ring-border">
          {draft.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-[13px] leading-5 text-text">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {showCandidates ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium text-text">Koji je proizvod na slici?</p>
          <ul className="divide-y divide-border rounded-xl ring-1 ring-border" aria-label="Kandidati za proizvod">
            {candidateList.slice(0, 5).map((option) => (
              <li key={`${option.hit.productId}-${option.hit.variantId ?? "bez-tipa"}`}>
                <button
                  type="button"
                  onClick={() => selectCandidate(option)}
                  className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text">{option.name}</span>
                    {option.tip ? <span className="block text-[13px] text-text-muted">{option.tip}</span> : null}
                  </span>
                  <Money value={option.prodajna} trimZeroCents className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={dismissCandidates}
            className="min-h-11 cursor-pointer self-start text-[13px] font-medium text-text-muted hover:text-text"
          >
            Nijedan — biram ručno
          </button>
        </div>
      ) : null}

      {file && draft && status !== "loading" && !applied ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={requestApply}>
            Popuni formu
          </Button>
        </div>
      ) : null}

      {file && status !== "loading" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={readStrong} disabled={strongUsed}>
            Pročitaj ponovo jačim modelom
          </Button>
        </div>
      ) : null}
    </section>
  );
}
