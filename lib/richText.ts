const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const applyInlineFormatting = (text: string) => {
  let output = text;
  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/__(.+?)__/g, "<strong>$1</strong>");
  output = output.replace(/(?<!\\)(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g, "<em>$1</em>");
  output = output.replace(/(?<!\\)_(?!_)([^_]+?)_(?!_)/g, "<em>$1</em>");
  return output;
};

export const formatRichTextToHtml = (value?: string | null) => {
  if (!value) return "";
  const escaped = escapeHtml(value);
  const lines = escaped.split(/\r?\n/);
  const blocks: string[] = [];
  let listItems: string[] = [];

  const pushList = () => {
    if (listItems.length === 0) return;
    blocks.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      pushList();
      continue;
    }

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch) {
      listItems.push(`<li>${applyInlineFormatting(listMatch[1])}</li>`);
      continue;
    }

    pushList();
    blocks.push(`<p>${applyInlineFormatting(line)}</p>`);
  }

  pushList();
  return blocks.join("");
};

export const richTextOutputClassNames =
  "space-y-2 text-sm text-slate-700 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:leading-relaxed [&_li::marker]:text-black [&_p]:leading-relaxed [&_strong]:font-semibold [&_em]:italic";
