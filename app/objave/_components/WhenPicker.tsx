"use client";

import { CalendarDays } from "lucide-react";
import { useRef } from "react";
import { Chip } from "@/components/ui/chip";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";

export type ScheduleValue = { date: string; hour: string; minute: string };

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

const pad = (value: number) => String(value).padStart(2, "0");
/** Lokalni datum kao "YYYY-MM-DD" (vrednost za `<input type="date">` i za postojeći proračun vremena). */
export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

/** "2026-11-15" → "15.11.2026." (srpski format, nezavisno od jezika browsera). */
export function formatDateKey(key: string) {
  const [year, month, day] = key.split("-");
  return year && month && day ? `${day}.${month}.${year}.` : key;
}

/** Vreme zakazivanja kao timestamp (ista formula kao objava: lokalno vreme). */
export const scheduleTimestamp = ({ date, hour, minute }: ScheduleValue) =>
  date && hour && minute ? new Date(`${date}T${hour}:${minute}`).getTime() : null;

/** Podrazumevano za „Zakaži“: danas, sledeći pun sat (ili sutra u 09:00 posle 22h). */
export function defaultSchedule(): ScheduleValue {
  const now = new Date();
  const nextHour = now.getHours() + 1;
  if (nextHour > 22) return { date: addDays(1), hour: "09", minute: "00" };
  return { date: toDateKey(now), hour: pad(nextHour), minute: "00" };
}

const gridButton = (selected: boolean) =>
  cn(
    "num inline-flex h-11 cursor-pointer items-center justify-center rounded-xl text-[15px] transition-colors duration-(--duration-fast) md:h-9 md:text-sm",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    // Izbor nije samo boja: deblji font i prsten oko izabranog.
    selected ? "bg-accent font-semibold text-accent-fg ring-2 ring-ring ring-offset-2 ring-offset-surface" : "bg-surface-2 font-medium text-text hover:bg-surface-3",
  );

/**
 * Kada: Odmah ili Zakaži. Datum dd.mm.yyyy (čipovi Danas/Sutra + kalendar), vreme 24h iz mreže sati i minuta
 * (korak 5 min) — sve unutar panela, bez native select-a koji izlazi iz ekrana.
 */
export function WhenPicker({ value, onChange, idPrefix = "kada" }: { value: ScheduleValue; onChange: (value: ScheduleValue) => void; idPrefix?: string }) {
  const dateRef = useRef<HTMLInputElement>(null);
  const scheduled = Boolean(value.date || value.hour || value.minute);
  const today = toDateKey(new Date());
  const tomorrow = addDays(1);
  const otherDate = scheduled && value.date !== today && value.date !== tomorrow;

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        ariaLabel="Kada se objavljuje"
        fullWidth
        value={scheduled ? "zakazi" : "odmah"}
        onChange={(next) => onChange(next === "odmah" ? { date: "", hour: "", minute: "" } : defaultSchedule())}
        options={[
          { value: "odmah", label: "Odmah" },
          { value: "zakazi", label: "Zakaži" },
        ]}
      />

      {scheduled ? (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-[13px] font-medium text-text-muted">Datum</legend>
            <div className="relative flex flex-wrap gap-2">
              <Chip label="Danas" selected={value.date === today} onClick={() => onChange({ ...value, date: today })} />
              <Chip label="Sutra" selected={value.date === tomorrow} onClick={() => onChange({ ...value, date: tomorrow })} />
              <Chip
                label={otherDate ? formatDateKey(value.date) : "Drugi datum"}
                icon={CalendarDays}
                selected={otherDate}
                onClick={() => {
                  const input = dateRef.current;
                  if (!input) return;
                  if (typeof input.showPicker === "function") input.showPicker();
                  else input.focus();
                }}
              />
              {/* Native kalendar (dobar na telefonu); prikaz datuma je naš, dd.mm.yyyy. */}
              <input
                ref={dateRef}
                id={`${idPrefix}-datum`}
                type="date"
                min={today}
                value={value.date}
                onChange={(event) => event.target.value && onChange({ ...value, date: event.target.value })}
                aria-hidden
                tabIndex={-1}
                className="pointer-events-none absolute size-px opacity-0"
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-text-muted">Sat</legend>
            <div className="grid grid-cols-6 gap-1.5">
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  aria-pressed={value.hour === hour}
                  onClick={() => onChange({ ...value, hour, minute: value.minute || "00" })}
                  className={gridButton(value.hour === hour)}
                >
                  {hour}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-text-muted">Minut</legend>
            <div className="grid grid-cols-6 gap-1.5">
              {MINUTES.map((minute) => (
                <button
                  key={minute}
                  type="button"
                  aria-pressed={value.minute === minute}
                  onClick={() => onChange({ ...value, minute, hour: value.hour || "00" })}
                  className={gridButton(value.minute === minute)}
                >
                  :{minute}
                </button>
              ))}
            </div>
          </fieldset>
        </>
      ) : (
        <p className="text-[13px] text-text-muted">Objava ide odmah po tapu na dugme.</p>
      )}
    </div>
  );
}
