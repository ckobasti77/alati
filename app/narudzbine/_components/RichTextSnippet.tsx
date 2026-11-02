"use client";

import { formatRichTextToHtml, richTextOutputClassNames } from "@/lib/richText";
import { cn } from "@/lib/utils";

export function RichTextSnippet({ text, className }: { text?: string | null; className?: string }) {
  if (!text || text.trim().length === 0) return null;
  const html = formatRichTextToHtml(text);
  if (!html) return null;
  return (
    <div
      className={cn(
        richTextOutputClassNames,
        "max-h-16 overflow-hidden text-xs text-slate-500 [&_p]:mb-0 [&_ul]:mb-0",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
