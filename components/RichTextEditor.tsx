"use client";

import { forwardRef, useImperativeHandle, useMemo, useRef, type ReactNode } from "react";
import { Bold, Italic, List as ListIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
  maxLength?: number;
  onBlur?: () => void;
  className?: string;
};

type ToolbarButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

function ToolbarButton({ label, icon, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export const RichTextEditor = forwardRef<HTMLTextAreaElement | null, RichTextEditorProps>(
  ({ value = "", onChange, placeholder, name, maxLength, onBlur, className }, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => textareaRef.current);
    const safeValue = value ?? "";
    const placeholderText = placeholder ?? "Upisi opis, koristi **bold**, _italic_ i - liste";

    const updateSelection = (start: number, end = start) => {
      requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (!node) return;
        node.focus();
        const safeStart = Math.max(0, Math.min(start, node.value.length));
        const safeEnd = Math.max(0, Math.min(end, node.value.length));
        node.setSelectionRange(safeStart, safeEnd);
      });
    };

    const wrapSelection = (prefix: string, suffix: string = prefix) => {
      const node = textareaRef.current;
      if (!node) return;
      const { selectionStart, selectionEnd } = node;
      const selected = safeValue.slice(selectionStart, selectionEnd);
      const hasSelection = selectionStart !== selectionEnd;
      const nextValue =
        safeValue.slice(0, selectionStart) + prefix + selected + suffix + safeValue.slice(selectionEnd);
      onChange(nextValue);
      const cursorOffset = hasSelection ? prefix.length + selected.length : prefix.length;
      updateSelection(selectionStart + cursorOffset, selectionStart + cursorOffset);
    };

    const toggleListForSelection = () => {
      const node = textareaRef.current;
      if (!node) return;
      const { selectionStart, selectionEnd } = node;
      if (selectionStart === selectionEnd) {
        const lineStart = safeValue.lastIndexOf("\n", selectionStart - 1) + 1;
        const lineEndRaw = safeValue.indexOf("\n", selectionStart);
        const lineEnd = lineEndRaw === -1 ? safeValue.length : lineEndRaw;
        const line = safeValue.slice(lineStart, lineEnd);
        const trimmed = line.trimStart();
        const indent = line.slice(0, line.length - trimmed.length);
        const isList = /^\-\s/.test(trimmed);
        const updatedLine = isList ? `${indent}${trimmed.replace(/^\-\s?/, "")}` : `${indent}- ${trimmed}`;
        const nextValue = safeValue.slice(0, lineStart) + updatedLine + safeValue.slice(lineEnd);
        onChange(nextValue);
        const caretPosition = Math.min(lineStart + updatedLine.length, selectionStart + (isList ? -2 : 2));
        updateSelection(Math.max(0, caretPosition));
        return;
      }

      const selected = safeValue.slice(selectionStart, selectionEnd);
      const lines = selected.split(/\r?\n/);
      const allListed = lines.every((line) => /^\s*-\s/.test(line) || line.trim().length === 0);
      const mapped = lines.map((line) => {
        if (line.trim().length === 0) return line;
        if (allListed) {
          return line.replace(/^\s*-\s?/, "");
        }
        return /^\s*-\s/.test(line) ? line : `- ${line.trimStart()}`;
      });
      const nextValue = safeValue.slice(0, selectionStart) + mapped.join("\n") + safeValue.slice(selectionEnd);
      onChange(nextValue);
      updateSelection(selectionStart, selectionStart + mapped.join("\n").length);
    };

    const handleListEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const { selectionStart, selectionEnd } = event.currentTarget;
      if (selectionStart !== selectionEnd) return false;
      const text = safeValue;
      const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
      const lineEndRaw = text.indexOf("\n", selectionStart);
      const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
      const line = text.slice(lineStart, lineEnd);
      const match = line.match(/^(\s*)-\s(.*)$/);
      if (!match) return false;
      if (selectionStart !== lineEnd) return false;
      event.preventDefault();
      const [, indent, content] = match;
      if (content.trim().length === 0) {
        const before = text.slice(0, lineStart);
        const after = text.slice(lineEnd);
        const nextValue = `${before}${after.startsWith("\n") ? after : `\n${after}`}`;
        onChange(nextValue);
        updateSelection(before.length + (after.startsWith("\n") ? 0 : 1));
        return true;
      }
      const insert = `\n${indent}- `;
      const nextValue = text.slice(0, selectionStart) + insert + text.slice(selectionEnd);
      onChange(nextValue);
      updateSelection(selectionStart + insert.length);
      return true;
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
      if (event.key === "Enter") {
        const handled = handleListEnter(event);
        if (handled) return;
      }
    };

    const renderInline = (text: string): ReactNode[] => {
      // Bold first (** or __)
      const boldPattern = /(\*\*|__)([\s\S]*?)(\1)/g;
      const boldNodes: ReactNode[] = [];
      let last = 0;
      let match: RegExpExecArray | null;
      while ((match = boldPattern.exec(text))) {
        if (match.index > last) {
          boldNodes.push(text.slice(last, match.index));
        }
        const [full, marker, content] = match;
        boldNodes.push(
          <span key={`${match.index}-b-start`} className="text-transparent">
            {marker}
          </span>,
        );
        boldNodes.push(
          <span key={`${match.index}-b-text`} className="font-semibold">
            {content}
          </span>,
        );
        boldNodes.push(
          <span key={`${match.index}-b-end`} className="text-transparent">
            {marker}
          </span>,
        );
        last = match.index + full.length;
      }
      if (last < text.length) {
        boldNodes.push(text.slice(last));
      }

      // Now italic on string nodes
      const italicPattern = /(\*|_)([^*_]+?)\1/g;
      const italicNodes: ReactNode[] = [];
      boldNodes.forEach((node, index) => {
        if (typeof node !== "string") {
          italicNodes.push(node);
          return;
        }
        let cursor = 0;
        let italicMatch: RegExpExecArray | null;
        while ((italicMatch = italicPattern.exec(node))) {
          if (italicMatch.index > cursor) {
            italicNodes.push(node.slice(cursor, italicMatch.index));
          }
          const [full, marker, content] = italicMatch;
          italicNodes.push(
            <span key={`${index}-i-start-${italicMatch.index}`} className="text-transparent">
              {marker}
            </span>,
          );
          italicNodes.push(
            <span key={`${index}-i-text-${italicMatch.index}`} className="italic">
              {content}
            </span>,
          );
          italicNodes.push(
            <span key={`${index}-i-end-${italicMatch.index}`} className="text-transparent">
              {marker}
            </span>,
          );
          cursor = italicMatch.index + full.length;
        }
        if (cursor < node.length) {
          italicNodes.push(node.slice(cursor));
        }
      });

      return italicNodes;
    };

    const overlayContent = useMemo(() => {
      if (!safeValue.trim()) return null;
      const lines = safeValue.split(/\r?\n/);
      return lines.map((line, idx) => {
        const listMatch = line.match(/^(\s*)-\s(.*)$/);
        if (listMatch) {
          const [, indent, rest] = listMatch;
          return (
            <div key={idx} className="relative whitespace-pre-wrap break-words">
              <span
                className="relative text-transparent before:absolute before:left-0 before:text-black before:content-['•']"
                aria-hidden
              >
                {`${indent}- `}
              </span>
              {renderInline(rest)}
            </div>
          );
        }
        return (
          <div key={idx} className="whitespace-pre-wrap break-words">
            {renderInline(line)}
          </div>
        );
      });
    }, [safeValue]);

    const isEmpty = safeValue.trim().length === 0;

    return (
      <div className={cn("rounded-lg border border-slate-200 shadow-sm", className)}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-1">
            <ToolbarButton label="Bold" icon={<Bold className="h-4 w-4" />} onClick={() => wrapSelection("**")} />
            <ToolbarButton label="Italic" icon={<Italic className="h-4 w-4" />} onClick={() => wrapSelection("_")} />
            <ToolbarButton
              label="Lista"
              icon={<ListIcon className="h-4 w-4" />}
              onClick={toggleListForSelection}
            />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Lista pocinje sa &quot;- &quot; + Enter
          </p>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 whitespace-pre-wrap break-words px-3 py-3 text-sm text-slate-800",
            )}
          >
            {isEmpty ? <span className="text-slate-400">{placeholderText}</span> : overlayContent}
          </div>
          <Textarea
            ref={textareaRef}
            value={safeValue}
            name={name}
            maxLength={maxLength}
            autoResize
            rows={3}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
            onKeyDown={handleKeyDown}
            className="relative min-h-[140px] rounded-none border-0 bg-transparent px-3 py-3 text-sm text-transparent caret-slate-900 shadow-none selection:bg-blue-200 focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Formatiraj</span>
          <span className="text-slate-500">
            Koristi **tekst** za bold, _tekst_ za italic. &quot;- &quot; + Enter pravi novu stavku.
          </span>
        </div>
      </div>
    );
  },
);

RichTextEditor.displayName = "RichTextEditor";
