"use client";

type LoadingDotsProps = {
  show: boolean;
  label?: string;
};

export function LoadingDots({ show, label }: LoadingDotsProps) {
  return (
    <div
      className="flex min-h-[28px] items-center justify-center gap-2 py-3 text-xs text-slate-500"
      aria-live="polite"
      role="status"
    >
      {show ? (
        <>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-2.5 w-2.5 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: `${index * 0.12}s` }}
            />
          ))}
          {label ? <span>{label}</span> : null}
        </>
      ) : null}
    </div>
  );
}
