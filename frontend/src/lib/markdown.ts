/**
 * Lightweight markdown → HTML renderer with Obsidian-style [[wikilink]] support.
 *
 * Handles: headings, bold, italic, inline code, code blocks, blockquotes,
 * ordered/unordered lists, task checkboxes, tables, images, links, and
 * [[wikilinks]] (rendered as clickable spans with data-note-title attributes).
 *
 * Escapes HTML first to prevent injection, then applies formatting.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function renderMarkdown(md: string): string {
  if (!md) return "";
  const lines = escapeHtml(md).split("\n");
  const html: string[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeLang = "";
  let codeBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let tableBuffer: string[] = [];

  function flushList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  function flushTable() {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.map((line) =>
      line.split("|").map((c) => c.trim()).filter((c) => c !== ""),
    );
    // Skip separator row (---|---)
    const dataRows = rows.filter((r) => !r.every((c) => /^[-:]+$/.test(c)));
    if (dataRows.length > 0) {
      html.push('<table class="md-table">');
      const header = dataRows[0];
      html.push("<thead><tr>" + header.map((c) => `<th>${inlineFmt(c)}</th>`).join("") + "</tr></thead>");
      html.push("<tbody>");
      for (let r = 1; r < dataRows.length; r++) {
        html.push("<tr>" + dataRows[r].map((c) => `<td>${inlineFmt(c)}</td>`).join("") + "</tr>");
      }
      html.push("</tbody></table>");
    }
    tableBuffer = [];
  }

  function inlineFmt(text: string): string {
    let t = text;
    // [[wikilinks]] → clickable span
    t = t.replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
      (_m, target: string, alias: string | undefined) =>
        `<span class="wikilink" data-note-title="${target.trim()}">${escapeHtml(alias || target).replace(/&amp;/g, "&")}</span>`,
    );
    // Images ![alt](url)
    t = t.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img" />');
    // Links [text](url)
    t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Bold
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    // Italic
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    t = t.replace(/_([^_]+)_/g, "<em>$1</em>");
    // Inline code
    t = t.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
    // Tags #java #backend (not inside code)
    t = t.replace(/(^|\s)#([a-zA-Z][\w/-]*)/g, '$1<span class="md-tag">#$2</span>');
    return t;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Code block fence
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        html.push(`<pre class="md-pre"><code class="md-codeblock">${codeBuffer.join("\n")}</code></pre>`);
        codeBuffer = [];
        inCodeBlock = false;
        codeLang = "";
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLang = line.trim().slice(3);
      }
      i++;
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      i++;
      continue;
    }

    // Table row
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      flushList();
      tableBuffer.push(line.trim());
      i++;
      continue;
    } else {
      flushTable();
    }

    // Empty line
    if (line.trim() === "") {
      flushList();
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level} class="md-h${level}">${inlineFmt(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith("&gt;")) {
      flushList();
      const quoteText = line.trim().replace(/^&gt;\s?/, "");
      html.push(`<blockquote class="md-quote">${inlineFmt(quoteText)}</blockquote>`);
      i++;
      continue;
    }

    // Task list item
    const taskMatch = line.match(/^[-*]\s+\[([x ])\]\s+(.*)$/i);
    if (taskMatch) {
      if (listType !== "ul") {
        flushList();
        html.push('<ul class="md-ul">');
        listType = "ul";
      }
      const checked = taskMatch[1].toLowerCase() === "x";
      html.push(
        `<li class="md-task"><span class="md-checkbox ${checked ? "checked" : ""}">${checked ? "✓" : ""}</span>${inlineFmt(taskMatch[2])}</li>`,
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line.trim())) {
      if (listType !== "ul") {
        flushList();
        html.push('<ul class="md-ul">');
        listType = "ul";
      }
      html.push(`<li>${inlineFmt(line.trim().replace(/^[-*]\s+/, ""))}</li>`);
      i++;
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (listType !== "ol") {
        flushList();
        html.push('<ol class="md-ol">');
        listType = "ol";
      }
      html.push(`<li>${inlineFmt(olMatch[1])}</li>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      flushList();
      html.push('<hr class="md-hr" />');
      i++;
      continue;
    }

    // Paragraph
    flushList();
    html.push(`<p class="md-p">${inlineFmt(line)}</p>`);
    i++;
  }

  // Flush remaining
  if (inCodeBlock && codeBuffer.length > 0) {
    html.push(`<pre class="md-pre"><code class="md-codeblock">${codeBuffer.join("\n")}</code></pre>`);
  }
  flushList();
  flushTable();

  return html.join("\n");
}

/**
 * Extracts [[wikilink]] target titles from markdown content (client-side
 * mirror of the backend NoteLinkService). Used for the link suggestion UI.
 */
export function extractWikilinks(content: string): string[] {
  if (!content) return [];
  const matches = content.matchAll(/\[\[([^\]\n|]+)(?:\|[^\]]+)?\]\]/g);
  return [...new Set([...matches].map((m) => m[1].trim()))];
}
